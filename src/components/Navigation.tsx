import { LayoutDashboard, TrendingUp, Wallet, Settings, LogOut, Bell, Search, User } from 'lucide-react';
import { MarketStatus } from './MarketStatus';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const navItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'markets', icon: TrendingUp, label: 'Markets' },
  { id: 'portfolio', icon: Wallet, label: 'Portfolio' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

export function Sidebar({ activeTab, onTabSelect }: { activeTab: string, onTabSelect: (tab: string) => void }) {
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

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

export function Header({ onSymbolSelect }: { onSymbolSelect?: (symbol: string) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length > 1) {
        try {
          const res = await axios.get(`/api/search?q=${query}`);
          setResults(res.data);
          setShowResults(true);
        } catch (err) {
          console.error("Search failed", err);
        }
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <header className="h-16 border-b bg-background/50 backdrop-blur-md flex items-center justify-between px-8 sticky top-0 z-50">
      <div className="relative w-96 max-w-md" ref={searchRef}>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input 
          type="text" 
          placeholder="Search stocks, news, or symbols..." 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length > 1 && setShowResults(true)}
          className="w-full pl-10 pr-4 py-2 bg-muted/50 border-none rounded-full text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
        />
        
        {showResults && results.length > 0 && (
          <div className="absolute top-full left-0 w-full mt-2 bg-card border border-primary/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl z-[60]">
            {results.map((r, i) => (
              <div 
                key={i} 
                className="p-3 hover:bg-primary/5 cursor-pointer flex items-center justify-between border-b border-primary/5 last:border-0"
                onClick={() => {
                  onSymbolSelect?.(r.symbol);
                  setQuery('');
                  setShowResults(false);
                }}
              >
                <div>
                  <div className="text-sm font-bold">{r.symbol}</div>
                  <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">{r.name}</div>
                </div>
                <div className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded">{r.stockExchange}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-4">
        <MarketStatus />
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
