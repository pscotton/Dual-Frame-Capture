import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

/**
 * FlipCastDuo — Capture screen (locked 1920x1080 stage that scales proportionally)
 * - Video previews work (getUserMedia -> <video>.srcObject)
 * - No placeholder alerts
 * - Bottom-left "CAPTURE" is navigation / current page only (doesn't record)
 * - Big red button does record (Video mode) or takes photos (Photo mode)
 * - Logo includes the missing first/icon part and is larger (no white panel)
 */

const STAGE_W = 1920;
const STAGE_H = 1080;

// Frames from your SVG coordinates
const LAND = { x: 99, y: 96, w: 1280, h: 720, r: 41 };
const PORT = { x: 1428, y: 94, w: 405, h: 720, r: 41 };

// UI positions (approx from SVG)
const CLOUD = { x: 1626, y: 28, w: 220, h: 52, r: 26 };
const LOGO = { x: 70, y: 820, w: 520, h: 130 }; // larger than before
const LEFT_BTNS = { y: 972, x1: 98, gap: 28, w: 190, h: 54, r: 27 };

const MIC = { cx: 851, cy: 896, r: 41 };
const MODE = { x: 962, y: 855, w: 412, h: 82, r: 41 };
const MODE_VIDEO = { x: 962, y: 863, w: 180, h: 66, r: 33 };
const MODE_PHOTO = { x: 1186, y: 863, w: 180, h: 66, r: 33 };

