import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Briefcase } from 'lucide-react';

interface Portfolio {
  id: string;
  name: string;
  holdings: any[];
}

interface PortfolioManagerProps {
  onSelect: (portfolioId: string) => void;
}

export function PortfolioManager({ onSelect }: PortfolioManagerProps) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [selectedId, setSelectedId] = useState<string>('');

  const fetchPortfolios = async () => {
    try {
      const res = await axios.get('/api/portfolios');
      setPortfolios(res.data);
      if (res.data.length > 0 && !selectedId) {
        setSelectedId(res.data[0].id);
        onSelect(res.data[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch portfolios", err);
    }
  };

  useEffect(() => {
    fetchPortfolios();
  }, []);

  const handleCreate = async () => {
    if (!newPortfolioName) return;
    try {
      const res = await axios.post('/api/portfolios', { name: newPortfolioName });
      setPortfolios([...portfolios, res.data]);
      setNewPortfolioName('');
      setSelectedId(res.data.id);
      onSelect(res.data.id);
    } catch (err) {
      console.error("Failed to create portfolio", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`/api/portfolios/${id}`);
      setPortfolios(portfolios.filter(p => p.id !== id));
      if (selectedId === id) {
        setSelectedId('');
      }
    } catch (err) {
      console.error("Failed to delete portfolio", err);
    }
  };

  return (
    <Card className="bg-card/50 backdrop-blur-xl border-primary/10">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Portfolios</CardTitle>
        <Briefcase className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input 
            placeholder="New Portfolio Name" 
            value={newPortfolioName}
            onChange={(e) => setNewPortfolioName(e.target.value)}
            className="bg-background/50 border-primary/20"
          />
          <Button size="icon" onClick={handleCreate} disabled={!newPortfolioName}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="space-y-2">
          {portfolios.map(p => (
            <div key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-background/50 border border-transparent hover:border-primary/20 transition-all cursor-pointer" onClick={() => { setSelectedId(p.id); onSelect(p.id); }}>
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${selectedId === p.id ? 'bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)]' : 'bg-muted'}`} />
                <span className="text-sm font-medium">{p.name}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
