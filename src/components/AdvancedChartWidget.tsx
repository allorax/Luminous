
import { useEffect, useRef, useState, useMemo } from 'react';
import { 
  createChart, 
  ColorType, 
  IChartApi, 
  ISeriesApi, 
  CandlestickData, 
  LineData, 
  SeriesType,
  Time,
  MouseEventParams,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  HistogramSeries
} from 'lightweight-charts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, 
  BarChart3, 
  AreaChart as AreaChartIcon, 
  Settings2, 
  Eye, 
  EyeOff, 
  MousePointer2, 
  PenTool, 
  Trash2,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { calculateSMA, calculateEMA, calculateRSI, calculateMACD, Candle } from '@/lib/indicators';
import { useTicker } from '@/lib/hooks/useTicker';

interface AdvancedChartWidgetProps {
  symbol: string;
  className?: string;
}

type ChartType = 'candlestick' | 'line' | 'area';
type Timeframe = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL';

interface IndicatorState {
  sma: boolean;
  ema: boolean;
  rsi: boolean;
  macd: boolean;
}

export function AdvancedChartWidget({ symbol, className }: AdvancedChartWidgetProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const smaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const emaSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdChartRef = useRef<IChartApi | null>(null);
  const macdLineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdSignalRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdHistogramRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const [chartType, setChartType] = useState<ChartType>('candlestick');
  const [timeframe, setTimeframe] = useState<Timeframe>('1M');
  const [indicators, setIndicators] = useState<IndicatorState>({
    sma: false,
    ema: false,
    rsi: false,
    macd: false
  });
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Candle[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Drawing tools state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawings, setDrawings] = useState<{ id: string; type: 'trendline'; points: { time: Time; price: number }[] }[]>([]);
  const drawingSeriesRef = useRef<ISeriesApi<'Line'>[]>([]);

  // Separate refs for indicator containers
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    
    // Guard: ensure container has valid dimensions before creating chart
    const { clientWidth, clientHeight } = chartContainerRef.current;
    if (clientWidth <= 0 || clientHeight <= 0) {
      // Retry after a short delay when container gets laid out
      const retryTimer = setTimeout(() => {
        if (chartContainerRef.current) {
          chartContainerRef.current.dispatchEvent(new Event('resize'));
        }
      }, 200);
      return () => clearTimeout(retryTimer);
    }

    const chart = createChart(chartContainerRef.current, {
      width: clientWidth,
      height: clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#888',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      crosshair: {
        mode: 0,
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
        timeVisible: true,
      },
    });

    chartRef.current = chart;

    chart.subscribeClick((param) => {
      if (!isDrawing || !param.time || !param.point || !mainSeriesRef.current) return;
      
      const price = mainSeriesRef.current.coordinateToPrice(param.point.y);
      if (price === null) return;

      setDrawings(prev => {
        const lastDrawing = prev[prev.length - 1];
        if (lastDrawing && lastDrawing.points.length === 1) {
          // Complete trendline
          const updated = [...prev];
          updated[updated.length - 1].points.push({ time: param.time!, price });
          return updated;
        } else {
          // Start new trendline
          return [...prev, { id: Math.random().toString(36).substr(2, 9), type: 'trendline', points: [{ time: param.time!, price }] }];
        }
      });
    });

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
      if (rsiContainerRef.current && rsiChartRef.current) {
        rsiChartRef.current.applyOptions({ width: rsiContainerRef.current.clientWidth });
      }
      if (macdContainerRef.current && macdChartRef.current) {
        macdChartRef.current.applyOptions({ width: macdContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      if (rsiChartRef.current) rsiChartRef.current.remove();
      if (macdChartRef.current) macdChartRef.current.remove();
    };
  }, []);

  // Sync time scales
  useEffect(() => {
    if (!chartRef.current) return;
    
    const mainTimeScale = chartRef.current.timeScale();
    
    const syncTimeScale = (targetChart: IChartApi | null) => {
      if (!targetChart) return;
      const targetTimeScale = targetChart.timeScale();
      
      mainTimeScale.subscribeVisibleTimeRangeChange(() => {
        const range = mainTimeScale.getVisibleRange();
        if (range) targetTimeScale.setVisibleRange(range);
      });
      
      targetTimeScale.subscribeVisibleTimeRangeChange(() => {
        const range = targetTimeScale.getVisibleRange();
        if (range) mainTimeScale.setVisibleRange(range);
      });
    };

    syncTimeScale(rsiChartRef.current);
    syncTimeScale(macdChartRef.current);
  }, [indicators.rsi, indicators.macd]);

  const ticker = useTicker(symbol);

  useEffect(() => {
    if (ticker && mainSeriesRef.current && data.length > 0) {
      const lastDataPoint = data[data.length - 1];
      const now = Date.now() / 1000;
      
      const timeframeSeconds = {
        '1D': 5 * 60,   // 5 min bars
        '1W': 60 * 60,  // 1 hour bars
        '1M': 24 * 60 * 60, // 1 day bars
        '3M': 24 * 60 * 60,
        '1Y': 24 * 60 * 60,
        'ALL': 7 * 24 * 60 * 60
      }[timeframe] || 60;

      const currentCandleStart = Math.floor(now / timeframeSeconds) * timeframeSeconds;
      const isSameCandle = lastDataPoint.t / 1000 === currentCandleStart;
      
      const newPoint = {
        time: currentCandleStart as Time,
        open: isSameCandle ? lastDataPoint.o : ticker.price,
        high: Math.max(isSameCandle ? lastDataPoint.h : ticker.price, ticker.price),
        low: Math.min(isSameCandle ? lastDataPoint.l : ticker.price, ticker.price),
        close: ticker.price,
        value: ticker.price
      };
      
      if (chartType === 'candlestick') {
        (mainSeriesRef.current as ISeriesApi<'Candlestick'>).update(newPoint as CandlestickData);
      } else if (chartType === 'area') {
        (mainSeriesRef.current as ISeriesApi<'Area'>).update(newPoint as LineData);
      } else {
        (mainSeriesRef.current as ISeriesApi<'Line'>).update(newPoint as LineData);
      }
    }
  }, [ticker, chartType, timeframe, data]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const now = new Date();
        let from = new Date();
        let timespan = 'day';
        let multiplier = 1;

        switch (timeframe) {
          case '1D': from.setDate(now.getDate() - 1); timespan = 'minute'; multiplier = 5; break;
          case '1W': from.setDate(now.getDate() - 7); timespan = 'hour'; multiplier = 1; break;
          case '1M': from.setMonth(now.getMonth() - 1); timespan = 'day'; break;
          case '3M': from.setMonth(now.getMonth() - 3); timespan = 'day'; break;
          case '1Y': from.setFullYear(now.getFullYear() - 1); timespan = 'day'; break;
          case 'ALL': from.setFullYear(now.getFullYear() - 5); timespan = 'week'; break;
        }

        const response = await axios.get(`/api/historical/${symbol}`, {
          params: { multiplier, timespan, from: from.toISOString().split('T')[0], to: now.toISOString().split('T')[0] }
        });

        if (response.data && Array.isArray(response.data)) {
          setData(response.data);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [symbol, timeframe]);

  useEffect(() => {
    if (!chartRef.current || data.length === 0) return;

    const chart = chartRef.current;
    if (mainSeriesRef.current) chart.removeSeries(mainSeriesRef.current);

    const formattedData = data.map(d => ({
      time: (d.t / 1000) as Time,
      open: d.o,
      high: d.h,
      low: d.l,
      close: d.c,
      value: d.c
    }));

    if (chartType === 'candlestick') {
      mainSeriesRef.current = chart.addSeries(CandlestickSeries, {
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });
      (mainSeriesRef.current as ISeriesApi<'Candlestick'>).setData(formattedData);
    } else if (chartType === 'area') {
      mainSeriesRef.current = chart.addSeries(AreaSeries, {
        lineColor: '#2962FF',
        topColor: '#2962FF',
        bottomColor: 'rgba(41, 98, 255, 0.28)',
      });
      (mainSeriesRef.current as ISeriesApi<'Area'>).setData(formattedData);
    } else {
      mainSeriesRef.current = chart.addSeries(LineSeries, {
        color: '#2962FF',
        lineWidth: 2,
      });
      (mainSeriesRef.current as ISeriesApi<'Line'>).setData(formattedData);
    }

    // Update Indicators
    if (indicators.sma) {
      if (smaSeriesRef.current) chart.removeSeries(smaSeriesRef.current);
      smaSeriesRef.current = chart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 1, title: 'SMA 20' });
      smaSeriesRef.current.setData(calculateSMA(data, 20) as LineData[]);
    } else if (smaSeriesRef.current) {
      chart.removeSeries(smaSeriesRef.current);
      smaSeriesRef.current = null;
    }

    if (indicators.ema) {
      if (emaSeriesRef.current) chart.removeSeries(emaSeriesRef.current);
      emaSeriesRef.current = chart.addSeries(LineSeries, { color: '#8b5cf6', lineWidth: 1, title: 'EMA 20' });
      emaSeriesRef.current.setData(calculateEMA(data, 20) as LineData[]);
    } else if (emaSeriesRef.current) {
      chart.removeSeries(emaSeriesRef.current);
      emaSeriesRef.current = null;
    }

    // RSI Pane
    if (indicators.rsi && rsiContainerRef.current) {
      if (!rsiChartRef.current) {
        rsiChartRef.current = createChart(rsiContainerRef.current, {
          height: 150,
          layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#888' },
          grid: { vertLines: { color: 'rgba(255, 255, 255, 0.05)' }, horzLines: { color: 'rgba(255, 255, 255, 0.05)' } },
          timeScale: { visible: false },
        });
        rsiSeriesRef.current = rsiChartRef.current.addSeries(LineSeries, { color: '#8b5cf6', lineWidth: 1, title: 'RSI 14' });
      }
      rsiSeriesRef.current?.setData(calculateRSI(data, 14) as LineData[]);
    } else if (rsiChartRef.current) {
      rsiChartRef.current.remove();
      rsiChartRef.current = null;
      rsiSeriesRef.current = null;
    }

    // MACD Pane
    if (indicators.macd && macdContainerRef.current) {
      if (!macdChartRef.current) {
        macdChartRef.current = createChart(macdContainerRef.current, {
          height: 150,
          layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#888' },
          grid: { vertLines: { color: 'rgba(255, 255, 255, 0.05)' }, horzLines: { color: 'rgba(255, 255, 255, 0.05)' } },
          timeScale: { visible: false },
        });
        macdLineRef.current = macdChartRef.current.addSeries(LineSeries, { color: '#2962FF', lineWidth: 1, title: 'MACD' });
        macdSignalRef.current = macdChartRef.current.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 1, title: 'Signal' });
        macdHistogramRef.current = macdChartRef.current.addSeries(HistogramSeries, { title: 'Histogram' });
      }
      const { macdLine, signalLine, histogram } = calculateMACD(data);
      macdLineRef.current?.setData(macdLine as LineData[]);
      macdSignalRef.current?.setData(signalLine as LineData[]);
      macdHistogramRef.current?.setData(histogram as any);
    } else if (macdChartRef.current) {
      macdChartRef.current.remove();
      macdChartRef.current = null;
      macdLineRef.current = null;
      macdSignalRef.current = null;
      macdHistogramRef.current = null;
    }

    chart.timeScale().fitContent();
  }, [data, chartType, indicators]);

  const toggleIndicator = (key: keyof IndicatorState) => {
    setIndicators(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleChartClick = (param: MouseEventParams) => {
    if (!isDrawing || !param.time || !param.point || !mainSeriesRef.current) return;
    
    const price = mainSeriesRef.current.coordinateToPrice(param.point.y);
    if (price === null) return;

    setDrawings(prev => {
      const lastDrawing = prev[prev.length - 1];
      if (lastDrawing && lastDrawing.points.length === 1) {
        // Complete trendline
        const updated = [...prev];
        updated[updated.length - 1].points.push({ time: param.time!, price });
        return updated;
      } else {
        // Start new trendline
        return [...prev, { id: Math.random().toString(36).substr(2, 9), type: 'trendline', points: [{ time: param.time!, price }] }];
      }
    });
  };

  useEffect(() => {
    if (!chartRef.current) return;
    const chart = chartRef.current;

    // Clear old drawing series
    drawingSeriesRef.current.forEach(s => chart.removeSeries(s));
    drawingSeriesRef.current = [];

    // Draw trendlines
    drawings.forEach(drawing => {
      if (drawing.points.length === 2) {
        const series = chart.addSeries(LineSeries, {
          color: '#ffffff',
          lineWidth: 1,
          lineStyle: 2, // Dashed
          lastValueVisible: false,
          priceLineVisible: false,
        });
        series.setData(drawing.points.map(p => ({ time: p.time, value: p.price })) as LineData[]);
        drawingSeriesRef.current.push(series);
      }
    });
  }, [drawings]);

  return (
    <Card className={cn("w-full overflow-hidden border-none shadow-2xl bg-background/50 backdrop-blur-xl", isFullscreen && "fixed inset-0 z-50 rounded-none", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
              {symbol}
              <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-bold opacity-70">Advanced View</Badge>
            </CardTitle>
          </div>
          
          <div className="hidden md:flex items-center gap-1 bg-muted/20 p-1 rounded-lg border border-white/5">
            {(['1D', '1W', '1M', '3M', '1Y', 'ALL'] as Timeframe[]).map((tf) => (
              <Button
                key={tf}
                variant="ghost"
                size="sm"
                onClick={() => setTimeframe(tf)}
                className={cn(
                  "h-7 px-3 text-[10px] font-bold rounded-md transition-all",
                  timeframe === tf ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-primary"
                )}
              >
                {tf}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted/20 p-1 rounded-lg border border-white/5">
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("h-8 w-8", chartType === 'candlestick' && "bg-background text-primary shadow-sm")}
              onClick={() => setChartType('candlestick')}
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("h-8 w-8", chartType === 'area' && "bg-background text-primary shadow-sm")}
              onClick={() => setChartType('area')}
            >
              <AreaChartIcon className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className={cn("h-8 w-8", chartType === 'line' && "bg-background text-primary shadow-sm")}
              onClick={() => setChartType('line')}
            >
              <LineChart className="h-4 w-4" />
            </Button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger>
              <div className="inline-flex items-center justify-center h-8 px-3 gap-2 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground cursor-pointer">
                <Settings2 className="h-4 w-4" />
                Indicators
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Overlays</DropdownMenuLabel>
              <DropdownMenuCheckboxItem checked={indicators.sma} onCheckedChange={() => toggleIndicator('sma')}>
                SMA (20)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={indicators.ema} onCheckedChange={() => toggleIndicator('ema')}>
                EMA (20)
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Oscillators</DropdownMenuLabel>
              <DropdownMenuCheckboxItem checked={indicators.rsi} onCheckedChange={() => toggleIndicator('rsi')}>
                RSI (14)
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem checked={indicators.macd} onCheckedChange={() => toggleIndicator('macd')}>
                MACD
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            variant={isDrawing ? "default" : "outline"} 
            size="icon" 
            className="h-8 w-8"
            onClick={() => setIsDrawing(!isDrawing)}
          >
            <PenTool className="h-4 w-4" />
          </Button>

          {drawings.length > 0 && (
            <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => setDrawings([])}>
              <Trash2 className="h-4 w-4" />
            </Button>
          ) }

          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setIsFullscreen(!isFullscreen)}>
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0 relative flex flex-col">
        <div 
          ref={chartContainerRef} 
          className={cn("w-full", isFullscreen ? "h-[calc(100vh-80px)]" : "h-[500px]")}
        />
        
        {indicators.rsi && (
          <div className="border-t border-white/5 bg-background/30">
            <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex justify-between items-center">
              <span>Relative Strength Index (14)</span>
              <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => toggleIndicator('rsi')}>
                <EyeOff className="h-3 w-3" />
              </Button>
            </div>
            <div ref={rsiContainerRef} className="w-full h-[150px]" />
          </div>
        )}

        {indicators.macd && (
          <div className="border-t border-white/5 bg-background/30">
            <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex justify-between items-center">
              <span>MACD (12, 26, 9)</span>
              <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => toggleIndicator('macd')}>
                <EyeOff className="h-3 w-3" />
              </Button>
            </div>
            <div ref={macdContainerRef} className="w-full h-[150px]" />
          </div>
        )}
        
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/20 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground animate-pulse">Syncing Market Data...</p>
            </div>
          </div>
        )}

        {isDrawing && (
          <div className="absolute top-4 left-4 z-10 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-xl animate-bounce">
            Drawing Mode Active
          </div>
        )}
      </CardContent>
    </Card>
  );
}
