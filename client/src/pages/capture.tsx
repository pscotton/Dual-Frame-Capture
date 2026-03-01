import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * FlipCastDuo — fixed-stage layout
 * - Locks the entire UI to a 1920×1080 “stage”
 * - Scales the stage proportionally to fit any browser size
 * - Enlarges the logo and removes any “white panel” look
 *
 * Notes:
 * - This file assumes you already have your camera + capture logic working elsewhere in this component.
 * - If you had extra helper components before, keep them in this file (below) or inline them here.
 */

const BASE_W = 1920;
const BASE_H = 1080;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Inline SVG logo cropped from your provided SVG (logo group area).
 * - No background rectangle
 * - Uses a tight viewBox around the logo
 * - Scales cleanly
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

      {/* Wordmark container */}
      <g>
        <g>
          <path d="M177.18,860.08h175.6c4.82,0,8.72,3.91,8.72,8.72v46.16c0,4.82-3.91,8.72-8.72,8.72h-175.6c-4.81,0-8.72-3.91-8.72-8.72v-46.16c0-4.82,3.91-8.72,8.72-8.72Z" />
          <path
            className="st2"
            d="M352.79,860.33c4.67,0,8.47,3.8,8.47,8.47v46.16c0,4.67-3.8,8.47-8.47,8.47h-175.6c-4.67,0-8.47-3.8-8.47-8.47v-46.16c0-4.67,3.8-8.47,8.47-8.47h175.6M352.79,859.83h-175.6c-4.96,0-8.97,4.02-8.97,8.97v46.16c0,4.96,4.02,8.97,8.97,8.97h175.6c4.96,0,8.97-4.02,8.97-8.97v-46.16c0-4.96-4.02-8.97-8.97-8.97h0Z"
          />
        </g>

        {/* FlipCastDuo text */}
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

        {/* Icon mark (left) */}
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
        </g>

        <path
          className="st4"
          d="M154.28,870.47l-5.77,5.77c3.73,4.35,5.79,9.87,5.79,15.63,0,12.6-9.71,23-22.19,23.96v8.17c17.01-.97,30.32-15.05,30.32-32.12,0-7.91-2.9-15.5-8.15-21.4Z"
        />
      </g>
    </svg>
  );
}

/**
 * MAIN PAGE COMPONENT
 * Keep your existing capture logic inside — this layout wrapper won’t break it.
 */
