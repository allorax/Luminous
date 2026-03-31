import { useState, useEffect, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Clock, Calendar } from 'lucide-react';
import axios from 'axios';

interface StockChartWidgetProps {
  symbol: string;
  className?: string;
}

type Timeframe = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';

interface HistoricalData {
  t: number; // timestamp
  c: number; // close
  o: number; // open
  h: number; // high
  l: number; // low
  v: number; // volume
}

export function StockChartWidget({ symbol, className }: StockChartWidgetProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');
  const [data, setData] = useState<HistoricalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const timeframes: { label: string; value: Timeframe }[] = [
    { label: '1D', value: '1D' },
    { label: '1W', value: '1W' },
    { label: '1M', value: '1M' },
    { label: '3M', value: '3M' },
    { label: '1Y', value: '1Y' },
    { label: 'ALL', value: 'ALL' },
  ];

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onmessage = (event) => {
      const update = JSON.parse(event.data);
      if (update.type === 'T' && update.sym === symbol) {
        setData(currentData => {
          if (currentData.length === 0) return currentData;
          
          const lastPoint = currentData[currentData.length - 1];
          const now = Date.now();
          
          // Only add a new point if it's a new minute (for 1D view)
          // Otherwise, just update the last point's close price
          const lastTime = new Date(lastPoint.t);
          const currentTime = new Date(now);
          
          if (timeframe === '1D' && lastTime.getMinutes() !== currentTime.getMinutes()) {
            return [...currentData.slice(1), {
              t: now,
              c: update.p,
              o: update.p,
              h: update.p,
              l: update.p,
              v: 0
            }];
          } else {
            const updatedLast = {
              ...lastPoint,
              c: update.p,
              h: Math.max(lastPoint.h, update.p),
              l: Math.min(lastPoint.l, update.p),
              t: now // Update timestamp to keep it current
            };
            return [...currentData.slice(0, -1), updatedLast];
          }
        });
      }
    };

    return () => ws.close();
  }, [symbol, timeframe]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const now = new Date();
        let from = new Date();
        let timespan = 'day';
        let multiplier = 1;

        switch (timeframe) {
          case '1D':
            from.setDate(now.getDate() - 1);
            timespan = 'minute';
            multiplier = 5;
            break;
          case '1W':
            from.setDate(now.getDate() - 7);
            timespan = 'hour';
            multiplier = 1;
            break;
          case '1M':
            from.setMonth(now.getMonth() - 1);
            timespan = 'day';
            break;
          case '3M':
            from.setMonth(now.getMonth() - 3);
            timespan = 'day';
            break;
          case '1Y':
            from.setFullYear(now.getFullYear() - 1);
            timespan = 'day';
            break;
          case 'ALL':
            from.setFullYear(now.getFullYear() - 5);
            timespan = 'week';
            break;
        }

        const fromStr = from.toISOString().split('T')[0];
        const toStr = now.toISOString().split('T')[0];

        const response = await axios.get(`/api/historical/${symbol}`, {
          params: {
            multiplier,
            timespan,
            from: fromStr,
            to: toStr
          }
        });

        if (response.data && Array.isArray(response.data)) {
          setData(response.data);
        } else {
          setData([]);
          setError('No data available for this timeframe');
        }
      } catch (err) {
        console.error('Error fetching historical data:', err);
        setError('Failed to load chart data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol, timeframe]);

  const chartData = useMemo(() => {
    return data.map(item => ({
      ...item,
      date: new Date(item.t).toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric',
        hour: timeframe === '1D' || timeframe === '1W' ? '2-digit' : undefined,
        minute: timeframe === '1D' ? '2-digit' : undefined,
      }),
      price: item.c
    }));
  }, [data, timeframe]);

  const stats = useMemo(() => {
    if (data.length < 2) return null;
    const first = data[0].c;
    const last = data[data.length - 1].c;
    const change = last - first;
    const changePercent = (change / first) * 100;
    const isPositive = change >= 0;
    
    return {
      current: last,
      change,
      changePercent,
      isPositive,
      high: Math.max(...data.map(d => d.h)),
      low: Math.min(...data.map(d => d.l)),
    };
  }, [data]);

  const chartColor = stats?.isPositive ? '#10b981' : '#ef4444';

  return (
    <Card className={cn("w-full overflow-hidden border-none shadow-lg bg-background/50 backdrop-blur-sm", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-2xl font-bold tracking-tight">{symbol}</CardTitle>
            {stats && (
              <Badge variant={stats.isPositive ? "default" : "destructive"} className="font-mono">
                {stats.isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {stats.changePercent.toFixed(2)}%
              </Badge>
            )}
          </div>
          <CardDescription className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider">
            <Clock className="w-3 h-3" />
            Historical Performance
          </CardDescription>
        </div>
        <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border border-border/50">
          {timeframes.map((tf) => (
            <Button
              key={tf.value}
              variant="ghost"
              size="sm"
              onClick={() => setTimeframe(tf.value)}
              className={cn(
                "h-7 px-3 text-[10px] font-bold rounded-md transition-all duration-200",
                timeframe === tf.value 
                  ? "bg-background text-primary shadow-sm" 
                  : "text-muted-foreground hover:text-primary hover:bg-background/50"
              )}
            >
              {tf.label}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-[300px] w-full rounded-xl" />
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        ) : error ? (
          <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground space-y-2 border-2 border-dashed border-muted rounded-xl">
            <p className="text-sm font-medium">{error}</p>
            <Button variant="outline" size="sm" onClick={() => setTimeframe(timeframe)}>Retry</Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`colorPrice-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#888' }}
                    minTickGap={30}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#888' }}
                    domain={['auto', 'auto']}
                    orientation="right"
                    tickFormatter={(val) => `$${val}`}
                  />
                  <Tooltip 
                    cursor={{ stroke: chartColor, strokeWidth: 1, strokeDasharray: '5 5' }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-background/90 border border-border p-3 rounded-xl shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
                            <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {label}
                            </p>
                            <p className="text-xl font-bold tracking-tighter" style={{ color: chartColor }}>
                              ${payload[0].value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                            <div className="mt-2 pt-2 border-t border-border/50 grid grid-cols-2 gap-x-4 gap-y-1">
                              <span className="text-[9px] text-muted-foreground uppercase font-bold">Open</span>
                              <span className="text-[9px] font-mono text-right">${payload[0].payload.o.toFixed(2)}</span>
                              <span className="text-[9px] text-muted-foreground uppercase font-bold">High</span>
                              <span className="text-[9px] font-mono text-right">${payload[0].payload.h.toFixed(2)}</span>
                              <span className="text-[9px] text-muted-foreground uppercase font-bold">Low</span>
                              <span className="text-[9px] font-mono text-right">${payload[0].payload.l.toFixed(2)}</span>
                              <span className="text-[9px] text-muted-foreground uppercase font-bold">Vol</span>
                              <span className="text-[9px] font-mono text-right">{(payload[0].payload.v / 1000000).toFixed(1)}M</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="price" 
                    stroke={chartColor} 
                    fillOpacity={1} 
                    fill={`url(#colorPrice-${symbol})`} 
                    strokeWidth={2.5}
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-2">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Current</p>
                  <p className="text-lg font-bold font-mono tracking-tighter">${stats.current.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Range High</p>
                  <p className="text-lg font-bold font-mono tracking-tighter text-gain">${stats.high.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Range Low</p>
                  <p className="text-lg font-bold font-mono tracking-tighter text-loss">${stats.low.toFixed(2)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Change</p>
                  <p className={cn("text-lg font-bold font-mono tracking-tighter", stats.isPositive ? "text-gain" : "text-loss")}>
                    {stats.isPositive ? '+' : ''}{stats.change.toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
