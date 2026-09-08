import { Candle, ChartPattern, ChartPatternPoint, ChartPatternBoundaryLine } from '../types';

interface Pivot {
  index: number;
  price: number;
  time: string;
  type: 'HIGH' | 'LOW';
}

/**
 * Identify local extrema (swing highs and swing lows) using a symmetric window
 */
function findPivots(candles: Candle[], window: number = 3): Pivot[] {
  const pivots: Pivot[] = [];
  const n = candles.length;
  if (n < window * 2 + 1) return pivots;

  for (let i = window; i < n - window; i++) {
    const currentHigh = candles[i].high;
    const currentLow = candles[i].low;

    let isHigh = true;
    let isLow = true;

    for (let j = 1; j <= window; j++) {
      if (candles[i - j].high > currentHigh || candles[i + j].high > currentHigh) {
        isHigh = false;
      }
      if (candles[i - j].low < currentLow || candles[i + j].low < currentLow) {
        isLow = false;
      }
    }

    if (isHigh) {
      pivots.push({
        index: i,
        price: currentHigh,
        time: candles[i].time,
        type: 'HIGH'
      });
    }

    if (isLow) {
      pivots.push({
        index: i,
        price: currentLow,
        time: candles[i].time,
        type: 'LOW'
      });
    }
  }

  // Sort chronologically
  return pivots.sort((a, b) => a.index - b.index);
}

/**
 * Detect Double Bottom (W Reversal Pattern)
 */
function detectDoubleBottoms(candles: Candle[], pivots: Pivot[]): ChartPattern[] {
  const patterns: ChartPattern[] = [];
  const lows = pivots.filter((p) => p.type === 'LOW');
  const highs = pivots.filter((p) => p.type === 'HIGH');
  const lastIndex = candles.length - 1;
  const currentPrice = candles[lastIndex]?.close || 0;

  for (let i = 0; i < lows.length - 1; i++) {
    const t1 = lows[i];
    const t2 = lows[i + 1];

    const barDistance = t2.index - t1.index;
    if (barDistance < 6 || barDistance > 60) continue;

    // Price difference between the two troughs within 2.5%
    const avgTrough = (t1.price + t2.price) / 2;
    const troughDiff = Math.abs(t1.price - t2.price) / avgTrough;
    if (troughDiff > 0.028) continue;

    // Find the intervening peak between t1 and t2
    const interveningPeaks = highs.filter((h) => h.index > t1.index && h.index < t2.index);
    if (interveningPeaks.length === 0) continue;

    const peak = interveningPeaks.reduce((max, h) => (h.price > max.price ? h : max), interveningPeaks[0]);
    const height = peak.price - avgTrough;
    if (height / avgTrough < 0.02) continue; // Must have sufficient depth

    const breakoutPrice = peak.price;
    const targetPrice = peak.price + height;
    const stopLossPrice = Math.min(t1.price, t2.price) * 0.988;

    const isConfirmed = currentPrice >= breakoutPrice * 0.995;
    const isBroken = currentPrice < stopLossPrice;
    const status: 'CONFIRMED' | 'FORMING' | 'BROKEN' = isBroken
      ? 'BROKEN'
      : isConfirmed
      ? 'CONFIRMED'
      : 'FORMING';

    const confidence = Math.round(
      Math.max(72, Math.min(94, 90 - troughDiff * 400 + (isConfirmed ? 6 : 0)))
    );

    const keyPoints: ChartPatternPoint[] = [
      { index: t1.index, time: t1.time, price: t1.price, label: 'Trough 1' },
      { index: peak.index, time: peak.time, price: peak.price, label: 'Neckline Peak' },
      { index: t2.index, time: t2.time, price: t2.price, label: 'Trough 2' }
    ];

    const boundaryLines: ChartPatternBoundaryLine[] = [
      {
        startIndex: t1.index,
        endIndex: peak.index,
        startPrice: t1.price,
        endPrice: peak.price,
        type: 'support'
      },
      {
        startIndex: peak.index,
        endIndex: t2.index,
        startPrice: peak.price,
        endPrice: t2.price,
        type: 'support'
      },
      {
        startIndex: peak.index,
        endIndex: Math.min(lastIndex, t2.index + Math.round(barDistance * 0.7)),
        startPrice: peak.price,
        endPrice: peak.price,
        type: 'neckline',
        label: `Neckline $${peak.price.toFixed(2)}`
      },
      {
        startIndex: t2.index,
        endIndex: Math.min(lastIndex, t2.index + Math.round(barDistance * 0.8)),
        startPrice: targetPrice,
        endPrice: targetPrice,
        type: 'target',
        label: `Target $${targetPrice.toFixed(2)}`
      }
    ];

    patterns.push({
      id: `db_${t1.index}_${t2.index}`,
      type: 'DOUBLE_BOTTOM',
      name: 'Double Bottom (W)',
      sentiment: 'BULLISH',
      startIndex: t1.index,
      endIndex: Math.min(lastIndex, t2.index + Math.round(barDistance * 0.6)),
      startTime: t1.time,
      endTime: candles[Math.min(lastIndex, t2.index + Math.round(barDistance * 0.6))].time,
      keyPoints,
      neckline: {
        startIndex: peak.index,
        endIndex: Math.min(lastIndex, t2.index + barDistance),
        startPrice: peak.price,
        endPrice: peak.price,
        label: `Neckline $${peak.price.toFixed(2)}`
      },
      boundaryLines,
      breakoutPrice,
      targetPrice,
      stopLossPrice,
      height,
      confidence,
      status,
      description: `Classical bullish 'W' reversal formation. Two solid swing troughs at $${t1.price.toFixed(2)} and $${t2.price.toFixed(2)} retested support.`,
      tacticalAction: isConfirmed
        ? `Breakout above $${breakoutPrice.toFixed(2)} confirmed. Look for retest entries with target at $${targetPrice.toFixed(2)}.`
        : `Monitoring for strong breakout candle above $${breakoutPrice.toFixed(2)}. Invalidation level sits at $${stopLossPrice.toFixed(2)}.`
    });
  }

  return patterns;
}

