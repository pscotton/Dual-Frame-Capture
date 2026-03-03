import React, { useEffect, useMemo, useRef, useState } from "react";

type Mode = "video" | "photo";
type Tab = "capture" | "gallery" | "accessory";

const STAGE_W = 1920;
const STAGE_H = 1080;

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function pickMimeType(): string | undefined {
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  // @ts-ignore
  const MR = window.MediaRecorder;
  if (!MR) return undefined;
  for (const c of candidates) {
    // @ts-ignore
    if (MR.isTypeSupported && MR.isTypeSupported(c)) return c;
  }
  return undefined;
}

/**
 * Cinematic helper:
 * - zoom >= 1: cover crop (your original behaviour)
 * - zoom < 1 : fit (zoomed out) + blurred background fill
 */
function drawCover(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  outW: number,
  outH: number,
  zoom = 1
) {
  const vw = video.videoWidth || 0;
  const vh = video.videoHeight || 0;
  if (!vw || !vh) return;

  const z = Math.max(0.3, Math.min(3, zoom)); // clamp 0.3..3

  const targetAspect = outW / outH;
  const srcAspect = vw / vh;

  ctx.clearRect(0, 0, outW, outH);

  // ---- Cinematic zoom-out (z < 1): FIT + blurred background fill ----
  if (z < 1) {
    // Background (cover) — blurred
    ctx.save();
    ctx.filter = "blur(18px)";
    ctx.globalAlpha = 0.9;

    let bSx = 0,
      bSy = 0,
      bSw = vw,
      bSh = vh;

    if (srcAspect > targetAspect) {
      bSw = Math.round(vh * targetAspect);
      bSx = Math.round((vw - bSw) / 2);
    } else {
      bSh = Math.round(vw / targetAspect);
      bSy = Math.round((vh - bSh) / 2);
    }

    ctx.drawImage(video, bSx, bSy, bSw, bSh, 0, 0, outW, outH);
    ctx.restore();

    // Subtle dark overlay to keep it cinematic
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, outW, outH);
    ctx.restore();

    // Foreground (fit) — zoom-out by shrinking inside the frame
    const scaleFit = Math.min(outW / vw, outH / vh) * z;
    const dw = vw * scaleFit;
    const dh = vh * scaleFit;
    const dx = (outW - dw) / 2;
    const dy = (outH - dh) / 2;

    ctx.save();
    ctx.filter = "none";
    ctx.globalAlpha = 1;
    ctx.drawImage(video, 0, 0, vw, vh, dx, dy, dw, dh);

    // Tiny top/bottom fade
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, outW, 18);
    ctx.fillRect(0, outH - 18, outW, 18);
    ctx.restore();

    return;
  }

  // ---- Normal + zoom-in (z >= 1): your original COVER crop ----
  let sx = 0,
    sy = 0,
    sw = vw,
    sh = vh;

  if (srcAspect > targetAspect) {
    sw = Math.round(vh * targetAspect);
    sx = Math.round((vw - sw) / 2);
  } else {
    sh = Math.round(vw / targetAspect);
    sy = Math.round((vh - sh) / 2);
  }

  const cx = sx + sw / 2;
  const cy = sy + sh / 2;

  sw = sw / z;
  sh = sh / z;

  sx = Math.round(cx - sw / 2);
  sy = Math.round(cy - sh / 2);

  sx = Math.max(0, Math.min(vw - sw, sx));
  sy = Math.max(0, Math.min(vh - sh, sy));

  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, outW, outH);
}

/* --- SVG icons pulled from your Illustrator export (tight viewBoxes) --- */
function IconCloud() {
  return (
    <svg className="uiIcon" viewBox="1640 38 30 22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M1656.28,40.03c2.76,0,5.87,1.85,6.15,5.91l.11,1.6,1.61.04c3.44.09,4.97,2.58,4.97,5s-1.54,4.91-4.93,5h-15.3c-2.97,0-5.38-2.41-5.38-5.38s2.28-5.27,5.19-5.38l1.46-.05.23-1.45c.61-3.91,3.44-5.3,5.89-5.3M1656.28,38.26c-3.47,0-6.92,2.2-7.64,6.8-3.83.13-6.9,3.29-6.9,7.14s3.21,7.15,7.15,7.15h15.3c8.93-.23,8.93-13.31,0-13.54-.35-4.95-4.15-7.55-7.92-7.55h.01Z"
      />
    </svg>
  );
}

