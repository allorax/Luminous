import { useEffect, useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import { StockCard } from '@/components/StockCard';
import { Watchlist } from '@/components/Watchlist';
import { ChartWidget } from '@/components/ChartWidget';
import { StockChartWidget } from '@/components/StockChartWidget';
import { AdvancedChartWidget } from '@/components/AdvancedChartWidget';
import { Header, Sidebar } from '@/components/Navigation';
import { Stock } from '@/types';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Plus, LayoutGrid, List } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  rectSortingStrategy
} from '@dnd-kit/sortable';
import { DraggableWidget } from '@/components/DraggableWidget';
import { CSVImporter } from '@/components/CSVImporter';
import { AlertSystem } from '@/components/AlertSystem';
import { MarketPulse } from '@/components/MarketPulse';

import { PortfolioManager } from '@/components/PortfolioManager';
import { PortfolioPerformance } from '@/components/PortfolioPerformance';
import { SymbolDetail } from '@/components/SymbolDetail';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { NewsFeed } from '@/components/NewsFeed';

const initialStocks: Stock[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 182.63, change: 1.45, changePercent: 0.8, volume: '52.4M', marketCap: '2.85T', chartData: Array.from({ length: 20 }, (_, i) => ({ time: `2026-03-${31-i}`, value: 170 + Math.random() * 20 })) },
  { symbol: 'TSLA', name: 'Tesla, Inc.', price: 193.57, change: -4.21, changePercent: -2.13, volume: '112.8M', marketCap: '615.2B', chartData: Array.from({ length: 20 }, (_, i) => ({ time: `2026-03-${31-i}`, value: 180 + Math.random() * 30 })) },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 822.79, change: 35.12, changePercent: 4.46, volume: '48.2M', marketCap: '2.06T', chartData: Array.from({ length: 20 }, (_, i) => ({ time: `2026-03-${31-i}`, value: 700 + Math.random() * 150 })) },
  { symbol: 'MSFT', name: 'Microsoft Corp.', price: 415.50, change: 2.15, changePercent: 0.52, volume: '22.1M', marketCap: '3.09T', chartData: Array.from({ length: 20 }, (_, i) => ({ time: `2026-03-${31-i}`, value: 390 + Math.random() * 40 })) },
  { symbol: 'AMZN', name: 'Amazon.com, Inc.', price: 175.35, change: 0.82, changePercent: 0.47, volume: '35.6M', marketCap: '1.82T', chartData: Array.from({ length: 20 }, (_, i) => ({ time: `2026-03-${31-i}`, value: 160 + Math.random() * 25 })) },
];

const marketsWidgetOrder = ['market-pulse', 'symbol-detail', 'market-overview', 'main-chart', 'historical-analysis', 'secondary-charts', 'watchlist', 'alerts'];

