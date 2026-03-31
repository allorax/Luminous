import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import axios from "axios";
import NodeCache from "node-cache";
import { Resend } from 'resend';
import { parse } from 'csv-parse/sync';
import { PrismaClient } from '@prisma/client';

dotenv.config();

// Fix for Supabase Project URL vs Postgres Connection String
if (process.env.DATABASE_URL?.startsWith('https://')) {
  console.warn("DATABASE_URL appears to be a Supabase Project URL. Swapping with DIRECT_URL if available.");
  if (process.env.DIRECT_URL?.startsWith('postgresql://')) {
    process.env.DATABASE_URL = process.env.DIRECT_URL;
  }
}

console.log("DATABASE_URL:", process.env.DATABASE_URL);
console.log("DIRECT_URL:", process.env.DIRECT_URL);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cache = new NodeCache({ stdTTL: 300 }); // 5 minutes cache
let resend: Resend | null = null;
try {
  if (process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
} catch (e) {
  console.error("Failed to initialize Resend:", e);
}

let prisma: PrismaClient | null = null;
try {
  if (process.env.DATABASE_URL) {
    prisma = new PrismaClient();
  } else {
    console.warn("DATABASE_URL not found. Prisma will be disabled.");
  }
} catch (e) {
  console.error("Failed to initialize PrismaClient:", e);
}

// MOCK_DATA removed for production transition

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const PORT = 3000;

  app.use(express.json());

  // --- Data Service Layer ---
  const FMP_KEY = process.env.FMP_API_KEY;
  const POLYGON_KEY = process.env.POLYGON_API_KEY;
  const YAHOO_HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

  if (!FMP_KEY && !POLYGON_KEY) {
    console.log("ℹ️  No FMP/Polygon keys found. Using Yahoo Finance (free, no auth required).");
  }

  // Helper: fetch Yahoo Finance chart data
  async function fetchYahooChart(symbol: string, range = '1d', interval = '5m') {
    const response = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${range}&interval=${interval}`,
      { headers: YAHOO_HEADERS }
    );
    return response.data.chart.result[0];
  }

  // Real-time quote — Yahoo Finance (free) or Polygon (if key set)
  app.get("/api/quote/:symbol", async (req, res) => {
    const { symbol } = req.params;
    const cacheKey = `quote_${symbol}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
      // Try Polygon first if key exists
      if (POLYGON_KEY) {
        const response = await axios.get(`https://api.polygon.io/v2/last/trade/${symbol}?apiKey=${POLYGON_KEY}`);
        const data = response.data.results;
        cache.set(cacheKey, data, 60);
        return res.json(data);
      }
      // Fallback: Yahoo Finance (free)
      const ydata = await fetchYahooChart(symbol, '1d', '1m');
      const meta = ydata.meta;
      const result = {
        p: meta.regularMarketPrice,
        s: meta.regularMarketVolume,
        t: meta.regularMarketTime * 1000,
        previousClose: meta.chartPreviousClose,
        dayHigh: meta.regularMarketDayHigh,
        dayLow: meta.regularMarketDayLow
      };
      cache.set(cacheKey, result, 30); // 30s cache for quotes
      res.json(result);
    } catch (error: any) {
      console.error(`Quote error for ${symbol}:`, error.message);
      res.status(502).json({ error: "Failed to fetch quote" });
    }
  });

  // Company profile — Yahoo Finance (free) or FMP (if key set)
  app.get("/api/profile/:symbol", async (req, res) => {
    const { symbol } = req.params;
    const cacheKey = `profile_${symbol}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
      // Try FMP first if key exists
      if (FMP_KEY) {
        const response = await axios.get(`https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${FMP_KEY}`);
        const data = response.data[0];
        if (data) {
          cache.set(cacheKey, data, 3600);
          return res.json(data);
        }
      }
      // Fallback: Yahoo Finance (free)
      const ydata = await fetchYahooChart(symbol, '1mo', '1d');
      const meta = ydata.meta;
      const profile = {
        symbol: meta.symbol,
        price: meta.regularMarketPrice,
        companyName: meta.longName || meta.shortName || symbol,
        changes: meta.regularMarketPrice - meta.chartPreviousClose,
        changesPercentage: ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose * 100),
        currency: meta.currency,
        exchangeShortName: meta.exchangeName,
        fullExchangeName: meta.fullExchangeName,
        mktCap: 0, // Yahoo chart API doesn't provide market cap
        volAvg: meta.regularMarketVolume,
        range: `${meta.fiftyTwoWeekLow}-${meta.fiftyTwoWeekHigh}`,
        beta: 0,
        lastDiv: 0,
        description: `${meta.longName || symbol} — traded on ${meta.fullExchangeName}`,
        industry: "N/A",
        sector: "N/A",
        ceo: "N/A",
        website: ""
      };
      cache.set(cacheKey, profile, 3600);
      res.json(profile);
    } catch (error: any) {
      console.error(`Profile error for ${symbol}:`, error.message);
      res.status(502).json({ error: "Failed to fetch profile" });
    }
  });

  // Historical OHLCV data — Yahoo Finance (free) or Polygon (if key set)
  app.get("/api/historical/:symbol", async (req, res) => {
    const { symbol } = req.params;
    const { multiplier = 1, timespan = 'day', from, to } = req.query;
    const cacheKey = `hist_${symbol}_${timespan}_${from}_${to}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
      // Try Polygon first if key exists
      if (POLYGON_KEY) {
        const response = await axios.get(
          `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${from}/${to}?apiKey=${POLYGON_KEY}`
        );
        if (response.data.results) {
          cache.set(cacheKey, response.data.results, 3600);
          return res.json(response.data.results);
        }
      }
      // Fallback: Yahoo Finance (free)
      // Map timespan to Yahoo range/interval
      let range = '1mo', interval = '1d';
      if (timespan === 'minute') { range = '1d'; interval = '5m'; }
      else if (timespan === 'hour') { range = '5d'; interval = '1h'; }
      else if (timespan === 'day') {
        // Calculate approximate range from from/to dates
        if (from && to) {
          const diffMs = new Date(to as string).getTime() - new Date(from as string).getTime();
          const diffDays = diffMs / (1000 * 60 * 60 * 24);
          if (diffDays <= 7) range = '5d';
          else if (diffDays <= 30) range = '1mo';
          else if (diffDays <= 90) range = '3mo';
          else if (diffDays <= 365) range = '1y';
          else range = '5y';
        }
        interval = '1d';
      }
      else if (timespan === 'week') { range = '5y'; interval = '1wk'; }

      const ydata = await fetchYahooChart(symbol, range, interval);
      const timestamps = ydata.timestamp;
      const quotes = ydata.indicators.quote[0];

      // Transform to Polygon-compatible format (t, o, h, l, c, v)
      const results = timestamps.map((t: number, i: number) => ({
        t: t * 1000, // Yahoo uses seconds, convert to ms
        o: quotes.open[i],
        h: quotes.high[i],
        l: quotes.low[i],
        c: quotes.close[i],
        v: quotes.volume[i]
      })).filter((d: any) => d.o !== null && d.c !== null); // Filter out null entries

      cache.set(cacheKey, results, 3600);
      res.json(results);
    } catch (error: any) {
      console.error(`Historical error for ${symbol}:`, error.message);
      res.status(502).json({ error: "Failed to fetch historical data" });
    }
  });

  // News — FMP (if key set), otherwise empty array
  app.get("/api/news/:symbol", async (req, res) => {
    const { symbol } = req.params;
    const cacheKey = `news_${symbol}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
      if (FMP_KEY) {
        const response = await axios.get(`https://financialmodelingprep.com/api/v3/stock_news?tickers=${symbol}&limit=10&apikey=${FMP_KEY}`);
        cache.set(cacheKey, response.data, 1800);
        return res.json(response.data);
      }
      res.json([]); // No free news source without auth
    } catch (error) {
      res.json([]);
    }
  });

  // Market Status — derived from Yahoo Finance trading periods
  app.get("/api/market/status", async (req, res) => {
    const cacheKey = "market_status";
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
      if (POLYGON_KEY) {
        const response = await axios.get(`https://api.polygon.io/v1/marketstatus/now?apiKey=${POLYGON_KEY}`);
        cache.set(cacheKey, response.data, 60);
        return res.json(response.data);
      }
      // Fallback: derive from Yahoo Finance
      const ydata = await fetchYahooChart('AAPL', '1d', '1m');
      const tradingPeriod = ydata.meta.currentTradingPeriod;
      const now = Math.floor(Date.now() / 1000);
      const isOpen = now >= tradingPeriod.regular.start && now <= tradingPeriod.regular.end;
      const status = {
        market: isOpen ? "open" : "closed",
        serverTime: new Date().toISOString(),
        exchanges: { nyse: isOpen ? "open" : "closed", nasdaq: isOpen ? "open" : "closed" }
      };
      cache.set(cacheKey, status, 60);
      res.json(status);
    } catch (error: any) {
      res.json({ market: "unknown", serverTime: new Date().toISOString() });
    }
  });

  // Market Movers — fetch individual quotes via Yahoo Finance
  async function fetchYahooMovers(type: 'gainers' | 'losers' | 'actives') {
    const symbols = ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'GOOGL', 'META', 'AMD', 'INTC', 'NFLX'];
    const results = await Promise.allSettled(
      symbols.map(async (sym) => {
        const data = await fetchYahooChart(sym, '1d', '1d');
        const meta = data.meta;
        const change = meta.regularMarketPrice - meta.chartPreviousClose;
        const changePct = (change / meta.chartPreviousClose) * 100;
        return {
          symbol: sym,
          name: meta.longName || meta.shortName || sym,
          price: meta.regularMarketPrice,
          change: parseFloat(change.toFixed(2)),
          changesPercentage: parseFloat(changePct.toFixed(2))
        };
      })
    );
    const fulfilled = results
      .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
      .map(r => r.value);

    if (type === 'gainers') return fulfilled.sort((a, b) => b.changesPercentage - a.changesPercentage);
    if (type === 'losers') return fulfilled.sort((a, b) => a.changesPercentage - b.changesPercentage);
    return fulfilled; // actives
  }

  app.get("/api/market/gainers", async (req, res) => {
    const cacheKey = "market_gainers";
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
      if (FMP_KEY) {
        const response = await axios.get(`https://financialmodelingprep.com/api/v3/stock_market/gainers?apikey=${FMP_KEY}`);
        cache.set(cacheKey, response.data, 300);
        return res.json(response.data);
      }
      const data = await fetchYahooMovers('gainers');
      cache.set(cacheKey, data, 300);
      res.json(data);
    } catch (error: any) {
      console.error("Gainers error:", error.message);
      res.status(502).json({ error: "Failed to fetch gainers" });
    }
  });

  app.get("/api/market/losers", async (req, res) => {
    const cacheKey = "market_losers";
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
      if (FMP_KEY) {
        const response = await axios.get(`https://financialmodelingprep.com/api/v3/stock_market/losers?apikey=${FMP_KEY}`);
        cache.set(cacheKey, response.data, 300);
        return res.json(response.data);
      }
      const data = await fetchYahooMovers('losers');
      cache.set(cacheKey, data, 300);
      res.json(data);
    } catch (error: any) {
      console.error("Losers error:", error.message);
      res.status(502).json({ error: "Failed to fetch losers" });
    }
  });

  app.get("/api/market/actives", async (req, res) => {
    const cacheKey = "market_actives";
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
      if (FMP_KEY) {
        const response = await axios.get(`https://financialmodelingprep.com/api/v3/stock_market/actives?apikey=${FMP_KEY}`);
        cache.set(cacheKey, response.data.slice(0, 10), 300);
        return res.json(response.data.slice(0, 10));
      }
      const data = await fetchYahooMovers('actives');
      cache.set(cacheKey, data, 300);
      res.json(data);
    } catch (error: any) {
      console.error("Actives error:", error.message);
      res.status(502).json({ error: "Failed to fetch actives" });
    }
  });

  // Symbol Search — Yahoo Finance autocomplete (free) or FMP (if key set)
  app.get("/api/search", async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);
    const cacheKey = `search_${q}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
      if (FMP_KEY) {
        const response = await axios.get(`https://financialmodelingprep.com/api/v3/search?query=${q}&limit=10&apikey=${FMP_KEY}`);
        cache.set(cacheKey, response.data, 3600);
        return res.json(response.data);
      }
      // Fallback: Yahoo Finance autocomplete (free)
      const response = await axios.get(
        `https://query1.finance.yahoo.com/v1/finance/search?q=${q}&quotesCount=10&newsCount=0`,
        { headers: YAHOO_HEADERS }
      );
      const results = (response.data.quotes || []).map((item: any) => ({
        symbol: item.symbol,
        name: item.longname || item.shortname || item.symbol,
        stockExchange: item.exchDisp || item.exchange,
        type: item.quoteType
      }));
      cache.set(cacheKey, results, 3600);
      res.json(results);
    } catch (error: any) {
      console.error("Search error:", error.message);
      res.json([]);
    }
  });

  // Major Indices (FMP)

  // Major Global Indices — Yahoo Finance (free)
  app.get("/api/market/indices", async (req, res) => {
    const cacheKey = "market_indices";
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
      const indexSymbols = [
        { ySymbol: '^GSPC', name: 'S&P 500 Index' },
        { ySymbol: '^DJI', name: 'Dow Jones Industrial Average' },
        { ySymbol: '^IXIC', name: 'NASDAQ Composite Index' },
        { ySymbol: '^FTSE', name: 'FTSE 100 Index' }
      ];

      const results = await Promise.allSettled(
        indexSymbols.map(async (idx) => {
          const data = await fetchYahooChart(idx.ySymbol, '1d', '1d');
          const meta = data.meta;
          const change = meta.regularMarketPrice - meta.chartPreviousClose;
          const changePct = (change / meta.chartPreviousClose) * 100;
          return {
            symbol: idx.ySymbol,
            name: idx.name,
            price: meta.regularMarketPrice,
            change: parseFloat(change.toFixed(2)),
            changesPercentage: parseFloat(changePct.toFixed(2))
          };
        })
      );

      const fulfilled = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map(r => r.value);

      cache.set(cacheKey, fulfilled, 120); // 2 min cache
      res.json(fulfilled);
    } catch (error: any) {
      console.error("Indices error:", error.message);
      res.json([]);
    }
  });

  // Portfolios API
  app.get("/api/portfolios", async (req, res) => {
    if (!prisma) {
      console.warn("Prisma disabled - returning empty portfolios");
      return res.json([]);
    }
    try {
      const portfolios = await prisma.portfolio.findMany({
        where: { userId: 'default-user' },
        include: { holdings: true }
      });
      res.json(portfolios);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch portfolios" });
    }
  });

  app.post("/api/portfolios", async (req, res) => {
    const { name } = req.body;
    try {
      if (!prisma) return res.status(500).json({ error: "Prisma not initialized" });
      const portfolio = await prisma.portfolio.create({
        data: { name, userId: 'default-user' }
      });
      res.json(portfolio);
    } catch (error) {
      res.status(500).json({ error: "Failed to create portfolio" });
    }
  });

  app.delete("/api/portfolios/:id", async (req, res) => {
    const { id } = req.params;
    try {
      if (!prisma) return res.status(500).json({ error: "Prisma not initialized" });
      await prisma.holding.deleteMany({ where: { portfolioId: id } });
      await prisma.portfolio.delete({ where: { id } });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete portfolio" });
    }
  });

  app.post("/api/portfolios/:id/holdings", async (req, res) => {
    const { id } = req.params;
    const { symbol, quantity, avgPrice } = req.body;
    try {
      if (!prisma) return res.status(500).json({ error: "Prisma not initialized" });
      const holding = await prisma.holding.create({
        data: { symbol, quantity: parseFloat(quantity), avgPrice: parseFloat(avgPrice), portfolioId: id }
      });
      res.json(holding);
    } catch (error) {
      res.status(500).json({ error: "Failed to add holding" });
    }
  });

  // Portfolio CSV Importer
  app.post("/api/portfolio/import", express.text(), async (req, res) => {
    const portfolioId = req.query.portfolioId as string;
    if (!portfolioId) return res.status(400).json({ error: "portfolioId is required" });

    try {
      const records = parse(req.body, {
        columns: true,
        skip_empty_lines: true
      });
      
      // Save to Prisma
      if (prisma) {
        const holdingData = records.map((r: any) => ({
          symbol: r.symbol,
          quantity: parseFloat(r.quantity),
          avgPrice: parseFloat(r.avgPrice),
          portfolioId: portfolioId
        }));

        await prisma.holding.createMany({ data: holdingData });
      } else {
        console.warn("Prisma not initialized, skipping database save.");
      }
      
      res.json({ success: true, count: records.length, data: records });
    } catch (error) {
      res.status(400).json({ error: "Invalid CSV format or database error" });
    }
  });

  // Transactions API
  app.get("/api/transactions", async (req, res) => {
    try {
      if (!prisma) return res.status(500).json({ error: "Prisma not initialized" });
      const transactions = await prisma.transaction.findMany({
        where: { userId: 'default-user' },
        orderBy: { date: 'desc' }
      });
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    const { symbol, type, quantity, price, portfolioId } = req.body;
    try {
      if (!prisma) return res.status(500).json({ error: "Prisma not initialized" });
      const transaction = await prisma.transaction.create({
        data: { 
          symbol, 
          type, 
          quantity: parseFloat(quantity), 
          price: parseFloat(price), 
          portfolioId, 
          userId: 'default-user' 
        }
      });
      
      // Also update or create holding
      const existingHolding = await prisma.holding.findFirst({
        where: { portfolioId, symbol }
      });

      if (existingHolding) {
        let newQuantity = existingHolding.quantity;
        let newAvgPrice = existingHolding.avgPrice;

        if (type === 'BUY') {
          const totalCost = (existingHolding.quantity * existingHolding.avgPrice) + (quantity * price);
          newQuantity += quantity;
          newAvgPrice = totalCost / newQuantity;
        } else {
          newQuantity -= quantity;
        }

        if (newQuantity <= 0) {
          await prisma.holding.delete({ where: { id: existingHolding.id } });
        } else {
          await prisma.holding.update({
            where: { id: existingHolding.id },
            data: { quantity: newQuantity, avgPrice: newAvgPrice }
          });
        }
      } else if (type === 'BUY') {
        await prisma.holding.create({
          data: { symbol, quantity, avgPrice: price, portfolioId }
        });
      }

      res.json(transaction);
    } catch (error) {
      res.status(500).json({ error: "Failed to record transaction" });
    }
  });

  // Alerts System
  app.post("/api/alerts", async (req, res) => {
    const { symbol, price, type, email } = req.body;
    try {
      if (prisma) {
        await prisma.alert.create({ 
          data: { symbol, price, type, email } 
        });
      } else {
        console.warn("Prisma not initialized, skipping alert database save.");
      }
      
      // Trigger email via Resend (Example)
      if (resend) {
        await resend.emails.send({
          from: 'alerts@yourdomain.com',
          to: email,
          subject: `Alert Set: ${symbol}`,
          text: `We will notify you when ${symbol} hits ${price}.`
        });
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to set alert" });
    }
  });

  // --- WebSocket Server for Real-time Updates ---
  const wss = new WebSocketServer({ noServer: true });
  
  // Track subscriptions: Map<WebSocket, Set<string>>
  const subscriptions = new Map();

  const broadcastPriceUpdates = async () => {
    // Get all unique symbols across all clients
    const allSymbols = new Set<string>();
    subscriptions.forEach(subs => {
      subs.forEach((sym: string) => allSymbols.add(sym));
    });

    if (allSymbols.size === 0) return;

    let quotes: any[] = [];

    if (FMP_KEY) {
      try {
        const symbolsStr = Array.from(allSymbols).join(',');
        const response = await axios.get(`https://financialmodelingprep.com/api/v3/quote/${symbolsStr}?apikey=${FMP_KEY}`);
        quotes = response.data;
      } catch (error: any) {
        console.error("FMP API broadcast error:", error.message);
      }
    }

    // Fallback: Yahoo Finance (free, no auth)
    if (!Array.isArray(quotes) || quotes.length === 0) {
      const results = await Promise.allSettled(
        Array.from(allSymbols).map(async (symbol) => {
          const data = await fetchYahooChart(symbol, '1d', '1m');
          const meta = data.meta;
          const change = meta.regularMarketPrice - meta.chartPreviousClose;
          const changePct = (change / meta.chartPreviousClose) * 100;
          return {
            symbol,
            price: meta.regularMarketPrice,
            change: parseFloat(change.toFixed(2)),
            changesPercentage: parseFloat(changePct.toFixed(2))
          };
        })
      );
      quotes = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map(r => r.value);
    }

    if (Array.isArray(quotes)) {
      quotes.forEach(quote => {
        const update = {
          type: "T",
          sym: quote.symbol,
          p: quote.price,
          t: Date.now(),
          change: quote.change,
          changePercent: quote.changesPercentage
        };
        
        subscriptions.forEach((subs, client) => {
          if (client.readyState === 1 && subs.has(quote.symbol)) {
            client.send(JSON.stringify(update));
          }
        });
      });
    }
  };

  // Run broadcast every 5 seconds (rate-limit safe for Yahoo Finance)
  const broadcastInterval = setInterval(broadcastPriceUpdates, 5000);

  wss.on("connection", (ws) => {
    console.log("Client connected to WebSocket");
    subscriptions.set(ws, new Set());

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === 'SUBSCRIBE') {
          const subs = subscriptions.get(ws);
          if (subs) {
            data.symbols.forEach((s: string) => subs.add(s));
            console.log(`Client subscribed to: ${data.symbols}`);
          }
        } else if (data.type === 'UNSUBSCRIBE') {
          const subs = subscriptions.get(ws);
          if (subs) {
            data.symbols.forEach((s: string) => subs.delete(s));
            console.log(`Client unsubscribed from: ${data.symbols}`);
          }
        }
      } catch (e) {
        console.error("Failed to parse WS message:", e);
      }
    });
    
    ws.on("close", () => {
      console.log("Client disconnected");
      subscriptions.delete(ws);
    });
  });

  httpServer.on("upgrade", (request, socket, head) => {
    if (request.url === "/ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  // --- Vite Middleware ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
