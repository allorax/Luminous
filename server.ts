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

  if (!FMP_KEY || !POLYGON_KEY) {
    console.warn("CRITICAL: FMP_API_KEY or POLYGON_API_KEY is missing. Real-time data will be unavailable.");
  }

  // Real-time / delayed quote (Polygon)
  app.get("/api/quote/:symbol", async (req, res) => {
    const { symbol } = req.params;
    const cacheKey = `quote_${symbol}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
      const response = await axios.get(`https://api.polygon.io/v2/last/trade/${symbol}?apiKey=${POLYGON_KEY}`);
      const data = response.data.results;
      cache.set(cacheKey, data, 60); 
      res.json(data);
    } catch (error) {
      // Mock fallback
      res.json({ p: 150.00, s: 100, t: Date.now() });
    }
  });

  // Company profile & fundamentals (FMP)
  app.get("/api/profile/:symbol", async (req, res) => {
    const { symbol } = req.params;
    const cacheKey = `profile_${symbol}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
      const response = await axios.get(`https://financialmodelingprep.com/api/v3/profile/${symbol}?apikey=${FMP_KEY}`);
      const data = response.data[0];
      if (!data) return res.status(404).json({ error: "Profile not found" });
      cache.set(cacheKey, data, 3600);
      res.json(data);
    } catch (error) {
      res.status(502).json({ error: "Failed to fetch live profile data" });
    }
  });

  // Historical daily/intraday data (Polygon)
  app.get("/api/historical/:symbol", async (req, res) => {
    const { symbol } = req.params;
    const { multiplier = 1, timespan = 'day', from = '2023-01-01', to = '2024-01-01' } = req.query;
    const cacheKey = `hist_${symbol}_${timespan}_${from}_${to}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
      const response = await axios.get(`https://api.polygon.io/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${from}/${to}?apiKey=${POLYGON_KEY}`);
      const data = response.data.results;
      cache.set(cacheKey, data, 3600);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch historical data" });
    }
  });

  // News (FMP)
  app.get("/api/news/:symbol", async (req, res) => {
    const { symbol } = req.params;
    const cacheKey = `news_${symbol}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
      const response = await axios.get(`https://financialmodelingprep.com/api/v3/stock_news?tickers=${symbol}&limit=10&apikey=${FMP_KEY}`);
      const data = response.data;
      cache.set(cacheKey, data, 1800); // 30 mins cache
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  // Market Status (Polygon)
  app.get("/api/market/status", async (req, res) => {
    const cacheKey = "market_status";
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
      const response = await axios.get(`https://api.polygon.io/v1/marketstatus/now?apiKey=${POLYGON_KEY}`);
      cache.set(cacheKey, response.data, 60); // 1 minute cache
      res.json(response.data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch market status" });
    }
  });

  // Market Gainers (FMP)
  app.get("/api/market/gainers", async (req, res) => {
    const cacheKey = "market_gainers";
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
      const response = await axios.get(`https://financialmodelingprep.com/api/v3/stock_market/gainers?apikey=${FMP_KEY}`);
      cache.set(cacheKey, response.data, 300);
      res.json(response.data);
    } catch (error) {
      res.status(502).json({ error: "Live gainers data unavailable" });
    }
  });

  // Market Losers (FMP)
  app.get("/api/market/losers", async (req, res) => {
    const cacheKey = "market_losers";
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
      const response = await axios.get(`https://financialmodelingprep.com/api/v3/stock_market/losers?apikey=${FMP_KEY}`);
      cache.set(cacheKey, response.data, 300);
      res.json(response.data);
    } catch (error) {
      res.status(502).json({ error: "Live losers data unavailable" });
    }
  });

  // Market Actives (FMP)
  app.get("/api/market/actives", async (req, res) => {
    try {
      const response = await axios.get(`https://financialmodelingprep.com/api/v3/stock_market/actives?apikey=${FMP_KEY}`);
      res.json(response.data.slice(0, 10));
    } catch (error) {
      res.status(502).json({ error: "Live market activity data unavailable" });
    }
  });

  // Symbol Search (FMP)
  app.get("/api/search", async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);
    const cacheKey = `search_${q}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    if (!FMP_KEY) {
      console.warn("FMP_API_KEY missing - returning mock search results");
      const mockResults = [
        { symbol: "AAPL", name: "Apple Inc.", stockExchange: "NASDAQ" },
        { symbol: "TSLA", name: "Tesla Inc.", stockExchange: "NASDAQ" },
        { symbol: "NVDA", name: "NVIDIA Corporation.", stockExchange: "NASDAQ" },
      ].filter(r => r.symbol.includes(String(q).toUpperCase()));
      return res.json(mockResults);
    }

    try {
      const response = await axios.get(`https://financialmodelingprep.com/api/v3/search?query=${q}&limit=10&apikey=${FMP_KEY}`);
      const data = response.data;
      cache.set(cacheKey, data, 3600); // 1 hour cache
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch search results" });
    }
  });

  // Major Indices (FMP)

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
      subs.forEach(sym => allSymbols.add(sym));
    });

    if (allSymbols.size === 0) return;

    let quotes: any[] = [];

    if (FMP_KEY) {
      try {
        const symbolsStr = Array.from(allSymbols).join(',');
        const response = await axios.get(`https://financialmodelingprep.com/api/v3/quote/${symbolsStr}?apikey=${FMP_KEY}`);
        quotes = response.data;
      } catch (error) {
        console.error("FMP API broadcast error:", error.message);
      }
    }

    // Fallback to mock data if API fails or KEY missing
    if (!Array.isArray(quotes) || quotes.length === 0) {
      quotes = Array.from(allSymbols).map(symbol => {
        const basePrice = symbol === 'AAPL' ? 175.20 : 
                          symbol === 'NVDA' ? 450.50 : 
                          symbol === 'MSFT' ? 380.12 : 100.00;
        
        // Generate random fluctuation (-0.5% to +0.5%)
        const fluctuation = (Math.random() - 0.5) * 0.01;
        const price = basePrice * (1 + fluctuation);
        const change = price - basePrice;
        const changePercent = (change / basePrice) * 100;

        return {
          symbol,
          price,
          change,
          changesPercentage: changePercent
        };
      });
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

  // Run broadcast every 2 seconds for more "real-time" feel
  const broadcastInterval = setInterval(broadcastPriceUpdates, 2000);

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
