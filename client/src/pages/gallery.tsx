import { useCaptures } from "@/hooks/use-captures";
import { format } from "date-fns";
import { Play, Image as ImageIcon, Loader2, Cloud, HardDrive } from "lucide-react";
import { motion } from "framer-motion";

export default function GalleryPage() {
  const { data: captures, isLoading } = useCaptures();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 pt-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <header className="mb-12">
        <h1 className="text-4xl font-display font-bold text-foreground">Gallery</h1>
        <p className="text-muted-foreground mt-2 text-lg">Your dual-format captures.</p>
      </header>

      {!captures || captures.length === 0 ? (
        <div className="text-center py-24 bg-card rounded-3xl border border-border border-dashed">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <ImageIcon className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-medium text-foreground mb-2">No captures yet</h3>
          <p className="text-muted-foreground">Head to the capture tab to record your first FlipCast.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {captures.map((capture, idx) => (
            <motion.div 
              key={capture.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="p-6 border-b border-border flex justify-between items-start sm:items-center flex-col sm:flex-row gap-4">
                <div>
                  <h3 className="text-xl font-semibold flex items-center gap-3">
                    {capture.type === "video" ? (
                      <span className="p-1.5 bg-primary/5 rounded-md text-primary"><Play className="w-4 h-4" /></span>
                    ) : (
                      <span className="p-1.5 bg-primary/5 rounded-md text-primary"><ImageIcon className="w-4 h-4" /></span>
                    )}
                    {capture.title}
                  </h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <time dateTime={capture.createdAt ? new Date(capture.createdAt).toISOString() : undefined}>
                      {capture.createdAt ? format(new Date(capture.createdAt), "PPp") : "Unknown date"}
                    </time>
                    <span className="flex items-center gap-1">
                      <Cloud className="w-3.5 h-3.5" /> Synced
                    </span>
                  </div>
                </div>
                <div className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-full text-xs font-medium uppercase tracking-wider">
                  {capture.type}
                </div>
              </div>
              
              <div className="p-6 bg-muted/30 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Landscape Preview */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm font-medium text-foreground px-1">
                    <span>Landscape</span>
                    <span className="text-muted-foreground">16:9</span>
                  </div>
                  <div className="relative aspect-video rounded-2xl overflow-hidden bg-muted group cursor-pointer hover:ring-2 ring-primary ring-offset-2 transition-all">
                    <img 
                      src={capture.landscapeUrl} 
                      alt="Landscape preview" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity transform scale-75 group-hover:scale-100">
                         {capture.type === 'video' ? <Play className="w-5 h-5 text-white ml-1" /> : <ImageIcon className="w-5 h-5 text-white" />}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Portrait Preview */}
                <div className="space-y-3 flex flex-col items-center md:items-start">
                  <div className="w-full max-w-[280px] flex items-center justify-between text-sm font-medium text-foreground px-1">
                    <span>Portrait</span>
                    <span className="text-muted-foreground">9:16</span>
                  </div>
                  <div className="relative w-full max-w-[280px] aspect-[9/16] rounded-2xl overflow-hidden bg-muted group cursor-pointer hover:ring-2 ring-primary ring-offset-2 transition-all">
                    <img 
                      src={capture.portraitUrl} 
                      alt="Portrait preview" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity transform scale-75 group-hover:scale-100">
                         {capture.type === 'video' ? <Play className="w-5 h-5 text-white ml-1" /> : <ImageIcon className="w-5 h-5 text-white" />}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
