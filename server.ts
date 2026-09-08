import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory fallback stock data generator & real-time quotes cache
interface CandleData {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const STOCK_PROFILES: Record<string, { name: string; sector: string; basePrice: number; beta: number; pe: number; marketCap: string }> = {
  NVDA: { name: 'NVIDIA Corporation', sector: 'Semiconductors & AI', basePrice: 132.50, beta: 1.68, pe: 54.2, marketCap: '$3.25T' },
  AAPL: { name: 'Apple Inc.', sector: 'Consumer Electronics', basePrice: 228.40, beta: 1.08, pe: 34.1, marketCap: '$3.46T' },
  MSFT: { name: 'Microsoft Corporation', sector: 'Enterprise Software & Cloud', basePrice: 425.10, beta: 1.15, pe: 35.8, marketCap: '$3.16T' },
  TSLA: { name: 'Tesla, Inc.', sector: 'Automotive & Clean Energy', basePrice: 245.80, beta: 2.35, pe: 68.4, marketCap: '$785B' },
  GOOGL: { name: 'Alphabet Inc.', sector: 'Internet & Artificial Intelligence', basePrice: 178.60, beta: 1.05, pe: 24.3, marketCap: '$2.21T' },
  AMZN: { name: 'Amazon.com, Inc.', sector: 'E-Commerce & Cloud Computing', basePrice: 194.20, beta: 1.18, pe: 41.5, marketCap: '$2.02T' },
  META: { name: 'Meta Platforms, Inc.', sector: 'Social Media & Virtual Reality', basePrice: 582.30, beta: 1.22, pe: 27.9, marketCap: '$1.47T' },
  SPY: { name: 'SPDR S&P 500 ETF Trust', sector: 'Index ETF', basePrice: 564.80, beta: 1.00, pe: 26.2, marketCap: '$580B' },
  QQQ: { name: 'Invesco QQQ Trust (Nasdaq 100)', sector: 'Tech Index ETF', basePrice: 492.10, beta: 1.20, pe: 31.4, marketCap: '$290B' },
  AMD: { name: 'Advanced Micro Devices, Inc.', sector: 'Semiconductors', basePrice: 156.40, beta: 1.72, pe: 48.6, marketCap: '$253B' },
  PLTR: { name: 'Palantir Technologies Inc.', sector: 'Data Analytics & AI', basePrice: 38.90, beta: 2.10, pe: 82.1, marketCap: '$86B' },
  COIN: { name: 'Coinbase Global, Inc.', sector: 'Financial & Crypto Infrastructure', basePrice: 212.50, beta: 2.85, pe: 45.2, marketCap: '$52B' },
};

// Generate realistic historical candle data
function generateHistoricalCandles(ticker: string, days: number = 90): CandleData[] {
  const profile = STOCK_PROFILES[ticker.toUpperCase()] || {
    name: `${ticker.toUpperCase()} Corp`,
    sector: 'Technology',
    basePrice: 100.0,
    beta: 1.2,
    pe: 25.0,
    marketCap: '$50B'
  };

  const candles: CandleData[] = [];
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  
  // Deterministic seed based on ticker characters to keep data stable across queries
  let seed = 0;
  for (let i = 0; i < ticker.length; i++) {
    seed += ticker.charCodeAt(i) * (i + 1);
  }

  let currentPrice = profile.basePrice * (0.85 + (seed % 30) / 100);
  const trend = (seed % 2 === 0 ? 1 : -1) * 0.0008;

  for (let i = days; i >= 0; i--) {
    const timeDate = new Date(now - i * oneDay);
    // Skip weekends
    if (timeDate.getDay() === 0 || timeDate.getDay() === 6) continue;

    // Pseudo-random movement with trend
    const pseudoRandom = Math.sin(seed + i * 13.37) * 0.5 + Math.cos(seed * 0.3 + i * 7.1) * 0.5;
    const dailyVolatility = (profile.beta * 0.015);
    const pctChange = trend + pseudoRandom * dailyVolatility;
    
    const open = currentPrice;
    const close = Math.max(1, open * (1 + pctChange));
    const high = Math.max(open, close) * (1 + Math.abs(Math.sin(i * 3.7)) * 0.012);
    const low = Math.min(open, close) * (1 - Math.abs(Math.cos(i * 2.3)) * 0.012);
    const volume = Math.floor(1500000 + Math.abs(pseudoRandom) * 3500000 + (Math.abs(pctChange) > 0.02 ? 2500000 : 0));

    candles.push({
      time: timeDate.toISOString().split('T')[0],
      timestamp: timeDate.getTime(),
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume
    });

    currentPrice = close;
  }

  return candles;
}

// Aggregate daily candles into weekly or monthly candles
function aggregateDailyToInterval(dailyCandles: CandleData[], targetInterval: string): CandleData[] {
  if (targetInterval === '1d' || dailyCandles.length === 0) return dailyCandles;

  if (targetInterval === '1wk') {
    const result: CandleData[] = [];
    let currentWeekId = '';
    let currentGroup: CandleData[] = [];

    for (const c of dailyCandles) {
      const d = new Date(c.timestamp);
      // Determine week start (Monday)
      const day = d.getDay();
      const diffToMonday = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setDate(diffToMonday);
      const weekId = monday.toISOString().split('T')[0];

      if (weekId !== currentWeekId) {
        if (currentGroup.length > 0) {
          result.push(mergeCandleGroup(currentGroup, `Wk of ${currentWeekId}`));
        }
        currentWeekId = weekId;
        currentGroup = [c];
      } else {
        currentGroup.push(c);
      }
    }
    if (currentGroup.length > 0) {
      result.push(mergeCandleGroup(currentGroup, `Wk of ${currentWeekId}`));
    }
    return result;
  }

  if (targetInterval === '1mo') {
    const result: CandleData[] = [];
    let currentMonthId = '';
    let currentGroup: CandleData[] = [];

    for (const c of dailyCandles) {
      const d = new Date(c.timestamp);
      const monthId = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      if (monthId !== currentMonthId) {
        if (currentGroup.length > 0) {
          result.push(mergeCandleGroup(currentGroup, currentMonthId));
        }
        currentMonthId = monthId;
        currentGroup = [c];
      } else {
        currentGroup.push(c);
      }
    }
    if (currentGroup.length > 0) {
      result.push(mergeCandleGroup(currentGroup, currentMonthId));
    }
    return result;
  }

  return dailyCandles;
}

function mergeCandleGroup(group: CandleData[], label: string): CandleData {
  const open = group[0].open;
  const close = group[group.length - 1].close;
  const high = Math.max(...group.map((g) => g.high));
  const low = Math.min(...group.map((g) => g.low));
  const volume = group.reduce((sum, g) => sum + g.volume, 0);
  const timestamp = group[group.length - 1].timestamp;

  return {
    time: label,
    timestamp,
    open: Number(open.toFixed(2)),
    high: Number(high.toFixed(2)),
    low: Number(low.toFixed(2)),
    close: Number(close.toFixed(2)),
    volume
  };
}

// Generate realistic intraday high-frequency candlestick data for Day Trade View
function generateIntradayCandles(ticker: string, interval: string = '5m'): CandleData[] {
  const profile = STOCK_PROFILES[ticker.toUpperCase()] || {
    name: `${ticker.toUpperCase()} Corp`,
    sector: 'Technology',
    basePrice: 100.0,
    beta: 1.2,
    pe: 25.0,
    marketCap: '$50B'
  };

  const minutesPerInterval: Record<string, number> = {
    '1m': 1,
    '2m': 2,
    '5m': 5,
    '10m': 10,
    '15m': 15,
    '30m': 30,
    '1h': 60,
    '2h': 120,
    '4h': 240,
  };

  const countPerInterval: Record<string, number> = {
    '1m': 90,
    '2m': 75,
    '5m': 78,
    '10m': 42,
    '15m': 42,
    '30m': 36,
    '1h': 42,
    '2h': 35,
    '4h': 30,
  };

  const stepMinutes = minutesPerInterval[interval] || 5;
  const numBars = countPerInterval[interval] || 50;

  const candles: CandleData[] = [];
  const now = new Date();

  // Deterministic seed based on ticker characters to keep data stable across queries
  let seed = 0;
  for (let i = 0; i < ticker.length; i++) {
    seed += ticker.charCodeAt(i) * (i + 1);
  }

  let currentPrice = profile.basePrice * (0.97 + (seed % 8) / 100);
  const isMultiDay = stepMinutes >= 60 || numBars > 78;

  const endTimeMs = now.getTime();
  const startTimeMs = endTimeMs - numBars * stepMinutes * 60 * 1000;

  for (let i = 0; i < numBars; i++) {
    const barTimeMs = startTimeMs + i * stepMinutes * 60 * 1000;
    const barDate = new Date(barTimeMs);

    // Intraday micro wave volatility
    const wave = Math.sin(seed + i * 0.45) * 0.6 + Math.cos(seed * 0.2 + i * 0.9) * 0.4;
    const volatility = (profile.beta * 0.0035) * Math.sqrt(stepMinutes / 5);
    const pctChange = wave * volatility;

    let open = currentPrice;
    let close = Math.max(1, open * (1 + pctChange));

    // Natural wick distribution with occasional high-significance patterns
    let high = Math.max(open, close) + (profile.basePrice * 0.002 * Math.abs(Math.sin(i * 1.7)));
    let low = Math.min(open, close) - (profile.basePrice * 0.002 * Math.abs(Math.cos(i * 2.1)));

    // Inject realistic textbook patterns at strategic bars for day trading analysis
    if (i === Math.floor(numBars * 0.35)) {
      // Hammer rejection off bottom
      const body = Math.abs(close - open);
      low = Math.min(open, close) - Math.max(0.4, body * 2.6);
      high = Math.max(open, close) + body * 0.15;
    } else if (i === Math.floor(numBars * 0.36)) {
      // Bullish Engulfing follow-through
      open = currentPrice * 0.998;
      close = open + (profile.basePrice * 0.008);
      high = close + (profile.basePrice * 0.001);
      low = open - (profile.basePrice * 0.0005);
    } else if (i === Math.floor(numBars * 0.7)) {
      // Shooting star at local peak
      const body = Math.abs(close - open);
      high = Math.max(open, close) + Math.max(0.5, body * 2.8);
      low = Math.min(open, close) - body * 0.12;
    }

    const volumeBase = 35000 * Math.sqrt(stepMinutes);
    const volumeMultiplier = 1 + Math.abs(wave) * 2 + (Math.abs(pctChange) > 0.004 ? 1.8 : 0);
    const volume = Math.floor(volumeBase * volumeMultiplier);

    const hours = String(barDate.getHours()).padStart(2, '0');
    const mins = String(barDate.getMinutes()).padStart(2, '0');
    const month = String(barDate.getMonth() + 1).padStart(2, '0');
    const day = String(barDate.getDate()).padStart(2, '0');

    const timeStr = isMultiDay ? `${month}/${day} ${hours}:${mins}` : `${hours}:${mins}`;

    candles.push({
      time: timeStr,
      timestamp: barTimeMs,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume
    });

    currentPrice = close;
  }

  return candles;
}

// Fetch live or generated stock quote
app.get('/api/stocks/quote/:ticker', async (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  try {
    // Attempt Yahoo Finance API query
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=5d`;
    const response = await fetch(yahooUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StockTerminal/1.0)' },
      signal: AbortSignal.timeout(3000)
    });

    if (response.ok) {
      const data = await response.json();
      const meta = data?.chart?.result?.[0]?.meta;
      const quote = data?.chart?.result?.[0]?.indicators?.quote?.[0];
      if (meta && quote) {
        const regularMarketPrice = meta.regularMarketPrice ?? meta.previousClose ?? 100;
        const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? regularMarketPrice;
        const change = regularMarketPrice - previousClose;
        const changePercent = (change / previousClose) * 100;
        
        return res.json({
          symbol: ticker,
          name: meta.shortName || meta.symbol || ticker,
          price: Number(regularMarketPrice.toFixed(2)),
          change: Number(change.toFixed(2)),
          changePercent: Number(changePercent.toFixed(2)),
          previousClose: Number(previousClose.toFixed(2)),
          dayHigh: Number((meta.regularMarketDayHigh || regularMarketPrice * 1.01).toFixed(2)),
          dayLow: Number((meta.regularMarketDayLow || regularMarketPrice * 0.99).toFixed(2)),
          volume: meta.regularMarketVolume || 12500000,
          currency: meta.currency || 'USD',
          exchange: meta.exchangeName || 'NASDAQ',
          fiftyTwoWeekHigh: Number((meta.fiftyTwoWeekHigh || regularMarketPrice * 1.25).toFixed(2)),
          fiftyTwoWeekLow: Number((meta.fiftyTwoWeekLow || regularMarketPrice * 0.75).toFixed(2)),
          updatedAt: new Date().toISOString(),
          isLive: true
        });
      }
    }
  } catch (err) {
    // Fallback gracefully to simulated/profile generator
  }

  // Fallback quote
  const profile = STOCK_PROFILES[ticker] || {
    name: `${ticker} Corporation`,
    sector: 'Equities',
    basePrice: 120.0,
    beta: 1.2,
    pe: 28.5,
    marketCap: '$45B'
  };

  const candles = generateHistoricalCandles(ticker, 10);
  const latest = candles[candles.length - 1];
  const previous = candles[candles.length - 2] || latest;
  const change = latest.close - previous.close;
  const changePercent = (change / previous.close) * 100;

  res.json({
    symbol: ticker,
    name: profile.name,
    sector: profile.sector,
    price: latest.close,
    change: Number(change.toFixed(2)),
    changePercent: Number(changePercent.toFixed(2)),
    previousClose: previous.close,
    dayHigh: latest.high,
    dayLow: latest.low,
    volume: latest.volume,
    currency: 'USD',
    exchange: 'NASDAQ',
    fiftyTwoWeekHigh: Number((profile.basePrice * 1.35).toFixed(2)),
    fiftyTwoWeekLow: Number((profile.basePrice * 0.72).toFixed(2)),
    marketCap: profile.marketCap,
    pe: profile.pe,
    updatedAt: new Date().toISOString(),
    isLive: false
  });
});

// Fetch historical candles (supports macro ranges and intraday day-trade intervals)
app.get('/api/stocks/history/:ticker', async (req, res) => {
  const ticker = req.params.ticker.toUpperCase();
  const range = (req.query.range as string) || '3mo';
  const interval = (req.query.interval as string) || '1d';
  
  const intradayIntervals = ['1m', '2m', '5m', '10m', '15m', '30m', '1h', '2h', '4h'];
  const isIntraday = intradayIntervals.includes(interval);

  if (isIntraday) {
    try {
      // Map interval to Yahoo compatible interval and range
      let yahooInterval = interval;
      let yahooRange = '1d';

      if (interval === '1m' || interval === '2m') {
        yahooInterval = interval;
        yahooRange = '1d';
      } else if (interval === '5m' || interval === '10m') {
        yahooInterval = '5m';
        yahooRange = '2d';
      } else if (interval === '15m' || interval === '30m') {
        yahooInterval = interval;
        yahooRange = '5d';
      } else if (interval === '1h' || interval === '2h') {
        yahooInterval = '60m';
        yahooRange = '1mo';
      } else if (interval === '4h') {
        yahooInterval = '60m';
        yahooRange = '3mo';
      }

      const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${yahooRange}&interval=${yahooInterval}`;
      const response = await fetch(yahooUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StockTerminal/1.0)' },
        signal: AbortSignal.timeout(3500)
      });

      if (response.ok) {
        const data = await response.json();
        const result = data?.chart?.result?.[0];
        if (result && result.timestamp && result.indicators?.quote?.[0]) {
          const timestamps = result.timestamp as number[];
          const quotes = result.indicators.quote[0];
          const rawCandles: CandleData[] = [];

          for (let i = 0; i < timestamps.length; i++) {
            const c = quotes.close?.[i];
            const o = quotes.open?.[i] || c;
            const h = quotes.high?.[i] || Math.max(o, c);
            const l = quotes.low?.[i] || Math.min(o, c);
            const v = quotes.volume?.[i] || 0;

            if (c !== null && c !== undefined && !isNaN(c)) {
              const dateObj = new Date(timestamps[i] * 1000);
              const hours = String(dateObj.getHours()).padStart(2, '0');
              const mins = String(dateObj.getMinutes()).padStart(2, '0');
              const month = String(dateObj.getMonth() + 1).padStart(2, '0');
              const day = String(dateObj.getDate()).padStart(2, '0');
              const timeStr = yahooRange === '1d' ? `${hours}:${mins}` : `${month}/${day} ${hours}:${mins}`;

              rawCandles.push({
                time: timeStr,
                timestamp: timestamps[i] * 1000,
                open: Number(o.toFixed(2)),
                high: Number(h.toFixed(2)),
                low: Number(l.toFixed(2)),
                close: Number(c.toFixed(2)),
                volume: v
              });
            }
          }

          // Aggregate if requested interval is 10m (2 x 5m), 2h (2 x 60m), or 4h (4 x 60m)
          let finalCandles = rawCandles;
          const groupFactor = interval === '10m' ? 2 : interval === '2h' ? 2 : interval === '4h' ? 4 : 1;

          if (groupFactor > 1 && rawCandles.length > 0) {
            const aggregated: CandleData[] = [];
            for (let i = 0; i < rawCandles.length; i += groupFactor) {
              const slice = rawCandles.slice(i, i + groupFactor);
              const open = slice[0].open;
              const close = slice[slice.length - 1].close;
              const high = Math.max(...slice.map(s => s.high));
              const low = Math.min(...slice.map(s => s.low));
              const volume = slice.reduce((sum, s) => sum + s.volume, 0);

              aggregated.push({
                time: slice[slice.length - 1].time,
                timestamp: slice[slice.length - 1].timestamp,
                open,
                high,
                low,
                close,
                volume
              });
            }
            finalCandles = aggregated;
          }

          if (finalCandles.length > 0) {
            return res.json({ symbol: ticker, range: yahooRange, interval, candles: finalCandles, isLive: true });
          }
        }
      }
    } catch (err) {
      // Fallback to synthetic intraday candles
    }

