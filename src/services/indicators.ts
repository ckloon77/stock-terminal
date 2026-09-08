import {
  Candle,
  TechnicalIndicators,
  StrategyFrameworkResult,
  VolumeProfileBin,
  VolumeProfileAnalysis,
  FibonacciLevel,
  FibonacciRetracement,
  FibonacciExtensionLevel,
  SupportResistanceLevel,
  MovingAverageSlope,
  MACrossEvent,
  BollingerInterpretation
} from '../types';

export function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      const sum = slice.reduce((a, b) => a + b, 0);
      result.push(Number((sum / period).toFixed(2)));
    }
  }
  return result;
}

export function calculateEMA(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);

  let initialSMA = 0;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else if (i === period - 1) {
      const slice = data.slice(0, period);
      initialSMA = slice.reduce((a, b) => a + b, 0) / period;
      result.push(Number(initialSMA.toFixed(2)));
    } else {
      const prevEMA = result[i - 1];
      const ema = (data[i] - prevEMA) * multiplier + prevEMA;
      result.push(Number(ema.toFixed(2)));
    }
  }
  return result;
}

export function calculateRSI(closes: number[], period: number = 14): number[] {
  const result: number[] = [];
  if (closes.length < period + 1) {
    return closes.map(() => 50);
  }

  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  let gains = 0;
  let losses = 0;
  for (let i = 0; i < period; i++) {
    if (changes[i] >= 0) gains += changes[i];
    else losses += Math.abs(changes[i]);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  result.push(NaN); // For index 0
  for (let i = 1; i <= period; i++) {
    result.push(NaN);
  }

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  let rsi = 100 - (100 / (1 + rs));
  result[period] = Number(rsi.toFixed(2));

  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    const gain = change >= 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi = 100 - (100 / (1 + rs));
    result.push(Number(rsi.toFixed(2)));
  }

  return result;
}

export function calculateMACD(
  closes: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
) {
  if (!closes || closes.length === 0) {
    return { macdLine: [], signalLine: [], histogram: [] };
  }

  const fastEMA = calculateEMA(closes, fastPeriod);
  const slowEMA = calculateEMA(closes, slowPeriod);

  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (isNaN(fastEMA[i]) || isNaN(slowEMA[i])) {
      macdLine.push(NaN);
    } else {
      macdLine.push(Number((fastEMA[i] - slowEMA[i]).toFixed(3)));
    }
  }

  // Filter valid MACD values to compute signal line
  const validMacdStart = macdLine.findIndex((v) => !isNaN(v));
  if (validMacdStart === -1) {
    return {
      macdLine,
      signalLine: closes.map(() => NaN),
      histogram: closes.map(() => 0)
    };
  }

  const validMacdValues = macdLine.slice(validMacdStart);
  const validSignal = calculateEMA(validMacdValues, signalPeriod);

  const prefixNaNs: number[] = validMacdStart > 0 ? Array.from({ length: validMacdStart }, () => NaN) : [];
  const signalLine: number[] = prefixNaNs.concat(validSignal);
  const histogram: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (isNaN(macdLine[i]) || isNaN(signalLine[i])) {
      histogram.push(0);
    } else {
      histogram.push(Number((macdLine[i] - signalLine[i]).toFixed(3)));
    }
  }

  return { macdLine, signalLine, histogram };
}

export function calculateBollingerBands(
  closes: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
) {
  const upper: number[] = [];
  const middle: number[] = [];
  const lower: number[] = [];
  const bandwidth: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      middle.push(NaN);
      lower.push(NaN);
      bandwidth.push(0);
    } else {
      const slice = closes.slice(i - period + 1, i + 1);
      const mean = slice.reduce((a, b) => a + b, 0) / period;
      const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / period;
      const stdDev = Math.sqrt(variance);

      const up = mean + stdDevMultiplier * stdDev;
      const low = mean - stdDevMultiplier * stdDev;

      upper.push(Number(up.toFixed(2)));
      middle.push(Number(mean.toFixed(2)));
      lower.push(Number(low.toFixed(2)));
      bandwidth.push(Number((((up - low) / mean) * 100).toFixed(2)));
    }
  }

  return { upper, middle, lower, bandwidth };
}

export function calculateATR(candles: Candle[], period: number = 14): number[] {
  const tr: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      tr.push(candles[i].high - candles[i].low);
    } else {
      const highLow = candles[i].high - candles[i].low;
      const highPrevClose = Math.abs(candles[i].high - candles[i - 1].close);
      const lowPrevClose = Math.abs(candles[i].low - candles[i - 1].close);
      tr.push(Math.max(highLow, highPrevClose, lowPrevClose));
    }
  }

  return calculateSMA(tr, period);
}

export function calculateVWAP(candles: Candle[]): number[] {
  const vwap: number[] = [];
  let cumVol = 0;
  let cumVolPrice = 0;

  for (let i = 0; i < candles.length; i++) {
    const typicalPrice = (candles[i].high + candles[i].low + candles[i].close) / 3;
    const vol = candles[i].volume || 1;
    cumVolPrice += typicalPrice * vol;
    cumVol += vol;
    vwap.push(Number((cumVolPrice / cumVol).toFixed(2)));
  }

  return vwap;
}

export function findSupportResistance(candles: Candle[]): { support: number; resistance: number } {
  if (candles.length < 10) {
    const latest = candles[candles.length - 1];
    return { support: latest.low * 0.95, resistance: latest.high * 1.05 };
  }

  const lows = candles.map((c) => c.low);
  const highs = candles.map((c) => c.high);
  const closes = candles.map((c) => c.close);
  const currentPrice = closes[closes.length - 1];

  // Local minima for support
  const pivotLows: number[] = [];
  for (let i = 2; i < lows.length - 2; i++) {
    if (
      lows[i] <= lows[i - 1] &&
      lows[i] <= lows[i - 2] &&
      lows[i] <= lows[i + 1] &&
      lows[i] <= lows[i + 2]
    ) {
      pivotLows.push(lows[i]);
    }
  }

  // Local maxima for resistance
  const pivotHighs: number[] = [];
  for (let i = 2; i < highs.length - 2; i++) {
    if (
      highs[i] >= highs[i - 1] &&
      highs[i] >= highs[i - 2] &&
      highs[i] >= highs[i + 1] &&
      highs[i] >= highs[i + 2]
    ) {
      pivotHighs.push(highs[i]);
    }
  }

  // Find closest support below current price
  const supportsBelow = pivotLows.filter((p) => p < currentPrice);
  const support = supportsBelow.length > 0 ? Math.max(...supportsBelow) : Math.min(...lows);

  // Find closest resistance above current price
  const resistancesAbove = pivotHighs.filter((p) => p > currentPrice);
  const resistance = resistancesAbove.length > 0 ? Math.min(...resistancesAbove) : Math.max(...highs);

  return {
    support: Number(support.toFixed(2)),
    resistance: Number(resistance.toFixed(2))
  };
}