const REC = { cx: 1630, cy: 929, rOuter: 83, rInner: 71 };

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function useScaleToFit(containerRef: React.RefObject<HTMLDivElement>) {
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      const s = Math.min(rect.width / STAGE_W, rect.height / STAGE_H);
      setScale(clamp(s, 0.2, 2));
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  return scale;
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

function nowStamp() {
  const d = new Date();
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(
    d.getMinutes()
  )}-${pad(d.getSeconds())}`;
}

/** Minimal inline icon set (no dependencies) */
function IconCamera({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: "block" }}>
      <path
        d="M8 7l1.2-2h5.6L16 7h2.2A2.8 2.8 0 0 1 21 9.8v8.4A2.8 2.8 0 0 1 18.2 21H5.8A2.8 2.8 0 0 1 3 18.2V9.8A2.8 2.8 0 0 1 5.8 7H8Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M12 17a3.2 3.2 0 1 0 0-6.4A3.2 3.2 0 0 0 12 17Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function IconVideo({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: "block" }}>
      <path
        d="M4.8 7.5h9.7A2.5 2.5 0 0 1 17 10v4A2.5 2.5 0 0 1 14.5 16.5H4.8A2.8 2.8 0 0 1 2 13.7V10.3A2.8 2.8 0 0 1 4.8 7.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M17 11l5-3v8l-5-3v-2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMic({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: "block" }}>
      <path
        d="M12 14.5a3 3 0 0 0 3-3v-5a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M6.5 11.5v.7A5.5 5.5 0 0 0 12 17.7a5.5 5.5 0 0 0 5.5-5.5v-.7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path d="M12 17.7V21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M9 21h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconCloud({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: "block" }}>
      <path
        d="M8.2 18.5H18a3.5 3.5 0 0 0 .3-7 5.2 5.2 0 0 0-10-1.2A3.7 3.7 0 0 0 8.2 18.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Logo rebuilt as pure SVG (icon + FlipCastDuo wordmark),
 * NO white panel behind it, and sized larger.
 * (This includes the missing first/icon part.)
 */
function FlipCastDuoLogo({ width = 520 }: { width?: number }) {
  return (
    <svg width={width} viewBox="0 0 620 150" fill="none" style={{ display: "block" }}>
      {/* Icon (approx from your SVG "logo" group) */}
      <g transform="translate(0,18) scale(1.05)">
        <path
          d="M73.7 58.5h18.6l8.9-8.9H73.8c2.1-12.4 12.9-21.9 25.8-21.9 6.3 0 12.3 2.3 17.1 6.3l6.3-6.3c-6.4-5.7-14.7-8.9-23.4-8.9-19.4 0-35.2 15.8-35.2 35.2 0 8.7 3.2 16.9 8.9 23.4l6.3-6.3c-3.1-3.6-5.1-8-5.9-12.6Z"
          fill="#23c1a7"
        />
        <path
          d="M97.6 89.3v-8.9c-5.5-.4-10.8-2.6-15-6.2l-6.3 6.3c5.9 5.3 13.5 8.4 21.3 8.8Z"
          fill="#808184"
        />
        <path
          d="M119.9 54c0-4.8-1.7-9.5-4.8-13.2l-1.6 1.6c2.6 3.3 4.1 7.4 4.1 11.6 0 9.5-7.2 17.5-16.6 18.5v2.3c10.6-1 18.9-10 18.9-20.8Z"
          fill="#25a0e0"
        />
        <rect
          x="54"
          y="54"
          width="70"
          height="0.9"
          transform="rotate(-45 54 54)"
          fill="#23c1a7"
        />
      </g>

      {/* Wordmark */}
      <g transform="translate(145,28)">
        <text
          x="0"
          y="72"
          fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
          fontSize="78"
          fontWeight="700"
          fill="#ffffff"
          letterSpacing="-1"
        >
          Flip
        </text>
        <text
          x="140"
          y="72"
          fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
          fontSize="78"
          fontWeight="700"
          fill="#23c1a7"
          letterSpacing="-1"
        >
          Cast
        </text>
        <text
          x="310"
          y="72"
          fontFamily="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
          fontSize="78"
          fontWeight="600"
          fill="#808184"
          letterSpacing="-1"
        >
          Duo
        </text>
      </g>
    </svg>
  );
}

export default function Capture() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scale = useScaleToFit(containerRef);

  const landVideoRef = useRef<HTMLVideoElement>(null);
  const portVideoRef = useRef<HTMLVideoElement>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const [mode, setMode] = useState<"video" | "photo">("video");
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // simple zoom badges (UI only — you can wire to real zoom later)
  const [zoomLand, setZoomLand] = useState(1.0);
  const [zoomPort, setZoomPort] = useState(1.2);

  const canUseMedia = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

  const constraints = useMemo<MediaStreamConstraints>(
    () => ({
      video: {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30, max: 60 },
        facingMode: "user",
      },
      audio: audioEnabled,
    }),
    [audioEnabled]
  );

  async function stopStream() {
    const s = streamRef.current;
    streamRef.current = null;
    if (s) s.getTracks().forEach((t) => t.stop());
  }

  async function startStream() {
    if (!canUseMedia) return;
    await stopStream();

    const s = await navigator.mediaDevices.getUserMedia(constraints);
    streamRef.current = s;

    // Attach to BOTH preview videos
    if (landVideoRef.current) {
      landVideoRef.current.srcObject = s;
      // iOS/Safari friendliness
      landVideoRef.current.muted = true;
      landVideoRef.current.playsInline = true;
      await landVideoRef.current.play().catch(() => {});
    }
    if (portVideoRef.current) {
      portVideoRef.current.srcObject = s;
      portVideoRef.current.muted = true;
      portVideoRef.current.playsInline = true;
      await portVideoRef.current.play().catch(() => {});
    }

    setIsReady(true);
  }

  useEffect(() => {
    // Start camera on mount
    startStream().catch(() => setIsReady(false));

    // Cleanup
    return () => {
      stopStream().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restart stream when mic toggles (because audio track changes)
  useEffect(() => {
    startStream().catch(() => setIsReady(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioEnabled]);

  function startRecording() {
    const s = streamRef.current;
    if (!s) return;

    // Use a "recordable" stream: if audio disabled, still record video-only
    const recStream = audioEnabled ? s : new MediaStream(s.getVideoTracks());

    chunksRef.current = [];
    const mr = new MediaRecorder(recStream, {
      mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm",
    });

    mr.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      downloadBlob(blob, `FlipCastDuo_${nowStamp()}_video.webm`);
      chunksRef.current = [];
    };

    mr.start(250);
    recorderRef.current = mr;
    setIsRecording(true);
  }

  function stopRecording() {
    const mr = recorderRef.current;
    if (!mr) return;
    if (mr.state !== "inactive") mr.stop();
    recorderRef.current = null;
    setIsRecording(false);
  }

  async function takePhoto() {
    const s = streamRef.current;
    if (!s) return;

    // Grab from the landscape preview (same stream, so fine)
    const v = landVideoRef.current;
    if (!v) return;

    // Create 2 canvases to simulate the two outputs:
    // - Landscape: 16:9
    // - Portrait: 9:16 (center-crop)
    const landW = 1920;
    const landH = 1080;

    const portW = 1080;
    const portH = 1920;

    const vw = v.videoWidth || landW;
    const vh = v.videoHeight || landH;

    // LAND: cover into 16:9
    const c1 = document.createElement("canvas");
    c1.width = landW;
    c1.height = landH;
    const g1 = c1.getContext("2d")!;
    {
      const targetAR = landW / landH;
      const srcAR = vw / vh;
      let sx = 0,
        sy = 0,
        sw = vw,
        sh = vh;
      if (srcAR > targetAR) {
        // too wide -> crop sides
        sh = vh;
        sw = vh * targetAR;
        sx = (vw - sw) / 2;
      } else {
        // too tall -> crop top/bottom
        sw = vw;
        sh = vw / targetAR;
        sy = (vh - sh) / 2;
      }
      g1.drawImage(v, sx, sy, sw, sh, 0, 0, landW, landH);
    }

    // PORT: cover into 9:16
    const c2 = document.createElement("canvas");
    c2.width = portW;
    c2.height = portH;
    const g2 = c2.getContext("2d")!;
    {
      const targetAR = portW / portH; // 9/16
      const srcAR = vw / vh;
      let sx = 0,
        sy = 0,
        sw = vw,
        sh = vh;
      if (srcAR > targetAR) {
        // crop sides
        sh = vh;
        sw = vh * targetAR;
        sx = (vw - sw) / 2;
      } else {
        // crop top/bottom
        sw = vw;
        sh = vw / targetAR;
        sy = (vh - sh) / 2;
      }
      g2.drawImage(v, sx, sy, sw, sh, 0, 0, portW, portH);
    }

    const b1: Blob = await new Promise((res) => c1.toBlob((b) => res(b as Blob), "image/png"));
    const b2: Blob = await new Promise((res) => c2.toBlob((b) => res(b as Blob), "image/png"));

    downloadBlob(b1, `FlipCastDuo_${nowStamp()}_landscape.png`);
    downloadBlob(b2, `FlipCastDuo_${nowStamp()}_portrait.png`);
  }

  function onMainAction() {
    if (!isReady) return;

    if (mode === "video") {
      if (isRecording) stopRecording();
      else startRecording();
    } else {
      // photo mode
      takePhoto().catch(() => {});
    }
  }

  // Visual styling tuned to match your dark UI + subtle lines
  const styles = {
    page: {
      width: "100vw",
      height: "100vh",
      background: "radial-gradient(1200px 700px at 30% 20%, #0b1224 0%, #0b0f18 45%, #070a10 100%)",
      overflow: "hidden" as const,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    container: {
      width: "100%",
      height: "100%",
      padding: 16,
      boxSizing: "border-box" as const,
    },
    stageWrap: {
      width: "100%",
      height: "100%",
      position: "relative" as const,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    stage: {
      width: STAGE_W,
      height: STAGE_H,
      position: "absolute" as const,
      left: "50%",
      top: "50%",
      transform: `translate(-50%, -50%) scale(${scale})`,
      transformOrigin: "top left",
    },
    frameBase: {
      position: "absolute" as const,
      overflow: "hidden" as const,
      background: "#000",
      boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
    },
    frameBorder: {
      position: "absolute" as const,
      inset: 0,
      borderRadius: 41,
      pointerEvents: "none" as const,
      border: "1.2px solid rgba(138,160,125,0.65)", // muted green/grey
      boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.55)",
    },
    frameBorderPortrait: {
      position: "absolute" as const,
      inset: 0,
      borderRadius: 41,
      pointerEvents: "none" as const,
      border: "1.2px solid rgba(119,112,210,0.8)", // subtle violet edge
      boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.55)",
    },
    badge: {
      position: "absolute" as const,
      padding: "8px 14px",
      borderRadius: 10,
      fontSize: 16,
      letterSpacing: 0.4,
      color: "rgba(255,255,255,0.92)",
      border: "1px solid rgba(120,135,125,0.55)",
      background: "rgba(0,0,0,0.28)",
      backdropFilter: "blur(6px)",
      WebkitBackdropFilter: "blur(6px)",
      userSelect: "none" as const,
    },
    pill: {
      height: 54,
      borderRadius: 27,
      border: "1.2px solid rgba(130,150,140,0.55)",
      background: "rgba(0,0,0,0.18)",
      backdropFilter: "blur(8px)",
      WebkitBackdropFilter: "blur(8px)",
      color: "rgba(255,255,255,0.92)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      padding: "0 18px",
      fontSize: 15,
      letterSpacing: 1.2,
      textTransform: "uppercase" as const,
      cursor: "pointer",
      userSelect: "none" as const,
    },
    pillDisabled: {
      opacity: 0.6,
      cursor: "default",
    },
  };

  return (
    <div style={styles.page}>
      <div ref={containerRef} style={styles.container}>
        <div style={styles.stageWrap}>
          <div style={styles.stage}>
            {/* LANDSCAPE PREVIEW */}
            <div
              style={{
                ...styles.frameBase,
                left: LAND.x,
                top: LAND.y,
                width: LAND.w,
                height: LAND.h,
                borderRadius: LAND.r,
              }}
            >
              <video
                ref={landVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: `scale(${zoomLand})`,
                  transformOrigin: "center",
                  display: "block",
                }}
              />
              <div style={styles.frameBorder} />
              <div style={{ ...styles.badge, left: 28, bottom: 26, borderRadius: 10 }}>
                <span style={{ opacity: 0.9, marginRight: 10 }}>16:9</span>
                <span style={{ fontWeight: 600, opacity: 0.95 }}>LANDSCAPE</span>
              </div>
              <div style={{ ...styles.badge, right: 26, bottom: 26, borderRadius: 30 }}>
                {zoomLand.toFixed(1)}x
              </div>
            </div>

            {/* PORTRAIT PREVIEW */}
            <div
              style={{
                ...styles.frameBase,
                left: PORT.x,
                top: PORT.y,
                width: PORT.w,
                height: PORT.h,
                borderRadius: PORT.r,
              }}
            >
              <video
                ref={portVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: `scale(${zoomPort})`,
                  transformOrigin: "center",
                  display: "block",
                }}
              />
              <div style={styles.frameBorderPortrait} />
              <div style={{ ...styles.badge, right: 26, bottom: 26, borderRadius: 10 }}>
                <span style={{ opacity: 0.95, fontWeight: 600 }}>9:16</span>
                <span style={{ marginLeft: 10, opacity: 0.9 }}>PORTRAIT</span>
              </div>
              <div style={{ ...styles.badge, left: 26, top: 26, borderRadius: 30 }}>
                {zoomPort.toFixed(1)}x
              </div>
            </div>

            {/* CLOUD SYNC (no alerts — safe click, does nothing for now) */}
            <button
              type="button"
              onClick={() => {
                // No placeholder popups — keep silent for investor demo
              }}
              style={{
                position: "absolute",
                left: CLOUD.x,
                top: CLOUD.y,
                width: CLOUD.w,
                height: CLOUD.h,
                borderRadius: CLOUD.r,
                border: "1.2px solid rgba(150,165,160,0.6)",
                background: "rgba(0,0,0,0.18)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                color: "rgba(255,255,255,0.92)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                fontSize: 14,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              <span style={{ display: "inline-flex" }}>
                <IconCloud size={18} />
              </span>
              CLOUD SYNC
            </button>

            {/* LOGO (bigger, includes missing first part/icon) */}
            <div
              style={{
                position: "absolute",
                left: LOGO.x,
                top: LOGO.y,
                width: LOGO.w,
                height: LOGO.h,
                display: "flex",
                alignItems: "center",
              }}
            >
              <FlipCastDuoLogo width={520} />
            </div>

            {/* LEFT BOTTOM NAV BUTTONS (CAPTURE is current page, does NOT record) */}
            <div style={{ position: "absolute", left: LEFT_BTNS.x1, top: LEFT_BTNS.y, display: "flex", gap: LEFT_BTNS.gap }}>
              <button
                type="button"
                onClick={() => {
                  // current page — do nothing
                }}
                style={{
                  ...styles.pill,
                  width: LEFT_BTNS.w,
                  outline: "none",
                }}
              >
                CAPTURE
              </button>

              <button
                type="button"
                onClick={() => {
                  // keep silent (no alerts)
                  // If you later add routing, you can navigate here
                }}
                style={{
                  ...styles.pill,
                  width: LEFT_BTNS.w,
                }}
              >
                GALLERY
              </button>

              <button
                type="button"
                onClick={() => {
                  // keep silent (no alerts)
                }}
                style={{
                  ...styles.pill,
                  width: LEFT_BTNS.w,
                }}
              >
                ACCESSORY
              </button>
            </div>

            {/* MIC BUTTON — real toggle (restarts stream with/without audio) */}
            <button
              type="button"
              onClick={() => setAudioEnabled((v) => !v)}
              style={{
                position: "absolute",
                left: MIC.cx - MIC.r,
                top: MIC.cy - MIC.r,
                width: MIC.r * 2,
                height: MIC.r * 2,
                borderRadius: "50%",
                border: "1.2px solid rgba(150,165,160,0.6)",
                background: audioEnabled ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.18)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                color: "rgba(255,255,255,0.92)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
              aria-label="Toggle microphone"
              title={audioEnabled ? "Mic on" : "Mic off"}
            >
              <IconMic size={20} />
            </button>

            {/* VIDEO / PHOTO MODE SWITCH */}
            <div
              style={{
                position: "absolute",
                left: MODE.x,
                top: MODE.y,
                width: MODE.w,
                height: MODE.h,
                borderRadius: MODE.r,
                border: "1.2px solid rgba(150,165,160,0.6)",
                background: "rgba(0,0,0,0.18)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                display: "flex",
                alignItems: "center",
                padding: 8,
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() => setMode("video")}
                style={{
                  width: MODE_VIDEO.w,
                  height: MODE_VIDEO.h,
                  borderRadius: MODE_VIDEO.r,
                  border: "1px solid rgba(0,0,0,0.0)",
                  background: mode === "video" ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.0)",
                  color: mode === "video" ? "rgba(0,0,0,0.95)" : "rgba(255,255,255,0.75)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  fontSize: 15,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                <IconVideo size={18} />
                VIDEO
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isRecording) stopRecording();
                  setMode("photo");
                }}
                style={{
                  width: MODE_PHOTO.w,
                  height: MODE_PHOTO.h,
                  borderRadius: MODE_PHOTO.r,
                  border: "1px solid rgba(0,0,0,0.0)",
                  background: mode === "photo" ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.0)",
                  color: mode === "photo" ? "rgba(0,0,0,0.95)" : "rgba(255,255,255,0.75)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  fontSize: 15,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                <IconCamera size={18} />
                PHOTO
              </button>
            </div>

            {/* RECORD / SHUTTER BUTTON (the ONLY capture action) */}
            <button
              type="button"
              onClick={onMainAction}
              disabled={!isReady}
              style={{
                position: "absolute",
                left: REC.cx - REC.rOuter,
                top: REC.cy - REC.rOuter,
                width: REC.rOuter * 2,
                height: REC.rOuter * 2,
                borderRadius: "50%",
                border: "6px solid rgba(255,255,255,0.85)",
                background: "rgba(0,0,0,0.0)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: isReady ? "pointer" : "default",
                opacity: isReady ? 1 : 0.6,
              }}
              aria-label={mode === "video" ? (isRecording ? "Stop recording" : "Start recording") : "Take photo"}
              title={
                !isReady
                  ? "Camera not ready"
                  : mode === "video"
                  ? isRecording
                    ? "Stop recording"
                    : "Start recording"
                  : "Take photo"
              }
            >
              <div
                style={{
                  width: REC.rInner * 2,
                  height: REC.rInner * 2,
                  borderRadius: isRecording && mode === "video" ? 18 : "50%",
                  background: "rgba(234,29,50,0.95)",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
                  transition: "border-radius 120ms ease",
                }}
              />
            </button>

            {/* Small: if camera fails, show a subtle hint (no popups) */}
            {!isReady && (
              <div
                style={{
                  position: "absolute",
                  left: LAND.x + 24,
                  top: LAND.y + 24,
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.18)",
                  background: "rgba(0,0,0,0.35)",
                  color: "rgba(255,255,255,0.85)",
                  fontSize: 14,
                  maxWidth: 520,
                  lineHeight: 1.35,
                }}
              >
                Camera preview not ready. If you’re on macOS, check:{" "}
                <span style={{ opacity: 0.9 }}>System Settings → Privacy & Security → Camera</span>.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