    const intradayGenerated = generateIntradayCandles(ticker, interval);
    return res.json({ symbol: ticker, range: 'intraday', interval, candles: intradayGenerated, isLive: false });
  }

  const swingInterval = (interval === '1wk' || interval === '1mo') ? interval : '1d';

  let days = 90;
  if (range === '1w') days = 7;
  else if (range === '1mo') days = 30;
  else if (range === '3mo') days = 90;
  else if (range === '6mo') days = 180;
  else if (range === '1y') days = 365;
  else if (range === '2y') days = 730;
  else if (range === '5y') days = 1825;

  if (swingInterval === '1wk') {
    days = Math.max(days, 365);
  } else if (swingInterval === '1mo') {
    days = Math.max(days, 1825);
  }

  try {
    let yahooRange = range === '1w' ? '5d' : range;
    if (swingInterval === '1wk' && (range === '1w' || range === '1mo')) {
      yahooRange = '1y';
    } else if (swingInterval === '1mo' && (range === '1w' || range === '1mo' || range === '3mo' || range === '6mo')) {
      yahooRange = '5y';
    }

    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${yahooRange}&interval=${swingInterval}`;
    const response = await fetch(yahooUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StockTerminal/1.0)' },
      signal: AbortSignal.timeout(3500)
    });

    if (response.ok) {
      const data = await response.json();
      const result = data?.chart?.result?.[0];
      if (result && result.timestamp && result.indicators?.quote?.[0]) {
        const timestamps = result.timestamp as number[];
        const quotes = result.indicators.quote[0];
        const formatted: CandleData[] = [];

        for (let i = 0; i < timestamps.length; i++) {
          const c = quotes.close?.[i];
          const o = quotes.open?.[i] || c;
          const h = quotes.high?.[i] || Math.max(o, c);
          const l = quotes.low?.[i] || Math.min(o, c);
          const v = quotes.volume?.[i] || 0;

          if (c !== null && c !== undefined && !isNaN(c)) {
            const dateObj = new Date(timestamps[i] * 1000);
            let timeStr = dateObj.toISOString().split('T')[0];
            if (swingInterval === '1wk') {
              timeStr = `Wk of ${timeStr}`;
            } else if (swingInterval === '1mo') {
              timeStr = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
            }

            formatted.push({
              time: timeStr,
              timestamp: timestamps[i] * 1000,
              open: Number(o.toFixed(2)),
              high: Number(h.toFixed(2)),
              low: Number(l.toFixed(2)),
              close: Number(c.toFixed(2)),
              volume: v
            });
          }
        }

        if (formatted.length > 0) {
          const finalFormatted = aggregateDailyToInterval(formatted, swingInterval);
          return res.json({ symbol: ticker, range, interval: swingInterval, candles: finalFormatted, isLive: true });
        }
      }
    }
  } catch (err) {
    // Fallback to generated realistic series
  }

  const rawGenerated = generateHistoricalCandles(ticker, days);
  const finalGenerated = aggregateDailyToInterval(rawGenerated, swingInterval);
  res.json({ symbol: ticker, range, interval: swingInterval, candles: finalGenerated, isLive: false });
});

// Search stocks endpoint
app.get('/api/stocks/search', (req, res) => {
  const query = ((req.query.q as string) || '').toUpperCase().trim();
  if (!query) {
    return res.json(Object.entries(STOCK_PROFILES).slice(0, 8).map(([sym, p]) => ({
      symbol: sym,
      name: p.name,
      sector: p.sector
    })));
  }

  const matches = Object.entries(STOCK_PROFILES)
    .filter(([sym, p]) => sym.includes(query) || p.name.toUpperCase().includes(query))
    .map(([sym, p]) => ({
      symbol: sym,
      name: p.name,
      sector: p.sector
    }));

  if (matches.length === 0) {
    matches.push({
      symbol: query,
      name: `${query} Stock`,
      sector: 'Custom Asset'
    });
  }

  res.json(matches.slice(0, 8));
});

// Circuit breaker & backoff for Gemini quota exhaustion (429) or transient throttling
let geminiQuotaBackoffUntil = 0;

// Helper to execute Gemini requests with resilient multi-model fallback (handling 503 high demand, 429 rate limits, 404s)
async function generateGeminiJson(
  ai: GoogleGenAI,
  prompt: string,
  preferredModel: string = 'gemini-3.8-flash'
): Promise<{ data: any; model: string } | null> {
  // If recently rate-limited or quota exceeded, skip network calls and cleanly use the quant engine
  if (Date.now() < geminiQuotaBackoffUntil) {
    return null;
  }

  const modelsToTry = [preferredModel, 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
  const uniqueModels = Array.from(new Set(modelsToTry));

  for (const model of uniqueModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });
      const text = response.text || '{}';
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') {
        return { data: parsed, model };
      }
    } catch (err: any) {
      const status = err?.status || err?.error?.code || (err?.message?.includes('429') ? 429 : null);
      const isQuotaExceeded = status === 429 || `${status}`.includes('429') || err?.message?.includes('quota');
      
      if (isQuotaExceeded) {
        // Apply a 60-second backoff so app seamlessly relies on quantitative engines
        geminiQuotaBackoffUntil = Date.now() + 60_000;
        break;
      }
      // Silently proceed to next fallback model without writing error traces to stdout
    }
  }

  return null;
}

// AI-Powered Strategy Analysis endpoint
app.post('/api/analysis/gemini', async (req, res) => {
  const { ticker, quote, indicators, strategySummary } = req.body;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    // Return structured deterministic analysis if API key not set yet
    return res.json({
      verdict: strategySummary?.overallSignal || 'NEUTRAL',
      convictionScore: 78,
      summary: `Technical analysis for ${ticker} highlights key momentum patterns at $${quote?.price || 'N/A'}. RSI is currently at ${indicators?.rsi?.toFixed(1) || '50'} with MACD showing ${indicators?.macd?.histogram > 0 ? 'bullish' : 'bearish'} momentum.`,
      setup: {
        entryZone: `$${((quote?.price || 100) * 0.985).toFixed(2)} - $${((quote?.price || 100) * 1.005).toFixed(2)}`,
        stopLoss: `$${((quote?.price || 100) * 0.955).toFixed(2)}`,
        target1: `$${((quote?.price || 100) * 1.055).toFixed(2)}`,
        target2: `$${((quote?.price || 100) * 1.115).toFixed(2)}`,
        riskRewardRatio: '1:2.4'
      },
      keyCatalysts: [
        `Volume trend indicates ${(indicators?.volumeRatio ?? 1) >= 1.25 ? 'above average institutional' : 'standard'} market participation.`,
        `Trading ${indicators?.priceAboveSma50 ? 'above' : 'below'} the 50-day simple moving average ($${indicators?.sma50?.toFixed(2) || 'N/A'}).`,
        `ATR volatility measured at $${indicators?.atr?.toFixed(2) || 'N/A'}, suggesting standard tactical stop widths.`
      ],
      risks: [
        'Broader macroeconomic market volatility and interest rate sentiment.',
        `Break below support level at $${((quote?.price || 100) * 0.94).toFixed(2)} would invalidate this tactical thesis.`
      ],
      modelUsed: 'deterministic-rules-engine'
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
    const prompt = `You are an elite quantitative strategist and technical analyst. Analyze the following stock setup and return a strict JSON response.

Asset: ${ticker} (${quote?.name || ''})
Current Price: $${quote?.price}
Daily Change: ${quote?.change} (${quote?.changePercent}%)
RSI (14): ${indicators?.rsi?.toFixed(2)}
MACD: Value=${indicators?.macd?.macdLine?.toFixed(2)}, Signal=${indicators?.macd?.signalLine?.toFixed(2)}, Histogram=${indicators?.macd?.histogram?.toFixed(2)}
Moving Averages: SMA20=$${indicators?.sma20?.toFixed(2)}, SMA50=$${indicators?.sma50?.toFixed(2)}, SMA200=$${indicators?.sma200?.toFixed(2)}
Bollinger Bands: Upper=$${indicators?.bollinger?.upper?.toFixed(2)}, Lower=$${indicators?.bollinger?.lower?.toFixed(2)}
ATR: $${indicators?.atr?.toFixed(2)}
Support Level: $${indicators?.support?.toFixed(2)}
Resistance Level: $${indicators?.resistance?.toFixed(2)}
Rule-based Strategy Signals: ${JSON.stringify(strategySummary?.signals || [])}

Provide your response ONLY as valid JSON with this exact schema:
{
  "verdict": "STRONG BUY" | "BUY" | "HOLD" | "TRIM" | "SELL",
  "convictionScore": number (1-100),
  "summary": "2-3 sentences concise tactical synthesis of the chart structure, momentum, and volume profile",
  "setup": {
    "entryZone": "string (e.g. $130.00 - $132.50)",
    "stopLoss": "string (e.g. $126.50)",
    "target1": "string (e.g. $142.00)",
    "target2": "string (e.g. $150.00)",
    "riskRewardRatio": "string (e.g. 1:2.6)"
  },
  "keyCatalysts": ["string", "string", "string"],
  "risks": ["string", "string"],
  "modelUsed": "gemini-3.8-flash"
}`;

    const result = await generateGeminiJson(ai, prompt, 'gemini-3.8-flash');
    if (result && result.data) {
      return res.json({
        ...result.data,
        modelUsed: result.data.modelUsed || result.model
      });
    }

    // Graceful fallback to deterministic quantitative rules
    console.log('[Tactical Analysis] Using quantitative rules fallback');
    return res.json({
      verdict: strategySummary?.overallSignal || 'NEUTRAL',
      convictionScore: 72,
      summary: `Tactical analysis for ${ticker}: Price is consolidating around $${quote?.price}. Indicators demonstrate ${indicators?.rsi > 50 ? 'positive' : 'subdued'} momentum with key pivot support at $${indicators?.support?.toFixed(2) || 'N/A'}.`,
      setup: {
        entryZone: `$${((quote?.price || 100) * 0.99).toFixed(2)} - $${((quote?.price || 100) * 1.01).toFixed(2)}`,
        stopLoss: `$${((quote?.price || 100) * 0.96).toFixed(2)}`,
        target1: `$${((quote?.price || 100) * 1.06).toFixed(2)}`,
        target2: `$${((quote?.price || 100) * 1.12).toFixed(2)}`,
        riskRewardRatio: '1:2.2'
      },
      keyCatalysts: [
        `RSI level at ${indicators?.rsi?.toFixed(1) || '50'} represents moderate oscillator equilibrium.`,
        `Immediate resistance sits near $${indicators?.resistance?.toFixed(2) || 'N/A'}.`
      ],
      risks: [
        'Potential volatility near upcoming earnings or Fed interest rate decisions.'
      ],
      modelUsed: 'rules-fallback'
    });
  } catch (err: any) {
    console.log('[Tactical Analysis] Handled fallback');
    return res.json({
      verdict: strategySummary?.overallSignal || 'NEUTRAL',
      convictionScore: 72,
      summary: `Tactical analysis for ${ticker}: Price is consolidating around $${quote?.price}. Indicators demonstrate ${indicators?.rsi > 50 ? 'positive' : 'subdued'} momentum with key pivot support at $${indicators?.support?.toFixed(2) || 'N/A'}.`,
      setup: {
        entryZone: `$${((quote?.price || 100) * 0.99).toFixed(2)} - $${((quote?.price || 100) * 1.01).toFixed(2)}`,
        stopLoss: `$${((quote?.price || 100) * 0.96).toFixed(2)}`,
        target1: `$${((quote?.price || 100) * 1.06).toFixed(2)}`,
        target2: `$${((quote?.price || 100) * 1.12).toFixed(2)}`,
        riskRewardRatio: '1:2.2'
      },
      keyCatalysts: [
        `RSI level at ${indicators?.rsi?.toFixed(1) || '50'} represents moderate oscillator equilibrium.`,
        `Immediate resistance sits near $${indicators?.resistance?.toFixed(2) || 'N/A'}.`
      ],
      risks: [
        'Potential volatility near upcoming earnings or Fed interest rate decisions.'
      ],
      modelUsed: 'rules-fallback'
    });
  }
});

// AI Next-Candle Prediction Endpoint (Probability score, Next Candle OHLC, Works / Fails Conditions)
app.post('/api/analysis/predict-candle', async (req, res) => {
  const { ticker = 'ASSET', candles = [], timeframe = '1d', indicators, quote } = req.body;

  // Quantitative helper to generate structured prediction
  const generateQuantPrediction = () => {
    const defaultPrice = quote?.price || 150.0;
    const lastCandle = candles[candles.length - 1] || {
      open: defaultPrice * 0.995,
      high: defaultPrice * 1.008,
      low: defaultPrice * 0.992,
      close: defaultPrice,
      volume: 2500000
    };
    const prevCandle = candles[candles.length - 2] || lastCandle;

    const currentPrice = Number(lastCandle.close.toFixed(2));
    const range = Math.max(0.2, lastCandle.high - lastCandle.low);
    const body = Math.abs(lastCandle.close - lastCandle.open);
    const isGreen = lastCandle.close >= lastCandle.open;
    const upperWick = lastCandle.high - Math.max(lastCandle.open, lastCandle.close);
    const lowerWick = Math.min(lastCandle.open, lastCandle.close) - lastCandle.low;

    const rsi = indicators?.rsi ?? 52;
    const macdHist = indicators?.macd?.histogram ?? 0;
    const atr = indicators?.atr ?? Math.max(0.5, range * 1.15);
    const support = indicators?.support ?? Number((currentPrice * 0.985).toFixed(2));
    const resistance = indicators?.resistance ?? Number((currentPrice * 1.018).toFixed(2));

    // Determine directional bias
    let bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let prob = 64;
    let conviction: 'VERY HIGH' | 'HIGH' | 'MODERATE' | 'SPECULATIVE' = 'MODERATE';

    // Hammer rejection off support
    if (lowerWick >= body * 1.8 && lastCandle.close >= lastCandle.low + range * 0.6) {
      bias = 'BULLISH';
      prob = 78;
      conviction = 'HIGH';
    }
    // Shooting star rejection off resistance
    else if (upperWick >= body * 1.8 && lastCandle.close <= lastCandle.high - range * 0.6) {
      bias = 'BEARISH';
      prob = 77;
      conviction = 'HIGH';
    }
    // Bullish strong momentum
    else if (isGreen && rsi >= 50 && macdHist >= 0 && lastCandle.close >= lastCandle.high - range * 0.25) {
      bias = 'BULLISH';
      prob = 74;
      conviction = 'HIGH';
    }
    // Bearish strong breakdown
    else if (!isGreen && (rsi <= 48 || macdHist < 0) && lastCandle.close <= lastCandle.low + range * 0.25) {
      bias = 'BEARISH';
      prob = 73;
      conviction = 'HIGH';
    }
    // Mild momentum
    else if (isGreen) {
      bias = 'BULLISH';
      prob = 66;
      conviction = 'MODERATE';
    } else {
      bias = 'BEARISH';
      prob = 65;
      conviction = 'MODERATE';
    }

    // Projected next candle values
    const expectedMove = (bias === 'BULLISH' ? 1 : bias === 'BEARISH' ? -1 : 0.2) * (atr * 0.55);
    const predOpen = Number((currentPrice + (bias === 'BULLISH' ? 0.05 : -0.05)).toFixed(2));
    const predClose = Number(Math.max(1, predOpen + expectedMove).toFixed(2));
    const predHigh = Number((Math.max(predOpen, predClose) + atr * 0.35).toFixed(2));
    const predLow = Number((Math.min(predOpen, predClose) - atr * 0.35).toFixed(2));

    const expectedChange = Number((predClose - currentPrice).toFixed(2));
    const expectedChangePercent = Number(((expectedChange / currentPrice) * 100).toFixed(2));

    const triggerPrice = bias === 'BULLISH'
      ? Number((currentPrice + atr * 0.15).toFixed(2))
      : Number((currentPrice - atr * 0.15).toFixed(2));

    const targetPrice = bias === 'BULLISH'
      ? Number((predClose + atr * 0.4).toFixed(2))
      : Number((predClose - atr * 0.4).toFixed(2));

    const invalidationPrice = bias === 'BULLISH'
      ? Number(Math.min(lastCandle.low, currentPrice - atr * 0.65).toFixed(2))
      : Number(Math.max(lastCandle.high, currentPrice + atr * 0.65).toFixed(2));

    const worksConditions = bias === 'BULLISH'
      ? [
          `Price sustains auction above immediate support at $${support.toFixed(2)} during opening sequence.`,
          `Volume expands above the 20-period average upon test of trigger level $${triggerPrice.toFixed(2)}.`,
          `Relative Strength Index (RSI ${rsi.toFixed(1)}) maintains higher lows without bearish oscillator divergence.`
        ]
      : [
          `Price meets supply pressure below immediate resistance at $${resistance.toFixed(2)}.`,
          `Sellers defend intraday rallies, breaking below confirmation trigger at $${triggerPrice.toFixed(2)}.`,
          `MACD histogram momentum remains negative, confirming institutional bid withdrawal.`
        ];

    const failsConditions = bias === 'BULLISH'
      ? [
          `Breach of invalidation stop level at $${invalidationPrice.toFixed(2)} with heavy distribution volume.`,
          `Immediate upper wick rejection at resistance $${resistance.toFixed(2)} with sudden loss of buy depth.`,
          `Broader market risk-off tape dragging down sector beta.`
        ]
      : [
          `Decisive breakout above invalidation stop level at $${invalidationPrice.toFixed(2)}.`,
          `Aggressive buy absorption stepping in at support pivot $${support.toFixed(2)} creating a bullish hammer.`,
          `Surge in institutional net buying flow invalidating the downward path of least resistance.`
        ];

    const thesisSummary = bias === 'BULLISH'
      ? `${ticker} exhibits constructive price structure on the ${timeframe} timeframe. Recent auction dynamics show demand absorption at lower levels, favoring an upside expansion candle toward $${targetPrice.toFixed(2)}.`
      : `${ticker} faces overhead supply friction on the ${timeframe} timeframe. Rejection near key pivots indicates seller control, favoring downside continuation toward $${targetPrice.toFixed(2)}.`;

    return {
      symbol: ticker,
      timestamp: Date.now(),
      timeframe,
      predictedCandle: {
        open: predOpen,
        high: predHigh,
        low: predLow,
        close: predClose,
        direction: bias,
        expectedChange,
        expectedChangePercent
      },
      probabilityScore: prob,
      conviction,
      thesisSummary,
      worksConditions,
      failsConditions,
      keyLevels: {
        triggerPrice,
        targetPrice,
        invalidationPrice,
        expectedVolatilityRange: Number(atr.toFixed(2))
      },
      modelUsed: 'deterministic-quant-engine'
    };
  };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.json(generateQuantPrediction());
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const recentCandles = candles.slice(-12);
    const lastCandle = recentCandles[recentCandles.length - 1] || { close: quote?.price || 100 };

    const prompt = `You are an institutional quantitative trading algorithm and price action microstructure analyst.
Analyze the recent candlestick price action, indicators, and current quote for ${ticker} (${quote?.name || ''}) on the ${timeframe} timeframe.
Forecast the EXACT NEXT CANDLE (the bar immediately following the last candle) with directional probability score, next candle OHLC, and explicit criteria for when this thesis works vs when it fails.

Asset: ${ticker}
Timeframe: ${timeframe}
Current Price: $${quote?.price || lastCandle.close}
RSI (14): ${indicators?.rsi?.toFixed(1) || '50'}
MACD: Histogram=${indicators?.macd?.histogram?.toFixed(2) || '0'}, Value=${indicators?.macd?.macdLine?.toFixed(2) || '0'}
ATR Volatility: $${indicators?.atr?.toFixed(2) || '1.50'}
Support Level: $${indicators?.support?.toFixed(2) || 'N/A'}
Resistance Level: $${indicators?.resistance?.toFixed(2) || 'N/A'}
Recent Candlesticks:
${recentCandles.map((c: any) => `${c.time}: Open=${c.open}, High=${c.high}, Low=${c.low}, Close=${c.close}, Vol=${c.volume}`).join('\n')}

Forecast the NEXT CANDLE. Return STRICT JSON with this exact schema:
{
  "symbol": "${ticker}",
  "timestamp": ${Date.now()},
  "timeframe": "${timeframe}",
  "predictedCandle": {
    "open": number,
    "high": number,
    "low": number,
    "close": number,
    "direction": "BULLISH" | "BEARISH" | "NEUTRAL",
    "expectedChange": number,
    "expectedChangePercent": number
  },
  "probabilityScore": number (52 to 89),
  "conviction": "VERY HIGH" | "HIGH" | "MODERATE" | "SPECULATIVE",
  "thesisSummary": "string (2 concise analytical sentences explaining order flow and candle formation rationale)",
  "worksConditions": [
    "string (Exact price action, support hold, or volume trigger needed for thesis to work)",
    "string (Follow-through criteria or oscillator confirmation)",
    "string (Auction order-flow requirement)"
  ],
  "failsConditions": [
    "string (Strict invalidation stop loss price and breach condition)",
    "string (Adverse wick rejection or volume absorption signal)",
    "string (Macro or sector momentum divergence warning)"
  ],
  "keyLevels": {
    "triggerPrice": number,
    "targetPrice": number,
    "invalidationPrice": number,
    "expectedVolatilityRange": number
  },
  "modelUsed": "gemini-3.8-flash"
}`;

    const result = await generateGeminiJson(ai, prompt, 'gemini-3.8-flash');
    if (result && result.data) {
      const parsed = result.data;
      // Validate essential keys
      if (parsed.predictedCandle && typeof parsed.probabilityScore === 'number' && Array.isArray(parsed.worksConditions)) {
        return res.json({
          ...parsed,
          modelUsed: parsed.modelUsed || result.model
        });
      }
    }

    // Fallback if model was unavailable or schema incomplete
    console.log('[Candle Prediction] Using quantitative rules fallback');
    return res.json(generateQuantPrediction());
  } catch (err: any) {
    console.log('[Candle Prediction] Handled fallback');
    return res.json(generateQuantPrediction());
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Stock Terminal server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