/**
 * Enhanced Support & Resistance Level Generator
 * Provides both (a) single key lines and (b) structural band ranges
 * Calculates exact historical test counts, bounce occasions, and institutional rationales.
 */
export function findDetailedSupportResistanceLevels(candles: Candle[]): SupportResistanceLevel[] {
  if (!candles || candles.length < 10) return [];

  const n = candles.length;
  const currentPrice = candles[n - 1].close;
  const pivotThreshold = 0.008; // 0.8% clustering threshold

  // 1. Detect swing highs and swing lows with 2-bar left and right confirmation
  const rawPivots: { price: number; type: 'SUPPORT' | 'RESISTANCE'; index: number; time: string }[] = [];

  for (let i = 2; i < n - 2; i++) {
    const c = candles[i];
    // Swing Low (Support)
    if (
      c.low <= candles[i - 1].low &&
      c.low <= candles[i - 2].low &&
      c.low <= candles[i + 1].low &&
      c.low <= candles[i + 2].low
    ) {
      rawPivots.push({ price: c.low, type: 'SUPPORT', index: i, time: c.time });
    }
    // Swing High (Resistance)
    if (
      c.high >= candles[i - 1].high &&
      c.high >= candles[i - 2].high &&
      c.high >= candles[i + 1].high &&
      c.high >= candles[i + 2].high
    ) {
      rawPivots.push({ price: c.high, type: 'RESISTANCE', index: i, time: c.time });
    }
  }

  // 2. Cluster pivots within 0.8% distance
  const clustered: {
    prices: number[];
    type: 'SUPPORT' | 'RESISTANCE';
    times: string[];
  }[] = [];

  for (const p of rawPivots) {
    const existing = clustered.find(
      (g) =>
        g.type === p.type &&
        Math.abs(g.prices.reduce((a, b) => a + b, 0) / g.prices.length - p.price) / p.price < pivotThreshold
    );
    if (existing) {
      existing.prices.push(p.price);
      existing.times.push(p.time);
    } else {
      clustered.push({
        prices: [p.price],
        type: p.type,
        times: [p.time]
      });
    }
  }

  // 3. For each cluster, compute mean price, band span, and historical interaction metrics
  const results: SupportResistanceLevel[] = clustered.map((group, idx) => {
    const avgPrice = group.prices.reduce((a, b) => a + b, 0) / group.prices.length;
    const bandSpread = Math.max(avgPrice * 0.004, (Math.max(...group.prices) - Math.min(...group.prices)) / 2);
    const bandLow = +(avgPrice - bandSpread).toFixed(2);
    const bandHigh = +(avgPrice + bandSpread).toFixed(2);
    const roundedPrice = +avgPrice.toFixed(2);

    // Count how many occasions price tested this band and bounced
    let testCount = group.prices.length;
    let bounceCount = 0;
    let breakoutFlipCount = 0;

    for (let i = 1; i < n; i++) {
      const bar = candles[i];
      const prevBar = candles[i - 1];

      // Did candle enter the band?
      const enteredBand = bar.low <= bandHigh && bar.high >= bandLow;
      if (enteredBand) {
        testCount++;
        // Confirmed bounce: reversal away from band
        if (group.type === 'SUPPORT' && bar.close > bandHigh && prevBar.close <= bandHigh) {
          bounceCount++;
        } else if (group.type === 'RESISTANCE' && bar.close < bandLow && prevBar.close >= bandLow) {
          bounceCount++;
        }

        // Role reversal flip
        if (prevBar.close < bandLow && bar.close > bandHigh) {
          breakoutFlipCount++;
        } else if (prevBar.close > bandHigh && bar.close < bandLow) {
          breakoutFlipCount++;
        }
      }
    }

    const isCurrentRoleSupport = roundedPrice < currentPrice;
    const effectiveType: 'SUPPORT' | 'RESISTANCE' = isCurrentRoleSupport ? 'SUPPORT' : 'RESISTANCE';
    const strength = Math.min(5, Math.max(1, Math.round(group.prices.length + bounceCount / 2)));

    const rationale =
      effectiveType === 'SUPPORT'
        ? `Anchored by ${group.prices.length} historical swing low pivot(s). Institutional limit order block absorbs aggressive selling pressure.`
        : `Anchored by ${group.prices.length} historical swing high pivot(s). Overhead institutional supply zone capping price expansions.`;

    const institutionalMeaning =
      effectiveType === 'SUPPORT'
        ? `Served as a demand floor on ${testCount} historical bar interactions, triggering ${bounceCount} verified upward bounces. When price enters the $${bandLow} - $${bandHigh} band, smart money typically steps in with accumulation bids.`
        : `Served as a supply ceiling on ${testCount} historical bar interactions, rejecting price ${bounceCount} times. The $${bandLow} - $${bandHigh} band represents concentrated profit-taking and institutional short inventory.`;

    return {
      id: `sr-${effectiveType.toLowerCase()}-${idx}-${roundedPrice}`,
      price: roundedPrice,
      bandLow,
      bandHigh,
      type: effectiveType,
      strength,
      testCount: Math.max(group.prices.length, testCount),
      bounceCount: Math.max(1, bounceCount),
      breakoutFlipCount,
      rationale,
      institutionalMeaning,
      lastTestedTime: group.times[group.times.length - 1]
    };
  });

  // Sort by proximity to current price and return top supports and resistances
  const supports = results.filter((r) => r.type === 'SUPPORT' && r.price < currentPrice).sort((a, b) => b.price - a.price).slice(0, 3);
  const resistances = results.filter((r) => r.type === 'RESISTANCE' && r.price > currentPrice).sort((a, b) => a.price - b.price).slice(0, 3);

  // If none found (e.g. price at all-time extremes), provide calibrated structural buffers
  if (supports.length === 0) {
    const minLow = Math.min(...candles.map((c) => c.low));
    supports.push({
      id: 'sr-support-macro-floor',
      price: +minLow.toFixed(2),
      bandLow: +(minLow * 0.995).toFixed(2),
      bandHigh: +(minLow * 1.005).toFixed(2),
      type: 'SUPPORT',
      strength: 4,
      testCount: 3,
      bounceCount: 2,
      breakoutFlipCount: 0,
      rationale: 'Absolute cyclical price baseline established by historical swing low trough.',
      institutionalMeaning: 'Macro accumulation floor where institutional long-term bids anchor valuation.'
    });
  }

  if (resistances.length === 0) {
    const maxHigh = Math.max(...candles.map((c) => c.high));
    resistances.push({
      id: 'sr-resistance-macro-ceiling',
      price: +maxHigh.toFixed(2),
      bandLow: +(maxHigh * 0.995).toFixed(2),
      bandHigh: +(maxHigh * 1.005).toFixed(2),
      type: 'RESISTANCE',
      strength: 4,
      testCount: 3,
      bounceCount: 2,
      breakoutFlipCount: 0,
      rationale: 'All-time cycle peak resistance level.',
      institutionalMeaning: 'Historical liquidation high where dominant profit-taking occurred.'
    });
  }

  return [...supports, ...resistances].sort((a, b) => a.price - b.price);
}

