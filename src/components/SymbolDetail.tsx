import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface SymbolDetailProps {
  symbol: string;
}

export function SymbolDetail({ symbol }: SymbolDetailProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!symbol) return;
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`/api/profile/${symbol}`);
        setProfile(res.data);
      } catch (err) {
        console.error("Failed to fetch profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [symbol]);

  if (loading) return (
    <Card className="bg-card/50 backdrop-blur-xl border-primary/10">
      <CardHeader><Skeleton className="h-4 w-32" /></CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </CardContent>
    </Card>
  );

  if (!profile) return null;

  return (
    <Card className="bg-card/50 backdrop-blur-xl border-primary/10 overflow-hidden">
      <div className="h-1 bg-primary/20 w-full" />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-black italic">{profile.symbol}</CardTitle>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{profile.companyName}</p>
          </div>
          <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
            {profile.exchangeShortName}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 rounded-xl bg-background/50 border border-primary/5">
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Market Cap</div>
            <div className="text-lg font-bold">
              ${(profile.mktCap / 1000000000).toFixed(2)}B
            </div>
          </div>
          <div className="p-3 rounded-xl bg-background/50 border border-primary/5">
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">P/E Ratio</div>
            <div className="text-lg font-bold">{profile.pe?.toFixed(2) || 'N/A'}</div>
          </div>
          <div className="p-3 rounded-xl bg-background/50 border border-primary/5">
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Beta</div>
            <div className="text-lg font-bold">{profile.beta?.toFixed(2) || 'N/A'}</div>
          </div>
          <div className="p-3 rounded-xl bg-background/50 border border-primary/5">
            <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Avg Vol</div>
            <div className="text-lg font-bold">{(profile.volAvg / 1000000).toFixed(1)}M</div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">About Company</h4>
          <p className="text-xs leading-relaxed text-muted-foreground line-clamp-4 hover:line-clamp-none transition-all cursor-pointer">
            {profile.description}
          </p>
        </div>

        <div className="flex gap-2 border-t border-white/5 pt-4">
          {profile.website && (
            <a href={profile.website} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-primary hover:underline">
              Official Website
            </a>
          )}
          <span className="text-[10px] text-muted-foreground">•</span>
          <span className="text-[10px] text-muted-foreground font-medium">{profile.industry}</span>
        </div>
      </CardContent>
    </Card>
  );
}
