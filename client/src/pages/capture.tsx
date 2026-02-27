import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cloud, CloudOff, Video, Camera, Loader2, Mic, MicOff } from "lucide-react";
import { useCreateCapture } from "@/hooks/use-captures";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { api } from "@shared/routes";

type Mode = "video" | "photo";

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
 * Mini zoom HUD
 */
function ZoomMiniHUD({
  zoom,
  onSetZoom,
  anchorClass,
  ariaLabel,
}: {
  zoom: number;
  onSetZoom: (v: number) => void;
  anchorClass: string;
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
    <div className={`absolute ${anchorClass} z-30 pointer-events-auto select-none`}>
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

export default function CapturePage() {
  const [mode, setMode] = useState<Mode>("video");
  const [isRecording, setIsRecording] = useState(false);
  const [cloudSync, setCloudSync] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasCameraError, setHasCameraError] = useState(false);
  const [hasMicError, setHasMicError] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Orientation handling (best practical “force portrait”)
  const [isLandscape, setIsLandscape] = useState(false);

  // Targets + smoothed values
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

  const landscapeBoxRef = useRef<HTMLDivElement>(null);
  const portraitBoxRef = useRef<HTMLDivElement>(null);

  const pinchL = useRef<{ startDist: number; startZoom: number } | null>(null);
  const pinchP = useRef<{ startDist: number; startZoom: number } | null>(null);

  const landscapeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const portraitCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawLoopRef = useRef<number | null>(null);

  const recLandscapeRef = useRef<MediaRecorder | null>(null);
  const recPortraitRef = useRef<MediaRecorder | null>(null);
  const chunksLandscapeRef = useRef<Blob[]>([]);
  const chunksPortraitRef = useRef<Blob[]>([]);

  const { mutateAsync: createCapture } = useCreateCapture();
  const { toast } = useToast();

  // Detect orientation
  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setIsLandscape(w > h);
    };
    onResize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

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

  // Attach stream to both preview videos
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

  const handleTouchEnd = (which: "l" | "p") => () => {
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
        description: `Both ${mode} formats have been saved to your computer.`,
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
        return;
      }

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

  return (
    <div className="min-h-[100dvh] bg-zinc-950 relative overflow-hidden">
      {/* Subtle premium backdrop */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-48 right-[-200px] w-[700px] h-[700px] rounded-full bg-white/4 blur-3xl" />
      </div>

      {/* “Force portrait” overlay (best practical approach) */}
      <AnimatePresence>
        {isLandscape && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-8 text-center"
          >
            <div className="max-w-sm rounded-2xl border border-white/10 bg-zinc-950/60 p-6 shadow-2xl">
              <div className="text-white text-lg font-semibold mb-2">Rotate to Portrait</div>
              <div className="text-white/70 text-sm">
                For the dual-view layout, please hold your phone vertically.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top bar */}
      <header className="absolute top-0 inset-x-0 z-20 px-4 sm:px-6 pt-4 flex items-center justify-between">
        <div className="text-white font-semibold text-[16px] tracking-tight flex items-center gap-2">
          FlipCast<span className="text-white/45">Duo</span>
        </div>

        <div className="flex items-center gap-2">
          {hasMicError && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium bg-red-500/20 border border-red-500/30 text-red-400 backdrop-blur-md">
              <MicOff className="w-3 h-3" />
              Mic Denied
            </div>
          )}

          <button
            onClick={() => setCloudSync(!cloudSync)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all backdrop-blur-md border ${
              cloudSync ? "bg-white/12 border-white/18 text-white" : "bg-black/30 border-white/10 text-white/55"
            }`}
          >
            {cloudSync ? <Cloud className="w-4 h-4" /> : <CloudOff className="w-4 h-4" />}
            <span className="hidden sm:inline">Cloud Sync</span>
          </button>
        </div>
      </header>

      {/* Main layout: 2 columns ALWAYS (phone portrait) */}
      <main className="relative z-10 max-w-[980px] mx-auto px-3 sm:px-6 pt-16 pb-6">
        {hasCameraError ? (
          <div className="w-full min-h-[420px] flex flex-col items-center justify-center bg-zinc-900 rounded-3xl border border-zinc-800 text-zinc-500 p-8 text-center">
            <Camera className="w-16 h-16 mb-4 opacity-50" />
            <h3 className="text-xl font-medium text-white mb-2">Camera Unavailable</h3>
            <p className="max-w-md">Please grant camera permissions or ensure a camera is connected to use the live preview.</p>
          </div>
        ) : (
          <div className="grid grid-cols-[1fr_0.46fr] gap-3 sm:gap-4 items-start">
            {/* LEFT: Landscape preview */}
            <div
              ref={landscapeBoxRef}
              onTouchStart={handleTouchStart("l")}
              onTouchMove={handleTouchMove("l")}
              onTouchEnd={handleTouchEnd("l")}
              className="relative w-full aspect-video bg-black rounded-[1.6rem] overflow-hidden shadow-2xl ring-1 ring-white/10"
              style={{ touchAction: "none" }}
            >
              <video
                ref={landscapeVideoRef}
                autoPlay
                playsInline
                muted
                style={{ transform: `scale(${landscapeZoomDisplay})`, transformOrigin: "center center" }}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

              <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-black/35 backdrop-blur-md rounded-lg text-white text-[10px] font-medium border border-white/10 uppercase tracking-wider pointer-events-none">
                16:9
              </div>

              {isRecording && (
                <div className="absolute top-3 right-3 flex items-center gap-2 pointer-events-none">
                  <div className="w-2.5 h-2.5 bg-red-500 rounded-full recording-pulse" />
                  <div className="text-white/70 text-[10px] tracking-wide uppercase">REC</div>
                </div>
              )}

              <ZoomMiniHUD
                zoom={landscapeZoomTarget}
                onSetZoom={(v) => setLandscapeZoomTarget(clamp(v, 1, 3))}
                anchorClass="bottom-3 right-3"
                ariaLabel="Landscape zoom"
              />
            </div>

            {/* RIGHT: Portrait preview */}
            <div
              ref={portraitBoxRef}
              onTouchStart={handleTouchStart("p")}
              onTouchMove={handleTouchMove("p")}
              onTouchEnd={handleTouchEnd("p")}
              className="relative w-full aspect-[9/16] bg-black rounded-[1.6rem] overflow-hidden shadow-2xl ring-1 ring-white/10"
              style={{ touchAction: "none" }}
            >
              <video
                ref={portraitVideoRef}
                autoPlay
                playsInline
                muted
                style={{ transform: `scale(${portraitZoomDisplay})`, transformOrigin: "center center" }}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-black/35 backdrop-blur-md rounded-lg text-white text-[10px] font-medium border border-white/10 uppercase tracking-wider whitespace-nowrap pointer-events-none">
                9:16
              </div>

              <ZoomMiniHUD
                zoom={portraitZoomTarget}
                onSetZoom={(v) => setPortraitZoomTarget(clamp(v, 1, 3))}
                anchorClass="top-3 right-3"
                ariaLabel="Portrait zoom"
              />
            </div>
          </div>
        )}

        {/* Controls row (under previews): left control panel + right record button */}
        <div className="mt-3 sm:mt-4 grid grid-cols-[1fr_0.46fr] gap-3 sm:gap-4 items-start">
          {/* LEFT controls */}
          <div className="rounded-[1.6rem] border border-white/10 bg-black/25 backdrop-blur-xl shadow-2xl px-4 py-3">
            {/* Logo area + mic */}
            <div className="flex items-center justify-between">
              <div className="text-white font-semibold tracking-tight text-[14px]">
                {/* Placeholder for your final logo */}
                <span className="opacity-90">FlipCast</span>
                <span className="text-white/45">Duo</span>
              </div>

              {mode === "video" && !hasMicError && (
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-2.5 rounded-full border transition-all ${
                    isMuted
                      ? "bg-red-500/18 border-red-500/25 text-red-500"
                      : "bg-black/35 border-white/10 text-white hover:bg-black/55"
                  }`}
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              )}
            </div>

            {/* Mode toggle */}
            <div className="mt-3 flex justify-center">
              <div className="flex bg-black/35 backdrop-blur-xl p-1 rounded-full border border-white/10 shadow-xl">
                {(["video", "photo"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => !isRecording && setMode(m)}
                    disabled={isRecording}
                    className={`relative px-5 py-2 rounded-full text-[12px] font-medium uppercase tracking-wider transition-colors ${
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

            {/* Nav buttons row (placeholders for now) */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <button className="h-10 rounded-xl border border-white/10 bg-black/25 text-white/85 text-[12px] hover:bg-black/40 transition">
                Capture
              </button>
              <button className="h-10 rounded-xl border border-white/10 bg-black/25 text-white/85 text-[12px] hover:bg-black/40 transition">
                Gallery
              </button>
              <button className="h-10 rounded-xl border border-white/10 bg-black/25 text-white/85 text-[12px] hover:bg-black/40 transition">
                Accessory
              </button>
            </div>

            {/* Cloud toggle (kept here too, matches your mock idea) */}
            <div className="mt-3 flex justify-center">
              <button
                onClick={() => setCloudSync(!cloudSync)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-medium transition-all backdrop-blur-md border ${
                  cloudSync ? "bg-white/12 border-white/18 text-white" : "bg-black/30 border-white/10 text-white/55"
                }`}
              >
                {cloudSync ? <Cloud className="w-4 h-4" /> : <CloudOff className="w-4 h-4" />}
                Cloud Sync
              </button>
            </div>
          </div>

          {/* RIGHT: Record button under portrait preview */}
          <div className="rounded-[1.6rem] border border-white/10 bg-black/25 backdrop-blur-xl shadow-2xl px-4 py-4 flex items-center justify-center">
            <button
              onClick={handleCapture}
              disabled={processing || hasCameraError}
              className="relative w-20 h-20 rounded-full flex items-center justify-center outline-none group disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={mode === "video" ? (isRecording ? "Stop recording" : "Start recording") : "Take photo"}
            >
              <div
                className={`absolute inset-0 rounded-full border-4 transition-colors duration-300 ${
                  isRecording ? "border-red-500/50" : "border-white"
                }`}
              />

              <motion.div
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
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
                  <Loader2 className={`w-8 h-8 animate-spin ${mode === "photo" ? "text-black" : "text-white"}`} />
                )}
              </motion.div>
            </button>
          </div>
        </div>
      </main>

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
  );
}