/**
 * Detect Double Top (M Reversal Pattern)
 */
function detectDoubleTops(candles: Candle[], pivots: Pivot[]): ChartPattern[] {
  const patterns: ChartPattern[] = [];
  const highs = pivots.filter((p) => p.type === 'HIGH');
  const lows = pivots.filter((p) => p.type === 'LOW');
  const lastIndex = candles.length - 1;
  const currentPrice = candles[lastIndex]?.close || 0;

  for (let i = 0; i < highs.length - 1; i++) {
    const p1 = highs[i];
    const p2 = highs[i + 1];

    const barDistance = p2.index - p1.index;
    if (barDistance < 6 || barDistance > 60) continue;

    const avgPeak = (p1.price + p2.price) / 2;
    const peakDiff = Math.abs(p1.price - p2.price) / avgPeak;
    if (peakDiff > 0.028) continue;

    const interveningTroughs = lows.filter((l) => l.index > p1.index && l.index < p2.index);
    if (interveningTroughs.length === 0) continue;

    const trough = interveningTroughs.reduce((min, l) => (l.price < min.price ? l : min), interveningTroughs[0]);
    const height = avgPeak - trough.price;
    if (height / avgPeak < 0.02) continue;

    const breakoutPrice = trough.price;
    const targetPrice = trough.price - height;
    const stopLossPrice = Math.max(p1.price, p2.price) * 1.012;

    const isConfirmed = currentPrice <= breakoutPrice * 1.005;
    const isBroken = currentPrice > stopLossPrice;
    const status: 'CONFIRMED' | 'FORMING' | 'BROKEN' = isBroken
      ? 'BROKEN'
      : isConfirmed
      ? 'CONFIRMED'
      : 'FORMING';

    const confidence = Math.round(
      Math.max(70, Math.min(94, 90 - peakDiff * 400 + (isConfirmed ? 6 : 0)))
    );

    const keyPoints: ChartPatternPoint[] = [
      { index: p1.index, time: p1.time, price: p1.price, label: 'Peak 1' },
      { index: trough.index, time: trough.time, price: trough.price, label: 'Neckline Trough' },
      { index: p2.index, time: p2.time, price: p2.price, label: 'Peak 2' }
    ];

    const boundaryLines: ChartPatternBoundaryLine[] = [
      {
        startIndex: p1.index,
        endIndex: trough.index,
        startPrice: p1.price,
        endPrice: trough.price,
        type: 'resistance'
      },
      {
        startIndex: trough.index,
        endIndex: p2.index,
        startPrice: trough.price,
        endPrice: p2.price,
        type: 'resistance'
      },
      {
        startIndex: trough.index,
        endIndex: Math.min(lastIndex, p2.index + Math.round(barDistance * 0.7)),
        startPrice: trough.price,
        endPrice: trough.price,
        type: 'neckline',
        label: `Neckline $${trough.price.toFixed(2)}`
      },
      {
        startIndex: p2.index,
        endIndex: Math.min(lastIndex, p2.index + Math.round(barDistance * 0.8)),
        startPrice: targetPrice,
        endPrice: targetPrice,
        type: 'target',
        label: `Target $${targetPrice.toFixed(2)}`
      }
    ];

    patterns.push({
      id: `dt_${p1.index}_${p2.index}`,
      type: 'DOUBLE_TOP',
      name: 'Double Top (M)',
      sentiment: 'BEARISH',
      startIndex: p1.index,
      endIndex: Math.min(lastIndex, p2.index + Math.round(barDistance * 0.6)),
      startTime: p1.time,
      endTime: candles[Math.min(lastIndex, p2.index + Math.round(barDistance * 0.6))].time,
      keyPoints,
      neckline: {
        startIndex: trough.index,
        endIndex: Math.min(lastIndex, p2.index + barDistance),
        startPrice: trough.price,
        endPrice: trough.price,
        label: `Neckline $${trough.price.toFixed(2)}`
      },
      boundaryLines,
      breakoutPrice,
      targetPrice,
      stopLossPrice,
      height,
      confidence,
      status,
      description: `Bearish 'M' reversal structure. Resistance tested twice at $${p1.price.toFixed(2)} and $${p2.price.toFixed(2)} with fading momentum.`,
      tacticalAction: isConfirmed
        ? `Breakdown confirmed below $${breakoutPrice.toFixed(2)}. Target projection sits at $${targetPrice.toFixed(2)}.`
        : `Sellers defending $${p2.price.toFixed(2)}. Watch neckline at $${breakoutPrice.toFixed(2)} for breakdown confirmation.`
    });
  }

  return patterns;
}

