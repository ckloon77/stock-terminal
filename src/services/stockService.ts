import { StockQuote, Candle, TechnicalIndicators, StrategyFrameworkResult, AIStrategicThesis, AICandlePrediction } from '../types';

export async function fetchStockQuote(ticker: string): Promise<StockQuote> {
  const res = await fetch(`/api/stocks/quote/${encodeURIComponent(ticker)}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch quote for ${ticker}`);
  }
  return res.json();
}

export async function fetchHistoricalData(
  ticker: string,
  range: string = '3mo',
  interval: string = '1d'
): Promise<Candle[]> {
  const url = `/api/stocks/history/${encodeURIComponent(ticker)}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch historical candles for ${ticker}`);
  }
  const data = await res.json();
  return data.candles || [];
}

export async function searchStocks(query: string): Promise<Array<{ symbol: string; name: string; sector: string }>> {
  try {
    const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    return res.json();
  } catch (err) {
    return [];
  }
}

export async function fetchAIStrategyAnalysis(
  ticker: string,
  quote: StockQuote,
  indicators: TechnicalIndicators,
  signals: StrategyFrameworkResult[]
): Promise<AIStrategicThesis> {
  const res = await fetch('/api/analysis/gemini', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ticker,
      quote,
      indicators,
      strategySummary: {
        overallSignal: signals.some(s => s.signal === 'BULLISH') ? 'BUY' : 'HOLD',
        signals
      }
    })
  });

  if (!res.ok) {
    throw new Error('Failed to run AI strategy analysis');
  }

  return res.json();
}

export async function fetchAICandlePrediction(
  ticker: string,
  candles: Candle[],
  timeframe: string = '1d',
  indicators?: TechnicalIndicators | null,
  quote?: StockQuote | null
): Promise<AICandlePrediction> {
  const res = await fetch('/api/analysis/predict-candle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ticker,
      candles: candles.slice(-25),
      timeframe,
      indicators,
      quote
    })
  });

  if (!res.ok) {
    throw new Error('Failed to run AI next candle prediction');
  }

  return res.json();
}

// Synthesized alert chime using Web Audio API
export function playAlertChime(type: 'bullish' | 'bearish' | 'neutral' = 'neutral') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    if (type === 'bullish') {
      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.15); // G5
      osc2.frequency.setValueAtTime(659.25, now); // E5
      osc2.frequency.exponentialRampToValueAtTime(1046.50, now + 0.2); // C6
    } else if (type === 'bearish') {
      osc1.frequency.setValueAtTime(659.25, now); // E5
      osc1.frequency.exponentialRampToValueAtTime(440.0, now + 0.15); // A4
      osc2.frequency.setValueAtTime(523.25, now);
      osc2.frequency.exponentialRampToValueAtTime(349.23, now + 0.2); // F4
    } else {
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880.0, now + 0.18); // A5
      osc2.frequency.setValueAtTime(739.99, now);
    }

    osc1.type = 'sine';
    osc2.type = 'triangle';

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.5);
    osc2.stop(now + 0.5);
  } catch (e) {
    // Ignore audio permission or blocked context
  }
}
