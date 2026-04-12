import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { User, Bell, Search } from "lucide-react";

export default async function Navbar() {
  const { getUser } = getKindeServerSession();
  const user = await getUser();

  return (
    <header className="h-16 border-b border-border-ghost px-6 md:px-10 flex items-center justify-between bg-surface/50 backdrop-blur-md sticky top-0 z-40">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative max-w-md w-full hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <input 
            type="text" 
            placeholder="Search activity..." 
            className="w-full bg-surface-card border-none rounded-full py-2 pl-10 pr-4 text-sm text-white focus:ring-1 focus:ring-primary/50 transition-all outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 md:gap-6">
        <button className="text-muted hover:text-white transition-colors">
          <Bell className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3 pl-4 border-l border-border-ghost">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-white">{user?.given_name || "User"}</p>
            <p className="text-xs text-muted">{user?.email}</p>
          </div>
          {user?.picture ? (
            <img src={user.picture} alt="Avatar" className="h-8 w-8 rounded-full ring-1 ring-white/10" />
          ) : (
            <div className="h-8 w-8 bg-surface-bright rounded-full flex items-center justify-center border border-white/10">
              <User className="h-4 w-4 text-muted" />
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