/**
 * Detect Head and Shoulders & Inverse Head and Shoulders
 */
function detectHeadAndShoulders(candles: Candle[], pivots: Pivot[]): ChartPattern[] {
  const patterns: ChartPattern[] = [];
  const highs = pivots.filter((p) => p.type === 'HIGH');
  const lows = pivots.filter((p) => p.type === 'LOW');
  const lastIndex = candles.length - 1;
  const currentPrice = candles[lastIndex]?.close || 0;

  // Regular Head and Shoulders (Bearish)
  for (let i = 0; i < highs.length - 2; i++) {
    const left = highs[i];
    const head = highs[i + 1];
    const right = highs[i + 2];

    // Head must be strictly higher than both shoulders by at least 1.5%
    if (head.price <= left.price * 1.015 || head.price <= right.price * 1.015) continue;

    // Left and Right shoulders should be reasonably balanced in height (within 4.5%)
    const shoulderAvg = (left.price + right.price) / 2;
    if (Math.abs(left.price - right.price) / shoulderAvg > 0.045) continue;

    // Intervening troughs
    const t1s = lows.filter((l) => l.index > left.index && l.index < head.index);
    const t2s = lows.filter((l) => l.index > head.index && l.index < right.index);
    if (t1s.length === 0 || t2s.length === 0) continue;

    const t1 = t1s.reduce((min, l) => (l.price < min.price ? l : min), t1s[0]);
    const t2 = t2s.reduce((min, l) => (l.price < min.price ? l : min), t2s[0]);

    const necklineAvg = (t1.price + t2.price) / 2;
    const height = head.price - necklineAvg;
    const breakoutPrice = necklineAvg;
    const targetPrice = necklineAvg - height;
    const stopLossPrice = right.price * 1.012;

    const isConfirmed = currentPrice <= breakoutPrice;
    const isBroken = currentPrice > stopLossPrice;
    const status: 'CONFIRMED' | 'FORMING' | 'BROKEN' = isBroken
      ? 'BROKEN'
      : isConfirmed
      ? 'CONFIRMED'
      : 'FORMING';

    patterns.push({
      id: `hs_${left.index}_${head.index}_${right.index}`,
      type: 'HEAD_AND_SHOULDERS',
      name: 'Head & Shoulders',
      sentiment: 'BEARISH',
      startIndex: left.index,
      endIndex: Math.min(lastIndex, right.index + Math.round((right.index - left.index) * 0.3)),
      startTime: left.time,
      endTime: candles[Math.min(lastIndex, right.index + 5)].time,
      keyPoints: [
        { index: left.index, time: left.time, price: left.price, label: 'Left Shoulder' },
        { index: t1.index, time: t1.time, price: t1.price, label: 'Trough 1' },
        { index: head.index, time: head.time, price: head.price, label: 'Head' },
        { index: t2.index, time: t2.time, price: t2.price, label: 'Trough 2' },
        { index: right.index, time: right.time, price: right.price, label: 'Right Shoulder' }
      ],
      neckline: {
        startIndex: t1.index,
        endIndex: Math.min(lastIndex, right.index + 10),
        startPrice: t1.price,
        endPrice: t2.price,
        label: `Neckline $${necklineAvg.toFixed(2)}`
      },
      boundaryLines: [
        {
          startIndex: left.index,
          endIndex: head.index,
          startPrice: left.price,
          endPrice: head.price,
          type: 'resistance'
        },
        {
          startIndex: head.index,
          endIndex: right.index,
          startPrice: head.price,
          endPrice: right.price,
          type: 'resistance'
        },
        {
          startIndex: t1.index,
          endIndex: t2.index,
          startPrice: t1.price,
          endPrice: t2.price,
          type: 'neckline',
          label: 'Neckline'
        }
      ],
      breakoutPrice,
      targetPrice,
      stopLossPrice,
      height,
      confidence: 88,
      status,
      description: `Major reversal formation. Prominent head at $${head.price.toFixed(2)} with lower right shoulder ($${right.price.toFixed(2)}) indicating distribution.`,
      tacticalAction: isConfirmed
        ? `Neckline broken at $${breakoutPrice.toFixed(2)}. Target projection $${targetPrice.toFixed(2)}.`
        : `Watch neckline level at $${necklineAvg.toFixed(2)}. Break triggers short/trim tactical bias.`
    });
  }

  // Inverse Head and Shoulders (Bullish)
  for (let i = 0; i < lows.length - 2; i++) {
    const left = lows[i];
    const head = lows[i + 1];
    const right = lows[i + 2];

    if (head.price >= left.price * 0.985 || head.price >= right.price * 0.985) continue;

    const shoulderAvg = (left.price + right.price) / 2;
    if (Math.abs(left.price - right.price) / shoulderAvg > 0.045) continue;

    const p1s = highs.filter((h) => h.index > left.index && h.index < head.index);
    const p2s = highs.filter((h) => h.index > head.index && h.index < right.index);
    if (p1s.length === 0 || p2s.length === 0) continue;

    const p1 = p1s.reduce((max, h) => (h.price > max.price ? h : max), p1s[0]);
    const p2 = p2s.reduce((max, h) => (h.price > max.price ? h : max), p2s[0]);

    const necklineAvg = (p1.price + p2.price) / 2;
    const height = necklineAvg - head.price;
    const breakoutPrice = necklineAvg;
    const targetPrice = necklineAvg + height;
    const stopLossPrice = right.price * 0.988;

    const isConfirmed = currentPrice >= breakoutPrice;
    const isBroken = currentPrice < stopLossPrice;
    const status: 'CONFIRMED' | 'FORMING' | 'BROKEN' = isBroken
      ? 'BROKEN'
      : isConfirmed
      ? 'CONFIRMED'
      : 'FORMING';

    patterns.push({
      id: `ihs_${left.index}_${head.index}_${right.index}`,
      type: 'INVERSE_HEAD_AND_SHOULDERS',
      name: 'Inverse Head & Shoulders',
      sentiment: 'BULLISH',
      startIndex: left.index,
      endIndex: Math.min(lastIndex, right.index + Math.round((right.index - left.index) * 0.3)),
      startTime: left.time,
      endTime: candles[Math.min(lastIndex, right.index + 5)].time,
      keyPoints: [
        { index: left.index, time: left.time, price: left.price, label: 'Left Shoulder' },
        { index: p1.index, time: p1.time, price: p1.price, label: 'Peak 1' },
        { index: head.index, time: head.time, price: head.price, label: 'Head' },
        { index: p2.index, time: p2.time, price: p2.price, label: 'Peak 2' },
        { index: right.index, time: right.time, price: right.price, label: 'Right Shoulder' }
      ],
      neckline: {
        startIndex: p1.index,
        endIndex: Math.min(lastIndex, right.index + 10),
        startPrice: p1.price,
        endPrice: p2.price,
        label: `Neckline $${necklineAvg.toFixed(2)}`
      },
      boundaryLines: [
        {
          startIndex: left.index,
          endIndex: head.index,
          startPrice: left.price,
          endPrice: head.price,
          type: 'support'
        },
        {
          startIndex: head.index,
          endIndex: right.index,
          startPrice: head.price,
          endPrice: right.price,
          type: 'support'
        },
        {
          startIndex: p1.index,
          endIndex: p2.index,
          startPrice: p1.price,
          endPrice: p2.price,
          type: 'neckline',
          label: 'Neckline'
        }
      ],
      breakoutPrice,
      targetPrice,
      stopLossPrice,
      height,
      confidence: 89,
      status,
      description: `Major bottom accumulation structure. Deep capitulation head at $${head.price.toFixed(2)} followed by higher right shoulder ($${right.price.toFixed(2)}).`,
      tacticalAction: isConfirmed
        ? `Bullish breakout confirmed above $${breakoutPrice.toFixed(2)}. Target projection at $${targetPrice.toFixed(2)}.`
        : `Watch neckline resistance at $${necklineAvg.toFixed(2)} for breakout confirmation.`
    });
  }

  return patterns;
}

