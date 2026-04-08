import { LayoutDashboard, TrendingUp, Wallet, Settings, LogOut, Bell, User } from 'lucide-react';
import { MarketStatus } from './MarketStatus';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SearchOverlay } from './SearchOverlay';
import { ResultPanel } from './ResultPanel';

const navItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'markets', icon: TrendingUp, label: 'Markets' },
  { id: 'portfolio', icon: Wallet, label: 'Portfolio' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

export function Sidebar({ activeTab, onTabSelect }: { activeTab: string, onTabSelect: (tab: string) => void }) {
  // ... (Sidebar code remains same, just ensuring imports are clean)
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
            key={item.id}
            variant={activeTab === item.id ? 'secondary' : 'ghost'}
            onClick={() => onTabSelect(item.id)}
            className={cn(
              "w-full justify-start gap-3 px-3 py-6 text-sm font-medium transition-all",
              activeTab === item.id ? "bg-secondary text-primary" : "text-muted-foreground hover:text-primary"
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
    <header className="h-16 border-b bg-background/50 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-50">
      <div className="flex items-center gap-4 flex-1 max-w-2xl">
        <SearchOverlay />
        <Separator orientation="vertical" className="h-6 mx-2" />
        <MarketStatus />
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
      
      {/* Global Result Panel */}
      <ResultPanel />
    </header>
  );
}
