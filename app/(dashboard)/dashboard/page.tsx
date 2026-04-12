import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import prisma from "@/lib/prisma";
import { Download, PlayCircle, Music, Zap, TrendingUp, MoreHorizontal, MessageSquare } from "lucide-react";
import DashboardChart from "@/components/DashboardChart";

const StatsCard = ({ title, value, icon: Icon, trend }: { title: string; value: string | number; icon: any; trend?: string }) => (
  <div className="glass p-6 rounded-2xl flex flex-col gap-4 border border-white/5 relative overflow-hidden group">
    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
      <Icon className="h-12 w-12 text-white" />
    </div>
    <div className="flex items-center justify-between relative z-10">
      <div className="p-2 bg-primary/10 rounded-lg">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      {trend && <span className="text-xs text-green-400 flex items-center gap-1 font-medium"><TrendingUp className="h-3 w-3" /> {trend}</span>}
    </div>
    <div className="relative z-10">
      <p className="text-xs text-muted font-bold uppercase tracking-widest">{title}</p>
      <h3 className="text-4xl font-display font-bold text-white mt-1 tracking-tighter">{value}</h3>
    </div>
  </div>
);

const PriorityChannel = ({ name, uploader, progress, color }: { name: string; uploader: string; progress: number; color: string }) => (
  <div className="glass p-4 rounded-xl border border-white/5 space-y-4 hover:bg-white/5 transition-all group cursor-pointer">
    <div className="flex items-center gap-4">
      <div className="h-10 w-10 bg-surface-bright rounded-lg ring-1 ring-white/10 flex items-center justify-center overflow-hidden">
        <div className={`h-full w-full opacity-40`} style={{ backgroundColor: color }} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-white truncate">{name}</h4>
        <p className="text-[10px] text-muted font-medium uppercase tracking-wider">{uploader}</p>
      </div>
      <MoreHorizontal className="h-4 w-4 text-muted group-hover:text-white transition-colors" />
    </div>
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] font-bold text-muted uppercase">
        <span>Usage</span>
        <span className="text-white">{progress}%</span>
      </div>
      <div className="h-1 w-full bg-surface-card rounded-full overflow-hidden">
        <div className={`h-full opacity-80`} style={{ width: `${progress}%`, backgroundColor: color }} />
      </div>
    </div>
  </div>
);

export default async function DashboardPage() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  if (!user || !user.id) return null;

  const userStats = await prisma.userStats.findUnique({
    where: { userId: user.id }
  });

  const recentDownloads = await prisma.download.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 5
  });

  return (
    <div className="space-y-10 fade-in pb-20">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-[0.2em] animate-pulse">
            <span className="h-2 w-2 rounded-full bg-primary" /> System Online
          </div>
          <h1 className="text-5xl font-display font-bold text-white tracking-tighter">Workspace Overview</h1>
        </div>
        <div className="flex items-center gap-4">
           <div className="glass p-1 rounded-xl flex">
              <button className="px-4 py-2 bg-surface-bright text-white text-xs font-bold rounded-lg shadow-xl">Real-time</button>
              <button className="px-4 py-2 text-muted text-xs font-bold rounded-lg hover:text-white transition-colors">History</button>
           </div>
        </div>
      </section>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard title="Total Index" value={userStats?.totalYoutubeLinks || 0} icon={Zap} trend="+12.4%" />
        <StatsCard title="Subscribers" value="1,286" icon={PlayCircle} />
        <StatsCard title="Video Saved" value={userStats?.totalVideosDownloaded || 0} icon={Download} trend="+5.2%" />
        <StatsCard title="Audio Saved" value={userStats?.totalMP3Downloaded || 0} icon={Music} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Analytics Chart */}
        <div className="lg:col-span-8 glass p-8 rounded-2xl border border-white/5 space-y-8">
           <div className="flex items-center justify-between">
              <div>
                 <h2 className="text-xl font-display font-bold text-white">Extraction Velocity</h2>
                 <p className="text-xs text-muted">Activity performance across the last 30 days.</p>
              </div>
              <div className="flex gap-2">
                 <div className="flex items-center gap-2 text-[10px] font-bold text-muted uppercase">
                    <span className="h-2 w-2 rounded-full bg-primary" /> Video
                 </div>
                 <div className="flex items-center gap-2 text-[10px] font-bold text-muted uppercase">
                    <span className="h-2 w-2 rounded-full bg-blue-500" /> Audio
                 </div>
              </div>
           </div>
           <div className="h-[300px] w-full">
              <DashboardChart />
           </div>
        </div>

        {/* Priority Channels */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-bold text-white">Priority Channels</h2>
            <button className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline">Manage</button>
          </div>
          <div className="grid grid-cols-1 gap-4">
             <PriorityChannel name="CyberPulse Neon" uploader="Vercel Audio" progress={78} color="#FF0000" />
             <PriorityChannel name="Modern Theory" uploader="Design Guild" progress={45} color="#8B5CF6" />
             <PriorityChannel name="The UI Bar" uploader="Code Lab" progress={92} color="#10B981" />
          </div>
          <div className="glass p-6 rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center group hover:bg-white/5 cursor-pointer transition-all">
             <div className="h-10 w-10 rounded-full border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Zap className="h-4 w-4 text-muted" />
             </div>
             <p className="text-xs font-bold text-white mt-4">Elevate your Stream</p>
             <p className="text-[10px] text-muted mt-1 leading-relaxed">Upgrade to Director Pro for priority rendering and unlimited storage.</p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-display font-bold text-white tracking-tight">Recent Activity</h2>
            <div className="flex items-center gap-2">
               <button className="p-2 glass rounded-lg hover:text-primary transition-all"><MoreHorizontal className="h-4 w-4" /></button>
            </div>
          </div>
          
          <div className="glass rounded-2xl overflow-hidden border border-white/5">
            {recentDownloads.length > 0 ? (
              <table className="w-full text-left">
                <thead className="bg-surface-card/50 text-muted text-[10px] font-bold uppercase tracking-widest border-b border-white/5">
                  <tr>
                    <th className="px-8 py-5">Identified Asset</th>
                    <th className="px-8 py-5">Extraction Phase</th>
                    <th className="px-8 py-5">Status</th>
                    <th className="px-8 py-5 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recentDownloads.map((item) => (
                    <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-4 max-w-sm">
                            <div className="h-12 w-20 bg-surface-bright rounded-lg ring-1 ring-white/10 shrink-0 overflow-hidden relative">
                               <div className="absolute inset-0 bg-gradient-to-tr from-primary to-transparent opacity-10" />
                               <Download className="h-4 w-4 text-muted absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            </div>
                            <div className="truncate">
                               <p className="text-sm text-white font-bold truncate">{item.title}</p>
                               <p className="text-[10px] text-muted font-medium uppercase tracking-tighter mt-1">Resource ID: {item.id.slice(0, 8)}</p>
                            </div>
                         </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-surface-card text-primary ring-1 ring-primary/20 uppercase tracking-tighter">
                          {item.format}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                           <div className={`h-1.5 w-1.5 rounded-full ${item.status === 'COMPLETED' ? 'bg-green-400' : 'bg-red-400'}`} />
                           <span className={`text-[10px] font-bold italic uppercase ${item.status === 'COMPLETED' ? 'text-green-400' : 'text-red-400'}`}>
                             {item.status}
                           </span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-xs text-muted text-right font-medium">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-20 text-center space-y-4">
                <MessageSquare className="h-12 w-12 mx-auto text-white/5" />
                <p className="text-sm text-muted font-medium">No system activity detected.</p>
              </div>
            )}
          </div>
      </section>
    </div>
  );
}