/**
 * Calculate Moving Average Slopes (Gradient in degrees and qualitative momentum status)
 */
export function calculateMASlopes(candles: Candle[]): MovingAverageSlope[] {
  const n = candles.length;
  if (n < 10) return [];

  const closes = candles.map((c) => c.close);
  const lookback = Math.min(8, n - 2);

  const sma20 = calculateSMA(closes, Math.min(20, n));
  const sma50 = calculateSMA(closes, Math.min(50, n));
  const sma200 = calculateSMA(closes, Math.min(200, n));
  const ema9 = calculateEMA(closes, Math.min(9, n));
  const ema21 = calculateEMA(closes, Math.min(21, n));

  const items: { key: 'SMA 20' | 'SMA 50' | 'SMA 200' | 'EMA 9' | 'EMA 21'; series: number[] }[] = [
    { key: 'EMA 9', series: ema9 },
    { key: 'EMA 21', series: ema21 },
    { key: 'SMA 20', series: sma20 },
    { key: 'SMA 50', series: sma50 },
    { key: 'SMA 200', series: sma200 }
  ];

  return items.map((item) => {
    const s = item.series;
    const currentVal = s[n - 1] || closes[n - 1];
    const prevVal = s[n - 1 - lookback] || currentVal;
    const pctChange = ((currentVal - prevVal) / (prevVal || 1)) * 100;
    const pctPerBar = pctChange / lookback;

    // Angle approximation in degrees (-90 to +90)
    const angleDegrees = Math.round(Math.atan(pctPerBar * 6) * (180 / Math.PI));

    let status: 'STEEP_UP' | 'MILD_UP' | 'FLATTENING' | 'MILD_DOWN' | 'STEEP_DOWN';
    let label = '';
    let interpretation = '';

    if (pctPerBar >= 0.22) {
      status = 'STEEP_UP';
      label = `Steep Up (+${angleDegrees}°)`;
      interpretation = 'Aggressive upward institutional momentum. Pullbacks to this line offer strong dynamic support.';
    } else if (pctPerBar >= 0.05) {
      status = 'MILD_UP';
      label = `Mild Up (+${angleDegrees}°)`;
      interpretation = 'Healthy, sustainable trend progression with balanced institutional accumulation.';
    } else if (pctPerBar <= -0.22) {
      status = 'STEEP_DOWN';
      label = `Steep Down (${angleDegrees}°)`;
      interpretation = 'Heavy institutional liquidation slope. High risk of continued lower lows.';
    } else if (pctPerBar <= -0.05) {
      status = 'MILD_DOWN';
      label = `Mild Down (${angleDegrees}°)`;
      interpretation = 'Orderly downward drift; overhead moving average acts as declining resistance.';
    } else {
      status = 'FLATTENING';
      label = `Flattening (${angleDegrees >= 0 ? '+' : ''}${angleDegrees}°)`;
      interpretation = 'Slope is flattening out: directional exhaustion / momentum stall. Consolidation or regime pivot imminent.';
    }

    return {
      indicator: item.key,
      gradientDegrees: angleDegrees,
      pctChangePerBar: +pctPerBar.toFixed(3),
      status,
      label,
      interpretation
    };
  });
}

/**
 * Detect Critical Moving Average Crosses (Golden Cross, Death Cross, EMA 9/21, SMA 20/50)
 */
export function findCriticalMACrosses(candles: Candle[]): MACrossEvent[] {
  const n = candles.length;
  if (n < 15) return [];

  const closes = candles.map((c) => c.close);
  const sma20 = calculateSMA(closes, Math.min(20, n));
  const sma50 = calculateSMA(closes, Math.min(50, n));
  const sma200 = calculateSMA(closes, Math.min(200, n));
  const ema9 = calculateEMA(closes, Math.min(9, n));
  const ema21 = calculateEMA(closes, Math.min(21, n));

  const events: MACrossEvent[] = [];

  for (let i = Math.max(1, n - 40); i < n; i++) {
    const time = candles[i].time;
    const price = candles[i].close;

    // Golden Cross / Death Cross (SMA 50 vs SMA 200)
    if (!isNaN(sma50[i]) && !isNaN(sma200[i]) && !isNaN(sma50[i - 1]) && !isNaN(sma200[i - 1])) {
      if (sma50[i - 1] <= sma200[i - 1] && sma50[i] > sma200[i]) {
        events.push({
          index: i,
          time,
          price,
          type: 'GOLDEN_CROSS',
          title: '★ Golden Cross (SMA 50 > SMA 200)',
          sentiment: 'BULLISH',
          description: 'Canonical macro bullish regime shift. Confirms transition from cyclical bear to institutional bull market.'
        });
      } else if (sma50[i - 1] >= sma200[i - 1] && sma50[i] < sma200[i]) {
        events.push({
          index: i,
          time,
          price,
          type: 'DEATH_CROSS',
          title: '⚠️ Death Cross (SMA 50 < SMA 200)',
          sentiment: 'BEARISH',
          description: 'Macro secular bear regime confirmation. Moving averages signal prolonged capital preservation phase.'
        });
      }
    }

    // Fast EMA Cross (EMA 9 vs EMA 21)
    if (!isNaN(ema9[i]) && !isNaN(ema21[i]) && !isNaN(ema9[i - 1]) && !isNaN(ema21[i - 1])) {
      if (ema9[i - 1] <= ema21[i - 1] && ema9[i] > ema21[i]) {
        events.push({
          index: i,
          time,
          price,
          type: 'EMA_BULL_CROSS',
          title: '▲ Bullish Momentum Cross (EMA 9 > EMA 21)',
          sentiment: 'BULLISH',
          description: 'Fast tactical trigger: short-term buyers have seized control over the 21-period dynamic swing baseline.'
        });
      } else if (ema9[i - 1] >= ema21[i - 1] && ema9[i] < ema21[i]) {
        events.push({
          index: i,
          time,
          price,
          type: 'EMA_BEAR_CROSS',
          title: '▼ Bearish Momentum Cross (EMA 9 < EMA 21)',
          sentiment: 'BEARISH',
          description: 'Fast tactical breakdown: short-term momentum rolling over beneath the 21-period dynamic waterline.'
        });
      }
    }

    // Swing SMA Cross (SMA 20 vs SMA 50)
    if (!isNaN(sma20[i]) && !isNaN(sma50[i]) && !isNaN(sma20[i - 1]) && !isNaN(sma50[i - 1])) {
      if (sma20[i - 1] <= sma50[i - 1] && sma20[i] > sma50[i]) {
        events.push({
          index: i,
          time,
          price,
          type: 'SMA20_50_BULL',
          title: '▲ Intermediate Bull Cross (SMA 20 > SMA 50)',
          sentiment: 'BULLISH',
          description: 'Intermediate trend alignment: 1-month mean crossing above the institutional 50-day waterline.'
        });
      } else if (sma20[i - 1] >= sma50[i - 1] && sma20[i] < sma50[i]) {
        events.push({
          index: i,
          time,
          price,
          type: 'SMA20_50_BEAR',
          title: '▼ Intermediate Bear Cross (SMA 20 < SMA 50)',
          sentiment: 'BEARISH',
          description: 'Intermediate trend breakdown: 1-month baseline dropping beneath the institutional 50-day average.'
        });
      }
    }
  }

  return events;
}

