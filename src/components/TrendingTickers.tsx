import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, TrendingUp, TrendingDown, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { useSearchStore } from '@/lib/store/useSearchStore';

interface TickerItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
}

function TickerRow({ item, onSelect }: { item: TickerItem; onSelect?: (symbol: string) => void }) {
  const isPositive = item.change >= 0;
  return (
    <div
      className="flex items-center justify-between py-2 px-2 hover:bg-white/[0.04] rounded-md cursor-pointer transition-all group border border-transparent hover:border-white/5"
      onClick={() => onSelect?.(item.symbol)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-black tracking-tight group-hover:text-primary transition-colors">{item.symbol}</span>
          {isPositive ? (
            <ArrowUpRight className="h-2.5 w-2.5 text-gain opacity-0 group-hover:opacity-100 transition-opacity" />
          ) : (
            <ArrowDownRight className="h-2.5 w-2.5 text-loss opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
        <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 truncate max-w-[100px]">{item.name}</div>
      </div>
      <div className="text-right tabular-nums">
        <div className="text-[11px] font-black">{item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        <div className={cn("text-[9px] font-black flex items-center justify-end gap-1 leading-none mt-0.5", isPositive ? "text-gain" : "text-loss")}>
          {isPositive ? '+' : ''}{item.changesPercentage.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title, icon: Icon, colorClass }: { title: string; icon: any; colorClass: string }) {
  return (
    <div className="flex items-center justify-between mb-4 px-1">
      <div className="flex items-center gap-2">
        <div className={cn("p-1 rounded-sm bg-opacity-20", colorClass.replace('text-', 'bg-'))}>
          <Icon className={cn("h-3 w-3", colorClass)} />
        </div>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{title}</h3>
      </div>
      <div className="h-px flex-1 ml-4 bg-white/5" />
    </div>
  );
}

export function TrendingTickers() {
  const [gainers, setGainers] = useState<TickerItem[]>([]);
  const [losers, setLosers] = useState<TickerItem[]>([]);
  const [actives, setActives] = useState<TickerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { setSelectedSymbol } = useSearchStore();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [gainersRes, losersRes, activesRes] = await Promise.allSettled([
          axios.get('/api/market/gainers'),
          axios.get('/api/market/losers'),
          axios.get('/api/market/actives')
        ]);

        if (gainersRes.status === 'fulfilled' && Array.isArray(gainersRes.value.data)) {
          setGainers(gainersRes.value.data.slice(0, 5));
        }
        if (losersRes.status === 'fulfilled' && Array.isArray(losersRes.value.data)) {
          setLosers(losersRes.value.data.slice(0, 5));
        }
        if (activesRes.status === 'fulfilled' && Array.isArray(activesRes.value.data)) {
          setActives(activesRes.value.data.slice(0, 5));
        }
      } catch (err) {
        console.error('Failed to fetch trending data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleSelect = (symbol: string) => {
    setSelectedSymbol(symbol);
  };

  if (loading) {
    return (
      <div className="space-y-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-40 rounded-xl bg-white/[0.02] animate-pulse border border-white/5" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Search / Quote Lookup */}
      <div className="relative group">
        <div className="absolute inset-0 bg-primary/5 rounded-xl blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative p-0.5 rounded-xl bg-gradient-to-br from-white/10 to-transparent">
          <div className="relative flex items-center bg-background rounded-[10px] border border-white/5 overflow-hidden">
            <Search className="ml-3 h-3.5 w-3.5 text-muted-foreground/50" />
            <Input
              placeholder="SEARCH MARKETS..."
              className="border-0 bg-transparent h-10 text-[10px] font-black uppercase tracking-widest focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/30"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="mr-3 px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[9px] font-black text-muted-foreground/50">⌘K</div>
          </div>
        </div>
      </div>

      {/* Gainers */}
      <section>
        <SectionHeader title="Top Movers" icon={TrendingUp} colorClass="text-gain" />
        <div className="space-y-1">
          {gainers.map((item) => (
            <TickerRow key={item.symbol} item={item} onSelect={handleSelect} />
          ))}
        </div>
      </section>

      {/* Actives */}
      <section>
        <SectionHeader title="Most Active" icon={Activity} colorClass="text-blue-400" />
        <div className="space-y-1">
          {actives.map((item) => (
            <TickerRow key={item.symbol} item={item} onSelect={handleSelect} />
          ))}
        </div>
      </section>

      {/* Losers */}
      <section>
        <SectionHeader title="Decliners" icon={TrendingDown} colorClass="text-loss" />
        <div className="space-y-1">
          {losers.map((item) => (
            <TickerRow key={item.symbol} item={item} onSelect={handleSelect} />
          ))}
        </div>
      </section>
      
      {/* Portfolio CTA */}
      <div className="relative p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="p-2 w-fit rounded-lg bg-primary/20">
             <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-black tracking-tight text-white">Track Your Wealth</h4>
            <p className="text-[10px] font-bold text-muted-foreground mt-1 leading-relaxed">Connect your brokerage to see real-time P&L and risk metrics.</p>
          </div>
          <Button className="w-full bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest h-9">
            ACCESS PORTFOLIO
          </Button>
        </div>
        <div className="absolute top-0 right-0 -mr-4 -mt-4 h-24 w-24 bg-primary/20 blur-3xl rounded-full" />
      </div>
    </div>
  );
}
