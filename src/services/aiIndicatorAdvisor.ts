import { Candle, StockQuote, SwingCandleInterval, TimeframeInterval } from '../types';

export interface IndicatorPresetFlags {
  showSMA20: boolean;
  showSMA50: boolean;
  showSMA200: boolean;
  showEMA9: boolean;
  showEMA21: boolean;
  showBollinger: boolean;
  showVWAP: boolean;
  showSR: boolean;
  showFibonacci: boolean;
  showVolume: boolean;
  showVolMA: boolean;
  showVolumeProfile: boolean;
  showCandleSignals?: boolean;
  showChartPatterns?: boolean;
}

export type IndicatorHierarchyTierId = 'tier1' | 'tier2' | 'tier3' | 'tier4';

export interface IndicatorHierarchyItem {
  key: keyof IndicatorPresetFlags;
  name: string;
  fullName: string;
  description: string;
  color: string;
  categoryRole: string;
}

export interface IndicatorHierarchyTier {
  id: IndicatorHierarchyTierId;
  tierNumber: 1 | 2 | 3 | 4;
  title: string;
  badge: string;
  isDefaultOn: boolean;
  rankLabel: string;
  rationale: string;
  whyMustRead: string;
  indicators: IndicatorHierarchyItem[];
}

export const INDICATOR_HIERARCHY_TIERS: IndicatorHierarchyTier[] = [
  {
    id: 'tier1',
    tierNumber: 1,
    title: 'Market Structure & Baseline Value',
    badge: 'Tier 1 (Highest Hierarchy)',
    isDefaultOn: true,
    rankLabel: 'Highest Hierarchy (Primary Baseline - Default ON)',
    rationale:
      'Tier 1 defines the fundamental structural boundaries of supply, demand, and fair value. Every professional order-flow algorithm benchmarks against horizontal structural floors/ceilings, institutional VWAP, and volume value areas. Without knowing where key levels lie, all lower-tier indicators lack spatial context.',
    whyMustRead:
      'Tier 1 answers WHERE to trade. It prevents buying directly into major overhead resistance or shorting into heavy institutional support.',
    indicators: [
      {
        key: 'showSR',
        name: 'S/R Lines',
        fullName: 'Support & Resistance Key Levels',
        description: 'Dynamic price floors and ceilings anchored by swing extremes and rejection wicks',
        color: '#f43f5e',
        categoryRole: 'Primary horizontal structure'
      },
      {
        key: 'showVWAP',
        name: 'VWAP',
        fullName: 'Volume-Weighted Average Price & σ Bands',
        description: 'Institutional day-trade benchmark price where large bank orders are filled',
        color: '#06b6d4',
        categoryRole: 'Fair-value equilibrium anchor'
      },
      {
        key: 'showVolumeProfile',
        name: 'Volume Profile',
        fullName: 'Volume Profile (POC & 70% Value Area)',
        description: 'Horizontal liquidity nodes showing high-volume accumulation hubs vs low-volume voids',
        color: '#f59e0b',
        categoryRole: 'Volume density distribution'
      }
    ]
  },
  {
    id: 'tier2',
    tierNumber: 2,
    title: 'Trend Bias & Volatility Envelopes',
    badge: 'Tier 2 (Secondary)',
    isDefaultOn: false,
    rankLabel: 'Secondary Hierarchy (Trend & Volatility Filter)',
    rationale:
      'Tier 2 filters out market noise and establishes the directional regime. Moving averages reveal the institutional tide, Bollinger Bands quantify statistical contraction (squeezes) and 2-sigma expansions, and Fibonacci retracements locate the mathematical golden pocket (0.50–0.65) for pullback re-entries.',
    whyMustRead:
      'Tier 2 answers WHICH DIRECTION to lean. Trading with the prevailing trend direction increases trade expectancy by over 35% compared to fighting the trend.',
    indicators: [
      {
        key: 'showSMA50',
        name: 'SMA 50',
        fullName: '50-Period Simple Moving Average',
        description: 'The canonical institutional intermediate trend waterline',
        color: '#f59e0b',
        categoryRole: 'Intermediate trend baseline'
      },
      {
        key: 'showSMA20',
        name: 'SMA 20',
        fullName: '20-Period Simple Moving Average',
        description: 'Fast moving institutional dynamic equilibrium baseline',
        color: '#38bdf8',
        categoryRole: 'Short-term trend mean'
      },
      {
        key: 'showSMA200',
        name: 'SMA 200',
        fullName: '200-Period Simple Moving Average',
        description: 'The macro dividing line between secular bull and bear markets',
        color: '#a855f7',
        categoryRole: 'Macro secular regime'
      },
      {
        key: 'showEMA9',
        name: 'EMA 9',
        fullName: '9-Period Exponential Moving Average',
        description: 'Fast reactive momentum trigger for strong runners',
        color: '#34d399',
        categoryRole: 'Momentum acceleration guide'
      },
      {
        key: 'showEMA21',
        name: 'EMA 21',
        fullName: '21-Period Exponential Moving Average',
        description: 'Core trend pullback and trailing stop guide',
        color: '#ec4899',
        categoryRole: 'Dynamic swing support'
      },
      {
        key: 'showBollinger',
        name: 'Bollinger Bands',
        fullName: 'Bollinger Bands (20, 2σ)',
        description: 'Volatility envelope measuring statistical contraction and mean reversion',
        color: '#10b981',
        categoryRole: 'Volatility envelope & mean reversion'
      },
      {
        key: 'showFibonacci',
        name: 'Fibonacci',
        fullName: 'Fibonacci Retracements & Golden Pocket',
        description: 'Mathematical equilibrium retracement zones (0.50, 0.618, 0.65)',
        color: '#fbbf24',
        categoryRole: 'Pullback depth measurement'
      }
    ]
  },
  {
    id: 'tier3',
    tierNumber: 3,
    title: 'Volume Participation & Order Flow',
    badge: 'Tier 3 (Tertiary)',
    isDefaultOn: false,
    rankLabel: 'Tertiary Hierarchy (Volume & Liquidity Confirmation)',
    rationale:
      'Volume is the fuel of price movement. While price action shows direction, volume discloses institutional conviction. Tier 3 differentiates between three distinct dimensions of volume: (1) Turnover Magnitude (raw bars), (2) Institutional Surge Baseline (Vol MA 20), and (3) Price-Level Liquidity Clusters (Volume Profile POC/HVN/LVN).',
    whyMustRead:
      'Tier 3 answers WHETHER THE MOVE IS REAL. A price breakout without institutional volume expansion is statistically prone to failure (bull/bear trap). Each Tier 3 indicator addresses a separate question: Volume Bars show raw size, Vol MA shows relative institutional commitment, and Volume Profile shows where liquidity is concentrated.',
    indicators: [
      {
        key: 'showVolume',
        name: 'Volume Bars',
        fullName: 'Volume Histogram (Raw Turnover Magnitude)',
        description: 'Quantifies absolute raw share/contract turnover per bar to gauge immediate market participation',
        color: '#0ea5e9',
        categoryRole: 'Raw turnover size (per candle)'
      },
      {
        key: 'showVolMA',
        name: 'Vol MA 20',
        fullName: '20-Period Volume Moving Average (Surge Benchmark)',
        description: 'Benchmarks current volume against 20-bar rolling average. Detects institutional accumulation (>1.5x) vs low-volume dry-up',
        color: '#38bdf8',
        categoryRole: 'Institutional surge test (>1.5x avg)'
      },
      {
        key: 'showVolumeProfile',
        name: 'Volume Profile (POC/HVN/LVN)',
        fullName: 'Horizontal Auction Market Profile (Price-Level Liquidity)',
        description: 'Maps volume by price level rather than time. Identifies Point of Control (POC), Value Area (70%), and HVN/LVN liquidity magnets and voids',
        color: '#f59e0b',
        categoryRole: 'Horizontal liquidity clusters by price'
      }
    ]
  },
  {
    id: 'tier4',
    tierNumber: 4,
    title: 'Pattern Confluence Set (Triggers & Structure)',
    badge: 'Tier 4 (Tactical Set)',
    isDefaultOn: false,
    rankLabel: 'Tactical Hierarchy (Pattern Confluence Set)',
    rationale:
      'Candlestick Patterns and Chart Patterns are grouped as one integrated execution set. Candlestick Patterns provide the micro-trigger candle (hammer, pinbar, engulfing), while Chart Patterns identify the macro geometric formation (Cup and Handle VCP, Double Bottom/Top, Triangles, Wedges, Flags). Together, they define exact entry triggers, mathematical risk/reward ratios, and precise stop-loss levels.',
    whyMustRead:
      'Tier 4 answers EXACTLY WHEN TO ENTER & EXIT. It turns structural bias and trend direction into executable orders with tight, asymmetric risk parameters.',
    indicators: [
      {
        key: 'showCandleSignals',
        name: 'Candlestick Patterns',
        fullName: 'Candlestick Patterns (Hammer, Engulfing, Morning Star, Pinbar, Doji)',
        description: 'High-probability candlestick reversals and continuation candle triggers',
        color: '#8b5cf6',
        categoryRole: 'Micro-trigger execution'
      },
      {
        key: 'showChartPatterns',
        name: 'Chart Patterns',
        fullName: 'Chart Patterns (Cup and Handle VCP, Double Bottom/Top, Triangles, Wedges, Flags)',
        description: 'Multi-bar geometric consolidations, volatility contraction, and breakout structures',
        color: '#ec4899',
        categoryRole: 'Macro structural formation'
      }
    ]
  }
];

