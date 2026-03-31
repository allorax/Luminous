import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { useTicker } from '@/lib/hooks/useTicker';
import { ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface Holding {
  id: string;
  symbol: string;
  quantity: number;
  avgPrice: number;
}

function HoldingRow({ holding }: { holding: Holding }) {
  const ticker = useTicker(holding.symbol);
  const currentPrice = ticker?.price || holding.avgPrice;
  const marketValue = holding.quantity * currentPrice;
  const gain = marketValue - (holding.quantity * holding.avgPrice);
  const gainPercent = (gain / (holding.quantity * holding.avgPrice)) * 100;

  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-background/30 border border-primary/5 hover:border-primary/20 transition-all">
      <div>
        <div className="text-sm font-bold">{holding.symbol}</div>
        <div className="text-xs text-muted-foreground">{holding.quantity} shares @ ${holding.avgPrice.toFixed(2)}</div>
      </div>
      <div className="text-right">
        <div className="text-sm font-medium">${marketValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        <div className={`text-xs flex items-center justify-end gap-1 ${gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          {gain >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
          {Math.abs(gainPercent).toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

interface PortfolioPerformanceProps {
  portfolioId: string;
}

export function PortfolioPerformance({ portfolioId }: PortfolioPerformanceProps) {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [totalCost, setTotalCost] = useState(0);

  useEffect(() => {
    if (!portfolioId) return;
    const fetchHoldings = async () => {
      try {
        const res = await axios.get('/api/portfolios');
        const portfolio = res.data.find((p: any) => p.id === portfolioId);
        if (portfolio) {
          setHoldings(portfolio.holdings);
          const cost = portfolio.holdings.reduce((acc: number, h: Holding) => acc + (h.quantity * h.avgPrice), 0);
          setTotalCost(cost);
        }
      } catch (err) {
        console.error("Failed to fetch holdings", err);
      }
    };
    fetchHoldings();
    const interval = setInterval(fetchHoldings, 10000); // Poll every 10s for structural changes
    return () => clearInterval(interval);
  }, [portfolioId]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="md:col-span-1 bg-card/50 backdrop-blur-xl border-primary/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-black italic tracking-tighter">
            ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span>Buying Power</span>
              <span className="font-mono">$24,500.00</span>
            </div>
            <Progress value={65} className="h-1 bg-primary/10" />
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 bg-background/50 backdrop-blur-xl border-primary/10">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium uppercase tracking-wider">Live Holdings</CardTitle>
          <Activity className="h-4 w-4 text-primary animate-pulse" />
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {holdings.map(h => (
            <HoldingRow key={h.id} holding={h} />
          ))}
          {holdings.length === 0 && (
            <div className="col-span-2 text-center py-10 text-muted-foreground text-sm italic">
              No holdings found. Import a CSV or add stocks to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
