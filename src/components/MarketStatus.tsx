import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import axios from 'axios';

export function MarketStatus() {
  const [marketData, setMarketData] = useState<{ market: string, serverTime: string } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await axios.get('/api/market/status');
        setMarketData(res.data);
      } catch (err) {
        console.error("Failed to fetch market status", err);
      }
    };

    fetchStatus();
    const statusInterval = setInterval(fetchStatus, 60000); // Sync every minute

    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(statusInterval);
      clearInterval(clockInterval);
    };
  }, []);

  const isOpen = marketData?.market === 'open';

  return (
    <div className="flex items-center gap-2">
      <Badge 
        variant="outline" 
        className={cn(
          "h-7 px-2 flex items-center gap-1.5 transition-all duration-500 border-none bg-muted/30",
          isOpen ? "text-gain" : "text-muted-foreground"
        )}
      >
        <div className={cn(
          "h-1.5 w-1.5 rounded-full",
          isOpen ? "bg-gain animate-pulse" : "bg-muted-foreground/30"
        )} />
        <span className="text-[10px] font-bold uppercase tracking-wider">
          Market {isOpen ? 'Open' : 'Closed'}
        </span>
      </Badge>
      
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/20 text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span className="text-[10px] font-mono font-bold tabular-nums">
          {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
