import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import prisma from "@/lib/prisma";
import { User as UserIcon, Mail, Shield, Zap, Calendar, HardDrive, Lock, ShieldCheck, ChevronRight, CreditCard, Rocket } from "lucide-react";

export default async function SettingsPage() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user || !user.id) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { stats: true }
  });

  if (!dbUser) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-12 fade-in pb-20">
      <section className="border-b border-white/5 pb-10">
        <h2 className="text-sm font-bold text-primary uppercase tracking-[0.4em] mb-2">System Profile</h2>
        <h1 className="text-5xl font-display font-bold text-white tracking-tighter">Identity & Tokens</h1>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-10">
          {/* Profile Section */}
          <div className="glass p-10 rounded-[32px] border border-white/5 space-y-8 relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 p-10 opacity-[0.02] group-hover:opacity-5 transition-opacity">
               <UserIcon className="h-40 w-40 text-white" />
            </div>
            <h3 className="text-2xl font-display font-bold text-white flex items-center gap-3">
               <UserIcon className="h-6 w-6 text-primary" /> Profile Identity
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted uppercase tracking-[0.2em]">Authorized Name</label>
                <div className="flex items-center gap-4 p-4 bg-surface-card rounded-2xl border border-white/5 ring-1 ring-white/5 transition-all focus-within:ring-primary/40">
                  <span className="text-white font-bold">{dbUser.name}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted uppercase tracking-[0.2em]">Primary Alias (Email)</label>
                <div className="flex items-center gap-4 p-4 bg-surface-card rounded-2xl border border-white/5 ring-1 ring-white/5 transition-all focus-within:ring-primary/40">
                  <span className="text-white font-bold">{dbUser.email}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted uppercase tracking-[0.2em]">Access Level</label>
                <div className="flex items-center gap-4 p-4 bg-surface-card rounded-2xl border border-white/5 ring-1 ring-white/5">
                  <span className="text-primary font-bold uppercase tracking-widest text-xs">{dbUser.role}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted uppercase tracking-[0.2em]">Registry Entry</label>
                <div className="flex items-center gap-4 p-4 bg-surface-card rounded-2xl border border-white/5 ring-1 ring-white/5">
                  <span className="text-white font-bold">{new Date(dbUser.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-white/5">
               <button className="bg-white text-black font-bold px-10 py-4 rounded-2xl hover:bg-primary hover:text-white transition-all shadow-xl active:scale-95 text-xs uppercase tracking-widest">
                 Modify Identity
               </button>
            </div>
          </div>

          {/* Security Protocols */}
          <div className="glass p-10 rounded-[32px] border border-white/5 space-y-8 relative overflow-hidden shadow-2xl">
            <h3 className="text-2xl font-display font-bold text-white flex items-center gap-3">
               <Lock className="h-6 w-6 text-primary" /> Security Protocols
            </h3>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between p-6 bg-surface-card rounded-2xl border border-white/5 group hover:bg-white/5 transition-all cursor-pointer">
                 <div className="flex items-center gap-6">
                    <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                       <ShieldCheck className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                       <h4 className="text-lg font-bold text-white">Multi-Factor Authentication (2FA)</h4>
                       <p className="text-xs text-muted font-medium">Secondary verification required for account access.</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-4">
                    <span className="text-[10px] font-bold px-3 py-1 bg-green-500/20 text-green-400 rounded-full border border-green-500/20 uppercase">Active</span>
                    <div className="h-6 w-12 bg-primary rounded-full relative p-1 shadow-[0_0_15px_rgba(255,0,0,0.4)]">
                       <div className="h-4 w-4 bg-white rounded-full ml-auto shadow-2xl" />
                    </div>
                 </div>
              </div>

              <div className="flex items-center justify-between p-6 bg-surface-card rounded-2xl border border-white/5 group hover:bg-white/5 transition-all cursor-pointer opacity-60">
                 <div className="flex items-center gap-6">
                    <div className="h-14 w-14 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5">
                       <CreditCard className="h-6 w-6 text-muted" />
                    </div>
                    <div>
                       <h4 className="text-lg font-bold text-white">Billing Identity</h4>
                       <p className="text-xs text-muted font-medium">Manage payment methods and resource subscriptions.</p>
                    </div>
                 </div>
                 <ChevronRight className="h-5 w-5 text-muted group-hover:text-white transition-all" />
              </div>
            </div>
          </div>
        </div>

        {/* Pro Upgrades UI Section */}
        <div className="lg:col-span-4 space-y-10">
           {/* Director Pro Badge matching screenshot */}
           <div className="glass p-8 rounded-[32px] border-2 border-primary/20 bg-gradient-to-br from-primary/10 via-transparent to-transparent space-y-8 relative overflow-hidden shadow-2xl">
              <div className="absolute top-4 right-4 animate-pulse">
                 <Rocket className="h-8 w-8 text-primary opacity-40" />
              </div>
              <div className="space-y-1">
                 <h2 className="text-3xl font-display font-bold text-white italic tracking-tighter">Director <span className="text-primary italic">Pro</span></h2>
                 <p className="text-[10px] text-muted font-bold uppercase tracking-[0.2em]">Advanced Extraction Suite</p>
              </div>

              <ul className="space-y-4">
                 {[
                   "Accelerated Extraction Speed",
                   "Lossless 24-bit Audio Flux",
                   "Unlimited Resource Storage",
                   "Custom CDN Endpoint Priority"
                 ].map((feat, i) => (
                   <li key={i} className="flex items-center gap-3 text-xs font-medium text-white/80">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      {feat}
                   </li>
                 ))}
              </ul>

              <button className="w-full bg-primary text-white font-bold py-5 rounded-2xl hover:bg-primary-dim transition-all shadow-[0_10px_30px_rgba(255,0,0,0.3)] active:scale-95 text-xs uppercase tracking-widest">
                 Upgrade to Studio
              </button>
           </div>

           {/* Resource Usage */}
           <div className="glass p-8 rounded-[32px] border border-white/5 space-y-8 shadow-2xl">
              <div className="flex items-center justify-between font-display">
                 <h4 className="text-lg font-bold text-white">Resource Usage</h4>
                 <HardDrive className="h-5 w-5 text-primary" />
              </div>
              
              <div className="space-y-6">
                 {/* Storage Bar */}
                 <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                       <span className="text-muted">Cloud Storage</span>
                       <span className="text-white">12.4 GB / 50 GB</span>
                    </div>
                    <div className="h-2 w-full bg-surface-card rounded-full overflow-hidden p-[2px] ring-1 ring-white/5">
                       <div className="h-full bg-primary rounded-full shadow-[0_0_15px_rgba(255,0,0,0.5)] w-1/4" />
                    </div>
                 </div>

                 {/* API Units */}
                 <div className="space-y-3">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                       <span className="text-muted">Extraction Units</span>
                       <span className="text-white">Unlimited</span>
                    </div>
                    <div className="h-2 w-full bg-surface-card rounded-full overflow-hidden p-[2px] ring-1 ring-white/5">
                       <div className="h-full bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)] w-full" />
                    </div>
                 </div>
              </div>
              
              <p className="text-[10px] text-muted text-center font-medium italic">Your quotas will reset in 14 days.</p>
           </div>
        </div>
      </div>
    </div>
  );
}
