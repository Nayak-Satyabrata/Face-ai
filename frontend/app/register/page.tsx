"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Camera, CheckCircle2, Loader2, UserPlus,
  User, IdCard, AlertCircle, RefreshCw
} from "lucide-react";
import { loadModels, getSingleDescriptor, descriptorToArray } from "@/lib/faceApi";
import { registerUser } from "@/lib/api";

const CAPTURE_COUNT = 3;

type CaptureStatus = "idle" | "loading" | "capturing" | "done" | "error";

export default function RegisterPage() {
  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);

  const [name,       setName]       = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [status,     setStatus]     = useState<CaptureStatus>("idle");
  const [modelReady, setModelReady] = useState(false);
  const [captures,   setCaptures]   = useState<number[][]>([]);
  const [captureMsg, setCaptureMsg] = useState("");

  // ── Load models + start webcam on mount ──────────────────────────
  useEffect(() => {
    (async () => {
      try {
        setStatus("loading");
        await loadModels();
        setModelReady(true);
        await startCamera();
        setStatus("idle");
      } catch (e: any) {
        console.error(e);
        setStatus("error");
      }
    })();
    return () => stopCamera();
  }, []);

  async function startCamera() {
    if (streamRef.current) return;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: "user" },
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

  // ── Capture one face ─────────────────────────────────────────────
  const captureOnce = useCallback(async () => {
    if (!videoRef.current || !modelReady) return;
    const descriptor = await getSingleDescriptor(videoRef.current);

    if (!descriptor) {
      toast.error("No face detected. Please look at the camera.");
      return;
    }
    const arr = descriptorToArray(descriptor);
    setCaptures((prev) => [...prev, arr]);
    return arr;
  }, [modelReady]);

  // ── Run N captures with 1-second delay between each ──────────────
  async function runCaptures() {
    if (!name.trim() || !employeeId.trim()) {
      toast.error("Please enter name and employee ID first.");
      return;
    }
    setCaptures([]);
    setStatus("capturing");

    const collected: number[][] = [];
    for (let i = 1; i <= CAPTURE_COUNT; i++) {
      setCaptureMsg(`Capturing image ${i} of ${CAPTURE_COUNT}…`);
      const result = await captureOnce();
      if (!result) {
        setCaptureMsg("Face not found. Retrying…");
        i--; // retry
        await delay(800);
        continue;
      }
      collected.push(result);
      drawFlash();
      await delay(700);
    }

    setCaptureMsg("All images captured! Registering…");
    setStatus("loading");

    try {
      const res = await registerUser({ name: name.trim(), employeeId: employeeId.trim(), faceDescriptors: collected });
      toast.success(res.message);
      setStatus("done");
      setCaptureMsg("Registration successful! ✓");
    } catch (e: any) {
      const msg = e.response?.data?.message || "Registration failed";
      toast.error(msg);
      setStatus("error");
      setCaptureMsg(msg);
    }
  }

  function reset() {
    setCaptures([]);
    setName("");
    setEmployeeId("");
    setStatus("idle");
    setCaptureMsg("");
  }

  function drawFlash() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "rgba(99,102,241,0.3)";
    ctx.fillRect(0, 0, c.width, c.height);
    setTimeout(() => ctx.clearRect(0, 0, c.width, c.height), 150);
  }

  const isBusy   = status === "loading" || status === "capturing";
  const isDone   = status === "done";
  const isError  = status === "error";
  const progress = Math.round((captures.length / CAPTURE_COUNT) * 100);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold gradient-text flex items-center gap-3">
          <UserPlus size={26} />
          Register New User
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Enter user details and capture {CAPTURE_COUNT} face images for recognition.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Form + progress */}
        <div className="space-y-6">
          <div className="glass p-6 space-y-4">
            <h2 className="font-semibold text-sm uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              User Information
            </h2>

            <div>
              <label className="text-sm font-medium mb-1.5 flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
                <User size={14} /> Full Name
              </label>
              <input
                id="input-name"
                type="text"
                placeholder="e.g. John Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isBusy || isDone}
                className="input"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
                <IdCard size={14} /> Employee ID
              </label>
              <input
                id="input-employee-id"
                type="text"
                placeholder="e.g. EMP-001"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                disabled={isBusy || isDone}
                className="input"
              />
            </div>
          </div>

          {/* Capture Progress */}
          <div className="glass p-6">
            <h2 className="font-semibold text-sm uppercase tracking-wider mb-4" style={{ color: "var(--text-muted)" }}>
              Capture Progress
            </h2>

            <div className="flex items-center justify-between mb-2">
              {[...Array(CAPTURE_COUNT)].map((_, i) => {
                const done = i < captures.length;
                const active = i === captures.length && status === "capturing";
                return (
                  <div key={i} className="step flex-1">
                    <div className={`step-dot mx-auto ${done ? "done" : active ? "active" : "pending"}`}>
                      {done ? <CheckCircle2 size={14} /> : i + 1}
                    </div>
                    {i < CAPTURE_COUNT - 1 && (
                      <div
                        className="flex-1 h-0.5 mx-2"
                        style={{
                          background: done ? "var(--accent-green)" : "rgba(255,255,255,0.1)",
                          transition: "background 0.3s",
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {captureMsg && (
              <p className="text-sm text-center mt-3" style={{ color: isDone ? "#4ade80" : isError ? "#f87171" : "var(--text-muted)" }}>
                {captureMsg}
              </p>
            )}

            {captures.length > 0 && !isDone && (
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                  <span>Progress</span><span>{progress}%</span>
                </div>
                <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${progress}%`, background: "linear-gradient(90deg, #6366f1, #22c55e)" }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {isDone ? (
              <button id="btn-register-again" onClick={reset} className="btn btn-ghost w-full justify-center">
                <RefreshCw size={16} /> Register Another User
              </button>
            ) : (
              <button
                id="btn-start-capture"
                onClick={runCaptures}
                disabled={isBusy || !modelReady || !name.trim() || !employeeId.trim()}
                className="btn btn-primary w-full justify-center py-4 text-base"
              >
                {isBusy ? (
                  <><Loader2 size={18} className="animate-spin" /> Processing…</>
                ) : (
                  <><Camera size={18} /> Capture & Register</>
                )}
              </button>
            )}
          </div>

          {!modelReady && status === "loading" && (
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-muted)" }}>
              <Loader2 size={14} className="animate-spin" />
              Loading face recognition models…
            </div>
          )}
          {isError && (
            <div className="flex items-start gap-2 p-3 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}>
              <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              Camera or model error. Please ensure webcam access is granted and refresh.
            </div>
          )}
        </div>

        {/* Right: Webcam Preview */}
        <div>
          <div
            className="webcam-wrapper"
            style={{ border: `2px solid ${isDone ? "var(--accent-green)" : "var(--border)"}`, position: "relative" }}
          >
            <video ref={videoRef} muted playsInline style={{ transform: "scaleX(-1)" }} />
            <canvas ref={canvasRef} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", transform: "scaleX(-1)" }} />

            {/* Overlay hints */}
            {!isBusy && !isDone && (
              <div
                className="absolute bottom-0 left-0 right-0 px-4 py-3 text-sm text-center"
                style={{ background: "linear-gradient(transparent, rgba(0,0,0,0.7))", color: "white" }}
              >
                Position your face in the frame
              </div>
            )}

            {status === "capturing" && (
              <div className="scan-line" style={{ zIndex: 10, pointerEvents: "none" }} />
            )}

            {isDone && (
              <div className="absolute inset-0 flex items-center justify-center"
                style={{ background: "rgba(34,197,94,0.15)", backdropFilter: "blur(2px)" }}>
                <div className="text-center">
                  <CheckCircle2 size={48} style={{ color: "#22c55e", margin: "0 auto" }} />
                  <p className="mt-2 font-semibold text-white text-lg">Registered!</p>
                </div>
              </div>
            )}
          </div>

          {/* Tips */}
          <div className="mt-4 glass p-4">
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Tips for best results</p>
            <ul className="space-y-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
              <li className="flex items-center gap-2"><CheckCircle2 size={12} style={{ color: "#6366f1" }} /> Ensure good lighting on your face</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={12} style={{ color: "#6366f1" }} /> Look directly at the camera</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={12} style={{ color: "#6366f1" }} /> Keep your face fully visible</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={12} style={{ color: "#6366f1" }} /> Remove sunglasses or heavy accessories</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
