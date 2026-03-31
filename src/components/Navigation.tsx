import { LayoutDashboard, TrendingUp, Wallet, Settings, LogOut, Bell, Search, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', active: true },
  { icon: TrendingUp, label: 'Markets', active: false },
  { icon: Wallet, label: 'Portfolio', active: false },
  { icon: Settings, label: 'Settings', active: false },
];

export function Sidebar() {
  return (
    <aside className="w-64 border-r bg-card flex flex-col h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="text-xl font-bold tracking-tight">Luminous</span>
      </div>
      <Separator className="mb-4" />
      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => (
          <Button
            key={item.label}
            variant={item.active ? 'secondary' : 'ghost'}
            className={cn(
              "w-full justify-start gap-3 px-3 py-6 text-sm font-medium transition-all",
              item.active ? "bg-secondary text-primary" : "text-muted-foreground hover:text-primary"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </Button>
        ))}
      </nav>
      <div className="p-4 mt-auto border-t">
        <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive">
          <LogOut className="h-5 w-5" />
          Logout
        </Button>
      </div>
    </aside>
  );
}

export function Header() {
  return (
    <header className="h-16 border-b bg-background/50 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-10">
      <div className="relative w-96 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input 
          type="text" 
          placeholder="Search stocks, news, or symbols..." 
          className="w-full pl-10 pr-4 py-2 bg-muted/50 border-none rounded-full text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
        />
      </div>
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute top-2 right-2 h-2 w-2 bg-destructive rounded-full border-2 border-background" />
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-1 rounded-full transition-colors">
          <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="hidden md:block">
            <div className="text-sm font-semibold">Alex Rivera</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-tighter">Pro Member</div>
          </div>
        </div>
      </div>
    </header>
  );
}