function IconVideo() {
  return (
    <svg className="uiIcon" viewBox="972 887 30 22" aria-hidden="true">
      <path
        fill="currentColor"
        d="M999.26,888.64c-.2-.1-.45-.1-.65.05l-4.58,3.55v-3.65c0-.35-.3-.65-.65-.65h-16.56c-1.84,0-3.33,1.49-3.33,3.33v9.5c0,1.84,1.49,3.33,3.33,3.33h16.56c.35,0,.65-.3.65-.6v-3.74l4.58,3.6c.15.1.25.15.4.15.05,0,.15-.05.25-.1.2-.1.35-.3.35-.55v-13.68c0-.25-.15-.45-.35-.55h0ZM992.79,902.87h-15.96c-1.14,0-2.09-.94-2.09-2.09v-9.5c0-1.14.94-2.09,2.09-2.09h15.96v13.68h0ZM998.41,901.57l-4.38-3.38v-4.33l4.38-3.38v11.09Z"
      />
    </svg>
  );
}

function IconPhoto() {
  return (
    <svg className="uiIcon" viewBox="1184 883 30 26" aria-hidden="true">
      <path
        fill="currentColor"
        d="M1200.16,891.08c-3.43,0-6.22,2.79-6.22,6.22s2.79,6.22,6.22,6.22,6.22-2.83,6.22-6.22-2.79-6.22-6.22-6.22ZM1200.16,902.27c-2.74,0-4.97-2.24-4.97-4.97s2.24-4.97,4.97-4.97,4.97,2.24,4.97,4.97-2.24,4.97-4.97,4.97Z"
      />
      <path
        fill="currentColor"
        d="M1210.6,887.35h-2.83l-.5-1.24c-.45-1.09-1.54-1.84-2.74-1.84h-8.7c-1.24,0-2.29.7-2.74,1.84l-.5,1.24h-2.83c-1.64,0-2.98,1.34-2.98,2.98v13.78c0,1.64,1.34,2.98,2.98,2.98h20.79c1.64,0,2.98-1.34,3.03-2.98v-13.78c0-1.64-1.34-2.98-2.98-2.98h0ZM1212.29,904.11c0,.94-.8,1.74-1.74,1.74h-20.79c-.95,0-1.74-.8-1.74-1.74v-13.78c0-.94.8-1.74,1.74-1.74h3.23c.3,0,.5-.15.6-.4l.6-1.64c.3-.65.9-1.04,1.59-1.04h8.7c.7,0,1.34.4,1.59,1.04l.65,1.64c.1.25.35.4.6.4h3.23c.94,0,1.74.8,1.74,1.74v13.78h0Z"
      />
    </svg>
  );
}

function IconGallery() {
  return (
    <svg className="uiIcon" viewBox="333 987 27 18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M358.7,987.83h0c-.17-.17-.41-.28-.67-.28h-22.38c-.26,0-.5.11-.67.28h0c-.17.17-.28.41-.28.67v15.25c0,.26.11.5.28.67h0c.17.17.41.28.67.28h22.38c.26,0,.5-.11.67-.28h0c.17-.17.28-.41.28-.67v-15.25c0-.26-.11-.5-.28-.67ZM357.97,988.56v13.23l-6.7-6.03-.36-.32-.34.34-2.68,2.72-5.36-5.8-.34-.37-.37.34-6.11,5.7v-9.81h22.26,0ZM335.71,999.74l6.43-5.99,5.04,5.46-4.42,4.48h-7.05v-3.95ZM344.18,1003.7l6.78-6.87,7.02,6.32v.55h-13.8Z"
      />
      <path
        fill="currentColor"
        d="M354.41,994.72c.7,0,1.33-.28,1.79-.74.46-.46.74-1.09.74-1.79s-.28-1.33-.74-1.79c-.46-.46-1.09-.74-1.79-.74s-1.33.28-1.79.74c-.46.46-.74,1.09-.74,1.79s.28,1.33.74,1.79c.46.46,1.09.74,1.79.74ZM353.33,991.1c.28-.28.66-.45,1.08-.45s.8.17,1.08.45.45.66.45,1.08-.17.8-.45,1.08-.66.45-1.08.45-.8-.17-1.08-.45-.45-.66-.45-1.08.17-.8.45-1.08Z"
      />
    </svg>
  );
}

