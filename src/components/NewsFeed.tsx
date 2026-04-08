import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, ChevronRight, Newspaper, Activity } from 'lucide-react';
import { TrendingTickers } from './TrendingTickers';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'JUST NOW';
  if (mins < 60) return `${mins}M AGO`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}H AGO`;
  const days = Math.floor(hours / 24);
  return `${days}D AGO`;
}

const safeString = (val: any) => {
  if (typeof val === 'string') return val;
  if (!val) return '';
  if (typeof val === 'object' && val['#text']) return val['#text'];
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
};

function TickerBadge({ ticker }: { ticker: string }) {
  return (
    <Badge
      variant="outline"
      className="text-[10px] h-5 px-1.5 font-bold border-white/5 bg-white/5 cursor-pointer hover:bg-white/10 transition-colors text-muted-foreground hover:text-primary"
    >
      {ticker}
    </Badge>
  );
}

interface NewsItem {
  title: string;
  link: string;
  publisher: string;
  publishedAt: string | null;
  thumbnail: string | null;
  relatedTickers: string[];
  type: string;
  impactTag?: string | null;
  score?: number;
  isPremium?: boolean;
  aiSignificance?: number;
  aiInsight?: string | null;
  aiCategory?: string | null;
  isMajor?: boolean;
}

function SignificanceBadge({ score }: { score?: any }) {
  if (score === undefined || score === null) return null;
  const numericScore = Number(score);
  if (isNaN(numericScore)) return null;

  const isHigh = numericScore >= 8;
  const isMid = numericScore >= 5 && numericScore < 8;
  
  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-tighter",
      isHigh ? "bg-primary/20 text-primary border-primary/30" : 
      isMid ? "bg-amber-500/20 text-amber-500 border-amber-500/30" : 
      "bg-muted text-muted-foreground border-white/5"
    )}>
      <Activity className="h-2.5 w-2.5" />
      <span>{numericScore.toFixed(1)} SIG</span>
    </div>
  );
}

function AIInsight({ insight }: { insight: string | null | undefined }) {
  if (!insight) return null;
  return (
    <div className="mt-3 p-3 rounded-lg bg-primary/[0.03] border border-primary/10 relative overflow-hidden group/insight">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary/40" />
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 p-1 rounded bg-primary/10">
           <Activity className="h-3 w-3 text-primary" />
        </div>
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-primary/60 block mb-1">INTELLIGENCE BRIEF</span>
          <p className="text-[11px] font-bold text-foreground/80 leading-relaxed italic">"{safeString(insight)}"</p>
        </div>
      </div>
    </div>
  );
}

function HeroStory({ article }: { article: NewsItem }) {
  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block aspect-[21/9] overflow-hidden rounded-2xl border border-white/5 bg-card"
    >
      {article.thumbnail ? (
        <img
          src={article.thumbnail}
          alt=""
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-card to-muted">
          <Newspaper className="h-20 w-20 text-muted-foreground/10" />
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-8">
        <div className="mb-4 flex items-center gap-3">
          <SignificanceBadge score={article.aiSignificance} />
          <Badge className="bg-primary text-primary-foreground text-[9px] px-2 h-4 font-black uppercase tracking-widest leading-none">
            {safeString(article.aiCategory) || 'MARKET'}
          </Badge>
          {article.isPremium && (
            <Badge variant="outline" className="text-white/40 border-white/10 text-[9px] px-1.5 h-4 font-black">INSTITUTIONAL</Badge>
          )}
        </div>
        <h2 className="max-w-4xl text-2xl font-black leading-[1.1] tracking-tight text-white transition-colors group-hover:text-primary md:text-4xl">
          {article.title}
        </h2>
        {article.aiInsight && (
           <div className="mt-6 max-w-2xl bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10">
              <p className="text-sm font-bold text-primary/90 leading-relaxed italic">“{article.aiInsight}”</p>
           </div>
        )}
        <div className="mt-6 flex items-center gap-4 text-[11px] font-bold uppercase tracking-widest text-white/50">
          <span className="text-white/80">{safeString(article.publisher)}</span>
          <span className="h-1 w-1 rounded-full bg-white/20" />
          <span className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            {timeAgo(article.publishedAt)}
          </span>
        </div>
      </div>
    </a>
  );
}

function ArticleCard({ article, compact = false }: { article: NewsItem; compact?: boolean }) {
  return (
    <a
      href={article.link}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group relative block transition-all",
        compact ? "py-4 border-b border-white/5 last:border-0" : "h-full p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:shadow-2xl hover:shadow-black/50"
      )}
    >
      <div className={cn("flex gap-5", compact ? "items-center" : "flex-col")}>
        {!compact && article.thumbnail && (
          <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
            <img
              src={article.thumbnail}
              alt=""
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute top-3 right-3 flex flex-col gap-1.5">
               <SignificanceBadge score={article.aiSignificance} />
            </div>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="mb-2 flex items-center gap-2">
            {compact && <SignificanceBadge score={article.aiSignificance} />}
            <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">{safeString(article.aiCategory) || 'Market'}</span>
          </div>
          <h3 className={cn(
            "font-bold leading-tight tracking-tight transition-colors group-hover:text-primary",
            compact ? "text-sm line-clamp-2" : "text-base line-clamp-3"
          )}>
            {article.title}
          </h3>
          
          {!compact && article.aiInsight && <AIInsight insight={article.aiInsight} />}

          <div className={cn(
            "mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground",
            compact ? "opacity-70" : ""
          )}>
            <span className="text-foreground/60">{safeString(article.publisher)}</span>
            <span className="h-0.5 w-0.5 rounded-full bg-white/20" />
            <span>{timeAgo(article.publishedAt)}</span>
          </div>
          {!compact && article.relatedTickers.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {article.relatedTickers.slice(0, 3).map((ticker) => (
                <TickerBadge key={ticker} ticker={ticker} />
              ))}
            </div>
          )}
        </div>
        {compact && article.thumbnail && (
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted border border-white/5">
            <img
              src={article.thumbnail}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        )}
      </div>
    </a>
  );
}

export function NewsFeed() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await axios.get('/api/news');
        if (Array.isArray(res.data)) {
          setNews(res.data);
        }
      } catch (err) {
        console.error('Failed to fetch news:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
    const interval = setInterval(fetchNews, 300000); 
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="aspect-[21/9] rounded-2xl bg-card border border-white/5" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 rounded-xl bg-card border border-white/5" />
          ))}
        </div>
      </div>
    );
  }

  if (news.length === 0) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center space-y-4">
        <Newspaper className="h-16 w-16 text-muted-foreground/10" />
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground/50">Market Silent</p>
      </div>
    );
  }

  const heroStory = news[0];
  const gridArticles = news.slice(1, 10);
  const sidebarArticles = news.slice(10, 20);

  return (
    <div className="space-y-12">
      {/* 1. Cinematic Hero */}
      <AnimatePresence mode="wait">
        <motion.div
          key="hero"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <HeroStory article={heroStory} />
        </motion.div>
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* 2. Primary News Grid */}
        <div className="lg:col-span-8">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
             <div className="flex items-center gap-3">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">Intelligence Feed</h3>
                <div className="px-2 py-0.5 rounded bg-primary/20 text-primary text-[9px] font-black uppercase">AI GRADE ACTIVE</div>
             </div>
             <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
               <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-gain" /> Real-time</span>
               <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-primary" /> Verified</span>
             </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {gridArticles.map((article, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + (i * 0.05) }}
              >
                <ArticleCard article={article} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* 3. Sidebar: High-Signal Feed & Trending */}
        <div className="lg:col-span-4 space-y-12">
          <section>
            <div className="flex items-center gap-2 mb-6">
               <div className="h-px flex-1 bg-white/5" />
               <h3 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground whitespace-nowrap">Global Briefing</h3>
               <div className="h-px flex-1 bg-white/5" />
            </div>
            <div className="space-y-2">
              {sidebarArticles.map((article, i) => (
                <ArticleCard key={i} article={article} compact />
              ))}
            </div>
            <Button variant="ghost" className="w-full mt-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary">
              Full Market Briefing <ChevronRight className="h-3 w-3 ml-2" />
            </Button>
          </section>

          <TrendingTickers />
        </div>
      </div>
    </div>
  );
}