export function DashboardPage() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [watchlist, setWatchlist] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  const [widgetOrder, setWidgetOrder] = useState(marketsWidgetOrder);
  const [activeSymbol, setActiveSymbol] = useState('NVDA');
  const [selectedPortfolioId, setSelectedPortfolioId] = useState<string>('');
  const [activeTab, setActiveTab] = useState('dashboard');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      try {
        const symbols = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN'];
        const updatedStocks = await Promise.all(symbols.map(async (symbol) => {
          try {
            const [quoteRes, profileRes] = await Promise.all([
              axios.get(`/api/quote/${symbol}`),
              axios.get(`/api/profile/${symbol}`)
            ]);
            
            if (quoteRes.data && profileRes.data) {
              const quote = quoteRes.data;
              const profile = profileRes.data;
              
              return {
                symbol,
                name: profile.companyName || symbol,
                price: quote.p || 0,
                change: 0,
                changePercent: 0,
                volume: profile.volAvg ? `${(profile.volAvg / 1000000).toFixed(1)}M` : '0M',
                marketCap: profile.mktCap ? `${(profile.mktCap / 1000000000000).toFixed(2)}T` : '0T',
                chartData: Array.from({ length: 20 }, (_, i) => ({ time: `${i}:00`, value: 100 + Math.random() * 50 }))
              };
            }
          } catch (err) {
            console.error(`Error fetching initial data for ${symbol}:`, err);
          }
          return null;
        }));
        
        const validStocks = updatedStocks.filter((s): s is Stock => s !== null);
        setStocks(validStocks);
        setWatchlist(validStocks.slice(0, 3));
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  const filteredWidgetOrder = useMemo(() => {
    if (activeTab === 'portfolio') return ['portfolio-stats', 'portfolio-list', 'importer'];
    if (activeTab === 'markets') return widgetOrder;
    return widgetOrder;
  }, [activeTab, widgetOrder]);

  const handleRemoveFromWatchlist = (symbol: string) => {
    setWatchlist(prev => prev.filter(s => s.symbol !== symbol));
  };

  const handleReorderWatchlist = (newOrder: Stock[]) => {
    setWatchlist(newOrder);
  };

  const handleAddToWatchlist = () => {
    const available = stocks.filter(s => !watchlist.find(w => w.symbol === s.symbol));
    if (available.length > 0) {
      setWatchlist(prev => [...prev, available[0]]);
    } else {
      const count = watchlist.filter(s => s.symbol.startsWith('GOOGL')).length;
      const symbol = count === 0 ? 'GOOGL' : `GOOGL-${count}`;
      
      const newStock: Stock = {
        symbol: symbol,
        name: 'Alphabet Inc.',
        price: 142.65,
        change: 0,
        changePercent: 0,
        volume: '15.2M',
        marketCap: '1.8T',
        chartData: Array.from({ length: 20 }, (_, i) => ({ time: `${i}:00`, value: 130 + Math.random() * 20 }))
      };
      setStocks(prev => [...prev, newStock]);
      setWatchlist(prev => [...prev, newStock]);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setWidgetOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const renderWidget = (id: string) => {
    switch (id) {
      case 'market-pulse':
        return <MarketPulse key={id} />;
      case 'symbol-detail':
        return <SymbolDetail key={id} symbol={activeSymbol} />;
      case 'portfolio-stats':
        return <PortfolioPerformance key={id} portfolioId={selectedPortfolioId} />;
      case 'portfolio-list':
        return <PortfolioManager key={id} onSelect={(id: string) => setSelectedPortfolioId(id)} />;
      case 'market-overview':
        return (
          <div key={id} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {stocks.length > 0 ? (
              stocks.slice(0, 4).map((stock, idx) => (
                <motion.div
                  key={stock.symbol}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <StockCard stock={stock} onSelect={setActiveSymbol} />
                </motion.div>
              ))
            ) : (
              <div className="col-span-full p-12 border border-dashed rounded-xl flex items-center justify-center text-muted-foreground">
                No market data available. Please check API configuration.
              </div>
            )}
          </div>
        );
      case 'main-chart':
        return (
          <div key={id} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ChartWidget 
              symbol={stocks[0]?.symbol || 'AAPL'}
              title={`${stocks[0]?.symbol || 'AAPL'} Real-time`} 
              color="#10b981"
            />
            <Watchlist 
              stocks={watchlist} 
              onReorder={handleReorderWatchlist}
              onRemove={handleRemoveFromWatchlist}
              onSelect={setActiveSymbol}
            />
          </div>
        );
      case 'historical-analysis':
        return (
          <div key={id} className="grid grid-cols-1 lg:grid-cols-1 gap-6">
            <ErrorBoundary fallbackMessage="Chart widget encountered an error. Click 'Try Again' to reload.">
              <AdvancedChartWidget symbol={activeSymbol} />
            </ErrorBoundary>
          </div>
        );
      case 'secondary-charts':
        return (
          <div key={id} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartWidget 
              symbol={stocks[2]?.symbol || 'NVDA'}
              title={`${stocks[2]?.symbol || 'NVDA'} Performance`} 
              color="#3b82f6"
            />
            <ChartWidget 
              symbol={stocks[1]?.symbol || 'TSLA'}
              title={`${stocks[1]?.symbol || 'TSLA'} Trend`} 
              color="#f59e0b"
            />
          </div>
        );
      case 'watchlist':
        return (
          <Watchlist 
            key={id}
            stocks={watchlist} 
            onReorder={handleReorderWatchlist}
            onRemove={handleRemoveFromWatchlist}
            onSelect={setActiveSymbol}
          />
        );
      case 'importer':
        return <CSVImporter key={id} portfolioId={selectedPortfolioId} />;
      case 'alerts':
        return <AlertSystem key={id} />;
      default:
        return null;
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Home';
      case 'markets': return 'Markets';
      case 'portfolio': return 'Portfolio';
      case 'settings': return 'Settings';
      default: return activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
    }
  };

  const getTabDescription = () => {
    switch (activeTab) {
      case 'dashboard': return 'Latest financial news and market insights.';
      case 'markets': return 'Real-time insights and portfolio analysis.';
      case 'portfolio': return 'Manage your portfolios and track performance.';
      case 'settings': return 'Configure your terminal preferences.';
      default: return '';
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar activeTab={activeTab} onTabSelect={setActiveTab} />
      <main className="flex-1 flex flex-col min-w-0">
        <Header />
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">
                  {getTabTitle()}
                </h2>
                <p className="text-muted-foreground text-sm">{getTabDescription()}</p>
              </div>
              {activeTab === 'markets' && (
                <div className="flex items-center gap-3">
                  <Tabs defaultValue="grid" className="w-[120px]">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="grid"><LayoutGrid className="h-4 w-4" /></TabsTrigger>
                      <TabsTrigger value="list"><List className="h-4 w-4" /></TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <Button className="gap-2 rounded-full px-6" onClick={handleAddToWatchlist}>
                    <Plus className="h-4 w-4" /> Add Stock
                  </Button>
                </div>
              )}
            </div>

            {/* Dashboard Tab — News Homepage */}
            {activeTab === 'dashboard' && (
              <ErrorBoundary fallbackMessage="Intelligence Feed is experiencing issues. Retrying...">
                <NewsFeed />
              </ErrorBoundary>
            )}

            {/* Markets Tab — Previous dashboard widgets */}
            {activeTab === 'markets' && (
              loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                    <p className="text-muted-foreground animate-pulse">Initializing Luminous Terminal...</p>
                  </div>
                </div>
              ) : (
                <DndContext 
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext 
                    items={filteredWidgetOrder}
                    strategy={rectSortingStrategy}
                  >
                    <div className="space-y-8">
                      {filteredWidgetOrder.map((id) => (
                        <DraggableWidget key={id} id={id}>
                          {renderWidget(id)}
                        </DraggableWidget>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )
            )}

            {/* Portfolio Tab */}
            {activeTab === 'portfolio' && (
              loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
                    <p className="text-muted-foreground animate-pulse">Loading portfolios...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  <PortfolioPerformance portfolioId={selectedPortfolioId} />
                  <PortfolioManager onSelect={(id: string) => setSelectedPortfolioId(id)} />
                  <CSVImporter portfolioId={selectedPortfolioId} />
                </div>
              )
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <AlertSystem />
                <div className="p-12 border border-dashed rounded-xl flex items-center justify-center text-muted-foreground">
                  Settings panel — coming soon.
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
