import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import prisma from "@/lib/prisma";
import { Users, LayoutDashboard, Download, PieChart, ShieldAlert, Monitor, Activity, Globe, Database, Cpu } from "lucide-react";
import { redirect } from "next/navigation";

export default async function AdminPanel() {
  const { getPermission, getUser } = getKindeServerSession();
  const permission = await getPermission("admin");
  const user = await getUser();

  if (!permission?.isGranted) {
    redirect("/dashboard");
  }

  const allUsers = await prisma.user.findMany({
    include: { stats: true },
    orderBy: { createdAt: "desc" }
  });

  const totalVideos = allUsers.reduce((acc, curr) => acc + (curr.stats?.totalVideosDownloaded || 0), 0);
  const totalAudio = allUsers.reduce((acc, curr) => acc + (curr.stats?.totalMP3Downloaded || 0), 0);

  return (
    <div className="space-y-12 fade-in pb-20">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-10">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-[0.4em]">
            <ShieldAlert className="h-4 w-4" /> Security Level: Root
          </div>
          <h1 className="text-5xl font-display font-bold text-white tracking-tighter">Admin Console</h1>
        </div>
        
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-3 glass px-5 py-3 rounded-2xl border border-white/5">
              <div className="relative">
                 <div className="h-3 w-3 bg-green-500 rounded-full animate-ping absolute inset-0" />
                 <div className="h-3 w-3 bg-green-500 rounded-full relative" />
              </div>
              <span className="text-xs font-bold text-white uppercase tracking-widest">Nodes Operational</span>
           </div>
        </div>
      </section>

      {/* Global Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="glass p-8 rounded-3xl border border-white/5 space-y-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
             <Users className="h-20 w-20 text-white" />
          </div>
          <p className="text-[10px] text-muted font-bold uppercase tracking-[0.3em]">Total Registry</p>
          <div className="flex items-baseline gap-2">
             <h3 className="text-4xl font-display font-bold text-white tracking-tighter">{allUsers.length}</h3>
             <span className="text-xs text-green-400 font-bold">+12%</span>
          </div>
          <div className="h-1 w-full bg-surface-card rounded-full overflow-hidden">
             <div className="h-full bg-primary w-2/3" />
          </div>
        </div>
        
        <div className="glass p-8 rounded-3xl border border-white/5 space-y-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
             <Activity className="h-20 w-20 text-white" />
          </div>
          <p className="text-[10px] text-muted font-bold uppercase tracking-[0.3em]">System Downloads</p>
          <div className="flex items-baseline gap-2">
             <h3 className="text-4xl font-display font-bold text-white tracking-tighter">{totalVideos + totalAudio}</h3>
             <span className="text-xs text-primary font-bold">Live</span>
          </div>
          <div className="h-1 w-full bg-surface-card rounded-full overflow-hidden">
             <div className="h-full bg-blue-500 w-1/2" />
          </div>
        </div>

        <div className="glass p-8 rounded-3xl border border-white/5 space-y-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
             <Globe className="h-20 w-20 text-white" />
          </div>
          <p className="text-[10px] text-muted font-bold uppercase tracking-[0.3em]">Traffic Source</p>
          <h3 className="text-4xl font-display font-bold text-white tracking-tighter">Global</h3>
          <div className="flex gap-1 h-3 items-end">
             {Array.from({length: 8}).map((_, i) => (
                <div key={i} className="flex-1 bg-white/10 rounded-t" style={{ height: `${Math.random() * 100}%` }} />
             ))}
          </div>
        </div>

        <div className="glass p-8 rounded-3xl border border-white/5 space-y-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
             <Database className="h-20 w-20 text-white" />
          </div>
          <p className="text-[10px] text-muted font-bold uppercase tracking-[0.3em]">Storage Capacity</p>
          <div className="flex items-baseline gap-2">
             <h3 className="text-4xl font-display font-bold text-white tracking-tighter">99.8%</h3>
             <span className="text-xs text-muted font-bold">Stable</span>
          </div>
          <div className="flex gap-2 text-[8px] text-muted font-bold uppercase">
             <span className="text-primary underline">Expand Tier</span>
             <span>Optimized</span>
          </div>
        </div>
      </div>

      {/* Registry Table */}
      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
                <Users className="h-6 w-6 text-primary" />
             </div>
             <div>
                <h2 className="text-2xl font-display font-bold text-white tracking-tight">System Users</h2>
                <p className="text-xs text-muted font-medium">Monitoring {allUsers.length} total identities.</p>
             </div>
          </div>
          
          <div className="flex gap-4">
             <button className="glass px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest text-muted hover:text-white transition-colors">Export CSV</button>
             <button className="bg-white text-black px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-xl">Purge Inactive</button>
          </div>
        </div>

        <div className="glass rounded-[32px] overflow-hidden border border-white/5 shadow-2xl">
          <table className="w-full text-left">
            <thead className="bg-surface-card/80 backdrop-blur-md text-muted text-[10px] font-bold uppercase tracking-[0.2em] border-b border-white/5">
              <tr>
                <th className="px-10 py-6">Identity Registry</th>
                <th className="px-10 py-6">Access Tier</th>
                <th className="px-10 py-6">System Load</th>
                <th className="px-10 py-6 text-right">Registration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {allUsers.map((u, i) => (
                <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-5">
                       <div className="h-10 w-10 bg-surface-bright rounded-full ring-2 ring-white/5 flex items-center justify-center overflow-hidden shrink-0">
                          {u.name?.[0] || 'U'}
                       </div>
                       <div className="flex flex-col">
                         <span className="text-sm text-white font-bold group-hover:text-primary transition-colors">{u.name || "Anonymous User"}</span>
                         <span className="text-[10px] text-muted font-bold uppercase tracking-tighter">{u.email}</span>
                       </div>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex items-center gap-2">
                       <div className={`h-1.5 w-1.5 rounded-full ${u.role === 'ADMIN' ? 'bg-primary shadow-[0_0_8px_rgba(255,0,0,1)]' : 'bg-muted'}`} />
                       <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${u.role === 'ADMIN' ? 'bg-primary/20 text-primary border border-primary/20' : 'bg-surface-bright text-muted border border-white/5'} uppercase tracking-widest`}>
                         {u.role}
                       </span>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="space-y-2 max-w-[120px]">
                       <div className="flex justify-between text-[8px] font-bold text-muted uppercase">
                          <span>Activity</span>
                          <span className="text-white">{u.stats?.totalYoutubeLinks || 0} Req</span>
                       </div>
                       <div className="h-1 w-full bg-surface-card rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${Math.min((u.stats?.totalYoutubeLinks || 0) * 5, 100)}%` }} />
                       </div>
                    </div>
                  </td>
                  <td className="px-10 py-8 text-xs text-muted text-right font-bold uppercase tracking-tighter">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
