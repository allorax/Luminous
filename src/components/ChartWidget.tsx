import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Brush } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { useTicker } from '@/lib/hooks/useTicker';

interface ChartWidgetProps {
  symbol: string;
  title: string;
  color?: string;
}

const timeRanges = ['1D', '1W', '1M', '3M', '1Y'];

export function ChartWidget({ symbol, title, color = "#10b981" }: ChartWidgetProps) {
  const [activeRange, setActiveRange] = useState('1D');
  const [data, setData] = useState<{ time: string; value: number; timestamp: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const ticker = useTicker(symbol);

  useEffect(() => {
    const fetchHistoricalData = async () => {
      setLoading(true);
      try {
        let timespan = 'day';
        let from = new Date();
        
        if (activeRange === '1D') {
          timespan = 'minute';
          from.setDate(from.getDate() - 1);
        } else if (activeRange === '1W') {
          timespan = 'hour';
          from.setDate(from.getDate() - 7);
        } else if (activeRange === '1M') {
          from.setMonth(from.getMonth() - 1);
        } else if (activeRange === '3M') {
          from.setMonth(from.getMonth() - 3);
        } else if (activeRange === '1Y') {
          from.setFullYear(from.getFullYear() - 1);
        }

        const res = await axios.get(`/api/historical/${symbol}`, {
          params: { 
            timespan, 
            from: from.toISOString().split('T')[0],
            to: new Date().toISOString().split('T')[0]
          }
        });

        const formatted = res.data.map((d: any) => ({
          time: new Date(d.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          value: d.c,
          timestamp: d.t
        }));
        setData(formatted);
      } catch (err) {
        console.error("Failed to fetch historical data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistoricalData();
  }, [symbol, activeRange]);

  // Live updates
  useEffect(() => {
    if (ticker && data.length > 0 && activeRange === '1D') {
      const now = Date.now();
      const lastPoint = data[data.length - 1];
      
      // Only append if it's a new minute (or update the last one)
      if (now - lastPoint.timestamp > 60000) {
        setData(prev => [...prev, {
          time: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          value: ticker.price,
          timestamp: now
        }]);
      } else {
        setData(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            value: ticker.price,
            timestamp: now
          };
          return updated;
        });
      }
    }
  }, [ticker, activeRange]);

  return (
    <Card className="col-span-full lg:col-span-2 overflow-hidden border-white/5 bg-background/40 backdrop-blur-md">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 space-y-4 sm:space-y-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <CardTitle className="text-sm font-bold text-primary uppercase tracking-widest">{symbol}</CardTitle>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">{title}</span>
            <div className="flex items-center gap-1.5">
              <motion.div 
                animate={{ opacity: [1, 0.4, 1], scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="h-1.5 w-1.5 rounded-full bg-gain" 
              />
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">Live Sync</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-muted/20 p-1 rounded-xl border border-white/5">
          {timeRanges.map((range) => (
            <Button
              key={range}
              variant="ghost"
              size="sm"
              onClick={() => setActiveRange(range)}
              className={cn(
                "h-7 px-3 text-[10px] font-black rounded-lg transition-all",
                activeRange === range 
                  ? "bg-background text-primary shadow-lg" 
                  : "text-muted-foreground hover:text-primary"
              )}
            >
              {range}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="relative">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/20 backdrop-blur-sm">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <div className="h-[350px] w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={`colorValue-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="time" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#666', fontWeight: 'bold' }}
                minTickGap={40}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#666', fontWeight: 'bold' }}
                domain={['auto', 'auto']}
                orientation="right"
              />
              <Tooltip 
                cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 4' }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-background/80 border border-white/10 p-3 rounded-2xl shadow-2xl backdrop-blur-xl">
                        <p className="text-[10px] text-muted-foreground font-black uppercase mb-1">{label}</p>
                        <p className="text-xl font-black tabular-nums" style={{ color }}>
                          ${payload[0].value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke={color} 
                fillOpacity={1} 
                fill={`url(#colorValue-${symbol})`} 
                strokeWidth={2.5}
                isAnimationActive={!loading}
                animationDuration={1000}
              />
              <Brush 
                dataKey="time" 
                height={30} 
                stroke={color} 
                fill="transparent"
                travellerWidth={10}
                className="brush-custom"
                gap={10}
              >
                <AreaChart>
                  <Area dataKey="value" fill={color} stroke={color} fillOpacity={0.1} />
                </AreaChart>
              </Brush>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
