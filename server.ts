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
  prisma = new PrismaClient();
} catch (e) {
  console.error("Failed to initialize PrismaClient:", e);
}

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const PORT = 3000;

  app.use(express.json());

  // --- Data Service Layer ---
  const FMP_KEY = process.env.FMP_API_KEY;
  const POLYGON_KEY = process.env.POLYGON_API_KEY;

  // Real-time / delayed quote (Polygon)
  app.get("/api/quote/:symbol", async (req, res) => {
    const { symbol } = req.params;
    const cacheKey = `quote_${symbol}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
      const response = await axios.get(`https://api.polygon.io/v2/last/trade/${symbol}?apiKey=${POLYGON_KEY}`);
      const data = response.data.results;
      cache.set(cacheKey, data, 60); // 1 minute cache for quotes
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch quote" });
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
      cache.set(cacheKey, data, 3600); // 1 hour cache for profile
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch profile" });
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

  // Top Gainers (FMP)
  app.get("/api/market/gainers", async (req, res) => {
    const cacheKey = "market_gainers";
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
      const response = await axios.get(`https://financialmodelingprep.com/api/v3/stock_market/gainers?apikey=${FMP_KEY}`);
      cache.set(cacheKey, response.data, 300); // 5 minutes cache
      res.json(response.data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch gainers" });
    }
  });

  // Top Losers (FMP)
  app.get("/api/market/losers", async (req, res) => {
    const cacheKey = "market_losers";
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
      const response = await axios.get(`https://financialmodelingprep.com/api/v3/stock_market/losers?apikey=${FMP_KEY}`);
      cache.set(cacheKey, response.data, 300);
      res.json(response.data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch losers" });
    }
  });

  // Most Active (FMP)
  app.get("/api/market/actives", async (req, res) => {
    const cacheKey = "market_actives";
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
      const response = await axios.get(`https://financialmodelingprep.com/api/v3/stock_market/actives?apikey=${FMP_KEY}`);
      cache.set(cacheKey, response.data, 300);
      res.json(response.data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch actives" });
    }
  });

  // Major Indices (FMP)
  app.get("/api/market/indices", async (req, res) => {
    const cacheKey = "market_indices";
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    try {
      const response = await axios.get(`https://financialmodelingprep.com/api/v3/quotes/index?apikey=${FMP_KEY}`);
      cache.set(cacheKey, response.data, 60);
      res.json(response.data);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch indices" });
    }
  });

  // Portfolio CSV Importer
  app.post("/api/portfolio/import", express.text(), async (req, res) => {
    try {
      const records = parse(req.body, {
        columns: true,
        skip_empty_lines: true
      });
      
      // Save to Prisma
      if (prisma) {
        const portfolioData = records.map((r: any) => ({
          symbol: r.symbol,
          quantity: parseFloat(r.quantity),
          avgPrice: parseFloat(r.avgPrice),
          userId: 'default-user' // Mock user
        }));

        await prisma.portfolio.createMany({ data: portfolioData });
      } else {
        console.warn("Prisma not initialized, skipping database save.");
      }
      
      res.json({ success: true, count: records.length, data: records });
    } catch (error) {
      res.status(400).json({ error: "Invalid CSV format or database error" });
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
  const activeSymbols = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'AMZN', 'GOOGL', 'META', 'AMD', 'NFLX', 'DIS'];

  const broadcastPriceUpdates = async () => {
    if (!FMP_KEY) return;

    try {
      const symbolsStr = activeSymbols.join(',');
      const response = await axios.get(`https://financialmodelingprep.com/api/v3/quote/${symbolsStr}?apikey=${FMP_KEY}`);
      const quotes = response.data;
      
      if (Array.isArray(quotes)) {
        quotes.forEach(quote => {
          const update = {
            type: "T",
            sym: quote.symbol,
            p: quote.price,
            t: Date.now(), // FMP quote has timestamp but we use server time for consistency
            change: quote.change,
            changePercent: quote.changesPercentage
          };
          wss.clients.forEach((client) => {
            if (client.readyState === 1) {
              client.send(JSON.stringify(update));
            }
          });
        });
      }
    } catch (error) {
      console.error("Error broadcasting price updates:", error.message);
    }
  };

  // Run broadcast every 15 seconds to stay within reasonable limits
  const broadcastInterval = setInterval(broadcastPriceUpdates, 15000);

  wss.on("connection", (ws) => {
    console.log("Client connected to WebSocket");
    
    ws.on("close", () => {
      console.log("Client disconnected");
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