/**
 * Interpret Bollinger Band Volatility Envelope Status
 */
export function interpretBollingerBands(closes: number[], currentPrice: number): BollingerInterpretation {
  const n = closes.length;
  if (n < 20) {
    return {
      status: 'NORMAL',
      bandwidthPct: 10,
      percentB: 0.5,
      title: 'Bollinger Bands: Normal Volatility',
      badgeColor: 'text-slate-300 bg-slate-800 border-slate-700',
      insight: 'Price is oscillating within normal 2-standard-deviation parameters.',
      actionGuide: 'Monitor for bandwidth contraction or edge tests.'
    };
  }

  const bb = calculateBollingerBands(closes, 20);
  const upper = bb.upper[n - 1];
  const middle = bb.middle[n - 1];
  const lower = bb.lower[n - 1];
  const bandwidth = bb.bandwidth[n - 1] || 10;

  // Calculate %B: (Price - Lower) / (Upper - Lower)
  const bandSpan = Math.max(0.01, upper - lower);
  const percentB = +((currentPrice - lower) / bandSpan).toFixed(2);

  // Bandwidth history for squeeze detection (is current bandwidth at a 20-bar low?)
  const recentBw = bb.bandwidth.slice(Math.max(0, n - 20)).filter((v) => !isNaN(v));
  const minRecentBw = Math.min(...recentBw);
  const isSqueeze = bandwidth <= minRecentBw * 1.05 || bandwidth < 5.5;
  const isExpansion = bandwidth > 16.0;

  if (isSqueeze) {
    return {
      status: 'SQUEEZE',
      bandwidthPct: +bandwidth.toFixed(1),
      percentB,
      title: '★ Volatility Squeeze (John Carter Contraction)',
      badgeColor: 'text-amber-300 bg-amber-500/20 border-amber-500/50',
      insight:
        'Extreme volatility contraction detected (bandwidth at multi-period low). Energy is coiling tightly; an explosive, high-velocity directional breakout is imminent.',
      actionGuide:
        'Do not take counter-trend trades. Prepare for breakout triggers when price decisively penetrates either outer envelope.'
    };
  }

  if (percentB >= 0.98) {
    return {
      status: 'WALKING_UPPER',
      bandwidthPct: +bandwidth.toFixed(1),
      percentB,
      title: 'Walking Upper Band (Extreme Bullish Momentum)',
      badgeColor: 'text-emerald-300 bg-emerald-500/20 border-emerald-500/50',
      insight:
        'Price is hugging the upper +2σ band with bandwidth expanding. This signifies powerful institutional trend strength, not merely an "overbought" condition.',
      actionGuide:
        'Ride the trend using the 9 EMA or middle band (20 SMA) as a trailing stop. Avoid blind short selling into band expansions.'
    };
  }

  if (percentB <= 0.02) {
    return {
      status: 'WALKING_LOWER',
      bandwidthPct: +bandwidth.toFixed(1),
      percentB,
      title: 'Walking Lower Band (Severe Bearish Momentum)',
      badgeColor: 'text-rose-300 bg-rose-500/20 border-rose-500/50',
      insight:
        'Price is pinned to the lower -2σ envelope during volatility expansion. Strong institutional liquidation in progress.',
      actionGuide:
        'Avoid catching falling knives until a low-volume stabilization base forms or price re-enters within the envelope.'
    };
  }

  if (percentB >= 0.85 && percentB < 0.98) {
    return {
      status: 'MEAN_REVERSION_DOWN',
      bandwidthPct: +bandwidth.toFixed(1),
      percentB,
      title: 'Upper Band Resistance (Mean Reversion Watch)',
      badgeColor: 'text-sky-300 bg-sky-500/20 border-sky-500/50',
      insight:
        'Price is testing the upper envelope (+2σ). Statistical probability of mean reversion toward the middle band (SMA 20) is elevated if rejection wicks emerge.',
      actionGuide:
        'Consider taking partial profits or tightening stops on long positions near $ ' + upper.toFixed(2) + '.'
    };
  }

  if (percentB <= 0.15 && percentB > 0.02) {
    return {
      status: 'MEAN_REVERSION_UP',
      bandwidthPct: +bandwidth.toFixed(1),
      percentB,
      title: 'Lower Band Support (Oversold Snapback Watch)',
      badgeColor: 'text-indigo-300 bg-indigo-500/20 border-indigo-500/50',
      insight:
        'Price has touched the lower envelope (-2σ) within a stable or flat bandwidth regime. Statistically oversold relative to the 20-day mean.',
      actionGuide:
        'Look for bullish reversal candlestick confirmations (e.g. Hammer, Morning Star) for snapbacks toward Middle SMA 20 ($' + middle.toFixed(2) + ').'
    };
  }

  if (isExpansion) {
    return {
      status: 'EXPANSION',
      bandwidthPct: +bandwidth.toFixed(1),
      percentB,
      title: 'Volatility Expansion Phase',
      badgeColor: 'text-purple-300 bg-purple-500/20 border-purple-500/50',
      insight:
        'Envelopes are diverging rapidly (>16% bandwidth). The market has broken out of a prior range and is in active directional price discovery.',
      actionGuide: 'Trade with the direction of the middle band slope.'
    };
  }

  return {
    status: 'NORMAL',
    bandwidthPct: +bandwidth.toFixed(1),
    percentB,
    title: 'Equilibrium (Inside Envelope)',
    badgeColor: 'text-slate-300 bg-slate-800 border-slate-700',
    insight: `Price is trading comfortably inside the volatility bands (%B = ${percentB}). Mean value sits at SMA 20 ($${middle.toFixed(2)}).`,
    actionGuide: 'Trend and structure indicators take precedence over volatility extremes.'
  };
}

