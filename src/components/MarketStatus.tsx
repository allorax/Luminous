import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MarketStatus() {
  const [status, setStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    let ws: WebSocket;
    let reconnectTimer: NodeJS.Timeout;

    const connect = () => {
      ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        setStatus('connected');
      };
      
      ws.onclose = () => {
        setStatus('disconnected');
        reconnectTimer = setTimeout(connect, 5000);
      };
      
      ws.onerror = () => {
        setStatus('disconnected');
      };
    };

    connect();

    return () => {
      if (ws) ws.close();
      clearTimeout(reconnectTimer);
    };
  }, []);

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "flex items-center gap-1.5 px-2 py-1 transition-colors duration-500",
        status === 'connected' && "border-gain/50 bg-gain/10 text-gain",
        status === 'connecting' && "border-warning/50 bg-warning/10 text-warning",
        status === 'disconnected' && "border-loss/50 bg-loss/10 text-loss"
      )}
    >
      {status === 'connected' ? (
        <Wifi className="h-3 w-3 animate-pulse" />
      ) : (
        <WifiOff className="h-3 w-3" />
      )}
      <span className="text-[10px] font-bold uppercase tracking-wider">
        Market {status}
      </span>
    </Badge>
  );
}
