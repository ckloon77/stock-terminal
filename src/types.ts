export interface StockQuote {
  symbol: string;
  name: string;
  sector?: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  currency?: string;
  exchange?: string;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  marketCap?: string;
  pe?: number;
  updatedAt: string;
  isLive?: boolean;
}

export interface Candle {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type SwingCandleInterval = '1d' | '1wk' | '1mo';

export type TimeframeInterval =
  | '1m'
  | '2m'
  | '5m'
  | '10m'
  | '15m'
  | '30m'
  | '1h'
  | '2h'
  | '4h'
  | '1d'
  | '1wk'
  | '1mo';

export type CandlestickSignalScope = 'all' | 'last';

export type CandlestickPatternType =
  | 'BULLISH_ENGULFING'
  | 'BEARISH_ENGULFING'
  | 'HAMMER'
  | 'INVERTED_HAMMER'
  | 'SHOOTING_STAR'
  | 'MORNING_STAR'
  | 'EVENING_STAR'
  | 'DOJI'
  | 'DRAGONFLY_DOJI'
  | 'GRAVESTONE_DOJI'
  | 'PIERCING_LINE'
  | 'DARK_CLOUD_COVER'
  | 'BULLISH_HARAMI'
  | 'BEARISH_HARAMI'
  | 'MARUBOZU_BULLISH'
  | 'MARUBOZU_BEARISH'
  | 'PIN_BAR_BULLISH'
  | 'PIN_BAR_BEARISH';

export interface CandlestickSignal {
  index: number;
  time: string;
  type: CandlestickPatternType;
  label: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  significance: 'HIGH' | 'MEDIUM';
  description: string;
  action: string;
  triggerPrice: number;
  confirmationPrice?: number;
  stopLossPrice?: number;
}

export interface BollingerBands {
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
}

export interface MacdResult {
  macdLine: number;
  signalLine: number;
  histogram: number;
}

export interface TechnicalIndicators {
  sma20: number;
  sma50: number;
  sma200: number;
  ema9: number;
  ema21: number;
  rsi: number;
  macd: MacdResult;
  bollinger: BollingerBands;
  atr: number;
  vwap: number;
  support: number;
  resistance: number;
  volumeAvg20: number;
  volumeRatio: number;
  priceAboveSma50: boolean;
  priceAboveSma200: boolean;
  goldenCross: boolean; // SMA 50 > SMA 200
  deathCross: boolean;
  emaBullishCross: boolean; // EMA 9 > EMA 21
  volumeProfile?: VolumeProfileAnalysis;
}

export interface VolumeProfileBin {
  binIndex: number;
  priceLow: number;
  priceHigh: number;
  priceMid: number;
  buyVolume: number;
  sellVolume: number;
  totalVolume: number;
  percentOfMax: number;
  isPoc: boolean;
  isValueArea: boolean;
  isHvn: boolean; // High Volume Node (Peak Liquidity / Support-Resistance)
  isLvn: boolean; // Low Volume Node (Low Liquidity / Breakout Accelerator)
}

export interface VolumeProfileAnalysis {
  bins: VolumeProfileBin[];
  pocPrice: number;
  pocVolume: number;
  vah: number; // Value Area High (70% profile boundary)
  val: number; // Value Area Low (70% profile boundary)
  valueAreaVolumeRatio: number; // ~0.70
  totalVolume: number;
  totalBuyVolume: number;
  totalSellVolume: number;
  buyRatio: number;
  currentPriceStatus: 'ABOVE_VAH' | 'INSIDE_VA' | 'BELOW_VAL' | 'AT_POC';
  highVolumeNodes: number[]; // key institutional liquidity consolidation prices
  lowVolumeNodes: number[]; // liquidity voids / slippage zones
}

export interface FibonacciLevel {
  ratio: number; // 0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0
  label: string; // e.g., "0.0%", "23.6%", "38.2%", "50.0%", "61.8%", "78.6%", "100.0%"
  price: number;
  role: 'SUPPORT' | 'RESISTANCE' | 'TESTING' | 'ANCHOR';
  color: string;
  fillColor: string;
  isGoldenPocket: boolean;
  distancePct: number; // percentage from current price
}

export interface FibonacciExtensionLevel {
  ratio: number; // 1.272, 1.414, 1.618, 2.0, 2.618
  label: string; // "127.2%", "141.4%", "161.8%", "200.0%", "261.8%"
  price: number;
  color: string;
  role: 'EXTENSION_TARGET';
}

export interface FibonacciRetracement {
  highPrice: number;
  highIndex: number;
  highTime: string;
  lowPrice: number;
  lowIndex: number;
  lowTime: string;
  rangeSpan: number;
  direction: 'UPTREND' | 'DOWNTREND';
  levels: FibonacciLevel[];
  extensionLevels?: FibonacciExtensionLevel[];
  goldenPocket: {
    upperPrice: number;
    lowerPrice: number;
    isInside: boolean;
  };
  currentPrice: number;
  nearestSupport?: FibonacciLevel;
  nearestResistance?: FibonacciLevel;
}

// Support & Resistance Structure (Line vs Band) with Historical Touch/Bounce Counters & Rationale
export interface SupportResistanceLevel {
  id: string;
  price: number;
  bandLow: number;
  bandHigh: number;
  type: 'SUPPORT' | 'RESISTANCE';
  strength: number; // 1 - 5 stars
  testCount: number; // Total occasions this level served its purpose
  bounceCount: number; // Bounces off the level
  breakoutFlipCount: number; // Number of times it flipped role (S->R or R->S)
  rationale: string; // Algorithmic & structural reason
  institutionalMeaning: string;
  lastTestedTime?: string;
}

// Moving Average Slopes & Critical Crosses
export interface MovingAverageSlope {
  indicator: 'SMA 20' | 'SMA 50' | 'SMA 200' | 'EMA 9' | 'EMA 21';
  gradientDegrees: number; // estimated angle in degrees
  pctChangePerBar: number;
  status: 'STEEP_UP' | 'MILD_UP' | 'FLATTENING' | 'MILD_DOWN' | 'STEEP_DOWN';
  label: string;
  interpretation: string;
}

export interface MACrossEvent {
  index: number;
  time: string;
  price: number;
  type: 'GOLDEN_CROSS' | 'DEATH_CROSS' | 'EMA_BULL_CROSS' | 'EMA_BEAR_CROSS' | 'SMA20_50_BULL' | 'SMA20_50_BEAR';
  title: string;
  sentiment: 'BULLISH' | 'BEARISH';
  description: string;
}

export type MACriticalCross = MACrossEvent;

// Bollinger Band Volatility Envelope Interpretation
export interface BollingerInterpretation {
  status: 'SQUEEZE' | 'EXPANSION' | 'WALKING_UPPER' | 'WALKING_LOWER' | 'MEAN_REVERSION_UP' | 'MEAN_REVERSION_DOWN' | 'NORMAL';
  bandwidthPct: number;
  percentB: number;
  title: string;
  badgeColor: string;
  insight: string;
  actionGuide: string;
}

// Sub-panel Indicators (Max 3 Allowed)
export type SubPanelIndicatorType = 'VOLUME' | 'RSI' | 'MACD' | 'STOCHASTIC' | 'MFI';

// Market Microstructure: Quantity-Price Theory & Institutional Footprint Detection
export type QuantityPriceRelationType =
  | 'VOL_UP_PRICE_UP' // 1. Volume Increase + Price Increase
  | 'PRICE_HIGH_VOL_FAIL' // 2. Price Makes New High + Volume Fails
  | 'PRICE_REBOUND_WEAK_VOL' // 3. Price Rebounds on Diminishing Volume
  | 'PARABOLIC_BLOWOFF' // 4. Blowout Volume Spike After Steady Advance
  | 'HEAVY_VOL_STALL' // 5. Heavy Volume Stall at Highs/Lows
  | 'LOW_VOL_SECONDARY_TROUGH' // 6. Low-Volume Secondary Trough
  | 'PANIC_CAPITULATION' // 7. Panic Selling (Capitulation)
  | 'HIGH_VOL_BREAKDOWN'; // 8. High-Volume Breakdown Below Support

export interface QuantityPriceAnalysis {
  relation: QuantityPriceRelationType;
  title: string;
  relationNumber: number; // 1 - 8
  axiom: string;
  implication: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  barVolume: number;
  avgVolume20: number;
  volumeRatio: number;
}

export interface InstitutionalFootprintAnalysis {
  darkPoolRatio: number; // Estimated TRF / off-exchange volume ratio %
  darkPoolSentiment: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL';
  volOiAsymmetry: {
    ratio: number;
    isSignificant: boolean; // >= 1.5x
    signal: string;
  };
  gammaRegime: {
    type: 'POSITIVE' | 'NEGATIVE';
    gexPivotPrice: number;
    implication: string;
  };
  lateDayVolumeDynamics: {
    ma10Slope: 'RISING' | 'FLAT' | 'FALLING';
    observation: string;
    implication: string;
  };
  darkHorseEvaluation: {
    isTroughVolumeInversion: boolean;
    turnoverPct: number;
    glideUnderway: boolean;
    distributionAlert: boolean;
    status: string;
    details: string;
  };
}

// AI Options Strategy Recommendation
export interface AIOptionStrategy {
  id: string;
  name: string;
  category: 'Bullish Directional' | 'Bearish Directional' | 'Neutral Income' | 'Volatility Expansion';
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'HIGH_VOLATILITY';
  ivEnvironment: 'HIGH_IV' | 'LOW_IV' | 'NORMAL';
  bestTimeframe: 'Day Trade (0-7 DTE)' | 'Swing (14-45 DTE)' | 'Macro / Earnings';
  strikesDescription: string;
  recommendedExpiration: string;
  maxProfit: string;
  maxLoss: string;
  riskRewardRatio: string;
  breakeven: string;
  rationale: string;
  greeksContext: {
    delta: string;
    theta: string;
    vega: string;
  };
}

export type StrategySignalType = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

export interface StrategyFrameworkResult {
  id: string;
  name: string;
  category: 'Trend Following' | 'Mean Reversion' | 'Momentum Breakout' | 'Swing Setup' | 'Auction Market Theory';
  signal: StrategySignalType;
  confidence: number; // 0 - 100
  condition: string;
  details: string;
  triggerZone?: string;
}

export interface AIStrategicThesis {
  verdict: 'STRONG BUY' | 'BUY' | 'HOLD' | 'TRIM' | 'SELL';
  convictionScore: number;
  summary: string;
  setup: {
    entryZone: string;
    stopLoss: string;
    target1: string;
    target2: string;
    riskRewardRatio: string;
  };
  keyCatalysts: string[];
  risks: string[];
  modelUsed?: string;
}

export interface AICandlePrediction {
  symbol: string;
  timestamp: number;
  timeframe: string;
  predictedCandle: {
    open: number;
    high: number;
    low: number;
    close: number;
    direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    expectedChange: number;
    expectedChangePercent: number;
  };
  probabilityScore: number; // 0 - 100
  conviction: 'VERY HIGH' | 'HIGH' | 'MODERATE' | 'SPECULATIVE';
  thesisSummary: string;
  worksConditions: string[]; // Outline on what conditions this thesis works
  failsConditions: string[]; // Outline on what conditions this thesis fails / invalidation
  keyLevels: {
    triggerPrice: number;
    targetPrice: number;
    invalidationPrice: number;
    expectedVolatilityRange: number;
  };
  modelUsed?: string;
}

export type AlertConditionType =
  | 'PRICE_ABOVE'
  | 'PRICE_BELOW'
  | 'PCT_CHANGE_UP'
  | 'PCT_CHANGE_DOWN'
  | 'RSI_OVERSOLD'
  | 'RSI_OVERBOUGHT'
  | 'SMA50_CROSSOVER'
  | 'MACD_BULLISH_CROSS';

export interface StockAlert {
  id: string;
  symbol: string;
  conditionType: AlertConditionType;
  thresholdValue: number;
  createdAt: string;
  enabled: boolean;
  triggeredCount: number;
  lastTriggeredAt?: string;
  notes?: string;
}

export interface TriggeredAlertNotification {
  id: string;
  alertId: string;
  symbol: string;
  title: string;
  message: string;
  timestamp: string;
  priceAtTrigger: number;
  conditionType: AlertConditionType;
  read: boolean;
}

export interface DriveExportFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  createdTime: string;
  size?: string;
}