export const HIERARCHY_PHILOSOPHY = {
  title: 'Why All Hierarchy Tiers Must Be Read for Better Informed Decisions',
  summary:
    'In professional technical analysis, no indicator exists in isolation. Relying on a single indicator produces frequent false signals, whipsaws, and bad fills. Reading all four tiers creates Multi-Layered Confluence where your statistical edge is maximized.',
  principles: [
    {
      tier: 'Tier 1 (Highest)',
      name: 'Structure Answers WHERE to Trade',
      detail:
        'S/R Lines, VWAP, and Volume Profile map the institutional battlefield. You never buy at resistance or short into institutional support, regardless of how bullish an oscillator appears.'
    },
    {
      tier: 'Tier 2 (Secondary)',
      name: 'Trend Bias Answers WHICH DIRECTION to Lean',
      detail:
        'Moving averages and volatility envelopes establish the market regime. Trading with the 50 SMA / EMA trend increases win rates by over 35% compared to counter-trend trading.'
    },
    {
      tier: 'Tier 3 (Tertiary)',
      name: 'Volume Answers WHETHER THE MOVE IS REAL',
      detail:
        'A breakout on dry volume is the number one cause of bull/bear traps. Tier 3 verifies institutional accumulation (>1.5x average) or volume dry-up before risking capital.'
    },
    {
      tier: 'Tier 4 (Tactical Set)',
      name: 'Pattern Set Answers EXACTLY WHEN TO ENTER & EXIT',
      detail:
        'Candlestick Patterns and Chart Patterns (such as Cup & Handle VCP) provide exact entry triggers, tight stop-loss invalidation prices, and measured-move profit targets.'
    }
  ],
  conclusion:
    'When Tier 1 (Key Level) + Tier 2 (Trend Bias) + Tier 3 (Volume Conviction) + Tier 4 (Pattern Trigger) coincide at the same price zone, all tiers achieve Multi-Tier Confluence — turning random speculation into disciplined, institutional high-probability execution.'
};