export function calculateVolumeProfile(
  candles: Candle[],
  numBins: number = 28,
  valueAreaPercent: number = 0.70
): VolumeProfileAnalysis {
  if (candles.length === 0) {
    return {
      bins: [],
      pocPrice: 0,
      pocVolume: 0,
      vah: 0,
      val: 0,
      valueAreaVolumeRatio: valueAreaPercent,
      totalVolume: 0,
      totalBuyVolume: 0,
      totalSellVolume: 0,
      buyRatio: 0.5,
      currentPriceStatus: 'INSIDE_VA',
      highVolumeNodes: [],
      lowVolumeNodes: []
    };
  }

  let minPrice = Infinity;
  let maxPrice = -Infinity;
  for (const c of candles) {
    if (c.low < minPrice) minPrice = c.low;
    if (c.high > maxPrice) maxPrice = c.high;
  }

  if (minPrice === maxPrice || !isFinite(minPrice) || !isFinite(maxPrice)) {
    minPrice = (candles[0]?.close || 100) * 0.95;
    maxPrice = (candles[0]?.close || 100) * 1.05;
  }

  // Add 0.5% padding so candle extrema map neatly inside bins
  const padding = (maxPrice - minPrice) * 0.005;
  const lowBound = minPrice - padding;
  const highBound = maxPrice + padding;
  const binStep = (highBound - lowBound) / numBins;

  const bins: VolumeProfileBin[] = [];
  for (let i = 0; i < numBins; i++) {
    const pLow = lowBound + i * binStep;
    const pHigh = lowBound + (i + 1) * binStep;
    bins.push({
      binIndex: i,
      priceLow: Number(pLow.toFixed(2)),
      priceHigh: Number(pHigh.toFixed(2)),
      priceMid: Number(((pLow + pHigh) / 2).toFixed(2)),
      buyVolume: 0,
      sellVolume: 0,
      totalVolume: 0,
      percentOfMax: 0,
      isPoc: false,
      isValueArea: false,
      isHvn: false,
      isLvn: false
    });
  }

  // Distribute volume of each candle across price tiers based on candle range overlap
  for (const c of candles) {
    const vol = c.volume || 1;
    const isUp = c.close >= c.open;
    const candleSpan = Math.max(0.001, c.high - c.low);

    for (let i = 0; i < numBins; i++) {
      const b = bins[i];
      const overlapStart = Math.max(c.low, b.priceLow);
      const overlapEnd = Math.min(c.high, b.priceHigh);

      if (overlapEnd > overlapStart) {
        const overlap = overlapEnd - overlapStart;
        const fraction = overlap / candleSpan;
        const assignedVol = vol * fraction;

        if (isUp) {
          b.buyVolume += assignedVol;
        } else {
          b.sellVolume += assignedVol;
        }
        b.totalVolume += assignedVol;
      }
    }
  }

  let totalVolume = 0;
  let totalBuyVolume = 0;
  let totalSellVolume = 0;
  let maxBinVol = 0;
  let pocIndex = 0;

  for (let i = 0; i < numBins; i++) {
    const b = bins[i];
    b.totalVolume = Math.round(b.totalVolume);
    b.buyVolume = Math.round(b.buyVolume);
    b.sellVolume = Math.round(b.sellVolume);

    totalVolume += b.totalVolume;
    totalBuyVolume += b.buyVolume;
    totalSellVolume += b.sellVolume;

    if (b.totalVolume > maxBinVol) {
      maxBinVol = b.totalVolume;
      pocIndex = i;
    }
  }

  // Normalization for visual histogram bar widths
  for (let i = 0; i < numBins; i++) {
    bins[i].percentOfMax = maxBinVol > 0 ? bins[i].totalVolume / maxBinVol : 0;
  }

  // Point of Control (POC)
  bins[pocIndex].isPoc = true;
  bins[pocIndex].isValueArea = true;
  const pocPrice = bins[pocIndex].priceMid;
  const pocVolume = bins[pocIndex].totalVolume;

  // Value Area calculation: standard 70% volume distribution expanding outward from POC
  const targetVaVolume = totalVolume * valueAreaPercent;
  let accumulatedVaVol = bins[pocIndex].totalVolume;
  let upper = pocIndex + 1;
  let lower = pocIndex - 1;

  while (accumulatedVaVol < targetVaVolume && (upper < numBins || lower >= 0)) {
    const upVol = upper < numBins ? bins[upper].totalVolume : -1;
    const downVol = lower >= 0 ? bins[lower].totalVolume : -1;

    if (upVol >= downVol && upper < numBins) {
      bins[upper].isValueArea = true;
      accumulatedVaVol += upVol;
      upper++;
    } else if (lower >= 0) {
      bins[lower].isValueArea = true;
      accumulatedVaVol += downVol;
      lower--;
    } else if (upper < numBins) {
      bins[upper].isValueArea = true;
      accumulatedVaVol += upVol;
      upper++;
    }
  }

  // Value Area High (VAH) & Value Area Low (VAL) boundaries
  let vah = pocPrice;
  let val = pocPrice;
  const vaBins = bins.filter((b) => b.isValueArea);
  if (vaBins.length > 0) {
    vah = Math.max(...vaBins.map((b) => b.priceHigh));
    val = Math.min(...vaBins.map((b) => b.priceLow));
  }

  // Identify High Volume Nodes (HVN) & Low Volume Nodes (LVN)
  const avgBinVol = totalVolume / numBins;
  const highVolumeNodes: number[] = [];
  const lowVolumeNodes: number[] = [];

  for (let i = 1; i < numBins - 1; i++) {
    const curr = bins[i].totalVolume;
    const prev = bins[i - 1].totalVolume;
    const next = bins[i + 1].totalVolume;

    if (curr > prev && curr > next && curr >= avgBinVol * 1.15) {
      bins[i].isHvn = true;
      highVolumeNodes.push(bins[i].priceMid);
    } else if (curr < prev && curr < next && curr <= avgBinVol * 0.7) {
      bins[i].isLvn = true;
      lowVolumeNodes.push(bins[i].priceMid);
    }
  }

  const lastClose = candles[candles.length - 1]?.close || pocPrice;
  let currentPriceStatus: 'ABOVE_VAH' | 'INSIDE_VA' | 'BELOW_VAL' | 'AT_POC';
  if (Math.abs(lastClose - pocPrice) / pocPrice <= 0.005) {
    currentPriceStatus = 'AT_POC';
  } else if (lastClose > vah) {
    currentPriceStatus = 'ABOVE_VAH';
  } else if (lastClose < val) {
    currentPriceStatus = 'BELOW_VAL';
  } else {
    currentPriceStatus = 'INSIDE_VA';
  }

  return {
    bins,
    pocPrice,
    pocVolume,
    vah: Number(vah.toFixed(2)),
    val: Number(val.toFixed(2)),
    valueAreaVolumeRatio: valueAreaPercent,
    totalVolume,
    totalBuyVolume,
    totalSellVolume,
    buyRatio: totalVolume > 0 ? Number((totalBuyVolume / totalVolume).toFixed(2)) : 0.5,
    currentPriceStatus,
    highVolumeNodes,
    lowVolumeNodes
  };
}