// Chart Pattern Auto-Identifier Types
export type ChartPatternType =
  | 'CUP_AND_HANDLE_VCP'
  | 'DOUBLE_BOTTOM'
  | 'DOUBLE_TOP'
  | 'HEAD_AND_SHOULDERS'
  | 'INVERSE_HEAD_AND_SHOULDERS'
  | 'ASCENDING_TRIANGLE'
  | 'DESCENDING_TRIANGLE'
  | 'SYMMETRICAL_TRIANGLE'
  | 'FALLING_WEDGE'
  | 'RISING_WEDGE'
  | 'BULL_FLAG'
  | 'BEAR_FLAG'
  | 'TRIPLE_BOTTOM'
  | 'TRIPLE_TOP';

export interface ChartPatternPoint {
  index: number;
  time: string;
  price: number;
  label?: string;
}

export interface ChartPatternBoundaryLine {
  startIndex: number;
  endIndex: number;
  startPrice: number;
  endPrice: number;
  type: 'resistance' | 'support' | 'neckline' | 'target' | 'stoploss';
  label?: string;
}

export interface ChartPattern {
  id: string;
  type: ChartPatternType;
  name: string;
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  startIndex: number;
  endIndex: number;
  startTime: string;
  endTime: string;
  keyPoints: ChartPatternPoint[];
  neckline?: {
    startIndex: number;
    endIndex: number;
    startPrice: number;
    endPrice: number;
    label?: string;
  };
  boundaryLines: ChartPatternBoundaryLine[];
  breakoutPrice?: number;
  targetPrice?: number;
  stopLossPrice?: number;
  height: number;
  confidence: number;
  status: 'FORMING' | 'CONFIRMED' | 'BROKEN';
  description: string;
  tacticalAction: string;
}
