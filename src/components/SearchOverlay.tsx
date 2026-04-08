import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, TrendingUp, History, Globe, Star, Clock, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import axios from 'axios';
import { useSearchStore } from '@/lib/store/useSearchStore';
import { debounce } from 'lodash-es';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// Mini Sparkline component for search results
function Sparkline({ symbol, color = "#10b981" }: { symbol: string, color?: string }) {
  const [data, setData] = useState<number[]>([]);

  useEffect(() => {
    const fetchSparkline = async () => {
      try {
        const res = await axios.get(`/api/historical/${symbol}?timespan=minute&multiplier=5`);
        if (res.data && Array.isArray(res.data)) {
          setData(res.data.slice(-10).map((d: any) => d.c));
        }
      } catch (e) {}
    };
    fetchSparkline();
  }, [symbol]);

  if (data.length < 2) return <div className="w-12 h-6" />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const width = 48;
  const height = 24;
  
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((v - min) / range) * height
  }));

  const path = `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const trendingInIndia = [
  { symbol: 'RELIANCE.NS', name: 'Reliance Industries', exchange: 'NSE' },
  { symbol: 'TCS.NS', name: 'Tata Consultancy Services', exchange: 'NSE' },
  { symbol: 'HDFCBANK.NS', name: 'HDFC Bank', exchange: 'NSE' },
  { symbol: 'INFY.NS', name: 'Infosys Limited', exchange: 'NSE' },
  { symbol: 'ICICIBANK.NS', name: 'ICICI Bank', exchange: 'NSE' },
];

export function SearchOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [prices, setPrices] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { 
    recentSearches, 
    addRecentSearch, 
    activeRegion, 
    setRegion, 
    setSelectedSymbol,
    activeFilter,
    setFilter
  } = useSearchStore();

  const handleSearch = useCallback(
    debounce(async (q: string, reg: string) => {
      if (q.length < 1) {
        setResults([]);
        setNews([]);
        setPrices({});
        return;
      }
      setLoading(true);
      try {
        const res = await axios.get(`/api/search?q=${q}&region=${reg}`);
        const quotes = res.data.quotes || [];
        setResults(quotes);
        setNews(res.data.news || []);

        if (quotes.length > 0) {
          const symbols = quotes.map((q: any) => q.symbol).join(',');
          const pRes = await axios.get(`/api/quotes?symbols=${symbols}`);
          const pMap: Record<string, any> = {};
          (pRes.data || []).forEach((item: any) => {
            pMap[item.symbol] = item;
          });
          setPrices(pMap);
        }
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setLoading(false);
      }
    }, 400),
    []
  );

  useEffect(() => {
    handleSearch(query, activeRegion);
  }, [query, activeRegion, handleSearch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 10);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  const onSelect = (item: any) => {
    addRecentSearch({ symbol: item.symbol, name: item.name, exchange: item.exchange, type: item.type });
    setSelectedSymbol(item.symbol);
    setIsOpen(false);
    setQuery('');
  };

  const handleNav = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, (results.length || trendingInIndia.length) - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      const list = results.length > 0 ? results : (query === '' ? recentSearches.length > 0 ? recentSearches : trendingInIndia : []);
      if (list[selectedIndex]) onSelect(list[selectedIndex]);
    }
  };

  return (
    <>
      <div 
        onClick={() => setIsOpen(true)}
        className="group relative flex items-center gap-2 px-4 py-2 bg-muted/30 hover:bg-muted/50 border border-white/5 rounded-full cursor-text transition-all w-full max-w-md"
      >
        <Search className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        <span className="text-sm text-muted-foreground">Search markets...</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <kbd className="text-xs">⌘</kbd>K
        </kbd>
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="relative w-full max-w-2xl bg-card border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
              ref={searchRef}
            >
              <div className="p-4 border-b border-white/5 flex items-center gap-4">
                <Search className="h-5 w-5 text-primary" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleNav}
                  placeholder="Type a symbol or company name..."
                  className="flex-1 bg-transparent border-none outline-none text-lg font-medium placeholder:text-muted-foreground"
                />
                <div className="flex items-center gap-2">
                  <Badge 
                    onClick={() => setRegion(activeRegion === 'IN' ? 'US' : 'IN')}
                    variant="outline" 
                    className="cursor-pointer hover:bg-white/5 px-2 py-1 gap-1.5"
                  >
                    <Globe className="h-3 w-3" />
                    {activeRegion}
                  </Badge>
                  <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/5 rounded-full transition-colors">
                    <X className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>
              </div>

              <div className="px-4 pb-2 border-b border-white/5 bg-background/50">
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2">
                  {['ALL', 'STOCKS', 'ETFS', 'CRYPTO'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f as any)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        activeFilter === f 
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                          : "bg-muted/30 text-muted-foreground hover:bg-muted/50 hover:text-primary"
                      )}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar p-2">
                {query === '' ? (
                  <div className="space-y-6 p-4">
                    {recentSearches.length > 0 && (
                      <section>
                        <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                          <History className="h-3 w-3" /> Recent Searches
                        </h3>
                        <div className="grid grid-cols-1 gap-1">
                          {recentSearches.map((item, i) => (
                            <button
                              key={item.symbol}
                              onClick={() => onSelect(item)}
                              onMouseEnter={() => setSelectedIndex(i)}
                              className={cn(
                                "flex items-center justify-between p-3 rounded-xl transition-all text-left",
                                selectedIndex === i ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-white/5"
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center font-bold text-[10px]">
                                  {item.symbol.substring(0, 2)}
                                </div>
                                <div>
                                  <div className="text-sm font-bold">{item.symbol}</div>
                                  <div className="text-[10px] text-muted-foreground">{item.name}</div>
                                </div>
                              </div>
                              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-50" />
                            </button>
                          ))}
                        </div>
                      </section>
                    )}

                    <section>
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
                        <TrendingUp className="h-3 w-3" /> Trending in {activeRegion === 'IN' ? 'India' : 'US'}
                      </h3>
                      <div className="grid grid-cols-1 gap-1">
                        {trendingInIndia.map((item, i) => (
                          <button
                            key={item.symbol}
                            onClick={() => onSelect(item)}
                            onMouseEnter={() => setSelectedIndex((recentSearches.length) + i)}
                            className={cn(
                              "flex items-center justify-between p-3 rounded-xl transition-all text-left",
                              selectedIndex === (recentSearches.length + i) ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-white/5"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gain/10 text-gain flex items-center justify-center font-bold text-[10px]">
                                {i + 1}
                              </div>
                              <div>
                                <div className="text-sm font-bold">{item.symbol}</div>
                                <div className="text-[10px] text-muted-foreground">{item.name} • {item.exchange}</div>
                              </div>
                            </div>
                            <Sparkline symbol={item.symbol} />
                          </button>
                        ))}
                      </div>
                    </section>
                  </div>
                ) : (
                  <div className="p-2 space-y-4">
                    {loading ? (
                      <div className="space-y-2 p-4">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div key={i} className="h-14 bg-muted/20 animate-pulse rounded-xl" />
                        ))}
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 gap-1">
                          {(() => {
                            const filteredResults = results.filter(item => {
                              if (activeFilter === 'ALL') return true;
                              if (activeFilter === 'STOCKS') return item.type === 'EQUITY';
                              if (activeFilter === 'ETFS') return item.type === 'ETF';
                              if (activeFilter === 'CRYPTO') return item.type === 'CRYPTOCURRENCY' || item.type === 'COIN';
                              return true;
                            });

                            if (filteredResults.length === 0) {
                              return (
                                <div className="p-12 text-center">
                                  <p className="text-muted-foreground">No matches found for "{query}"</p>
                                </div>
                              );
                            }

                            return filteredResults.map((item, i) => {
                              const pData = prices[item.symbol];
                              const isPositive = pData?.regularMarketChange >= 0;
                              return (
                                <button
                                  key={item.symbol}
                                  onClick={() => onSelect(item)}
                                  onMouseEnter={() => setSelectedIndex(i)}
                                  className={cn(
                                    "flex items-center justify-between p-3 rounded-xl transition-all text-left group",
                                    selectedIndex === i ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-white/5"
                                  )}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-muted/50 flex flex-col items-center justify-center group-hover:scale-110 transition-transform">
                                      <div className="text-[10px] font-black">{item.symbol.split('.')[0]}</div>
                                      <div className="text-[8px] text-muted-foreground uppercase opacity-50">{item.type}</div>
                                    </div>
                                    <div>
                                      <div className="text-sm font-bold flex items-center gap-2">
                                        {item.symbol}
                                        {item.type === 'INDEX' && <Badge variant="outline" className="text-[8px] h-4">INDEX</Badge>}
                                      </div>
                                      <div className="text-[10px] text-muted-foreground truncate max-w-[250px]">{item.name} • {item.exchange}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-6">
                                    {pData && (
                                      <div className="text-right tabular-nums">
                                        <div className="text-sm font-black">${pData.regularMarketPrice?.toFixed(2)}</div>
                                        <div className={cn(
                                          "text-[10px] font-bold",
                                          isPositive ? "text-gain" : "text-loss"
                                        )}>
                                          {isPositive ? '+' : ''}{pData.regularMarketChangePercent?.toFixed(2)}%
                                        </div>
                                      </div>
                                    )}
                                    <Sparkline symbol={item.symbol} color={isPositive ? "#10b981" : "#ef4444"} />
                                    <div className="text-right min-w-[60px] hidden sm:block">
                                      <div className="text-[10px] font-bold text-muted-foreground group-hover:text-primary transition-colors">Details</div>
                                      <div className="text-[8px] uppercase tracking-widest opacity-50">View Panel</div>
                                    </div>
                                  </div>
                                </button>
                              );
                            });
                          })()}
                        </div>

                        {news.length > 0 && (
                          <section className="mt-6 border-t border-white/5 pt-6 p-4">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-4">Related News</h3>
                            <div className="space-y-4">
                              {news.map((item: any, i: number) => (
                                <a 
                                  key={i} 
                                  href={item.link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="block group"
                                >
                                  <div className="flex justify-between items-start gap-4">
                                    <div className="flex-1">
                                      <h4 className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-2">{item.title}</h4>
                                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                                        <span>{item.publisher}</span>
                                        <span>•</span>
                                        <span>{new Date(item.providerPublishTime * 1000).toLocaleDateString()}</span>
                                      </div>
                                    </div>
                                    {item.thumbnail?.resolutions?.[0] && (
                                      <img 
                                        src={item.thumbnail.resolutions[0].url} 
                                        alt="" 
                                        className="w-16 h-12 object-cover rounded-md"
                                      />
                                    )}
                                  </div>
                                </a>
                              ))}
                            </div>
                          </section>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 bg-muted/20 border-t border-white/5 flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                <div className="flex gap-4">
                  <span className="flex items-center gap-1"><kbd className="bg-background px-1 rounded">↑↓</kbd> Navigate</span>
                  <span className="flex items-center gap-1"><kbd className="bg-background px-1 rounded">Enter</kbd> Select</span>
                </div>
                <span>Esc to close</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
