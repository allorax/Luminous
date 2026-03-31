import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Brush } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'motion/react';

interface ChartWidgetProps {
  title: string;
  data: { time: string; value: number }[];
  color?: string;
}

const timeRanges = ['1D', '1W', '1M', '3M', '1Y', 'ALL'];

export function ChartWidget({ title, data, color = "#10b981" }: ChartWidgetProps) {
  const [activeRange, setActiveRange] = useState('1D');
  const [isLive, setIsLive] = useState(true);

  // Simulate "Live" status
  useEffect(() => {
    const interval = setInterval(() => {
      setIsLive(prev => !prev);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="col-span-full lg:col-span-2 overflow-hidden">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 space-y-4 sm:space-y-0">
        <div className="flex items-center gap-3">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/50 border">
            <motion.div 
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="h-1.5 w-1.5 rounded-full bg-gain" 
            />
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Live</span>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
          {timeRanges.map((range) => (
            <Button
              key={range}
              variant="ghost"
              size="sm"
              onClick={() => setActiveRange(range)}
              className={cn(
                "h-7 px-2 text-[10px] font-bold rounded-md transition-all",
                activeRange === range 
                  ? "bg-background text-primary shadow-sm" 
                  : "text-muted-foreground hover:text-primary"
              )}
            >
              {range}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={`colorValue-${title.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis 
                dataKey="time" 
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
              />
              <Tooltip 
                cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '5 5' }}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-background/80 border border-border p-3 rounded-xl shadow-xl backdrop-blur-md">
                        <p className="text-[10px] text-muted-foreground font-bold uppercase mb-1">{label}</p>
                        <p className="text-lg font-bold" style={{ color }}>
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
                fill={`url(#colorValue-${title.replace(/\s+/g, '-')})`} 
                strokeWidth={2}
                isAnimationActive={false} // Disable default animation for smoother real-time updates
              />
              <Brush 
                dataKey="time" 
                height={30} 
                stroke={color} 
                fill="transparent"
                travellerWidth={10}
                className="brush-custom"
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
