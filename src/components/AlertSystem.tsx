import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bell, CheckCircle2 } from 'lucide-react';

export function AlertSystem() {
  const [symbol, setSymbol] = useState('');
  const [price, setPrice] = useState('');
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSetAlert = async () => {
    if (!symbol || !price || !email) return;
    
    try {
      const response = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, price: parseFloat(price), type: 'price', email })
      });
      
      const data = await response.json();
      if (data.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        setSymbol('');
        setPrice('');
      }
    } catch (error) {
      console.error("Failed to set alert");
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Price Alerts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Input 
            placeholder="Symbol (e.g. AAPL)" 
            value={symbol} 
            onChange={(e) => setSymbol(e.target.value.toUpperCase())} 
            className="text-xs"
          />
          <Input 
            placeholder="Price" 
            type="number" 
            value={price} 
            onChange={(e) => setPrice(e.target.value)} 
            className="text-xs"
          />
        </div>
        <Input 
          placeholder="Email for notification" 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          className="text-xs"
        />
        <Button size="sm" className="w-full" onClick={handleSetAlert} disabled={!symbol || !price || !email}>
          <Bell className="h-4 w-4 mr-2" /> Set Alert
        </Button>
        
        {success && (
          <div className="flex items-center gap-2 text-xs text-gain bg-gain/10 p-2 rounded-md">
            <CheckCircle2 className="h-4 w-4" /> Alert set successfully!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