/**
 * Detect Triangles (Ascending, Descending, Symmetrical) and Wedges
 */
function detectTrianglesAndWedges(candles: Candle[], pivots: Pivot[]): ChartPattern[] {
  const patterns: ChartPattern[] = [];
  const highs = pivots.filter((p) => p.type === 'HIGH');
  const lows = pivots.filter((p) => p.type === 'LOW');
  const lastIndex = candles.length - 1;
  const currentPrice = candles[lastIndex]?.close || 0;

  if (highs.length < 2 || lows.length < 2) return patterns;

  // Inspect recent subsets of highs and lows (last 2-3 of each)
  const h1 = highs[highs.length - 2];
  const h2 = highs[highs.length - 1];
  const l1 = lows[lows.length - 2];
  const l2 = lows[lows.length - 1];

  const startIndex = Math.min(h1.index, l1.index);
  const endIndex = Math.max(h2.index, l2.index);

  if (endIndex - startIndex < 8) return patterns;

  const highSlope = (h2.price - h1.price) / (h2.index - h1.index);
  const lowSlope = (l2.price - l1.price) / (l2.index - l1.index);

  const avgPrice = (h1.price + l1.price) / 2;
  const normalizedHighSlope = highSlope / avgPrice;
  const normalizedLowSlope = lowSlope / avgPrice;

  const height = h1.price - l1.price;
  if (height <= 0) return patterns;

  // Ascending Triangle: Flat Resistance (nearly equal highs) & Rising Support (higher lows)
  const isHighFlat = Math.abs(h1.price - h2.price) / avgPrice < 0.015;
  const isLowRising = normalizedLowSlope > 0.0003;

  if (isHighFlat && isLowRising) {
    const resistance = (h1.price + h2.price) / 2;
    const targetPrice = resistance + height;
    const stopLossPrice = l2.price * 0.99;
    const isConfirmed = currentPrice >= resistance * 0.998;

    patterns.push({
      id: `at_${startIndex}_${endIndex}`,
      type: 'ASCENDING_TRIANGLE',
      name: 'Ascending Triangle',
      sentiment: 'BULLISH',
      startIndex,
      endIndex,
      startTime: candles[startIndex].time,
      endTime: candles[endIndex].time,
      keyPoints: [
        { index: h1.index, time: h1.time, price: h1.price, label: 'Resistance 1' },
        { index: l1.index, time: l1.time, price: l1.price, label: 'Support 1' },
        { index: h2.index, time: h2.time, price: h2.price, label: 'Resistance 2' },
        { index: l2.index, time: l2.time, price: l2.price, label: 'Higher Low 2' }
      ],
      boundaryLines: [
        {
          startIndex: h1.index,
          endIndex: Math.min(lastIndex, h2.index + 8),
          startPrice: resistance,
          endPrice: resistance,
          type: 'resistance',
          label: `Resistance $${resistance.toFixed(2)}`
        },
        {
          startIndex: l1.index,
          endIndex: Math.min(lastIndex, l2.index + 8),
          startPrice: l1.price,
          endPrice: l1.price + lowSlope * (Math.min(lastIndex, l2.index + 8) - l1.index),
          type: 'support',
          label: 'Ascending Support'
        }
      ],
      breakoutPrice: resistance,
      targetPrice,
      stopLossPrice,
      height,
      confidence: 85,
      status: isConfirmed ? 'CONFIRMED' : 'FORMING',
      description: `Bullish coiling structure with persistent horizontal resistance ceiling at $${resistance.toFixed(2)} and steadily rising swing lows.`,
      tacticalAction: isConfirmed
        ? `Upside breakout in progress through $${resistance.toFixed(2)}. Measured move target is $${targetPrice.toFixed(2)}.`
        : `Watch for a clean daily close above $${resistance.toFixed(2)}. Trailing risk level at $${stopLossPrice.toFixed(2)}.`
    });
  }

  // Descending Triangle: Flat Support & Falling Resistance (lower highs)
  const isLowFlat = Math.abs(l1.price - l2.price) / avgPrice < 0.015;
  const isHighFalling = normalizedHighSlope < -0.0003;

  if (isLowFlat && isHighFalling) {
    const support = (l1.price + l2.price) / 2;
    const targetPrice = support - height;
    const stopLossPrice = h2.price * 1.01;
    const isConfirmed = currentPrice <= support * 1.002;

    patterns.push({
      id: `desc_t_${startIndex}_${endIndex}`,
      type: 'DESCENDING_TRIANGLE',
      name: 'Descending Triangle',
      sentiment: 'BEARISH',
      startIndex,
      endIndex,
      startTime: candles[startIndex].time,
      endTime: candles[endIndex].time,
      keyPoints: [
        { index: h1.index, time: h1.time, price: h1.price, label: 'Lower High 1' },
        { index: l1.index, time: l1.time, price: l1.price, label: 'Support 1' },
        { index: h2.index, time: h2.time, price: h2.price, label: 'Lower High 2' },
        { index: l2.index, time: l2.time, price: l2.price, label: 'Support 2' }
      ],
      boundaryLines: [
        {
          startIndex: l1.index,
          endIndex: Math.min(lastIndex, l2.index + 8),
          startPrice: support,
          endPrice: support,
          type: 'support',
          label: `Support $${support.toFixed(2)}`
        },
        {
          startIndex: h1.index,
          endIndex: Math.min(lastIndex, h2.index + 8),
          startPrice: h1.price,
          endPrice: h1.price + highSlope * (Math.min(lastIndex, h2.index + 8) - h1.index),
          type: 'resistance',
          label: 'Descending Resistance'
        }
      ],
      breakoutPrice: support,
      targetPrice,
      stopLossPrice,
      height,
      confidence: 84,
      status: isConfirmed ? 'CONFIRMED' : 'FORMING',
      description: `Bearish distribution pattern. Sellers pressing lower highs against a flat horizontal floor at $${support.toFixed(2)}.`,
      tacticalAction: isConfirmed
        ? `Breakdown through $${support.toFixed(2)} confirmed. Downside target at $${targetPrice.toFixed(2)}.`
        : `Floor under pressure at $${support.toFixed(2)}. A breakdown triggers strong defensive or short signal.`
    });
  }

  // Symmetrical Triangle: Lower highs and higher lows converging
  if (normalizedHighSlope < -0.0003 && normalizedLowSlope > 0.0003 && !isHighFlat && !isLowFlat) {
    const apexIndex = Math.round((l1.price - h1.price + highSlope * h1.index - lowSlope * l1.index) / (highSlope - lowSlope));
    const targetPrice = currentPrice + height * (currentPrice > (h2.price + l2.price) / 2 ? 1 : -1);

    patterns.push({
      id: `sym_t_${startIndex}_${endIndex}`,
      type: 'SYMMETRICAL_TRIANGLE',
      name: 'Symmetrical Triangle',
      sentiment: 'NEUTRAL',
      startIndex,
      endIndex,
      startTime: candles[startIndex].time,
      endTime: candles[endIndex].time,
      keyPoints: [
        { index: h1.index, time: h1.time, price: h1.price, label: 'Peak 1' },
        { index: l1.index, time: l1.time, price: l1.price, label: 'Trough 1' },
        { index: h2.index, time: h2.time, price: h2.price, label: 'Lower High' },
        { index: l2.index, time: l2.time, price: l2.price, label: 'Higher Low' }
      ],
      boundaryLines: [
        {
          startIndex: h1.index,
          endIndex: Math.min(lastIndex, h2.index + 8),
          startPrice: h1.price,
          endPrice: h1.price + highSlope * (Math.min(lastIndex, h2.index + 8) - h1.index),
          type: 'resistance',
          label: 'Upper Trendline'
        },
        {
          startIndex: l1.index,
          endIndex: Math.min(lastIndex, l2.index + 8),
          startPrice: l1.price,
          endPrice: l1.price + lowSlope * (Math.min(lastIndex, l2.index + 8) - l1.index),
          type: 'support',
          label: 'Lower Trendline'
        }
      ],
      breakoutPrice: (h2.price + l2.price) / 2,
      targetPrice,
      stopLossPrice: (h2.price + l2.price) / 2,
      height,
      confidence: 80,
      status: 'FORMING',
      description: `Volatility compression pattern. Converging bounds indicate impending explosive volatility expansion.`,
      tacticalAction: `Wait for directional breakout from the converging trendlines before initiating directional swing exposure.`
    });
  }

  // Falling Wedge (Bullish Reversal): Both slopes negative, but lows falling faster than highs
  if (normalizedHighSlope < -0.0003 && normalizedLowSlope < -0.0003 && normalizedHighSlope > normalizedLowSlope) {
    patterns.push({
      id: `fw_${startIndex}_${endIndex}`,
      type: 'FALLING_WEDGE',
      name: 'Falling Wedge',
      sentiment: 'BULLISH',
      startIndex,
      endIndex,
      startTime: candles[startIndex].time,
      endTime: candles[endIndex].time,
      keyPoints: [
        { index: h1.index, time: h1.time, price: h1.price, label: 'Upper 1' },
        { index: l1.index, time: l1.time, price: l1.price, label: 'Lower 1' },
        { index: h2.index, time: h2.time, price: h2.price, label: 'Upper 2' },
        { index: l2.index, time: l2.time, price: l2.price, label: 'Lower 2' }
      ],
      boundaryLines: [
        {
          startIndex: h1.index,
          endIndex: Math.min(lastIndex, h2.index + 8),
          startPrice: h1.price,
          endPrice: h1.price + highSlope * (Math.min(lastIndex, h2.index + 8) - h1.index),
          type: 'resistance',
          label: 'Upper Wedge'
        },
        {
          startIndex: l1.index,
          endIndex: Math.min(lastIndex, l2.index + 8),
          startPrice: l1.price,
          endPrice: l1.price + lowSlope * (Math.min(lastIndex, l2.index + 8) - l1.index),
          type: 'support',
          label: 'Lower Wedge'
        }
      ],
      breakoutPrice: h2.price,
      targetPrice: h1.price,
      stopLossPrice: l2.price * 0.985,
      height,
      confidence: 82,
      status: currentPrice > h2.price ? 'CONFIRMED' : 'FORMING',
      description: `Bullish reversal wedge. Downward momentum is losing velocity as support contracts relative to resistance.`,
      tacticalAction: `Look for an upward breakout through the descending resistance trendline toward initial target of $${h1.price.toFixed(2)}.`
    });
  }

  return patterns;
}

