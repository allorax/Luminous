import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Stock } from '@/types';
import { cn } from '@/lib/utils';
import { Reorder, motion, AnimatePresence } from 'motion/react';
import { X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTicker } from '@/lib/hooks/useTicker';

interface WatchlistItemProps {
  stock: Stock;
  onRemove: (symbol: string) => void;
  onSelect?: (symbol: string) => void;
}

function WatchlistItem({ stock, onRemove, onSelect }: WatchlistItemProps) {
  const ticker = useTicker(stock.symbol);
  const currentPrice = ticker?.price ?? stock.price;
  const currentChangePercent = ticker?.changePercent ?? stock.changePercent;
  const isPositive = currentChangePercent >= 0;
  
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const prevPrice = useRef(currentPrice);

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
    <Reorder.Item
      value={stock}
      className={cn(
        "flex items-center gap-3 p-4 hover:bg-muted/50 transition-all duration-500 group bg-card cursor-pointer relative overflow-hidden",
        flash === 'up' && "bg-gain/5",
        flash === 'down' && "bg-loss/5"
      )}
      onClick={() => onSelect?.(stock.symbol)}
    >
      <div className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors z-10">
        <GripVertical className="h-4 w-4" />
      </div>
      
      <div className="flex-1 flex items-center justify-between min-w-0 z-10">
        <div className="min-w-0">
          <div className="font-bold text-sm truncate">{stock.symbol}</div>
          <div className="text-xs text-muted-foreground truncate">{stock.name}</div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <motion.div 
              key={currentPrice}
              initial={{ scale: 1.1, opacity: 0.5 }}
              animate={{ scale: 1, opacity: 1 }}
              className="font-semibold text-sm"
            >
              ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </motion.div>
            <div className={cn(
              "text-[10px] font-bold",
              isPositive ? "text-gain" : "text-loss"
            )}>
              {isPositive ? "+" : ""}{currentChangePercent.toFixed(2)}%
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(stock.symbol);
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {flash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "absolute inset-0 pointer-events-none",
              flash === 'up' ? "bg-gain" : "bg-loss"
            )}
          />
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}

interface WatchlistProps {
  stocks: Stock[];
  onReorder: (newOrder: Stock[]) => void;
  onRemove: (symbol: string) => void;
  onSelect?: (symbol: string) => void;
}

export function Watchlist({ stocks, onReorder, onRemove, onSelect }: WatchlistProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">Watchlist</CardTitle>
        <div className="text-xs text-muted-foreground">{stocks.length} items</div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[400px]">
          <Reorder.Group 
            axis="y" 
            values={stocks} 
            onReorder={onReorder}
            className="divide-y divide-border"
          >
            {stocks.map((stock) => (
              <WatchlistItem 
                key={stock.symbol} 
                stock={stock} 
                onRemove={onRemove} 
                onSelect={onSelect} 
              />
            ))}
          </Reorder.Group>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
