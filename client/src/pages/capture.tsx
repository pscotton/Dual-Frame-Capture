import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";

const BASE_W = 1920;
const BASE_H = 1080;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Inline SVG logo (cropped)
 * - No panel background
 * - Bigger by default
 */
function FlipCastLogo({ height = 72 }: { height?: number }) {
  return (
    <svg
      height={height}
      viewBox="90 855 410 90"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="FlipCast Duo"
      style={{ display: "block" }}
    >
      <defs>
        <style>
          {`
            .st0{fill:#23c1a7}
            .st2{fill:#fff}
            .st4{fill:#25a0e0}
            .st9{fill:#808184}
          `}
        </style>
      </defs>

      <g>
        <g>
          <path d="M177.18,860.08h175.6c4.82,0,8.72,3.91,8.72,8.72v46.16c0,4.82-3.91,8.72-8.72,8.72h-175.6c-4.81,0-8.72-3.91-8.72-8.72v-46.16c0-4.82,3.91-8.72,8.72-8.72Z" />
          <path
            className="st2"
            d="M352.79,860.33c4.67,0,8.47,3.8,8.47,8.47v46.16c0,4.67-3.8,8.47-8.47,8.47h-175.6c-4.67,0-8.47-3.8-8.47-8.47v-46.16c0-4.67,3.8-8.47,8.47-8.47h175.6M352.79,859.83h-175.6c-4.96,0-8.97,4.02-8.97,8.97v46.16c0,4.96,4.02,8.97,8.97,8.97h175.6c4.96,0,8.97-4.02,8.97-8.97v-46.16c0-4.96-4.02-8.97-8.97-8.97h0Z"
          />
        </g>

        <g>
          <path
            className="st2"
            d="M178.01,908.53v-26.26c0-7.52,6.1-13.62,13.62-13.62h10.51v5.96h-10.38c-4.01,0-7.26,3.25-7.26,7.26v6.1h14.72v5.96h-14.72v19.25h-1.85c-2.57,0-4.65-2.08-4.65-4.65Z"
          />
          <path
            className="st0"
            d="M266.62,893.86v-12c0-4.01,3.25-7.26,7.26-7.26h10.88v-5.96h-11.01c-7.52,0-13.62,6.1-13.62,13.62v17.28c0,7.52,6.1,13.62,13.62,13.62h11.01v-5.96h-10.88c-4.01,0-7.26-3.25-7.26-7.26v-6.1Z"
          />
          <path
            className="st2"
            d="M205.5,908.53v-39.88h6.26v44.52h-1.61c-2.57,0-4.65-2.08-4.65-4.65Z"
          />
          <path
            className="st2"
            d="M241.48,879.52h-13.44v35.77c0,2.57,2.08,4.65,4.65,4.65h1.61v-6.77h7.19c7.52,0,13.62-6.1,13.62-13.62v-6.41c0-7.52-6.1-13.62-13.62-13.62ZM248.61,899.96c0,4.01-3.25,7.26-7.26,7.26h-7.05v-21.74h7.05c4.01,0,7.26,3.25,7.26,7.26v7.22Z"
          />
          <path
            className="st9"
            d="M386.71,868.65h-16.51v44.52h16.51c7.52,0,13.62-6.1,13.62-13.62v-17.28c0-7.52-6.1-13.62-13.62-13.62ZM393.83,899.96c0,4.01-3.25,7.26-7.26,7.26h-10.12v-32.61h10.12c4.01,0,7.26,3.25,7.26,7.26v18.1Z"
          />
          <path
            className="st9"
            d="M425.08,879.52v27.69h-7.05c-4.01,0-7.26-3.25-7.26-7.26v-20.44h-6.5v20.03c0,7.52,6.1,13.62,13.62,13.62h13.44v-33.65h-6.26Z"
          />
          <path
            className="st0"
            d="M312.11,879.52h-13.37c-7.52,0-13.62,6.1-13.62,13.62v6.41c0,7.52,6.1,13.62,13.62,13.62h4.9v-5.96h-4.77c-4.01,0-7.26-3.25-7.26-7.26v-7.22c0-4.01,3.25-7.26,7.26-7.26h7.05v23.05c0,2.57,2.08,4.65,4.65,4.65h1.61v-33.65h-.07Z"
          />
          <path
            className="st2"
            d="M216.76,875.99v-7.34h6.26v7.34h-6.26ZM216.76,908.53v-28.69h6.26v33.33h-1.61c-2.57,0-4.65-2.08-4.65-4.65Z"
          />
          <path
            className="st0"
            d="M331.02,888.68c-.3-2.41-1.68-4.03-4.27-4.03-2.41,0-3.91,1.62-3.91,3.55,0,2.83,2.89,3.67,6.2,4.69,4.69,1.44,9.02,4.27,9.02,10.47s-4.69,10.65-11.19,10.65c-6.02,0-11.79-4.09-11.79-11.79h6.26c.3,4.03,2.35,6.08,5.66,6.08,2.89,0,4.81-1.86,4.81-4.57,0-2.29-1.74-3.79-5.66-5.05-8.18-2.59-9.57-6.14-9.57-9.93,0-5.9,4.99-9.81,10.47-9.81s10.05,3.85,10.23,9.75h-6.26Z"
          />
        </g>

        <path
          className="st0"
          d="M354.18,879.52h-4.25v-10.88h-6.5v10.88h-4.25v5.96h4.25v23.05c0,2.57,2.08,4.65,4.65,4.65h1.85v-27.69h4.25v-5.96Z"
        />
        <path
          className="st9"
          d="M455.56,879.52h-13.5c-3.75,0-6.78,3.04-6.78,6.78v20.08c0,3.75,3.04,6.78,6.79,6.78h13.49c3.75,0,6.78-3.04,6.78-6.78v-20.08c0-3.75-3.03-6.78-6.78-6.78ZM455.85,904.9c0,1.28-1.04,2.32-2.32,2.32h-9.43c-1.28,0-2.32-1.04-2.32-2.32v-17.1c0-1.28,1.03-2.32,2.31-2.32h9.44c1.28,0,2.32,1.04,2.32,2.32v17.1Z"
        />
      </g>
    </svg>
  );
}