/**
 * Detect Bull Flag and Bear Flag Patterns
 */
function detectFlags(candles: Candle[]): ChartPattern[] {
  const patterns: ChartPattern[] = [];
  const n = candles.length;
  if (n < 20) return patterns;

  // Scan recent windows for pole + consolidation
  for (let end = n - 1; end >= Math.max(12, n - 40); end -= 4) {
    // Look back for a pole of 3 to 8 bars
    for (let poleLen = 3; poleLen <= 7; poleLen++) {
      const poleStart = end - poleLen - 8;
      const poleEnd = end - 8;
      if (poleStart < 0) continue;

      const poleGain = (candles[poleEnd].high - candles[poleStart].low) / candles[poleStart].low;
      const poleHeight = candles[poleEnd].high - candles[poleStart].low;

      // Bull Flag: strong pole rise >= 4%
      if (poleGain >= 0.04) {
        // Flag consolidation from poleEnd to end (should be mild pullback <= 50% of pole)
        const flagCandles = candles.slice(poleEnd, end + 1);
        const flagLow = Math.min(...flagCandles.map((c) => c.low));
        const flagHigh = Math.max(...flagCandles.map((c) => c.high));
        const retrace = (candles[poleEnd].high - flagLow) / poleHeight;

        if (retrace >= 0.15 && retrace <= 0.55) {
          const currentPrice = candles[n - 1].close;
          const breakoutPrice = flagHigh;
          const targetPrice = breakoutPrice + poleHeight;
          const stopLossPrice = flagLow * 0.99;
          const isConfirmed = currentPrice >= breakoutPrice * 0.995;

          patterns.push({
            id: `bf_${poleStart}_${end}`,
            type: 'BULL_FLAG',
            name: 'Bull Flag',
            sentiment: 'BULLISH',
            startIndex: poleStart,
            endIndex: end,
            startTime: candles[poleStart].time,
            endTime: candles[end].time,
            keyPoints: [
              { index: poleStart, time: candles[poleStart].time, price: candles[poleStart].low, label: 'Pole Start' },
              { index: poleEnd, time: candles[poleEnd].time, price: candles[poleEnd].high, label: 'Pole Peak' },
              { index: end, time: candles[end].time, price: flagLow, label: 'Flag Support' }
            ],
            boundaryLines: [
              {
                startIndex: poleStart,
                endIndex: poleEnd,
                startPrice: candles[poleStart].low,
                endPrice: candles[poleEnd].high,
                type: 'support',
                label: `Pole (+${(poleGain * 100).toFixed(1)}%)`
              },
              {
                startIndex: poleEnd,
                endIndex: end + 4,
                startPrice: flagHigh,
                endPrice: flagHigh,
                type: 'resistance',
                label: `Flag Resistance $${flagHigh.toFixed(2)}`
              },
              {
                startIndex: poleEnd,
                endIndex: end + 4,
                startPrice: flagLow,
                endPrice: flagLow,
                type: 'support',
                label: `Flag Support $${flagLow.toFixed(2)}`
              }
            ],
            breakoutPrice,
            targetPrice,
            stopLossPrice,
            height: poleHeight,
            confidence: 86,
            status: isConfirmed ? 'CONFIRMED' : 'FORMING',
            description: `High-momentum bullish continuation flag following a +${(poleGain * 100).toFixed(1)}% impulse impulse pole.`,
            tacticalAction: isConfirmed
              ? `Breakout above flag resistance confirmed. Measured continuation target at $${targetPrice.toFixed(2)}.`
              : `Consolidation holding above 50% retracement ($${flagLow.toFixed(2)}). Buy breakout above $${breakoutPrice.toFixed(2)}.`
          });
          break; // Avoid overlapping flag duplicates
        }
      }
    }
  }

  return patterns;
}