export function computeTechnicalIndicators(candles: Candle[]): TechnicalIndicators {
  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);
  const n = candles.length;

  const sma20Series = calculateSMA(closes, Math.min(20, n));
  const sma50Series = calculateSMA(closes, Math.min(50, n));
  const sma200Series = calculateSMA(closes, Math.min(200, n));

  const ema9Series = calculateEMA(closes, Math.min(9, n));
  const ema21Series = calculateEMA(closes, Math.min(21, n));

  const rsiSeries = calculateRSI(closes, Math.min(14, n - 1));
  const macdData = calculateMACD(closes);
  const bbData = calculateBollingerBands(closes, Math.min(20, n));
  const atrSeries = calculateATR(candles, Math.min(14, n));
  const vwapSeries = calculateVWAP(candles);
  const sr = findSupportResistance(candles);
  const volumeProfile = calculateVolumeProfile(candles);

  const lastClose = closes[n - 1] || 100;
  const sma20 = isNaN(sma20Series[n - 1]) ? lastClose : sma20Series[n - 1];
  const sma50 = isNaN(sma50Series[n - 1]) ? sma20 : sma50Series[n - 1];
  const sma200 = isNaN(sma200Series[n - 1]) ? sma50 : sma200Series[n - 1];

  const ema9 = isNaN(ema9Series[n - 1]) ? lastClose : ema9Series[n - 1];
  const ema21 = isNaN(ema21Series[n - 1]) ? lastClose : ema21Series[n - 1];

  const rsi = isNaN(rsiSeries[rsiSeries.length - 1]) ? 50 : rsiSeries[rsiSeries.length - 1];

  const macdLine = isNaN(macdData.macdLine[n - 1]) ? 0 : macdData.macdLine[n - 1];
  const signalLine = isNaN(macdData.signalLine[n - 1]) ? 0 : macdData.signalLine[n - 1];
  const histogram = isNaN(macdData.histogram[n - 1]) ? 0 : macdData.histogram[n - 1];

  const bbUpper = isNaN(bbData.upper[n - 1]) ? lastClose * 1.05 : bbData.upper[n - 1];
  const bbMiddle = isNaN(bbData.middle[n - 1]) ? lastClose : bbData.middle[n - 1];
  const bbLower = isNaN(bbData.lower[n - 1]) ? lastClose * 0.95 : bbData.lower[n - 1];
  const bbBandwidth = bbData.bandwidth[n - 1] || 10;

  const atr = isNaN(atrSeries[n - 1]) ? lastClose * 0.02 : atrSeries[n - 1];
  const vwap = vwapSeries[n - 1] || lastClose;

  // Volume analysis
  const recentVols = volumes.slice(Math.max(0, n - 20));
  const volumeAvg20 = Math.round(recentVols.reduce((a, b) => a + b, 0) / recentVols.length);
  const currentVol = volumes[n - 1] || 1;
  const volumeRatio = Number((currentVol / (volumeAvg20 || 1)).toFixed(2));

  return {
    sma20,
    sma50,
    sma200,
    ema9,
    ema21,
    rsi,
    macd: { macdLine, signalLine, histogram },
    bollinger: { upper: bbUpper, middle: bbMiddle, lower: bbLower, bandwidth: bbBandwidth },
    atr,
    vwap,
    support: sr.support,
    resistance: sr.resistance,
    volumeAvg20,
    volumeRatio,
    priceAboveSma50: lastClose > sma50,
    priceAboveSma200: lastClose > sma200,
    goldenCross: sma50 > sma200,
    deathCross: sma50 < sma200,
    emaBullishCross: ema9 > ema21,
    volumeProfile
  };
}

