import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cloud, CloudOff, Video, Camera, Loader2, Mic, MicOff } from "lucide-react";
import { useCreateCapture } from "@/hooks/use-captures";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { api } from "@shared/routes";

type Mode = "video" | "photo";

export default function CapturePage() {
  const [mode, setMode] = useState<Mode>("video");
  const [isRecording, setIsRecording] = useState(false);
  const [cloudSync, setCloudSync] = useState(true);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasCameraError, setHasCameraError] = useState(false);
  const [hasMicError, setHasMicError] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  const landscapeVideoRef = useRef<HTMLVideoElement>(null);
  const portraitVideoRef = useRef<HTMLVideoElement>(null);
  
  const { mutateAsync: createCapture } = useCreateCapture();
  const { toast } = useToast();

  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [chunks, setChunks] = useState<Blob[]>([]);

  // Initialize camera and microphone
  useEffect(() => {
    async function setupCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: true
        });
        setStream(mediaStream);
        setHasCameraError(false);
        setHasMicError(false);
      } catch (err: any) {
        console.error("Access denied or unavailable:", err);
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          // Check if it was audio specifically
          try {
            const videoOnly = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } }
            });
            setStream(videoOnly);
            setHasCameraError(false);
            setHasMicError(true);
          } catch (videoErr) {
            setHasCameraError(true);
          }
        } else {
          setHasCameraError(true);
        }
      }
    }
    setupCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = async () => {
    if (mode === "video") {
      if (isRecording) {
        setIsRecording(false);
        if (recorder) {
          recorder.stop();
        }
      } else {
        setIsRecording(true);
        const newChunks: Blob[] = [];
        setChunks(newChunks);
        const newRecorder = new MediaRecorder(stream!, { mimeType: 'video/webm;codecs=vp8,opus' });
        newRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            newChunks.push(e.data);
          }
        };
        newRecorder.onstop = async () => {
          const fullBlob = new Blob(newChunks, { type: 'video/webm' });
          await processCapture(fullBlob);
        };
        setRecorder(newRecorder);
        newRecorder.start();
      }
    } else {
      // Photo mode - instant capture
      await processCapture();
    }
  };

  const processCapture = async (videoBlob?: Blob) => {
    setProcessing(true);
    
    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
      const formattedTS = `${dateStr}_${timeStr}`;

      let landscapeBlob: Blob;
      let portraitBlob: Blob;

      if (mode === "video" && videoBlob) {
        landscapeBlob = videoBlob;
        portraitBlob = videoBlob; // In a browser-only prototype, we use the same master for both downloads
      } else {
        // Real photo capture logic
        const video = landscapeVideoRef.current!;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1920;
        canvas.height = video.videoHeight || 1080;
        canvas.getContext('2d')?.drawImage(video, 0, 0);
        landscapeBlob = await new Promise(r => canvas.toBlob(r!, 'image/png'));
        
        // Portrait crop
        const pCanvas = document.createElement('canvas');
        const pHeight = canvas.height;
        const pWidth = pHeight * (9/16);
        pCanvas.width = pWidth;
        pCanvas.height = pHeight;
        const xOffset = (canvas.width - pWidth) / 2;
        pCanvas.getContext('2d')?.drawImage(video, xOffset, 0, pWidth, pHeight, 0, 0, pWidth, pHeight);
        portraitBlob = await new Promise(r => pCanvas.toBlob(r!, 'image/png'));
      }

      // Download files
      const download = (blob: Blob, suffix: string, ext: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `FlipCastDuo_${suffix}_${formattedTS}.${ext}`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 100);
      };

      const ext = mode === "video" ? "webm" : "png";
      download(landscapeBlob, "Landscape", ext);
      download(portraitBlob, "Portrait", ext);

      toast({
        title: "Saved to Downloads",
        description: `Both ${mode} formats have been saved to your computer.`,
      });

      // Update Gallery / Cloud
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
          ...(old || [])
        ]);
      }
    } catch (error) {
      console.error("Capture failed:", error);
      toast({
        title: "Capture Failed",
        description: "An error occurred while saving your media.",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-zinc-950 flex flex-col relative overflow-hidden">
      
      {/* Top Bar */}
      <header className="absolute top-0 inset-x-0 p-6 z-20 flex justify-between items-center">
        <div className="text-white font-display font-bold text-xl tracking-tight flex items-center gap-2">
          FlipCast<span className="text-white/50">Duo</span>
        </div>
        
        <div className="flex gap-2">
          {hasMicError && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium bg-red-500/20 border border-red-500/30 text-red-400 backdrop-blur-md">
              <MicOff className="w-3 h-3" />
              Mic Denied
            </div>
          )}
          <button 
            onClick={() => setCloudSync(!cloudSync)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all backdrop-blur-md border ${
              cloudSync 
                ? "bg-white/20 border-white/30 text-white" 
                : "bg-black/40 border-white/10 text-white/50"
            }`}
          >
            {cloudSync ? <Cloud className="w-4 h-4" /> : <CloudOff className="w-4 h-4" />}
            <span className="hidden sm:inline">Cloud Sync</span>
          </button>
        </div>
      </header>

      {/* Main Viewfinder Area */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center p-4 sm:p-8 pt-24 pb-32 gap-6 lg:gap-8 max-w-7xl mx-auto w-full">
        
        {hasCameraError ? (
          <div className="flex-1 w-full h-full min-h-[400px] flex flex-col items-center justify-center bg-zinc-900 rounded-3xl border border-zinc-800 text-zinc-500 p-8 text-center">
            <Camera className="w-16 h-16 mb-4 opacity-50" />
            <h3 className="text-xl font-medium text-white mb-2">Camera Unavailable</h3>
            <p className="max-w-md">Please grant camera permissions or ensure a camera is connected to use the live preview.</p>
          </div>
        ) : (
          <>
            {/* Landscape Viewfinder */}
            <div className="relative w-full lg:w-3/5 aspect-video bg-black rounded-[2rem] overflow-hidden shadow-2xl ring-1 ring-white/10 group">
              <video 
                ref={landscapeVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-6 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-lg text-white text-xs font-medium border border-white/10 uppercase tracking-wider">
                16:9 Landscape
              </div>
              {isRecording && <div className="absolute top-6 right-6 w-3 h-3 bg-red-500 rounded-full recording-pulse" />}
            </div>

            {/* Portrait Viewfinder */}
            <div className="relative w-[50%] sm:w-[40%] lg:w-[25%] aspect-[9/16] bg-black rounded-[2rem] overflow-hidden shadow-2xl ring-1 ring-white/10 group mx-auto lg:mx-0">
              <video 
                ref={portraitVideoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-lg text-white text-xs font-medium border border-white/10 uppercase tracking-wider whitespace-nowrap">
                9:16 Portrait
              </div>
            </div>
          </>
        )}
      </main>

      {/* Camera Controls */}
      <div className="absolute bottom-24 inset-x-0 flex flex-col items-center gap-6 z-20">
        
        <div className="flex items-center gap-4">
          {/* Mute Toggle */}
          {mode === "video" && !hasMicError && (
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-3 rounded-full backdrop-blur-xl border transition-all ${
                isMuted 
                  ? "bg-red-500/20 border-red-500/30 text-red-500" 
                  : "bg-black/50 border-white/10 text-white hover:bg-black/70"
              }`}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          )}

          {/* Mode Selector */}
          <div className="flex bg-black/50 backdrop-blur-xl p-1 rounded-full border border-white/10 shadow-xl">
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

          {/* Placeholder for symmetry */}
          {mode === "video" && !hasMicError && <div className="w-11" />}
        </div>

        {/* Shutter Button */}
        <button
          onClick={handleCapture}
          disabled={processing || hasCameraError}
          className="relative w-20 h-20 rounded-full flex items-center justify-center outline-none group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {/* Outer ring */}
          <div className={`absolute inset-0 rounded-full border-4 transition-colors duration-300 ${
            isRecording ? "border-red-500/50" : "border-white"
          }`} />
          
          {/* Inner button */}
          <motion.div 
            className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
              mode === "video" 
                ? isRecording ? "bg-red-500 scale-75 rounded-xl" : "bg-red-500" 
                : "bg-white"
            }`}
            layout
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            {processing && <Loader2 className={`w-8 h-8 animate-spin ${mode === "photo" ? "text-black" : "text-white"}`} />}
          </motion.div>
        </button>
      </div>

      {/* Processing Overlay */}
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
