import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Stock } from '@/types';
import { cn } from '@/lib/utils';
import { Reorder, useDragControls } from 'motion/react';
import { X, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
              <Reorder.Item
                key={stock.symbol}
                value={stock}
                className="flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors group bg-card cursor-pointer"
                onClick={() => onSelect?.(stock.symbol)}
              >
                <div className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                  <GripVertical className="h-4 w-4" />
                </div>
                
                <div className="flex-1 flex items-center justify-between min-w-0">
                  <div className="min-w-0">
                    <div className="font-bold text-sm truncate">{stock.symbol}</div>
                    <div className="text-xs text-muted-foreground truncate">{stock.name}</div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-semibold text-sm">${stock.price.toLocaleString()}</div>
                      <div className={cn(
                        "text-[10px] font-bold",
                        stock.change >= 0 ? "text-gain" : "text-loss"
                      )}>
                        {stock.change >= 0 ? "+" : ""}{stock.changePercent.toFixed(2)}%
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
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