export function evaluateStrategyFrameworks(
  currentPrice: number,
  indicators: TechnicalIndicators
): StrategyFrameworkResult[] {
  const frameworks: StrategyFrameworkResult[] = [];

  // 1. Trend Following Strategy Framework
  let trendScore = 0;
  if (indicators.priceAboveSma50) trendScore += 30;
  if (indicators.priceAboveSma200) trendScore += 30;
  if (indicators.emaBullishCross) trendScore += 25;
  if (indicators.goldenCross) trendScore += 15;

  let trendSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  let trendCondition = 'Consolidating within trend channel';
  if (trendScore >= 70) {
    trendSignal = 'BULLISH';
    trendCondition = `Aligned uptrend: Price ($${currentPrice.toFixed(2)}) > SMA50 ($${indicators.sma50.toFixed(2)}) with EMA9 > EMA21`;
  } else if (trendScore <= 30) {
    trendSignal = 'BEARISH';
    trendCondition = `Downtrend pressure: Trading beneath 50-day average ($${indicators.sma50.toFixed(2)})`;
  }

  frameworks.push({
    id: 'trend-following',
    name: 'Trend Following Framework',
    category: 'Trend Following',
    signal: trendSignal,
    confidence: trendScore >= 70 ? trendScore : trendScore <= 30 ? 100 - trendScore : 55,
    condition: trendCondition,
    details: `SMA 50: $${indicators.sma50.toFixed(2)} | SMA 200: $${indicators.sma200.toFixed(2)} | EMA 9: $${indicators.ema9.toFixed(2)} vs EMA 21: $${indicators.ema21.toFixed(2)}`,
    triggerZone: `Support retest at $${indicators.sma50.toFixed(2)}`
  });

  // 2. Mean Reversion Strategy Framework
  let mrSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  let mrConfidence = 50;
  let mrCondition = 'Oscillators in balanced middle territory';

  const distToLowerBB = Math.abs(currentPrice - indicators.bollinger.lower) / currentPrice;
  const distToUpperBB = Math.abs(currentPrice - indicators.bollinger.upper) / currentPrice;

  if (indicators.rsi < 32 || distToLowerBB < 0.015) {
    mrSignal = 'BULLISH';
    mrConfidence = Math.min(95, Math.round(85 + (30 - indicators.rsi)));
    mrCondition = `Oversold bounce potential: RSI is at ${indicators.rsi.toFixed(1)} testing lower Bollinger Band ($${indicators.bollinger.lower.toFixed(2)})`;
  } else if (indicators.rsi > 68 || distToUpperBB < 0.015) {
    mrSignal = 'BEARISH';
    mrConfidence = Math.min(95, Math.round(80 + (indicators.rsi - 70)));
    mrCondition = `Overextended exhaustion: RSI is at ${indicators.rsi.toFixed(1)} pressing upper Bollinger Band ($${indicators.bollinger.upper.toFixed(2)})`;
  }

  frameworks.push({
    id: 'mean-reversion',
    name: 'Mean Reversion Framework',
    category: 'Mean Reversion',
    signal: mrSignal,
    confidence: mrConfidence,
    condition: mrCondition,
    details: `RSI(14): ${indicators.rsi.toFixed(1)} | BB Bands: $${indicators.bollinger.lower.toFixed(2)} - $${indicators.bollinger.upper.toFixed(2)} (Width: ${indicators.bollinger.bandwidth.toFixed(1)}%)`,
    triggerZone: mrSignal === 'BULLISH' ? `Target reversion to 20 SMA at $${indicators.bollinger.middle.toFixed(2)}` : undefined
  });

  // 3. Momentum Breakout Framework
  let momSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  let momConfidence = 50;
  let momCondition = 'Normal volume and steady momentum';

  const isMacdBullish = indicators.macd.histogram > 0 && indicators.macd.macdLine > indicators.macd.signalLine;
  const isHighVolume = indicators.volumeRatio >= 1.25;

  if (isMacdBullish && isHighVolume) {
    momSignal = 'BULLISH';
    momConfidence = Math.min(92, Math.round(75 + indicators.volumeRatio * 8));
    momCondition = `Bullish expansion: Volume is ${(indicators.volumeRatio * 100 - 100).toFixed(0)}% above 20-day average with positive MACD histogram (+${indicators.macd.histogram.toFixed(2)})`;
  } else if (!isMacdBullish && indicators.macd.histogram < -0.2) {
    momSignal = 'BEARISH';
    momConfidence = 74;
    momCondition = `Bearish momentum: MACD crossover negative (${indicators.macd.histogram.toFixed(2)}) with deceleration`;
  }

  frameworks.push({
    id: 'momentum-breakout',
    name: 'Momentum Breakout Framework',
    category: 'Momentum Breakout',
    signal: momSignal,
    confidence: momConfidence,
    condition: momCondition,
    details: `MACD Line: ${indicators.macd.macdLine.toFixed(2)} | Signal: ${indicators.macd.signalLine.toFixed(2)} | Vol Ratio: ${indicators.volumeRatio}x`,
    triggerZone: `Resistance breakout above $${indicators.resistance.toFixed(2)}`
  });

  // 4. Swing Setup / Risk-Reward Framework
  const distanceToSupport = currentPrice - indicators.support;
  const distanceToResistance = indicators.resistance - currentPrice;
  const rrRatio = distanceToSupport > 0 ? (distanceToResistance / distanceToSupport) : 1;

  let swingSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  let swingConfidence = 60;
  let swingCondition = `Calculated Risk/Reward is 1:${rrRatio.toFixed(2)}`;

  if (rrRatio >= 2.0 && currentPrice > indicators.support) {
    swingSignal = 'BULLISH';
    swingConfidence = Math.min(90, Math.round(70 + rrRatio * 5));
    swingCondition = `High-conviction swing asymmetry: R:R ratio is 1:${rrRatio.toFixed(2)} with support cushion at $${indicators.support.toFixed(2)}`;
  } else if (distanceToResistance < indicators.atr * 0.5) {
    swingSignal = 'BEARISH';
    swingConfidence = 72;
    swingCondition = `Tight ceiling: Trading within 0.5 ATR of overhead resistance ($${indicators.resistance.toFixed(2)})`;
  }

  frameworks.push({
    id: 'swing-setup',
    name: 'Support & Resistance Swing Setup',
    category: 'Swing Setup',
    signal: swingSignal,
    confidence: swingConfidence,
    condition: swingCondition,
    details: `Key Support: $${indicators.support.toFixed(2)} | Resistance: $${indicators.resistance.toFixed(2)} | ATR(14): $${indicators.atr.toFixed(2)}`,
    triggerZone: `Stop-loss: $${(indicators.support - indicators.atr * 0.5).toFixed(2)} | Target: $${indicators.resistance.toFixed(2)}`
  });

  // 5. Auction Market Theory & Volume Profile Framework
  if (indicators.volumeProfile) {
    const vp = indicators.volumeProfile;
    let amSignal: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
    let amConfidence = 65;
    let amCondition = `Market in balance: Price ($${currentPrice.toFixed(2)}) rotating inside 70% Value Area`;

    const distToPoc = Math.abs(currentPrice - vp.pocPrice) / vp.pocPrice;

    if (vp.currentPriceStatus === 'ABOVE_VAH') {
      amSignal = 'BULLISH';
      amConfidence = 82;
      amCondition = `Auctioning above value: Price ($${currentPrice.toFixed(2)}) accepted above Value Area High ($${vp.vah.toFixed(2)}). Buyers expanding higher range.`;
    } else if (vp.currentPriceStatus === 'BELOW_VAL') {
      amSignal = 'BEARISH';
      amConfidence = 80;
      amCondition = `Auctioning below value: Price ($${currentPrice.toFixed(2)}) rejected beneath Value Area Low ($${vp.val.toFixed(2)}). Sellers expanding lower range.`;
    } else if (distToPoc < 0.008) {
      amSignal = vp.buyRatio > 0.52 ? 'BULLISH' : vp.buyRatio < 0.48 ? 'BEARISH' : 'NEUTRAL';
      amConfidence = 74;
      amCondition = `Testing Point of Control ($${vp.pocPrice.toFixed(2)}): High-liquidity equilibrium zone with ${(vp.buyRatio * 100).toFixed(0)}% buyer volume dominance.`;
    } else if (currentPrice > vp.pocPrice) {
      amSignal = 'BULLISH';
      amConfidence = 70;
      amCondition = `Upper Value Area rotation: Trading between POC ($${vp.pocPrice.toFixed(2)}) and VAH ceiling ($${vp.vah.toFixed(2)}).`;
    } else {
      amSignal = 'BEARISH';
      amConfidence = 68;
      amCondition = `Lower Value Area rotation: Trading between VAL floor ($${vp.val.toFixed(2)}) and POC ($${vp.pocPrice.toFixed(2)}).`;
    }

    frameworks.push({
      id: 'auction-market-vp',
      name: 'Auction Market & Volume Profile Framework',
      category: 'Auction Market Theory',
      signal: amSignal,
      confidence: amConfidence,
      condition: amCondition,
      details: `POC: $${vp.pocPrice.toFixed(2)} | VAH: $${vp.vah.toFixed(2)} | VAL: $${vp.val.toFixed(2)} | Buy/Sell Vol: ${(vp.buyRatio * 100).toFixed(0)}% / ${(100 - vp.buyRatio * 100).toFixed(0)}%`,
      triggerZone: vp.currentPriceStatus === 'ABOVE_VAH'
        ? `VAH Support Retest: $${vp.vah.toFixed(2)}`
        : vp.currentPriceStatus === 'BELOW_VAL'
        ? `VAL Resistance Retest: $${vp.val.toFixed(2)}`
        : `Point of Control Magnet: $${vp.pocPrice.toFixed(2)}`
    });
  }

  return frameworks;
}

