"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  Scan, Square, Loader2, CheckCircle2,
  XCircle, AlertTriangle, UserCheck, Clock
} from "lucide-react";
import {
  loadModels,
  getAllDescriptors,
  drawDetections,
  drawLabeledBox,
  descriptorToArray,
  faceapi,
} from "@/lib/faceApi";
import { recognize } from "@/lib/api";
import { format } from "date-fns";

type RecognitionState = "idle" | "loading" | "running" | "stopped";

interface LastResult {
  type: "success" | "already" | "unknown" | "none";
  message: string;
  name?: string;
  confidence?: number;
  time: string;
}

// Play a small beep sound on successful recognition
function playBeep(success: boolean) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = success ? 880 : 440;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
  } catch {}
}

export default function AttendancePage() {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const loopRef    = useRef<NodeJS.Timeout | null>(null);
  const busyRef    = useRef(false); // prevent overlapping API calls

  const [state,      setState]      = useState<RecognitionState>("idle");
  const [lastResult, setLastResult] = useState<LastResult | null>(null);
  const [modelReady, setModelReady] = useState(false);
  const [stats,      setStats]      = useState({ total: 0, todayMarked: 0 });

  // Load models once
  useEffect(() => {
    loadModels().then(() => setModelReady(true)).catch(console.error);
    return () => stopEverything();
  }, []);

  async function startCamera() {
    if (streamRef.current) return;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
    });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function stopEverything() {
    if (loopRef.current) clearInterval(loopRef.current);
    loopRef.current = null;
    stopCamera();
    const canvas = canvasRef.current;
    if (canvas) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
  }

  // ── Recognition Loop ─────────────────────────────────────────────
  const runFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || busyRef.current) return;
    busyRef.current = true;

    try {
      const detections = await getAllDescriptors(videoRef.current);

      // Draw bounding boxes for ALL detected faces
      drawDetections(canvasRef.current, videoRef.current, detections as any);

      if (detections.length === 0) {
        setLastResult({
          type: "none",
          message: "No face detected",
          time: format(new Date(), "HH:mm:ss"),
        });
        busyRef.current = false;
        return;
      }

      // Process first detected face
      const descriptor = descriptorToArray(detections[0].descriptor);
      const result = await recognize(descriptor);
      const now = format(new Date(), "HH:mm:ss");

      if (!result.recognized) {
        // Unknown
        setLastResult({ type: "unknown", message: "Unknown Person", time: now });
        const box = detections[0].detection.box;
        drawLabeledBox(canvasRef.current!, {
          x: box.x, y: box.y, width: box.width, height: box.height,
        }, "Unknown", "#ef4444");
        playBeep(false);
      } else if (result.alreadyMarked) {
        // Already marked today
        setLastResult({ type: "already", message: result.message, name: result.user?.name, time: now });
        const box = detections[0].detection.box;
        drawLabeledBox(canvasRef.current!, {
          x: box.x, y: box.y, width: box.width, height: box.height,
        }, `${result.user?.name} ✓`, "#f59e0b");
        toast(`Already marked: ${result.user?.name}`, { icon: "⏰" });
      } else {
        // New recognition!
        setLastResult({
          type: "success",
          message: result.message,
          name: result.user?.name,
          confidence: result.confidence,
          time: now,
        });
        setStats((s) => ({ ...s, todayMarked: s.todayMarked + 1 }));
        const box = detections[0].detection.box;
        drawLabeledBox(canvasRef.current!, {
          x: box.x, y: box.y, width: box.width, height: box.height,
        }, `${result.user?.name} 🎉`, "#22c55e");
        toast.success(`Welcome, ${result.user?.name}!`);
        playBeep(true);
      }
    } catch (e: any) {
      console.error("Frame error:", e);
    } finally {
      busyRef.current = false;
    }
  }, []);

  async function handleStart() {
    if (!modelReady) return toast.error("Models still loading, please wait…");
    setState("loading");
    try {
      await startCamera();
      setState("running");
      // Run recognition every 1.5 seconds
      loopRef.current = setInterval(runFrame, 1500);
    } catch (e: any) {
      toast.error("Camera access denied. Please allow camera permission.");
      setState("idle");
    }
  }

  function handleStop() {
    stopEverything();
    setState("stopped");
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold gradient-text flex items-center gap-3">
          <Scan size={26} />
          Live Attendance Recognition
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Start the camera and face recognition will mark attendance automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Webcam Column */}
        <div className="lg:col-span-2 space-y-4">
          {/* Webcam */}
          <div
            className="webcam-wrapper"
            style={{
              border: `2px solid ${
                state === "running" ? "var(--accent-green)" : "var(--border)"
              }`,
              boxShadow: state === "running" ? "0 0 24px rgba(34,197,94,0.2)" : "none",
              minHeight: 360,
            }}
          >
            <video
              ref={videoRef}
              muted
              playsInline
              style={{ transform: "scaleX(-1)", width: "100%", height: "100%", objectFit: "cover" }}
            />
            <canvas
              ref={canvasRef}
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", transform: "scaleX(-1)" }}
            />

            {/* Idle placeholder */}
            {state === "idle" || state === "stopped" ? (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center"
                style={{ background: "rgba(0,0,0,0.8)" }}
              >
                <Scan size={56} style={{ color: "var(--text-muted)", opacity: 0.5 }} />
                <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>
                  Click "Start Attendance" to begin
                </p>
              </div>
            ) : null}

            {/* Loading */}
            {state === "loading" && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center"
                style={{ background: "rgba(0,0,0,0.7)" }}
              >
                <Loader2 size={40} className="animate-spin" style={{ color: "#6366f1" }} />
                <p className="mt-3 text-sm" style={{ color: "var(--text-muted)" }}>Starting camera…</p>
              </div>
            )}

            {/* Scan line while running */}
            {state === "running" && <div className="scan-line" style={{ zIndex: 5 }} />}

            {/* Status indicator badge */}
            {state === "running" && (
              <div
                className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{ background: "rgba(34,197,94,0.9)", color: "white" }}
              >
                <span className="w-2 h-2 rounded-full bg-white" style={{ animation: "pulse 1.5s infinite" }} />
                LIVE
              </div>
            )}
          </div>

          {/* Control Buttons */}
          <div className="flex gap-3">
            <button
              id="btn-start-attendance"
              onClick={handleStart}
              disabled={state === "loading" || state === "running" || !modelReady}
              className="btn btn-success flex-1 justify-center py-4 text-base"
            >
              {state === "loading" ? (
                <><Loader2 size={18} className="animate-spin" /> Starting…</>
              ) : (
                <><Scan size={18} /> Start Attendance</>
              )}
            </button>
            <button
              id="btn-stop-attendance"
              onClick={handleStop}
              disabled={state !== "running"}
              className="btn btn-danger px-6 py-4"
            >
              <Square size={18} />
              Stop
            </button>
          </div>

          {!modelReady && (
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
              <Loader2 size={14} className="animate-spin" />
              Loading face recognition models…
            </div>
          )}
        </div>

        {/* Right Panel: Status + Results */}
        <div className="space-y-4">
          {/* Live Status */}
          <div className="glass p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
              Status
            </h2>

            <div
              className="rounded-xl p-4 flex flex-col items-center text-center"
              style={{
                background:
                  lastResult?.type === "success" ? "rgba(34,197,94,0.1)" :
                  lastResult?.type === "already" ? "rgba(245,158,11,0.1)" :
                  lastResult?.type === "unknown" ? "rgba(239,68,68,0.1)" :
                  "rgba(255,255,255,0.03)",
                border: `1px solid ${
                  lastResult?.type === "success" ? "rgba(34,197,94,0.3)" :
                  lastResult?.type === "already" ? "rgba(245,158,11,0.3)" :
                  lastResult?.type === "unknown" ? "rgba(239,68,68,0.3)" :
                  "var(--border)"
                }`,
                transition: "all 0.4s ease",
              }}
            >
              {lastResult?.type === "success" && <CheckCircle2 size={36} style={{ color: "#22c55e" }} />}
              {lastResult?.type === "already" && <UserCheck size={36} style={{ color: "#f59e0b" }} />}
              {lastResult?.type === "unknown" && <XCircle size={36} style={{ color: "#ef4444" }} />}
              {(!lastResult || lastResult.type === "none") && <Scan size={36} style={{ color: "var(--text-muted)", opacity: 0.4 }} />}

              <p className="mt-3 font-semibold text-sm">
                {lastResult?.name || (state === "running" ? "Scanning…" : "Not started")}
              </p>
              <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                {lastResult?.message || ""}
              </p>

              {lastResult?.confidence !== undefined && (
                <div className="mt-3 w-full">
                  <div className="flex justify-between text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                    <span>Confidence</span>
                    <span>{lastResult.confidence}%</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${lastResult.confidence}%`,
                        background: "linear-gradient(90deg, #6366f1, #22c55e)",
                        transition: "width 0.4s",
                      }}
                    />
                  </div>
                </div>
              )}

              {lastResult?.time && (
                <p className="mt-2 text-xs flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                  <Clock size={10} /> {lastResult.time}
                </p>
              )}
            </div>
          </div>

          {/* Session Stats */}
          <div className="glass p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
              Session Stats
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--text-muted)" }}>Marked this session</span>
                <span className="font-bold text-lg" style={{ color: "#22c55e" }}>{stats.todayMarked}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--text-muted)" }}>Current time</span>
                <LiveClock />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span style={{ color: "var(--text-muted)" }}>Camera</span>
                <span className={`badge ${state === "running" ? "badge-green" : "badge-red"}`}>
                  {state === "running" ? "Active" : "Off"}
                </span>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="glass p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
              How it works
            </h2>
            <ol className="space-y-2 text-xs" style={{ color: "var(--text-muted)" }}>
              <li className="flex gap-2"><span className="font-bold" style={{ color: "#6366f1" }}>1.</span> Click "Start Attendance"</li>
              <li className="flex gap-2"><span className="font-bold" style={{ color: "#6366f1" }}>2.</span> Look at the camera</li>
              <li className="flex gap-2"><span className="font-bold" style={{ color: "#6366f1" }}>3.</span> Face is matched automatically</li>
              <li className="flex gap-2"><span className="font-bold" style={{ color: "#6366f1" }}>4.</span> Attendance marked with timestamp</li>
              <li className="flex gap-2"><span className="font-bold" style={{ color: "#6366f1" }}>5.</span> Duplicate marks are prevented</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveClock() {
  const [time, setTime] = useState(format(new Date(), "HH:mm:ss"));
  useEffect(() => {
    const t = setInterval(() => setTime(format(new Date(), "HH:mm:ss")), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="font-mono text-sm" style={{ color: "#818cf8" }}>{time}</span>;
}
