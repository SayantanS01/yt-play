"use client";

import { useState, useEffect, useRef } from "react";
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Volume2, VolumeX, ListMusic, Download, Trash2, Search, Music, Share2, Heart, MoreVertical, Loader2, AlertTriangle, ChevronUp, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Track {
  id: string;
  title: string;
  thumbnail: string;
  channel: string;
  duration: number;
}

export default function MusicPlayerClient() {
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreamLoading, setIsStreamLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [prevVolume, setPrevVolume] = useState(0.8);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTrack = currentTrackIndex >= 0 ? tracks[currentTrackIndex] : null;

  useEffect(() => {
    if (currentTrack) {
      fetchStreamUrl(currentTrack.id);
      setCurrentTime(0);
      setErrorStatus(null);
    }
  }, [currentTrackIndex]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      if (isPlaying && !isStreamLoading) {
        audioRef.current.play().catch(e => {
          console.error("Playback failed", e);
          if (e.name === "NotAllowedError") {
            setErrorStatus("Autoplay Blocked. Click Play manually.");
          } else {
            setErrorStatus("Flux Transport Failed");
          }
          setIsPlaying(false);
        });
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, isStreamLoading, volume]);

  const fetchStreamUrl = async (id: string) => {
    setIsStreamLoading(true);
    setErrorStatus(null);
    try {
      const res = await fetch(`/api/youtube/stream?id=${id}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "System Fault");
      }
      const data = await res.json();
      if (data.url && audioRef.current) {
        audioRef.current.src = data.url;
        audioRef.current.load();
      } else {
         throw new Error("No stream URL in manifest");
      }
    } catch (e: any) {
      console.error("Failed to fetch stream", e);
      setErrorStatus(e.message || "Manifest Error");
      setIsStreamLoading(false);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleCanPlay = () => {
    setIsStreamLoading(false);
    if (isPlaying && audioRef.current) {
      audioRef.current.play().catch(e => {
        console.error("Autoplay blocked", e);
        setErrorStatus("Interaction Required");
        setIsPlaying(false);
      });
    }
  };

  const handleEnded = () => {
    if (isRepeat) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else {
      nextTrack();
    }
  };

  const handleError = (e: any) => {
    console.error("Audio engine error", e);
    setErrorStatus("Playback Logic Failed");
    setIsStreamLoading(false);
  };

  const handleFetchPlaylist = async () => {
    if (!playlistUrl) return;
    setIsLoading(true);
    setErrorStatus(null);
    try {
      const res = await fetch("/api/youtube/playlist", {
        method: "POST",
        body: JSON.stringify({ url: playlistUrl }),
      });
      if (!res.ok) throw new Error("Manifest Registry Offline");
      const data = await res.json();
      if (data.videos) {
        setTracks(data.videos);
        setCurrentTrackIndex(0);
        setIsPlaying(true);
      }
    } catch (e: any) {
      console.error("Playlist fetch failed", e);
      setErrorStatus(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const nextTrack = () => {
    if (tracks.length === 0) return;
    if (isShuffle && tracks.length > 1) {
      let nextIndex = Math.floor(Math.random() * tracks.length);
      while (nextIndex === currentTrackIndex) {
        nextIndex = Math.floor(Math.random() * tracks.length);
      }
      setCurrentTrackIndex(nextIndex);
    } else {
      setCurrentTrackIndex((prev) => (prev + 1) % tracks.length);
    }
  };

  const prevTrack = () => {
    if (tracks.length === 0) return;
    setCurrentTrackIndex((prev) => (prev - 1 + tracks.length) % tracks.length);
  };

  const formatTime = (time: number | undefined) => {
    if (time === undefined || isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercent = currentTrack ? (currentTime / currentTrack.duration) * 100 : 0;

  const moveTrack = (index: number, direction: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    const newTracks = [...tracks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= tracks.length) return;

    // Swap tracks
    [newTracks[index], newTracks[targetIndex]] = [newTracks[targetIndex], newTracks[index]];
    
    // Update currentTrackIndex if it moved
    if (currentTrackIndex === index) {
      setCurrentTrackIndex(targetIndex);
    } else if (currentTrackIndex === targetIndex) {
      setCurrentTrackIndex(index);
    }
    
    setTracks(newTracks);
  };

  const toggleMute = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      setVolume(0);
    } else {
      setVolume(prevVolume || 0.8);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 h-[calc(100vh-160px)] fade-in">
      <audio 
        ref={audioRef} 
        onTimeUpdate={handleTimeUpdate} 
        onEnded={handleEnded}
        onCanPlay={handleCanPlay}
        onError={handleError}
        className="hidden" 
      />

      {/* Sidebar: Playlist Control */}
      <div className="lg:col-span-4 flex flex-col glass rounded-3xl overflow-hidden border border-white/5 shadow-2xl">
        <div className="p-8 border-b border-white/5 space-y-6">
          <div>
            <h2 className="text-sm font-bold text-primary uppercase tracking-[0.3em] mb-1">Extraction Queue</h2>
            <h1 className="text-3xl font-display font-bold text-white tracking-tighter">Your Playlist</h1>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input 
                type="text" 
                placeholder="Identity Playlist URL..." 
                className="w-full bg-surface-card border-none rounded-xl px-4 py-3 text-xs text-white outline-none ring-1 ring-white/5 focus:ring-primary/40 transition-all font-medium"
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
              />
            </div>
            <button 
              onClick={handleFetchPlaylist}
              disabled={isLoading}
              className="bg-primary text-white p-3 rounded-xl hover:bg-primary-dim transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {tracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 opacity-40">
               <ListMusic className="h-8 w-8 mb-4" />
               <p className="text-[10px] font-bold uppercase tracking-widest text-center">No tracks in registry</p>
            </div>
          ) : (
            tracks.map((track, index) => (
              <motion.div 
                key={track.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setCurrentTrackIndex(index)}
                className={`group flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all relative z-0 ${currentTrackIndex === index ? 'bg-primary shadow-[0_0_20px_rgba(255,0,0,0.2)] text-white' : 'hover:bg-white/5 text-muted hover:text-white'}`}
              >
                <div className="relative h-12 w-12 bg-surface-card rounded-lg overflow-hidden shrink-0 shadow-lg border border-white/10 z-10 pointer-events-none">
                  <img src={track.thumbnail} className={`object-cover w-full h-full ${currentTrackIndex === index ? 'opacity-40' : 'opacity-60'}`} alt="" />
                  {currentTrackIndex === index && isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex gap-1 h-3 items-end">
                        <div className="w-1 bg-white animate-[pulse_0.8s_infinite]" />
                        <div className="w-1 bg-white animate-[pulse_1.2s_infinite]" />
                        <div className="w-1 bg-white animate-[pulse_1s_infinite]" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold truncate">{track.title}</h4>
                  <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${currentTrackIndex === index ? 'text-white/70' : 'text-muted'}`}>{track.channel}</p>
                </div>
                <div className="flex flex-col gap-1 items-center opacity-30 group-hover:opacity-100 transition-opacity z-20">
                   <button 
                     disabled={index === 0}
                     onClick={(e) => moveTrack(index, 'up', e)}
                     className="p-1 hover:text-white disabled:opacity-10 transition-colors"
                   >
                     <ChevronUp className="h-4 w-4" />
                   </button>
                   <button 
                     disabled={index === tracks.length - 1}
                     onClick={(e) => moveTrack(index, 'down', e)}
                     className="p-1 hover:text-white disabled:opacity-10 transition-colors"
                   >
                     <ChevronDown className="h-4 w-4" />
                   </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Main Player: Cinematic Visualizer */}
      <div className="lg:col-span-8 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {currentTrack ? (
            <motion.div 
              key={currentTrack.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              className="w-full max-w-3xl space-y-12"
            >
              {/* Header Info */}
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-primary/10 rounded-full border border-primary/20">
                       <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                       <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{isStreamLoading ? 'Initializing Flux...' : 'Mastering Stream'}</span>
                    </div>
                    {errorStatus && (
                       <div className="flex items-center gap-2 text-[10px] font-bold text-red-400 uppercase tracking-widest bg-red-500/10 px-4 py-1.5 rounded-full border border-red-500/20">
                          <AlertTriangle className="h-3 w-3" /> {errorStatus}
                       </div>
                    )}
                 </div>
                 <div className="flex gap-4">
                    <button className="p-2 text-muted hover:text-white transition-colors"><Heart className="h-5 w-5" /></button>
                    <button className="p-2 text-muted hover:text-white transition-colors"><Share2 className="h-5 w-5" /></button>
                  </div>
              </div>

              {/* Cover Art & Visualizer Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                 <div className="relative group">
                    <div className="absolute -inset-4 bg-primary/20 blur-[60px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative aspect-square glass rounded-[40px] overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.4)] border border-white/5 ring-1 ring-primary/20 p-2">
                       <img src={currentTrack.thumbnail} className="w-full h-full object-cover rounded-[32px] shadow-2xl" alt="" />
                       {isStreamLoading && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-20">
                             <Loader2 className="h-12 w-12 text-primary animate-spin" />
                          </div>
                       )}
                    </div>
                 </div>

                 <div className="space-y-10 text-center md:text-left">
                    <div className="space-y-4">
                       <h2 className="text-4xl md:text-5xl font-display font-bold text-white tracking-tighter leading-tight line-clamp-2">{currentTrack.title}</h2>
                       <p className="text-xl text-primary font-bold italic tracking-tight">{currentTrack.channel}</p>
                    </div>

                    <div className="flex items-end gap-1.5 h-20 justify-center md:justify-start">
                       {Array.from({ length: 24 }).map((_, i) => (
                         <motion.div 
                           key={i}
                           animate={{ 
                             height: isPlaying ? [10, 80, 20, 60, 10] : 10 
                           }}
                           transition={{ 
                             duration: 1 + Math.random(), 
                             repeat: Infinity,
                             delay: i * 0.05
                           }}
                           className="w-1.5 bg-gradient-to-t from-primary to-primary-dim rounded-full opacity-40"
                         />
                       ))}
                    </div>
                 </div>
              </div>

              {/* Controls Suite */}
              <div className="space-y-8 glass p-10 rounded-[40px] border border-white/5 relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                 
                 <div className="space-y-3">
                   <div 
                     className="h-1.5 w-full bg-surface-bright rounded-full p-[2px] ring-1 ring-white/5 shadow-inner cursor-pointer"
                     onClick={(e) => {
                        if (audioRef.current) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const percent = x / rect.width;
                          audioRef.current.currentTime = percent * currentTrack.duration;
                        }
                     }}
                   >
                      <motion.div 
                        className="h-full bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.4)] relative"
                        style={{ width: `${progressPercent}%` }}
                      >
                         <div className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 bg-white rounded-full shadow-2xl flex items-center justify-center ring-4 ring-primary/10 transition-transform active:scale-110">
                            <div className="h-2 w-2 bg-primary rounded-full" />
                         </div>
                      </motion.div>
                   </div>
                   <div className="flex justify-between text-[10px] font-bold text-muted uppercase tracking-[0.2em]">
                      <span className="text-white">{formatTime(currentTime)}</span>
                      <span>{formatTime(currentTrack.duration)}</span>
                   </div>
                 </div>

                 <div className="flex items-center justify-center gap-12">
                   <button 
                     onClick={() => setIsShuffle(!isShuffle)}
                     className={`transition-all hover:scale-110 ${isShuffle ? 'text-primary drop-shadow-[0_0_10px_rgba(255,0,0,0.5)]' : 'text-muted hover:text-white'}`}
                   >
                     <Shuffle className="h-6 w-6" />
                   </button>
                   <button onClick={prevTrack} className="text-white hover:text-primary transition-all hover:-translate-x-1">
                     <SkipBack className="h-10 w-10 fill-current" />
                   </button>
                   <button 
                     onClick={() => setIsPlaying(!isPlaying)}
                     disabled={isStreamLoading}
                     className="h-24 w-24 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_10px_40px_rgba(255,255,255,0.2)] group disabled:opacity-50"
                   >
                     {isStreamLoading ? <Loader2 className="h-10 w-10 animate-spin" /> : (
                        isPlaying ? <Pause className="h-10 w-10 fill-current" /> : <Play className="h-10 w-10 fill-current ml-2" />
                     )}
                   </button>
                   <button onClick={nextTrack} className="text-white hover:text-primary transition-all hover:translate-x-1">
                     <SkipForward className="h-10 w-10 fill-current" />
                   </button>
                   <button 
                     onClick={() => setIsRepeat(!isRepeat)}
                     className={`transition-all hover:scale-110 ${isRepeat ? 'text-primary drop-shadow-[0_0_10px_rgba(255,0,0,0.5)]' : 'text-muted hover:text-white'}`}
                   >
                     <Repeat className="h-6 w-6" />
                   </button>
                 </div>

                 <div className="flex items-center justify-center gap-12 border-t border-white/5 pt-8">
                    <div className="flex items-center gap-4 group">
                       <button onClick={toggleMute} className="text-muted group-hover:text-white transition-colors">
                          {volume === 0 ? <VolumeX className="h-5 w-5 text-red-500" /> : <Volume2 className="h-5 w-5" />}
                       </button>
                       <input 
                         type="range" 
                         min="0" max="1" step="0.01" 
                         value={volume}
                         onChange={(e) => setVolume(parseFloat(e.target.value))}
                         className="w-32 h-1 bg-surface-bright rounded-full appearance-none cursor-pointer accent-white"
                       />
                    </div>
                    <button className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.3em] text-primary hover:text-white transition-all ring-1 ring-primary/20 px-6 py-2.5 rounded-full hover:bg-primary/10 active:scale-95">
                       <Download className="h-4 w-4" /> Save as Studio Master
                    </button>
                 </div>
              </div>
            </motion.div>
          ) : (
             <div className="text-center space-y-10 opacity-20 group">
                <div className="h-40 w-40 mx-auto rounded-full bg-surface-card flex items-center justify-center border border-white/5 relative">
                   <Music className="h-16 w-16 text-muted group-hover:animate-bounce" />
                </div>
                <div className="space-y-4">
                   <h3 className="text-3xl font-display font-bold text-white uppercase tracking-[0.5em]">Silence in Flux</h3>
                   <p className="text-xs font-bold text-muted uppercase tracking-widest">Awaiting Manifest Transmission</p>
                </div>
             </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
