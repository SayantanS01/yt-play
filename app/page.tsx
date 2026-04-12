import { RegisterLink, LoginLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";
import { ArrowRight, Play, Shield, Globe, Zap, CheckCircle2, Layers } from "lucide-react";

export default async function Home() {
  const { isAuthenticated } = getKindeServerSession();
  const isAuth = await isAuthenticated();

  if (isAuth) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col font-sans">
      {/* Background Cinematic Accents */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[150px] rounded-full" />
        <div className="absolute top-0 right-0 w-full h-full opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #ffffff10 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 h-24 px-10 flex items-center justify-between max-w-7xl mx-auto w-full border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(255,0,0,0.5)]">
            <Play className="h-5 w-5 text-white fill-current" />
          </div>
          <span className="text-2xl font-display font-bold text-white tracking-tighter">Media Hub</span>
        </div>
        <div className="flex items-center gap-8">
          <button className="text-sm font-bold text-muted hover:text-white transition-colors uppercase tracking-[0.2em] hidden md:block">Documentation</button>
          <LoginLink className="bg-white text-black px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-2xl">Enter System</LoginLink>
        </div>
      </nav>

      <main className="flex-1 relative z-10 pt-20 pb-32">
        <div className="max-w-7xl mx-auto px-10 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          
          {/* Hero Content matching screenshot */}
          <div className="space-y-12">
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-[0.4em] animate-pulse">
                <span className="h-2 w-2 rounded-full bg-primary" /> The Obsidian Lens
              </div>
              <h1 className="text-7xl md:text-8xl font-display font-bold text-white leading-[0.9] tracking-tighter">
                Download and <br />
                <span className="text-primary italic">Play YouTube</span> <br />
                your way.
              </h1>
              <p className="text-xl text-muted leading-relaxed max-w-lg font-medium">
                A cinematic suite for creators and connoisseurs. Extraction, high-fidelity playback, and an editorial dashboard designed for your narrative.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6">
              <LoginLink className="w-full sm:w-auto bg-primary text-white px-12 py-5 rounded-2xl flex items-center justify-center gap-3 hover:bg-primary-dim transition-all shadow-[0_15px_40px_rgba(255,0,0,0.4)] group active:scale-95">
                 <span className="text-sm font-bold uppercase tracking-widest">Start Building</span>
                 <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </LoginLink>
              <button className="w-full sm:w-auto px-12 py-5 border border-white/10 rounded-2xl text-white text-sm font-bold uppercase tracking-widest hover:bg-white/5 transition-all">
                 Explore Features
              </button>
            </div>

            <div className="flex items-center gap-6 pt-10 border-t border-white/5">
               <div className="flex -space-x-4">
                  {[1,2,3].map(i => (
                    <div key={i} className="h-10 w-10 rounded-full border-2 border-background ring-1 ring-white/10 bg-surface-card overflow-hidden">
                       <img src={`https://i.pravatar.cc/100?u=${i}`} alt="" />
                    </div>
                  ))}
               </div>
               <p className="text-xs text-muted font-medium">Joined by <span className="text-white font-bold">1,284+</span> active connoisseurs this week.</p>
            </div>
          </div>

          {/* Secure Access Card matching screenshot */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-500 rounded-[40px] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative card-glass p-12 rounded-[40px] border border-white/10 space-y-10 shadow-2xl">
              <div className="space-y-2">
                 <h2 className="text-3xl font-display font-bold text-white tracking-tight">Secure Access</h2>
                 <p className="text-sm text-muted">Initialize your session to manage resources.</p>
              </div>

              <div className="space-y-6">
                 <LoginLink className="w-full flex items-center justify-center gap-4 bg-white/5 border border-white/10 hover:bg-white/10 transition-all p-5 rounded-2xl group shadow-inner">
                    <Globe className="h-5 w-5 text-muted group-hover:text-blue-400 transition-colors" />
                    <span className="text-sm font-bold text-white">Sign In with Google</span>
                 </LoginLink>

                 <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                       <div className="w-full border-t border-white/5"></div>
                    </div>
                    <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
                       <span className="px-4 bg-[#141414] text-muted">Secure Protocol</span>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="space-y-1">
                       <label className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] ml-1">Alias</label>
                       <input disabled type="text" placeholder="user@narrative.io" className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none opacity-40 cursor-not-allowed" />
                    </div>
                    <div className="space-y-1 relative">
                       <label className="text-[10px] font-bold text-muted uppercase tracking-[0.2em] ml-1">Keyphrase</label>
                       <input disabled type="password" placeholder="••••••••" className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none opacity-40 cursor-not-allowed" />
                       <span className="absolute right-4 bottom-4 text-[10px] font-bold text-primary uppercase tracking-widest cursor-pointer hover:underline opacity-40">Lost Keyword?</span>
                    </div>
                 </div>

                 <RegisterLink className="w-full bg-primary text-white font-bold py-5 rounded-2xl hover:bg-primary-dim transition-all shadow-[0_10px_30px_rgba(255,0,0,0.3)] flex items-center justify-center uppercase text-xs tracking-[0.2em]">
                    Create Account
                 </RegisterLink>
              </div>

              <p className="text-center text-[10px] text-muted leading-relaxed">
                 By initializing, you agree to our <span className="text-white underline cursor-pointer">Service Protocols</span> and <span className="text-white underline cursor-pointer">Privacy Narrative</span>.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Trust Badges matching screenshot grid */}
      <section className="relative z-10 px-10 pb-40">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Zap, title: "Total Offline Access", desc: "Multi-threaded extraction at original quality for uninterrupted creative states." },
            { icon: Layers, title: "High-Fidelity Player", desc: "Studio-grade audio engine with mastering flux and seamless playlist mastering." },
            { icon: Shield, title: "Creative Metrics", desc: "Deep-dive into uploader metrics and audience engagement within your video suite." }
          ].map((feature, i) => (
            <div key={i} className="glass p-8 rounded-3xl border border-white/5 space-y-4 shadow-xl hover:bg-white/5 transition-all group">
              <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform">
                 <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-xl font-display font-bold text-white tracking-tight">{feature.title}</h3>
              <p className="text-sm text-muted font-medium leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer Section */}
      <footer className="relative z-10 px-10 py-20 border-t border-white/5">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between gap-20">
            <div className="space-y-6 max-w-xs">
               <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                     <Play className="h-4 w-4 text-white fill-current" />
                  </div>
                  <span className="text-xl font-display font-bold text-white tracking-tighter">The Obsidian Lens</span>
               </div>
               <p className="text-sm text-muted font-medium">Interweaving cinematic curation with world-class utility. Flux with us.</p>
               <div className="flex gap-4">
                  {[Globe, Shield, Play].map((I, i) => (
                    <div key={i} className="p-2 border border-white/5 rounded-lg text-muted hover:text-white transition-all cursor-pointer"><I className="h-4 w-4" /></div>
                  ))}
               </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-12 lg:gap-24 uppercase font-bold tracking-[0.2em] text-[10px]">
               <div className="space-y-6">
                  <p className="text-white">Product</p>
                  <div className="space-y-4 text-muted">
                     <p className="hover:text-primary transition-colors cursor-pointer">Extraction</p>
                     <p className="hover:text-primary transition-colors cursor-pointer">Studio Pro</p>
                     <p className="hover:text-primary transition-colors cursor-pointer">API Access</p>
                  </div>
               </div>
               <div className="space-y-6">
                  <p className="text-white">Resources</p>
                  <div className="space-y-4 text-muted">
                     <p className="hover:text-primary transition-colors cursor-pointer">Documentation</p>
                     <p className="hover:text-primary transition-colors cursor-pointer">Commands</p>
                     <p className="hover:text-primary transition-colors cursor-pointer">Support</p>
                  </div>
               </div>
               <div className="space-y-6">
                  <p className="text-white">Legal</p>
                  <div className="space-y-4 text-muted">
                     <p className="hover:text-primary transition-colors cursor-pointer">Privacy Policy</p>
                     <p className="hover:text-primary transition-colors cursor-pointer">Terms of Service</p>
                     <p className="hover:text-primary transition-colors cursor-pointer">Service</p>
                  </div>
               </div>
            </div>
         </div>
         <div className="max-w-7xl mx-auto pt-20 flex justify-between text-[10px] font-bold text-muted uppercase tracking-[0.2em]">
            <p>© 2026 Obsidian Hub. All rights in flux.</p>
            <p>Designed for Modern Connoisseurs</p>
         </div>
      </footer>
    </div>
  );
}