/**
 * Detect Cup and Handle with Volatility Contraction Pattern (VCP)
 * Classical William O'Neil & Mark Minervini institutional accumulation base
 */
function detectCupAndHandleVCP(candles: Candle[], pivots: Pivot[]): ChartPattern[] {
  const patterns: ChartPattern[] = [];
  const n = candles.length;
  if (n < 22) return patterns;

  const highs = pivots.filter((p) => p.type === 'HIGH');
  const lows = pivots.filter((p) => p.type === 'LOW');
  const currentPrice = candles[n - 1]?.close || 0;

  for (let i = 0; i < highs.length - 1; i++) {
    const leftRim = highs[i];

    // Find candidate right rim within reasonable distance (12 to 75 bars)
    for (let j = i + 1; j < highs.length; j++) {
      const rightRim = highs[j];
      const cupSpan = rightRim.index - leftRim.index;
      if (cupSpan < 12 || cupSpan > 75) continue;

      // Rim prices should be close (within 4.5% of each other)
      const avgRimPrice = (leftRim.price + rightRim.price) / 2;
      const rimDiff = Math.abs(leftRim.price - rightRim.price) / avgRimPrice;
      if (rimDiff > 0.045) continue;

      // Find lowest point between left and right rim (Cup Base / T1 Contraction)
      const interveningLows = lows.filter((l) => l.index > leftRim.index && l.index < rightRim.index);
      if (interveningLows.length === 0) continue;

      const cupBottom = interveningLows.reduce((min, l) => (l.price < min.price ? l : min), interveningLows[0]);
      const cupDepth = avgRimPrice - cupBottom.price;
      const cupDepthPct = cupDepth / avgRimPrice;

      // Cup must have meaningful depth (7% to 38%)
      if (cupDepthPct < 0.07 || cupDepthPct > 0.38) continue;

      // Bottom should be reasonably centered (between 20% and 80% of span)
      const bottomRatio = (cupBottom.index - leftRim.index) / cupSpan;
      if (bottomRatio < 0.2 || bottomRatio > 0.8) continue;

      // Look for Handle / VCP Contraction after the right rim
      const handleStart = rightRim.index;
      const handleEnd = Math.min(n - 1, handleStart + Math.max(4, Math.round(cupSpan * 0.45)));
      if (handleEnd <= handleStart + 2) continue;

      const handleCandles = candles.slice(handleStart, handleEnd + 1);
      const handleLowCandle = handleCandles.reduce((min, c) => (c.low < min.low ? c : min), handleCandles[0]);
      const handleLowPrice = handleLowCandle.low;
      const handleLowIndex = handleStart + handleCandles.indexOf(handleLowCandle);

      const handlePullback = rightRim.price - handleLowPrice;
      const handlePullbackPct = handlePullback / rightRim.price;

      // Handle contraction criteria (VCP T2):
      // 1. Pullback must be shallower than cup depth (typically 2% to 15%, max 50% of cup depth)
      if (handlePullbackPct < 0.02 || handlePullbackPct > 0.15) continue;
      if (handlePullback > cupDepth * 0.52) continue;

      // 2. Handle low must hold well above the cup midpoint
      const cupMidpoint = cupBottom.price + cupDepth * 0.48;
      if (handleLowPrice < cupMidpoint) continue;

      const breakoutPrice = Math.max(leftRim.price, rightRim.price);
      const targetPrice = breakoutPrice + cupDepth;
      const stopLossPrice = Number((handleLowPrice * 0.985).toFixed(2));

      const isConfirmed = currentPrice >= breakoutPrice * 0.995;
      const isBroken = currentPrice < stopLossPrice;
      const status: 'CONFIRMED' | 'FORMING' | 'BROKEN' = isBroken
        ? 'BROKEN'
        : isConfirmed
        ? 'CONFIRMED'
        : 'FORMING';

      // Higher confidence when volatility contracts progressively and cup is well-formed
      const confidence = Math.round(
        Math.max(76, Math.min(95, 92 - rimDiff * 250 - Math.abs(handlePullbackPct - 0.06) * 120 + (isConfirmed ? 5 : 0)))
      );

      patterns.push({
        id: `vcp_cup_${leftRim.index}_${handleEnd}`,
        type: 'CUP_AND_HANDLE_VCP',
        name: 'Cup and Handle VCP',
        sentiment: 'BULLISH',
        startIndex: leftRim.index,
        endIndex: handleEnd,
        startTime: leftRim.time,
        endTime: candles[handleEnd].time,
        keyPoints: [
          { index: leftRim.index, time: leftRim.time, price: leftRim.price, label: 'Cup Left Rim' },
          { index: cupBottom.index, time: cupBottom.time, price: cupBottom.price, label: 'Cup Base (T1 Contraction)' },
          { index: rightRim.index, time: rightRim.time, price: rightRim.price, label: 'Cup Right Rim' },
          { index: handleLowIndex, time: handleLowCandle.time, price: handleLowPrice, label: 'VCP Handle Low (T2 Contraction)' },
          { index: handleEnd, time: candles[handleEnd].time, price: candles[handleEnd].close, label: 'VCP Pivot' }
        ],
        neckline: {
          startIndex: leftRim.index,
          endIndex: handleEnd + 6,
          startPrice: breakoutPrice,
          endPrice: breakoutPrice,
          label: `VCP Pivot $${breakoutPrice.toFixed(2)}`
        },
        boundaryLines: [
          {
            startIndex: leftRim.index,
            endIndex: handleEnd + 6,
            startPrice: breakoutPrice,
            endPrice: breakoutPrice,
            type: 'neckline',
            label: `VCP Pivot $${breakoutPrice.toFixed(2)}`
          },
          {
            startIndex: leftRim.index,
            endIndex: cupBottom.index,
            startPrice: leftRim.price,
            endPrice: cupBottom.price,
            type: 'support',
            label: `Cup Left Slope (-${(cupDepthPct * 100).toFixed(0)}%)`
          },
          {
            startIndex: cupBottom.index,
            endIndex: rightRim.index,
            startPrice: cupBottom.price,
            endPrice: rightRim.price,
            type: 'support',
            label: 'Cup Recovery'
          },
          {
            startIndex: rightRim.index,
            endIndex: handleLowIndex,
            startPrice: rightRim.price,
            endPrice: handleLowPrice,
            type: 'resistance',
            label: `Handle Pullback (-${(handlePullbackPct * 100).toFixed(1)}%)`
          }
        ],
        breakoutPrice,
        targetPrice,
        stopLossPrice,
        height: cupDepth,
        confidence,
        status,
        description: `Institutional Cup & Handle Volatility Contraction Pattern (VCP). Initial cup base contraction of -${(cupDepthPct * 100).toFixed(1)}% followed by tight handle compression of -${(handlePullbackPct * 100).toFixed(1)}% with progressive supply dry-up.`,
        tacticalAction: isConfirmed
          ? `Breakout confirmed above VCP resistance pivot at $${breakoutPrice.toFixed(2)}. Measured extension target is $${targetPrice.toFixed(2)} with stop-loss protected at $${stopLossPrice.toFixed(2)}.`
          : `Handle volatility contraction forming. Prepare to enter on cheat pivot or high-volume breakout above $${breakoutPrice.toFixed(2)}. Invalidation strictly below $${stopLossPrice.toFixed(2)}.`
      });
      break; // Avoid overlapping duplicate cups for this left rim
    }
  }

  return patterns;
}

