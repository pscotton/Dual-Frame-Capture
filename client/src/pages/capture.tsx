{/* Bottom bar — matches screenshot layout */}
<div className="col-span-3 mt-4">
  <div className="w-full rounded-[2rem] bg-black/35 border border-white/10 backdrop-blur-xl shadow-[0_24px_70px_rgba(0,0,0,0.6)] px-6 py-5">
    <div className="grid items-center gap-6 [grid-template-columns:420px_1fr_170px] max-lg:[grid-template-columns:360px_1fr_160px] max-md:[grid-template-columns:1fr]">
      
      {/* LEFT: Logo + Nav */}
      <div className="flex flex-col gap-3">
        <div className="h-[86px] rounded-2xl border border-white/10 bg-white/5 flex items-center px-4">
          <img
            src="/flipcastduo-logo.svg"
            alt="FlipCastDuo"
            className="h-[54px] w-auto object-contain"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            className={`${navBtnBase} ${isOnCapture ? navBtnActive : navBtnInactive}`}
            onClick={() => go("/")}
          >
            Capture
          </button>
          <button
            className={`${navBtnBase} ${isOnGallery ? navBtnActive : navBtnInactive}`}
            onClick={() => go("/gallery")}
          >
            Gallery
          </button>
          <button
            className={`${navBtnBase} ${isOnAccessory ? navBtnActive : navBtnInactive}`}
            onClick={() => go("/accessory")}
          >
            Accessory
          </button>
        </div>
      </div>

      {/* CENTER: Mic + Video/Photo */}
      <div className="flex items-center justify-center gap-4 max-md:justify-start">
        {mode === "video" && (
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-3 rounded-full backdrop-blur-xl border transition-all ${
              isMuted
                ? "bg-red-500/18 border-red-500/25 text-red-500"
                : "bg-black/35 border-white/10 text-white hover:bg-black/55"
            }`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
        )}

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

      {/* RIGHT: Record */}
      <div className="flex items-center justify-end max-md:justify-start">
        <button
          onClick={handleCapture}
          disabled={processing || hasCameraError}
          className="relative w-24 h-24 rounded-full flex items-center justify-center outline-none group disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label={mode === "video" ? (isRecording ? "Stop recording" : "Start recording") : "Take photo"}
        >
          <div
            className={`absolute inset-0 rounded-full border-4 transition-colors duration-300 ${
              isRecording ? "border-red-500/50" : "border-white"
            }`}
          />
          <motion.div
            className={`w-[78px] h-[78px] rounded-full flex items-center justify-center transition-colors ${
              mode === "video" ? (isRecording ? "bg-red-500 scale-75 rounded-xl" : "bg-red-500") : "bg-white"
            }`}
            layout
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            {processing && (
              <Loader2 className={`w-9 h-9 animate-spin ${mode === "photo" ? "text-black" : "text-white"}`} />
            )}
          </motion.div>
        </button>
      </div>

    </div>
  </div>
</div>
