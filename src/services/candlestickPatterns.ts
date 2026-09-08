import { Candle, CandlestickSignal, CandlestickPatternType } from '../types';

/**
 * Advanced Candlestick Pattern Recognition Engine
 * Evaluates candlestick geometries, wick-to-body ratios, relative position,
 * and trend context to identify high-probability price action signals.
 */
export function detectCandlestickSignals(candles: Candle[]): CandlestickSignal[] {
  if (!candles || candles.length < 3) return [];

  const signals: CandlestickSignal[] = [];

  // Compute 14-period average true range / average body for normalization
  const avgRanges: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    avgRanges.push(candles[i].high - candles[i].low);
  }

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    const prev2 = i >= 2 ? candles[i - 2] : null;

    const range = c.high - c.low;
    if (range <= 0.001) continue;

    const body = Math.abs(c.close - c.open);
    const upperWick = c.high - Math.max(c.open, c.close);
    const lowerWick = Math.min(c.open, c.close) - c.low;
    const isBull = c.close >= c.open;

    const prevRange = prev.high - prev.low;
    const prevBody = Math.abs(prev.close - prev.open);
    const prevIsBull = prev.close >= prev.open;

    // Recent 10-bar average range for volatility comparison
    const localStart = Math.max(0, i - 10);
    const localSlice = avgRanges.slice(localStart, i);
    const avgLocalRange = localSlice.reduce((sum, val) => sum + val, 0) / (localSlice.length || 1);

    // Is candle meaningful size (not flat tick)
    const isMeaningful = range >= avgLocalRange * 0.4;

    // 1. Morning Star (3-bar Bullish Reversal)
    if (prev2 && isMeaningful) {
      const prev2Body = Math.abs(prev2.close - prev2.open);
      const prev2IsBear = prev2.close < prev2.open;
      const prevIsSmall = prevBody <= prev2Body * 0.45;
      const isStrongBull = isBull && c.close >= prev2.open - prev2Body * 0.45;

      if (prev2IsBear && prevIsSmall && isStrongBull && prev2Body >= avgLocalRange * 0.6) {
        signals.push({
          index: i,
          time: c.time,
          type: 'MORNING_STAR',
          label: 'Morning Star',
          sentiment: 'BULLISH',
          significance: 'HIGH',
          description: '3-bar major bullish reversal pattern: Sellers exhausted into pivot gap, strong buyer recapture.',
          action: 'Bullish reversal confirmation. Watch for continuation above high.',
          triggerPrice: c.high,
          stopLossPrice: Math.min(c.low, prev.low, prev2.low)
        });
        continue;
      }
    }

    // 2. Evening Star (3-bar Bearish Reversal)
    if (prev2 && isMeaningful) {
      const prev2Body = Math.abs(prev2.close - prev2.open);
      const prev2IsBull = prev2.close > prev2.open;
      const prevIsSmall = prevBody <= prev2Body * 0.45;
      const isStrongBear = !isBull && c.close <= prev2.open + prev2Body * 0.45;

      if (prev2IsBull && prevIsSmall && isStrongBear && prev2Body >= avgLocalRange * 0.6) {
        signals.push({
          index: i,
          time: c.time,
          type: 'EVENING_STAR',
          label: 'Evening Star',
          sentiment: 'BEARISH',
          significance: 'HIGH',
          description: '3-bar major bearish reversal pattern: Buyers stalled at highs, strong seller counter-attack.',
          action: 'Bearish top rejection. Watch for breakdown below star low.',
          triggerPrice: c.low,
          stopLossPrice: Math.max(c.high, prev.high, prev2.high)
        });
        continue;
      }
    }

    // 3. Bullish Engulfing
    if (
      !prevIsBull &&
      isBull &&
      c.open <= prev.close * 1.001 &&
      c.close > prev.open &&
      body >= prevBody * 1.15 &&
      isMeaningful
    ) {
      signals.push({
        index: i,
        time: c.time,
        type: 'BULLISH_ENGULFING',
        label: 'Bullish Engulfing',
        sentiment: 'BULLISH',
        significance: 'HIGH',
        description: `Strong buyer expansion completely engulfing prior bearish candle ($${prev.close.toFixed(2)} to $${prev.open.toFixed(2)}).`,
        action: 'High-probability momentum reversal or trend breakout.',
        triggerPrice: c.high,
        stopLossPrice: Math.min(c.low, prev.low)
      });
      continue;
    }

    // 4. Bearish Engulfing
    if (
      prevIsBull &&
      !isBull &&
      c.open >= prev.close * 0.999 &&
      c.close < prev.open &&
      body >= prevBody * 1.15 &&
      isMeaningful
    ) {
      signals.push({
        index: i,
        time: c.time,
        type: 'BEARISH_ENGULFING',
        label: 'Bearish Engulfing',
        sentiment: 'BEARISH',
        significance: 'HIGH',
        description: `Sellers overwhelm previous bullish advance, fully engulfing prior body ($${prev.open.toFixed(2)} to $${prev.close.toFixed(2)}).`,
        action: 'Rejection at local resistance. Look for short or profit-taking.',
        triggerPrice: c.low,
        stopLossPrice: Math.max(c.high, prev.high)
      });
      continue;
    }

    // 5. Hammer (Bullish Rejection Pin Bar)
    if (
      lowerWick >= body * 2.2 &&
      upperWick <= range * 0.18 &&
      body >= range * 0.15 &&
      isMeaningful
    ) {
      signals.push({
        index: i,
        time: c.time,
        type: 'HAMMER',
        label: 'Hammer Reversal',
        sentiment: 'BULLISH',
        significance: 'HIGH',
        description: `Long lower rejection shadow ($${c.low.toFixed(2)}) indicates aggressive buyers defended value floor.`,
        action: 'Long entry on breakout above hammer high.',
        triggerPrice: c.high,
        stopLossPrice: c.low
      });
      continue;
    }

    // 6. Shooting Star (Bearish Rejection Pin Bar)
    if (
      upperWick >= body * 2.2 &&
      lowerWick <= range * 0.18 &&
      body >= range * 0.15 &&
      isMeaningful
    ) {
      signals.push({
        index: i,
        time: c.time,
        type: 'SHOOTING_STAR',
        label: 'Shooting Star',
        sentiment: 'BEARISH',
        significance: 'HIGH',
        description: `Long upper rejection wick ($${c.high.toFixed(2)}) shows overhead supply absorption and seller pushback.`,
        action: 'Short entry or stop tightening on break of low.',
        triggerPrice: c.low,
        stopLossPrice: c.high
      });
      continue;
    }

    // 7. Inverted Hammer (Bullish setup at down-move)
    if (
      upperWick >= body * 2.0 &&
      lowerWick <= range * 0.15 &&
      !prevIsBull &&
      isMeaningful
    ) {
      signals.push({
        index: i,
        time: c.time,
        type: 'INVERTED_HAMMER',
        label: 'Inverted Hammer',
        sentiment: 'BULLISH',
        significance: 'MEDIUM',
        description: 'Buyers probed higher liquidity after selling pressure. Awaiting confirmation bar.',
        action: 'Confirm with next candle closing above wick high.',
        triggerPrice: c.high,
        stopLossPrice: c.low
      });
      continue;
    }

    // 8. Piercing Line (Bullish 2-bar Reversal)
    if (
      !prevIsBull &&
      isBull &&
      c.open < prev.low &&
      c.close >= prev.open - prevBody * 0.5 &&
      c.close < prev.open &&
      isMeaningful
    ) {
      signals.push({
        index: i,
        time: c.time,
        type: 'PIERCING_LINE',
        label: 'Piercing Line',
        sentiment: 'BULLISH',
        significance: 'MEDIUM',
        description: `Bullish recovery piercing deeply into preceding red candle's upper half.`,
        action: 'Upside continuation target at prior high.',
        triggerPrice: c.high,
        stopLossPrice: c.low
      });
      continue;
    }

    // 9. Dark Cloud Cover (Bearish 2-bar Reversal)
    if (
      prevIsBull &&
      !isBull &&
      c.open > prev.high &&
      c.close <= prev.open + prevBody * 0.5 &&
      c.close > prev.open &&
      isMeaningful
    ) {
      signals.push({
        index: i,
        time: c.time,
        type: 'DARK_CLOUD_COVER',
        label: 'Dark Cloud Cover',
        sentiment: 'BEARISH',
        significance: 'MEDIUM',
        description: `Bearish reversal penetrating below the midpoint of prior bullish candle.`,
        action: 'Downside continuation target at prior swing support.',
        triggerPrice: c.low,
        stopLossPrice: c.high
      });
      continue;
    }

    // 10. Dragonfly Doji (Bullish Rejection at lows)
    if (body <= range * 0.08 && lowerWick >= range * 0.72 && upperWick <= range * 0.12) {
      signals.push({
        index: i,
        time: c.time,
        type: 'DRAGONFLY_DOJI',
        label: 'Dragonfly Doji',
        sentiment: 'BULLISH',
        significance: 'HIGH',
        description: 'High-conviction buyer defense: Price opened and closed near peak after sharp intraday selloff.',
        action: 'Strong support confirmation. Look for bull follow-through.',
        triggerPrice: c.high,
        stopLossPrice: c.low
      });
      continue;
    }

    // 11. Gravestone Doji (Bearish Exhaustion at highs)
    if (body <= range * 0.08 && upperWick >= range * 0.72 && lowerWick <= range * 0.12) {
      signals.push({
        index: i,
        time: c.time,
        type: 'GRAVESTONE_DOJI',
        label: 'Gravestone Doji',
        sentiment: 'BEARISH',
        significance: 'HIGH',
        description: 'Severe buyer exhaustion: Massive upper rejection wick closing near the day low.',
        action: 'Liquidation danger. High-probability top reversal.',
        triggerPrice: c.low,
        stopLossPrice: c.high
      });
      continue;
    }

    // 12. Standard Doji (Pivot / Indecision)
    if (body <= range * 0.06 && Math.abs(upperWick - lowerWick) <= range * 0.3 && isMeaningful) {
      signals.push({
        index: i,
        time: c.time,
        type: 'DOJI',
        label: 'Doji Pivot',
        sentiment: 'NEUTRAL',
        significance: 'MEDIUM',
        description: 'Equilibrium standoff between buyers and sellers. Precursor to decisive directional expansion.',
        action: 'Wait for breakout above or below doji extremes.',
        triggerPrice: c.high,
        stopLossPrice: c.low
      });
      continue;
    }

    // 13. Marubozu (Strong Impulsive Trend Expansion Bar)
    if (
      body >= range * 0.88 &&
      upperWick <= range * 0.06 &&
      lowerWick <= range * 0.06 &&
      range >= avgLocalRange * 1.35
    ) {
      if (isBull) {
        signals.push({
          index: i,
          time: c.time,
          type: 'MARUBOZU_BULLISH',
          label: 'Bullish Marubozu',
          sentiment: 'BULLISH',
          significance: 'HIGH',
          description: 'Powerful directional bull drive with near-zero wicks. Dominant institutional accumulation.',
          action: 'Trend continuation play. Ride momentum with trailing stop.',
          triggerPrice: c.close,
          stopLossPrice: c.open
        });
      } else {
        signals.push({
          index: i,
          time: c.time,
          type: 'MARUBOZU_BEARISH',
          label: 'Bearish Marubozu',
          sentiment: 'BEARISH',
          significance: 'HIGH',
          description: 'Aggressive institutional liquidation with near-zero wicks throughout the bar.',
          action: 'Short momentum continuation. Protect gains with tight stop.',
          triggerPrice: c.close,
          stopLossPrice: c.open
        });
      }
      continue;
    }

    // 14. Harami (Inside Bar Reversal)
    if (
      body <= prevBody * 0.45 &&
      c.high < prev.high &&
      c.low > prev.low &&
      prevBody >= avgLocalRange * 0.7
    ) {
      const haramiBull = !prevIsBull && isBull;
      signals.push({
        index: i,
        time: c.time,
        type: haramiBull ? 'BULLISH_HARAMI' : 'BEARISH_HARAMI',
        label: haramiBull ? 'Bullish Harami' : 'Bearish Harami',
        sentiment: haramiBull ? 'BULLISH' : 'BEARISH',
        significance: 'MEDIUM',
        description: `Inside bar contraction within prior mother candle ($${prev.low.toFixed(2)} - $${prev.high.toFixed(2)}).`,
        action: 'Watch for mother bar breakout trigger.',
        triggerPrice: haramiBull ? prev.high : prev.low,
        stopLossPrice: haramiBull ? prev.low : prev.high
      });
    }
  }

  return signals;
}
