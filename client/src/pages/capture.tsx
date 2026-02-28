import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cloud, CloudOff, Video, Camera, Loader2, Mic, MicOff } from "lucide-react";
import { useCreateCapture } from "@/hooks/use-captures";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { api } from "@shared/routes";

type Mode = "video" | "photo";

/**
 * Your Illustrator SVG pasted as-is.
 * (Yes it’s big — but it means you can paste ONE file and it will match your mock layout.)
 */
const LAYOUT_SVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 1920 1080">
  <defs>
    <style>
      .st0 { fill: #23c1a7; }
      .st1 { fill-rule: evenodd; }
      .st1, .st2 { fill: #fff; }
      .st3 { fill: #231f20; }
      .st4 { fill: #25a0e0; }
      .st5 { fill: #0b0f18; }
      .st6, .st7 { stroke-width: 1.19px; }
      .st6, .st7, .st8 { stroke: #667268; stroke-miterlimit: 10; }
      .st6, .st8 { fill: #434345; }
      .st9 { fill: #808184; }
      .st8 { stroke-width: 1.05px; }
      .st10 { fill: #ea1d32; }
    </style>
  </defs>
  <g id="background">
    <rect class="st5" y="-.28" width="1920" height="1080"/>
  </g>

  <!-- LOGO -->
  <g id="logo">
    <!-- (Your logo group retained exactly) -->
    <g>
      <g>
        <path d="M177.18,860.08h175.6c4.82,0,8.72,3.91,8.72,8.72v46.16c0,4.82-3.91,8.72-8.72,8.72h-175.6c-4.81,0-8.72-3.91-8.72-8.72v-46.16c0-4.82,3.91-8.72,8.72-8.72Z"/>
        <path class="st2" d="M352.79,860.33c4.67,0,8.47,3.8,8.47,8.47v46.16c0,4.67-3.8,8.47-8.47,8.47h-175.6c-4.67,0-8.47-3.8-8.47-8.47v-46.16c0-4.67,3.8-8.47,8.47-8.47h175.6M352.79,859.83h-175.6c-4.96,0-8.97,4.02-8.97,8.97v46.16c0,4.96,4.02,8.97,8.97,8.97h175.6c4.96,0,8.97-4.02,8.97-8.97v-46.16c0-4.96-4.02-8.97-8.97-8.97h0Z"/>
      </g>
      <g>
        <path class="st2" d="M178.01,908.53v-26.26c0-7.52,6.1-13.62,13.62-13.62h10.51v5.96h-10.38c-4.01,0-7.26,3.25-7.26,7.26v6.1h14.72v5.96h-14.72v19.25h-1.85c-2.57,0-4.65-2.08-4.65-4.65Z"/>
        <path class="st0" d="M266.62,893.86v-12c0-4.01,3.25-7.26,7.26-7.26h10.88v-5.96h-11.01c-7.52,0-13.62,6.1-13.62,13.62v17.28c0,7.52,6.1,13.62,13.62,13.62h11.01v-5.96h-10.88c-4.01,0-7.26-3.25-7.26-7.26v-6.1Z"/>
        <path class="st2" d="M205.5,908.53v-39.88h6.26v44.52h-1.61c-2.57,0-4.65-2.08-4.65-4.65Z"/>
        <path class="st2" d="M241.48,879.52h-13.44v35.77c0,2.57,2.08,4.65,4.65,4.65h1.61v-6.77h7.19c7.52,0,13.62-6.1,13.62-13.62v-6.41c0-7.52-6.1-13.62-13.62-13.62ZM248.61,899.96c0,4.01-3.25,7.26-7.26,7.26h-7.05v-21.74h7.05c4.01,0,7.26,3.25,7.26,7.26v7.22Z"/>
        <path class="st9" d="M386.71,868.65h-16.51v44.52h16.51c7.52,0,13.62-6.1,13.62-13.62v-17.28c0-7.52-6.1-13.62-13.62-13.62ZM393.83,899.96c0,4.01-3.25,7.26-7.26,7.26h-10.12v-32.61h10.12c4.01,0,7.26,3.25,7.26,7.26v18.1Z"/>
        <path class="st9" d="M425.08,879.52v27.69h-7.05c-4.01,0-7.26-3.25-7.26-7.26v-20.44h-6.5v20.03c0,7.52,6.1,13.62,13.62,13.62h13.44v-33.65h-6.26Z"/>
        <path class="st0" d="M312.11,879.52h-13.37c-7.52,0-13.62,6.1-13.62,13.62v6.41c0,7.52,6.1,13.62,13.62,13.62h4.9v-5.96h-4.77c-4.01,0-7.26-3.25-7.26-7.26v-7.22c0-4.01,3.25-7.26,7.26-7.26h7.05v23.05c0,2.57,2.08,4.65,4.65,4.65h1.61v-33.65h-.07Z"/>
        <path class="st2" d="M216.76,875.99v-7.34h6.26v7.34h-6.26ZM216.76,908.53v-28.69h6.26v33.33h-1.61c-2.57,0-4.65-2.08-4.65-4.65Z"/>
        <path class="st0" d="M331.02,888.68c-.3-2.41-1.68-4.03-4.27-4.03-2.41,0-3.91,1.62-3.91,3.55,0,2.83,2.89,3.67,6.2,4.69,4.69,1.44,9.02,4.27,9.02,10.47s-4.69,10.65-11.19,10.65c-6.02,0-11.79-4.09-11.79-11.79h6.26c.3,4.03,2.35,6.08,5.66,6.08,2.89,0,4.81-1.86,4.81-4.57,0-2.29-1.74-3.79-5.66-5.05-8.18-2.59-9.57-6.14-9.57-9.93,0-5.9,4.99-9.81,10.47-9.81s10.05,3.85,10.23,9.75h-6.26Z"/>
      </g>
      <path class="st0" d="M354.18,879.52h-4.25v-10.88h-6.5v10.88h-4.25v5.96h4.25v23.05c0,2.57,2.08,4.65,4.65,4.65h1.85v-27.69h4.25v-5.96Z"/>
    </g>
  </g>

  <!-- FRAMES -->
  <g id="landscape_x5F_frame">
    <rect class="st7" x="99.31" y="96.38" width="1280" height="720" rx="41.38" ry="41.38"/>
  </g>
  <g id="portrait_x5F_frame">
    <rect class="st7" x="1427.62" y="93.74" width="405" height="720" rx="41.38" ry="41.38"/>
  </g>

  <!-- CONTROLS -->
  <g id="capture_x5F_toggle">
    <g>
      <path class="st7" d="M122,1019.54c-12.91,0-23.41-10.5-23.41-23.41s10.5-23.41,23.41-23.41h143.26c12.91,0,23.41,10.5,23.41,23.41s-10.5,23.41-23.41,23.41H122Z"/>
    </g>
  </g>
  <g id="gallery_x5F_toggle">
    <g>
      <path class="st6" d="M335.8,1019.54c-12.91,0-23.41-10.5-23.41-23.41s10.5-23.41,23.41-23.41h143.26c12.91,0,23.41,10.5,23.41,23.41s-10.5,23.41-23.41,23.41h-143.26Z"/>
    </g>
  </g>
  <g id="accessory_x5F_toggle">
    <g>
      <path class="st6" d="M549.6,1019.54c-12.91,0-23.41-10.5-23.41-23.41s10.5-23.41,23.41-23.41h143.26c12.91,0,23.41,10.5,23.41,23.41s-10.5,23.41-23.41,23.41h-143.26Z"/>
    </g>
  </g>
  <g id="record_x5F_button">
    <g>
      <path class="st2" d="M1630.12,854.22c41.3,0,74.91,33.6,74.91,74.91s-33.6,74.91-74.91,74.91-74.91-33.6-74.91-74.91,33.6-74.91,74.91-74.91M1630.12,845.66c-46.1,0-83.47,37.37-83.47,83.47s37.37,83.47,83.47,83.47,83.47-37.37,83.47-83.47-37.37-83.47-83.47-83.47h0Z"/>
      <g>
        <path class="st10" d="M1630.12,1000.61c-39.42,0-71.48-32.07-71.48-71.48s32.07-71.48,71.48-71.48,71.48,32.07,71.48,71.48-32.07,71.48-71.48,71.48Z"/>
        <path class="st3" d="M1630.12,861.07c37.53,0,68.06,30.53,68.06,68.06s-30.53,68.06-68.06,68.06-68.06-30.53-68.06-68.06,30.53-68.06,68.06-68.06M1630.12,854.22c-41.3,0-74.91,33.6-74.91,74.91s33.6,74.91,74.91,74.91,74.91-33.6,74.91-74.91-33.6-74.91-74.91-74.91h0Z"/>
      </g>
    </g>
  </g>
  <g id="video_x5F_photo_x5F_button_x5F_frame">
    <path class="st7" d="M962.61,937.46c-22.71,0-41.12-18.41-41.12-41.12s18.41-41.12,41.12-41.12h371.55c22.71,0,41.12,18.41,41.12,41.12s-18.41,41.12-41.12,41.12h-371.55Z"/>
  </g>
  <g id="video_x5F_toggle">
    <g>
      <path class="st2" d="M962.61,929.13c-18.08,0-32.78-14.71-32.78-32.78s14.71-32.78,32.78-32.78h147.83c18.08,0,32.78,14.71,32.78,32.78s-14.71,32.78-32.78,32.78h-147.83Z"/>
    </g>
  </g>
  <g id="photo_x5F_toggle">
    <g>
      <path d="M1186.27,929.13c-18.08,0-32.78-14.71-32.78-32.78s14.71-32.78,32.78-32.78h147.83c18.08,0,32.78,14.71,32.78,32.78s-14.71,32.78-32.78,32.78h-147.83Z"/>
    </g>
  </g>
  <g id="mic_x5F_toggle">
    <g>
      <circle class="st7" cx="850.87" cy="896.34" r="41.12"/>
    </g>
  </g>
</svg>`;

// ---------- helpers ----------
function pickBestMimeType() {
  const candidates = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported?.(c)) return c;
  }
  return "";
}

async function waitForVideoReady(video: HTMLVideoElement) {
  if (video.videoWidth > 0 && video.videoHeight > 0) return;

  await new Promise<void>((resolve) => {
    const onReady = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        cleanup();
        resolve();
      }
    };
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("canplay", onReady);
      video.removeEventListener("loadeddata", onReady);
    };

    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("canplay", onReady);
    video.addEventListener("loadeddata", onReady);

    const start = Date.now();
    const t = window.setInterval(() => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        window.clearInterval(t);
        cleanup();
        resolve();
      } else if (Date.now() - start > 3000) {
        window.clearInterval(t);
        cleanup();
        resolve();
      }
    }, 100);
  });
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function drawAspectCropZoomed(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  outW: number,
  outH: number,
  zoom: number,
) {
  const vW = video.videoWidth;
  const vH = video.videoHeight;
  if (!vW || !vH) return;

  const outAspect = outW / outH;
  const vAspect = vW / vH;

  let baseW: number;
  let baseH: number;

  if (vAspect > outAspect) {
    baseH = vH;
    baseW = vH * outAspect;
  } else {
    baseW = vW;
    baseH = vW / outAspect;
  }

  const z = Math.max(1, zoom);
  const srcW = baseW / z;
  const srcH = baseH / z;

  const srcX = (vW - srcW) / 2;
  const srcY = (vH - srcH) / 2;

  ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, outW, outH);
}

/**
 * Mini zoom UI:
 * - Tiny “1.0×” chip always visible
 * - Slider only appears while interacting and auto-hides
 */
function ZoomMiniHUD({
  zoom,
  onSetZoom,
  style,
  ariaLabel,
}: {
  zoom: number;
  onSetZoom: (v: number) => void;
  style: React.CSSProperties;
  ariaLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const hideTimer = useRef<number | null>(null);

  const showTemporarily = () => {
    setOpen(true);
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => setOpen(false), 1500);
  };

  useEffect(() => {
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, []);

  const pct = ((zoom - 1) / (3 - 1)) * 100;

  return (
    <div className="absolute z-30 pointer-events-auto select-none" style={style}>
      <button
        type="button"
        onClick={() => showTemporarily()}
        className="h-9 px-3 rounded-full border border-white/12 bg-black/35 backdrop-blur-xl text-white/92 text-[13px] font-semibold tracking-wide shadow-[0_10px_30px_rgba(0,0,0,0.55)]"
        aria-label={ariaLabel}
      >
        {zoom.toFixed(1)}×
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="mt-2"
          >
            <div className="w-[220px] max-w-[70vw] rounded-full border border-white/10 bg-black/35 backdrop-blur-xl shadow-[0_18px_50px_rgba(0,0,0,0.55)] overflow-hidden">
              <div className="relative h-10">
                <div className="absolute inset-y-0 left-0 bg-white/12" style={{ width: `${pct}%` }} />
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => {
                    onSetZoom(parseFloat(e.target.value));
                    showTemporarily();
                  }}
                  onPointerDown={() => showTemporarily()}
                  onPointerMove={() => showTemporarily()}
                  className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                  aria-label="Zoom"
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-[0_10px_22px_rgba(0,0,0,0.55)]"
                  style={{ left: `calc(${pct}% - 8px)` }}
                />
                <div className="absolute inset-y-0 left-3 flex items-center text-[11px] text-white/45">1×</div>
                <div className="absolute inset-y-0 right-3 flex items-center text-[11px] text-white/45">3×</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- viewBox positioning helpers (1920x1080) ---
const VB_W = 1920;
const VB_H = 1080;
const pctX = (x: number) => `${(x / VB_W) * 100}%`;
const pctY = (y: number) => `${(y / VB_H) * 100}%`;
const pctW = (w: number) => `${(w / VB_W) * 100}%`;
const pctH = (h: number) => `${(h / VB_H) * 100}%`;

export default function CapturePage() {
  const [mode, setMode] = useState<Mode>("video");
  const [isRecording, setIsRecording] = useState(false);
  const [cloudSync, setCloudSync] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasCameraError, setHasCameraError] = useState(false);
  const [hasMicError, setHasMicError] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Targets + smoothed (display + recording)
  const [landscapeZoomTarget, setLandscapeZoomTarget] = useState(1);
  const [portraitZoomTarget, setPortraitZoomTarget] = useState(1);
  const [landscapeZoomDisplay, setLandscapeZoomDisplay] = useState(1);
  const [portraitZoomDisplay, setPortraitZoomDisplay] = useState(1);

  const landscapeZoomSmoothedRef = useRef(1);
  const portraitZoomSmoothedRef = useRef(1);

  const ZOOM_MIN = 1;
  const ZOOM_MAX = 3;
  const SMOOTHING = 0.42;

  const landscapeVideoRef = useRef<HTMLVideoElement>(null);
  const portraitVideoRef = useRef<HTMLVideoElement>(null);

  // View containers (for wheel/pinch)
  const landscapeBoxRef = useRef<HTMLDivElement>(null);
  const portraitBoxRef = useRef<HTMLDivElement>(null);

  // Pinch state
  const pinchL = useRef<{ startDist: number; startZoom: number } | null>(null);
  const pinchP = useRef<{ startDist: number; startZoom: number } | null>(null);

  // Offscreen canvases for recording
  const landscapeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const portraitCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawLoopRef = useRef<number | null>(null);

  const recLandscapeRef = useRef<MediaRecorder | null>(null);
  const recPortraitRef = useRef<MediaRecorder | null>(null);
  const chunksLandscapeRef = useRef<Blob[]>([]);
  const chunksPortraitRef = useRef<Blob[]>([]);

  const { mutateAsync: createCapture } = useCreateCapture();
  const { toast } = useToast();

  // Smooth animation loop
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const lNow = landscapeZoomSmoothedRef.current;
      const pNow = portraitZoomSmoothedRef.current;

      const lNext = lerp(lNow, landscapeZoomTarget, SMOOTHING);
      const pNext = lerp(pNow, portraitZoomTarget, SMOOTHING);

      landscapeZoomSmoothedRef.current = lNext;
      portraitZoomSmoothedRef.current = pNext;

      setLandscapeZoomDisplay(lNext);
      setPortraitZoomDisplay(pNext);

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [landscapeZoomTarget, portraitZoomTarget]);

  // Camera init
  useEffect(() => {
    let mounted = true;

    async function setupCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: true,
        });
        if (!mounted) return;
        setStream(mediaStream);
        setHasCameraError(false);
        setHasMicError(false);
      } catch (err: any) {
        console.error("Access denied or unavailable:", err);
        if (!mounted) return;

        // fall back to video-only
        try {
          const videoOnly = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
          });
          if (!mounted) return;
          setStream(videoOnly);
          setHasCameraError(false);
          setHasMicError(true);
        } catch {
          if (!mounted) return;
          setHasCameraError(true);
        }
      }
    }

    setupCamera();

    return () => {
      mounted = false;
      setStream((prev) => {
        prev?.getTracks().forEach((t) => t.stop());
        return prev;
      });
    };
  }, []);

  // Attach stream to BOTH preview videos
  useEffect(() => {
    const lv = landscapeVideoRef.current;
    const pv = portraitVideoRef.current;
    if (!stream || !lv || !pv) return;

    lv.srcObject = stream;
    pv.srcObject = stream;

    const tryPlay = async () => {
      try {
        await lv.play();
      } catch {}
      try {
        await pv.play();
      } catch {}
    };
    void tryPlay();

    stream.getAudioTracks().forEach((t) => (t.enabled = !isMuted));

    return () => {
      if (lv) lv.srcObject = null;
      if (pv) pv.srcObject = null;
    };
  }, [stream, isMuted]);

  // Toggle mute
  useEffect(() => {
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => (t.enabled = !isMuted));
  }, [isMuted, stream]);

  // Wheel zoom (desktop testing)
  useEffect(() => {
    const lEl = landscapeBoxRef.current;
    const pEl = portraitBoxRef.current;
    if (!lEl || !pEl) return;

    const onWheelLandscape = (e: WheelEvent) => {
      e.preventDefault();
      const step = e.deltaY > 0 ? -0.08 : 0.08;
      setLandscapeZoomTarget((z) => clamp(Number((z + step).toFixed(2)), ZOOM_MIN, ZOOM_MAX));
    };
    const onWheelPortrait = (e: WheelEvent) => {
      e.preventDefault();
      const step = e.deltaY > 0 ? -0.08 : 0.08;
      setPortraitZoomTarget((z) => clamp(Number((z + step).toFixed(2)), ZOOM_MIN, ZOOM_MAX));
    };

    lEl.addEventListener("wheel", onWheelLandscape, { passive: false });
    pEl.addEventListener("wheel", onWheelPortrait, { passive: false });

    return () => {
      lEl.removeEventListener("wheel", onWheelLandscape as any);
      pEl.removeEventListener("wheel", onWheelPortrait as any);
    };
  }, []);

  // Pinch-to-zoom
  const handleTouchStart = (which: "l" | "p") => (e: React.TouchEvent) => {
    if (e.touches.length !== 2) return;
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.hypot(dx, dy);

    if (which === "l") pinchL.current = { startDist: dist, startZoom: landscapeZoomTarget };
    else pinchP.current = { startDist: dist, startZoom: portraitZoomTarget };
  };

  const handleTouchMove = (which: "l" | "p") => (e: React.TouchEvent) => {
    if (e.touches.length !== 2) return;
    e.preventDefault();

    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.hypot(dx, dy);

    const pinch = which === "l" ? pinchL.current : pinchP.current;
    if (!pinch) return;

    const ratio = dist / pinch.startDist;
    const next = clamp(pinch.startZoom * ratio, ZOOM_MIN, ZOOM_MAX);

    if (which === "l") setLandscapeZoomTarget(Number(next.toFixed(2)));
    else setPortraitZoomTarget(Number(next.toFixed(2)));
  };

  const handleTouchEnd = (which: "l" | "p") => (_e: React.TouchEvent) => {
    if (which === "l") pinchL.current = null;
    else pinchP.current = null;
  };

  function ensureCanvases(width: number, height: number) {
    if (!landscapeCanvasRef.current) landscapeCanvasRef.current = document.createElement("canvas");
    if (!portraitCanvasRef.current) portraitCanvasRef.current = document.createElement("canvas");

    landscapeCanvasRef.current.width = width;
    landscapeCanvasRef.current.height = height;

    const pH = height;
    const pW = Math.round(pH * (9 / 16));
    portraitCanvasRef.current.width = pW;
    portraitCanvasRef.current.height = pH;
  }

  function startDrawLoop(sourceVideo: HTMLVideoElement) {
    const lCanvas = landscapeCanvasRef.current!;
    const pCanvas = portraitCanvasRef.current!;
    const lCtx = lCanvas.getContext("2d");
    const pCtx = pCanvas.getContext("2d");
    if (!lCtx || !pCtx) return;

    const draw = () => {
      lCtx.clearRect(0, 0, lCanvas.width, lCanvas.height);
      pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);

      drawAspectCropZoomed(
        lCtx,
        sourceVideo,
        lCanvas.width,
        lCanvas.height,
        clamp(landscapeZoomSmoothedRef.current, ZOOM_MIN, ZOOM_MAX),
      );

      drawAspectCropZoomed(
        pCtx,
        sourceVideo,
        pCanvas.width,
        pCanvas.height,
        clamp(portraitZoomSmoothedRef.current, ZOOM_MIN, ZOOM_MAX),
      );

      drawLoopRef.current = requestAnimationFrame(draw);
    };

    if (drawLoopRef.current) cancelAnimationFrame(drawLoopRef.current);
    drawLoopRef.current = requestAnimationFrame(draw);
  }

  function stopDrawLoop() {
    if (drawLoopRef.current) {
      cancelAnimationFrame(drawLoopRef.current);
      drawLoopRef.current = null;
    }
  }

  const processCapture = async (landscapeBlob?: Blob, portraitBlob?: Blob) => {
    setProcessing(true);

    try {
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0].replace(/-/g, "");
      const timeStr = now.toTimeString().split(" ")[0].replace(/:/g, "");
      const formattedTS = `${dateStr}_${timeStr}`;

      if (!landscapeBlob || !portraitBlob) throw new Error("Missing output blobs");

      const ext = mode === "video" ? "webm" : "png";

      const download = (blob: Blob, suffix: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `FlipCastDuo_${suffix}_${formattedTS}.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      };

      download(landscapeBlob, "Landscape");
      download(portraitBlob, "Portrait");

      toast({
        title: "Saved to Downloads",
        description: `Both ${mode} formats have been saved to your device.`,
      });

      const landscapeUrl = URL.createObjectURL(landscapeBlob);
      const portraitUrl = URL.createObjectURL(portraitBlob);

      const payload = {
        title: `${mode.charAt(0).toUpperCase() + mode.slice(1)} Capture - ${now.toLocaleTimeString()}`,
        type: mode,
        landscapeUrl,
        portraitUrl,
      };

      if (cloudSync) {
        await createCapture(payload);
      } else {
        queryClient.setQueryData([api.captures.list.path], (old: any) => [
          { ...payload, id: Math.random(), createdAt: new Date() },
          ...(old || []),
        ]);
      }
    } catch (error) {
      console.error("Capture failed:", error);
      toast({
        title: "Capture Failed",
        description: "An error occurred while saving your media.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleCapture = async () => {
    if (!stream || hasCameraError) return;

    if (mode === "video") {
      if (isRecording) {
        setIsRecording(false);
        recLandscapeRef.current?.stop();
        recPortraitRef.current?.stop();
        stopDrawLoop();
      } else {
        setIsRecording(true);

        const lv = landscapeVideoRef.current;
        if (!lv) return;

        await waitForVideoReady(lv);

        const width = lv.videoWidth || 1920;
        const height = lv.videoHeight || 1080;

        ensureCanvases(width, height);
        startDrawLoop(lv);

        const lStream = landscapeCanvasRef.current!.captureStream(30);
        const pStream = portraitCanvasRef.current!.captureStream(30);

        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack && !isMuted) {
          lStream.addTrack(audioTrack.clone());
          pStream.addTrack(audioTrack.clone());
        }

        const mimeType = pickBestMimeType();
        chunksLandscapeRef.current = [];
        chunksPortraitRef.current = [];

        const recL = new MediaRecorder(lStream, mimeType ? { mimeType } : undefined);
        const recP = new MediaRecorder(pStream, mimeType ? { mimeType } : undefined);

        recL.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunksLandscapeRef.current.push(e.data);
        };
        recP.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunksPortraitRef.current.push(e.data);
        };

        const stopped = { l: false, p: false };
        const onBothStopped = async () => {
          if (!stopped.l || !stopped.p) return;

          const lBlob = new Blob(chunksLandscapeRef.current, { type: "video/webm" });
          const pBlob = new Blob(chunksPortraitRef.current, { type: "video/webm" });

          chunksLandscapeRef.current = [];
          chunksPortraitRef.current = [];

          await processCapture(lBlob, pBlob);
        };

        recL.onstop = () => {
          stopped.l = true;
          void onBothStopped();
        };
        recP.onstop = () => {
          stopped.p = true;
          void onBothStopped();
        };

        recLandscapeRef.current = recL;
        recPortraitRef.current = recP;

        recL.start(250);
        recP.start(250);
      }
    } else {
      const lv = landscapeVideoRef.current;
      if (!lv) return;

      await waitForVideoReady(lv);

      const width = lv.videoWidth || 1920;
      const height = lv.videoHeight || 1080;

      ensureCanvases(width, height);

      const lCanvas = landscapeCanvasRef.current!;
      const pCanvas = portraitCanvasRef.current!;
      const lCtx = lCanvas.getContext("2d");
      const pCtx = pCanvas.getContext("2d");
      if (!lCtx || !pCtx) return;

      lCtx.clearRect(0, 0, lCanvas.width, lCanvas.height);
      pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height);

      drawAspectCropZoomed(
        lCtx,
        lv,
        lCanvas.width,
        lCanvas.height,
        clamp(landscapeZoomSmoothedRef.current, ZOOM_MIN, ZOOM_MAX),
      );
      drawAspectCropZoomed(
        pCtx,
        lv,
        pCanvas.width,
        pCanvas.height,
        clamp(portraitZoomSmoothedRef.current, ZOOM_MIN, ZOOM_MAX),
      );

      const lBlob = await new Promise<Blob>((resolve) => lCanvas.toBlob((b) => resolve(b!), "image/png"));
      const pBlob = await new Promise<Blob>((resolve) => pCanvas.toBlob((b) => resolve(b!), "image/png"));

      await processCapture(lBlob, pBlob);
    }
  };

  // ---- SVG slot geometry (from your Illustrator file) ----
  // Landscape frame: x=99.31 y=96.38 w=1280 h=720 rx=41.38
  // Portrait frame : x=1427.62 y=93.74 w=405  h=720 rx=41.38
  const LAND = { x: 99.31, y: 96.38, w: 1280, h: 720, r: 41.38 };
  const PORT = { x: 1427.62, y: 93.74, w: 405, h: 720, r: 41.38 };

  // Mic toggle circle centre & radius: cx=850.87 cy=896.34 r=41.12
  const MIC = { cx: 850.87, cy: 896.34, r: 41.12 };

  // Video/Photo big pill area (frame path bounds approximated from your group):
  // Using a bounding box around where the pill sits visually.
  const MODE_PILL = { x: 920, y: 855, w: 470, h: 82 };

  // Bottom nav buttons (Capture/Gallery/Accessory) approx:
  const NAV_CAPTURE = { x: 98, y: 972, w: 190, h: 47 };
  const NAV_GALLERY = { x: 312, y: 972, w: 190, h: 47 };
  const NAV_ACCESS = { x: 526, y: 972, w: 190, h: 47 };

  // Record button centre at ~ (1630,929) radius ~83 (from your record group)
  const REC = { cx: 1630.12, cy: 929.13, r: 83.47 };

  return (
    <div className="min-h-[100dvh] bg-[#0B0F18] overflow-hidden">
      {/* The whole UI is locked to your SVG’s 16:9 canvas and scales down on phones. */}
      <div className="w-screen h-[100dvh] flex items-center justify-center">
        <div
          className="relative"
          style={{
            height: "100dvh",
            width: "calc(100dvh * (16 / 9))",
            maxWidth: "100vw",
            maxHeight: "100dvh",
            aspectRatio: "16 / 9",
          }}
        >
          {/* SVG Layout background */}
          <div
            className="absolute inset-0 pointer-events-none select-none"
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: LAYOUT_SVG }}
          />

          {/* If camera error, show message inside the landscape slot (still matches layout) */}
          {hasCameraError && (
            <div
              className="absolute flex items-center justify-center text-center px-8"
              style={{
                left: pctX(LAND.x),
                top: pctY(LAND.y),
                width: pctW(LAND.w),
                height: pctH(LAND.h),
              }}
            >
              <div className="w-full h-full rounded-[2rem] border border-white/10 bg-black/35 backdrop-blur-md flex flex-col items-center justify-center gap-3">
                <Camera className="w-14 h-14 text-white/45" />
                <div className="text-white font-semibold">Camera Unavailable</div>
                <div className="text-white/60 text-sm max-w-md">
                  Please grant camera permissions or ensure a camera is connected to use the live preview.
                </div>
              </div>
            </div>
          )}

          {/* Landscape video clipped exactly into the landscape frame */}
          {!hasCameraError && (
            <div
              ref={landscapeBoxRef}
              onTouchStart={handleTouchStart("l")}
              onTouchMove={handleTouchMove("l")}
              onTouchEnd={handleTouchEnd("l")}
              className="absolute overflow-hidden"
              style={{
                left: pctX(LAND.x),
                top: pctY(LAND.y),
                width: pctW(LAND.w),
                height: pctH(LAND.h),
                borderRadius: `${(LAND.r / VB_W) * 100}vw`, // scales nicely
                touchAction: "none",
              }}
            >
              <video
                ref={landscapeVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: `scale(${landscapeZoomDisplay})`, transformOrigin: "center center" }}
              />
              {isRecording && (
                <div className="absolute top-5 right-5 flex items-center gap-2 pointer-events-none">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full" />
                  <div className="text-white/70 text-[11px] tracking-wide uppercase">REC</div>
                </div>
              )}

              <ZoomMiniHUD
                zoom={landscapeZoomTarget}
                onSetZoom={(v) => setLandscapeZoomTarget(clamp(v, 1, 3))}
                ariaLabel="Landscape zoom"
                style={{
                  right: "16px",
                  bottom: "16px",
                }}
              />
            </div>
          )}

          {/* Portrait video clipped exactly into the portrait frame */}
          {!hasCameraError && (
            <div
              ref={portraitBoxRef}
              onTouchStart={handleTouchStart("p")}
              onTouchMove={handleTouchMove("p")}
              onTouchEnd={handleTouchEnd("p")}
              className="absolute overflow-hidden"
              style={{
                left: pctX(PORT.x),
                top: pctY(PORT.y),
                width: pctW(PORT.w),
                height: pctH(PORT.h),
                borderRadius: `${(PORT.r / VB_W) * 100}vw`,
                touchAction: "none",
              }}
            >
              <video
                ref={portraitVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: `scale(${portraitZoomDisplay})`, transformOrigin: "center center" }}
              />

              <ZoomMiniHUD
                zoom={portraitZoomTarget}
                onSetZoom={(v) => setPortraitZoomTarget(clamp(v, 1, 3))}
                ariaLabel="Portrait zoom"
                style={{
                  right: "16px",
                  top: "16px",
                }}
              />
            </div>
          )}

          {/* Top-right cloud sync button (sits in your top area, matches “techy”) */}
          <div className="absolute z-20" style={{ right: pctX(90), top: pctY(20) }}>
            <button
              onClick={() => setCloudSync(!cloudSync)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all backdrop-blur-md border ${
                cloudSync ? "bg-white/12 border-white/18 text-white" : "bg-black/30 border-white/10 text-white/55"
              }`}
            >
              {cloudSync ? <Cloud className="w-4 h-4" /> : <CloudOff className="w-4 h-4" />}
              <span className="hidden sm:inline">Cloud Sync</span>
            </button>
          </div>

          {/* Mic denied badge (top-right) */}
          {hasMicError && (
            <div
              className="absolute z-30 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium bg-red-500/20 border border-red-500/30 text-red-300 backdrop-blur-md"
              style={{ right: pctX(90), top: pctY(72) }}
            >
              <MicOff className="w-3 h-3" />
              Mic Denied
            </div>
          )}

          {/* Mic toggle button positioned on your MIC circle */}
          {mode === "video" && !hasMicError && !hasCameraError && (
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="absolute z-30 flex items-center justify-center rounded-full border backdrop-blur-xl transition-all"
              style={{
                left: `calc(${pctX(MIC.cx)} - ${pctW(MIC.r)} )`,
                top: `calc(${pctY(MIC.cy)} - ${pctH(MIC.r)} )`,
                width: pctW(MIC.r * 2),
                height: pctH(MIC.r * 2),
                borderColor: isMuted ? "rgba(239,68,68,0.35)" : "rgba(255,255,255,0.12)",
                background: isMuted ? "rgba(239,68,68,0.12)" : "rgba(0,0,0,0.25)",
                color: isMuted ? "rgb(239,68,68)" : "rgba(255,255,255,0.92)",
              }}
              aria-label={isMuted ? "Unmute microphone" : "Mute microphone"}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>
          )}

          {/* Video/Photo mode pill positioned where your SVG pill is */}
          <div
            className="absolute z-30 flex items-center justify-center"
            style={{
              left: pctX(MODE_PILL.x),
              top: pctY(MODE_PILL.y),
              width: pctW(MODE_PILL.w),
              height: pctH(MODE_PILL.h),
            }}
          >
            <div className="flex bg-black/35 backdrop-blur-xl p-1 rounded-full border border-white/10 shadow-xl">
              {(["video", "photo"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => !isRecording && setMode(m)}
                  disabled={isRecording}
                  className={`relative px-6 py-2 rounded-full text-sm font-medium uppercase tracking-wider transition-colors ${
                    mode === m ? "text-black" : "text-white/70 hover:text-white"
                  } ${isRecording ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {mode === m && (
                    <motion.div
                      layoutId="active-mode"
                      className="absolute inset-0 bg-white rounded-full z-0"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-2">
                    {m === "video" ? <Video className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                    {m}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Bottom nav buttons aligned to your SVG buttons */}
          <div className="absolute z-30" style={{ left: pctX(NAV_CAPTURE.x), top: pctY(NAV_CAPTURE.y) }}>
            <button className="w-full h-full px-6 py-3 rounded-full bg-white/15 border border-white/10 text-white text-sm font-medium backdrop-blur-xl shadow-lg">
              Capture
            </button>
          </div>

          <div className="absolute z-30" style={{ left: pctX(NAV_GALLERY.x), top: pctY(NAV_GALLERY.y) }}>
            <button className="w-full h-full px-6 py-3 rounded-full bg-black/20 border border-white/10 text-white/60 text-sm font-medium backdrop-blur-xl hover:text-white hover:bg-black/30 transition">
              Gallery
            </button>
          </div>

          <div className="absolute z-30" style={{ left: pctX(NAV_ACCESS.x), top: pctY(NAV_ACCESS.y) }}>
            <button className="w-full h-full px-6 py-3 rounded-full bg-black/20 border border-white/10 text-white/60 text-sm font-medium backdrop-blur-xl hover:text-white hover:bg-black/30 transition">
              Accessory
            </button>
          </div>

          {/* Record button positioned to your red button */}
          <div
            className="absolute z-40 flex items-center justify-center"
            style={{
              left: `calc(${pctX(REC.cx)} - ${pctW(REC.r)} )`,
              top: `calc(${pctY(REC.cy)} - ${pctH(REC.r)} )`,
              width: pctW(REC.r * 2),
              height: pctH(REC.r * 2),
            }}
          >
            <button
              onClick={handleCapture}
              disabled={processing || hasCameraError}
              className="relative w-full h-full rounded-full flex items-center justify-center outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={mode === "video" ? (isRecording ? "Stop recording" : "Start recording") : "Take photo"}
            >
              <div
                className={`absolute inset-[7%] rounded-full border-4 transition-colors duration-300 ${
                  isRecording ? "border-red-500/55" : "border-white/90"
                }`}
              />
              <motion.div
                className={`w-[70%] h-[70%] rounded-full flex items-center justify-center transition-colors ${
                  mode === "video"
                    ? isRecording
                      ? "bg-red-500 scale-75 rounded-xl"
                      : "bg-red-500"
                    : "bg-white"
                }`}
                layout
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                {processing && (
                  <Loader2 className={`w-10 h-10 animate-spin ${mode === "photo" ? "text-black" : "text-white"}`} />
                )}
              </motion.div>
            </button>
          </div>

          {/* Processing overlay */}
          <AnimatePresence>
            {processing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
              >
                <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl flex flex-col items-center gap-4 shadow-2xl">
                  <Loader2 className="w-10 h-10 text-white animate-spin" />
                  <p className="text-white font-medium">Processing dual formats...</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