function IconAccessory() {
  return (
    <svg className="uiIcon" viewBox="541 983 16 26" aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M554.36,1000.17l-4.53-4.53,4.5-4.5-6.65-6.54v8.9l-3.76-3.76-1.36,1.36,4.6,4.6-4.63,4.63,1.36,1.36,3.78-3.78v8.95l6.67-6.67h0l.02-.02ZM549.43,988.85l2.3,2.35-2.3,2.3v-4.65h0ZM549.43,997.74l2.3,2.35-2.3,2.3v-4.65h0Z"
      />
    </svg>
  );
}

export default function Capture() {
  const [tab, setTab] = useState<Tab>("capture");
  const [mode, setMode] = useState<Mode>("video");

  const [cloudOn, setCloudOn] = useState(false);

  // Placeholder (UI only) for front/back camera flip button
  const [flipUiOn, setFlipUiOn] = useState(false);

  // Stage scale for responsive fit
  const [stageScale, setStageScale] = useState(1);

  // Zoom states
  const [zoomLand, setZoomLand] = useState(1.0);
  const [zoomPort, setZoomPort] = useState(1.0);

  // Which slider is open (if any)
  const [zoomPanel, setZoomPanel] = useState<null | "land" | "port">(null);

  const liveVideoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const previewLandscapeRef = useRef<HTMLVideoElement | null>(null);
  const previewPortraitRef = useRef<HTMLVideoElement | null>(null);

  const canvasLandscapeRef = useRef<HTMLCanvasElement | null>(null);
  const canvasPortraitRef = useRef<HTMLCanvasElement | null>(null);

  const rafRef = useRef<number | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const recLandRef = useRef<MediaRecorder | null>(null);
  const recPortRef = useRef<MediaRecorder | null>(null);
  const chunksLandRef = useRef<BlobPart[]>([]);
  const chunksPortRef = useRef<BlobPart[]>([]);

  const mimeType = useMemo(() => pickMimeType(), []);

  // --- Properly centre the stage and scale it to fit viewport (no top cropping) ---
  useEffect(() => {
    const onResize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const s = Math.min(vw / STAGE_W, vh / STAGE_H);
      setStageScale(Math.min(1.2, Math.max(0.35, s)));
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // --- Start camera once ---
  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30, max: 60 },
            facingMode: "user",
          },
          audio: true, // mic always on (no mute toggle)
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        // Hidden source video for canvas drawing
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = stream;
          await liveVideoRef.current.play().catch(() => {});
        }

        // Preview videos (ALWAYS muted to avoid speaker playback / echo)
        if (previewLandscapeRef.current) {
          previewLandscapeRef.current.srcObject = stream;
          previewLandscapeRef.current.muted = true;
          await previewLandscapeRef.current.play().catch(() => {});
        }
        if (previewPortraitRef.current) {
          previewPortraitRef.current.srcObject = stream;
          previewPortraitRef.current.muted = true;
          await previewPortraitRef.current.play().catch(() => {});
        }

        // Canvas drawing loop (for dual-format recording + photos)
        const tick = () => {
          const v = liveVideoRef.current;
          const cL = canvasLandscapeRef.current;
          const cP = canvasPortraitRef.current;

          if (v && cL && cP) {
            const ctxL = cL.getContext("2d");
            const ctxP = cP.getContext("2d");
            if (ctxL) drawCover(ctxL, v, cL.width, cL.height, zoomLand);
            if (ctxP) drawCover(ctxP, v, cP.width, cP.height, zoomPort);
          }

          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (e) {
        console.error(e);
        alert("Camera/Mic permission failed. Please allow access, then refresh.");
      }
    }

    start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close zoom panel if you click outside
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (target.closest(".zoomPill") || target.closest(".zoomPanel")) return;
      setZoomPanel(null);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, []);

  // --- Recording control ---
  const startRecording = () => {
    if (isRecording) return;
    const cL = canvasLandscapeRef.current;
    const cP = canvasPortraitRef.current;
    const stream = streamRef.current;

    if (!cL || !cP || !stream) return;

    // canvas capture streams (video)
    const landStream = cL.captureStream(30);
    const portStream = cP.captureStream(30);

    // audio track (always, since mic toggle removed)
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      landStream.addTrack(audioTrack);
      portStream.addTrack(audioTrack);
    }

    chunksLandRef.current = [];
    chunksPortRef.current = [];

    try {
      const rL = new MediaRecorder(landStream, mimeType ? { mimeType } : {});
      const rP = new MediaRecorder(portStream, mimeType ? { mimeType } : {});

      recLandRef.current = rL;
      recPortRef.current = rP;

      rL.ondataavailable = (ev) => {
        if (ev.data && ev.data.size) chunksLandRef.current.push(ev.data);
      };
      rP.ondataavailable = (ev) => {
        if (ev.data && ev.data.size) chunksPortRef.current.push(ev.data);
      };

      rL.onstop = () => {
        const blob = new Blob(chunksLandRef.current, { type: mimeType || "video/webm" });
        downloadBlob(blob, `flipcast_landscape_${Date.now()}.webm`);
      };

      rP.onstop = () => {
        const blob = new Blob(chunksPortRef.current, { type: mimeType || "video/webm" });
        downloadBlob(blob, `flipcast_portrait_${Date.now()}.webm`);
      };

      rL.start();
      rP.start();
      setIsRecording(true);
    } catch (e) {
      console.error(e);
      alert("Recording failed in this browser. Try Chrome.");
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    try {
      recLandRef.current?.stop();
      recPortRef.current?.stop();
    } catch {}
    setIsRecording(false);
  };

  const takePhotos = async () => {
    const cL = canvasLandscapeRef.current;
    const cP = canvasPortraitRef.current;
    if (!cL || !cP) return;

    const blobL: Blob | null = await new Promise((resolve) => cL.toBlob((b) => resolve(b), "image/png"));
    const blobP: Blob | null = await new Promise((resolve) => cP.toBlob((b) => resolve(b), "image/png"));

    if (blobL) downloadBlob(blobL, `flipcast_landscape_${Date.now()}.png`);
    if (blobP) downloadBlob(blobP, `flipcast_portrait_${Date.now()}.png`);
  };

  const onBigRedPress = async () => {
    setZoomPanel(null);

    if (mode === "photo") {
      await takePhotos();
      return;
    }
    if (!isRecording) startRecording();
    else stopRecording();
  };

  const isTab = (t: Tab) => tab === t;

  return (
    <div className="page">
      {/* Hidden live video source for canvas drawing */}
      <video
        ref={liveVideoRef}
        playsInline
        muted
        style={{ position: "absolute", left: -99999, top: -99999 }}
      />

      {/* Offscreen canvases used for dual recording + photos */}
      <canvas
        ref={canvasLandscapeRef}
        width={1280}
        height={720}
        style={{ position: "absolute", left: -99999, top: -99999 }}
      />
      <canvas
        ref={canvasPortraitRef}
        width={720}
        height={1280}
        style={{ position: "absolute", left: -99999, top: -99999 }}
      />

      {/* Stage holder - true centre scaling (no cropping) */}
      <div className="stageViewport">
        <div
          className="stage"
          style={{
            width: STAGE_W,
            height: STAGE_H,
            transform: `translate(-50%, -50%) scale(${stageScale})`,
          }}
        >
          {/* Background */}
          <div className="bg" />

          {/* Cloud Sync */}
          <button
            className={`cloudBtn ${cloudOn ? "on" : ""}`}
            onClick={() => setCloudOn((v) => !v)}
            type="button"
            aria-label="Cloud Sync"
          >
            <span className="cloudIcon" aria-hidden="true">
              <IconCloud />
            </span>
            <span className="cloudText">CLOUD SYNC</span>
          </button>

          {/* Landscape Frame */}
          <div className="frame landscapeFrame">
            <video
              ref={previewLandscapeRef}
              playsInline
              muted
              className="previewVideo"
              style={{ transform: `scale(${zoomLand})` }}
            />
            <div className="tag tagLeft">
              <span className="tagStrong">16:9</span>&nbsp; LANDSCAPE
            </div>

            <button
              className="zoomPill zoomRight"
              type="button"
              onClick={() => setZoomPanel((p) => (p === "land" ? null : "land"))}
            >
              {zoomLand.toFixed(1)}×
            </button>

            {zoomPanel === "land" && (
              <div className="zoomPanel zoomPanelRight">
                <div className="zoomPanelTitle">LANDSCAPE ZOOM</div>
                <input
                  className="zoomSlider"
                  type="range"
                  min={0.3}
                  max={3}
                  step={0.05}
                  value={zoomLand}
                  onChange={(e) => setZoomLand(parseFloat(e.target.value))}
                />
                <div className="zoomPanelValue">{zoomLand.toFixed(2)}×</div>
              </div>
            )}
          </div>

          {/* Portrait Frame */}
          <div className="frame portraitFrame">
            <video
              ref={previewPortraitRef}
              playsInline
              muted
              className="previewVideo"
              style={{ transform: `scale(${zoomPort})` }}
            />

            <button
              className="zoomPill zoomLeft"
              type="button"
              onClick={() => setZoomPanel((p) => (p === "port" ? null : "port"))}
            >
              {zoomPort.toFixed(1)}×
            </button>

            {zoomPanel === "port" && (
              <div className="zoomPanel zoomPanelLeft">
                <div className="zoomPanelTitle">PORTRAIT ZOOM</div>
                <input
                  className="zoomSlider"
                  type="range"
                  min={0.3}
                  max={3}
                  step={0.05}
                  value={zoomPort}
                  onChange={(e) => setZoomPort(parseFloat(e.target.value))}
                />
                <div className="zoomPanelValue">{zoomPort.toFixed(2)}×</div>
              </div>
            )}

            <div className="tag tagRight">
              <span className="tagStrong">9:16</span>&nbsp; PORTRAIT
            </div>
          </div>

          {/* Logo — size is controlled ONLY via CSS width (no transform scaling) */}
          <div className="logo" aria-hidden="true">
            <svg viewBox="90 850 420 110">
              <defs>
                <style>
                  {`
                    .st0{fill:#23c1a7}
                    .st2{fill:#fff}
                    .st3{fill:#231f20}
                    .st4{fill:#25a0e0}
                    .st9{fill:#808184}
                  `}
                </style>
              </defs>

              <g>
                <g>
                  <g>
                    <path className="st3" d="M177.18,860.08h175.6c4.82,0,8.72,3.91,8.72,8.72v46.16c0,4.82-3.91,8.72-8.72,8.72h-175.6c-4.81,0-8.72-3.91-8.72-8.72v-46.16c0-4.82,3.91-8.72,8.72-8.72Z" />
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
                    <path className="st2" d="M205.5,908.53v-39.88h6.26v44.52h-1.61c-2.57,0-4.65-2.08-4.65-4.65Z" />
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
                    <path className="st2" d="M216.76,875.99v-7.34h6.26v7.34h-6.26ZM216.76,908.53v-28.69h6.26v33.33h-1.61c-2.57,0-4.65-2.08-4.65-4.65Z" />
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
                  <g>
                    <g>
                      <path
                        className="st0"
                        d="M106.57,895.94h17l8.13-8.13h-25.12c1.94-11.33,11.8-19.98,23.68-19.98,5.75,0,11.27,2.06,15.63,5.79l5.77-5.77c-5.9-5.26-13.49-8.15-21.4-8.15-17.74,0-32.18,14.43-32.18,32.18,0,7.91,2.9,15.5,8.15,21.4l5.77-5.77c-2.84-3.31-4.7-7.31-5.43-11.57Z"
                      />
                      <path
                        className="st9"
                        d="M128.4,923.99v-8.16c-5.06-.39-9.91-2.4-13.77-5.7l-5.77,5.77c5.4,4.81,12.33,7.68,19.54,8.09Z"
                      />
                    </g>
                    <g>
                      <path
                        className="st0"
                        d="M130.25,872.71c-9.35,0-17.28,6.7-18.86,15.92l2.06.35c1.41-8.22,8.48-14.19,16.8-14.19,3.88,0,7.64,1.34,10.67,3.78l1.49-1.49c-3.43-2.83-7.73-4.38-12.16-4.38Z"
                      />
                      <path
                        className="st0"
                        d="M113.44,894.76l-2.06.35c.56,3.28,1.98,6.35,4.09,8.92l1.49-1.49c-1.81-2.26-3.03-4.93-3.52-7.78Z"
                      />
                    </g>
                    <g>
                      <path
                        className="st4"
                        d="M149.42,891.87c0-4.43-1.56-8.73-4.38-12.16l-1.49,1.49c2.44,3.03,3.78,6.8,3.78,10.67,0,8.68-6.64,16.02-15.22,16.95v2.1c9.74-.94,17.31-9.23,17.31-19.05Z"
                      />
                      <path
                        className="st9"
                        d="M119.58,905.17l-1.49,1.49c2.92,2.4,6.55,3.9,10.3,4.27v-2.1c-3.2-.35-6.3-1.63-8.82-3.65Z"
                      />
                    </g>
                    <rect
                      className="st0"
                      x="98.14"
                      y="891.43"
                      width="64.24"
                      height=".84"
                      transform="translate(-592.48 353.32) rotate(-45)"
                    />
                    <rect className="st9" x="129.84" y="908.82" width=".84" height="15.17" />
                  </g>
                  <path
                    className="st4"
                    d="M154.28,870.47l-5.77,5.77c3.73,4.35,5.79,9.87,5.79,15.63,0,12.6-9.71,23-22.19,23.96v8.17c17.01-.97,30.32-15.05,30.32-32.12,0-7.91-2.9-15.5-8.15-21.4Z"
                  />
                </g>
              </g>
            </svg>
          </div>

          {/* Bottom left tabs */}
          <div className="tabs">
            <button
              className={`pill ${isTab("capture") ? "active" : ""}`}
              type="button"
              onClick={() => setTab("capture")}
            >
              <span className="pillIcon" aria-hidden="true">
                <IconVideo />
              </span>
              CAPTURE
            </button>
            <button
              className={`pill ${isTab("gallery") ? "active" : ""}`}
              type="button"
              onClick={() => setTab("gallery")}
            >
              <span className="pillIcon" aria-hidden="true">
                <IconGallery />
              </span>
              GALLERY
            </button>
            <button
              className={`pill ${isTab("accessory") ? "active" : ""}`}
              type="button"
              onClick={() => setTab("accessory")}
            >
              <span className="pillIcon" aria-hidden="true">
                <IconAccessory />
              </span>
              ACCESSORY
            </button>
          </div>

          {/* Camera flip placeholder (UI only) — replaces mic toggle */}
          <button
            className={`flipCam ${flipUiOn ? "on" : ""}`}
            type="button"
            onClick={() => setFlipUiOn((v) => !v)}
            aria-label="Front/Back Camera (placeholder)"
            title="Front/Back Camera (placeholder)"
          >
            <span className="flipGlyph" aria-hidden="true">
              ⇄
            </span>
          </button>

          {/* Video/Photo toggle group */}
          <div className="modeWrap">
            <button
              type="button"
              className={`modeBtn ${mode === "video" ? "active" : ""}`}
              onClick={() => setMode("video")}
            >
              <span className="modeIcon" aria-hidden="true">
                <IconVideo />
              </span>
              <span className="modeText">VIDEO</span>
            </button>
            <button
              type="button"
              className={`modeBtn ${mode === "photo" ? "active" : ""}`}
              onClick={() => setMode("photo")}
            >
              <span className="modeIcon" aria-hidden="true">
                <IconPhoto />
              </span>
              <span className="modeText">PHOTO</span>
            </button>
          </div>

          {/* Big red record/shutter button */}
          <button
            type="button"
            className={`bigRed ${isRecording ? "recording" : ""}`}
            onClick={onBigRedPress}
            aria-label={mode === "photo" ? "Take photo" : isRecording ? "Stop recording" : "Start recording"}
          >
            <div className="bigRedOuter" />
            <div className="bigRedInner" />
          </button>

          {/* Tiny status */}
          <div className="tinyStatus">
            {tab.toUpperCase()} · {mode.toUpperCase()}
            {mode === "video" ? (isRecording ? " · REC" : "") : ""}
          </div>
        </div>
      </div>

      <style>{`
        .page{
          width:100vw;
          height:100vh;
          overflow:hidden;
          background:#0b0f18;
        }

        /* TRUE centring for a transformed element (fixes the top cropping issue) */
        .stageViewport{
          position:relative;
          width:100%;
          height:100%;
          overflow:hidden;
        }

        .stage{
          position:absolute;
          left:50%;
          top:50%;
          /* IMPORTANT: centre-based origin keeps stage truly centred on resize */
          transform-origin: 50% 50%;
          border-radius: 40px;
        }

        .bg{
          position:absolute; inset:0;
          background:
            radial-gradient(1200px 700px at 40% 30%, rgba(255,255,255,0.06), rgba(0,0,0,0)),
            radial-gradient(900px 600px at 80% 80%, rgba(0,0,0,0.35), rgba(0,0,0,0)),
            #0b0f18;
        }

        /* Shared icon sizing */
        .uiIcon{
          width: 18px;
          height: 18px;
          display:block;
        }

        /* Cloud button */
        .cloudBtn{
          position:absolute;
          right: 92px;
          top: 28px;
          height: 42px;
          padding: 0 18px;
          border-radius: 999px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.20);
          color:#fff;
          display:flex;
          gap:10px;
          align-items:center;
          cursor:pointer;
          letter-spacing: 0.06em;
          font-weight: 700;
          font-size: 14px;
          backdrop-filter: blur(10px);
          z-index: 5;
        }
        .cloudBtn.on{
          border-color: rgba(35,193,167,0.55);
          box-shadow: 0 0 0 2px rgba(35,193,167,0.18) inset;
        }
        .cloudIcon{
          display:flex;
          align-items:center;
          justify-content:center;
          opacity:0.95;
        }
        .cloudText{ transform: translateY(0.5px); }

        /* Frames */
        .frame{
          position:absolute;
          overflow:hidden;
          border-radius: 42px;
          border: 1.2px solid rgba(102,114,104,0.85);
          box-shadow:
            0 18px 60px rgba(0,0,0,0.55),
            0 0 0 1px rgba(255,255,255,0.06) inset;
          background:#000;
        }

        .landscapeFrame{ left: 99px; top: 96px; width: 1280px; height: 720px; }
        .portraitFrame{ left: 1428px; top: 94px; width: 405px; height: 720px; }

        .previewVideo{
          width:100%;
          height:100%;
          object-fit: cover;
          object-position: center;
          filter: contrast(1.05) brightness(0.95);
          transform-origin: center center;
        }

        .tag{
          position:absolute;
          bottom: 26px;
          height: 34px;
          padding: 0 14px;
          border-radius: 9px;
          display:flex;
          align-items:center;
          gap: 6px;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 0.06em;
          color: rgba(255,255,255,0.92);
          background: rgba(0,0,0,0.38);
          border: 1px solid rgba(255,255,255,0.18);
          backdrop-filter: blur(8px);
          z-index: 3;
        }
        .tagStrong{
          font-weight: 900;
          color: #fff;
        }
        .tagLeft{ left: 28px; }
        .tagRight{ right: 28px; }

        .zoomPill{
          position:absolute;
          height: 34px;
          padding: 0 14px;
          border-radius: 999px;
          display:flex;
          align-items:center;
          font-size: 14px;
          font-weight: 900;
          letter-spacing: 0.03em;
          color: rgba(255,255,255,0.92);
          background: rgba(0,0,0,0.34);
          border: 1px solid rgba(255,255,255,0.18);
          backdrop-filter: blur(8px);
          cursor:pointer;
          z-index: 6;
        }
        .zoomLeft{ left: 28px; top: 26px; }
        .zoomRight{ right: 28px; top: auto; bottom: 22px; }

        /* Zoom panel */
        .zoomPanel{
          position:absolute;
          width: 240px;
          padding: 12px 12px 10px 12px;
          border-radius: 14px;
          background: rgba(0,0,0,0.55);
          border: 1px solid rgba(255,255,255,0.18);
          backdrop-filter: blur(10px);
          box-shadow: 0 16px 50px rgba(0,0,0,0.55);
          z-index: 10;
        }
        .zoomPanelLeft{ left: 28px; top: 66px; }
        .zoomPanelRight{ right: 28px; bottom: 66px; }
        .zoomPanelTitle{
          font-size: 12px;
          letter-spacing: 0.10em;
          font-weight: 800;
          color: rgba(255,255,255,0.80);
          margin-bottom: 8px;
        }
        .zoomSlider{
          width: 100%;
        }
        .zoomPanelValue{
          margin-top: 8px;
          font-size: 13px;
          font-weight: 800;
          letter-spacing: 0.04em;
          color: rgba(255,255,255,0.92);
          text-align: right;
        }

        /* LOGO — predictable sizing via width (NO transform scaling) */
        .logo{
          position:absolute;
          left: 92px;
          top: 820px;

          /* 👇 Change ONLY this to resize. Try 360px–520px */
          --LOGO_W: 420px;

          width: var(--LOGO_W);
          height: auto;

          transform: none;
          filter: drop-shadow(0 10px 24px rgba(0,0,0,0.55));
          pointer-events:none;
          opacity: 0.95;

          /* keep behind all controls */
          z-index: 1;
        }
        .logo svg{
          width: 100%;
          height: auto;
          display:block;
        }

        /* Bottom left tabs */
        .tabs{
          position:absolute;
          left: 92px;
          top: 968px;
          display:flex;
          gap: 22px;
          z-index: 7;
        }
        .pill{
          height: 58px;
          min-width: 170px;
          padding: 0 22px;
          border-radius: 999px;
          background: rgba(0,0,0,0.25);
          border: 1px solid rgba(255,255,255,0.22);
          color: rgba(255,255,255,0.86);
          font-weight: 800;
          font-size: 16px;
          letter-spacing: 0.08em;
          cursor:pointer;
          backdrop-filter: blur(10px);
          box-shadow: 0 0 0 1px rgba(255,255,255,0.05) inset;
          display:flex;
          align-items:center;
          justify-content:center;
          gap: 12px;
        }
        .pillIcon{
          display:flex;
          align-items:center;
          justify-content:center;
          opacity: 0.92;
        }
        .pill.active{
          border-color: rgba(35,193,167,0.65);
          color: #fff;
          box-shadow:
            0 0 0 2px rgba(35,193,167,0.18) inset,
            0 10px 30px rgba(0,0,0,0.45);
        }

        /* Camera Flip (placeholder) */
        .flipCam{
          position:absolute;
          left: 809px;
          top: 855px;
          width: 82px;
          height: 82px;
          border-radius: 999px;
          border: 1.2px solid rgba(102,114,104,0.85);
          background: rgba(0,0,0,0.25);
          display:flex;
          align-items:center;
          justify-content:center;
          cursor:pointer;
          backdrop-filter: blur(10px);
          box-shadow: 0 0 0 1px rgba(255,255,255,0.05) inset;
          z-index: 7;

          /* UI-only feedback */
          color: rgba(255,255,255,0.86);
        }
        .flipCam.on{
          border-color: rgba(35,193,167,0.65);
          box-shadow: 0 0 0 2px rgba(35,193,167,0.18) inset;
          color: #fff;
        }
        .flipGlyph{
          font-size: 26px;
          font-weight: 900;
          opacity: 0.95;
          transform: translateY(-1px);
          user-select:none;
        }

        /* Video/Photo toggle group */
        .modeWrap{
          position:absolute;
          left: 921px;
          top: 855px;
          width: 454px;
          height: 82px;
          border-radius: 999px;
          border: 1.2px solid rgba(102,114,104,0.85);
          background: rgba(0,0,0,0.20);
          display:flex;
          padding: 7px;
          gap: 8px;
          backdrop-filter: blur(10px);
          box-shadow: 0 0 0 1px rgba(255,255,255,0.05) inset;
          z-index: 7;
        }
        .modeBtn{
          flex:1;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.14);
          background: rgba(0,0,0,0.10);
          color: rgba(255,255,255,0.80);
          cursor:pointer;
          display:flex;
          align-items:center;
          justify-content:center;
          gap: 10px;
          font-weight: 900;
          letter-spacing: 0.08em;
          font-size: 16px;
        }
        .modeBtn.active{
          background: rgba(255,255,255,0.92);
          color: #0b0f18;
          border-color: rgba(255,255,255,0.65);
          box-shadow: 0 10px 26px rgba(0,0,0,0.35);
        }
        .modeIcon{
          display:flex;
          align-items:center;
          justify-content:center;
          opacity: 0.95;
        }
        .modeBtn.active .modeIcon{
          opacity: 1;
        }
        .modeText{ transform: translateY(0.5px); }

        /* Big red button */
        .bigRed{
          position:absolute;
          left: 1546px;
          top: 845px;
          width: 168px;
          height: 168px;
          border-radius: 999px;
          background: transparent;
          border: none;
          cursor:pointer;
          display:flex;
          align-items:center;
          justify-content:center;
          z-index: 7;
        }
        .bigRedOuter{
          position:absolute;
          width: 168px;
          height: 168px;
          border-radius: 999px;
          border: 8px solid rgba(255,255,255,0.85);
          box-shadow: 0 18px 60px rgba(0,0,0,0.55);
        }
        .bigRedInner{
          position:absolute;
          width: 132px;
          height: 132px;
          border-radius: 999px;
          background: #ea1d32;
          box-shadow:
            0 0 0 3px rgba(0,0,0,0.20) inset,
            0 12px 40px rgba(0,0,0,0.55);
        }
        .bigRed.recording .bigRedInner{
          background:#ff3b4f;
          box-shadow:
            0 0 0 3px rgba(0,0,0,0.22) inset,
            0 0 0 10px rgba(234,29,50,0.12);
        }

        .tinyStatus{
          position:absolute;
          left: 50%;
          top: 1048px;
          transform: translateX(-50%);
          font-size: 12px;
          letter-spacing: 0.10em;
          color: rgba(255,255,255,0.20);
          user-select:none;
          pointer-events:none;
          z-index: 7;
        }
      `}</style>
    </div>
  );
}
