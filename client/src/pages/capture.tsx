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
 * Draw helpers: centre-crop the source video to a target aspect ratio,
 * with optional zoom (>= 1.0 means closer).
 */
function drawCoverZoom(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  outW: number,
  outH: number,
  zoom: number
) {
  const vw = video.videoWidth || 0;
  const vh = video.videoHeight || 0;
  if (!vw || !vh) return;

  const z = Math.max(1, zoom || 1);

  const targetAspect = outW / outH;
  const srcAspect = vw / vh;

  let sx = 0,
    sy = 0,
    sw = vw,
    sh = vh;

  // First: basic centre-crop to match target aspect
  if (srcAspect > targetAspect) {
    sw = Math.round(vh * targetAspect);
    sx = Math.round((vw - sw) / 2);
  } else {
    sh = Math.round(vw / targetAspect);
    sy = Math.round((vh - sh) / 2);
  }

  // Then: apply zoom by shrinking the crop window around its centre
  const cx = sx + sw / 2;
  const cy = sy + sh / 2;

  const zw = sw / z;
  const zh = sh / z;

  let zx = cx - zw / 2;
  let zy = cy - zh / 2;

  // Clamp to bounds
  zx = Math.max(0, Math.min(vw - zw, zx));
  zy = Math.max(0, Math.min(vh - zh, zy));

  ctx.clearRect(0, 0, outW, outH);
  ctx.drawImage(video, zx, zy, zw, zh, 0, 0, outW, outH);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export default function Capture() {
  const [tab, setTab] = useState<Tab>("capture");
  const [mode, setMode] = useState<Mode>("video");
  const [micOn, setMicOn] = useState(true);
  const [cloudOn, setCloudOn] = useState(false);

  const [stageScale, setStageScale] = useState(1);

  // Zoom states (independent)
  const [zoomLand, setZoomLand] = useState(1.0);
  const [zoomPort, setZoomPort] = useState(1.2);

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

  // --- Keep the whole UI locked to 1920x1080 and scale it to fit the viewport ---
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
          audio: true,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        // Mic state affects ONLY the audio track being enabled (recorded)
        const a = stream.getAudioTracks()[0];
        if (a) a.enabled = micOn;

        // Attach to hidden "source" video (muted)
        if (liveVideoRef.current) {
          liveVideoRef.current.srcObject = stream;
          liveVideoRef.current.muted = true;
          await liveVideoRef.current.play().catch(() => {});
        }

        // Attach to preview videos — ALWAYS MUTED (prevents speaker playback)
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

        // Canvas drawing loop (dual-format recording + photos)
        const tick = () => {
          const v = liveVideoRef.current;
          const cL = canvasLandscapeRef.current;
          const cP = canvasPortraitRef.current;

          if (v && cL && cP) {
            const ctxL = cL.getContext("2d");
            const ctxP = cP.getContext("2d");
            if (ctxL) drawCoverZoom(ctxL, v, cL.width, cL.height, zoomLand);
            if (ctxP) drawCoverZoom(ctxP, v, cP.width, cP.height, zoomPort);
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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Toggle mic track on/off (recorded audio) ---
  useEffect(() => {
    const s = streamRef.current;
    if (!s) return;
    const a = s.getAudioTracks()[0];
    if (a) a.enabled = micOn;
  }, [micOn]);

  // --- Recording control ---
  const startRecording = () => {
    if (isRecording) return;
    const cL = canvasLandscapeRef.current;
    const cP = canvasPortraitRef.current;
    const stream = streamRef.current;

    if (!cL || !cP || !stream) return;

    const landStream = cL.captureStream(30);
    const portStream = cP.captureStream(30);

    // audio track (optional)
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack && micOn) {
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
        const blob = new Blob(chunksLandRef.current, {
          type: mimeType || "video/webm",
        });
        downloadBlob(blob, `flipcast_landscape_${Date.now()}.webm`);
      };

      rP.onstop = () => {
        const blob = new Blob(chunksPortRef.current, {
          type: mimeType || "video/webm",
        });
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

    const blobL: Blob | null = await new Promise((resolve) =>
      cL.toBlob((b) => resolve(b), "image/png")
    );
    const blobP: Blob | null = await new Promise((resolve) =>
      cP.toBlob((b) => resolve(b), "image/png")
    );

    if (blobL) downloadBlob(blobL, `flipcast_landscape_${Date.now()}.png`);
    if (blobP) downloadBlob(blobP, `flipcast_portrait_${Date.now()}.png`);
  };

  const onBigRedPress = async () => {
    if (mode === "photo") {
      await takePhotos();
      return;
    }

    if (!isRecording) startRecording();
    else stopRecording();
  };

  // --- UI helpers ---
  const isTab = (t: Tab) => tab === t;

  // Zoom interactions
  const zoomSteps = [1.0, 1.1, 1.2, 1.3, 1.5, 1.8, 2.0];

  const cycleZoom = (current: number, setter: (n: number) => void) => {
    const idx = zoomSteps.findIndex((z) => Math.abs(z - current) < 0.01);
    const next = zoomSteps[(idx + 1 + zoomSteps.length) % zoomSteps.length];
    setter(next);
  };

  const onWheelZoom =
    (which: "land" | "port") => (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      const delta = e.deltaY;
      const step = delta > 0 ? -0.1 : 0.1; // wheel up = zoom in
      if (which === "land") setZoomLand((z) => round1(clamp(z + step, 1, 2.5)));
      else setZoomPort((z) => round1(clamp(z + step, 1, 2.5)));
    };

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

      {/* Centered stage that scales proportionally */}
      <div className="stageWrap">
        <div
          className="stage"
          style={{
            width: STAGE_W,
            height: STAGE_H,
            transform: `scale(${stageScale})`,
          }}
        >
          <div className="bg" />

          {/* Cloud Sync */}
          <button
            className={`cloudBtn ${cloudOn ? "on" : ""}`}
            onClick={() => setCloudOn((v) => !v)}
            type="button"
            aria-label="Cloud Sync"
          >
            <span className="cloudIcon">☁</span>
            <span className="cloudText">CLOUD SYNC</span>
          </button>

          {/* Landscape Frame */}
          <div className="frame landscapeFrame" onWheel={onWheelZoom("land")}>
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
              type="button"
              className="zoomPill zoomRight zoomBtn"
              onClick={() => cycleZoom(zoomLand, setZoomLand)}
              aria-label="Landscape zoom"
            >
              {zoomLand.toFixed(1)}×
            </button>
          </div>

          {/* Portrait Frame */}
          <div className="frame portraitFrame" onWheel={onWheelZoom("port")}>
            <video
              ref={previewPortraitRef}
              playsInline
              muted
              className="previewVideo"
              style={{ transform: `scale(${zoomPort})` }}
            />

            <button
              type="button"
              className="zoomPill zoomLeft zoomBtn"
              onClick={() => cycleZoom(zoomPort, setZoomPort)}
              aria-label="Portrait zoom"
            >
              {zoomPort.toFixed(1)}×
            </button>

            <div className="tag tagRight">
              <span className="tagStrong">9:16</span>&nbsp; PORTRAIT
            </div>
          </div>

          {/* Logo (unchanged) */}
          <div className="logo">
            <svg
              viewBox="90 850 420 110"
              width="520"
              height="140"
              aria-label="FlipCast Duo"
            >
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
              {/* --- your SVG group exactly as before --- */}
              <g>
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
                </g>
              </g>
            </svg>
          </div>

          {/* Tabs */}
          <div className="tabs">
            <button
              className={`pill ${isTab("capture") ? "active" : ""}`}
              type="button"
              onClick={() => setTab("capture")}
            >
              CAPTURE
            </button>
            <button
              className={`pill ${isTab("gallery") ? "active" : ""}`}
              type="button"
              onClick={() => setTab("gallery")}
            >
              GALLERY
            </button>
            <button
              className={`pill ${isTab("accessory") ? "active" : ""}`}
              type="button"
              onClick={() => setTab("accessory")}
            >
              ACCESSORY
            </button>
          </div>

          {/* Mic */}
          <button
            className={`mic ${micOn ? "on" : ""}`}
            type="button"
            onClick={() => setMicOn((v) => !v)}
            aria-label="Microphone"
          >
            <span className="micIcon">🎙</span>
            {!micOn && <span className="micMuteSlash" aria-hidden="true" />}
          </button>

          {/* Mode */}
          <div className="modeWrap">
            <button
              type="button"
              className={`modeBtn ${mode === "video" ? "active" : ""}`}
              onClick={() => setMode("video")}
            >
              <span className="modeIcon">📹</span>
              <span className="modeText">VIDEO</span>
            </button>
            <button
              type="button"
              className={`modeBtn ${mode === "photo" ? "active" : ""}`}
              onClick={() => setMode("photo")}
            >
              <span className="modeIcon">📷</span>
              <span className="modeText">PHOTO</span>
            </button>
          </div>

          {/* Big red */}
          <button
            type="button"
            className={`bigRed ${isRecording ? "recording" : ""}`}
            onClick={onBigRedPress}
            aria-label={
              mode === "photo"
                ? "Take photo"
                : isRecording
                ? "Stop recording"
                : "Start recording"
            }
          >
            <div className="bigRedOuter" />
            <div className="bigRedInner" />
          </button>

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

        .stageWrap{
          width:100%;
          height:100%;
          display:flex;
          align-items:center;
          justify-content:center;
        }

        .stage{
          position:relative;
          transform-origin: top left;
          border-radius: 40px;
        }

        .bg{
          position:absolute; inset:0;
          background:
            radial-gradient(1200px 700px at 40% 30%, rgba(255,255,255,0.06), rgba(0,0,0,0)),
            radial-gradient(900px 600px at 80% 80%, rgba(0,0,0,0.35), rgba(0,0,0,0)),
            #0b0f18;
        }

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
        }
        .cloudBtn.on{
          border-color: rgba(35,193,167,0.55);
          box-shadow: 0 0 0 2px rgba(35,193,167,0.18) inset;
        }
        .cloudIcon{ font-size: 18px; opacity:0.95; }
        .cloudText{ transform: translateY(0.5px); }

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
          pointer-events:none;
        }
        .tagStrong{ font-weight: 900; color: #fff; }
        .tagLeft{ left: 28px; }
        .tagRight{ right: 28px; }

        .zoomPill{
          position:absolute;
          top: 26px;
          height: 34px;
          padding: 0 14px;
          border-radius: 999px;
          display:flex;
          align-items:center;
          font-size: 14px;
          font-weight: 800;
          letter-spacing: 0.03em;
          color: rgba(255,255,255,0.92);
          background: rgba(0,0,0,0.34);
          border: 1px solid rgba(255,255,255,0.18);
          backdrop-filter: blur(8px);
        }
        .zoomBtn{
          cursor:pointer;
          pointer-events:auto;
          user-select:none;
        }
        .zoomBtn:hover{ border-color: rgba(255,255,255,0.35); }
        .zoomLeft{ left: 28px; }
        .zoomRight{ right: 28px; top: auto; bottom: 22px; }

        .logo{
          position:absolute;
          left: 92px;
          top: 820px;
          transform: scale(1.05);
          transform-origin: left top;
          filter: drop-shadow(0 10px 24px rgba(0,0,0,0.55));
          pointer-events:none;
        }

        .tabs{
          position:absolute;
          left: 92px;
          top: 968px;
          display:flex;
          gap: 22px;
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
        }
        .pill.active{
          border-color: rgba(35,193,167,0.65);
          color: #fff;
          box-shadow:
            0 0 0 2px rgba(35,193,167,0.18) inset,
            0 10px 30px rgba(0,0,0,0.45);
        }

        .mic{
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
        }
        .mic.on{
          border-color: rgba(35,193,167,0.65);
          box-shadow: 0 0 0 2px rgba(35,193,167,0.18) inset;
        }
        .micIcon{
          font-size: 26px;
          opacity: 0.95;
          transform: translateY(0.5px);
        }
        .micMuteSlash{
          position:absolute;
          width: 44px;
          height: 4px;
          background: rgba(234,29,50,0.95);
          transform: rotate(-35deg);
          border-radius: 4px;
          box-shadow: 0 0 0 2px rgba(0,0,0,0.35);
        }

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
        .modeIcon{ font-size: 18px; transform: translateY(-0.5px); }
        .modeText{ transform: translateY(0.5px); }

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
        }
      `}</style>
    </div>
  );
}
