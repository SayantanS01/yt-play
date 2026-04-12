import Link from "next/link";
import { LayoutDashboard, Download, Music, Settings, LogOut, ShieldCheck } from "lucide-react";
import { LogoutLink } from "@kinde-oss/kinde-auth-nextjs/components";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";

const SidebarItem = ({ href, icon: Icon, label }: { href: string; icon: any; label: string }) => (
  <Link 
    href={href} 
    className="flex items-center gap-3 px-4 py-3 text-muted hover:text-white hover:bg-surface-card rounded-lg transition-all"
  >
    <Icon className="h-5 w-5" />
    <span className="font-medium">{label}</span>
  </Link>
);

export default async function Sidebar() {
  const { getPermission } = getKindeServerSession();
  const isAdmin = await getPermission("admin");

  return (
    <aside className="w-64 glass-rail h-full hidden md:flex flex-col p-6 border-r border-border-ghost">
      <div className="flex items-center gap-2 mb-10 px-4">
        <div className="h-8 w-8 bg-primary rounded flex items-center justify-center">
          <Download className="h-5 w-5 text-white" />
        </div>
        <span className="text-xl font-display font-bold text-white tracking-tight">Media Hub</span>
      </div>

      <nav className="flex-1 space-y-2">
        <SidebarItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" />
        <SidebarItem href="/downloader" icon={Download} label="Downloader" />
        <SidebarItem href="/player" icon={Music} label="Music Player" />
        <SidebarItem href="/settings" icon={Settings} label="Settings" />
        {isAdmin?.isGranted && (
          <SidebarItem href="/admin" icon={ShieldCheck} label="Admin Panel" />
        )}
      </nav>

      <div className="pt-6 border-t border-border-ghost">
        <LogoutLink className="flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all">
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Logout</span>
        </LogoutLink>
      </div>
    </aside>
  );
}
