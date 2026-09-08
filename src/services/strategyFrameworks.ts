import { Candle, TechnicalIndicators, StrategyFrameworkResult } from '../types';

/**
 * Evaluates the quantitative parameters across 6 legendary institutional strategy frameworks:
 * 1. Stan Weinstein Stage Analysis
 * 2. Mark Minervini Trend Template (SEPA)
 * 3. Richard Wyckoff Method (Price-Volume Cycles)
 * 4. William O'Neil CAN SLIM Technical Pivot
 * 5. Auction Market Theory (Value Area / POC Confluence)
 * 6. Volatility Contraction & Mean Reversion (Bollinger Bands)
 */
export function evaluateAllStrategyFrameworks(
  candles: Candle[],
  indicators: TechnicalIndicators | null
): StrategyFrameworkResult[] {
  if (!candles || candles.length === 0) return [];

  const n = candles.length;
  const current = candles[n - 1];
  const price = current.close;

  const closes = candles.map((c) => c.close);
  const volumes = candles.map((c) => c.volume);

  // Moving averages
  const sma20 =
    indicators?.sma20 ||
    closes.slice(-20).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(20, n));
  const sma50 =
    indicators?.sma50 ||
    closes.slice(-50).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(50, n));
  const sma200 =
    indicators?.sma200 ||
    closes.slice(-Math.min(200, n)).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(200, n));

  const avgVol20 =
    volumes.slice(-20).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(20, n));
  const volRatio = avgVol20 > 0 ? current.volume / avgVol20 : 1.0;

  const rsi = indicators?.rsi ?? 50;
  const high52w = Math.max(...closes.slice(Math.max(0, n - 250)));
  const low52w = Math.min(...closes.slice(Math.max(0, n - 250)));

  const results: StrategyFrameworkResult[] = [];

  // 1. Stan Weinstein Stage Analysis
  // Stage 1: Basing/Accumulation (Flat 200/50 SMA, price oscillating)
  // Stage 2: Advancing/Markup (Price > 50 SMA > 200 SMA, 200 SMA rising)
  // Stage 3: Top/Distribution (Price oscillating around flattening 50/200 SMA)
  // Stage 4: Declining/Markdown (Price < 50 SMA < 200 SMA, 200 SMA sloping down)
  const isWeinsteinStage2 = price > sma50 && sma50 > sma200;
  const isWeinsteinStage4 = price < sma50 && sma50 < sma200;
  const isWeinsteinStage1 = !isWeinsteinStage2 && !isWeinsteinStage4 && price >= sma200 * 0.95;

  if (isWeinsteinStage2) {
    results.push({
      id: 'weinstein-stage-analysis',
      name: 'Stan Weinstein Stage Analysis',
      category: 'Trend Following',
      signal: 'BULLISH',
      confidence: 88,
      condition: 'Stage 2 Markup Phase',
      details:
        'Price is structurally holding above the rising 50 and 200-period moving averages. Institutional accumulation supports aggressive trend continuation.',
      triggerZone: `$${sma50.toFixed(2)} (Pullback Support)`
    });
  } else if (isWeinsteinStage4) {
    results.push({
      id: 'weinstein-stage-analysis',
      name: 'Stan Weinstein Stage Analysis',
      category: 'Trend Following',
      signal: 'BEARISH',
      confidence: 86,
      condition: 'Stage 4 Declining Phase',
      details:
        'Price is positioned below declining key moving averages (SMA 50 & SMA 200). High risk of markdown continuation; avoid long exposure.',
      triggerZone: `$${sma50.toFixed(2)} (Resistance on Rally)`
    });
  } else if (isWeinsteinStage1) {
    results.push({
      id: 'weinstein-stage-analysis',
      name: 'Stan Weinstein Stage Analysis',
      category: 'Trend Following',
      signal: 'NEUTRAL',
      confidence: 72,
      condition: 'Stage 1 Basing / Accumulation',
      details:
        'Price is carving out a lateral base around a flattening long-term moving average. Accumulate on low volume or wait for stage 2 breakout confirmation.',
      triggerZone: `$${sma50.toFixed(2)} - $${(sma50 * 1.03).toFixed(2)}`
    });
  } else {
    results.push({
      id: 'weinstein-stage-analysis',
      name: 'Stan Weinstein Stage Analysis',
      category: 'Trend Following',
      signal: 'NEUTRAL',
      confidence: 65,
      condition: 'Stage 3 Distribution / Consolidation',
      details:
        'High volatility churn near range highs with moving averages beginning to roll over. Protect profits with trailing stops.',
      triggerZone: `$${sma200.toFixed(2)}`
    });
  }

  // 2. Mark Minervini Trend Template (SEPA)
  // Criteria:
  // 1. Current Price > 150 SMA & 200 SMA
  // 2. 50 SMA > 150 SMA & 200 SMA
  // 3. Current Price at least 25% above 52w low
  // 4. Current Price within 25% of 52w high
  const pctAboveLow = low52w > 0 ? ((price - low52w) / low52w) * 100 : 0;
  const pctFromHigh = high52w > 0 ? ((high52w - price) / high52w) * 100 : 0;
  const minerviniTrendMet =
    price > sma50 && sma50 > sma200 && pctAboveLow >= 20 && pctFromHigh <= 25;

  if (minerviniTrendMet) {
    results.push({
      id: 'minervini-trend-template',
      name: 'Mark Minervini Trend Template (SEPA)',
      category: 'Momentum Breakout',
      signal: 'BULLISH',
      confidence: 92,
      condition: 'Full Trend Template Alignment',
      details: `Price is within ${pctFromHigh.toFixed(1)}% of 52-week highs and ${pctAboveLow.toFixed(1)}% above 52-week lows, with moving averages in proper institutional cascade order (Price > 50 SMA > 200 SMA).`,
      triggerZone: `Above $${sma50.toFixed(2)} pivot`
    });
  } else if (price < sma200) {
    results.push({
      id: 'minervini-trend-template',
      name: 'Mark Minervini Trend Template (SEPA)',
      category: 'Momentum Breakout',
      signal: 'BEARISH',
      confidence: 84,
      condition: 'Failed Trend Template (Sub-200 SMA)',
      details:
        'Stock fails Minervini criteria by trading below the 200-period baseline. Institutional leaders do not remain below long-term moving averages.',
      triggerZone: `Reclaim $${sma200.toFixed(2)}`
    });
  } else {
    results.push({
      id: 'minervini-trend-template',
      name: 'Mark Minervini Trend Template (SEPA)',
      category: 'Momentum Breakout',
      signal: 'NEUTRAL',
      confidence: 68,
      condition: 'Partial Trend Template Alignment',
      details:
        'Some criteria met, but momentum structure is awaiting full moving average alignment or tighter consolidation base (VCP contraction).',
      triggerZone: `$${sma50.toFixed(2)}`
    });
  }

  // 3. Richard Wyckoff Method (Price-Volume Cycles)
  const isSpring =
    current.low < Math.min(...closes.slice(-15, -1)) &&
    current.close > current.open &&
    volRatio > 1.2;
  const isSignOfStrength = price > sma20 && volRatio >= 1.4 && current.close > current.open;
  const isUpthrust =
    current.high > Math.max(...closes.slice(-15, -1)) &&
    current.close < current.open &&
    volRatio > 1.3;

  if (isSpring) {
    results.push({
      id: 'wyckoff-method',
      name: 'Richard Wyckoff Method',
      category: 'Auction Market Theory',
      signal: 'BULLISH',
      confidence: 85,
      condition: 'Phase C: Spring / Shakeout Test',
      details:
        'Temporary breach of local support immediately rejected back into the trading range on above-average volume. Classic smart-money liquidity grab before markup.',
      triggerZone: `$${current.low.toFixed(2)} (Stop anchor)`
    });
  } else if (isSignOfStrength) {
    results.push({
      id: 'wyckoff-method',
      name: 'Richard Wyckoff Method',
      category: 'Auction Market Theory',
      signal: 'BULLISH',
      confidence: 82,
      condition: 'Phase D: Sign of Strength (SOS)',
      details:
        'Wide-spread bullish bar expanding on 1.4x+ volume above the 20-period benchmark, demonstrating institutional absorption of floating supply.',
      triggerZone: `$${sma20.toFixed(2)} (Last Point of Support)`
    });
  } else if (isUpthrust) {
    results.push({
      id: 'wyckoff-method',
      name: 'Richard Wyckoff Method',
      category: 'Auction Market Theory',
      signal: 'BEARISH',
      confidence: 88,
      condition: 'Phase C: Upthrust After Distribution (UTAD)',
      details:
        'New high rejected with heavy closing volume back below key pivot. Smart money distributing inventory into breakout retail buyers.',
      triggerZone: `$${current.high.toFixed(2)} (Resistance Ceiling)`
    });
  } else {
    results.push({
      id: 'wyckoff-method',
      name: 'Richard Wyckoff Method',
      category: 'Auction Market Theory',
      signal: 'NEUTRAL',
      confidence: 65,
      condition: 'Phase B: Trading Range Consolidation',
      details:
        'Price is oscillating within the established trading range bounds. Volume characteristics reflect standard supply/demand equilibrium.',
      triggerZone: `$${sma20.toFixed(2)}`
    });
  }

  // 4. William O'Neil CAN SLIM Technical Pivot Breakout
  const isPivotBreakout = price > sma20 && volRatio >= 1.4 && rsi > 52 && rsi < 72;
  const isVolumeDryup = volRatio < 0.75 && Math.abs(current.close - current.open) / price < 0.008;

  if (isPivotBreakout) {
    results.push({
      id: 'oneil-canslim',
      name: "William O'Neil CAN SLIM Pivot",
      category: 'Momentum Breakout',
      signal: 'BULLISH',
      confidence: 89,
      condition: 'High-Volume Pivot Breakout',
      details: `Breakout confirmed with volume expanding +${((volRatio - 1) * 100).toFixed(0)}% above the 20-period institutional baseline with healthy RSI momentum (${rsi.toFixed(1)}).`,
      triggerZone: `$${sma20.toFixed(2)} (Breakout Pivot)`
    });
  } else if (isVolumeDryup) {
    results.push({
      id: 'oneil-canslim',
      name: "William O'Neil CAN SLIM Pivot",
      category: 'Momentum Breakout',
      signal: 'BULLISH',
      confidence: 76,
      condition: 'Low Volume Base Contraction (VCP Ready)',
      details:
        'Volume dried up significantly below average on tight price spread. Indicates seller exhaustion and lack of overhead supply before pivot challenge.',
      triggerZone: `$${price.toFixed(2)}`
    });
  } else if (price < sma50 && volRatio >= 1.3 && current.close < current.open) {
    results.push({
      id: 'oneil-canslim',
      name: "William O'Neil CAN SLIM Pivot",
      category: 'Momentum Breakout',
      signal: 'BEARISH',
      confidence: 83,
      condition: 'Distribution Day / Sub-50 SMA Breakdown',
      details:
        'Heavy institutional selling confirmed by volume expansion on down-session below 50-day average. Trigger 7-8% loss mitigation rule.',
      triggerZone: `$${sma50.toFixed(2)}`
    });
  } else {
    results.push({
      id: 'oneil-canslim',
      name: "William O'Neil CAN SLIM Pivot",
      category: 'Momentum Breakout',
      signal: 'NEUTRAL',
      confidence: 66,
      condition: 'Base Building in Progress',
      details:
        'Consolidating within base structure. Awaiting constructive handle contraction or decisive volume-assisted pivot test.',
      triggerZone: `$${(price * 1.02).toFixed(2)}`
    });
  }

  // 5. Auction Market Theory (Value Area & POC Acceptance / Rejection)
  if (indicators?.volumeProfile) {
    const vp = indicators.volumeProfile;
    const isAboveVah = price > vp.vah;
    const isBelowVal = price < vp.val;
    const isNearPoc = Math.abs(price - vp.pocPrice) / price < 0.008;

    if (isAboveVah) {
      results.push({
        id: 'auction-market-theory',
        name: 'Auction Market Theory (Profile)',
        category: 'Auction Market Theory',
        signal: 'BULLISH',
        confidence: 84,
        condition: 'Value Area High (VAH) Expansion',
        details: `Price accepted above Value Area High ($${vp.vah.toFixed(2)}). Market is in price discovery mode seeking higher value levels.`,
        triggerZone: `$${vp.vah.toFixed(2)} (Retest Support)`
      });
    } else if (isBelowVal) {
      results.push({
        id: 'auction-market-theory',
        name: 'Auction Market Theory (Profile)',
        category: 'Auction Market Theory',
        signal: 'BEARISH',
        confidence: 82,
        condition: 'Value Area Low (VAL) Breakdown',
        details: `Price accepted below Value Area Low ($${vp.val.toFixed(2)}). Sellers in control; lower prices accepted by institutional market participants.`,
        triggerZone: `$${vp.val.toFixed(2)} (Retest Resistance)`
      });
    } else if (isNearPoc) {
      results.push({
        id: 'auction-market-theory',
        name: 'Auction Market Theory (Profile)',
        category: 'Auction Market Theory',
        signal: 'NEUTRAL',
        confidence: 78,
        condition: 'Point of Control (POC) Fair Value Equilibrium',
        details: `Price trading directly at highest liquidity node POC ($${vp.pocPrice.toFixed(2)}). Maximum acceptance; expect range-bound behavior until rotational imbalance occurs.`,
        triggerZone: `$${vp.pocPrice.toFixed(2)}`
      });
    } else {
      results.push({
        id: 'auction-market-theory',
        name: 'Auction Market Theory (Profile)',
        category: 'Auction Market Theory',
        signal: price > vp.pocPrice ? 'BULLISH' : 'BEARISH',
        confidence: 71,
        condition: 'Value Area Rotation',
        details: `Price rotating within 70% Value Area between $${vp.val.toFixed(2)} and $${vp.vah.toFixed(2)}. Targeting opposite boundary.`,
        triggerZone: `$${vp.pocPrice.toFixed(2)}`
      });
    }
  }

  // 6. Volatility Contraction & Mean Reversion (Bollinger Bands)
  if (indicators?.bollinger) {
    const bb = indicators.bollinger;
    const isSqueeze = bb.bandwidth < 8.0;
    const isOversoldBand = price <= bb.lower || (indicators.rsi && indicators.rsi < 35);
    const isOverboughtBand = price >= bb.upper || (indicators.rsi && indicators.rsi > 70);

    if (isSqueeze) {
      results.push({
        id: 'volatility-compression',
        name: 'Bollinger Volatility Compression',
        category: 'Mean Reversion',
        signal: price > sma20 ? 'BULLISH' : 'BEARISH',
        confidence: 87,
        condition: 'Bandwidth Squeeze (Energy Coil)',
        details: `Extreme volatility compression detected (Bandwidth: ${bb.bandwidth.toFixed(1)}%). Squeezes precede massive explosive trending expansions. Directional bias aligns with 20 SMA slope.`,
        triggerZone: `Break above $${bb.upper.toFixed(2)} / below $${bb.lower.toFixed(2)}`
      });
    } else if (isOversoldBand) {
      results.push({
        id: 'volatility-compression',
        name: 'Mean Reversion Oversold Bounce',
        category: 'Mean Reversion',
        signal: 'BULLISH',
        confidence: 81,
        condition: 'Lower Band Penetration (Mean Reversion)',
        details: `Price extended below lower volatility envelope ($${bb.lower.toFixed(2)}) with oversold momentum. High probability statistical bounce toward middle band ($${bb.middle.toFixed(2)}).`,
        triggerZone: `$${bb.lower.toFixed(2)}`
      });
    } else if (isOverboughtBand) {
      results.push({
        id: 'volatility-compression',
        name: 'Mean Reversion Overbought Exhaustion',
        category: 'Mean Reversion',
        signal: 'NEUTRAL',
        confidence: 75,
        condition: 'Upper Band Extreme Stretch',
        details: `Price testing upper volatility envelope ($${bb.upper.toFixed(2)}). Can walk the band in strong trends, but pullback risk to 20 SMA ($${bb.middle.toFixed(2)}) increases substantially.`,
        triggerZone: `$${bb.middle.toFixed(2)} (Pullback target)`
      });
    }
  }

  return results;
}
