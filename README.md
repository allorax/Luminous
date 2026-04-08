<div align="center">
  <img src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" alt="Luminous Banner" width="1200">

  # Luminous 
  ### The Intelligent Financial Intelligence Terminal

  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
  [![Vite](https://img.shields.io/badge/Vite-6-purple.svg)](https://vitejs.dev/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC.svg)](https://tailwindcss.com/)
  [![Powered by Gemini](https://img.shields.io/badge/AI-Gemini_Pro-orange.svg)](https://deepmind.google/technologies/gemini/)

  **Luminous** is a high-signal, institutional-grade financial intelligence platform designed for the modern trader. It bridges the gap between raw market data and actionable insights using cutting-edge AI.
</div>

---

## 💎 The Vision
In an era of information overload, Luminous serves as a high-density intelligence layer. It doesn't just show you data; it grades significance, filters noise, and provides a "Bloomberg-style" command center for global markets.

## 🚀 Key Features

### 🧠 AI Intelligence Layer
- **Gemini-Powered News Grading**: Automatic significance scoring (1-10) for global news feeds.
- **AI Copilot**: An interactive financial analyst built into your terminal for deep-dive queries.
- **Sentiment Analysis**: Real-time signal processing to help you stay ahead of market shifts.

### 📊 Institutional Data Density
- **Market Pulse**: Dynamic heatmaps and sector performance at a glance.
- **Advanced Visualization**: High-performance charting using `Lightweight-Charts` for sub-millisecond responsiveness.
- **Global Tickers**: Native support for multi-source market feeds via Yahoo Finance integration.
- **Command Search**: A professional, keyboard-first search overlay for rapid navigation.

### 💼 Portfolio Operations
- **Real-time Performance**: Track your holdings with automated gain/loss calculations.
- **Smart Alert System**: Configurable failsafes and price-action triggers to ensure you never miss a move.
- **CSV Importer**: Seamlessly migrate your existing portfolios with robust data parsing.

## 🛠️ Tech Stack

- **Frontend**: [React 19](https://react.dev/), [Vite 6](https://vitejs.dev/), [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/), [Motion (Framer)](https://www.framer.com/motion/)
- **Data Visuals**: [Lightweight Charts](https://www.tradingview.com/lightweight-charts/), [Recharts](https://recharts.org/)
- **Backend/ORM**: [Node.js/Express](https://expressjs.com/), [Prisma](https://www.prisma.io/)
- **Database**: [Supabase](https://supabase.com/) / SQLite
- **AI Engine**: [Google Gemini Pro API](https://ai.google.dev/)

## ⚙️ Getting Started

### Prerequisites
- Node.js (v18+)
- A Google AI Studio API Key (for Gemini features)

### Installation

1. **Clone & Install**
   ```bash
   git clone https://github.com/allorax/Luminous.git
   cd Luminous
   npm install
   ```

2. **Environment Configuration**
   Create a `.env` file (or use `.env.example` as a template):
   ```env
   GEMINI_API_KEY=your_key_here
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_key
   ```

3. **Database Setup**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Run Development Server**
   ```bash
   npm run dev
   ```

---

## 🤝 Contributing
Luminous is built on the principle of open intelligence. Contributions are welcome!
1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.

---
<p align="center">Made with ❤️ for the Trading Community</p>
