
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Activity, Globe } from 'lucide-react';
import axios from 'axios';
import { cn } from '@/lib/utils';

interface MarketItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
}

interface IndexItem {
  symbol: string;
  name: string;
  price: number;
  changesPercentage: number;
  change: number;
}

export function MarketPulse() {
  const [gainers, setGainers] = useState<MarketItem[]>([]);
  const [losers, setLosers] = useState<MarketItem[]>([]);
  const [indices, setIndices] = useState<IndexItem[]>([]);
  const [marketStatus, setMarketStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const [gainersRes, losersRes, indicesRes, statusRes] = await Promise.allSettled([
          axios.get('/api/market/gainers'),
          axios.get('/api/market/losers'),
          axios.get('/api/market/indices'),
          axios.get('/api/market/status')
        ]);
        if (gainersRes.status === 'fulfilled' && Array.isArray(gainersRes.value.data)) {
          setGainers(gainersRes.value.data.slice(0, 5));
        }
        if (losersRes.status === 'fulfilled' && Array.isArray(losersRes.value.data)) {
          setLosers(losersRes.value.data.slice(0, 5));
        }
        if (indicesRes.status === 'fulfilled' && Array.isArray(indicesRes.value.data)) {
          setIndices(indicesRes.value.data.slice(0, 4));
        }
        if (statusRes.status === 'fulfilled') {
          setMarketStatus(statusRes.value.data);
        }
      } catch (err) {
        console.error('Failed to fetch market pulse data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMarketData();
    const interval = setInterval(fetchMarketData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card className="col-span-full bg-background/50 backdrop-blur-xl border-white/5">
        <CardContent className="h-48 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Pulse Syncing...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 col-span-full">
      {/* Indices Bar */}
      <Card className="xl:col-span-3 bg-background/50 backdrop-blur-xl border-white/5 overflow-hidden">
        <div className="flex items-center gap-8 p-4 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 pr-4 border-r border-white/5">
            <Globe className="h-4 w-4 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Global Indices</span>
          </div>
          {indices.map((idx) => (
            <div key={idx.symbol} className="flex flex-col min-w-[120px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold truncate max-w-[80px]">{idx.name.replace('Index', '')}</span>
                <span className={cn(
                  "text-[10px] font-bold",
                  idx.change >= 0 ? "text-gain" : "text-loss"
                )}>
                  {idx.changesPercentage.toFixed(2)}%
                </span>
              </div>
              <span className="text-sm font-mono font-bold tracking-tighter">${idx.price.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Gainers & Losers */}
      <Card className="xl:col-span-2 bg-background/50 backdrop-blur-xl border-white/5">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Market Movers
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="gainers" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/20">
              <TabsTrigger value="gainers" className="text-[10px] uppercase font-bold tracking-widest">
                Top Gainers
              </TabsTrigger>
              <TabsTrigger value="losers" className="text-[10px] uppercase font-bold tracking-widest">
                Top Losers
              </TabsTrigger>
            </TabsList>
            <TabsContent value="gainers" className="mt-4 space-y-4">
              {gainers.map((stock) => (
                <div key={stock.symbol} className="flex items-center justify-between group cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gain/10 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-gain" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">{stock.symbol}</div>
                      <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">{stock.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold font-mono">${stock.price.toFixed(2)}</div>
                    <Badge variant="outline" className="bg-gain/10 text-gain border-gain/20 text-[10px] h-5">
                      +{stock.changesPercentage.toFixed(2)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="losers" className="mt-4 space-y-4">
              {losers.map((stock) => (
                <div key={stock.symbol} className="flex items-center justify-between group cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-loss/10 flex items-center justify-center">
                      <TrendingDown className="h-4 w-4 text-loss" />
                    </div>
                    <div>
                      <div className="text-xs font-bold">{stock.symbol}</div>
                      <div className="text-[10px] text-muted-foreground truncate max-w-[150px]">{stock.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold font-mono">${stock.price.toFixed(2)}</div>
                    <Badge variant="outline" className="bg-loss/10 text-loss border-loss/20 text-[10px] h-5">
                      {stock.changesPercentage.toFixed(2)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Market Status */}
      <Card className="bg-background/50 backdrop-blur-xl border-white/5">
        <CardHeader>
          <CardTitle className="text-sm font-bold uppercase tracking-widest">Market Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-white/5 rounded-2xl bg-white/5">
            <div className={cn(
              "h-16 w-16 rounded-full flex items-center justify-center mb-4 animate-pulse",
              marketStatus?.market === 'open' ? "bg-gain/20" : "bg-loss/20"
            )}>
              <Globe className={cn(
                "h-8 w-8",
                marketStatus?.market === 'open' ? "text-gain" : "text-loss"
              )} />
            </div>
            <span className="text-xl font-bold tracking-tighter capitalize">Market {marketStatus?.market || 'Closed'}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {marketStatus?.serverTime ? new Date(marketStatus.serverTime).toLocaleTimeString() : 'Syncing...'}
            </span>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Exchanges</span>
              <div className="flex gap-2">
                <Badge variant="outline" className={cn("text-[8px] h-4", marketStatus?.exchanges?.nyse === 'open' ? "text-gain border-gain/20" : "text-loss border-loss/20")}>NYSE</Badge>
                <Badge variant="outline" className={cn("text-[8px] h-4", marketStatus?.exchanges?.nasdaq === 'open' ? "text-gain border-gain/20" : "text-loss border-loss/20")}>NASDAQ</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
