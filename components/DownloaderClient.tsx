"use client";

import { useState } from "react";
import { Search, Download, Music, Video, Loader2, CheckCircle2, AlertCircle, PlayCircle, Clock, Trash2, ShieldCheck, HardDriveDownload, Trash, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function DownloaderClient() {
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<"mp3" | "mp4">("mp4");
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<"idle" | "fetching" | "downloading" | "uploading" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [resultData, setResultData] = useState<{ url: string; title: string; storagePath: string } | null>(null);

  const triggerForcedDownload = (downloadUrl: string, title: string, storagePath: string) => {
    // If it's already a full URL (local proxy link), use it directly
    if (downloadUrl.startsWith("/api/")) {
      window.location.href = downloadUrl;
      return;
    }
    
    // Fallback for legacy cloud transport
    const filename = `${title.replace(/[/\\?%*:|"<>]/g, '_')}.${format}`;
    const proxyUrl = `/api/youtube/proxy?url=${encodeURIComponent(downloadUrl)}&filename=${encodeURIComponent(filename)}&storagePath=${encodeURIComponent(storagePath)}`;
    window.location.href = proxyUrl;
  };

  const handleDownload = async () => {
    if (!url) return;
    
    setIsDownloading(true);
    setStatus("fetching");
    setProgress(0);
    setError("");
    setResultData(null);

    try {
      const response = await fetch("/api/youtube/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, format }),
      });

      if (!response.ok) throw new Error("Manifest Protocol Failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No data stream available");

      let extractedTitle = "youtube_extraction";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        const lines = text.split("\n").filter(l => l.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.status === "ping") continue; // Keep-alive heartbeat
            if (data.status === "downloading") setStatus("downloading");
            if (data.status === "uploading") setStatus("uploading");
            if (data.status === "local_ready") setStatus("success");
            if (data.metadata?.title) extractedTitle = data.metadata.title;
            if (data.progress) setProgress(parseFloat(data.progress));
            
            if (data.status === "completed") {
              setResultData({ url: data.url, title: extractedTitle, storagePath: data.storagePath || "" });
              setStatus("success");
              // Automated trigger
              triggerForcedDownload(data.url, extractedTitle, data.storagePath || "");
            }
            if (data.error) throw new Error(data.error);
          } catch (e) {
             continue;
          }
        }
      }
    } catch (err: any) {
      setStatus("error");
      setError(err.message || "An unexpected error occurred");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-16 py-10 fade-in">
      {/* Hero Section */}
      <section className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3 mb-6">
           <div className="h-[1px] w-12 bg-white/10" />
           <span className="text-[10px] font-bold text-primary uppercase tracking-[0.4em]">Media Extraction</span>
           <div className="h-[1px] w-12 bg-white/10" />
        </div>
        <h1 className="text-5xl md:text-6xl font-display font-bold text-white tracking-tighter">
          Capture the <span className="text-primary italic">Narrative.</span>
        </h1>
        <p className="text-muted max-w-lg mx-auto text-sm leading-relaxed">
          High-fidelity media extraction with <span className="text-white font-bold">Ephemeral Storage</span>. Data is purged from our cloud immediately after you save it.
        </p>
      </section>

      {/* Input Module */}
      <div className="glass p-3 rounded-2xl flex flex-col md:flex-row items-center gap-4 pr-4 transition-all focus-within:ring-1 ring-primary/50 shadow-2xl">
        <div className="flex-1 relative w-full">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
          <input 
            type="text" 
            placeholder="Identity Resource (YouTube URL)..." 
            className="w-full bg-surface-card border-none py-5 pl-16 pr-6 text-white text-sm font-medium placeholder:text-muted/30 outline-none rounded-xl"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex bg-surface-card rounded-xl p-1 shrink-0 ring-1 ring-white/5">
            <button 
              onClick={() => setFormat("mp4")}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${format === "mp4" ? "bg-primary text-white shadow-lg" : "text-muted hover:text-white"}`}
            >
              Video (MP4)
            </button>
            <button 
              onClick={() => setFormat("mp3")}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${format === "mp3" ? "bg-primary text-white shadow-lg" : "text-muted hover:text-white"}`}
            >
              Audio (MP3)
            </button>
          </div>
          <button 
            onClick={handleDownload}
            disabled={isDownloading || !url}
            className="bg-white text-black font-bold h-[54px] px-8 rounded-xl hover:bg-primary hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shrink-0 shadow-2xl flex items-center justify-center gap-2 group"
          >
            {isDownloading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
               <>
                 <Download className="h-4 w-4 group-hover:translate-y-0.5 transition-transform" /> 
                 <span className="text-xs uppercase tracking-widest">Execute</span>
               </>
            )}
          </button>
        </div>
      </div>

      {/* Status & Progress */}
      <AnimatePresence>
        {status !== "idle" && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass rounded-3xl p-10 border border-white/5 relative overflow-hidden"
          >
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
            
            <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
              <div className="w-full md:w-64 aspect-video bg-surface-card rounded-2xl flex items-center justify-center ring-1 ring-white/10 overflow-hidden relative group shadow-2xl">
                <PlayCircle className="h-12 w-12 text-white/10 group-hover:text-primary transition-colors" />
                {(status === "downloading" || status === "uploading") && (
                  <div className="absolute inset-x-0 bottom-0 h-1.5 bg-white/10">
                    <motion.div 
                      className="h-full bg-primary shadow-[0_0_15px_rgba(255,0,0,0.8)]" 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-6 w-full text-center md:text-left">
                <div className="flex items-center justify-center md:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                       <ShieldCheck className="h-3 w-3 text-primary" />
                       <span className="text-[8px] font-bold text-muted uppercase tracking-[0.3em]">Ephemeral Vault Protocol Active</span>
                    </div>
                    <h3 className="text-2xl font-display font-bold text-white tracking-tight">
                      {status === "fetching" ? "Analyzing Manifest..." : 
                       status === "downloading" ? "Extracting Resources..." : 
                       status === "uploading" ? "Transporting to Vault..." :
                       status === "success" ? "Resource Mastery Complete." : 
                       status === "error" ? "System Fault" : "Initializing..."}
                    </h3>
                  </div>
                  <div className="hidden md:block">
                     {status === "success" && <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/50"><CheckCircle2 className="h-5 w-5 text-green-400" /></div>}
                     {status === "error" && <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/50"><AlertCircle className="h-5 w-5 text-red-400" /></div>}
                  </div>
                </div>

                {(status === "downloading" || status === "uploading") && (
                  <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                      <span className="text-muted">{status === "downloading" ? "Extraction Phase" : "Vault Handshake"}</span>
                      <span className="text-white">{progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-surface-card rounded-full overflow-hidden p-[2px] ring-1 ring-white/5">
                      <motion.div 
                        className="h-full bg-primary rounded-full shadow-[0_0_20px_rgba(255,0,0,0.6)]"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {status === "error" && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-medium font-mono leading-relaxed">
                    [ERROR_CODE_0X1]: {error}
                  </div>
                )}

                {status === "success" && resultData && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                       <div className="flex-1">
                          <p className="text-xs text-muted mb-2 font-bold uppercase tracking-widest">Master Identity</p>
                          <h4 className="text-sm font-bold text-white line-clamp-1">{resultData.title}</h4>
                       </div>
                       <button 
                         onClick={() => triggerForcedDownload(resultData.url, resultData.title, resultData.storagePath)}
                         className="group flex items-center gap-3 bg-white text-black px-8 py-4 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-2xl active:scale-95"
                       >
                          <HardDriveDownload className="h-5 w-5 group-hover:translate-y-0.5 transition-transform" /> 
                          Save to local PC
                       </button>
                    </div>
                    <div className="flex items-center gap-4 px-6 py-3 bg-primary/10 rounded-xl border border-primary/20">
                       <Trash className="h-4 w-4 text-primary shrink-0" />
                       <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Auto-Delete Logic Activated:</span>
                          <span className="text-[10px] text-white/70 uppercase tracking-tighter">Vault copy will be purged instantly upon completion of local save.</span>
                       </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="space-y-8">
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
               <Clock className="h-5 w-5 text-primary" />
               <h2 className="text-xl font-display font-bold text-white uppercase tracking-wider">Recent History</h2>
            </div>
            <button className="text-[10px] font-bold text-muted uppercase tracking-widest hover:text-white">Clear Processed</button>
         </div>

         <div className="grid grid-cols-1 gap-4">
            {[
              { title: "Mastering the Color Grade: Part II", channel: "Lumen Studio", type: "MP4", size: "45.2 MB" },
              { title: "Lofi Beats for Creative Sessions 4.0", channel: "Beat Lab", type: "MP3", size: "128 KBPS" },
              { title: "Untitled Sequence: 01 Landing Workflow", channel: "Internal", type: "MP4", size: "12.8 MB" }
            ].map((item, i) => (
              <div key={i} className="glass p-5 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-white/5 transition-all">
                 <div className="flex items-center gap-6">
                    <div className="h-16 w-28 bg-surface-card rounded-xl ring-1 ring-white/5 overflow-hidden relative">
                       <img src={`https://picsum.photos/seed/${i+10}/200/120`} className="w-full h-full object-cover opacity-20" alt="" />
                    </div>
                    <div>
                       <h4 className="text-sm font-bold text-white group-hover:text-primary transition-colors">{item.title}</h4>
                       <p className="text-[10px] text-muted font-bold uppercase tracking-widest mt-1">{item.channel} • {item.size}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-4">
                    <span className="px-3 py-1 bg-surface-bright text-white text-[10px] font-bold rounded-lg uppercase tracking-tighter">{item.type}</span>
                    <button className="p-2 text-muted hover:text-red-400 transition-colors"><Trash2 className="h-4 w-4" /></button>
                 </div>
              </div>
            ))}
         </div>
      </section>
    </div>
  );
}