export function getHierarchyTierFlags(
  selectedTierIds: IndicatorHierarchyTierId[],
  baseFlags?: Partial<IndicatorPresetFlags>
): IndicatorPresetFlags {
  // Start with clean slate
  const flags: IndicatorPresetFlags = {
    showSMA20: false,
    showSMA50: false,
    showSMA200: false,
    showEMA9: false,
    showEMA21: false,
    showBollinger: false,
    showVWAP: false,
    showSR: false,
    showFibonacci: false,
    showVolume: false,
    showVolMA: false,
    showVolumeProfile: false,
    showCandleSignals: false,
    showChartPatterns: false,
    ...baseFlags
  };

  for (const tier of INDICATOR_HIERARCHY_TIERS) {
    if (selectedTierIds.includes(tier.id)) {
      for (const ind of tier.indicators) {
        flags[ind.key] = true;
      }
    }
  }

  return flags;
}

export interface IndicatorRecommendation {
  timeframe: string;
  category: 'SWING' | 'DAY_TRADE';
  modeLabel: string;
  title: string;
  badge: string;
  objective: string;
  primaryIndicators: { name: string; color: string; role: string }[];
  activeFlags: IndicatorPresetFlags;
  rationale: string;
  tactics: string[];
  riskTip: string;
  marketContext?: {
    trend: 'BULLISH' | 'BEARISH' | 'CONSOLIDATING';
    volatility: 'LOW' | 'NORMAL' | 'ELEVATED' | 'HIGH';
    volatilityNote: string;
  };
}