export default function CapturePage() {
  const [scale, setScale] = useState(1);

  // ---- Keep your existing camera state/refs below ----
  const landscapeVideoRef = useRef<HTMLVideoElement | null>(null);
  const portraitVideoRef = useRef<HTMLVideoElement | null>(null);

  // Example zoom UI state (keep/replace with yours)
  const [landscapeZoom, setLandscapeZoom] = useState(1.0);
  const [portraitZoom, setPortraitZoom] = useState(1.4);

  // ---- STAGE SCALE (locks layout) ----
  useEffect(() => {
    const calc = () => {
      const pad = 24; // outer padding
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

  // ---- ACTIONS (replace with your real ones if already implemented) ----
  const onCloudSync = () => {
    // hook up to your logic
    console.log("Cloud sync");
  };

  const onCapture = () => {
    console.log("Capture");
  };

  const onGallery = () => {
    console.log("Gallery");
  };

  const onAccessory = () => {
    console.log("Accessory");
  };

  const onRecord = () => {
    console.log("Record");
  };

  const onToggleMode = (mode: "video" | "photo") => {
    console.log("Mode:", mode);
  };

  return (
    <div className="min-h-[100dvh] bg-[#0b0f18] flex items-center justify-center p-6">
      {/* Stage frame that can resize, but content inside stays proportional */}
      <div
        className="relative"
        style={{
          width: BASE_W * scale,
          height: BASE_H * scale,
        }}
      >
        {/* Fixed 1920×1080 stage */}
        <div className="relative" style={stageStyle}>
          {/* Background */}
          <div className="absolute inset-0 bg-[#0b0f18]" />

          {/* CLOUD SYNC (top right) */}
          <button
            onClick={onCloudSync}
            className="absolute right-[92px] top-[28px] h-[42px] px-6 rounded-full border border-[#667268] bg-white/10 text-white text-[15px] tracking-wide flex items-center gap-3"
            style={{ backdropFilter: "blur(8px)" }}
          >
            <span className="inline-block w-5 h-5">
              {/* simple cloud icon */}
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
          >
            <video
              ref={landscapeVideoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />
            {/* 16:9 label */}
            <div className="absolute left-[28px] bottom-[26px] px-4 py-2 rounded-md border border-[#667268] bg-black/40 text-white text-[14px] tracking-wide">
              16:9&nbsp; LANDSCAPE
            </div>

            {/* landscape zoom pill */}
            <div className="absolute right-[28px] bottom-[26px] px-4 py-2 rounded-full border border-[#667268] bg-black/40 text-white text-[14px]">
              {landscapeZoom.toFixed(1)}x
            </div>
          </div>

          {/* PORTRAIT FRAME */}
          <div
            className="absolute left-[1428px] top-[94px] rounded-[41px] border border-[#667268] overflow-hidden bg-black"
            style={{ width: 405, height: 720 }}
          >
            <video
              ref={portraitVideoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />
            {/* portrait zoom pill (top-left) */}
            <div className="absolute left-[22px] top-[22px] px-4 py-2 rounded-full border border-[#667268] bg-black/40 text-white text-[14px]">
              {portraitZoom.toFixed(1)}x
            </div>

            {/* 9:16 label */}
            <div className="absolute right-[22px] bottom-[26px] px-4 py-2 rounded-md border border-[#667268] bg-black/40 text-white text-[14px] tracking-wide">
              9:16&nbsp; PORTRAIT
            </div>
          </div>

          {/* LOGO (bottom-left) — bigger, no panel */}
          <div className="absolute left-[92px] top-[860px]">
            <FlipCastLogo height={72} />
          </div>

          {/* LEFT BUTTONS (Capture / Gallery / Accessory) */}
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

          {/* MIC BUTTON (center-bottom left of toggle) */}
          <button
            className="absolute left-[810px] top-[855px] w-[82px] h-[82px] rounded-full border border-[#667268] bg-black/10 flex items-center justify-center"
            style={{ backdropFilter: "blur(10px)" }}
            onClick={() => console.log("Mic")}
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

          {/* VIDEO/PHOTO TOGGLE (center-bottom) */}
          <div
            className="absolute left-[922px] top-[855px] h-[82px] w-[455px] rounded-full border border-[#667268] bg-black/10 flex items-center justify-center gap-4 px-5"
            style={{ backdropFilter: "blur(10px)" }}
          >
            <button
              onClick={() => onToggleMode("video")}
              className="h-[58px] w-[210px] rounded-full bg-white text-black flex items-center justify-center gap-3 text-[15px] tracking-wide"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M15 10l5-3v10l-5-3v-4Z"
                  stroke="black"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path
                  d="M4 7h11v10H4V7Z"
                  stroke="black"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
              VIDEO
            </button>

            <button
              onClick={() => onToggleMode("photo")}
              className="h-[58px] w-[210px] rounded-full text-white/80 flex items-center justify-center gap-3 text-[15px] tracking-wide"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 8h16v11H4V8Z"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 8l1-2h4l1 2"
                  stroke="white"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <circle
                  cx="12"
                  cy="13"
                  r="2.5"
                  stroke="white"
                  strokeWidth="1.8"
                />
              </svg>
              PHOTO
            </button>
          </div>

          {/* RECORD BUTTON (right-bottom) */}
          <button
            onClick={onRecord}
            aria-label="Record"
            className="absolute left-[1546px] top-[845px] w-[167px] h-[167px] rounded-full border-[9px] border-white/90 bg-transparent flex items-center justify-center"
          >
            <div className="w-[143px] h-[143px] rounded-full bg-[#ea1d32]" />
          </button>
        </div>
      </div>
    </div>
  );
}
