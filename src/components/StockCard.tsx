import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Stock } from '@/types';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTicker } from '@/lib/hooks/useTicker';

interface StockCardProps {
  stock: Stock;
  onSelect?: (symbol: string) => void;
}

export function StockCard({ stock, onSelect }: StockCardProps) {
  const isPositive = stock.change >= 0;
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const prevPrice = useRef(stock.price);
  const ticker = useTicker(stock.symbol);
  
  const currentPrice = ticker?.price ?? stock.price;
  const currentChange = ticker?.change ?? stock.change;
  const currentChangePercent = ticker?.changePercent ?? stock.changePercent;

  useEffect(() => {
    if (currentPrice > prevPrice.current) {
      setFlash('up');
      const timer = setTimeout(() => setFlash(null), 1000);
      return () => clearTimeout(timer);
    } else if (currentPrice < prevPrice.current) {
      setFlash('down');
      const timer = setTimeout(() => setFlash(null), 1000);
      return () => clearTimeout(timer);
    }
    prevPrice.current = currentPrice;
  }, [currentPrice]);

  return (
    <Card 
      className={cn(
        "hover:shadow-lg transition-all duration-500 relative overflow-hidden cursor-pointer",
        flash === 'up' && "ring-2 ring-gain/50 bg-gain/5",
        flash === 'down' && "ring-2 ring-loss/50 bg-loss/5"
      )}
      onClick={() => onSelect?.(stock.symbol)}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{stock.symbol}</CardTitle>
        {isPositive ? (
          <TrendingUp className="h-4 w-4 text-gain" />
        ) : (
          <TrendingDown className="h-4 w-4 text-loss" />
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold flex items-baseline gap-2">
          <motion.span
            key={currentPrice}
            initial={{ opacity: 0.5, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </motion.span>
        </div>
        <p className={cn(
          "text-xs font-semibold mt-1 flex items-center gap-1",
          currentChange >= 0 ? "text-gain" : "text-loss"
        )}>
          {currentChange >= 0 ? "+" : ""}{currentChange.toFixed(2)} ({currentChangePercent.toFixed(2)}%)
        </p>
        <div className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground uppercase tracking-wider">
          <span>Vol: {stock.volume}</span>
          <span>Cap: {stock.marketCap}</span>
        </div>
      </CardContent>
      
      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.1, scale: 1.2 }}
            exit={{ opacity: 0 }}
            className={cn(
              "absolute inset-0 pointer-events-none",
              flash === 'up' ? "bg-gain" : "bg-loss"
            )}
          />
        )}
      </AnimatePresence>
    </Card>
  );
}
