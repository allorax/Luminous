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
      const timer = setTimeout(() => setFlash(null), 800);
      return () => clearTimeout(timer);
    } else if (currentPrice < prevPrice.current) {
      setFlash('down');
      const timer = setTimeout(() => setFlash(null), 800);
      return () => clearTimeout(timer);
    }
    prevPrice.current = currentPrice;
  }, [currentPrice]);

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 10 }}
    >
      <Card 
        className={cn(
          "hover:shadow-2xl transition-all duration-500 relative overflow-hidden cursor-pointer border-white/5 bg-background/40 backdrop-blur-md",
          flash === 'up' && "ring-1 ring-gain/50 bg-gain/5",
          flash === 'down' && "ring-1 ring-loss/50 bg-loss/5"
        )}
        onClick={() => onSelect?.(stock.symbol)}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-bold tracking-widest text-muted-foreground uppercase">{stock.symbol}</CardTitle>
          <div className={cn(
            "p-1.5 rounded-full",
            currentChange >= 0 ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss"
          )}>
            {currentChange >= 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-black tracking-tighter flex items-center gap-2">
            <AnimatePresence mode="wait">
              <motion.span
                key={currentPrice}
                initial={{ opacity: 0, y: flash === 'up' ? 10 : -10, filter: 'blur(4px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: flash === 'up' ? -10 : 10, filter: 'blur(4px)' }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className={cn(
                  "tabular-nums",
                  flash === 'up' && "text-gain",
                  flash === 'down' && "text-loss"
                )}
              >
                ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </motion.span>
            </AnimatePresence>
          </div>
          
          <div className="flex items-center gap-2 mt-1">
            <p className={cn(
              "text-[10px] font-bold px-1.5 py-0.5 rounded",
              currentChange >= 0 ? "bg-gain/20 text-gain" : "bg-loss/20 text-loss"
            )}>
              {currentChange >= 0 ? "+" : ""}{currentChange.toFixed(2)} ({currentChangePercent.toFixed(2)}%)
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
            <div className="flex flex-col">
              <span className="opacity-50 text-[8px]">Volume</span>
              <span>{stock.volume}</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="opacity-50 text-[8px]">Mkt Cap</span>
              <span>{stock.marketCap}</span>
            </div>
          </div>
        </CardContent>
        
        <AnimatePresence>
          {flash && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                "absolute inset-0 pointer-events-none bg-gradient-to-br opacity-5",
                flash === 'up' ? "from-gain to-transparent" : "from-loss to-transparent"
              )}
            />
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