/**
 * Draw one source <video> into one <canvas> with:
 * - aspect-correct "cover" crop
 * - optional zoom around centre
 */
function drawCroppedCover(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  canvasW: number,
  canvasH: number,
  zoom: number
) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;

  // We want to "cover" the canvas
  const canvasAspect = canvasW / canvasH;
  const videoAspect = vw / vh;

  let srcW = vw;
  let srcH = vh;

  if (videoAspect > canvasAspect) {
    // video wider than target -> crop width
    srcH = vh;
    srcW = vh * canvasAspect;
  } else {
    // video taller than target -> crop height
    srcW = vw;
    srcH = vw / canvasAspect;
  }

  // Apply zoom by shrinking the source crop
  const z = clamp(zoom, 1, 3);
  const zoomedW = srcW / z;
  const zoomedH = srcH / z;

  // Center crop
  const sx = (vw - zoomedW) / 2;
  const sy = (vh - zoomedH) / 2;

  ctx.clearRect(0, 0, canvasW, canvasH);
  ctx.drawImage(video, sx, sy, zoomedW, zoomedH, 0, 0, canvasW, canvasH);
}

export default function Capture() {
  // stage scaling
  const [scale, setScale] = useState(1);

  // mode
  const [mode, setMode] = useState<"video" | "photo">("video");

  // camera + status
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasCamera, setHasCamera] = useState(false);

  // zoom
  const [landscapeZoom, setLandscapeZoom] = useState(1.0);
  const [portraitZoom, setPortraitZoom] = useState(1.4);

  // recording
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  // refs
  const previewVideoRef = useRef<HTMLVideoElement | null>(null); // single hidden "source" video from camera
  const streamRef = useRef<MediaStream | null>(null);

  const landscapeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const portraitCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const landscapePreviewRef = useRef<HTMLVideoElement | null>(null); // visible preview
  const portraitPreviewRef = useRef<HTMLVideoElement | null>(null); // visible preview

  const rafRef = useRef<number | null>(null);

  // recorders
  const recLandscapeRef = useRef<MediaRecorder | null>(null);
  const recPortraitRef = useRef<MediaRecorder | null>(null);
  const chunksLandscapeRef = useRef<BlobPart[]>([]);
  const chunksPortraitRef = useRef<BlobPart[]>([]);

  const timerRef = useRef<number | null>(null);

  // scale stage to viewport
  useEffect(() => {
    const calc = () => {
      const pad = 24;
      const vw = Math.max(320, window.innerWidth - pad * 2);
      const vh = Math.max(320, window.innerHeight - pad * 2);
      const s = Math.min(vw / BASE_W, vh / BASE_H);
      setScale(clamp(s, 0.35, 1.25));
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const stageStyle = useMemo<React.CSSProperties>(
    () => ({
      width: BASE_W,
      height: BASE_H,
      transform: `scale(${scale})`,
      transformOrigin: "top left",
    }),
    [scale]
  );

  // start camera
  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        setCameraError(null);

        // stop any existing
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        // Camera constraints (reasonable defaults)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: true,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        const srcVid = previewVideoRef.current;
        if (!srcVid) return;

        srcVid.srcObject = stream;
        await srcVid.play().catch(() => {});

        setHasCamera(true);

        // Attach the canvas previews to the visible video frames
        // We will draw into canvases, and optionally pipe canvases into the preview videos.
        const lc = landscapeCanvasRef.current;
        const pc = portraitCanvasRef.current;
        const lv = landscapePreviewRef.current;
        const pv = portraitPreviewRef.current;

        if (lc && lv) {
          const s = lc.captureStream(30);
          lv.srcObject = s;
          await lv.play().catch(() => {});
        }
        if (pc && pv) {
          const s = pc.captureStream(30);
          pv.srcObject = s;
          await pv.play().catch(() => {});
        }

        // Start draw loop
        const draw = () => {
          const v = previewVideoRef.current;
          const lcan = landscapeCanvasRef.current;
          const pcan = portraitCanvasRef.current;

          if (v && lcan && pcan) {
            const lctx = lcan.getContext("2d");
            const pctx = pcan.getContext("2d");
            if (lctx && pctx) {
              // exact sizes of your frames
              // Landscape frame is 1280×720
              // Portrait frame is 405×720 (but for recording and quality, we’ll draw at 720×1280 internally)
              // HOWEVER: your portrait frame is visually 405×720. If we draw exactly 405×720, the recording is low.
              // So: keep canvas internal at 720×1280, then scale to fit preview via CSS (we do that below).
              drawCroppedCover(lctx, v, 1280, 720, landscapeZoom);
              drawCroppedCover(pctx, v, 720, 1280, portraitZoom);
            }
          }
          rafRef.current = requestAnimationFrame(draw);
        };

        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(draw);
      } catch (err: any) {
        console.error(err);
        setHasCamera(false);
        setCameraError(
          err?.message ||
            "Camera unavailable. Please allow camera/mic permissions and refresh."
        );
      }
    }

    start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // wheel zoom helpers
  const onWheelZoomLandscape = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setLandscapeZoom((z) => clamp(Number((z + delta).toFixed(1)), 1.0, 3.0));
  };
  const onWheelZoomPortrait = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setPortraitZoom((z) => clamp(Number((z + delta).toFixed(1)), 1.0, 3.0));
  };

  const toggleZoomPresetLandscape = () => {
    setLandscapeZoom((z) => {
      if (z < 1.2) return 1.4;
      if (z < 1.8) return 2.0;
      return 1.0;
    });
  };
  const toggleZoomPresetPortrait = () => {
    setPortraitZoom((z) => {
      if (z < 1.2) return 1.4;
      if (z < 1.8) return 2.0;
      return 1.0;
    });
  };

  const startRecording = () => {
    const lc = landscapeCanvasRef.current;
    const pc = portraitCanvasRef.current;
    if (!lc || !pc) return;

    chunksLandscapeRef.current = [];
    chunksPortraitRef.current = [];

    const ls = lc.captureStream(30);
    const ps = pc.captureStream(30);

    // If you want audio in both files, we can add audio track from mic stream:
    const audioTrack = streamRef.current?.getAudioTracks?.()?.[0];
    if (audioTrack) {
      try {
        ls.addTrack(audioTrack);
      } catch {}
      try {
        ps.addTrack(audioTrack);
      } catch {}
    }

    const options: MediaRecorderOptions = {};
    // Try to pick a good mime type
    const candidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];
    for (const c of candidates) {
      if ((window as any).MediaRecorder?.isTypeSupported?.(c)) {
        options.mimeType = c;
        break;
      }
    }

    const recL = new MediaRecorder(ls, options);
    const recP = new MediaRecorder(ps, options);

    recL.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunksLandscapeRef.current.push(ev.data);
    };
    recP.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) chunksPortraitRef.current.push(ev.data);
    };

    recL.onstop = () => {
      const blob = new Blob(chunksLandscapeRef.current, {
        type: recL.mimeType || "video/webm",
      });
      downloadBlob(blob, `FlipCastDuo_Landscape_${Date.now()}.webm`);
    };
    recP.onstop = () => {
      const blob = new Blob(chunksPortraitRef.current, {
        type: recP.mimeType || "video/webm",
      });
      downloadBlob(blob, `FlipCastDuo_Portrait_${Date.now()}.webm`);
    };

    recLandscapeRef.current = recL;
    recPortraitRef.current = recP;

    recL.start(250); // chunk every 250ms
    recP.start(250);

    setIsRecording(true);
    setRecordSeconds(0);

    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setRecordSeconds((s) => s + 1);
    }, 1000);
  };

  const stopRecording = () => {
    recLandscapeRef.current?.stop();
    recPortraitRef.current?.stop();
    recLandscapeRef.current = null;
    recPortraitRef.current = null;

    setIsRecording(false);
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const onRecord = () => {
    if (mode !== "video") return;
    if (!hasCamera) return;
    if (!isRecording) startRecording();
    else stopRecording();
  };

  const capturePhotos = async () => {
    const lc = landscapeCanvasRef.current;
    const pc = portraitCanvasRef.current;
    if (!lc || !pc) return;

    // Landscape PNG
    lc.toBlob((b) => {
      if (b) downloadBlob(b, `FlipCastDuo_Landscape_${Date.now()}.png`);
    }, "image/png");

    // Portrait PNG (we record at 720×1280 internally)
    pc.toBlob((b) => {
      if (b) downloadBlob(b, `FlipCastDuo_Portrait_${Date.now()}.png`);
    }, "image/png");
  };

  const onCapture = () => {
    if (!hasCamera) return;
    if (mode === "photo") {
      capturePhotos();
    } else {
      // In video mode "Capture" can be an alias for record toggle if you want:
      onRecord();
    }
  };

  const onGallery = () => {
    alert("Gallery (placeholder): wire this to your gallery view later.");
  };

  const onAccessory = () => {
    alert("Accessory (placeholder): wire this to your accessory pairing later.");
  };

  const onCloudSync = () => {
    alert("Cloud Sync (placeholder): wire this to your sync logic later.");
  };

  const formatTime = (s: number) => {
    const mm = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const ss = Math.floor(s % 60)
      .toString()
      .padStart(2, "0");
    return `${mm}:${ss}`;
  };

  return (
    <div className="min-h-[100dvh] bg-[#0b0f18] flex items-center justify-center p-6">
      {/* hidden source video */}
      <video
        ref={previewVideoRef}
        playsInline
        muted
        autoPlay
        style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
      />

      {/* internal canvases (used for previews + recording) */}
      <canvas
        ref={landscapeCanvasRef}
        width={1280}
        height={720}
        style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
      />
      <canvas
        ref={portraitCanvasRef}
        width={720}
        height={1280}
        style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
      />

      {/* Stage wrapper */}
      <div
        className="relative"
        style={{
          width: BASE_W * scale,
          height: BASE_H * scale,
        }}
      >
        <div className="relative" style={stageStyle}>
          <div className="absolute inset-0 bg-[#0b0f18]" />

          {/* CLOUD SYNC */}
          <button
            onClick={onCloudSync}
            className="absolute right-[92px] top-[28px] h-[42px] px-6 rounded-full border border-[#667268] bg-white/10 text-white text-[15px] tracking-wide flex items-center gap-3"
            style={{ backdropFilter: "blur(8px)" }}
          >
            <span className="inline-block w-5 h-5">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                <path
                  d="M7.5 18.5h10a4 4 0 0 0 .6-7.96A5.5 5.5 0 0 0 7.3 8.7 4.3 4.3 0 0 0 7.5 18.5Z"
                  stroke="white"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            CLOUD SYNC
          </button>

          {/* LANDSCAPE FRAME */}
          <div
            className="absolute left-[99px] top-[96px] rounded-[41px] border border-[#667268] overflow-hidden bg-black"
            style={{ width: 1280, height: 720 }}
            onWheel={onWheelZoomLandscape}
            onDoubleClick={toggleZoomPresetLandscape}
          >
            {/* Preview is the landscape canvas stream */}
            <video
              ref={landscapePreviewRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />

            {/* overlays */}
            <div className="absolute left-[28px] bottom-[26px] px-4 py-2 rounded-md border border-[#667268] bg-black/40 text-white text-[14px] tracking-wide">
              16:9&nbsp; LANDSCAPE
            </div>

            <button
              type="button"
              onClick={() =>
                setLandscapeZoom((z) => clamp(Number((z + 0.1).toFixed(1)), 1, 3))
              }
              className="absolute right-[28px] bottom-[26px] px-4 py-2 rounded-full border border-[#667268] bg-black/40 text-white text-[14px]"
              title="Click to zoom in. Wheel also works."
            >
              {landscapeZoom.toFixed(1)}x
            </button>

            {!hasCamera && (
              <div className="absolute inset-0 flex items-center justify-center text-white/70 text-[16px]">
                Camera unavailable
              </div>
            )}
          </div>

          {/* PORTRAIT FRAME */}
          <div
            className="absolute left-[1428px] top-[94px] rounded-[41px] border border-[#667268] overflow-hidden bg-black"
            style={{ width: 405, height: 720 }}
            onWheel={onWheelZoomPortrait}
            onDoubleClick={toggleZoomPresetPortrait}
          >
            {/* We stream a 720×1280 canvas into this video,
                then "cover" it into a 405×720 window */}
            <video
              ref={portraitPreviewRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />

            <button
              type="button"
              onClick={() =>
                setPortraitZoom((z) => clamp(Number((z + 0.1).toFixed(1)), 1, 3))
              }
              className="absolute left-[22px] top-[22px] px-4 py-2 rounded-full border border-[#667268] bg-black/40 text-white text-[14px]"
              title="Click to zoom in. Wheel also works."
            >
              {portraitZoom.toFixed(1)}x
            </button>

            <div className="absolute right-[22px] bottom-[26px] px-4 py-2 rounded-md border border-[#667268] bg-black/40 text-white text-[14px] tracking-wide">
              9:16&nbsp; PORTRAIT
            </div>

            {!hasCamera && (
              <div className="absolute inset-0 flex items-center justify-center text-white/70 text-[16px]">
                Camera unavailable
              </div>
            )}
          </div>

          {/* LOGO */}
          <div className="absolute left-[92px] top-[860px]">
            <FlipCastLogo height={72} />
          </div>

          {/* LEFT BUTTONS */}
          <div className="absolute left-[86px] top-[972px] flex gap-5">
            <button
              onClick={onCapture}
              className="h-[56px] px-8 rounded-full border border-[#667268] bg-black/10 text-white text-[15px] tracking-wide"
              style={{ backdropFilter: "blur(10px)" }}
            >
              CAPTURE
            </button>

            <button
              onClick={onGallery}
              className="h-[56px] px-8 rounded-full border border-[#667268] bg-black/10 text-white/80 text-[15px] tracking-wide"
              style={{ backdropFilter: "blur(10px)" }}
            >
              GALLERY
            </button>

            <button
              onClick={onAccessory}
              className="h-[56px] px-8 rounded-full border border-[#667268] bg-black/10 text-white/80 text-[15px] tracking-wide"
              style={{ backdropFilter: "blur(10px)" }}
            >
              ACCESSORY
            </button>
          </div>

          {/* MIC BUTTON (placeholder) */}
          <button
            className="absolute left-[810px] top-[855px] w-[82px] h-[82px] rounded-full border border-[#667268] bg-black/10 flex items-center justify-center"
            style={{ backdropFilter: "blur(10px)" }}
            onClick={() => alert("Mic button (placeholder)")}
            aria-label="Microphone"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 14a3 3 0 0 0 3-3V7a3 3 0 0 0-6 0v4a3 3 0 0 0 3 3Z"
                stroke="white"
                strokeWidth="1.8"
              />
              <path
                d="M7 11v1a5 5 0 0 0 10 0v-1"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M12 17v3"
                stroke="white"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {/* VIDEO/PHOTO TOGGLE */}
          <div
            className="absolute left-[922px] top-[855px] h-[82px] w-[455px] rounded-full border border-[#667268] bg-black/10 flex items-center justify-center gap-4 px-5"
            style={{ backdropFilter: "blur(10px)" }}
          >
            <button
              onClick={() => setMode("video")}
              className={`h-[58px] w-[210px] rounded-full flex items-center justify-center gap-3 text-[15px] tracking-wide ${
                mode === "video" ? "bg-white text-black" : "text-white/80"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 10l5-3v10l-5-3v-4Z"
                  stroke={mode === "video" ? "black" : "white"}
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path
                  d="M4 7h11v10H4V7Z"
                  stroke={mode === "video" ? "black" : "white"}
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
              VIDEO
            </button>

            <button
              onClick={() => setMode("photo")}
              className={`h-[58px] w-[210px] rounded-full flex items-center justify-center gap-3 text-[15px] tracking-wide ${
                mode === "photo" ? "bg-white text-black" : "text-white/80"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 8h16v11H4V8Z"
                  stroke={mode === "photo" ? "black" : "white"}
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 8l1-2h4l1 2"
                  stroke={mode === "photo" ? "black" : "white"}
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <circle
                  cx="12"
                  cy="13"
                  r="2.5"
                  stroke={mode === "photo" ? "black" : "white"}
                  strokeWidth="1.8"
                />
              </svg>
              PHOTO
            </button>
          </div>

          {/* RECORD BUTTON */}
          <button
            onClick={onRecord}
            aria-label="Record"
            className="absolute left-[1546px] top-[845px] w-[167px] h-[167px] rounded-full border-[9px] border-white/90 bg-transparent flex items-center justify-center"
            title={mode === "photo" ? "Switch to VIDEO to record" : "Record"}
          >
            <div
              className={`w-[143px] h-[143px] rounded-full ${
                isRecording ? "bg-[#ea1d32]" : "bg-[#ea1d32]"
              }`}
            />
            {isRecording && (
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-white text-[14px] px-3 py-1 rounded-full border border-[#667268] bg-black/40">
                {formatTime(recordSeconds)}
              </div>
            )}
          </button>

          {/* Error overlay (if camera blocked) */}
          {cameraError && (
            <div className="absolute left-[99px] top-[96px] w-[1734px] h-[720px] flex items-center justify-center">
              <div className="max-w-[900px] text-center text-white/85 border border-[#667268] bg-black/60 rounded-2xl px-8 py-6">
                <div className="text-[18px] mb-2">Camera unavailable</div>
                <div className="text-[14px] text-white/70">
                  {cameraError}
                  <br />
                  If you’re on Vercel: use HTTPS (not HTTP) and allow camera/mic
                  permissions in the browser.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
