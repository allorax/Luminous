import React, { useState, useEffect } from 'react';
import { 
  X, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  Newspaper, 
  Info, 
  Activity, 
  Users, 
  Download,
  ExternalLink,
  ChevronRight,
  Share2
} from 'lucide-react';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useSearchStore } from '@/lib/store/useSearchStore';
import { useTicker } from '@/lib/hooks/useTicker';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { AdvancedChartWidget } from './AdvancedChartWidget';

export function ResultPanel() {
  const { selectedSymbol, setSelectedSymbol } = useSearchStore();
  const [summary, setSummary] = useState<any>(null);
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const ticker = useTicker(selectedSymbol || '');

  useEffect(() => {
    if (!selectedSymbol) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        const [sumRes, searchRes] = await Promise.all([
          axios.get(`/api/summary/${selectedSymbol}`),
          axios.get(`/api/search?q=${selectedSymbol}`)
        ]);
        setSummary(sumRes.data);
        setNews(searchRes.data.news || []);
      } catch (err) {
        console.error("Failed to fetch symbol summary", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [selectedSymbol, setSelectedSymbol]);

  const price = ticker?.price || summary?.price?.regularMarketPrice?.raw || 0;
  const change = ticker?.change || summary?.price?.regularMarketChange?.raw || 0;
  const changePercent = ticker?.changePercent || summary?.price?.regularMarketChangePercent?.raw || 0;
  const isPositive = change >= 0;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sym = params.get('symbol');
    if (sym && !selectedSymbol) {
      setSelectedSymbol(sym.toUpperCase());
    }
  }, [selectedSymbol, setSelectedSymbol]);

  const copyShareLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?symbol=${selectedSymbol}`;
    navigator.clipboard.writeText(url);
    alert('Link copied to clipboard!');
  };

  const exportToCSV = () => {
    if (!summary) return;
    const data = [
      ['Metric', 'Value'],
      ['Symbol', selectedSymbol],
      ['Price', price],
      ['Change', change],
      ['Change%', changePercent],
      ['Market Cap', summary.summaryDetail?.marketCap?.fmt],
      ['P/E Ratio', summary.summaryDetail?.trailingPE?.fmt],
      ['Volume', summary.summaryDetail?.volume?.fmt],
    ];
    const csvContent = "data:text/csv;charset=utf-8," + data.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${selectedSymbol}_summary.csv`);
    document.body.appendChild(link);
    link.click();
  };

  return (
    <Sheet open={!!selectedSymbol} onOpenChange={(open) => !open && setSelectedSymbol(null)}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 bg-background/95 backdrop-blur-xl border-l border-white/5 shadow-2xl">
        <ScrollArea className="h-full">
          {loading ? (
            <div className="p-6 space-y-6">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-[300px] w-full" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Top Header Section */}
              <div className="p-6 pb-0 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-3xl font-black tracking-tighter uppercase">{selectedSymbol}</h2>
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] uppercase font-bold">
                        {summary?.price?.exchangeName || 'EXCHANGE'}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                      {summary?.price?.longName || 'Company Name'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon-sm" onClick={copyShareLink} title="Copy Share Link">
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon-sm" onClick={exportToCSV} title="Export CSV">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="gap-2 font-black uppercase text-[10px] tracking-widest px-4"
                    >
                      <Plus className="h-3 w-3" /> Watchlist
                    </Button>
                  </div>
                </div>

                <div className="flex items-end gap-3">
                  <span className="text-5xl font-black tracking-tighter tabular-nums">
                    ${price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                  <div className={cn(
                    "flex items-center gap-1.5 mb-1.5 px-2 py-0.5 rounded-lg text-xs font-black uppercase tracking-widest",
                    isPositive ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss"
                  )}>
                    {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {change > 0 ? '+' : ''}{change.toFixed(2)} ({changePercent.toFixed(2)}%)
                  </div>
                </div>
              </div>

              {/* Tabs for different sections */}
              <Tabs defaultValue="chart" className="mt-6">
                <TabsList className="mx-6 bg-muted/30 border border-white/5 p-1 rounded-xl">
                  <TabsTrigger value="chart" className="text-[10px] font-black uppercase tracking-widest px-6 rounded-lg data-[state=active]:bg-background">Chart</TabsTrigger>
                  <TabsTrigger value="stats" className="text-[10px] font-black uppercase tracking-widest px-6 rounded-lg data-[state=active]:bg-background">Stats</TabsTrigger>
                  <TabsTrigger value="news" className="text-[10px] font-black uppercase tracking-widest px-6 rounded-lg data-[state=active]:bg-background">News</TabsTrigger>
                </TabsList>

                <TabsContent value="chart" className="mt-6">
                  <div className="px-6 h-[400px]">
                    <div className="bg-muted/10 rounded-2xl border border-white/5 overflow-hidden h-full">
                      <AdvancedChartWidget symbol={selectedSymbol || ''} className="h-full" />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="stats" className="mt-8 space-y-8 px-6 pb-12">
                  <section>
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                       Peers / Competitors
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      {['AAPL', 'MSFT', 'GOOGL', 'AMZN'].filter(s => s !== selectedSymbol).slice(0, 3).map((peer) => (
                        <button
                          key={peer}
                          onClick={() => setSelectedSymbol(peer)}
                          className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-white/5 hover:bg-muted/30 transition-all text-left group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center font-bold text-[10px]">
                              {peer.substring(0, 2)}
                            </div>
                            <span className="text-sm font-bold">{peer}</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-all" />
                        </button>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <Info className="h-3 w-3" /> Key Statistics
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Market Cap', value: summary?.summaryDetail?.marketCap?.fmt || 'N/A' },
                        { label: 'P/E Ratio', value: summary?.summaryDetail?.trailingPE?.fmt || 'N/A' },
                        { label: 'Volume', value: summary?.summaryDetail?.volume?.fmt || 'N/A' },
                        { label: '52W High', value: summary?.summaryDetail?.fiftyTwoWeekHigh?.fmt || 'N/A' },
                        { label: '52W Low', value: summary?.summaryDetail?.fiftyTwoWeekLow?.fmt || 'N/A' },
                        { label: 'Dividend Yield', value: summary?.summaryDetail?.dividendYield?.fmt || 'N/A' },
                        { label: 'Profit Margin', value: summary?.financialData?.profitMargins?.fmt || 'N/A' },
                        { label: 'Current Ratio', value: summary?.financialData?.currentRatio?.fmt || 'N/A' },
                      ].map((stat, i) => (
                        <div key={i} className="p-4 rounded-2xl bg-muted/20 border border-white/5 group hover:bg-muted/30 transition-colors">
                          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5">{stat.label}</div>
                          <div className="text-lg font-black tracking-tighter tabular-nums">{stat.value}</div>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                       Company Profile
                    </h3>
                    <div className="bg-muted/20 border border-white/5 rounded-2xl p-5 space-y-4">
                      <p className="text-xs leading-relaxed text-muted-foreground font-medium">
                        {summary?.assetProfile?.longBusinessSummary || 'No description available for this asset.'}
                      </p>
                      <div className="pt-4 border-t border-white/5 flex flex-wrap gap-4">
                        <div className="flex flex-col">
                          <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Sector</span>
                          <span className="text-[11px] font-bold">{summary?.assetProfile?.sector || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Industry</span>
                          <span className="text-[11px] font-bold">{summary?.assetProfile?.industry || 'N/A'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-widest">Employees</span>
                          <span className="text-[11px] font-bold">{summary?.assetProfile?.fullTimeEmployees || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </section>
                </TabsContent>

                <TabsContent value="news" className="mt-6 px-6 pb-12">
                  <section>
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                      <Newspaper className="h-3 w-3" /> Latest Headlines
                    </h3>
                    <div className="space-y-4">
                      {news.length > 0 ? news.map((item: any, i: number) => (
                        <a 
                          key={i} 
                          href={item.link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block p-4 rounded-2xl bg-muted/20 border border-white/5 hover:bg-muted/30 transition-all group"
                        >
                          <div className="flex gap-4">
                            <div className="flex-1 space-y-2">
                              <h4 className="text-sm font-bold leading-tight group-hover:text-primary transition-colors">{item.title}</h4>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                                <span>{item.publisher}</span>
                                <span>•</span>
                                <span>{new Date(item.providerPublishTime * 1000).toLocaleDateString()}</span>
                              </div>
                            </div>
                            {item.thumbnail?.resolutions?.[0] && (
                              <img 
                                src={item.thumbnail.resolutions[0].url} 
                                alt="" 
                                className="w-20 h-16 object-cover rounded-xl shadow-lg group-hover:scale-105 transition-transform"
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                              />
                            )}
                          </div>
                        </a>
                      )) : (
                        <div className="p-12 text-center border-2 border-dashed border-white/5 rounded-3xl">
                          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">No recent news found</p>
                        </div>
                      )}
                    </div>
                  </section>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