// ---------------------------------------------------------------------------
// SWING RANGE PRESETS (Daily 1d, Weekly 1wk, Monthly 1mo)
// ---------------------------------------------------------------------------
export const SWING_INDICATOR_PRESETS: Record<SwingCandleInterval, IndicatorRecommendation> = {
  '1d': {
    timeframe: '1d',
    category: 'SWING',
    modeLabel: 'Swing Range',
    title: 'Daily Swing Trend & Volatility Envelope',
    badge: '1D Daily',
    objective: 'Multi-day to multi-week momentum rides, key swing pivots, and mean-reversion re-entries.',
    primaryIndicators: [
      { name: 'S/R Lines', color: '#f43f5e', role: 'Macro horizontal support/resistance floors & ceilings' },
      { name: 'SMA 50', color: '#f59e0b', role: 'Core institutional intermediate trend waterline' },
      { name: 'Bollinger (20,2)', color: '#10b981', role: 'Volatility contraction/expansion & 2-sigma mean reversion' },
      { name: 'Fibonacci', color: '#fbbf24', role: 'Golden pocket (0.50–0.618) retracement zones for pullback re-entries' },
      { name: 'Volume + Vol MA 20', color: '#38bdf8', role: 'Institutional accumulation/distribution confirmation' }
    ],
    activeFlags: {
      showSMA20: false,
      showSMA50: true,
      showSMA200: false,
      showEMA9: false,
      showEMA21: false,
      showBollinger: true,
      showVWAP: false,
      showSR: true,
      showFibonacci: true,
      showVolume: true,
      showVolMA: true,
      showVolumeProfile: false,
      showCandleSignals: false,
      showChartPatterns: true
    },
    rationale:
      'Daily candlesticks are the institutional benchmark for swing trades. The 50-day SMA filters out short-term market noise to clarify the true trend direction. Bollinger Bands highlight high-probability mean-reversion bounces when price stretches outside 2-sigma envelopes, while Fibonacci retracements pinpoint high-probability re-entries at the 50% and 61.8% golden ratios. Horizontal S/R lines provide objective profit targets and invalidation levels.',
    tactics: [
      'Enter pullbacks towards the rising 50 SMA or middle Bollinger band (20 SMA) in an established uptrend.',
      'Confirm swing dip entries with Fibonacci 50%/61.8% confluence against historical daily S/R levels.',
      'Require above-average daily volume on breakout candles to avoid bull/bear traps.',
      'Take partial profits at upper Bollinger band or major resistance levels.'
    ],
    riskTip: 'Anchor daily swing stop-losses strictly below the nearest daily swing pivot or lower Bollinger Band.'
  },

  '1wk': {
    timeframe: '1wk',
    category: 'SWING',
    modeLabel: 'Swing Range',
    title: 'Weekly Macro Cycle & Institutional Positioning',
    badge: '1W Weekly',
    objective: 'Multi-month structural cycle positioning, major bull/bear regimes, and institutional volume.',
    primaryIndicators: [
      { name: 'S/R Lines', color: '#f43f5e', role: 'Multi-quarter structural barriers & cycle pivot extremes' },
      { name: 'SMA 50', color: '#f59e0b', role: 'Primary macro trend filter (1-year institutional baseline)' },
      { name: 'SMA 200', color: '#a855f7', role: 'Secular bull/bear dividing line (4-year institutional anchor)' },
      { name: 'Volume Profile (VP)', color: '#f59e0b', role: 'Identifies institutional accumulation Point of Control (POC)' },
      { name: 'Fibonacci', color: '#fbbf24', role: 'Measures multi-month retracements from 52-week highs/lows' }
    ],
    activeFlags: {
      showSMA20: false,
      showSMA50: true,
      showSMA200: true,
      showEMA9: false,
      showEMA21: false,
      showBollinger: false,
      showVWAP: false,
      showSR: true,
      showFibonacci: true,
      showVolume: false,
      showVolMA: false,
      showVolumeProfile: true,
      showCandleSignals: false,
      showChartPatterns: true
    },
    rationale:
      'Weekly candlesticks filter out all transient noise, revealing large-scale institutional accumulation and distribution. The 50-week and 200-week SMAs define the definitive secular regime (Golden/Death cross). Volume Profile exposes where billions in capital traded, identifying the Point of Control (POC) and 70% Value Area boundaries. Fibonacci levels map out multi-quarter cycle corrections.',
    tactics: [
      'Align heavy swing capital only in the direction of the weekly 50 & 200 SMA slope.',
      'Accumulate near the Volume Profile POC or Value Area Low (VAL) on strong macro stocks.',
      'Use 52-week high/low Fibonacci retracements to time multi-month base re-entries.'
    ],
    riskTip: 'Weekly swings require wider stop-loss buffers; scale position sizing down to preserve portfolio capital.'
  },

  '1mo': {
    timeframe: '1mo',
    category: 'SWING',
    modeLabel: 'Swing Range',
    title: 'Monthly Secular Baseline & Generational Horizons',
    badge: '1M Monthly',
    objective: 'Generational multi-year trend mapping, all-time high breakouts, and secular asset rebalancing.',
    primaryIndicators: [
      { name: 'S/R Lines', color: '#f43f5e', role: 'All-time highs, generational market tops, and secular floors' },
      { name: 'SMA 20', color: '#60a5fa', role: '20-month baseline (fundamental 1.5-year moving average)' },
      { name: 'SMA 50', color: '#f59e0b', role: 'Secular multi-year institutional trend line' },
      { name: 'Fibonacci', color: '#fbbf24', role: 'Generational cycle expansions and multi-year retracement arcs' },
      { name: 'Volume Bars', color: '#38bdf8', role: 'Detects multi-year institutional absorption & climax exhaustion' }
    ],
    activeFlags: {
      showSMA20: true,
      showSMA50: true,
      showSMA200: false,
      showEMA9: false,
      showEMA21: false,
      showBollinger: false,
      showVWAP: false,
      showSR: true,
      showFibonacci: true,
      showVolume: true,
      showVolMA: false,
      showVolumeProfile: false,
      showCandleSignals: false,
      showChartPatterns: false
    },
    rationale:
      'Monthly candlesticks outline the overarching multi-year market structure. Long-period Moving Averages and historical S/R lines eliminate intra-quarter volatility, framing the secular risk/reward for long-term swing holdings and core asset allocation.',
    tactics: [
      'Identify multi-year base breakouts above historic all-time-high S/R levels.',
      'Use monthly 20 SMA as long-term dynamic trailing support.',
      'Watch for extreme monthly volume climaxes signaling potential multi-year tops or generational bottoms.'
    ],
    riskTip: 'Monthly candle closes occur only once every 30 days; never anticipate a monthly close before month-end.'
  }
};

