/**
 * face-api.js Helper
 *
 * Manages loading models and extracting face descriptors in the browser.
 * Models are served from /models (public/models/) as static files.
 *
 * NOTE: This module must only be imported in 'use client' components
 * because it relies on browser APIs (HTMLVideoElement, Canvas, etc.).
 */

import * as faceapi from "face-api.js";

let modelsLoaded = false;

const MODEL_URL = "/models";

/**
 * Load all required face-api.js models.
 * Safe to call multiple times — loads only once.
 */
export async function loadModels(): Promise<void> {
  if (modelsLoaded) return;

  console.log("[faceApi] Loading models from", MODEL_URL);

  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);

  modelsLoaded = true;
  console.log("[faceApi] All models loaded ✓");
}

export function isModelsLoaded(): boolean {
  return modelsLoaded;
}

/**
 * Detect a single face in a video/image element and return its 128-D descriptor.
 * Returns null if no face detected.
 */
export async function getSingleDescriptor(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
): Promise<Float32Array | null> {
  const detection = await faceapi
    .detectSingleFace(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) return null;
  return detection.descriptor;
}

/**
 * Detect ALL faces in a video/image element.
 * Returns array of { detection, descriptor } objects.
 */
export async function getAllDescriptors(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement
) {
  const detections = await faceapi
    .detectAllFaces(input, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  return detections;
}

/**
 * Draw detection results (boxes + landmarks) on a canvas overlay.
 * The canvas must be positioned over the video element.
 */
export function drawDetections(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  detections: faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>>[]
) {
  const dims = faceapi.matchDimensions(canvas, video, true);
  const resized = faceapi.resizeResults(detections, dims);

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  resized.forEach((det) => {
    const box = det.detection.box;
    // Draw bounding box
    ctx.strokeStyle = "#6366f1";
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x, box.y, box.width, box.height);

    // Corner accents
    const cs = 14;
    ctx.strokeStyle = "#8b5cf6";
    ctx.lineWidth = 3;
    [[box.x, box.y], [box.x + box.width, box.y], [box.x, box.y + box.height], [box.x + box.width, box.y + box.height]].forEach(([cx, cy], i) => {
      ctx.beginPath();
      const dx = i % 2 === 0 ? cs : -cs;
      const dy = i < 2 ? cs : -cs;
      ctx.moveTo(cx, cy + dy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + dx, cy);
      ctx.stroke();
    });
  });
}

/**
 * Draw a labelled box for a recognised user.
 */
export function drawLabeledBox(
  canvas: HTMLCanvasElement,
  box: { x: number; y: number; width: number; height: number },
  label: string,
  color: string = "#22c55e"
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Box
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(box.x, box.y, box.width, box.height);

  // Label background
  ctx.fillStyle = color;
  const labelWidth = ctx.measureText(label).width + 16;
  ctx.fillRect(box.x - 1, box.y - 28, labelWidth, 26);

  // Label text
  ctx.fillStyle = "white";
  ctx.font = "bold 13px Inter, sans-serif";
  ctx.fillText(label, box.x + 7, box.y - 10);
}

/**
 * Convert Float32Array descriptor to plain number[] for JSON serialisation.
 */
export function descriptorToArray(descriptor: Float32Array): number[] {
  return Array.from(descriptor);
}

export { faceapi };