/**
 * Master Chart Pattern Auto Identifier
 * Evaluates candles and returns all detected chart patterns sorted by recency and confidence
 */
export function detectChartPatterns(candles: Candle[]): ChartPattern[] {
  if (!candles || candles.length < 15) {
    return [];
  }

  const pivots = findPivots(candles, 3);
  const cupAndHandles = detectCupAndHandleVCP(candles, pivots);
  const doubleBottoms = detectDoubleBottoms(candles, pivots);
  const doubleTops = detectDoubleTops(candles, pivots);
  const headAndShoulders = detectHeadAndShoulders(candles, pivots);
  const trianglesAndWedges = detectTrianglesAndWedges(candles, pivots);
  const flags = detectFlags(candles);

  const allPatterns = [
    ...cupAndHandles,
    ...doubleBottoms,
    ...doubleTops,
    ...headAndShoulders,
    ...trianglesAndWedges,
    ...flags
  ];

  // Deduplicate patterns that share overlapping start/end indices and type
  const uniquePatterns: ChartPattern[] = [];
  for (const pat of allPatterns) {
    const isDuplicate = uniquePatterns.some(
      (existing) =>
        existing.type === pat.type &&
        Math.abs(existing.startIndex - pat.startIndex) <= 3 &&
        Math.abs(existing.endIndex - pat.endIndex) <= 3
    );

    if (!isDuplicate) {
      uniquePatterns.push(pat);
    }
  }

  // Sort by most recent endIndex first, then by confidence
  return uniquePatterns.sort((a, b) => {
    if (b.endIndex !== a.endIndex) {
      return b.endIndex - a.endIndex;
    }
    return b.confidence - a.confidence;
  });
}