// ---------------------------------------------------------------------------
// DAY TRADE VIEW PRESETS (1m, 2m, 5m, 10m, 15m, 30m, 1h, 2h, 4h)
// ---------------------------------------------------------------------------
export const DAY_TRADE_INDICATOR_PRESETS: Record<string, IndicatorRecommendation> = {
  '1m': {
    timeframe: '1m',
    category: 'DAY_TRADE',
    modeLabel: 'Day Trade View',
    title: 'Ultra-Fast Scalp & Tape Flow',
    badge: '1m Scalp',
    objective: 'High-frequency micro-scalping, instantaneous order-flow alignment, and rapid liquidity captures.',
    primaryIndicators: [
      { name: 'VWAP', color: '#14b8a6', role: 'Definitive institutional intraday benchmark & directional bias' },
      { name: 'EMA 9', color: '#f472b6', role: 'Ultra-responsive dynamic trailing support for rapid momentum' },
      { name: 'S/R Lines', color: '#f43f5e', role: 'Pre-market extremes, previous day close, and intraday pivots' },
      { name: 'Volume + Vol MA 20', color: '#38bdf8', role: 'Instant detection of volume surges & liquidity sweeps' }
    ],
    activeFlags: {
      showSMA20: false,
      showSMA50: false,
      showSMA200: false,
      showEMA9: true,
      showEMA21: false,
      showBollinger: false,
      showVWAP: true,
      showSR: true,
      showFibonacci: false,
      showVolume: true,
      showVolMA: true,
      showVolumeProfile: false,
      showCandleSignals: false,
      showChartPatterns: false
    },
    rationale:
      '1-minute scalping requires zero lag. VWAP is the #1 institutional intraday anchor (trade long above, trade short below). The 9 EMA provides ultra-fast dynamic guide rails without cluttering the fast tape. Volume surges highlight liquidity sweeps and immediate micro-reversals.',
    tactics: [
      'Take quick scalps when price bounces off the 9 EMA in the direction of the VWAP slope.',
      'Exit immediately upon a 1m candle closing against the 9 EMA on above-average volume.',
      'Avoid initiating trades when price is tightly oscillating across a flat VWAP.'
    ],
    riskTip: 'Never average down on 1m trades; exit immediately if price violates your entry wick.'
  },

  '2m': {
    timeframe: '2m',
    category: 'DAY_TRADE',
    modeLabel: 'Day Trade View',
    title: 'Micro-Momentum & Ribbon Trend',
    badge: '2m Scalp',
    objective: 'Fast opening-drive momentum, micro-trend filtering, and cleaner sub-5m execution.',
    primaryIndicators: [
      { name: 'VWAP', color: '#14b8a6', role: 'Primary institutional bias anchor' },
      { name: 'EMA 9', color: '#f472b6', role: 'Fast dynamic momentum track' },
      { name: 'EMA 21', color: '#818cf8', role: 'Medium micro-trend filter & pullback cushion' },
      { name: 'S/R Lines', color: '#f43f5e', role: 'Intraday horizontal levels' },
      { name: 'Volume Bars', color: '#38bdf8', role: 'Confirmation of breakout participation' }
    ],
    activeFlags: {
      showSMA20: false,
      showSMA50: false,
      showSMA200: false,
      showEMA9: true,
      showEMA21: true,
      showBollinger: false,
      showVWAP: true,
      showSR: true,
      showFibonacci: false,
      showVolume: true,
      showVolMA: false,
      showVolumeProfile: false,
      showCandleSignals: false,
      showChartPatterns: false
    },
    rationale:
      'The 2-minute timeframe consolidates twice the tick data of 1m, filtering false head-fakes while preserving ultra-fast trade timing. The 9/21 EMA ribbon acts as dynamic trend support with VWAP providing institutional conviction.',
    tactics: [
      'Enter on 9/21 EMA bullish crosses that take place above VWAP.',
      'Trail your stop along the 21 EMA for runner positions.',
      'Watch for volume expansion through pre-market high/low S/R levels.'
    ],
    riskTip: 'Ensure 2m candles are expanding in volume before chasing breakouts.'
  },

  '5m': {
    timeframe: '5m',
    category: 'DAY_TRADE',
    modeLabel: 'Day Trade View',
    title: 'Core Day Trade & Opening Range Momentum',
    badge: '5m Benchmark',
    objective: 'The gold standard for day traders: Opening Range Breakouts (ORB), morning drives, and VWAP trends.',
    primaryIndicators: [
      { name: 'VWAP', color: '#14b8a6', role: 'Institutional fair value anchor & directional trend guide' },
      { name: 'EMA 9', color: '#f472b6', role: 'Fast momentum wave tracking' },
      { name: 'EMA 21', color: '#818cf8', role: 'Definitive intraday trend dynamic baseline' },
      { name: 'Bollinger (20,2)', color: '#10b981', role: 'Detects morning volatility squeeze breakouts & exhaustion' },
      { name: 'S/R Lines', color: '#f43f5e', role: 'Pre-market, opening range, and key psychological price levels' },
      { name: 'Candle Signals', color: '#38bdf8', role: 'Immediate pattern recognition (Hammers, Engulfing)' }
    ],
    activeFlags: {
      showSMA20: false,
      showSMA50: false,
      showSMA200: false,
      showEMA9: true,
      showEMA21: true,
      showBollinger: true,
      showVWAP: true,
      showSR: true,
      showFibonacci: false,
      showVolume: true,
      showVolMA: true,
      showVolumeProfile: false,
      showCandleSignals: true,
      showChartPatterns: true
    },
    rationale:
      'The 5-minute chart is the universally monitored timeframe for equity day trading. The 9/21 EMA stack creates a dynamic channel for momentum riders, VWAP determines overall bullish/bearish market posture, Bollinger Bands time opening squeeze expansions, and automated Candlestick Signals catch high-probability turnarounds.',
    tactics: [
      'Trade 5m Opening Range Breakouts (ORB) above VWAP with expanding Bollinger Bands.',
      'Buy pullbacks to the 9/21 EMA cloud when both EMAs are steeply angled.',
      'Look for Bullish Hammer or Engulfing signals at VWAP or key S/R support.'
    ],
    riskTip: 'Avoid chasing long trades when price is overextended >2.5% above VWAP; wait for a pullback.'
  },

  '10m': {
    timeframe: '10m',
    category: 'DAY_TRADE',
    modeLabel: 'Day Trade View',
    title: 'Intraday Momentum & Squeeze Continuation',
    badge: '10m Momentum',
    objective: 'Extended morning trend continuation and high-volume breakout filtering.',
    primaryIndicators: [
      { name: 'VWAP', color: '#14b8a6', role: 'Institutional benchmark' },
      { name: 'EMA 9', color: '#f472b6', role: 'Fast trend guide' },
      { name: 'SMA 20', color: '#60a5fa', role: 'Intraday trend baseline' },
      { name: 'Bollinger (20,2)', color: '#10b981', role: 'Volatility expansion & contraction' },
      { name: 'S/R Lines', color: '#f43f5e', role: 'Key horizontal intraday boundaries' },
      { name: 'Candle Signals', color: '#38bdf8', role: 'Pattern confirmation' }
    ],
    activeFlags: {
      showSMA20: true,
      showSMA50: false,
      showSMA200: false,
      showEMA9: true,
      showEMA21: false,
      showBollinger: true,
      showVWAP: true,
      showSR: true,
      showFibonacci: false,
      showVolume: true,
      showVolMA: false,
      showVolumeProfile: false,
      showCandleSignals: true,
      showChartPatterns: true
    },
    rationale:
      '10-minute bars smooth out 5-minute wicks during the post-open 10:00–11:30 AM window. Combining 9 EMA with 20 SMA and Bollinger Bands highlights squeeze setups before powerful second-leg trend continuations.',
    tactics: [
      'Hold winning runners as long as 10m candle closes hold above the 20 SMA.',
      'Enter on Bollinger squeeze expansion after a 10m consolidation.',
      'Confirm rejections at S/R lines with 10m reversal pin bars.'
    ],
    riskTip: 'Tighten trailing stops if the Bollinger Bands pinch tightly together into sideways chop.'
  },

  '15m': {
    timeframe: '15m',
    category: 'DAY_TRADE',
    modeLabel: 'Day Trade View',
    title: 'Session Market Architecture & Value Area Rotation',
    badge: '15m Structure',
    objective: 'Midday trend navigation, VWAP retests, and session structure rotations.',
    primaryIndicators: [
      { name: 'VWAP', color: '#14b8a6', role: 'Session fair value anchor' },
      { name: 'SMA 20', color: '#60a5fa', role: 'Short intraday trend filter' },
      { name: 'SMA 50', color: '#f59e0b', role: 'Major intraday support/resistance pivot' },
      { name: 'Volume Profile (VP)', color: '#f59e0b', role: 'Value Area High/Low (VAH/VAL) & Point of Control (POC)' },
      { name: 'Fibonacci', color: '#fbbf24', role: 'Intraday 50% & 61.8% morning-leg retracements' },
      { name: 'S/R Lines', color: '#f43f5e', role: 'Hard structural price floors' }
    ],
    activeFlags: {
      showSMA20: true,
      showSMA50: true,
      showSMA200: false,
      showEMA9: false,
      showEMA21: false,
      showBollinger: false,
      showVWAP: true,
      showSR: true,
      showFibonacci: true,
      showVolume: true,
      showVolMA: false,
      showVolumeProfile: true,
      showCandleSignals: false,
      showChartPatterns: true
    },
    rationale:
      '15-minute candlesticks define the true intraday structural architecture. The 20 and 50 SMAs act as institutional pullback zones, Volume Profile highlights Value Area rotations (trading from VAL to VAH), and Fibonacci retracements isolate precise golden-pocket bounce points.',
    tactics: [
      'Buy golden-pocket Fibonacci (0.618) pullbacks that align with the 15m 50 SMA or VWAP.',
      'Trade rotations between the Value Area Low (VAL) and Value Area High (VAH).',
      'Look for high-probability session trend continuations after 1:30 PM.'
    ],
    riskTip: 'The lunch hour (11:30 AM–1:30 PM) often forms chop between VAH and VAL; avoid breakout chasing.'
  },

  '30m': {
    timeframe: '30m',
    category: 'DAY_TRADE',
    modeLabel: 'Day Trade View',
    title: 'Institutional Session Pivot & Range Equilibrium',
    badge: '30m Pivot',
    objective: 'Half-day trend swings, afternoon reversal setups, and value migration.',
    primaryIndicators: [
      { name: 'VWAP', color: '#14b8a6', role: 'Session benchmark' },
      { name: 'SMA 20', color: '#60a5fa', role: 'Primary trend guide' },
      { name: 'SMA 50', color: '#f59e0b', role: 'Major institutional level' },
      { name: 'Bollinger (20,2)', color: '#10b981', role: 'Half-day volatility envelope' },
      { name: 'Volume Profile (VP)', color: '#f59e0b', role: 'Point of Control (POC) high volume node' },
      { name: 'S/R Lines', color: '#f43f5e', role: 'Key horizontal levels' }
    ],
    activeFlags: {
      showSMA20: true,
      showSMA50: true,
      showSMA200: false,
      showEMA9: false,
      showEMA21: false,
      showBollinger: true,
      showVWAP: true,
      showSR: true,
      showFibonacci: false,
      showVolume: true,
      showVolMA: false,
      showVolumeProfile: true,
      showCandleSignals: false,
      showChartPatterns: true
    },
    rationale:
      '30-minute intervals correspond directly to large-institution algorithmic TWAP and VWAP rebalancing blocks. The 20/50 SMA ribbon and Volume Profile POC determine whether the session is a directional trend day or balanced mean-reverting day.',
    tactics: [
      'Fade 30m Bollinger extremes when price is inside the Volume Profile Value Area.',
      'Follow 20/50 SMA trend direction during the final 90 minutes of the session.',
      'Target horizontal S/R lines for session-high/low projection targets.'
    ],
    riskTip: 'A 30m candle closing outside the Value Area indicates a regime transition from range to breakout trend.'
  },

  '1h': {
    timeframe: '1h',
    category: 'DAY_TRADE',
    modeLabel: 'Day Trade View',
    title: 'Hourly Dynamic Ribbon & Multi-Session Trend',
    badge: '1h Trend',
    objective: 'Multi-session intraday trend riding, gap-fill continuation, and macro intraday pivots.',
    primaryIndicators: [
      { name: 'S/R Lines', color: '#f43f5e', role: 'Multi-day structural support/resistance' },
      { name: 'SMA 20', color: '#60a5fa', role: 'Hourly dynamic trailing trendline' },
      { name: 'SMA 50', color: '#f59e0b', role: 'Primary institutional hourly baseline' },
      { name: 'SMA 200', color: '#a855f7', role: 'Macro multi-day pivot & regime boundary' },
      { name: 'Bollinger (20,2)', color: '#10b981', role: 'Identifies overextended hourly expansions' },
      { name: 'Fibonacci', color: '#fbbf24', role: 'Multi-day swing retracements' }
    ],
    activeFlags: {
      showSMA20: true,
      showSMA50: true,
      showSMA200: true,
      showEMA9: false,
      showEMA21: false,
      showBollinger: true,
      showVWAP: false,
      showSR: true,
      showFibonacci: true,
      showVolume: true,
      showVolMA: false,
      showVolumeProfile: false,
      showCandleSignals: false,
      showChartPatterns: true
    },
    rationale:
      'The 1-hour timeframe is heavily tracked by quant funds and institutional asset managers. The 20/50/200 SMA ribbon provides an unmistakable multi-day trend map, while Bollinger Bands highlight overbought exhaustion before pullbacks into dynamic 50 SMA support.',
    tactics: [
      'Ride the 20/50 SMA hourly trend with trailing stops behind the 50 SMA.',
      'Enter on 1h pullbacks to the 50 SMA or Fibonacci 0.382/0.5 support.',
      'Scale out at upper Bollinger Band touchpoints on extended hourly candles.'
    ],
    riskTip: 'An hourly candle close below the 50 SMA signals a decisive loss of short-term upside momentum.'
  },

  '2h': {
    timeframe: '2h',
    category: 'DAY_TRADE',
    modeLabel: 'Day Trade View',
    title: 'Half-Day Institutional Equilibrium & Liquidity Nodes',
    badge: '2h Balance',
    objective: 'Multi-day swing transitions, gap management, and high-volume node balance.',
    primaryIndicators: [
      { name: 'S/R Lines', color: '#f43f5e', role: 'Multi-day price framework' },
      { name: 'SMA 20', color: '#60a5fa', role: 'Short-term trend support' },
      { name: 'SMA 50', color: '#f59e0b', role: 'Intermediate trend filter' },
      { name: 'SMA 200', color: '#a855f7', role: 'Macro trend baseline' },
      { name: 'Volume Profile (VP)', color: '#f59e0b', role: 'Multi-session Point of Control' },
      { name: 'Fibonacci', color: '#fbbf24', role: 'Measures multi-day expansion legs' }
    ],
    activeFlags: {
      showSMA20: true,
      showSMA50: true,
      showSMA200: true,
      showEMA9: false,
      showEMA21: false,
      showBollinger: false,
      showVWAP: false,
      showSR: true,
      showFibonacci: true,
      showVolume: true,
      showVolMA: false,
      showVolumeProfile: true,
      showCandleSignals: false,
      showChartPatterns: true
    },
    rationale:
      '2-hour candlesticks split each trading session into clean morning and afternoon halves, eliminating micro noise while capturing institutional accumulation across multiple days around Volume Profile POCs.',
    tactics: [
      'Compare morning vs afternoon 2h volume to gauge institutional follow-through.',
      'Use 2h 20 SMA as dynamic trailing support on multi-day trends.',
      'Anchor Fibonacci retracements across consecutive 2h session swings.'
    ],
    riskTip: 'Do not hold high-leverage day trade positions overnight through 2h trend exhaustion.'
  },

  '4h': {
    timeframe: '4h',
    category: 'DAY_TRADE',
    modeLabel: 'Day Trade View',
    title: 'Day Trade / Swing Hybrid Bridge',
    badge: '4h Hybrid',
    objective: 'Premier bridge between intraday momentum and multi-day swing trend continuation.',
    primaryIndicators: [
      { name: 'S/R Lines', color: '#f43f5e', role: 'Key horizontal structure' },
      { name: 'SMA 50', color: '#f59e0b', role: 'Multi-week institutional baseline' },
      { name: 'SMA 200', color: '#a855f7', role: 'Macro trend regime boundary' },
      { name: 'Bollinger (20,2)', color: '#10b981', role: 'Multi-day squeeze expansions' },
      { name: 'Volume Profile (VP)', color: '#f59e0b', role: 'Multi-week fair value discovery' },
      { name: 'Fibonacci', color: '#fbbf24', role: 'Key golden pocket retracements' }
    ],
    activeFlags: {
      showSMA20: false,
      showSMA50: true,
      showSMA200: true,
      showEMA9: false,
      showEMA21: false,
      showBollinger: true,
      showVWAP: false,
      showSR: true,
      showFibonacci: true,
      showVolume: true,
      showVolMA: false,
      showVolumeProfile: true,
      showCandleSignals: false,
      showChartPatterns: true
    },
    rationale:
      '4-hour candles represent the premier bridge between day trading and swing trading. Institutional funds utilize 4h charts to execute multi-day block orders. The 50/200 SMA ribbon exposes major macro support, Bollinger Bands catch multi-day expansions, and Volume Profile highlights institutional fair value.',
    tactics: [
      'Look for 4h Bollinger squeeze breakouts for multi-day continuation moves.',
      'Enter at high-volume nodes (POC) aligned with the 4h trend.',
      'Use horizontal S/R lines for wide multi-day profit targets.'
    ],
    riskTip: 'Wait for a full 4h candle close to confirm breakout validity before entering.'
  }
};

