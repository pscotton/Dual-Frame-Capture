import { useState, useEffect } from "react";
import { Bluetooth, Smartphone, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AccessoryPage() {
  const [scanState, setScanState] = useState<"idle" | "scanning" | "found" | "connected">("idle");

  const startScan = () => {
    setScanState("scanning");
    setTimeout(() => {
      setScanState("found");
    }, 3000);
  };

  const connectDevice = () => {
    setScanState("connected");
  };

  const reset = () => {
    setScanState("idle");
  };

  return (
    <div className="min-h-screen pb-32 pt-12 px-4 sm:px-6 flex flex-col items-center justify-center max-w-lg mx-auto w-full">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-display font-bold text-foreground mb-3">FlipCast Lens</h1>
        <p className="text-muted-foreground text-lg">Pair your clip-on dual lens accessory for hardware-accelerated capture.</p>
      </div>

      <div className="bg-card w-full rounded-3xl border border-border shadow-sm p-8 flex flex-col items-center text-center relative overflow-hidden">
        
        {/* Animated background rings for scanning */}
        <AnimatePresence>
          {scanState === "scanning" && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              {[1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="absolute w-32 h-32 rounded-full border border-primary/20"
                  animate={{ 
                    scale: [1, 3],
                    opacity: [0.5, 0]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.6,
                    ease: "easeOut"
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="relative w-32 h-32 bg-secondary rounded-full flex items-center justify-center mb-8 z-10">
          {scanState === "connected" ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              type="spring"
            >
              <CheckCircle2 className="w-16 h-16 text-green-500" />
            </motion.div>
          ) : (
            <Bluetooth className={`w-12 h-12 ${scanState === "scanning" ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
          )}
        </div>

        <div className="h-24 flex flex-col justify-center w-full z-10">
          {scanState === "idle" && (
            <div className="space-y-4 w-full">
              <p className="text-foreground font-medium">Ready to pair</p>
              <button 
                onClick={startScan}
                className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover-elevate shadow-lg shadow-primary/20"
              >
                Scan for Devices
              </button>
            </div>
          )}

          {scanState === "scanning" && (
            <div className="space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground font-medium">Searching for FlipCast Lens...</p>
            </div>
          )}

          {scanState === "found" && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full bg-secondary/50 rounded-2xl p-4 flex items-center justify-between border border-border"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-background rounded-lg shadow-sm">
                  <Smartphone className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm">FlipCast Duo Pro</p>
                  <p className="text-xs text-muted-foreground">Signal: Strong</p>
                </div>
              </div>
              <button 
                onClick={connectDevice}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover-elevate"
              >
                Connect
              </button>
            </motion.div>
          )}

          {scanState === "connected" && (
            <div className="space-y-4 w-full">
              <p className="text-green-600 dark:text-green-500 font-medium">Successfully Connected!</p>
              <button 
                onClick={reset}
                className="w-full py-3 bg-secondary text-secondary-foreground flex justify-center items-center gap-2 rounded-xl font-medium hover:bg-secondary/80 transition-colors"
              >
                <RefreshCw className="w-4 h-4" /> Disconnect
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