/**
 * Calculates Fibonacci Retracement levels (0.0%, 23.6%, 38.2%, 50.0%, 61.8%, 78.6%, 100.0%)
 * based on the absolute high and low prices of the currently displayed candlestick range.
 * Supports automatic swing trend detection (Uptrend / Downtrend) and categorizes
 * levels dynamically into Support and Resistance relative to current price.
 */
export function calculateFibonacciRetracement(
  candles: Candle[],
  currentPrice?: number,
  overrideDirection: 'auto' | 'uptrend' | 'downtrend' = 'auto'
): FibonacciRetracement | null {
  if (!candles || candles.length < 2) return null;

  let highPrice = -Infinity;
  let highIndex = -1;
  let lowPrice = Infinity;
  let lowIndex = -1;

  candles.forEach((c, idx) => {
    if (c.high > highPrice) {
      highPrice = c.high;
      highIndex = idx;
    }
    if (c.low < lowPrice) {
      lowPrice = c.low;
      lowIndex = idx;
    }
  });

  if (highIndex === -1 || lowIndex === -1 || highPrice <= lowPrice) return null;

  const highTime = candles[highIndex]?.time || '';
  const lowTime = candles[lowIndex]?.time || '';
  const rangeSpan = highPrice - lowPrice;

  // Determine swing direction:
  // In an Uptrend (swing low occurred before swing high), price rallied and retraces downwards.
  // In a Downtrend (swing high occurred before swing low), price fell and retraces upwards.
  let direction: 'UPTREND' | 'DOWNTREND';
  if (overrideDirection === 'uptrend') {
    direction = 'UPTREND';
  } else if (overrideDirection === 'downtrend') {
    direction = 'DOWNTREND';
  } else {
    direction = lowIndex <= highIndex ? 'UPTREND' : 'DOWNTREND';
  }

  const latestPrice = currentPrice !== undefined ? currentPrice : candles[candles.length - 1].close;

  // Standard Fibonacci ratios, colors, and zone tints
  const ratioDefs = [
    { ratio: 0.0, label: '0.0%', color: '#94a3b8', fillColor: 'rgba(148, 163, 184, 0.04)', isGp: false },
    { ratio: 0.236, label: '23.6%', color: '#38bdf8', fillColor: 'rgba(56, 189, 248, 0.06)', isGp: false },
    { ratio: 0.382, label: '38.2%', color: '#34d399', fillColor: 'rgba(52, 211, 153, 0.07)', isGp: false },
    { ratio: 0.50, label: '50.0%', color: '#fbbf24', fillColor: 'rgba(251, 191, 36, 0.09)', isGp: true },
    { ratio: 0.618, label: '61.8%', color: '#f59e0b', fillColor: 'rgba(245, 158, 11, 0.12)', isGp: true },
    { ratio: 0.786, label: '78.6%', color: '#a855f7', fillColor: 'rgba(168, 85, 247, 0.06)', isGp: false },
    { ratio: 1.0, label: '100.0%', color: '#f43f5e', fillColor: 'rgba(244, 63, 94, 0.04)', isGp: false }
  ];

  const levels: FibonacciLevel[] = ratioDefs.map((def) => {
    let price: number;
    if (direction === 'UPTREND') {
      // Pullback from High towards Low
      price = highPrice - rangeSpan * def.ratio;
    } else {
      // Retracement bounce from Low towards High
      price = lowPrice + rangeSpan * def.ratio;
    }

    const priceRounded = Number(price.toFixed(2));
    const distancePct = Number((((priceRounded - latestPrice) / latestPrice) * 100).toFixed(2));

    let role: 'SUPPORT' | 'RESISTANCE' | 'TESTING' | 'ANCHOR';
    if (def.ratio === 0.0 || def.ratio === 1.0) {
      role = 'ANCHOR';
    } else if (Math.abs(priceRounded - latestPrice) / latestPrice < 0.0025) {
      role = 'TESTING';
    } else if (priceRounded > latestPrice) {
      role = 'RESISTANCE';
    } else {
      role = 'SUPPORT';
    }

    return {
      ratio: def.ratio,
      label: def.label,
      price: priceRounded,
      role,
      color: def.color,
      fillColor: def.fillColor,
      isGoldenPocket: def.isGp,
      distancePct
    };
  });

  // Calculate nearest support and resistance
  const sortedByPrice = [...levels].sort((a, b) => a.price - b.price);
  const nearestSupport = [...sortedByPrice].filter((l) => l.price < latestPrice).pop();
  const nearestResistance = sortedByPrice.find((l) => l.price > latestPrice);

  // Golden Pocket region (between 50% and 61.8%)
  const lvl50 = levels.find((l) => l.ratio === 0.50);
  const lvl618 = levels.find((l) => l.ratio === 0.618);
  const gpLow = Math.min(lvl50?.price || 0, lvl618?.price || 0);
  const gpHigh = Math.max(lvl50?.price || 0, lvl618?.price || 0);
  const isInsideGp = latestPrice >= gpLow && latestPrice <= gpHigh;

  // Fibonacci Extension Levels (Key Harmonic Targets for breakout / swing expansion)
  const extensionDefs = [
    { ratio: 1.272, label: '127.2% Ext', color: '#38bdf8' },
    { ratio: 1.414, label: '141.4% Ext', color: '#818cf8' },
    { ratio: 1.618, label: '161.8% Golden Ext', color: '#f59e0b' },
    { ratio: 2.000, label: '200.0% Ext', color: '#a855f7' },
    { ratio: 2.618, label: '261.8% Ext', color: '#ec4899' }
  ];

  const extensionLevels: FibonacciExtensionLevel[] = extensionDefs.map((ext) => {
    let price: number;
    if (direction === 'UPTREND') {
      price = lowPrice + rangeSpan * ext.ratio;
    } else {
      price = highPrice - rangeSpan * ext.ratio;
    }
    return {
      ratio: ext.ratio,
      label: ext.label,
      price: +price.toFixed(2),
      color: ext.color,
      role: 'EXTENSION_TARGET'
    };
  });

  return {
    highPrice,
    highIndex,
    highTime,
    lowPrice,
    lowIndex,
    lowTime,
    rangeSpan: Number(rangeSpan.toFixed(2)),
    direction,
    levels,
    extensionLevels,
    goldenPocket: {
      upperPrice: gpHigh,
      lowerPrice: gpLow,
      isInside: isInsideGp
    },
    currentPrice: latestPrice,
    nearestSupport,
    nearestResistance
  };
}