/**
 * Intelligent helper that evaluates market context (volatility, trend) from the active candles
 * and returns the optimal recommendation customized for the active timeframe.
 */
export function getAIIndicatorRecommendation(
  isDayTradeView: boolean,
  interval: string,
  candles: Candle[] = [],
  quote?: StockQuote | null
): IndicatorRecommendation {
  let baseRecommendation: IndicatorRecommendation;

  if (isDayTradeView) {
    baseRecommendation = DAY_TRADE_INDICATOR_PRESETS[interval] || DAY_TRADE_INDICATOR_PRESETS['5m'];
  } else {
    baseRecommendation =
      SWING_INDICATOR_PRESETS[interval as SwingCandleInterval] || SWING_INDICATOR_PRESETS['1d'];
  }

  // Clone so we don't mutate static preset
  const rec: IndicatorRecommendation = JSON.parse(JSON.stringify(baseRecommendation));

  // Compute live market context if candles exist
  if (candles.length >= 10) {
    const recentCandles = candles.slice(-20);
    const firstClose = recentCandles[0].close;
    const lastClose = recentCandles[recentCandles.length - 1].close;
    const priceChangePct = ((lastClose - firstClose) / firstClose) * 100;

    let trend: 'BULLISH' | 'BEARISH' | 'CONSOLIDATING' = 'CONSOLIDATING';
    if (priceChangePct > 1.2) trend = 'BULLISH';
    else if (priceChangePct < -1.2) trend = 'BEARISH';

    // Compute average candle range %
    const avgRangePct =
      recentCandles.reduce((acc, c) => acc + (c.high - c.low) / c.close, 0) / recentCandles.length * 100;

    let volatility: 'LOW' | 'NORMAL' | 'ELEVATED' | 'HIGH' = 'NORMAL';
    let volNote = 'Typical price volatility';
    if (avgRangePct < 0.6) {
      volatility = 'LOW';
      volNote = 'Contracting volatility; prime for squeeze breakouts';
    } else if (avgRangePct > 2.5) {
      volatility = 'HIGH';
      volNote = 'Elevated volatility; wider S/R buffers recommended';
    } else if (avgRangePct > 1.4) {
      volatility = 'ELEVATED';
      volNote = 'Active volatility; strict stop-loss adherence advised';
    }

    rec.marketContext = {
      trend,
      volatility,
      volatilityNote: volNote
    };
  }

  return rec;
}
