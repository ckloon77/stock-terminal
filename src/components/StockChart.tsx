import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Candle,
  TechnicalIndicators,
  CandlestickSignal,
  TimeframeInterval,
  SwingCandleInterval,
  CandlestickSignalScope,
  FibonacciLevel,
  FibonacciRetracement,
  FibonacciExtensionLevel,
  ChartPattern,
  ChartPatternPoint,
  ChartPatternBoundaryLine,
  ChartPatternType,
  AICandlePrediction,
  StockQuote,
  SupportResistanceLevel,
  MovingAverageSlope,
  MACriticalCross,
  BollingerInterpretation,
  SubPanelIndicatorType
} from '../types';
import {
  calculateSMA,
  calculateEMA,
  calculateBollingerBands,
  calculateVWAP,
  calculateVolumeProfile,
  calculateFibonacciRetracement,
  findDetailedSupportResistanceLevels,
  calculateMASlopes,
  findCriticalMACrosses,
  interpretBollingerBands
} from '../services/indicators';
import {
  analyzeQuantityPriceRelation,
  analyzeInstitutionalFootprint,
  generateAIOptionsRecommendations
} from '../services/marketMicrostructure';
import { evaluateAllStrategyFrameworks } from '../services/strategyFrameworks';
import { SubPanelIndicators } from './SubPanelIndicators';
import { MarketMicrostructureModal } from './MarketMicrostructureModal';
import { StrategyMatrixModal } from './StrategyMatrixModal';
import { SrRationaleModal } from './SrRationaleModal';
import { detectCandlestickSignals } from '../services/candlestickPatterns';
import { detectChartPatterns } from '../services/chartPatterns';
import { fetchAICandlePrediction } from '../services/stockService';
import { AICandlePredictionCard } from './AICandlePredictionCard';
import { DAY_TRADE_INTERVALS, SWING_CANDLE_INTERVALS } from './StockHeader';
import {
  getAIIndicatorRecommendation,
  IndicatorPresetFlags,
  IndicatorRecommendation,
  INDICATOR_HIERARCHY_TIERS,
  IndicatorHierarchyTierId,
  getHierarchyTierFlags,
  HIERARCHY_PHILOSOPHY
} from '../services/aiIndicatorAdvisor';
import { AIIndicatorModal } from './AIIndicatorModal';
import {
  BarChart3,
  Layers,
  PenTool,
  Trash2,
  Undo2,
  X,
  Zap,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Target,
  ShieldAlert,
  Info,
  Calendar,
  Crosshair,
  Shapes,
  Eye,
  EyeOff,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  CheckCircle2,
  Check,
  HelpCircle,
  Scale,
  Activity,
  Sliders,
  TrendingUp,
  BarChart2
} from 'lucide-react';

export interface CustomTrendline {
  id: string;
  startIndex: number;
  startPrice: number;
  startTime?: string;
  endIndex: number;
  endPrice: number;
  endTime?: string;
  color: string;
  type: 'support' | 'resistance' | 'neutral';
  label?: string;
}

interface DrawingState {
  startIndex: number;
  startPrice: number;
  startTime?: string;
  startX: number;
  startY: number;
  currentIndex: number;
  currentPrice: number;
  currentX: number;
  currentY: number;
  isMouseDown: boolean;
}

interface StockChartProps {
  candles: Candle[];
  symbol: string;
  chartType: 'candle' | 'area';
  indicators: TechnicalIndicators | null;
  quote?: StockQuote | null;
  isDayTradeView?: boolean;
  selectedInterval?: TimeframeInterval;
  onSelectInterval?: (interval: TimeframeInterval) => void;
  selectedSwingInterval?: SwingCandleInterval;
  onSelectSwingInterval?: (interval: SwingCandleInterval) => void;
  onToggleDayTradeView?: (active: boolean) => void;
  showCandleSignals?: boolean;
  onToggleCandleSignals?: () => void;
  signalScope?: CandlestickSignalScope;
  onSelectSignalScope?: (scope: CandlestickSignalScope) => void;
}

export const StockChart: React.FC<StockChartProps> = ({
  candles,
  symbol,
  chartType,
  indicators,
  quote,
  isDayTradeView = false,
  selectedInterval = '5m',
  onSelectInterval,
  selectedSwingInterval = '1d',
  onSelectSwingInterval,
  onToggleDayTradeView,
  showCandleSignals: propShowCandleSignals,
  onToggleCandleSignals: propOnToggleCandleSignals,
  signalScope: propSignalScope,
  onSelectSignalScope: propOnSelectSignalScope
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);
  const [showCrosshair, setShowCrosshair] = useState<boolean>(false);

  // Candlestick Signal Recognition State (default off)
  const [internalShowCandleSignals, setInternalShowCandleSignals] = useState(false);
  const showCandleSignals = propShowCandleSignals !== undefined ? propShowCandleSignals : internalShowCandleSignals;
  const toggleCandleSignals = useCallback(() => {
    if (propOnToggleCandleSignals) {
      propOnToggleCandleSignals();
    } else {
      setInternalShowCandleSignals((prev) => !prev);
    }
  }, [propOnToggleCandleSignals]);

  // Unified Pattern Confluence Set: Grouping Candlestick Patterns & Chart Patterns
  // Default: only show the last pattern available, with user toggle to show all
  const [showChartPatterns, setShowChartPatterns] = useState<boolean>(false);
  const [patternDisplayMode, setPatternDisplayMode] = useState<'last' | 'all'>('last');
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);
  const [patternFilter, setPatternFilter] = useState<'ALL' | 'BULLISH' | 'BEARISH'>('ALL');
  const [hoveredPatternId, setHoveredPatternId] = useState<string | null>(null);

  // Candlestick Signal Scope: defaults to 'last' (only show last pattern available by default)
  const [internalSignalScope, setInternalSignalScope] = useState<CandlestickSignalScope>('last');
  const signalScope = propSignalScope !== undefined ? propSignalScope : internalSignalScope;
  const setSignalScope = useCallback(
    (scope: CandlestickSignalScope) => {
      setInternalSignalScope(scope);
      propOnSelectSignalScope?.(scope);
    },
    [propOnSelectSignalScope]
  );

  const [selectedSignalIndex, setSelectedSignalIndex] = useState<number | null>(null);
  const [hoveredSignal, setHoveredSignal] = useState<CandlestickSignal | null>(null);
  const [signalFilter, setSignalFilter] = useState<'ALL' | 'BULLISH' | 'BEARISH'>('ALL');

  const lastCandleIndex = candles.length > 0 ? candles.length - 1 : -1;
  const lastCandle = lastCandleIndex >= 0 ? candles[lastCandleIndex] : null;

  // Compute Candlestick Signals across current candle series
  const detectedSignals = useMemo(() => {
    return detectCandlestickSignals(candles);
  }, [candles]);

  // Compute Classical Chart Patterns across current candle series (Double Bottom/Top, H&S, Triangles, Wedges, Flags, Cup & Handle VCP)
  const detectedChartPatterns = useMemo(() => {
    return detectChartPatterns(candles);
  }, [candles]);

  const filteredChartPatterns = useMemo(() => {
    if (patternFilter === 'ALL') return detectedChartPatterns;
    return detectedChartPatterns.filter((p) => p.sentiment === patternFilter);
  }, [detectedChartPatterns, patternFilter]);

  // If in 'last' pattern display mode, only show the last pattern available; otherwise show all
  const visibleChartPatterns = useMemo(() => {
    if (patternDisplayMode === 'last') {
      return filteredChartPatterns.slice(0, 1);
    }
    return filteredChartPatterns;
  }, [filteredChartPatterns, patternDisplayMode]);

  const activePattern = useMemo(() => {
    if (hoveredPatternId) {
      const p = detectedChartPatterns.find((item) => item.id === hoveredPatternId);
      if (p) return p;
    }
    if (selectedPatternId) {
      const p = detectedChartPatterns.find((item) => item.id === selectedPatternId);
      if (p) return p;
    }
    return visibleChartPatterns[0] || null;
  }, [hoveredPatternId, selectedPatternId, detectedChartPatterns, visibleChartPatterns]);

  const lastCandleSignal = useMemo(() => {
    if (lastCandleIndex < 0) return null;
    return detectedSignals.find((s) => s.index === lastCandleIndex) || null;
  }, [detectedSignals, lastCandleIndex]);

  const latestDetectedSignal = useMemo(() => {
    if (detectedSignals.length === 0) return null;
    return detectedSignals[detectedSignals.length - 1];
  }, [detectedSignals]);

  // Scope Filtering: 'all' (all candles) vs 'last' (just last pattern available by default)
  const scopeSignals = useMemo(() => {
    if (patternDisplayMode === 'last' || signalScope === 'last') {
      if (lastCandleSignal) return [lastCandleSignal];
      if (latestDetectedSignal) return [latestDetectedSignal];
      return [];
    }
    return detectedSignals;
  }, [detectedSignals, patternDisplayMode, signalScope, lastCandleSignal, latestDetectedSignal]);

  // Sentiment Filtering: 'ALL' | 'BULLISH' | 'BEARISH'
  const filteredSignals = useMemo(() => {
    if (signalFilter === 'ALL') return scopeSignals;
    return scopeSignals.filter((s) => s.sentiment === signalFilter);
  }, [scopeSignals, signalFilter]);

  const activeSignal = useMemo(() => {
    if (hoveredSignal) return hoveredSignal;
    if (selectedSignalIndex !== null) {
      const found = detectedSignals.find((s) => s.index === selectedSignalIndex);
      if (found) return found;
    }
    if (signalScope === 'last' && lastCandleSignal) {
      return lastCandleSignal;
    }
    return null;
  }, [hoveredSignal, selectedSignalIndex, detectedSignals, signalScope, lastCandleSignal]);

  // Indicator Overlay Toggles (Default: Only S/R on, all other indicators turned off by default)
  const [showSMA20, setShowSMA20] = useState(false);
  const [showSMA50, setShowSMA50] = useState(false);
  const [showSMA200, setShowSMA200] = useState(false);
  const [showEMA9, setShowEMA9] = useState(false);
  const [showEMA21, setShowEMA21] = useState(false);
  const [showBollinger, setShowBollinger] = useState(false);
  const [showVWAP, setShowVWAP] = useState(false);
  const [showSR, setShowSR] = useState(true);

  // Support & Resistance 2 Versions: 'line' | 'band' | 'both' (user requirement)
  const [srDisplayMode, setSrDisplayMode] = useState<'line' | 'band' | 'both'>('band');
  const [activeSrRationaleLevel, setActiveSrRationaleLevel] = useState<SupportResistanceLevel | null>(null);

  // Fibonacci Retracement & Extension State (default off)
  const [showFibonacci, setShowFibonacci] = useState(false);
  const [fibDirection, setFibDirection] = useState<'auto' | 'uptrend' | 'downtrend'>('auto');
  const [showFibZones, setShowFibZones] = useState(true);
  const [showFibAnchors, setShowFibAnchors] = useState(true);
  const [showFibExtensions, setShowFibExtensions] = useState(true);
  const [hoveredFibRatio, setHoveredFibRatio] = useState<number | null>(null);

  // Volume indicator controls (Default: off)
  const [showVolume, setShowVolume] = useState(false);
  const [volumeMode, setVolumeMode] = useState<'separate' | 'overlay'>('separate');
  const [showVolMA, setShowVolMA] = useState(false);

  // Volume Profile (Market Profile) controls (default off)
  const [showVolumeProfile, setShowVolumeProfile] = useState(false);
  const [volumeProfileSide, setVolumeProfileSide] = useState<'right' | 'left'>('right');
  const [showPocLine, setShowPocLine] = useState(true);
  const [showVaBounds, setShowVaBounds] = useState(true);
  const [showHvnLvn, setShowHvnLvn] = useState(true); // Toggle key liquidity nodes HVN and LVN
  const [hoveredVpBin, setHoveredVpBin] = useState<number | null>(null);

  // Sub-Panel Indicators Grouping (Volume, RSI, MACD, Stochastic, MFI) - Max 3 panels
  const [activeSubPanels, setActiveSubPanels] = useState<SubPanelIndicatorType[]>([]);
  const [volumeMaPeriod, setVolumeMaPeriod] = useState<number>(20);

  const handleToggleSubPanel = useCallback((panel: SubPanelIndicatorType) => {
    setActiveSubPanels((prev) => {
      if (prev.includes(panel)) {
        return prev.filter((p) => p !== panel);
      }
      if (prev.length >= 3) {
        // Max 3 allowed: replace first one or don't add
        return [...prev.slice(1), panel];
      }
      return [...prev, panel];
    });
  }, []);

  // Market Microstructure & Strategy Framework Modals
  const [isMicrostructureModalOpen, setIsMicrostructureModalOpen] = useState(false);
  const [isStrategyMatrixModalOpen, setIsStrategyMatrixModalOpen] = useState(false);

  // Moving Average Slopes & Crosses Info Modals
  const [selectedSlopeInfo, setSelectedSlopeInfo] = useState<MovingAverageSlope | null>(null);
  const [selectedCrossEvent, setSelectedCrossEvent] = useState<MACriticalCross | null>(null);

  // AI Indicator Advisor state & notification toast
  const [isAIAdvisorModalOpen, setIsAIAdvisorModalOpen] = useState(false);
  const [aiAdvisorToast, setAiAdvisorToast] = useState<string | null>(null);

  // Indicator Hierarchy Tier State (Tier 1 is highest hierarchy and default)
  const [activeHierarchyTier, setActiveHierarchyTier] = useState<IndicatorHierarchyTierId | 'confluence_all'>('tier1');

  // Compute live AI Indicator recommendation based on active timeframe & candle dynamics
  const activeAIRecommendation: IndicatorRecommendation = useMemo(() => {
    return getAIIndicatorRecommendation(
      isDayTradeView,
      isDayTradeView ? selectedInterval : selectedSwingInterval,
      candles,
      quote
    );
  }, [isDayTradeView, selectedInterval, selectedSwingInterval, candles, quote]);

  // Handler to apply an AI indicator preset configuration
  const handleApplyAIPreset = useCallback(
    (flags: IndicatorPresetFlags, presetTitle: string) => {
      setShowSMA20(!!flags.showSMA20);
      setShowSMA50(!!flags.showSMA50);
      setShowSMA200(!!flags.showSMA200);
      setShowEMA9(!!flags.showEMA9);
      setShowEMA21(!!flags.showEMA21);
      setShowBollinger(!!flags.showBollinger);
      setShowVWAP(!!flags.showVWAP);
      setShowSR(flags.showSR !== undefined ? flags.showSR : true);
      setShowFibonacci(!!flags.showFibonacci);
      setShowVolume(!!flags.showVolume);
      setShowVolMA(!!flags.showVolMA);
      setShowVolumeProfile(!!flags.showVolumeProfile);
      if (flags.showCandleSignals !== undefined && flags.showCandleSignals !== showCandleSignals) {
        toggleCandleSignals();
      }
      if (flags.showChartPatterns !== undefined) {
        setShowChartPatterns(flags.showChartPatterns);
      }
      setAiAdvisorToast(`Applied AI Indicator Setup: ${presetTitle}`);
      setTimeout(() => {
        setAiAdvisorToast(null);
      }, 4500);
    },
    [showCandleSignals, toggleCandleSignals]
  );

  // Apply a specific hierarchy tier or multi-tier confluence
  const handleApplyHierarchyTier = useCallback(
    (tierId: IndicatorHierarchyTierId | 'confluence_all') => {
      setActiveHierarchyTier(tierId);
      const tierIds: IndicatorHierarchyTierId[] =
        tierId === 'confluence_all'
          ? ['tier1', 'tier2', 'tier3', 'tier4']
          : [tierId];
      const flags = getHierarchyTierFlags(tierIds);
      const tierObj = tierId === 'confluence_all' ? null : INDICATOR_HIERARCHY_TIERS.find((t) => t.id === tierId);
      const title =
        tierId === 'confluence_all'
          ? 'All 4 Tiers Multi-Confluence'
          : `${tierObj?.title} (${tierObj?.tierNumber === 1 ? 'Highest Hierarchy - Default' : `Tier ${tierObj?.tierNumber}`})`;
      handleApplyAIPreset(flags, title);
    },
    [handleApplyAIPreset]
  );

  // Indicators Snapshot & Master Toggle (Turn Off All Indicators / Restore)
  const savedIndicatorsRef = useRef<{
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
    showCandleSignals: boolean;
    showChartPatterns: boolean;
  } | null>(null);

  const activeIndicatorsCount = useMemo(() => {
    return [
      showSMA20,
      showSMA50,
      showSMA200,
      showEMA9,
      showEMA21,
      showBollinger,
      showVWAP,
      showSR,
      showFibonacci,
      showVolume,
      showVolMA,
      showVolumeProfile,
      showCandleSignals,
      showChartPatterns
    ].filter(Boolean).length;
  }, [
    showSMA20,
    showSMA50,
    showSMA200,
    showEMA9,
    showEMA21,
    showBollinger,
    showVWAP,
    showSR,
    showFibonacci,
    showVolume,
    showVolMA,
    showVolumeProfile,
    showCandleSignals,
    showChartPatterns
  ]);

  const handleTurnOffAllIndicators = useCallback(() => {
    // Save current active state before clearing
    savedIndicatorsRef.current = {
      showSMA20,
      showSMA50,
      showSMA200,
      showEMA9,
      showEMA21,
      showBollinger,
      showVWAP,
      showSR,
      showFibonacci,
      showVolume,
      showVolMA,
      showVolumeProfile,
      showCandleSignals,
      showChartPatterns
    };

    setShowSMA20(false);
    setShowSMA50(false);
    setShowSMA200(false);
    setShowEMA9(false);
    setShowEMA21(false);
    setShowBollinger(false);
    setShowVWAP(false);
    setShowSR(false);
    setShowFibonacci(false);
    setShowVolume(false);
    setShowVolMA(false);
    setShowVolumeProfile(false);
    if (showCandleSignals) {
      toggleCandleSignals();
    }
    setShowChartPatterns(false);
  }, [
    showSMA20,
    showSMA50,
    showSMA200,
    showEMA9,
    showEMA21,
    showBollinger,
    showVWAP,
    showSR,
    showFibonacci,
    showVolume,
    showVolMA,
    showVolumeProfile,
    showCandleSignals,
    showChartPatterns,
    toggleCandleSignals
  ]);

  const handleRestoreIndicators = useCallback(() => {
    const s = savedIndicatorsRef.current;
    if (s) {
      setShowSMA20(s.showSMA20);
      setShowSMA50(s.showSMA50);
      setShowSMA200(s.showSMA200);
      setShowEMA9(s.showEMA9);
      setShowEMA21(s.showEMA21);
      setShowBollinger(s.showBollinger);
      setShowVWAP(s.showVWAP);
      setShowSR(s.showSR);
      setShowFibonacci(s.showFibonacci);
      setShowVolume(s.showVolume);
      setShowVolMA(s.showVolMA);
      setShowVolumeProfile(s.showVolumeProfile);
      if (s.showCandleSignals !== showCandleSignals) {
        toggleCandleSignals();
      }
      setShowChartPatterns(s.showChartPatterns);
    } else {
      // Default technical indicators setup (Only S/R lines on, rest off)
      setShowSMA20(false);
      setShowSMA50(false);
      setShowSMA200(false);
      setShowEMA9(false);
      setShowEMA21(false);
      setShowBollinger(false);
      setShowVWAP(false);
      setShowSR(true);
      setShowFibonacci(false);
      setShowVolume(false);
      setShowVolMA(false);
      setShowVolumeProfile(false);
      setShowChartPatterns(false);
    }
  }, [showCandleSignals, toggleCandleSignals]);

  // Custom Trendlines State
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [trendlineType, setTrendlineType] = useState<'support' | 'resistance' | 'neutral'>('support');
  const [drawingState, setDrawingState] = useState<DrawingState | null>(null);
  const [hoveredTrendlineId, setHoveredTrendlineId] = useState<string | null>(null);
  const [selectedTrendlineId, setSelectedTrendlineId] = useState<string | null>(null);

  // Load / persist custom trendlines per symbol
  const [trendlines, setTrendlines] = useState<CustomTrendline[]>(() => {
    try {
      const saved = localStorage.getItem(`stock_trendlines_${symbol}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`stock_trendlines_${symbol}`);
      setTrendlines(saved ? JSON.parse(saved) : []);
    } catch {
      setTrendlines([]);
    }
    setDrawingState(null);
    setSelectedTrendlineId(null);
  }, [symbol]);

  useEffect(() => {
    try {
      localStorage.setItem(`stock_trendlines_${symbol}`, JSON.stringify(trendlines));
    } catch {
      // ignore
    }
  }, [trendlines, symbol]);

  // AI Next Candle Prediction State (Turned OFF by default as requested)
  const [aiPrediction, setAiPrediction] = useState<AICandlePrediction | null>(null);
  const [isLoadingAiPrediction, setIsLoadingAiPrediction] = useState<boolean>(false);
  const [showAiGhostCandle, setShowAiGhostCandle] = useState<boolean>(false);
  const [showAiPredictionCard, setShowAiPredictionCard] = useState<boolean>(false);
  const [isAiCandleHovered, setIsAiCandleHovered] = useState<boolean>(false);

  const handleFetchAICandlePrediction = useCallback(async () => {
    if (!candles || candles.length === 0) return;
    setIsLoadingAiPrediction(true);
    try {
      const pred = await fetchAICandlePrediction(
        symbol,
        candles,
        isDayTradeView ? selectedInterval : selectedSwingInterval,
        indicators,
        quote
      );
      setAiPrediction(pred);
    } catch {
      // Gracefully silent; quantitative defaults remain active
    } finally {
      setIsLoadingAiPrediction(false);
    }
  }, [symbol, candles, isDayTradeView, selectedInterval, selectedSwingInterval, indicators, quote]);

  // Only auto-fetch when user has enabled the AI forecast feature
  useEffect(() => {
    if (showAiGhostCandle || showAiPredictionCard) {
      handleFetchAICandlePrediction();
    }
  }, [symbol, isDayTradeView ? selectedInterval : selectedSwingInterval, showAiGhostCandle, showAiPredictionCard, handleFetchAICandlePrediction]);

  // Saved state of indicators before AI Forecast was enabled (to restore when turned off)
  const savedBeforeAiForecastRef = useRef<{
    showSMA20: boolean;
    showSMA50: boolean;
    showSMA200: boolean;
    showEMA9: boolean;
    showEMA21: boolean;
    showBollinger: boolean;
    showVWAP: boolean;
    showSR: boolean;
    showFibonacci: boolean;
    showVolumeProfile: boolean;
    showChartPatterns: boolean;
    showCandleSignals: boolean;
  } | null>(null);

  // Requirement (9): when AI forecast is turned on, show clean chart (where volume bars can be shown) and all other indicators turned off
  const handleToggleAiForecast = useCallback(() => {
    const nextVal = !showAiGhostCandle;
    if (nextVal) {
      // Save current indicators
      savedBeforeAiForecastRef.current = {
        showSMA20,
        showSMA50,
        showSMA200,
        showEMA9,
        showEMA21,
        showBollinger,
        showVWAP,
        showSR,
        showFibonacci,
        showVolumeProfile,
        showChartPatterns,
        showCandleSignals
      };
      // Turn off all other indicators for clean chart
      setShowSMA20(false);
      setShowSMA50(false);
      setShowSMA200(false);
      setShowEMA9(false);
      setShowEMA21(false);
      setShowBollinger(false);
      setShowVWAP(false);
      setShowSR(false);
      setShowFibonacci(false);
      setShowVolumeProfile(false);
      setShowChartPatterns(false);
      if (showCandleSignals) {
        toggleCandleSignals();
      }
      // Ensure volume bars remain shown as requested
      setShowVolume(true);
      setShowAiGhostCandle(true);
      if (!aiPrediction) {
        handleFetchAICandlePrediction();
      }
    } else {
      setShowAiGhostCandle(false);
      // Restore previous indicators
      if (savedBeforeAiForecastRef.current) {
        const s = savedBeforeAiForecastRef.current;
        setShowSMA20(s.showSMA20);
        setShowSMA50(s.showSMA50);
        setShowSMA200(s.showSMA200);
        setShowEMA9(s.showEMA9);
        setShowEMA21(s.showEMA21);
        setShowBollinger(s.showBollinger);
        setShowVWAP(s.showVWAP);
        setShowSR(s.showSR);
        setShowFibonacci(s.showFibonacci);
        setShowVolumeProfile(s.showVolumeProfile);
        setShowChartPatterns(s.showChartPatterns);
        if (s.showCandleSignals !== showCandleSignals) {
          toggleCandleSignals();
        }
        savedBeforeAiForecastRef.current = null;
      }
    }
  }, [
    showAiGhostCandle,
    showSMA20,
    showSMA50,
    showSMA200,
    showEMA9,
    showEMA21,
    showBollinger,
    showVWAP,
    showSR,
    showFibonacci,
    showVolumeProfile,
    showChartPatterns,
    showCandleSignals,
    toggleCandleSignals,
    aiPrediction,
    handleFetchAICandlePrediction
  ]);

  // Cancel active drawing or exit drawing mode on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (drawingState) {
          setDrawingState(null);
        } else if (isDrawingMode) {
          setIsDrawingMode(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawingState, isDrawingMode]);

  const trendlineColor = useMemo(() => {
    if (trendlineType === 'support') return '#10b981'; // emerald
    if (trendlineType === 'resistance') return '#f43f5e'; // rose
    return '#38bdf8'; // sky blue
  }, [trendlineType]);

  // Resize observer to ensure responsive chart width
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const closes = useMemo(() => candles.map((c) => c.close), [candles]);
  const volumes = useMemo(() => candles.map((c) => c.volume), [candles]);

  // Compute series for overlays
  const sma20Series = useMemo(() => calculateSMA(closes, 20), [closes]);
  const sma50Series = useMemo(() => calculateSMA(closes, 50), [closes]);
  const sma200Series = useMemo(() => calculateSMA(closes, Math.min(200, closes.length)), [closes]);
  const ema9Series = useMemo(() => calculateEMA(closes, 9), [closes]);
  const ema21Series = useMemo(() => calculateEMA(closes, 21), [closes]);
  const bbSeries = useMemo(() => calculateBollingerBands(closes, 20), [closes]);
  const vwapSeries = useMemo(() => calculateVWAP(candles), [candles]);

  // Detailed Support & Resistance Levels (Lines & Range Bands with Historical Touch/Bounce Rationale)
  const detailedSrLevels: SupportResistanceLevel[] = useMemo(() => {
    return findDetailedSupportResistanceLevels(candles);
  }, [candles]);

  // Moving Average Slopes (Gradient interpretation: steeper vs flattening) & Critical Crosses
  const maSlopes = useMemo(() => calculateMASlopes(candles), [candles]);
  const maCrosses = useMemo(() => findCriticalMACrosses(candles), [candles]);

  // Bollinger Bands Volatility Envelope Interpretation
  const bbInterpretation = useMemo(() => {
    const lastClose = candles[candles.length - 1]?.close;
    return interpretBollingerBands(closes, lastClose);
  }, [closes, candles]);

  // Volume 20-period Moving Average
  const volumeMA20Series = useMemo(() => calculateSMA(volumes, 20), [volumes]);

  // Volume Profile Analysis (Market Profile with POC, Value Area, and HVN/LVN liquidity nodes)
  const volumeProfile = useMemo(() => {
    if (indicators?.volumeProfile) return indicators.volumeProfile;
    return calculateVolumeProfile(candles);
  }, [indicators?.volumeProfile, candles]);

  // Fibonacci Retracement & Extension Calculation
  const fibRetracement = useMemo(() => {
    if (!candles || candles.length < 2) return null;
    const currentClose = candles[candles.length - 1]?.close;
    return calculateFibonacciRetracement(candles, currentClose, fibDirection);
  }, [candles, fibDirection]);

  // Market Microstructure Analytics (Granville Quantity-Price, Institutional Footprints, Options)
  const microstructureAnalysis = useMemo(() => {
    return analyzeQuantityPriceRelation(candles);
  }, [candles]);

  const institutionalFootprint = useMemo(() => {
    return analyzeInstitutionalFootprint(candles);
  }, [candles]);

  const currentPrice = useMemo(() => {
    return quote?.price ?? (candles.length > 0 ? candles[candles.length - 1].close : 0);
  }, [quote?.price, candles]);

  const effectiveQuote: StockQuote = useMemo(() => {
    return quote || {
      symbol,
      name: symbol,
      price: currentPrice,
      change: 0,
      changePercent: 0,
      volume: candles[candles.length - 1]?.volume || 0,
      high: candles[candles.length - 1]?.high || currentPrice,
      low: candles[candles.length - 1]?.low || currentPrice,
      open: candles[candles.length - 1]?.open || currentPrice,
      previousClose: currentPrice
    };
  }, [quote, symbol, currentPrice, candles]);

  const aiOptionStrategies = useMemo(() => {
    return generateAIOptionsRecommendations(
      effectiveQuote,
      detailedSrLevels,
      microstructureAnalysis,
      institutionalFootprint
    );
  }, [effectiveQuote, detailedSrLevels, microstructureAnalysis, institutionalFootprint]);

  // Strategy Framework & Confluence Matrix
  const strategyFrameworkResults = useMemo(() => {
    return evaluateAllStrategyFrameworks(candles, indicators);
  }, [candles, indicators]);

  const effectiveIndicators: TechnicalIndicators = useMemo(() => {
    return indicators || {
      sma20: closes.slice(-20).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(20, closes.length)),
      sma50: closes.slice(-50).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(50, closes.length)),
      sma200: closes.slice(-200).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(200, closes.length)),
      ema9: currentPrice,
      ema21: currentPrice,
      rsi: 50,
      macd: { macdLine: 0, signalLine: 0, histogram: 0 },
      bollinger: { upper: currentPrice * 1.02, middle: currentPrice, lower: currentPrice * 0.98, bandwidth: 4 },
      atr: currentPrice * 0.015,
      vwap: currentPrice,
      support: currentPrice * 0.98,
      resistance: currentPrice * 1.02,
      volumeAvg20: volumes.slice(-20).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(20, volumes.length)),
      volumeRatio: 1.0,
      priceAboveSma50: true,
      priceAboveSma200: true,
      goldenCross: false,
      deathCross: false,
      emaBullishCross: false,
      volumeProfile: volumeProfile || undefined
    };
  }, [indicators, closes, currentPrice, volumes, volumeProfile]);

  // -------------------------------------------------------------
  // RESPONSIVE CANDLESTICK VIEWPORT & ZOOM / PAN ENGINE
  // Guarantees each candlestick's OHLC is clearly visible on mobile
  // (portrait/landscape), tablet (portrait/landscape), and desktop.
  // -------------------------------------------------------------
  const [zoomLevel, setZoomLevel] = useState<number>(1.0); // 0.6x to 2.5x zoom
  const [panOffset, setPanOffset] = useState<number>(0); // 0 = live edge (most recent), > 0 = earlier history
  const [showAllCandlesMode, setShowAllCandlesMode] = useState<boolean>(false);

  // Reset pan offset to live edge whenever symbol or interval changes
  useEffect(() => {
    setPanOffset(0);
  }, [symbol, selectedInterval, selectedSwingInterval, isDayTradeView]);

  // Viewport device detection based on container width
  const isMobilePortrait = containerWidth < 500;
  const isMobileLandscapeOrTablet = containerWidth >= 500 && containerWidth < 850;
  const isDesktop = containerWidth >= 850;

  // Dynamic candle count tailored to viewport width so each candle has generous breathing room
  const defaultTargetCandles = useMemo(() => {
    if (isMobilePortrait) return 28; // Mobile portrait: ~28 candles gives thick 7-9px bodies with clear gaps
    if (isMobileLandscapeOrTablet) return 46; // Tablet / Mobile landscape: ~46 candles gives ~8-10px bodies
    if (containerWidth < 1200) return 70; // Laptop / tablet landscape
    return 88; // Large desktop screen
  }, [isMobilePortrait, isMobileLandscapeOrTablet, containerWidth]);

  const effectiveCandleCount = useMemo(() => {
    if (showAllCandlesMode || candles.length <= 14) return Math.max(1, candles.length);
    const target = Math.round(defaultTargetCandles / zoomLevel);
    return Math.max(12, Math.min(candles.length, target));
  }, [showAllCandlesMode, candles.length, defaultTargetCandles, zoomLevel]);

  const maxPanOffset = useMemo(() => {
    return Math.max(0, candles.length - effectiveCandleCount);
  }, [candles.length, effectiveCandleCount]);

  const clampedPanOffset = Math.max(0, Math.min(maxPanOffset, panOffset));

  const visibleStartIndex = useMemo(() => {
    if (showAllCandlesMode) return 0;
    return Math.max(0, candles.length - effectiveCandleCount - clampedPanOffset);
  }, [showAllCandlesMode, candles.length, effectiveCandleCount, clampedPanOffset]);

  const visibleEndIndex = useMemo(() => {
    if (showAllCandlesMode) return candles.length;
    return Math.min(candles.length, visibleStartIndex + effectiveCandleCount);
  }, [showAllCandlesMode, candles.length, visibleStartIndex, effectiveCandleCount]);

  const visibleCandles = useMemo(() => {
    if (candles.length === 0) return [];
    return candles.slice(visibleStartIndex, visibleEndIndex);
  }, [candles, visibleStartIndex, visibleEndIndex]);

  // Forward runway slots (only at live right edge to leave runway for AI forecasts)
  const rightBufferCandles = useMemo(() => {
    if (clampedPanOffset > 0 || showAllCandlesMode || candles.length === 0) return 2;
    if (isMobilePortrait) return Math.max(4, Math.min(8, Math.ceil(effectiveCandleCount * 0.12)));
    return Math.max(6, Math.min(18, Math.ceil(effectiveCandleCount * 0.16)));
  }, [clampedPanOffset, showAllCandlesMode, candles.length, isMobilePortrait, effectiveCandleCount]);

  const totalSlots = Math.max(1, effectiveCandleCount + rightBufferCandles);

  // Chart layout dimensions
  const isSeparateVolume = showVolume && volumeMode === 'separate';
  const isOverlayVolume = showVolume && volumeMode === 'overlay';

  const height = isSeparateVolume ? 570 : isOverlayVolume ? 490 : 460;
  const paddingLeft = 10;
  const paddingRight = isMobilePortrait ? 60 : 72; // room for price and volume axes
  const paddingTop = 22;

  const chartAreaWidth = Math.max(100, containerWidth - paddingLeft - paddingRight);
  const priceChartHeight = isSeparateVolume ? 360 : isOverlayVolume ? 400 : 390;
  const priceChartBottom = paddingTop + priceChartHeight;

  // Volume chart pane geometry
  const volumeChartHeight = isSeparateVolume ? 100 : 75;
  const volumeTop = isSeparateVolume ? priceChartBottom + 28 : priceChartBottom - volumeChartHeight;
  const volumeBottom = volumeTop + volumeChartHeight;

  // Guaranteed candle width: minimum 5.5px up to 22px so Open, High, Low, Close are crystal clear
  const candleWidth = useMemo(() => {
    if (candles.length === 0) return 6;
    const calculated = (chartAreaWidth / totalSlots) * 0.72;
    return Math.max(5.5, Math.min(22, calculated));
  }, [candles.length, chartAreaWidth, totalSlots]);

  // Compute price bounds based on visible window for maximum vertical dynamic range
  const { minPrice, maxPrice } = useMemo(() => {
    const dataset = visibleCandles.length > 0 ? visibleCandles : candles;
    if (dataset.length === 0) return { minPrice: 0, maxPrice: 100 };
    let min = Infinity;
    let max = -Infinity;

    dataset.forEach((c) => {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
    });

    if (showBollinger && bbSeries.upper.length > 0) {
      for (let i = visibleStartIndex; i < visibleEndIndex; i++) {
        const u = bbSeries.upper[i];
        const l = bbSeries.lower[i];
        if (u && !isNaN(u) && u > max) max = u;
        if (l && !isNaN(l) && l < min) min = l;
      }
    }

    if (showSR && indicators) {
      if (indicators.resistance > max && indicators.resistance < max * 1.25) max = indicators.resistance * 1.01;
      if (indicators.support < min && indicators.support > min * 0.75) min = indicators.support * 0.99;
    }

    if (showAiGhostCandle && aiPrediction?.predictedCandle && clampedPanOffset === 0) {
      const pred = aiPrediction.predictedCandle;
      if (pred.low < min) min = pred.low;
      if (pred.high > max) max = pred.high;
      if (aiPrediction.keyLevels?.targetPrice && aiPrediction.keyLevels.targetPrice > max) {
        max = aiPrediction.keyLevels.targetPrice;
      }
      if (aiPrediction.keyLevels?.invalidationPrice && aiPrediction.keyLevels.invalidationPrice < min) {
        min = aiPrediction.keyLevels.invalidationPrice;
      }
    }

    const margin = (max - min) * 0.05 || 1;
    return {
      minPrice: min - margin,
      maxPrice: max + margin
    };
  }, [
    visibleCandles,
    candles,
    showBollinger,
    bbSeries,
    visibleStartIndex,
    visibleEndIndex,
    showSR,
    indicators,
    showAiGhostCandle,
    aiPrediction,
    clampedPanOffset
  ]);

  // Compute volume bounds based on visible window
  const { maxVolume, volumeCeiling } = useMemo(() => {
    const dataset = visibleCandles.length > 0 ? visibleCandles : candles;
    if (dataset.length === 0) return { maxVolume: 1000000, volumeCeiling: 1200000 };
    let maxV = 0;
    dataset.forEach((c) => {
      if (c.volume > maxV) maxV = c.volume;
    });
    const max = Math.max(maxV, 1000);
    return {
      maxVolume: max,
      volumeCeiling: max * 1.15
    };
  }, [visibleCandles, candles]);

  const priceSpan = maxPrice - minPrice || 1;

  // Format volume numbers (K, M, B)
  const formatVolume = (val: number): string => {
    if (isNaN(val) || val === 0) return '0';
    if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(2)}B`;
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
    return val.toFixed(0);
  };

  // Coordinate conversion helpers (global index mapped relative to visible start index)
  const getX = useCallback(
    (index: number) => {
      if (candles.length <= 1) return paddingLeft + chartAreaWidth / 2;
      const localIndex = index - visibleStartIndex;
      return paddingLeft + (localIndex / totalSlots) * chartAreaWidth;
    },
    [candles.length, chartAreaWidth, paddingLeft, visibleStartIndex, totalSlots]
  );

  const getY = (price: number) => {
    return paddingTop + priceChartHeight - ((price - minPrice) / priceSpan) * priceChartHeight;
  };

  const getVolumeY = (vol: number) => {
    const ratio = Math.max(0, Math.min(1, vol / volumeCeiling));
    return volumeBottom - ratio * volumeChartHeight;
  };

  const getVolumeBarHeight = (vol: number) => {
    const ratio = Math.max(0, Math.min(1, vol / volumeCeiling));
    return Math.max(1.5, ratio * volumeChartHeight);
  };

  const getIndexFromX = useCallback(
    (clientX: number) => {
      if (candles.length <= 1) return 0;
      const mouseX = clientX - paddingLeft;
      const clampedX = Math.max(0, Math.min(chartAreaWidth, mouseX));
      const localSlot = (clampedX / chartAreaWidth) * totalSlots;
      const rawIndex = visibleStartIndex + Math.round(localSlot);
      return Math.min(candles.length - 1, Math.max(0, rawIndex));
    },
    [candles.length, chartAreaWidth, paddingLeft, visibleStartIndex, totalSlots]
  );

  const getPriceFromY = useCallback(
    (clientY: number) => {
      const clampedY = Math.max(paddingTop, Math.min(paddingTop + priceChartHeight, clientY));
      const ratio = (paddingTop + priceChartHeight - clampedY) / priceChartHeight;
      return minPrice + ratio * priceSpan;
    },
    [minPrice, priceSpan, paddingTop, priceChartHeight]
  );

  const getResolvedIndex = useCallback(
    (lineIndex: number, lineTime?: string) => {
      if (lineTime) {
        const found = candles.findIndex((c) => c.time === lineTime);
        if (found !== -1) return found;
      }
      return Math.max(0, Math.min(candles.length - 1, lineIndex));
    },
    [candles]
  );

  // Handle Mouse movement for Crosshair & Tooltip & Drawing
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (candles.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    const safeIndex = getIndexFromX(rawX);
    setHoverIndex(safeIndex);
    setCursorPos({ x: rawX, y: rawY });

    if (drawingState) {
      const currentPrice = getPriceFromY(rawY);
      setDrawingState((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          currentIndex: safeIndex,
          currentPrice: currentPrice,
          currentX: getX(safeIndex),
          currentY: getY(currentPrice)
        };
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (candles.length === 0 || !e.touches[0]) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const rawX = e.touches[0].clientX - rect.left;
    const rawY = e.touches[0].clientY - rect.top;

    const safeIndex = getIndexFromX(rawX);
    setHoverIndex(safeIndex);
    setCursorPos({ x: rawX, y: rawY });
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawingMode || candles.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    // Check if mouse is within price chart area
    if (rawY < paddingTop || rawY > paddingTop + priceChartHeight) return;
    if (rawX < paddingLeft || rawX > containerWidth - paddingRight) return;

    const idx = getIndexFromX(rawX);
    const price = getPriceFromY(rawY);
    const candleTime = candles[idx]?.time;

    if (!drawingState) {
      // First anchor point
      setDrawingState({
        startIndex: idx,
        startPrice: price,
        startTime: candleTime,
        startX: getX(idx),
        startY: getY(price),
        currentIndex: idx,
        currentPrice: price,
        currentX: getX(idx),
        currentY: getY(price),
        isMouseDown: true
      });
    } else {
      // Second anchor point (click-then-click mode)
      const newLine: CustomTrendline = {
        id: `tl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        startIndex: drawingState.startIndex,
        startPrice: drawingState.startPrice,
        startTime: drawingState.startTime,
        endIndex: idx,
        endPrice: price,
        endTime: candleTime,
        color: trendlineColor,
        type: trendlineType,
        label: `${trendlineType === 'support' ? 'Support' : trendlineType === 'resistance' ? 'Resistance' : 'Trend'} $${drawingState.startPrice.toFixed(2)} → $${price.toFixed(2)}`
      };
      setTrendlines((prev) => [...prev, newLine]);
      setDrawingState(null);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDrawingMode || !drawingState || !drawingState.isMouseDown) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    const dist = Math.hypot(rawX - drawingState.startX, rawY - drawingState.startY);

    // If dragged more than 14 pixels, complete the trendline immediately (drag-and-drop mode)
    if (dist > 14) {
      const idx = getIndexFromX(rawX);
      const price = getPriceFromY(rawY);
      const newLine: CustomTrendline = {
        id: `tl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        startIndex: drawingState.startIndex,
        startPrice: drawingState.startPrice,
        startTime: drawingState.startTime,
        endIndex: idx,
        endPrice: price,
        endTime: candles[idx]?.time,
        color: trendlineColor,
        type: trendlineType,
        label: `${trendlineType === 'support' ? 'Support' : trendlineType === 'resistance' ? 'Resistance' : 'Trend'} $${drawingState.startPrice.toFixed(2)} → $${price.toFixed(2)}`
      };
      setTrendlines((prev) => [...prev, newLine]);
      setDrawingState(null);
    } else {
      // Single click: stay in preview mode awaiting second click
      setDrawingState((prev) => (prev ? { ...prev, isMouseDown: false } : null));
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
    setCursorPos(null);
  };

  const handleDeleteTrendline = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setTrendlines((prev) => prev.filter((tl) => tl.id !== id));
    if (hoveredTrendlineId === id) setHoveredTrendlineId(null);
    if (selectedTrendlineId === id) setSelectedTrendlineId(null);
  };

  const handleUndoTrendline = () => {
    setTrendlines((prev) => prev.slice(0, prev.length - 1));
  };

  const handleClearAllTrendlines = () => {
    setTrendlines([]);
    setDrawingState(null);
    setSelectedTrendlineId(null);
  };

  const activeCandle = hoverIndex !== null ? candles[hoverIndex] : candles[candles.length - 1];
  const activeIdx = hoverIndex !== null ? hoverIndex : candles.length - 1;
  const activeVolMA = activeIdx >= 0 ? volumeMA20Series[activeIdx] : null;
  const activeIsBull = activeCandle ? activeCandle.close >= activeCandle.open : true;
  const participationRatio = activeCandle && activeVolMA && !isNaN(activeVolMA) && activeVolMA > 0
    ? activeCandle.volume / activeVolMA
    : null;

  // Generate SVG paths for indicators
  const createPolylinePoints = (series: number[]) => {
    return series
      .map((val, i) => {
        if (isNaN(val)) return null;
        return `${getX(i).toFixed(1)},${getY(val).toFixed(1)}`;
      })
      .filter(Boolean)
      .join(' ');
  };

  // Generate SVG path for Volume MA
  const volumeMAPath = useMemo(() => {
    if (!showVolMA || volumeMA20Series.length === 0) return '';
    return volumeMA20Series
      .map((val, i) => {
        if (isNaN(val)) return null;
        return `${getX(i).toFixed(1)},${getVolumeY(val).toFixed(1)}`;
      })
      .filter(Boolean)
      .join(' ');
  }, [volumeMA20Series, showVolMA, volumeBottom, volumeChartHeight, volumeCeiling, chartAreaWidth]);

  // Area chart path
  const areaPath = useMemo(() => {
    const dataset = visibleCandles.length > 0 ? visibleCandles : candles;
    if (dataset.length === 0) return '';
    const points = dataset.map((c, i) => {
      const globalIdx = visibleStartIndex + i;
      return `${getX(globalIdx).toFixed(1)},${getY(c.close).toFixed(1)}`;
    });
    const firstX = getX(visibleStartIndex).toFixed(1);
    const lastX = getX(visibleStartIndex + dataset.length - 1).toFixed(1);
    const bottomY = (paddingTop + priceChartHeight).toFixed(1);
    return `M ${firstX},${bottomY} L ${points.join(' L ')} L ${lastX},${bottomY} Z`;
  }, [visibleCandles, candles, visibleStartIndex, getX, getY, paddingTop, priceChartHeight]);

  const linePath = useMemo(() => {
    const dataset = visibleCandles.length > 0 ? visibleCandles : candles;
    if (dataset.length === 0) return '';
    return dataset
      .map((c, i) => {
        const globalIdx = visibleStartIndex + i;
        return `${getX(globalIdx).toFixed(1)},${getY(c.close).toFixed(1)}`;
      })
      .join(' L ');
  }, [visibleCandles, candles, visibleStartIndex, getX, getY]);

  // Price grid levels (5 evenly spaced steps)
  const priceGridLevels = useMemo(() => {
    const levels = [];
    for (let i = 0; i <= 5; i++) {
      const price = minPrice + (priceSpan / 5) * i;
      const y = getY(price);
      levels.push({ price, y });
    }
    return levels;
  }, [minPrice, priceSpan, priceChartHeight]);

  return (
    <div id="stock-chart-panel" ref={containerRef} className="w-full bg-slate-900 border-b border-slate-800 px-6 py-5">
      {/* AI Indicator Setup Toast Banner */}
      {aiAdvisorToast && (
        <div className="mb-3 px-3.5 py-2 rounded-lg bg-gradient-to-r from-indigo-950/90 via-slate-900 to-indigo-950/80 border border-indigo-500/50 text-indigo-200 text-xs font-mono flex items-center justify-between shadow-lg shadow-indigo-500/10 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span className="font-semibold">{aiAdvisorToast}</span>
            <span className="text-slate-400 text-[10.5px] hidden sm:inline">
              (All other indicators switched off; S/R lines preserved)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAIAdvisorModalOpen(true)}
              className="px-2 py-0.5 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-[10.5px] font-bold transition-colors cursor-pointer border border-indigo-500/30"
            >
              View Matrix
            </button>
            <button
              onClick={() => setAiAdvisorToast(null)}
              className="text-slate-400 hover:text-white cursor-pointer p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Indicator & Volume Toggles Ribbon */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {/* Swing Candlestick Period or Day Trade Interval Quick Switcher */}
          {!isDayTradeView ? (
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded border border-blue-500/30 mr-1 shadow-sm">
              <span className="text-[10px] uppercase font-bold text-blue-400 px-1 font-mono flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5" />
                Candle:
              </span>
              {SWING_CANDLE_INTERVALS.map((intv) => (
                <button
                  key={intv.id}
                  onClick={() => onSelectSwingInterval?.(intv.id)}
                  title={intv.description}
                  className={`px-1.5 py-0.5 text-[10px] font-semibold rounded transition-colors cursor-pointer ${
                    selectedSwingInterval === intv.id
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {intv.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded border border-amber-500/30 mr-1">
              <span className="text-[10px] uppercase font-bold text-amber-400 px-1 font-mono flex items-center gap-1">
                <Zap className="w-2.5 h-2.5" />
                Bar:
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold text-amber-300 font-mono">
                {selectedInterval}
              </span>
            </div>
          )}

          {/* Master Indicator Toggle: Turn Off All / Restore */}
          <div className="flex items-center gap-1.5 mr-1.5 pr-2 border-r border-slate-800">
            <button
              id="chart-turn-off-all-indicators-btn"
              onClick={activeIndicatorsCount > 0 ? handleTurnOffAllIndicators : handleRestoreIndicators}
              className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-all flex items-center gap-1.5 border cursor-pointer font-mono shadow-xs ${
                activeIndicatorsCount > 0
                  ? 'bg-rose-950/40 text-rose-300 border-rose-800/60 hover:bg-rose-900/60 hover:text-white'
                  : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/60 hover:text-white font-bold'
              }`}
              title={
                activeIndicatorsCount > 0
                  ? `Turn off all ${activeIndicatorsCount} active indicators, overlays, and patterns (Clean Chart)`
                  : 'Restore previous indicators setup'
              }
            >
              {activeIndicatorsCount > 0 ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-rose-400" />
                  <span>Turn Off All</span>
                  <span className="px-1 py-0.2 rounded text-[9.5px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {activeIndicatorsCount}
                  </span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Restore Indicators</span>
                </>
              )}
            </button>

            {activeIndicatorsCount === 0 && (
              <span className="text-[10px] text-slate-400 italic hidden sm:inline font-mono">
                Clean chart
              </span>
            )}
          </div>

          {/* AI Auto-Suggest Best Indicators Feature for Swing Range & Day Trade */}
          <div className="flex items-center gap-1.5 mr-1.5 pr-2 border-r border-slate-800">
            <button
              id="chart-ai-suggested-indicators-btn"
              onClick={() =>
                handleApplyAIPreset(
                  activeAIRecommendation.activeFlags,
                  `${activeAIRecommendation.badge} (${activeAIRecommendation.title})`
                )
              }
              className="px-2.5 py-0.5 rounded text-[11px] font-semibold transition-all flex items-center gap-1.5 border cursor-pointer font-mono bg-gradient-to-r from-indigo-950/90 to-purple-950/80 text-indigo-200 border-indigo-500/50 hover:border-indigo-400 hover:text-white shadow-xs"
              title={`AI suggests best indicators for ${
                isDayTradeView ? selectedInterval + ' Day Trade' : selectedSwingInterval.toUpperCase() + ' Swing'
              }: ${activeAIRecommendation.primaryIndicators.map((i) => i.name).join(' + ')}. Click to apply.`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span className="text-amber-300 font-bold">AI Suggest:</span>
              <span className="text-slate-200">{activeAIRecommendation.badge}</span>
              <span className="text-indigo-300 font-medium hidden md:inline">
                ({activeAIRecommendation.primaryIndicators.slice(0, 3).map((i) => i.name).join(' + ')})
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9.5px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold ml-0.5 shadow-xs">
                Apply
              </span>
            </button>

            {/* AI Indicator Hierarchy Grouping Quick Switcher (Tier 1 is Highest & Default) */}
            <div className="flex items-center gap-1 bg-slate-950/90 p-0.5 rounded border border-indigo-500/40">
              <span className="text-[10px] font-mono text-indigo-300 font-bold px-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300" />
                Hierarchy:
              </span>
              {INDICATOR_HIERARCHY_TIERS.map((tier) => {
                const isApplied = activeHierarchyTier === tier.id;
                return (
                  <button
                    key={tier.id}
                    id={`hierarchy-tier-${tier.tierNumber}-btn`}
                    onClick={() => handleApplyHierarchyTier(tier.id)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      isApplied
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title={`${tier.title} (${tier.badge}) - ${tier.whyMustRead}`}
                  >
                    <span>{tier.tierNumber === 1 ? 'Tier 1 (Default)' : `T${tier.tierNumber}`}</span>
                    {isApplied && <Check className="w-2.5 h-2.5" />}
                  </button>
                );
              })}
              <button
                id="hierarchy-tier-all-btn"
                onClick={() => handleApplyHierarchyTier('confluence_all')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  activeHierarchyTier === 'confluence_all'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Apply all 4 hierarchy tiers simultaneously for multi-indicator confluence"
              >
                <span>All Tiers</span>
                {activeHierarchyTier === 'confluence_all' && <Check className="w-2.5 h-2.5" />}
              </button>
              <button
                id="chart-open-ai-advisor-modal-btn"
                onClick={() => setIsAIAdvisorModalOpen(true)}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono transition-all border cursor-pointer bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20 hover:text-white flex items-center gap-1"
                title="View Hierarchy Rationale: Why all tiers must be read for better informed decisions"
              >
                <Info className="w-3 h-3 text-amber-300" />
                <span>Rationale</span>
              </button>
            </div>
          </div>

          {/* AI Next Candle Prediction Overlay & Thesis Controls (Clean Chart on Forecast) */}
          <div className="flex items-center gap-1.5 mr-1.5 pr-2 border-r border-slate-800">
            <button
              id="chart-ai-candle-forecast-btn"
              onClick={handleToggleAiForecast}
              className={`px-2.5 py-0.5 rounded text-[11px] font-semibold transition-all flex items-center gap-1.5 border cursor-pointer font-mono shadow-xs ${
                showAiGhostCandle
                  ? 'bg-indigo-950/90 text-indigo-200 border-indigo-500/80 hover:bg-indigo-900 hover:text-white shadow-indigo-500/20 ring-1 ring-indigo-500/40'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Toggle AI next candle forecast overlay. When turned ON, enables clean chart mode (volume bars visible, other indicators hidden)."
            >
              <Sparkles className={`w-3.5 h-3.5 ${isLoadingAiPrediction ? 'animate-spin text-indigo-400' : showAiGhostCandle ? 'text-indigo-400' : 'text-slate-400'}`} />
              <span>{showAiGhostCandle ? 'AI Forecast: ON (Clean Chart)' : 'AI Forecast: OFF'}</span>
              {showAiGhostCandle && aiPrediction && (
                <span className={`px-1 py-0.2 rounded text-[9px] font-bold ${
                  aiPrediction.predictedCandle.direction === 'BULLISH'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : aiPrediction.predictedCandle.direction === 'BEARISH'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                }`}>
                  {aiPrediction.probabilityScore}%
                </span>
              )}
            </button>

            <button
              id="chart-ai-details-toggle-btn"
              onClick={() => {
                const nextVal = !showAiPredictionCard;
                setShowAiPredictionCard(nextVal);
                if (nextVal && !aiPrediction) {
                  handleFetchAICandlePrediction();
                }
              }}
              className={`px-2 py-0.5 rounded text-[10.5px] font-mono transition-all border cursor-pointer ${
                showAiPredictionCard
                  ? 'bg-slate-800 text-slate-200 border-slate-600'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-300'
              }`}
              title={showAiPredictionCard ? 'Hide AI thesis & conditions panel' : 'Show AI thesis & conditions panel'}
            >
              {showAiPredictionCard ? 'Hide Thesis' : 'Thesis Card'}
            </button>
          </div>

          {/* Advanced Analytics Modals (Market Microstructure & Strategy Framework) */}
          <div className="flex items-center gap-1.5 mr-1.5 pr-2 border-r border-slate-800">
            <button
              id="chart-open-microstructure-btn"
              onClick={() => setIsMicrostructureModalOpen(true)}
              className="px-2 py-0.5 rounded text-[11px] font-semibold transition-all flex items-center gap-1.5 border cursor-pointer font-mono bg-cyan-950/70 text-cyan-200 border-cyan-500/40 hover:bg-cyan-900/80 hover:text-white hover:border-cyan-400 shadow-xs"
              title="Market Microstructure: Joe Granville Quantity-Price Relations, Institutional Footprints, and AI Options Strategies"
            >
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Microstructure & Options</span>
            </button>

            <button
              id="chart-open-strategy-matrix-btn"
              onClick={() => setIsStrategyMatrixModalOpen(true)}
              className="px-2 py-0.5 rounded text-[11px] font-semibold transition-all flex items-center gap-1.5 border cursor-pointer font-mono bg-indigo-950/70 text-indigo-200 border-indigo-500/40 hover:bg-indigo-900/80 hover:text-white hover:border-indigo-400 shadow-xs"
              title="Strategy Framework & Confluence Matrix: Rate Bullish/Bearish/Neutral with quantitative thesis"
            >
              <Scale className="w-3.5 h-3.5 text-amber-300" />
              <span>Strategy Matrix</span>
            </button>
          </div>

          <span className="text-xs font-bold uppercase text-slate-500 mr-1 tracking-widest">
            Overlays:
          </span>

          <button
            onClick={() => setShowSMA20(!showSMA20)}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all flex items-center gap-1 border cursor-pointer ${
              showSMA20
                ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 font-mono'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200 font-mono'
            }`}
          >
            <span className="w-2 h-0.5 bg-blue-400"></span>
            SMA 20
          </button>

          <button
            onClick={() => setShowSMA50(!showSMA50)}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all flex items-center gap-1 border cursor-pointer ${
              showSMA50
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 font-mono'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200 font-mono'
            }`}
          >
            <span className="w-2 h-0.5 bg-amber-400"></span>
            SMA 50
          </button>

          <button
            onClick={() => setShowSMA200(!showSMA200)}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all flex items-center gap-1 border cursor-pointer ${
              showSMA200
                ? 'bg-purple-500/10 text-purple-300 border-purple-500/30 font-mono'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200 font-mono'
            }`}
          >
            <span className="w-2 h-0.5 bg-purple-400"></span>
            SMA 200
          </button>

          <button
            onClick={() => setShowEMA9(!showEMA9)}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all flex items-center gap-1 border cursor-pointer ${
              showEMA9
                ? 'bg-pink-500/10 text-pink-300 border-pink-500/30 font-mono'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200 font-mono'
            }`}
          >
            <span className="w-2 h-0.5 bg-pink-400"></span>
            EMA 9
          </button>

          <button
            onClick={() => setShowEMA21(!showEMA21)}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all flex items-center gap-1 border cursor-pointer ${
              showEMA21
                ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30 font-mono'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200 font-mono'
            }`}
          >
            <span className="w-2 h-0.5 bg-indigo-400"></span>
            EMA 21
          </button>

          {/* Bollinger Band with Live Interpretation */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowBollinger(!showBollinger)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all flex items-center gap-1 border cursor-pointer ${
                showBollinger
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-mono'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200 font-mono'
              }`}
              title={`Bollinger Bands (20, 2): ${bbInterpretation.status} - ${bbInterpretation.interpretation}`}
            >
              <span className="w-2 h-0.5 bg-emerald-400"></span>
              BB (20,2)
            </button>
            {showBollinger && (
              <span
                className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-medium border bg-slate-950 border-emerald-500/40 text-emerald-300 cursor-help"
                title={`${bbInterpretation.interpretation} • Bandwidth: ${bbInterpretation.bandwidth.toFixed(1)}% • %B: ${bbInterpretation.percentB.toFixed(2)}`}
              >
                {bbInterpretation.status}
              </span>
            )}
          </div>

          <button
            onClick={() => setShowVWAP(!showVWAP)}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all flex items-center gap-1 border cursor-pointer ${
              showVWAP
                ? 'bg-teal-500/10 text-teal-300 border-teal-500/30 font-mono'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200 font-mono'
            }`}
          >
            <span className="w-2 h-0.5 bg-teal-400"></span>
            VWAP
          </button>

          {/* Support & Resistance: 2 Versions (Line / Band) with ? Rationale Button */}
          <div className="flex items-center gap-1 bg-slate-950/90 p-0.5 rounded border border-rose-500/30">
            <button
              onClick={() => setShowSR(!showSR)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all flex items-center gap-1 border cursor-pointer ${
                showSR
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-mono font-bold'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200 font-mono'
              }`}
              title="Toggle Support and Resistance visual overlays"
            >
              <span className="w-2 h-0.5 bg-rose-400"></span>
              S/R
            </button>

            {showSR && (
              <>
                <div className="flex items-center rounded bg-slate-800/80 p-0.5 text-[10px] font-mono">
                  <button
                    onClick={() => setSrDisplayMode('line')}
                    className={`px-1.5 py-0.5 rounded cursor-pointer ${
                      srDisplayMode === 'line' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                    title="Render S/R as central pivot lines"
                  >
                    Line
                  </button>
                  <button
                    onClick={() => setSrDisplayMode('band')}
                    className={`px-1.5 py-0.5 rounded cursor-pointer ${
                      srDisplayMode === 'band' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                    title="Render S/R as range bands"
                  >
                    Band
                  </button>
                  <button
                    onClick={() => setSrDisplayMode('both')}
                    className={`px-1.5 py-0.5 rounded cursor-pointer ${
                      srDisplayMode === 'both' ? 'bg-rose-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                    title="Render both lines and range bands"
                  >
                    Both
                  </button>
                </div>

                <button
                  onClick={() => {
                    if (detailedSrLevels.length > 0) {
                      setActiveSrRationaleLevel(detailedSrLevels[0]);
                    }
                  }}
                  className="p-1 rounded text-amber-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Click to view S/R Rationale, mathematical formula, and historical touch/bounce occasions"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                </button>
              </>
            )}
          </div>

          {/* Fibonacci Retracement & Extension Overlay Toggle */}
          <button
            id="chart-toggle-fib-btn"
            onClick={() => setShowFibonacci(!showFibonacci)}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all flex items-center gap-1.5 border cursor-pointer ${
              showFibonacci
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-mono font-bold shadow-xs'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200 font-mono'
            }`}
            title="Toggle Fibonacci Retracement & Extension Levels (Displayed on right side of chart)"
          >
            <span className="w-2 h-0.5 bg-amber-400"></span>
            Fibonacci
          </button>

          {showFibonacci && (
            <div className="flex items-center rounded border border-slate-700 bg-slate-800/90 p-0.5 text-[10px] font-mono gap-0.5">
              <button
                onClick={() =>
                  setFibDirection((prev) =>
                    prev === 'auto' ? 'uptrend' : prev === 'uptrend' ? 'downtrend' : 'auto'
                  )
                }
                className="px-1.5 py-0.5 rounded text-amber-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                title="Swing Direction: Click to cycle Auto / Uptrend / Downtrend"
              >
                {fibDirection === 'auto' ? (
                  <span>Auto ({fibRetracement?.direction === 'UPTREND' ? '▲ Bull' : '▼ Bear'})</span>
                ) : fibDirection === 'uptrend' ? (
                  <span className="text-emerald-300 font-bold">▲ Up</span>
                ) : (
                  <span className="text-rose-300 font-bold">▼ Down</span>
                )}
              </button>
              <button
                onClick={() => setShowFibZones(!showFibZones)}
                className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                  showFibZones ? 'bg-amber-500/30 text-amber-200 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Toggle Shaded Colored Fibonacci Bands"
              >
                Zones
              </button>
              <button
                onClick={() => setShowFibExtensions(!showFibExtensions)}
                className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                  showFibExtensions ? 'bg-purple-500/30 text-purple-200 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Toggle Fibonacci Extension Targets (127.2%, 161.8%, 200%, 261.8%)"
              >
                Extensions
              </button>
            </div>
          )}

          {/* Volume Indicator Controls */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
            <span className="text-xs font-bold uppercase text-slate-500 tracking-widest flex items-center gap-1">
              <BarChart3 className="w-3 h-3 text-blue-400" />
              Volume:
            </span>

            <button
              onClick={() => setShowVolume(!showVolume)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all flex items-center gap-1 border cursor-pointer font-mono ${
                showVolume
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Toggle Volume Bars"
            >
              <span>Bars</span>
            </button>

            {showVolume && (
              <>
                <button
                  onClick={() => setShowVolMA(!showVolMA)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all flex items-center gap-1 border cursor-pointer font-mono ${
                    showVolMA
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                  title="Toggle 20-Period Volume Moving Average (Vol MA 20)"
                >
                  <span className="w-2 h-0.5 bg-amber-400"></span>
                  <span>MA 20</span>
                </button>

                {/* Sub-Panel vs Overlay Mode Toggle */}
                <div className="flex items-center rounded border border-slate-700 bg-slate-800/90 p-0.5">
                  <button
                    onClick={() => setVolumeMode('separate')}
                    className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors cursor-pointer ${
                      volumeMode === 'separate'
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Display separate volume sub-panel chart below price"
                  >
                    Sub-Panel
                  </button>
                  <button
                    onClick={() => setVolumeMode('overlay')}
                    className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors cursor-pointer ${
                      volumeMode === 'overlay'
                        ? 'bg-blue-600 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Display volume bars overlaid inside price chart"
                  >
                    Overlay
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Volume Profile (Full name requirement #11) with HVN/LVN liquidity toggle (#6) */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
            <span className="text-xs font-bold uppercase text-slate-500 tracking-widest flex items-center gap-1">
              <Layers className="w-3 h-3 text-amber-400" />
              Volume Profile:
            </span>

            <button
              id="chart-toggle-volume-profile-btn"
              onClick={() => setShowVolumeProfile(!showVolumeProfile)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all flex items-center gap-1 border cursor-pointer font-mono ${
                showVolumeProfile
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Toggle horizontal Volume Profile with POC, Value Area (VA 70%), and HVN/LVN nodes"
            >
              <Layers className="w-3 h-3" />
              <span>{showVolumeProfile ? 'Volume Profile On' : 'Volume Profile'}</span>
            </button>

            {showVolumeProfile && (
              <>
                {/* Side Toggle: Right vs Left */}
                <div className="flex items-center rounded border border-slate-700 bg-slate-800/90 p-0.5">
                  <button
                    onClick={() => setVolumeProfileSide('right')}
                    className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors cursor-pointer ${
                      volumeProfileSide === 'right'
                        ? 'bg-amber-600 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Align Volume Profile to right side"
                  >
                    Right
                  </button>
                  <button
                    onClick={() => setVolumeProfileSide('left')}
                    className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors cursor-pointer ${
                      volumeProfileSide === 'left'
                        ? 'bg-amber-600 text-white font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Align Volume Profile to left side"
                  >
                    Left
                  </button>
                </div>

                {/* POC Toggle */}
                <button
                  onClick={() => setShowPocLine(!showPocLine)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all flex items-center gap-1 border cursor-pointer font-mono ${
                    showPocLine
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'text-slate-500 border-slate-800 hover:text-slate-300'
                  }`}
                  title="Toggle Point of Control (POC) level line"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  POC
                </button>

                {/* VA Bounds Toggle */}
                <button
                  onClick={() => setShowVaBounds(!showVaBounds)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all flex items-center gap-1 border cursor-pointer font-mono ${
                    showVaBounds
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                      : 'text-slate-500 border-slate-800 hover:text-slate-300'
                  }`}
                  title="Toggle Value Area High (VAH) & Value Area Low (VAL) bounds"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                  VA (70%)
                </button>

                {/* HVN & LVN Liquidity Nodes Toggle (Requirement #6) */}
                <button
                  onClick={() => setShowHvnLvn(!showHvnLvn)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all flex items-center gap-1 border cursor-pointer font-mono ${
                    showHvnLvn
                      ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                      : 'text-slate-500 border-slate-800 hover:text-slate-300'
                  }`}
                  title="Toggle Key Liquidity Nodes: High Volume Nodes (HVN - Consolidation Magnet) and Low Volume Nodes (LVN - Void)"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                  HVN/LVN
                </button>
              </>
            )}
          </div>

          {/* Sub-Panel Indicators Selector (Requirement #12: max 3 sub-panels) */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
            <span className="text-xs font-bold uppercase text-slate-500 tracking-widest flex items-center gap-1">
              <Sliders className="w-3 h-3 text-purple-400" />
              Sub-Panels:
            </span>
            {(['VOLUME', 'RSI', 'MACD', 'STOCHASTIC', 'MFI'] as SubPanelIndicatorType[]).map((panel) => {
              const active = activeSubPanels.includes(panel);
              return (
                <button
                  key={panel}
                  onClick={() => handleToggleSubPanel(panel)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold transition-all border cursor-pointer ${
                    active
                      ? 'bg-purple-600 text-white border-purple-500 shadow-xs'
                      : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
                  }`}
                  title={`Toggle ${panel} sub-panel chart below price (Max 3 sub-panels allowed)`}
                >
                  {panel}
                </button>
              );
            })}
            {activeSubPanels.length > 0 && (
              <span className="text-[9px] font-mono text-purple-300 bg-purple-950/60 px-1 py-0.2 rounded border border-purple-800/50">
                {activeSubPanels.length}/3
              </span>
            )}
          </div>

          {/* Crosshair & Floating Tooltip Toggle */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
            <button
              id="chart-toggle-crosshair-btn"
              onClick={() => setShowCrosshair(!showCrosshair)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all flex items-center gap-1.5 border cursor-pointer font-mono ${
                showCrosshair
                  ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 shadow-sm font-bold'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Toggle interactive crosshair and floating OHLC tooltip"
            >
              <Crosshair className="w-3 h-3 text-blue-400" />
              <span>{showCrosshair ? 'Crosshair' : 'Crosshair Off'}</span>
            </button>
          </div>

          {/* Custom Trendline Drawing Tools */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
            <span className="text-xs font-bold uppercase text-slate-500 tracking-widest flex items-center gap-1">
              <PenTool className="w-3 h-3 text-blue-400" />
              Draw:
            </span>

            <button
              onClick={() => {
                setIsDrawingMode(!isDrawingMode);
                setDrawingState(null);
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all flex items-center gap-1.5 border cursor-pointer font-mono ${
                isDrawingMode
                  ? 'bg-blue-600 text-white border-blue-500 shadow-sm ring-1 ring-blue-400/50 font-bold'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white hover:border-slate-600'
              }`}
              title="Click to toggle interactive trendline drawing on chart"
            >
              <PenTool className="w-3 h-3" />
              <span>{isDrawingMode ? 'Drawing On' : 'Trendlines'}</span>
            </button>

            {/* Support / Resistance / Neutral selector */}
            {(isDrawingMode || trendlines.length > 0) && (
              <div className="flex items-center rounded border border-slate-700 bg-slate-800/90 p-0.5">
                <button
                  onClick={() => setTrendlineType('support')}
                  className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors cursor-pointer flex items-center gap-1 ${
                    trendlineType === 'support'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-slate-400 hover:text-emerald-300'
                  }`}
                  title="Draw Support Level (Emerald green line)"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Support
                </button>
                <button
                  onClick={() => setTrendlineType('resistance')}
                  className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors cursor-pointer flex items-center gap-1 ${
                    trendlineType === 'resistance'
                      ? 'bg-rose-600 text-white font-bold'
                      : 'text-slate-400 hover:text-rose-300'
                  }`}
                  title="Draw Resistance Level (Rose red line)"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                  Resistance
                </button>
                <button
                  onClick={() => setTrendlineType('neutral')}
                  className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors cursor-pointer flex items-center gap-1 ${
                    trendlineType === 'neutral'
                      ? 'bg-sky-600 text-white font-bold'
                      : 'text-slate-400 hover:text-sky-300'
                  }`}
                  title="Draw Neutral Trendline / Channel (Sky blue line)"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                  Trend
                </button>
              </div>
            )}

            {/* Undo & Clear Actions */}
            {trendlines.length > 0 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={handleUndoTrendline}
                  className="p-1 text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-700 rounded border border-slate-700 cursor-pointer transition-colors"
                  title="Undo last drawn trendline"
                >
                  <Undo2 className="w-3 h-3" />
                </button>
                <button
                  onClick={handleClearAllTrendlines}
                  className="p-1 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 rounded border border-rose-500/30 cursor-pointer transition-colors"
                  title="Clear all custom trendlines"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                  {trendlines.length} {trendlines.length === 1 ? 'line' : 'lines'}
                </span>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* GROUPED PATTERNS SET: CANDLESTICK PATTERNS & CHART PATTERNS               */}
          {/* Full name labels, unified 'Last Pattern (Default)' vs 'Show All' selector */}
          {/* ========================================================================= */}
          <div id="patterns-confluence-set-group" className="flex flex-wrap items-center gap-1.5 pl-2 border-l border-slate-800">
            <span className="text-xs font-bold uppercase text-slate-500 tracking-widest flex items-center gap-1">
              <Shapes className="w-3 h-3 text-cyan-400" />
              Patterns:
            </span>

            {/* Candlestick Patterns Toggle Button with Info Tooltip (Requirement #10) */}
            <div className="flex items-center gap-0.5">
              <button
                id="chart-toggle-candle-signals-btn"
                onClick={toggleCandleSignals}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all flex items-center gap-1.5 border cursor-pointer font-mono ${
                  showCandleSignals
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm ring-1 ring-amber-400/30 font-bold'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
                title="Toggle Candlestick Patterns recognition (Hammer, Bullish/Bearish Engulfing, Morning/Evening Star, Doji, Marubozu). Click the '?' icon to learn what signals do."
              >
                <Zap className="w-3 h-3 text-amber-400" />
                <span>Candlestick Patterns</span>
                {detectedSignals.length > 0 && (
                  <span className={`px-1 py-0.2 rounded text-[10px] ${
                    showCandleSignals ? 'bg-amber-500/30 text-amber-300' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {patternDisplayMode === 'last' ? (lastCandleSignal ? '1' : '0') : detectedSignals.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                className="p-1 text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
                title="About Candlestick Signals: Identifies high-probability Japanese candlestick reversals and continuation setups (Hammer, Engulfing, Morning/Evening Star, Piercing, Doji) to spot inflection points at key support/resistance zones."
              >
                <HelpCircle className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Chart Patterns Toggle Button (including Cup & Handle VCP) */}
            <button
              id="chart-toggle-patterns-btn"
              onClick={() => setShowChartPatterns((prev) => !prev)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all flex items-center gap-1.5 border cursor-pointer font-mono ${
                showChartPatterns
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm ring-1 ring-cyan-400/30 font-bold'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title="Toggle Chart Patterns recognition (Cup & Handle VCP, Double Bottom/Top, Head & Shoulders, Flags, Triangles)"
            >
              <Shapes className="w-3 h-3 text-cyan-400" />
              <span>Chart Patterns</span>
              {detectedChartPatterns.length > 0 && (
                <span className={`px-1 py-0.2 rounded text-[10px] ${
                  showChartPatterns ? 'bg-cyan-500/30 text-cyan-300' : 'bg-slate-700 text-slate-400'
                }`}>
                  {patternDisplayMode === 'last' ? (detectedChartPatterns.length > 0 ? '1' : '0') : detectedChartPatterns.length}
                </span>
              )}
            </button>

            {/* Unified Pattern Display Mode Selector: Last Pattern (Default) vs Show All */}
            {(showCandleSignals || showChartPatterns) && (
              <div className="flex items-center rounded border border-slate-700 bg-slate-800/90 p-0.5" id="pattern-display-mode-selector">
                <button
                  id="pattern-display-mode-last-btn"
                  onClick={() => {
                    setPatternDisplayMode('last');
                    setSignalScope('last');
                  }}
                  className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors cursor-pointer flex items-center gap-1 ${
                    patternDisplayMode === 'last'
                      ? 'bg-amber-600 text-white font-bold shadow-xs'
                      : 'text-slate-400 hover:text-amber-300'
                  }`}
                  title="Default: only show the last pattern available"
                >
                  <span>Last Pattern (Default)</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" />
                </button>
                <button
                  id="pattern-display-mode-all-btn"
                  onClick={() => {
                    setPatternDisplayMode('all');
                    setSignalScope('all');
                  }}
                  className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors cursor-pointer ${
                    patternDisplayMode === 'all'
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Show all detected patterns across the series"
                >
                  Show All
                </button>
              </div>
            )}

            {/* Sentiment filters when in 'Show All' mode */}
            {patternDisplayMode === 'all' && (showCandleSignals || showChartPatterns) && (
              <div className="flex items-center rounded border border-slate-700 bg-slate-800/90 p-0.5">
                <button
                  onClick={() => {
                    setSignalFilter('ALL');
                    setPatternFilter('ALL');
                  }}
                  className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors cursor-pointer ${
                    signalFilter === 'ALL' && patternFilter === 'ALL'
                      ? 'bg-slate-700 text-white font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title="Show all detected patterns"
                >
                  All
                </button>
                <button
                  onClick={() => {
                    setSignalFilter('BULLISH');
                    setPatternFilter('BULLISH');
                  }}
                  className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors cursor-pointer flex items-center gap-0.5 ${
                    signalFilter === 'BULLISH'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-slate-400 hover:text-emerald-300'
                  }`}
                  title="Filter to bullish patterns"
                >
                  <span>▲ Bull</span>
                </button>
                <button
                  onClick={() => {
                    setSignalFilter('BEARISH');
                    setPatternFilter('BEARISH');
                  }}
                  className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors cursor-pointer flex items-center gap-0.5 ${
                    signalFilter === 'BEARISH'
                      ? 'bg-rose-600 text-white font-bold'
                      : 'text-slate-400 hover:text-rose-300'
                  }`}
                  title="Filter to bearish patterns"
                >
                  <span>▼ Bear</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* OHLC & Volume Bar Inspector */}
        {activeCandle && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-mono bg-slate-950 px-3 py-1 rounded-md border border-slate-800">
            <span className="text-slate-400 font-sans text-[11px]">{activeCandle.time}</span>
            <span>O: <b className="text-slate-200">${activeCandle.open.toFixed(2)}</b></span>
            <span>H: <b className="text-emerald-400">${activeCandle.high.toFixed(2)}</b></span>
            <span>L: <b className="text-rose-400">${activeCandle.low.toFixed(2)}</b></span>
            <span>C: <b className="text-white">${activeCandle.close.toFixed(2)}</b></span>
            <span>Vol: <b className={activeIsBull ? 'text-emerald-400' : 'text-rose-400'}>{formatVolume(activeCandle.volume)}</b></span>
            {activeVolMA && !isNaN(activeVolMA) && (
              <span className="hidden lg:inline text-slate-400">
                Vol MA: <b className="text-amber-300">{formatVolume(activeVolMA)}</b>
                {participationRatio && (
                  <span
                    className={`ml-1.5 px-1 py-0.2 rounded text-[10px] font-semibold ${
                      participationRatio >= 1.5
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : participationRatio <= 0.7
                        ? 'bg-slate-800 text-slate-400 border border-slate-700'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}
                  >
                    {participationRatio >= 1.5 ? 'Surge ' : participationRatio <= 0.7 ? 'Dry ' : ''}
                    {participationRatio.toFixed(1)}x
                  </span>
                )}
              </span>
            )}
            {showVolumeProfile && volumeProfile && (
              <span className="hidden xl:inline-flex items-center gap-1.5 pl-2 border-l border-slate-800 text-slate-400">
                <span>POC: <b className="text-amber-400">${volumeProfile.pocPrice.toFixed(2)}</b></span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                    volumeProfile.currentPriceStatus === 'ABOVE_VAH'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : volumeProfile.currentPriceStatus === 'BELOW_VAL'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      : volumeProfile.currentPriceStatus === 'AT_POC'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                  }`}
                >
                  {volumeProfile.currentPriceStatus === 'ABOVE_VAH'
                    ? 'Above VAH'
                    : volumeProfile.currentPriceStatus === 'BELOW_VAL'
                    ? 'Below VAL'
                    : volumeProfile.currentPriceStatus === 'AT_POC'
                    ? 'At POC'
                    : 'Inside VA (70%)'}
                </span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Day Trade View Quick Intraday Switcher Ribbon */}
      {isDayTradeView && onSelectInterval && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-1.5 bg-amber-950/30 border-b border-amber-900/40 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-amber-400 font-bold uppercase tracking-wider text-[11px] font-mono">
              <Zap className="w-3.5 h-3.5 fill-amber-400/20" />
              Day Trade Candlesticks:
            </span>
            <div className="flex items-center gap-1">
              {DAY_TRADE_INTERVALS.map((intv) => (
                <button
                  key={intv.id}
                  onClick={() => onSelectInterval(intv.id)}
                  title={`${intv.fullLabel} Candlesticks`}
                  className={`px-2 py-0.5 rounded text-xs font-mono font-medium transition-all cursor-pointer ${
                    selectedInterval === intv.id
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                      : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
                  }`}
                >
                  {intv.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-slate-400">
              High-frequency {DAY_TRADE_INTERVALS.find((i) => i.id === selectedInterval)?.fullLabel} resolution
            </span>
            {onToggleDayTradeView && (
              <button
                onClick={() => onToggleDayTradeView(false)}
                className="text-amber-400 hover:text-amber-300 font-medium cursor-pointer underline underline-offset-2"
              >
                Exit Day Trade View
              </button>
            )}
          </div>
        </div>
      )}

      {/* Candlestick Signals Quick Jump Strip */}
      {showCandleSignals && (
        <>
          {signalScope === 'all' && filteredSignals.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-900/90 border-b border-slate-800 overflow-x-auto scrollbar-none text-[11px]">
              <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <b className="text-slate-200">Signals ({filteredSignals.length}):</b>
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                {filteredSignals.map((sig) => {
                  const isSel = selectedSignalIndex === sig.index;
                  const isBull = sig.sentiment === 'BULLISH';
                  const isBear = sig.sentiment === 'BEARISH';
                  return (
                    <button
                      key={`sig-chip-${sig.index}`}
                      onClick={() => {
                        setSelectedSignalIndex(isSel ? null : sig.index);
                        setHoverIndex(sig.index);
                      }}
                      title={sig.description}
                      className={`px-2 py-0.5 rounded-full font-mono font-medium flex items-center gap-1 border transition-all cursor-pointer ${
                        isSel
                          ? 'bg-blue-600 text-white border-blue-400 shadow-md ring-2 ring-blue-400/30'
                          : isBull
                          ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/60'
                          : isBear
                          ? 'bg-rose-950/40 text-rose-300 border-rose-800/60 hover:bg-rose-900/60'
                          : 'bg-amber-950/40 text-amber-300 border-amber-800/60 hover:bg-amber-900/60'
                      }`}
                    >
                      <span>{isBull ? '▲' : isBear ? '▼' : '◆'}</span>
                      <span>{sig.label}</span>
                      <span className="text-slate-400 text-[10px]">@{sig.time}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {signalScope === 'last' && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-1.5 bg-amber-950/20 border-b border-amber-900/30 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-bold shrink-0 flex items-center gap-1 font-mono">
                  <Zap className="w-3.5 h-3.5 fill-amber-400/20" />
                  Last Candle (Bar #{candles.length} @ {lastCandle?.time || 'Latest'}):
                </span>
                {lastCandleSignal ? (
                  <button
                    onClick={() => {
                      setSelectedSignalIndex(lastCandleSignal.index);
                      setHoverIndex(lastCandleSignal.index);
                    }}
                    className={`px-2.5 py-0.5 rounded-full font-mono font-semibold flex items-center gap-1.5 border transition-all cursor-pointer ${
                      lastCandleSignal.sentiment === 'BULLISH'
                        ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600 shadow-sm'
                        : lastCandleSignal.sentiment === 'BEARISH'
                        ? 'bg-rose-950/60 text-rose-300 border-rose-600 shadow-sm'
                        : 'bg-amber-950/60 text-amber-300 border-amber-600 shadow-sm'
                    }`}
                  >
                    <span>{lastCandleSignal.sentiment === 'BULLISH' ? '▲' : lastCandleSignal.sentiment === 'BEARISH' ? '▼' : '◆'}</span>
                    <span>{lastCandleSignal.label}</span>
                    <span className="text-xs font-bold text-white">${(lastCandle?.close || 0).toFixed(2)}</span>
                  </button>
                ) : (
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <span className="text-slate-300 font-medium">No pattern signal triggered on this candle</span>
                    {latestDetectedSignal && (
                      <span className="hidden md:inline text-slate-500">
                        (Prior signal: <b className="text-slate-400">{latestDetectedSignal.label}</b> at {latestDetectedSignal.time})
                      </span>
                    )}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {latestDetectedSignal && !lastCandleSignal && (
                  <button
                    onClick={() => {
                      setSelectedSignalIndex(latestDetectedSignal.index);
                      setHoverIndex(latestDetectedSignal.index);
                    }}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[10px] font-mono cursor-pointer border border-slate-700"
                    title="Inspect the most recent signal before the last candle"
                  >
                    Inspect Prior Signal ({latestDetectedSignal.time})
                  </button>
                )}
                <button
                  onClick={() => setSignalScope('all')}
                  className="px-2 py-0.5 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-[10px] font-medium cursor-pointer border border-blue-500/30"
                  title="Switch to viewing all signals across chart"
                >
                  Show All ({detectedSignals.length}) →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Active Candlestick Signal HUD Inspector */}
      {activeSignal && (
        <div className="mx-4 my-2 p-3.5 rounded-xl border bg-slate-900/95 border-slate-700 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg shrink-0 border ${
                activeSignal.sentiment === 'BULLISH'
                  ? 'bg-emerald-950 text-emerald-400 border-emerald-700'
                  : activeSignal.sentiment === 'BEARISH'
                  ? 'bg-rose-950 text-rose-400 border-rose-700'
                  : 'bg-amber-950 text-amber-400 border-amber-700'
              }`}
            >
              {activeSignal.sentiment === 'BULLISH' ? '▲' : activeSignal.sentiment === 'BEARISH' ? '▼' : '◆'}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-sm text-white">{activeSignal.name}</h4>
                {activeSignal.index === lastCandleIndex && (
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    LAST CANDLE
                  </span>
                )}
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                    activeSignal.sentiment === 'BULLISH'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : activeSignal.sentiment === 'BEARISH'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}
                >
                  {activeSignal.sentiment} REVERSAL
                </span>
                <span className="text-slate-400 font-mono text-[11px]">
                  Bar #{activeSignal.index + 1} • {activeSignal.time}
                </span>
              </div>
              <p className="text-slate-300 text-xs mt-1 leading-relaxed max-w-2xl">
                {activeSignal.description}
              </p>
              <p className="text-blue-300 text-[11px] mt-0.5 flex items-center gap-1 font-mono">
                <Target className="w-3 h-3 text-blue-400" />
                <b>Day Trade Action:</b> {activeSignal.action}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 self-end md:self-auto shrink-0 border-t md:border-t-0 md:border-l border-slate-800 pt-2 md:pt-0 md:pl-4">
            <div className="space-y-1 font-mono text-[11px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400">Trigger:</span>
                <b className="text-emerald-400">${activeSignal.triggerPrice.toFixed(2)}</b>
              </div>
              {activeSignal.stopLossPrice && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-400">Stop Loss:</span>
                  <b className="text-rose-400">${activeSignal.stopLossPrice.toFixed(2)}</b>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* Stepper buttons between detected signals */}
              <button
                onClick={() => {
                  const currIdx = filteredSignals.findIndex((s) => s.index === activeSignal.index);
                  if (currIdx > 0) {
                    const prev = filteredSignals[currIdx - 1];
                    setSelectedSignalIndex(prev.index);
                    setHoverIndex(prev.index);
                  }
                }}
                disabled={filteredSignals.findIndex((s) => s.index === activeSignal.index) <= 0}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 cursor-pointer"
                title="Previous candlestick signal"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  const currIdx = filteredSignals.findIndex((s) => s.index === activeSignal.index);
                  if (currIdx >= 0 && currIdx < filteredSignals.length - 1) {
                    const next = filteredSignals[currIdx + 1];
                    setSelectedSignalIndex(next.index);
                    setHoverIndex(next.index);
                  }
                }}
                disabled={
                  filteredSignals.findIndex((s) => s.index === activeSignal.index) >=
                  filteredSignals.length - 1
                }
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-300 cursor-pointer"
                title="Next candlestick signal"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  setSelectedSignalIndex(null);
                  setHoveredSignal(null);
                }}
                className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer ml-1"
                title="Dismiss signal inspector"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chart Pattern Auto-Identifier Strip & Tactical HUD */}
      {showChartPatterns && (
        <div className="flex flex-col border-b border-slate-800 bg-slate-950/90 text-xs">
          <div className="flex items-center justify-between gap-2 px-4 py-2 overflow-x-auto scrollbar-none text-[11px]">
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-cyan-400 font-bold shrink-0 flex items-center gap-1.5 font-mono">
                <Shapes className="w-3.5 h-3.5" />
                <span>Patterns ({filteredChartPatterns.length}):</span>
              </span>

              {filteredChartPatterns.length === 0 ? (
                <span className="text-slate-400 italic font-mono text-[11px]">
                  No {patternFilter !== 'ALL' ? patternFilter.toLowerCase() : ''} classical chart patterns detected in this timeframe
                </span>
              ) : (
                <div className="flex items-center gap-1.5 shrink-0">
                  {filteredChartPatterns.map((pat) => {
                    const isSel = activePattern?.id === pat.id;
                    const isBull = pat.sentiment === 'BULLISH';
                    const isBear = pat.sentiment === 'BEARISH';
                    return (
                      <button
                        key={`pat-pill-${pat.id}`}
                        onClick={() => {
                          setSelectedPatternId(isSel ? null : pat.id);
                        }}
                        title={pat.description}
                        className={`px-2.5 py-1 rounded-full font-mono font-medium flex items-center gap-1.5 border transition-all cursor-pointer ${
                          isSel
                            ? 'bg-cyan-600 text-white border-cyan-400 shadow-md ring-2 ring-cyan-400/30'
                            : isBull
                            ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/60'
                            : isBear
                            ? 'bg-rose-950/40 text-rose-300 border-rose-800/60 hover:bg-rose-900/60'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
                        }`}
                      >
                        <span>{isBull ? '▲' : isBear ? '▼' : '◆'}</span>
                        <span className="font-bold">{pat.name}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                            pat.status === 'CONFIRMED'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {pat.status}
                        </span>
                        <span className="text-[10px] opacity-75">{pat.confidence}%</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {detectedChartPatterns.length > 0 && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowChartPatterns(false)}
                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
                  title="Close pattern overlay"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Active Pattern Tactical Guidance Card */}
          {activePattern && (
            <div className="mx-4 my-2 p-3 rounded-xl border bg-slate-900/95 border-slate-700 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
              <div className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-base shrink-0 border ${
                    activePattern.sentiment === 'BULLISH'
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-700'
                      : activePattern.sentiment === 'BEARISH'
                      ? 'bg-rose-950 text-rose-400 border-rose-700'
                      : 'bg-cyan-950 text-cyan-400 border-cyan-700'
                  }`}
                >
                  {activePattern.sentiment === 'BULLISH' ? '▲' : activePattern.sentiment === 'BEARISH' ? '▼' : '◆'}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-sm text-white">{activePattern.name}</h4>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                        activePattern.sentiment === 'BULLISH'
                          ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                          : activePattern.sentiment === 'BEARISH'
                          ? 'bg-rose-950 text-rose-400 border-rose-800'
                          : 'bg-cyan-950 text-cyan-400 border-cyan-800'
                      }`}
                    >
                      {activePattern.sentiment}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        activePattern.status === 'CONFIRMED'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      {activePattern.status}
                    </span>
                    <span className="text-slate-400 text-[11px] font-mono">
                      Match: <b className="text-cyan-400">{activePattern.confidence}%</b>
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs mt-1 max-w-2xl">{activePattern.description}</p>
                  <p className="text-cyan-300/90 text-[11px] font-mono mt-1 font-semibold">
                    Setup: {activePattern.tacticalAction}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-800 pt-2 md:pt-0 md:pl-4 font-mono text-[11px] shrink-0">
                {activePattern.breakoutPrice && (
                  <div>
                    <span className="text-slate-400 block text-[10px]">Breakout Level:</span>
                    <b className="text-white">${activePattern.breakoutPrice.toFixed(2)}</b>
                  </div>
                )}
                {activePattern.targetPrice && (
                  <div>
                    <span className="text-slate-400 block text-[10px]">Projected Target:</span>
                    <b className={activePattern.sentiment === 'BULLISH' ? 'text-emerald-400' : 'text-rose-400'}>
                      ${activePattern.targetPrice.toFixed(2)}
                    </b>
                  </div>
                )}
                {activePattern.stopLossPrice && (
                  <div>
                    <span className="text-slate-400 block text-[10px]">Stop Loss:</span>
                    <b className="text-amber-400">${activePattern.stopLossPrice.toFixed(2)}</b>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Drawing Mode Guidance Banner */}
      {isDrawingMode && (
        <div className="flex items-center justify-between bg-blue-950/50 border border-blue-500/30 px-3 py-1.5 rounded-md mb-2 text-xs font-mono">
          <div className="flex items-center gap-2 text-blue-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span>
              {drawingState
                ? `Point 1 anchored ($${drawingState.startPrice.toFixed(2)}). Click 2nd point or release mouse to complete trendline.`
                : `Trendline Drawing: Click on chart or drag to place a ${trendlineType.toUpperCase()} level line.`}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-[11px] hidden sm:inline">Tip: Hover line to delete • Esc to exit</span>
            <button
              onClick={() => {
                setIsDrawingMode(false);
                setDrawingState(null);
              }}
              className="text-slate-400 hover:text-white p-0.5 rounded hover:bg-slate-800 cursor-pointer transition-colors"
              title="Exit Drawing Mode"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Fibonacci Retracement Analysis Strip */}
      {showFibonacci && fibRetracement && (
        <div
          id="fibonacci-analysis-strip"
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 px-3.5 py-1.5 bg-slate-900/90 border border-amber-500/30 rounded-md mb-2 text-xs font-mono shadow-xs"
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-amber-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Fib Retracement:
            </span>
            <span className="text-slate-300">
              Range: <span className="text-emerald-400 font-semibold">${fibRetracement.lowPrice.toFixed(2)}</span> ({fibRetracement.lowTime}) ➔{' '}
              <span className="text-rose-400 font-semibold">${fibRetracement.highPrice.toFixed(2)}</span> ({fibRetracement.highTime})
            </span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-slate-300">
              Span: <b className="text-white">${fibRetracement.rangeSpan.toFixed(2)}</b> ({((fibRetracement.rangeSpan / fibRetracement.lowPrice) * 100).toFixed(1)}%)
            </span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className={fibRetracement.direction === 'UPTREND' ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
              {fibRetracement.direction === 'UPTREND' ? '▲ Bullish Swing (Low → High)' : '▼ Bearish Swing (High → Low)'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {fibRetracement.nearestSupport && (
              <span className="text-slate-300">
                Key Support:{' '}
                <b className="text-emerald-400">${fibRetracement.nearestSupport.price.toFixed(2)}</b>{' '}
                <span className="text-[10px] text-emerald-400/80">({fibRetracement.nearestSupport.label})</span>
              </span>
            )}
            {fibRetracement.nearestResistance && (
              <span className="text-slate-300">
                Key Resistance:{' '}
                <b className="text-rose-400">${fibRetracement.nearestResistance.price.toFixed(2)}</b>{' '}
                <span className="text-[10px] text-rose-400/80">({fibRetracement.nearestResistance.label})</span>
              </span>
            )}
            {fibRetracement.goldenPocket.isInside ? (
              <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold text-[11px] animate-pulse">
                ★ Testing Golden Pocket (${fibRetracement.goldenPocket.lowerPrice.toFixed(2)} - ${fibRetracement.goldenPocket.upperPrice.toFixed(2)})
              </span>
            ) : (
              <span className="text-amber-400/80 text-[11px]">
                Golden Pocket: ${fibRetracement.goldenPocket.lowerPrice.toFixed(2)} - ${fibRetracement.goldenPocket.upperPrice.toFixed(2)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Responsive Candlestick Viewport & Zoom / Pan Navigation Bar */}
      <div
        id="candlestick-viewport-navigation-bar"
        className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-slate-900/90 border border-slate-800 rounded-lg text-xs font-mono"
      >
        {/* Left: Device Viewport & Candlestick OHLC Clarity Status */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-[11px] text-slate-300 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {isMobilePortrait
                ? 'Mobile Portrait'
                : isMobileLandscapeOrTablet
                ? 'Tablet / Mobile Landscape'
                : 'Desktop'}
            </span>
          </span>

          <span className="text-slate-600 hidden sm:inline">•</span>

          <span className="text-[11px] text-slate-400">
            Visible:{' '}
            <b className="text-white font-bold">{visibleCandles.length}</b> / {candles.length} bars
          </span>

          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold">
            OHLC Width: {candleWidth.toFixed(1)}px
          </span>

          {clampedPanOffset > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10.5px] font-bold">
                « {clampedPanOffset} bars back
              </span>
              <button
                id="viewport-jump-to-live-btn"
                onClick={() => setPanOffset(0)}
                className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10.5px] transition-colors cursor-pointer shadow-xs flex items-center gap-1"
                title="Jump viewport to latest live candlestick"
              >
                <span>▶ Jump to Live</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: Interactive Zoom, Pan Scrubber & Viewport Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Pan earlier in history */}
          <button
            id="viewport-pan-earlier-btn"
            disabled={showAllCandlesMode || clampedPanOffset >= maxPanOffset}
            onClick={() => setPanOffset((prev) => Math.min(maxPanOffset, prev + Math.max(5, Math.floor(defaultTargetCandles / 4))))}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 border border-slate-700 text-[11px] transition-colors cursor-pointer"
            title="Pan chart earlier into historical candlesticks"
          >
            « Earlier
          </button>

          {/* Timeline slider scrubber if pan range exists */}
          {maxPanOffset > 0 && !showAllCandlesMode && (
            <div className="flex items-center gap-1 px-1" title="Timeline scrubber: drag to scroll through historical candlesticks">
              <input
                type="range"
                min={0}
                max={maxPanOffset}
                value={maxPanOffset - clampedPanOffset}
                onChange={(e) => setPanOffset(maxPanOffset - Number(e.target.value))}
                className="w-16 sm:w-28 h-1.5 bg-slate-700 rounded cursor-pointer accent-indigo-500"
              />
            </div>
          )}

          {/* Pan later toward live candles */}
          <button
            id="viewport-pan-later-btn"
            disabled={showAllCandlesMode || clampedPanOffset <= 0}
            onClick={() => setPanOffset((prev) => Math.max(0, prev - Math.max(5, Math.floor(defaultTargetCandles / 4))))}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 border border-slate-700 text-[11px] transition-colors cursor-pointer"
            title="Pan chart later toward recent candlesticks"
          >
            Later »
          </button>

          <span className="text-slate-600 hidden sm:inline">|</span>

          {/* Zoom In button */}
          <button
            id="viewport-zoom-in-btn"
            onClick={() => {
              setShowAllCandlesMode(false);
              setZoomLevel((prev) => Math.min(2.5, +(prev + 0.25).toFixed(2)));
            }}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
            title="Zoom In (Enlarge candlesticks for maximum OHLC readability)"
          >
            + Zoom
          </button>

          {/* Zoom Out button */}
          <button
            id="viewport-zoom-out-btn"
            onClick={() => {
              setShowAllCandlesMode(false);
              setZoomLevel((prev) => Math.max(0.6, +(prev - 0.25).toFixed(2)));
            }}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
            title="Zoom Out (View more candlesticks in viewport)"
          >
            - Zoom
          </button>

          {/* Reset Zoom to 1.0x */}
          <button
            id="viewport-zoom-reset-btn"
            onClick={() => {
              setZoomLevel(1.0);
              setPanOffset(0);
              setShowAllCandlesMode(false);
            }}
            className={`px-1.5 py-0.5 rounded text-[10.5px] border cursor-pointer font-bold ${
              zoomLevel === 1.0 && !showAllCandlesMode && clampedPanOffset === 0
                ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Reset to default optimal zoom level"
          >
            1.0x
          </button>

          {/* Toggle All Candles vs Optimal Responsive View */}
          <button
            id="viewport-show-all-candles-btn"
            onClick={() => {
              setShowAllCandlesMode((prev) => !prev);
              setPanOffset(0);
            }}
            className={`px-2 py-0.5 rounded text-[10.5px] border cursor-pointer font-bold ${
              showAllCandlesMode
                ? 'bg-purple-600 text-white border-purple-500 shadow-xs'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Toggle between showing ALL candles or optimal zoom for high-clarity OHLC"
          >
            {showAllCandlesMode ? 'Optimal View' : `All (${candles.length})`}
          </button>
        </div>
      </div>

      {/* Moving Average Slopes & Slope Gradient Interpretation Strip (Requirement #4) */}
      {(showSMA20 || showSMA50 || showSMA200 || showEMA9 || showEMA21) && maSlopes.length > 0 && (
        <div className="mb-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
              <span>MA Slopes:</span>
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {maSlopes
                .filter((s) => {
                  if (s.indicator === 'SMA 20') return showSMA20;
                  if (s.indicator === 'SMA 50') return showSMA50;
                  if (s.indicator === 'SMA 200') return showSMA200;
                  if (s.indicator === 'EMA 9') return showEMA9;
                  if (s.indicator === 'EMA 21') return showEMA21;
                  return false;
                })
                .map((slope) => {
                  const isSteepUp = slope.status === 'STEEP_UP';
                  const isMildUp = slope.status === 'MILD_UP';
                  const isFlattening = slope.status === 'FLATTENING';
                  const isMildDown = slope.status === 'MILD_DOWN';

                  const badgeClass = isSteepUp
                    ? 'text-emerald-300 bg-emerald-500/15 border-emerald-500/40'
                    : isMildUp
                    ? 'text-teal-300 bg-teal-500/15 border-teal-500/40'
                    : isFlattening
                    ? 'text-amber-300 bg-amber-500/15 border-amber-500/40'
                    : isMildDown
                    ? 'text-orange-300 bg-orange-500/15 border-orange-500/40'
                    : 'text-rose-300 bg-rose-500/15 border-rose-500/40';

                  return (
                    <button
                      key={slope.indicator}
                      onClick={() => setSelectedSlopeInfo(slope)}
                      className={`px-2 py-0.5 rounded text-[10.5px] font-bold border transition-all cursor-pointer flex items-center gap-1 hover:brightness-125 ${badgeClass}`}
                      title={`Click for institutional interpretation: ${slope.interpretation}`}
                    >
                      <span>{slope.indicator}:</span>
                      <span>{slope.label}</span>
                      <HelpCircle className="w-2.5 h-2.5 opacity-75" />
                    </button>
                  );
                })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {maCrosses.length > 0 && (
              <button
                onClick={() => setSelectedCrossEvent(maCrosses[maCrosses.length - 1])}
                className="text-[10.5px] px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-500/40 font-bold hover:bg-indigo-900 transition-colors flex items-center gap-1 cursor-pointer"
                title="View most recent Critical MA Cross event"
              >
                <span>Latest Cross:</span>
                <span className="text-amber-300">{maCrosses[maCrosses.length - 1].title}</span>
              </button>
            )}
            <span className="text-[10px] text-slate-500 hidden xl:inline">
              Click badge for slope rationale & institutional tilt
            </span>
          </div>
        </div>
      )}

      {/* Volatility Envelope (Bollinger Bands) Interpretation Banner (Requirement #5) */}
      {showBollinger && bbInterpretation && (
        <div className="mb-2 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-2 text-xs font-mono shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-bold uppercase text-slate-300 flex items-center gap-1">
              <span>Volatility Envelope:</span>
            </span>
            <span className={`px-2 py-0.5 rounded text-[10.5px] font-bold border ${bbInterpretation.badgeColor}`}>
              {bbInterpretation.title}
            </span>
            <span className="text-slate-400 text-[10.5px] hidden sm:inline">
              Bandwidth: <b className="text-white">{bbInterpretation.bandwidthPct}%</b> • %B: <b className="text-white">{bbInterpretation.percentB}</b>
            </span>
          </div>
          <div className="text-[11px] text-slate-300 flex-1 min-w-[200px] truncate" title={bbInterpretation.insight}>
            {bbInterpretation.insight}
          </div>
          <div className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-emerald-300 border border-slate-700 font-semibold hidden lg:inline">
            Tactics: {bbInterpretation.actionGuide}
          </div>
        </div>
      )}

      {/* SVG Interactive Canvas */}
      <div className="relative w-full rounded-lg overflow-hidden bg-slate-950 border border-slate-800 shadow-inner select-none">
        <svg
          width="100%"
          height={height}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchMove}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseLeave}
          className="cursor-crosshair block"
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2563eb" stopOpacity="0.30" />
              <stop offset="70%" stopColor="#2563eb" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="bbBandGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.08" />
            </linearGradient>

            {/* AI Next Candle Forecast Zone & Ghost Gradients */}
            <linearGradient id="aiProjectionZoneGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.01" />
            </linearGradient>
            <linearGradient id="aiBullGhostGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.80" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.40" />
            </linearGradient>
            <linearGradient id="aiBearGhostGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.80" />
              <stop offset="100%" stopColor="#be123c" stopOpacity="0.40" />
            </linearGradient>
            <filter id="aiGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Chart Header Watermark & Resolution Details */}
          <text
            x={paddingLeft + 12}
            y={paddingTop + 18}
            fill="#334155"
            fontSize="11"
            fontWeight="700"
            fontFamily="monospace"
            letterSpacing="0.6"
            pointerEvents="none"
          >
            {symbol} • {isDayTradeView ? `${selectedInterval} Intraday` : selectedSwingInterval === '1d' ? 'Daily (1D)' : selectedSwingInterval === '1wk' ? 'Weekly (1W)' : 'Monthly (1M)'} Candlesticks ({candles.length} bars)
          </text>

          {/* Grid lines & price labels */}
          {priceGridLevels.map((lvl, idx) => (
            <g key={idx}>
              <line
                x1={paddingLeft}
                y1={lvl.y}
                x2={containerWidth - paddingRight}
                y2={lvl.y}
                stroke="#1e293b"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={containerWidth - paddingRight + 8}
                y={lvl.y + 4}
                fill="#64748b"
                fontSize="10"
                fontFamily="monospace"
              >
                ${lvl.price.toFixed(2)}
              </text>
            </g>
          ))}

          {/* Bollinger Bands Shaded Area */}
          {showBollinger && bbSeries.upper.length > 0 && (
            <g>
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="1.2"
                strokeDasharray="2 2"
                points={createPolylinePoints(bbSeries.upper)}
              />
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="1"
                points={createPolylinePoints(bbSeries.middle)}
              />
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="1.2"
                strokeDasharray="2 2"
                points={createPolylinePoints(bbSeries.lower)}
              />
            </g>
          )}

          {/* Support & Resistance: 2 Versions (Line & Band) with ? Rationale Trigger (Requirement #2) */}
          {showSR && detailedSrLevels.length > 0 && (
            <g id="detailed-sr-layer">
              {detailedSrLevels.map((lvl) => {
                const isSup = lvl.type === 'SUPPORT';
                const mainColor = isSup ? '#10b981' : '#f43f5e';
                const bgColor = isSup ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)';
                const borderColor = isSup ? '#059669' : '#e11d48';
                const yCenter = getY(lvl.price);
                const bandHigh = lvl.bandHigh ?? (lvl as any).rangeHigh ?? lvl.price * 1.005;
                const bandLow = lvl.bandLow ?? (lvl as any).rangeLow ?? lvl.price * 0.995;
                const yTop = getY(bandHigh);
                const yBottom = getY(bandLow);
                const bandH = Math.max(4, Math.abs(yBottom - yTop));
                const bandY = Math.min(yTop, yBottom);
                const testCount = lvl.testCount ?? (lvl as any).touchCount ?? 1;
                const bounceCount = lvl.bounceCount ?? 1;

                const badgeW = isMobilePortrait ? 136 : 186;
                const badgeStats = isMobilePortrait
                  ? `${bounceCount}b/${testCount}t`
                  : `${testCount}x tested (${bounceCount}b)`;

                return (
                  <g key={lvl.id} className="cursor-pointer">
                    {/* Version (b): Range Band */}
                    {(srDisplayMode === 'band' || srDisplayMode === 'both') && (
                      <rect
                        x={paddingLeft}
                        y={bandY}
                        width={chartAreaWidth}
                        height={bandH}
                        fill={bgColor}
                        stroke={borderColor}
                        strokeWidth="0.8"
                        strokeDasharray="4 2"
                        rx="2"
                        onClick={() => setActiveSrRationaleLevel(lvl)}
                      />
                    )}

                    {/* Version (a): Line */}
                    {(srDisplayMode === 'line' || srDisplayMode === 'both') && (
                      <line
                        x1={paddingLeft}
                        y1={yCenter}
                        x2={containerWidth - paddingRight}
                        y2={yCenter}
                        stroke={mainColor}
                        strokeWidth={lvl.strength >= 4 ? 1.8 : 1.2}
                        strokeDasharray={lvl.strength >= 4 ? '6 3' : '3 3'}
                        onClick={() => setActiveSrRationaleLevel(lvl)}
                      />
                    )}

                    {/* Interactive Badge with Rationale '?' Trigger and Touch/Bounce stats */}
                    <g
                      transform={`translate(${paddingLeft + 6}, ${Math.max(paddingTop + 6, yCenter - 9)})`}
                      onClick={() => setActiveSrRationaleLevel(lvl)}
                      className="cursor-pointer"
                    >
                      <rect
                        width={badgeW}
                        height="18"
                        fill="#090d16"
                        stroke={mainColor}
                        strokeWidth="1"
                        rx="3"
                        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.6))"
                      />
                      <text
                        x="5"
                        y="12.5"
                        fill={mainColor}
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {isSup ? 'SUP' : 'RES'}: ${lvl.price.toFixed(isMobilePortrait ? 1 : 2)}
                      </text>
                      <text
                        x={isMobilePortrait ? "72" : "84"}
                        y="12.5"
                        fill="#94a3b8"
                        fontSize="8"
                        fontFamily="monospace"
                      >
                        {badgeStats}
                      </text>
                      {/* Small ? icon indicator button */}
                      <rect
                        x={badgeW - 19}
                        y="2"
                        width="15"
                        height="14"
                        fill="#f59e0b"
                        rx="2"
                        opacity="0.9"
                      />
                      <text
                        x={badgeW - 11.5}
                        y="12.5"
                        fill="#000000"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        ?
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
          )}

          {/* Fibonacci Retracement Overlay (Support/Resistance levels calculated from displayed range) */}
          {showFibonacci && fibRetracement && (
            <g id="fibonacci-retracement-overlay">
              {/* Shaded Colored Zones between consecutive Fibonacci Levels */}
              {showFibZones && (
                <g id="fibonacci-zones">
                  {fibRetracement.levels.slice(0, -1).map((lvl, idx) => {
                    const nextLvl = fibRetracement.levels[idx + 1];
                    const y1 = getY(lvl.price);
                    const y2 = getY(nextLvl.price);
                    const zoneTop = Math.min(y1, y2);
                    const zoneHeight = Math.max(1, Math.abs(y2 - y1));
                    const isGoldenZone = lvl.isGoldenPocket || nextLvl.isGoldenPocket;
                    const isHovered = hoveredFibRatio === lvl.ratio || hoveredFibRatio === nextLvl.ratio;

                    return (
                      <rect
                        key={`fib-zone-${lvl.ratio}-${nextLvl.ratio}`}
                        x={paddingLeft}
                        y={zoneTop}
                        width={chartAreaWidth}
                        height={zoneHeight}
                        fill={isGoldenZone ? 'rgba(245, 158, 11, 0.12)' : lvl.fillColor}
                        opacity={isHovered ? 0.9 : 0.6}
                        pointerEvents="none"
                      />
                    );
                  })}
                </g>
              )}

              {/* Swing Baseline Ray / Diagonal Vector and High/Low Markers */}
              {showFibAnchors && (
                <g id="fibonacci-anchor-vector">
                  {/* Diagonal dashed ray between swing low and swing high */}
                  <line
                    x1={getX(fibRetracement.lowIndex)}
                    y1={getY(fibRetracement.lowPrice)}
                    x2={getX(fibRetracement.highIndex)}
                    y2={getY(fibRetracement.highPrice)}
                    stroke="#94a3b8"
                    strokeWidth="1.2"
                    strokeDasharray="4 4"
                    opacity="0.5"
                  />

                  {/* Swing High Anchor Node */}
                  <circle
                    cx={getX(fibRetracement.highIndex)}
                    cy={getY(fibRetracement.highPrice)}
                    r="5"
                    fill="#f43f5e"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx={getX(fibRetracement.highIndex)}
                    cy={getY(fibRetracement.highPrice)}
                    r="8"
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth="1"
                    opacity="0.6"
                  />
                  <g
                    transform={`translate(${Math.max(
                      paddingLeft + 44,
                      Math.min(containerWidth - paddingRight - 44, getX(fibRetracement.highIndex))
                    )}, ${Math.max(paddingTop + 14, getY(fibRetracement.highPrice) - 14)})`}
                  >
                    <rect
                      x="-42"
                      y="-11"
                      width="84"
                      height="15"
                      rx="3"
                      fill="#0f172a"
                      stroke="#f43f5e"
                      strokeWidth="1"
                      opacity="0.95"
                    />
                    <text
                      x="0"
                      y="0"
                      textAnchor="middle"
                      fill="#fca5a5"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      HIGH: ${fibRetracement.highPrice.toFixed(2)}
                    </text>
                  </g>

                  {/* Swing Low Anchor Node */}
                  <circle
                    cx={getX(fibRetracement.lowIndex)}
                    cy={getY(fibRetracement.lowPrice)}
                    r="5"
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx={getX(fibRetracement.lowIndex)}
                    cy={getY(fibRetracement.lowPrice)}
                    r="8"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="1"
                    opacity="0.6"
                  />
                  <g
                    transform={`translate(${Math.max(
                      paddingLeft + 44,
                      Math.min(containerWidth - paddingRight - 44, getX(fibRetracement.lowIndex))
                    )}, ${Math.min(priceChartBottom - 10, getY(fibRetracement.lowPrice) + 16)})`}
                  >
                    <rect
                      x="-40"
                      y="-4"
                      width="80"
                      height="15"
                      rx="3"
                      fill="#0f172a"
                      stroke="#10b981"
                      strokeWidth="1"
                      opacity="0.95"
                    />
                    <text
                      x="0"
                      y="7"
                      textAnchor="middle"
                      fill="#86efac"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      LOW: ${fibRetracement.lowPrice.toFixed(2)}
                    </text>
                  </g>
                </g>
              )}

              {/* Horizontal Fibonacci Retracement Support & Resistance Lines */}
              {fibRetracement.levels.map((level) => {
                const y = getY(level.price);
                const isHovered = hoveredFibRatio === level.ratio;
                const isGp = level.isGoldenPocket;
                const isAnchor = level.ratio === 0.0 || level.ratio === 1.0;

                const strokeColor = level.color;
                const strokeWidth = isHovered ? 2.5 : isGp ? 1.8 : isAnchor ? 1.4 : 1.2;
                const strokeDasharray = isGp ? undefined : isAnchor ? '6 4' : level.ratio === 0.5 ? '4 2' : '3 3';

                const roleBadgeText =
                  level.role === 'SUPPORT'
                    ? 'SUP'
                    : level.role === 'RESISTANCE'
                    ? 'RES'
                    : level.role === 'TESTING'
                    ? 'TEST'
                    : 'ANCHOR';
                const roleBadgeColor =
                  level.role === 'SUPPORT'
                    ? '#10b981'
                    : level.role === 'RESISTANCE'
                    ? '#f43f5e'
                    : level.role === 'TESTING'
                    ? '#fbbf24'
                    : '#94a3b8';

                return (
                  <g
                    key={`fib-lvl-${level.ratio}`}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredFibRatio(level.ratio)}
                    onMouseLeave={() => setHoveredFibRatio((prev) => (prev === level.ratio ? null : prev))}
                  >
                    {/* Broad invisible line for effortless hover */}
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={containerWidth - paddingRight}
                      y2={y}
                      stroke="transparent"
                      strokeWidth="14"
                    />

                    {/* Dark backing stroke for contrast */}
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={containerWidth - paddingRight}
                      y2={y}
                      stroke="#020617"
                      strokeWidth={strokeWidth + 2}
                    />

                    {/* Main level line */}
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={containerWidth - paddingRight}
                      y2={y}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={strokeDasharray}
                      opacity={isHovered ? 1 : isGp ? 0.95 : 0.75}
                    />

                    {/* Left Tag: Ratio + Role + Price */}
                    <g transform={`translate(${paddingLeft + 6}, ${y - 12})`}>
                      <rect
                        x="0"
                        y="0"
                        width={isGp ? 140 : 124}
                        height="15"
                        rx="3"
                        fill="#090d16"
                        stroke={isHovered ? '#ffffff' : strokeColor}
                        strokeWidth={isHovered ? 1.5 : 1}
                        opacity={isHovered ? 0.98 : 0.92}
                      />
                      {isGp && (
                        <text
                          x="6"
                          y="11"
                          fill="#f59e0b"
                          fontSize="9"
                          fontWeight="bold"
                        >
                          ★
                        </text>
                      )}
                      <text
                        x={isGp ? 16 : 6}
                        y="11"
                        fill={strokeColor}
                        fontSize="9.5"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {level.label}
                      </text>
                      <text
                        x={isGp ? 62 : 48}
                        y="11"
                        fill="#f8fafc"
                        fontSize="9.5"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        ${level.price.toFixed(2)}
                      </text>
                      <text
                        x={isGp ? 116 : 100}
                        y="11"
                        fill={roleBadgeColor}
                        fontSize="8.5"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        [{roleBadgeText}]
                      </text>
                    </g>

                    {/* Right Price Axis Pill */}
                    <g transform={`translate(${containerWidth - paddingRight + 2}, ${y - 8})`}>
                      <rect
                        x="0"
                        y="0"
                        width="54"
                        height="16"
                        rx="3"
                        fill="#0f172a"
                        stroke={strokeColor}
                        strokeWidth="1"
                        opacity={isHovered ? 1 : 0.85}
                      />
                      <text
                        x="4"
                        y="11.5"
                        fill={strokeColor}
                        fontSize="9.5"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {level.price.toFixed(2)}
                      </text>
                    </g>

                    {/* Interactive Floating Hover Card on specific Fibonacci line */}
                    {isHovered && (
                      <g
                        transform={`translate(${Math.min(
                          containerWidth - paddingRight - 260,
                          Math.max(paddingLeft + 150, chartAreaWidth * 0.5)
                        )}, ${Math.max(paddingTop + 10, y - 48)})`}
                        pointerEvents="none"
                      >
                        <rect
                          x="0"
                          y="0"
                          width="250"
                          height="44"
                          rx="6"
                          fill="#0f172a"
                          stroke={strokeColor}
                          strokeWidth="1.5"
                        />
                        <text
                          x="10"
                          y="16"
                          fill="#ffffff"
                          fontSize="10.5"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {level.label} Retracement • ${level.price.toFixed(2)}
                        </text>
                        <text
                          x="10"
                          y="32"
                          fill={roleBadgeColor}
                          fontSize="9.5"
                          fontFamily="monospace"
                        >
                          Role:{' '}
                          {level.role === 'SUPPORT'
                            ? 'Support Floor'
                            : level.role === 'RESISTANCE'
                            ? 'Overhead Resistance'
                            : level.role === 'TESTING'
                            ? 'Active Price Test'
                            : 'Swing Anchor'}{' '}
                          ({level.distancePct >= 0 ? `+${level.distancePct}%` : `${level.distancePct}%`} from price)
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Fibonacci Extension Targets (Requirement #3) */}
              {showFibExtensions && fibRetracement.extensionLevels && fibRetracement.extensionLevels.map((ext) => {
                const y = getY(ext.price);
                if (y < paddingTop - 40 || y > priceChartBottom + 40) return null;
                const strokeColor = ext.color || '#a855f7';

                return (
                  <g key={`fib-ext-${ext.ratio}`} className="cursor-help">
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={containerWidth - paddingRight}
                      y2={y}
                      stroke={strokeColor}
                      strokeWidth="1.2"
                      strokeDasharray="4 3"
                      opacity="0.85"
                    />
                    {/* Displayed cleanly on the right side of the chart in free space */}
                    <g transform={`translate(${containerWidth - paddingRight - 120}, ${y - 8})`}>
                      <rect
                        width="116"
                        height="16"
                        fill="#090d16"
                        stroke={strokeColor}
                        strokeWidth="1"
                        rx="3"
                        filter="drop-shadow(0 2px 4px rgba(0,0,0,0.85))"
                      />
                      <text
                        x="58"
                        y="11.5"
                        fill={strokeColor}
                        fontSize="8.5"
                        fontWeight="bold"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {ext.label}: ${ext.price.toFixed(2)}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>
          )}

          {/* Volume Profile (Auction Market Profile) Overlay */}
          {showVolumeProfile && volumeProfile && volumeProfile.bins.length > 0 && (
            <g id="volume-profile-overlay">
              {/* Value Area Shaded Zone (70% Volume Equilibrium Region) */}
              {showVaBounds && (
                <rect
                  x={paddingLeft}
                  y={getY(volumeProfile.vah)}
                  width={chartAreaWidth}
                  height={Math.max(2, getY(volumeProfile.val) - getY(volumeProfile.vah))}
                  fill="#0284c7"
                  opacity="0.05"
                  pointerEvents="none"
                />
              )}

              {/* Volume Profile Horizontal Histogram Bars */}
              {volumeProfile.bins.map((bin) => {
                const yTop = getY(bin.priceHigh);
                const yBottom = getY(bin.priceLow);
                const binY = Math.min(yTop, yBottom);
                const binH = Math.max(2, Math.abs(yBottom - yTop) - 0.5);

                const maxVpWidth = Math.min(220, chartAreaWidth * 0.32);
                const barTotalWidth = Math.max(0, bin.percentOfMax * maxVpWidth);
                const buyWidth = bin.totalVolume > 0 ? (bin.buyVolume / bin.totalVolume) * barTotalWidth : 0;
                const sellWidth = Math.max(0, barTotalWidth - buyWidth);

                const isRight = volumeProfileSide === 'right';
                const isHovered = hoveredVpBin === bin.binIndex;

                let buyX: number;
                let sellX: number;
                if (isRight) {
                  const xAnchor = containerWidth - paddingRight;
                  buyX = xAnchor - barTotalWidth;
                  sellX = buyX + buyWidth;
                } else {
                  const xAnchor = paddingLeft;
                  buyX = xAnchor;
                  sellX = xAnchor + buyWidth;
                }

                const baseOpacity = bin.isPoc ? 0.85 : bin.isValueArea ? 0.65 : 0.28;
                const opacity = isHovered ? 0.95 : baseOpacity;

                return (
                  <g
                    key={`vp-bin-${bin.binIndex}`}
                    onMouseEnter={() => setHoveredVpBin(bin.binIndex)}
                    onMouseLeave={() => setHoveredVpBin((prev) => (prev === bin.binIndex ? null : prev))}
                    className="cursor-pointer"
                  >
                    {/* Hover highlight band */}
                    <rect
                      x={paddingLeft}
                      y={binY}
                      width={chartAreaWidth}
                      height={binH}
                      fill={isHovered ? '#38bdf8' : 'transparent'}
                      opacity={isHovered ? 0.08 : 0}
                    />

                    {/* Buy Volume Bar (Green) */}
                    {buyWidth > 0 && (
                      <rect
                        x={buyX}
                        y={binY}
                        width={buyWidth}
                        height={binH}
                        fill="#10b981"
                        opacity={opacity}
                        rx="1"
                      />
                    )}

                    {/* Sell Volume Bar (Red) */}
                    {sellWidth > 0 && (
                      <rect
                        x={sellX}
                        y={binY}
                        width={sellWidth}
                        height={binH}
                        fill="#f43f5e"
                        opacity={opacity}
                        rx="1"
                      />
                    )}

                    {/* POC Golden Outline if this bin contains Point of Control */}
                    {bin.isPoc && (
                      <rect
                        x={isRight ? containerWidth - paddingRight - barTotalWidth - 1 : paddingLeft}
                        y={binY - 0.5}
                        width={barTotalWidth + 1}
                        height={binH + 1}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="1.2"
                        rx="1"
                      />
                    )}

                    {/* Hover Tooltip tag on the active bin */}
                    {isHovered && (
                      <g
                        transform={`translate(${
                          isRight
                            ? Math.max(paddingLeft, containerWidth - paddingRight - barTotalWidth - 170)
                            : paddingLeft + barTotalWidth + 8
                        }, ${Math.max(paddingTop, binY - 16)})`}
                        pointerEvents="none"
                      >
                        <rect
                          width="162"
                          height="40"
                          fill="#020617"
                          stroke={bin.isPoc ? '#f59e0b' : bin.isValueArea ? '#38bdf8' : '#64748b'}
                          strokeWidth="1.2"
                          rx="4"
                        />
                        <text x="8" y="14" fill="#f8fafc" fontSize="10" fontWeight="bold" fontFamily="monospace">
                          ${bin.priceLow.toFixed(2)} - ${bin.priceHigh.toFixed(2)}
                        </text>
                        <text x="8" y="29" fill="#94a3b8" fontSize="9" fontFamily="monospace">
                          Vol: <tspan fill="#f1f5f9" fontWeight="bold">{formatVolume(bin.totalVolume)}</tspan>{' '}
                          (<tspan fill="#34d399">{((bin.buyVolume / (bin.totalVolume || 1)) * 100).toFixed(0)}%B</tspan>{' '}
                          / <tspan fill="#f87171">{((bin.sellVolume / (bin.totalVolume || 1)) * 100).toFixed(0)}%S</tspan>)
                        </text>
                        {bin.isPoc && (
                          <text x="154" y="14" fill="#f59e0b" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="end">
                            ★ POC
                          </text>
                        )}
                        {!bin.isPoc && bin.isValueArea && (
                          <text x="154" y="14" fill="#38bdf8" fontSize="8" fontWeight="bold" fontFamily="monospace" textAnchor="end">
                            VA 70%
                          </text>
                        )}
                      </g>
                    )}
                  </g>
                );
              })}

              {/* VAH (Value Area High) Boundary Line & Tag */}
              {showVaBounds && (
                <g id="vp-vah-line">
                  <line
                    x1={paddingLeft}
                    y1={getY(volumeProfile.vah)}
                    x2={containerWidth - paddingRight}
                    y2={getY(volumeProfile.vah)}
                    stroke="#0284c7"
                    strokeWidth="1.4"
                    strokeDasharray="4 3"
                  />
                  <g transform={`translate(${containerWidth - paddingRight - 88}, ${getY(volumeProfile.vah) - 16})`}>
                    <rect width="84" height="15" fill="#0369a1" rx="3" opacity="0.95" />
                    <text x="42" y="11" fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                      VAH: ${volumeProfile.vah.toFixed(2)}
                    </text>
                  </g>
                </g>
              )}

              {/* VAL (Value Area Low) Boundary Line & Tag */}
              {showVaBounds && (
                <g id="vp-val-line">
                  <line
                    x1={paddingLeft}
                    y1={getY(volumeProfile.val)}
                    x2={containerWidth - paddingRight}
                    y2={getY(volumeProfile.val)}
                    stroke="#0284c7"
                    strokeWidth="1.4"
                    strokeDasharray="4 3"
                  />
                  <g transform={`translate(${containerWidth - paddingRight - 88}, ${getY(volumeProfile.val) + 3})`}>
                    <rect width="84" height="15" fill="#0369a1" rx="3" opacity="0.95" />
                    <text x="42" y="11" fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                      VAL: ${volumeProfile.val.toFixed(2)}
                    </text>
                  </g>
                </g>
              )}

              {/* POC (Point of Control) Line & Crisp Readable Tag (Requirement #1) */}
              {showPocLine && (
                <g id="vp-poc-line">
                  <line
                    x1={paddingLeft}
                    y1={getY(volumeProfile.pocPrice)}
                    x2={containerWidth - paddingRight}
                    y2={getY(volumeProfile.pocPrice)}
                    stroke="#f59e0b"
                    strokeWidth="3"
                    opacity="0.25"
                  />
                  <line
                    x1={paddingLeft}
                    y1={getY(volumeProfile.pocPrice)}
                    x2={containerWidth - paddingRight}
                    y2={getY(volumeProfile.pocPrice)}
                    stroke="#f59e0b"
                    strokeWidth="1.8"
                    strokeDasharray="6 3"
                  />
                  {(() => {
                    const pocText = `★ POC: $${volumeProfile.pocPrice.toFixed(2)} (${formatVolume(volumeProfile.pocVolume)})`;
                    const boxW = Math.max(168, pocText.length * 7.2 + 20);
                    // Responsive placement to avoid overlapping volume profile bars
                    const isRight = volumeProfileSide === 'right';
                    const boxX = isRight ? paddingLeft + 12 : containerWidth - paddingRight - boxW - 12;
                    const boxY = Math.max(paddingTop + 6, Math.min(priceChartBottom - 24, getY(volumeProfile.pocPrice) - 10));

                    return (
                      <g transform={`translate(${boxX}, ${boxY})`} className="cursor-help">
                        <rect
                          width={boxW}
                          height="20"
                          fill="#090d16"
                          stroke="#f59e0b"
                          strokeWidth="1.4"
                          rx="4"
                          filter="drop-shadow(0 2px 6px rgba(0,0,0,0.9))"
                        />
                        <text
                          x={boxW / 2}
                          y="13.5"
                          fill="#fef08a"
                          fontSize="9.5"
                          fontWeight="bold"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {pocText}
                        </text>
                      </g>
                    );
                  })()}
                </g>
              )}

              {/* HVN and LVN Key Liquidity Nodes (Requirement #6) */}
              {showHvnLvn && volumeProfile.liquidityNodes && volumeProfile.liquidityNodes.length > 0 && (
                <g id="vp-hvn-lvn-nodes">
                  {volumeProfile.liquidityNodes.map((node, nIdx) => {
                    const isHvn = node.type === 'HVN';
                    const nodeY = getY(node.price);
                    const nodeColor = isHvn ? '#818cf8' : '#e879f9';
                    const nodeLabel = isHvn ? `HVN: $${node.price.toFixed(2)} (Magnet)` : `LVN: $${node.price.toFixed(2)} (Void)`;
                    const nodeBoxW = nodeLabel.length * 6.5 + 16;
                    const isRight = volumeProfileSide === 'right';
                    const tagX = isRight ? paddingLeft + 14 : containerWidth - paddingRight - nodeBoxW - 14;

                    return (
                      <g key={`lq-node-${nIdx}`} className="cursor-help">
                        <line
                          x1={paddingLeft}
                          y1={nodeY}
                          x2={containerWidth - paddingRight}
                          y2={nodeY}
                          stroke={nodeColor}
                          strokeWidth="1.2"
                          strokeDasharray={isHvn ? '4 3' : '2 3'}
                          opacity="0.75"
                        />
                        <g transform={`translate(${tagX}, ${Math.max(paddingTop + 6, nodeY - 8)})`}>
                          <rect
                            width={nodeBoxW}
                            height="16"
                            fill="#090d16"
                            stroke={nodeColor}
                            strokeWidth="1"
                            rx="3"
                            opacity="0.95"
                          />
                          <text
                            x={nodeBoxW / 2}
                            y="11"
                            fill={nodeColor}
                            fontSize="8.5"
                            fontWeight="bold"
                            fontFamily="monospace"
                            textAnchor="middle"
                          >
                            {nodeLabel}
                          </text>
                        </g>
                      </g>
                    );
                  })}
                </g>
              )}
            </g>
          )}

          {/* Area Chart Mode */}
          {chartType === 'area' && (
            <g>
              <path d={areaPath} fill="url(#areaGradient)" />
              <path d={`M ${linePath}`} fill="none" stroke="#2563eb" strokeWidth="2" />
            </g>
          )}

          {/* Candlestick Chart Mode */}
          {chartType === 'candle' && (
            <g id="candlestick-bars-group">
              {visibleCandles.map((candle, localIdx) => {
                const globalIdx = visibleStartIndex + localIdx;
                const x = getX(globalIdx);
                const isBullish = candle.close >= candle.open;
                const bodyTop = getY(Math.max(candle.open, candle.close));
                const bodyBottom = getY(Math.min(candle.open, candle.close));
                const rawBodyHeight = bodyBottom - bodyTop;
                const isDoji = Math.abs(candle.close - candle.open) < 0.005 || rawBodyHeight < 1.5;
                const bodyHeight = Math.max(2.0, rawBodyHeight);
                const highY = getY(candle.high);
                const lowY = getY(candle.low);
                const isHovered = hoverIndex === globalIdx;

                const color = isBullish ? '#10b981' : '#f43f5e';
                const strokeColor = isBullish ? '#34d399' : '#fb7185';

                return (
                  <g
                    key={`candle-${globalIdx}-${candle.time}`}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoverIndex(globalIdx)}
                    onClick={() => setHoverIndex(globalIdx)}
                  >
                    {/* Hover halo spotlight behind the candle */}
                    {isHovered && (
                      <rect
                        x={x - candleWidth / 2 - 2}
                        y={paddingTop}
                        width={candleWidth + 4}
                        height={priceChartHeight}
                        fill="rgba(255, 255, 255, 0.07)"
                        rx="2"
                        pointerEvents="none"
                      />
                    )}

                    {/* Wick: Centered line from High to Low */}
                    <line
                      x1={x}
                      y1={highY}
                      x2={x}
                      y2={lowY}
                      stroke={color}
                      strokeWidth={isHovered ? 2.0 : 1.4}
                    />

                    {/* Real Body or Doji Crossbar */}
                    {isDoji ? (
                      // Prominent Doji crossbar ensuring Open/Close is 100% visible on any viewport
                      <line
                        x1={x - candleWidth / 2}
                        y1={bodyTop}
                        x2={x + candleWidth / 2}
                        y2={bodyTop}
                        stroke={isBullish ? '#38bdf8' : '#e2e8f0'}
                        strokeWidth="2.4"
                        strokeLinecap="round"
                      />
                    ) : (
                      <rect
                        x={x - candleWidth / 2}
                        y={bodyTop}
                        width={candleWidth}
                        height={bodyHeight}
                        fill={color}
                        stroke={strokeColor}
                        strokeWidth={isHovered ? 1.5 : 0.8}
                        rx="1"
                      />
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* ------------------------------------------------------------- */}
          {/* FORWARD PROJECTION ZONE & AI NEXT CANDLE PREDICTION           */}
          {/* ------------------------------------------------------------- */}
          {candles.length > 0 && (
            <g id="ai-forward-projection-zone">
              {/* Shaded Forward Horizon Backdrop */}
              {(() => {
                const fwdStart = getX(candles.length - 1) + Math.max(candleWidth / 2 + 4, 8);
                const fwdEnd = containerWidth - paddingRight;
                const fwdWidth = Math.max(10, fwdEnd - fwdStart);

                return (
                  <rect
                    x={fwdStart}
                    y={paddingTop}
                    width={fwdWidth}
                    height={priceChartHeight}
                    fill="url(#aiProjectionZoneGrad)"
                    stroke="#6366f1"
                    strokeWidth="0.8"
                    strokeDasharray="4 3"
                    opacity="0.85"
                  />
                );
              })()}

              {/* Forward Slots Vertical Grid Lines & Bottom Axis Markers */}
              {Array.from({ length: Math.min(12, rightBufferCandles) }, (_, i) => i + 1).map((slotNum) => {
                const slotX = getX(candles.length - 1 + slotNum);
                if (slotX > containerWidth - paddingRight - 4) return null;
                const isNextSlot = slotNum === 1;

                return (
                  <g key={`ai-fwd-slot-${slotNum}`}>
                    <line
                      x1={slotX}
                      y1={paddingTop}
                      x2={slotX}
                      y2={priceChartBottom}
                      stroke={isNextSlot ? '#6366f1' : '#334155'}
                      strokeWidth={isNextSlot ? 1.2 : 0.8}
                      strokeDasharray={isNextSlot ? '3 2' : '2 3'}
                      opacity={isNextSlot ? 0.7 : 0.4}
                    />
                    {/* Bottom slot label on time axis (never touches candle chart) */}
                    <text
                      x={slotX}
                      y={priceChartBottom + 13}
                      fill={isNextSlot ? '#a5b4fc' : '#64748b'}
                      fontSize="9"
                      fontWeight={isNextSlot ? 'bold' : 'normal'}
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {isNextSlot ? '+1 (AI)' : `+${slotNum}`}
                    </text>
                  </g>
                );
              })}

              {/* AI Predicted Next Candle & Non-Overlapping Forward Text Boxes (Turned OFF by default) */}
              {showAiGhostCandle && aiPrediction && (
                <g
                  id="ai-predicted-ghost-candle"
                  className="cursor-pointer"
                  onMouseEnter={() => setIsAiCandleHovered(true)}
                  onMouseLeave={() => setIsAiCandleHovered(false)}
                >
                  {(() => {
                    const nextX = getX(candles.length);
                    const pred = aiPrediction.predictedCandle;
                    const isBull = pred.direction === 'BULLISH';
                    const isBear = pred.direction === 'BEARISH';
                    const predColor = isBull ? '#10b981' : isBear ? '#f43f5e' : '#38bdf8';
                    const highY = getY(pred.high);
                    const lowY = getY(pred.low);
                    const bodyTop = getY(Math.max(pred.open, pred.close));
                    const bodyBottom = getY(Math.min(pred.open, pred.close));
                    const bodyHeight = Math.max(2, bodyBottom - bodyTop);

                    const rawTargetY = getY(aiPrediction.keyLevels.targetPrice);
                    const rawStopY = getY(aiPrediction.keyLevels.invalidationPrice);

                    // Prevent overlap between target and stop price text boxes
                    let targetBoxY = Math.max(paddingTop + 12, Math.min(priceChartBottom - 14, rawTargetY - 9));
                    let stopBoxY = Math.max(paddingTop + 12, Math.min(priceChartBottom - 14, rawStopY - 9));

                    if (Math.abs(targetBoxY - stopBoxY) < 22) {
                      if (targetBoxY < stopBoxY) {
                        targetBoxY = Math.max(paddingTop + 10, targetBoxY - 11);
                        stopBoxY = Math.min(priceChartBottom - 14, stopBoxY + 11);
                      } else {
                        targetBoxY = Math.min(priceChartBottom - 14, targetBoxY + 11);
                        stopBoxY = Math.max(paddingTop + 10, stopBoxY - 11);
                      }
                    }

                    // Forward empty space bounds to the right of the ghost candle
                    const forwardSpaceLeft = nextX + Math.max(candleWidth / 2 + 10, 16);
                    const forwardSpaceRight = containerWidth - paddingRight;
                    const availableForwardWidth = Math.max(0, forwardSpaceRight - forwardSpaceLeft);

                    // Strictly non-overlapping AI prediction text box
                    // Sized so it ends safely before the Target & Stop text boxes (which are placed at forwardSpaceRight - 88)
                    const forecastBoxW = Math.max(108, Math.min(142, availableForwardWidth - 96));
                    const forecastBoxH = 44;
                    const candleMidY = (highY + lowY) / 2;
                    const forecastBoxY = Math.max(paddingTop + 14, Math.min(priceChartBottom - forecastBoxH - 14, candleMidY - forecastBoxH / 2));

                    return (
                      <g>
                        {/* Target Price Ray Line across forward space (starts AFTER ghost candle) */}
                        <line
                          x1={nextX + candleWidth / 2 + 4}
                          y1={rawTargetY}
                          x2={containerWidth - paddingRight}
                          y2={rawTargetY}
                          stroke={isBull ? '#34d399' : '#fb7185'}
                          strokeWidth="1.5"
                          strokeDasharray="4 2"
                          opacity={isAiCandleHovered ? 1 : 0.85}
                        />
                        {/* Target Price Text Box (placed at right margin in clear air) */}
                        <g transform={`translate(${containerWidth - paddingRight - 88}, ${targetBoxY})`}>
                          <rect
                            width="86"
                            height="18"
                            fill={isBull ? '#064e3b' : '#881337'}
                            stroke={isBull ? '#34d399' : '#fb7185'}
                            strokeWidth="1"
                            rx="3.5"
                            filter="drop-shadow(0 1px 4px rgba(0,0,0,0.8))"
                          />
                          <text
                            x="43"
                            y="12.5"
                            fill="#ffffff"
                            fontSize="8.5"
                            fontWeight="bold"
                            fontFamily="monospace"
                            textAnchor="middle"
                          >
                            Target: ${aiPrediction.keyLevels.targetPrice.toFixed(2)}
                          </text>
                        </g>

                        {/* Invalidation Stop Loss Ray Line (starts AFTER ghost candle) */}
                        <line
                          x1={nextX + candleWidth / 2 + 4}
                          y1={rawStopY}
                          x2={containerWidth - paddingRight}
                          y2={rawStopY}
                          stroke="#f43f5e"
                          strokeWidth="1.4"
                          strokeDasharray="3 3"
                          opacity={isAiCandleHovered ? 1 : 0.8}
                        />
                        {/* Invalidation Stop Loss Text Box (placed at right margin in clear air) */}
                        <g transform={`translate(${containerWidth - paddingRight - 88}, ${stopBoxY})`}>
                          <rect
                            width="86"
                            height="18"
                            fill="#450a0a"
                            stroke="#f43f5e"
                            strokeWidth="1"
                            rx="3.5"
                            filter="drop-shadow(0 1px 4px rgba(0,0,0,0.8))"
                          />
                          <text
                            x="43"
                            y="12.5"
                            fill="#fecdd3"
                            fontSize="8.5"
                            fontWeight="bold"
                            fontFamily="monospace"
                            textAnchor="middle"
                          >
                            Stop: ${aiPrediction.keyLevels.invalidationPrice.toFixed(2)}
                          </text>
                        </g>

                        {/* Ghost Wick (Dashed + Glow) */}
                        <line
                          x1={nextX}
                          y1={highY}
                          x2={nextX}
                          y2={lowY}
                          stroke={predColor}
                          strokeWidth="1.8"
                          strokeDasharray="3 2"
                        />

                        {/* Ghost Body (Patterned & Glowing) */}
                        <rect
                          x={nextX - candleWidth / 2}
                          y={bodyTop}
                          width={candleWidth}
                          height={bodyHeight}
                          fill={isBull ? 'url(#aiBullGhostGrad)' : 'url(#aiBearGhostGrad)'}
                          stroke={predColor}
                          strokeWidth="1.6"
                          strokeDasharray="4 2"
                          rx="1"
                          filter={isAiCandleHovered ? 'url(#aiGlowFilter)' : undefined}
                        />

                        {/* Direct Wick Direction Marker (strictly no wide box, zero candle obstruction) */}
                        <text
                          x={nextX}
                          y={isBull ? highY - 5 : lowY + 13}
                          fill={predColor}
                          fontSize="11"
                          fontWeight="bold"
                          fontFamily="monospace"
                          textAnchor="middle"
                          pointerEvents="none"
                        >
                          {isBull ? '▲' : isBear ? '▼' : '◆'}
                        </text>

                        {/* Dedicated AI Forecast Text Box placed strictly in empty forward space */}
                        {/* Guaranteed ZERO overlap with the candle (starts to the right) and ZERO overlap with target/stop boxes */}
                        <g transform={`translate(${forwardSpaceLeft}, ${forecastBoxY})`}>
                          <rect
                            width={forecastBoxW}
                            height={forecastBoxH}
                            fill="#090d16"
                            stroke={predColor}
                            strokeWidth="1.2"
                            rx="5"
                            filter="drop-shadow(0 2px 8px rgba(0,0,0,0.85))"
                          />
                          {/* Probability and Direction */}
                          <text
                            x="8"
                            y="16"
                            fill={predColor}
                            fontSize="9.5"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            {isBull ? '▲ ' : isBear ? '▼ ' : '◆ '}
                            {aiPrediction.probabilityScore}% {pred.direction}
                          </text>
                          {/* Expected Price Change */}
                          <text
                            x="8"
                            y="32"
                            fill="#94a3b8"
                            fontSize="8.5"
                            fontWeight="semibold"
                            fontFamily="monospace"
                          >
                            Exp: {pred.expectedChange >= 0 ? '+' : ''}${pred.expectedChange.toFixed(2)} ({pred.expectedChangePercent >= 0 ? '+' : ''}{pred.expectedChangePercent.toFixed(2)}%)
                          </text>
                        </g>

                        {/* Interactive Hover Tooltip for Predicted Candle (strictly placed in forward runway) */}
                        {isAiCandleHovered && (
                          <g transform={`translate(${Math.min(containerWidth - paddingRight - 204, forwardSpaceLeft)}, ${Math.max(paddingTop + 14, Math.min(priceChartBottom - 78, bodyTop - 30))})`}>
                            <rect
                              width="200"
                              height="72"
                              fill="#0f172a"
                              stroke={predColor}
                              strokeWidth="1.4"
                              rx="6"
                              filter="drop-shadow(0 4px 14px rgba(0,0,0,0.95))"
                            />
                            <text x="10" y="16" fill="#f8fafc" fontSize="9.5" fontWeight="bold" fontFamily="monospace">
                              AI NEXT BAR FORECAST ({aiPrediction.timeframe})
                            </text>
                            <text x="10" y="32" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
                              O: ${pred.open.toFixed(2)} | C: ${pred.close.toFixed(2)}
                            </text>
                            <text x="10" y="46" fill="#94a3b8" fontSize="8.5" fontFamily="monospace">
                              H: ${pred.high.toFixed(2)} | L: ${pred.low.toFixed(2)}
                            </text>
                            <text x="10" y="60" fill={predColor} fontSize="8.5" fontWeight="bold" fontFamily="monospace">
                              Exp: {pred.expectedChange >= 0 ? '+' : ''}${pred.expectedChange.toFixed(2)} ({pred.expectedChangePercent >= 0 ? '+' : ''}{pred.expectedChangePercent.toFixed(2)}%) • Prob: {aiPrediction.probabilityScore}%
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })()}
                </g>
              )}
            </g>
          )}

          {/* Candlestick Signals Visual Highlighting & Pattern Markers Layer */}
          {showCandleSignals && filteredSignals.length > 0 && (
            <g id="candlestick-signals-layer">
              {filteredSignals.map((sig) => {
                const candle = candles[sig.index];
                if (!candle) return null;

                const x = getX(sig.index);
                const isSelected = selectedSignalIndex === sig.index;
                const isHovered = hoveredSignal?.index === sig.index || isSelected;
                const isBull = sig.sentiment === 'BULLISH';
                const isBear = sig.sentiment === 'BEARISH';

                const highY = getY(candle.high);
                const lowY = getY(candle.low);

                // Y position for signal pill
                const badgeH = 17;
                const badgeY = isBull
                  ? Math.min(priceChartBottom - 10, lowY + 16)
                  : Math.max(paddingTop + 10, highY - 16);

                const color = isBull ? '#10b981' : isBear ? '#f43f5e' : '#f59e0b';
                const bgFill = isBull ? '#064e3b' : isBear ? '#881337' : '#78350f';
                const badgeBorder = isBull ? '#34d399' : isBear ? '#fb7185' : '#fcd34d';
                const textFill = isBull ? '#a7f3d0' : isBear ? '#fecdd3' : '#fef08a';

                const badgeW = Math.max(54, sig.label.length * 6.6 + 18);

                return (
                  <g
                    key={`candlestick-signal-marker-${sig.index}`}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedSignalIndex((prev) => (prev === sig.index ? null : sig.index));
                      setHoverIndex(sig.index);
                    }}
                    onMouseEnter={() => setHoveredSignal(sig)}
                    onMouseLeave={() => setHoveredSignal(null)}
                  >
                    {/* Subtle vertical glow pillar behind the signal candle */}
                    <rect
                      x={x - Math.max(4, candleWidth * 1.2)}
                      y={paddingTop}
                      width={Math.max(8, candleWidth * 2.4)}
                      height={priceChartHeight}
                      fill={color}
                      opacity={isHovered ? 0.22 : 0.08}
                      rx="2"
                      pointerEvents="none"
                    />

                    {/* Directional pointer line/polygon from wick to badge */}
                    {isBull ? (
                      <polygon
                        points={`${x},${lowY + 3} ${x - 4},${badgeY - badgeH / 2} ${x + 4},${badgeY - badgeH / 2}`}
                        fill={badgeBorder}
                        opacity={isHovered ? 1 : 0.8}
                      />
                    ) : (
                      <polygon
                        points={`${x},${highY - 3} ${x - 4},${badgeY + badgeH / 2} ${x + 4},${badgeY + badgeH / 2}`}
                        fill={badgeBorder}
                        opacity={isHovered ? 1 : 0.8}
                      />
                    )}

                    {/* Signal Badge Rect */}
                    <rect
                      x={x - badgeW / 2}
                      y={badgeY - badgeH / 2}
                      width={badgeW}
                      height={badgeH}
                      rx="3.5"
                      fill={bgFill}
                      stroke={badgeBorder}
                      strokeWidth={isHovered ? 1.8 : 1}
                      filter={isHovered ? 'drop-shadow(0 2px 5px rgba(0,0,0,0.6))' : undefined}
                    />

                    {/* Last candle signal subtle indicator ring */}
                    {sig.index === lastCandleIndex && (
                      <rect
                        x={x - badgeW / 2 - 2}
                        y={badgeY - badgeH / 2 - 2}
                        width={badgeW + 4}
                        height={badgeH + 4}
                        rx="5"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="1.2"
                        strokeDasharray="3 2"
                        opacity={0.85}
                        pointerEvents="none"
                      />
                    )}

                    {/* Signal Direction Icon + Label */}
                    <text
                      x={x}
                      y={badgeY + 3.5}
                      textAnchor="middle"
                      fill={textFill}
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                      pointerEvents="none"
                    >
                      {isBull ? '▲ ' : isBear ? '▼ ' : '◆ '}
                      {sig.label}
                    </text>
                  </g>
                );
              })}
            </g>
          )}

          {/* Classical Chart Patterns Auto-Identifier SVG Layer */}
          {showChartPatterns && filteredChartPatterns.length > 0 && (
            <g id="chart-patterns-auto-layer">
              {filteredChartPatterns.map((pat, patIdx) => {
                const isSelected = selectedPatternId === pat.id || (!selectedPatternId && patIdx === 0);
                const isBull = pat.sentiment === 'BULLISH';
                const isBear = pat.sentiment === 'BEARISH';
                const mainColor = isBull ? '#10b981' : isBear ? '#f43f5e' : '#06b6d4';
                const fillBg = isBull ? 'rgba(16, 185, 129, 0.09)' : isBear ? 'rgba(244, 63, 94, 0.09)' : 'rgba(6, 182, 212, 0.09)';

                // Shaded polygon connecting key points if >= 3 key points
                const polygonPoints = pat.keyPoints
                  .map((pt) => `${getX(pt.index)},${getY(pt.price)}`)
                  .join(' ');

                return (
                  <g
                    key={`chart-pattern-${pat.id}`}
                    className="cursor-pointer transition-opacity duration-200"
                    opacity={isSelected ? 1 : hoveredPatternId ? 0.3 : 0.7}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPatternId((prev) => (prev === pat.id ? null : pat.id));
                    }}
                    onMouseEnter={() => setHoveredPatternId(pat.id)}
                    onMouseLeave={() => setHoveredPatternId(null)}
                  >
                    {/* Semi-transparent pattern geometry fill */}
                    {pat.keyPoints.length >= 3 && (
                      <polygon
                        points={polygonPoints}
                        fill={fillBg}
                        stroke={mainColor}
                        strokeWidth={isSelected ? 1.5 : 1}
                        strokeDasharray={pat.status === 'FORMING' ? '4 3' : undefined}
                        opacity={isSelected ? 0.95 : 0.4}
                      />
                    )}

                    {/* Pattern Boundary Lines (Resistance, Support, Neckline, Target) */}
                    {pat.boundaryLines.map((line, lIdx) => {
                      const x1 = getX(line.startIndex);
                      const y1 = getY(line.startPrice);
                      const x2 = getX(line.endIndex);
                      const y2 = getY(line.endPrice);
                      const isNeckline = line.type === 'neckline';
                      const isTarget = line.type === 'target';
                      const isResistance = line.type === 'resistance';
                      const lineColor = isNeckline
                        ? '#f59e0b'
                        : isTarget
                        ? isBull ? '#34d399' : '#fb7185'
                        : isResistance
                        ? '#f43f5e'
                        : '#10b981';

                      return (
                        <g key={`pat-line-${pat.id}-${lIdx}`}>
                          <line
                            x1={x1}
                            y1={y1}
                            x2={x2}
                            y2={y2}
                            stroke={lineColor}
                            strokeWidth={isSelected ? 2.2 : 1.5}
                            strokeDasharray={isNeckline ? '5 3' : isTarget ? '3 3' : undefined}
                            opacity={isSelected ? 1 : 0.75}
                          />
                          {/* Line Label if selected */}
                          {isSelected && line.label && (
                            <text
                              x={Math.max(x1 + 10, Math.min(x2 - 10, (x1 + x2) / 2))}
                              y={Math.min(priceChartBottom - 8, Math.max(paddingTop + 14, (y1 + y2) / 2 - 5))}
                              fill={lineColor}
                              fontSize="9.5"
                              fontWeight="bold"
                              fontFamily="monospace"
                              textAnchor="middle"
                            >
                              {line.label}
                            </text>
                          )}
                        </g>
                      );
                    })}

                    {/* Key Pivot Nodes with pin labels */}
                    {pat.keyPoints.map((pt, ptIdx) => {
                      const px = getX(pt.index);
                      const py = getY(pt.price);
                      const ptLabel = pt.label || `P${ptIdx + 1}`;

                      return (
                        <g key={`pat-pt-${pat.id}-${ptIdx}`}>
                          {/* Pulsing ring for selected pattern */}
                          {isSelected && (
                            <circle
                              cx={px}
                              cy={py}
                              r="7.5"
                              fill="none"
                              stroke={mainColor}
                              strokeWidth="1.5"
                              opacity="0.6"
                            />
                          )}
                          <circle
                            cx={px}
                            cy={py}
                            r={isSelected ? 4 : 3}
                            fill={mainColor}
                            stroke="#0f172a"
                            strokeWidth="1.5"
                          />
                          {/* Point Label Tag when selected */}
                          {isSelected && (
                            <g pointerEvents="none">
                              <rect
                                x={px - (ptLabel.length * 3.2 + 7)}
                                y={py > priceChartBottom - 35 ? py - 20 : py + 7}
                                width={ptLabel.length * 6.4 + 14}
                                height="15"
                                rx="3"
                                fill="#090d16"
                                stroke={mainColor}
                                strokeWidth="1"
                                opacity="0.95"
                              />
                              <text
                                x={px}
                                y={py > priceChartBottom - 35 ? py - 9 : py + 18}
                                fill="#f8fafc"
                                fontSize="8.5"
                                fontWeight="bold"
                                fontFamily="monospace"
                                textAnchor="middle"
                              >
                                {ptLabel}
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    })}

                    {/* Target Price Projection Badge when selected */}
                    {isSelected && pat.targetPrice && (
                      <g pointerEvents="none">
                        <line
                          x1={getX(pat.endIndex)}
                          y1={getY(pat.targetPrice)}
                          x2={containerWidth - paddingRight}
                          y2={getY(pat.targetPrice)}
                          stroke={isBull ? '#10b981' : '#f43f5e'}
                          strokeWidth="1.5"
                          strokeDasharray="4 3"
                          opacity="0.8"
                        />
                        <rect
                          x={containerWidth - paddingRight - 88}
                          y={getY(pat.targetPrice) - 9}
                          width="84"
                          height="18"
                          rx="4"
                          fill={isBull ? '#064e3b' : '#881337'}
                          stroke={isBull ? '#34d399' : '#fb7185'}
                          strokeWidth="1"
                        />
                        <text
                          x={containerWidth - paddingRight - 46}
                          y={getY(pat.targetPrice) + 3.5}
                          fill="#ffffff"
                          fontSize="9.5"
                          fontWeight="bold"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          Target ${pat.targetPrice.toFixed(2)}
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* Overlays: SMAs & EMAs */}
          {showSMA20 && sma20Series.length > 0 && (
            <polyline
              fill="none"
              stroke="#3b82f6"
              strokeWidth="1.5"
              points={createPolylinePoints(sma20Series)}
            />
          )}

          {showSMA50 && sma50Series.length > 0 && (
            <polyline
              fill="none"
              stroke="#fbbf24"
              strokeWidth="1.8"
              points={createPolylinePoints(sma50Series)}
            />
          )}

          {showSMA200 && sma200Series.length > 0 && (
            <polyline
              fill="none"
              stroke="#c084fc"
              strokeWidth="2"
              points={createPolylinePoints(sma200Series)}
            />
          )}

          {showEMA9 && ema9Series.length > 0 && (
            <polyline
              fill="none"
              stroke="#f472b6"
              strokeWidth="1.5"
              points={createPolylinePoints(ema9Series)}
            />
          )}

          {showEMA21 && ema21Series.length > 0 && (
            <polyline
              fill="none"
              stroke="#818cf8"
              strokeWidth="1.5"
              points={createPolylinePoints(ema21Series)}
            />
          )}

          {showVWAP && vwapSeries.length > 0 && (
            <polyline
              fill="none"
              stroke="#2dd4bf"
              strokeWidth="1.5"
              strokeDasharray="3 2"
              points={createPolylinePoints(vwapSeries)}
            />
          )}

          {/* Critical Moving Average Crosses (Golden Cross, Death Cross, EMA 9/21, SMA 20/50) */}
          {(showSMA20 || showSMA50 || showSMA200 || showEMA9 || showEMA21) && maCrosses.length > 0 && (
            <g id="critical-ma-crosses-layer">
              {maCrosses
                .filter((cross) => cross.index >= visibleStartIndex && cross.index < visibleEndIndex)
                .map((cross, cIdx) => {
                  const cx = getX(cross.index);
                  const cy = getY(cross.price);
                  const isBull = cross.sentiment === 'BULLISH';
                  const crossColor =
                    cross.type === 'GOLDEN_CROSS'
                      ? '#fbbf24'
                      : cross.type === 'DEATH_CROSS'
                      ? '#ef4444'
                      : isBull
                      ? '#10b981'
                      : '#f43f5e';
                  const badgeBg =
                    cross.type === 'GOLDEN_CROSS'
                      ? '#78350f'
                      : cross.type === 'DEATH_CROSS'
                      ? '#7f1d1d'
                      : isBull
                      ? '#064e3b'
                      : '#881337';
                  const badgeText =
                    cross.type === 'GOLDEN_CROSS'
                      ? '★ GOLDEN'
                      : cross.type === 'DEATH_CROSS'
                      ? '⚠️ DEATH'
                      : isBull
                      ? '▲ BULL X'
                      : '▼ BEAR X';
                  const tagY = cy > priceChartBottom - 45 ? cy - 24 : cy + 8;

                  return (
                    <g
                      key={`ma-cross-${cIdx}-${cross.index}`}
                      className="cursor-pointer"
                      onClick={() => setSelectedCrossEvent(cross)}
                    >
                      {/* Pulse halo ring */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r="8"
                        fill={crossColor}
                        opacity="0.25"
                        className="animate-ping"
                      />
                      {/* Anchor pin */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r="4.5"
                        fill={crossColor}
                        stroke="#090d16"
                        strokeWidth="1.5"
                      />
                      {/* Label Tag */}
                      <g transform={`translate(${cx - 36}, ${tagY})`}>
                        <rect
                          width="72"
                          height="16"
                          fill={badgeBg}
                          stroke={crossColor}
                          strokeWidth="1"
                          rx="3"
                          opacity="0.95"
                          filter="drop-shadow(0 2px 4px rgba(0,0,0,0.6))"
                        />
                        <text
                          x="36"
                          y="11.5"
                          fill="#ffffff"
                          fontSize="8.5"
                          fontWeight="bold"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {badgeText}
                        </text>
                      </g>
                    </g>
                  );
                })}
            </g>
          )}

          {/* ------------------------------------------------------------- */}
          {/* VOLUME INDICATOR / SEPARATE SUB-PANEL CHART SECTION           */}
          {/* ------------------------------------------------------------- */}
          {showVolume && (
            <g id="volume-visualization-layer">
              {/* If Separate Sub-Panel Mode: Render Pane Divider, Header, and Axis */}
              {isSeparateVolume && (
                <g id="volume-pane-structural-elements">
                  {/* Subtle Pane Divider */}
                  <line
                    x1={paddingLeft}
                    y1={volumeTop - 12}
                    x2={containerWidth - paddingRight}
                    y2={volumeTop - 12}
                    stroke="#334155"
                    strokeWidth="1"
                  />

                  {/* Volume Sub-Panel Header Legend */}
                  <g transform={`translate(${paddingLeft + 4}, ${volumeTop - 2})`}>
                    <text fill="#64748b" fontSize="9" fontWeight="bold" fontFamily="monospace">
                      VOL
                    </text>
                    <text x="32" fill={activeIsBull ? '#34d399' : '#f87171'} fontSize="9" fontWeight="bold" fontFamily="monospace">
                      {formatVolume(activeCandle ? activeCandle.volume : maxVolume)}
                    </text>
                    {showVolMA && activeVolMA && !isNaN(activeVolMA) && (
                      <g transform="translate(95, 0)">
                        <line x1="0" y1="-3" x2="10" y2="-3" stroke="#fbbf24" strokeWidth="1.5" />
                        <text x="14" fill="#fbbf24" fontSize="9" fontFamily="monospace">
                          MA(20): {formatVolume(activeVolMA)}
                        </text>
                      </g>
                    )}
                  </g>

                  {/* Volume Upper Grid Line (70% level) */}
                  <line
                    x1={paddingLeft}
                    y1={getVolumeY(volumeCeiling * 0.7)}
                    x2={containerWidth - paddingRight}
                    y2={getVolumeY(volumeCeiling * 0.7)}
                    stroke="#1e293b"
                    strokeDasharray="2 3"
                    strokeWidth="1"
                  />
                  <text
                    x={containerWidth - paddingRight + 8}
                    y={getVolumeY(volumeCeiling * 0.7) + 3}
                    fill="#475569"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {formatVolume(volumeCeiling * 0.7)}
                  </text>

                  {/* Volume Mid Grid Line (35% level) */}
                  <line
                    x1={paddingLeft}
                    y1={getVolumeY(volumeCeiling * 0.35)}
                    x2={containerWidth - paddingRight}
                    y2={getVolumeY(volumeCeiling * 0.35)}
                    stroke="#1e293b"
                    strokeDasharray="2 3"
                    strokeWidth="1"
                  />
                  <text
                    x={containerWidth - paddingRight + 8}
                    y={getVolumeY(volumeCeiling * 0.35) + 3}
                    fill="#475569"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {formatVolume(volumeCeiling * 0.35)}
                  </text>

                  {/* Volume Baseline */}
                  <line
                    x1={paddingLeft}
                    y1={volumeBottom}
                    x2={containerWidth - paddingRight}
                    y2={volumeBottom}
                    stroke="#1e293b"
                    strokeWidth="1"
                  />
                  <text
                    x={containerWidth - paddingRight + 8}
                    y={volumeBottom + 3}
                    fill="#475569"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    0
                  </text>
                </g>
              )}

              {/* Volume Bars */}
              <g id="volume-bars-collection">
                {visibleCandles.map((candle, localIdx) => {
                  const i = visibleStartIndex + localIdx;
                  const x = getX(i);
                  const isBullish = candle.close >= candle.open;
                  const barHeight = getVolumeBarHeight(candle.volume);
                  const barY = volumeBottom - barHeight;
                  const isHovered = hoverIndex === i;
                  const volMA = volumeMA20Series[i];
                  const isSurge = volMA && !isNaN(volMA) && candle.volume >= volMA * 1.5;

                  const baseColor = isBullish ? '#10b981' : '#f43f5e';
                  const opacity = isHovered
                    ? 1
                    : isOverlayVolume
                    ? 0.28
                    : isSurge
                    ? 0.95
                    : 0.65;

                  return (
                    <g key={`vol-${i}`}>
                      <rect
                        x={x - candleWidth / 2}
                        y={barY}
                        width={candleWidth}
                        height={barHeight}
                        fill={baseColor}
                        opacity={opacity}
                        rx="1"
                      />
                      {/* High Volume Surge Marker Accent */}
                      {isSurge && isSeparateVolume && (
                        <circle
                          cx={x}
                          cy={barY - 3}
                          r="1.5"
                          fill={isBullish ? '#34d399' : '#f87171'}
                        />
                      )}
                    </g>
                  );
                })}
              </g>

              {/* Volume 20-Period Moving Average Overlay Line */}
              {showVolMA && volumeMAPath && (
                <g id="volume-moving-average-line">
                  <polyline
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={volumeMAPath}
                  />
                </g>
              )}
            </g>
          )}

          {/* ------------------------------------------------------------- */}
          {/* USER CUSTOM SUPPORT & RESISTANCE TRENDLINES LAYER             */}
          {/* ------------------------------------------------------------- */}
          <g id="custom-trendlines-layer">
            {trendlines.map((line) => {
              const idx1 = getResolvedIndex(line.startIndex, line.startTime);
              const idx2 = getResolvedIndex(line.endIndex, line.endTime);
              const x1 = getX(idx1);
              const y1 = getY(line.startPrice);
              const x2 = getX(idx2);
              const y2 = getY(line.endPrice);

              const midX = (x1 + x2) / 2;
              const midY = (y1 + y2) / 2;
              const isHovered = hoveredTrendlineId === line.id || selectedTrendlineId === line.id;
              const pct = (((line.endPrice - line.startPrice) / line.startPrice) * 100).toFixed(1);

              return (
                <g
                  key={line.id}
                  onMouseEnter={() => setHoveredTrendlineId(line.id)}
                  onMouseLeave={() => setHoveredTrendlineId((prev) => (prev === line.id ? null : prev))}
                  onClick={() => setSelectedTrendlineId((prev) => (prev === line.id ? null : line.id))}
                  className="cursor-pointer"
                >
                  {/* Invisible wide line for effortless mouse/touch hit-testing */}
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="transparent"
                    strokeWidth="18"
                  />

                  {/* Dark backing contrast stroke */}
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#020617"
                    strokeWidth={isHovered ? 5.5 : 4}
                    strokeLinecap="round"
                  />

                  {/* Main Trendline Stroke */}
                  <line
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={line.color}
                    strokeWidth={isHovered ? 3 : 2.2}
                    strokeLinecap="round"
                  />

                  {/* Start Point 1 Anchor Marker */}
                  <circle
                    cx={x1}
                    cy={y1}
                    r={isHovered ? 5 : 3.5}
                    fill={line.color}
                    stroke="#0f172a"
                    strokeWidth="1.5"
                  />
                  {/* Start Point 1 Price Tag */}
                  <g transform={`translate(${x1 - 28}, ${y1 - 18})`}>
                    <rect width="56" height="15" fill="#0f172a" stroke={line.color} strokeWidth="0.8" rx="3" opacity="0.95" />
                    <text x="28" y="11" fill="#f8fafc" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                      ${line.startPrice.toFixed(2)}
                    </text>
                  </g>

                  {/* End Point 2 Anchor Marker */}
                  <circle
                    cx={x2}
                    cy={y2}
                    r={isHovered ? 5 : 3.5}
                    fill={line.color}
                    stroke="#0f172a"
                    strokeWidth="1.5"
                  />
                  {/* End Point 2 Price Tag */}
                  <g transform={`translate(${x2 - 28}, ${y2 - 18})`}>
                    <rect width="56" height="15" fill="#0f172a" stroke={line.color} strokeWidth="0.8" rx="3" opacity="0.95" />
                    <text x="28" y="11" fill="#f8fafc" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                      ${line.endPrice.toFixed(2)}
                    </text>
                  </g>

                  {/* Midpoint Pill Tag: Type + % Change */}
                  <g transform={`translate(${midX - 44}, ${midY - 9})`}>
                    <rect
                      width="88"
                      height="18"
                      fill="#020617"
                      stroke={line.color}
                      strokeWidth="1.2"
                      rx="4"
                    />
                    <text
                      x="44"
                      y="12"
                      fill={line.color}
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {line.type === 'support' ? 'SUP' : line.type === 'resistance' ? 'RES' : 'TL'}: {Number(pct) >= 0 ? `+${pct}%` : `${pct}%`}
                    </text>
                  </g>

                  {/* Delete Button on Hover / Selection */}
                  {isHovered && (
                    <g
                      transform={`translate(${midX + 48}, ${midY - 9})`}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleDeleteTrendline(line.id, e);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTrendline(line.id, e);
                      }}
                      className="cursor-pointer"
                      title="Delete trendline"
                    >
                      <rect width="18" height="18" fill="#ef4444" rx="3" />
                      <text x="9" y="13" fill="#ffffff" fontSize="11" fontWeight="bold" textAnchor="middle">
                        ✕
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Active Rubberband Preview Line while user is drawing */}
            {drawingState && (
              <g id="active-drawing-preview" pointerEvents="none">
                {/* Point 1 Anchor */}
                <circle
                  cx={drawingState.startX}
                  cy={drawingState.startY}
                  r="6"
                  fill={trendlineColor}
                  opacity="0.4"
                />
                <circle
                  cx={drawingState.startX}
                  cy={drawingState.startY}
                  r="3.5"
                  fill={trendlineColor}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
                <g transform={`translate(${drawingState.startX - 30}, ${drawingState.startY - 20})`}>
                  <rect width="60" height="16" fill="#020617" stroke={trendlineColor} strokeWidth="1" rx="3" />
                  <text x="30" y="11" fill="#f8fafc" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                    ${drawingState.startPrice.toFixed(2)}
                  </text>
                </g>

                {/* Connecting Rubberband Guide Line */}
                <line
                  x1={drawingState.startX}
                  y1={drawingState.startY}
                  x2={drawingState.currentX}
                  y2={drawingState.currentY}
                  stroke={trendlineColor}
                  strokeWidth="2.4"
                  strokeDasharray="5 3"
                />

                {/* Point 2 Cursor Anchor */}
                <circle
                  cx={drawingState.currentX}
                  cy={drawingState.currentY}
                  r="5"
                  fill={trendlineColor}
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
                <g transform={`translate(${drawingState.currentX + 8}, ${drawingState.currentY - 10})`}>
                  <rect width="70" height="18" fill="#020617" stroke={trendlineColor} strokeWidth="1" rx="3" />
                  <text x="35" y="12" fill="#f8fafc" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                    ${drawingState.currentPrice.toFixed(2)}
                  </text>
                </g>
              </g>
            )}
          </g>

          {/* Interactive Crosshairs & Dynamic Cursor Tracking */}
          {showCrosshair && hoverIndex !== null && activeCandle && (
            <g id="interactive-crosshairs" pointerEvents="none">
              {/* Vertical crosshair line spanning full chart and volume pane */}
              <line
                x1={getX(hoverIndex)}
                y1={paddingTop}
                x2={getX(hoverIndex)}
                y2={isSeparateVolume ? volumeBottom : priceChartBottom}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="3 3"
              />

              {/* Horizontal price crosshair line following user's cursor */}
              {cursorPos && (
                <line
                  x1={paddingLeft}
                  y1={Math.max(paddingTop, Math.min(isSeparateVolume ? volumeBottom : priceChartBottom, cursorPos.y))}
                  x2={containerWidth - paddingRight}
                  y2={Math.max(paddingTop, Math.min(isSeparateVolume ? volumeBottom : priceChartBottom, cursorPos.y))}
                  stroke="#64748b"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
              )}

              {/* Horizontal candle close guide line if cursor is at different level */}
              {cursorPos && Math.abs(cursorPos.y - getY(activeCandle.close)) > 12 && (
                <line
                  x1={paddingLeft}
                  y1={getY(activeCandle.close)}
                  x2={containerWidth - paddingRight}
                  y2={getY(activeCandle.close)}
                  stroke="#3b82f6"
                  strokeWidth="0.8"
                  strokeDasharray="2 4"
                  opacity={0.4}
                />
              )}

              {/* Right Axis Cursor Price Tag */}
              {cursorPos && cursorPos.y <= priceChartBottom && cursorPos.y >= paddingTop && (
                <g transform={`translate(${containerWidth - paddingRight}, ${Math.max(paddingTop, Math.min(priceChartBottom - 18, cursorPos.y - 10))})`}>
                  <rect width="66" height="20" fill="#2563eb" rx="3" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))" />
                  <text x="33" y="14" fill="#ffffff" fontSize="10" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                    ${getPriceFromY(cursorPos.y).toFixed(2)}
                  </text>
                </g>
              )}

              {/* Right Axis Candle Close Price Tag */}
              <g transform={`translate(${containerWidth - paddingRight}, ${Math.max(paddingTop, Math.min(priceChartBottom - 18, getY(activeCandle.close) - 10))})`}>
                <rect
                  width="66"
                  height="20"
                  fill={activeIsBull ? '#065f46' : '#881337'}
                  stroke={activeIsBull ? '#10b981' : '#f43f5e'}
                  strokeWidth="1"
                  rx="3"
                />
                <text x="33" y="14" fill="#ffffff" fontSize="10" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  ${activeCandle.close.toFixed(2)}
                </text>
              </g>

              {/* Right Axis Volume Tag (when separate volume sub-panel is enabled) */}
              {isSeparateVolume && (
                <g transform={`translate(${containerWidth - paddingRight}, ${Math.max(volumeTop, getVolumeY(activeCandle.volume) - 9)})`}>
                  <rect
                    width="66"
                    height="18"
                    fill="#0f172a"
                    stroke={activeIsBull ? '#10b981' : '#f43f5e'}
                    strokeWidth="1.2"
                    rx="3"
                  />
                  <text
                    x="33"
                    y="13"
                    fill={activeIsBull ? '#34d399' : '#f87171'}
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {formatVolume(activeCandle.volume)}
                  </text>
                </g>
              )}

              {/* Bottom Date Axis Tag for hovered candle */}
              <g transform={`translate(${Math.max(paddingLeft, Math.min(containerWidth - paddingRight - 84, getX(hoverIndex) - 42))}, ${isSeparateVolume ? volumeBottom + 4 : priceChartBottom + 4})`}>
                <rect width="84" height="18" fill="#0f172a" stroke="#3b82f6" strokeWidth="1" rx="3" />
                <text x="42" y="13" fill="#60a5fa" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
                  {activeCandle.time.length > 10 ? activeCandle.time.slice(5) : activeCandle.time}
                </text>
              </g>

              {/* Crosshair intersection dot on the candle close price */}
              <circle
                cx={getX(hoverIndex)}
                cy={getY(activeCandle.close)}
                r="4"
                fill={activeIsBull ? '#10b981' : '#f43f5e'}
                stroke="#020617"
                strokeWidth="1.5"
              />

              {/* Active cursor intersection point */}
              {cursorPos && (
                <circle
                  cx={getX(hoverIndex)}
                  cy={Math.max(paddingTop, Math.min(isSeparateVolume ? volumeBottom : priceChartBottom, cursorPos.y))}
                  r="3.5"
                  fill="#ffffff"
                  stroke="#3b82f6"
                  strokeWidth="1.5"
                />
              )}
            </g>
          )}

          {/* Date Axis labels (evenly spaced dates/times for visible range) */}
          {visibleCandles.length > 2 && (
            <g id="date-axis-labels">
              {(() => {
                const tickCount = isMobilePortrait ? 3 : isMobileLandscapeOrTablet ? 5 : 6;
                const indices: number[] = [];
                const step = (visibleCandles.length - 1) / (tickCount - 1);
                for (let k = 0; k < tickCount; k++) {
                  const local = Math.min(visibleCandles.length - 1, Math.round(k * step));
                  const globalIdx = visibleStartIndex + local;
                  if (!indices.includes(globalIdx)) indices.push(globalIdx);
                }
                return indices.map((idx) => {
                  const candleItem = candles[idx];
                  if (!candleItem) return null;
                  const rawTime = candleItem.time;
                  let formattedTime = rawTime;
                  if (rawTime.length <= 5) {
                    formattedTime = rawTime;
                  } else if (rawTime.includes(' ')) {
                    formattedTime = rawTime.split(' ')[1] || rawTime;
                  } else if (rawTime.length >= 10) {
                    formattedTime = rawTime.slice(5);
                  }
                  return (
                    <text
                      key={`date-lbl-${idx}`}
                      x={getX(idx)}
                      y={isSeparateVolume ? volumeBottom + 18 : height - 8}
                      fill="#475569"
                      fontSize="10"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {formattedTime}
                    </text>
                  );
                });
              })()}
            </g>
          )}
        </svg>

        {/* Floating OHLC Tooltip that follows the user's cursor */}
        {showCrosshair && hoverIndex !== null && activeCandle && cursorPos && (
          <div
            id="stock-chart-floating-tooltip"
            style={{
              left: `${
                cursorPos.x + 240 + 24 > containerWidth - paddingRight
                  ? Math.max(12, cursorPos.x - 240 - 18)
                  : cursorPos.x + 20
              }px`,
              top: `${Math.max(
                12,
                Math.min(height - 240, cursorPos.y - 40)
              )}px`,
            }}
            className="absolute pointer-events-none z-30 w-60 rounded-xl bg-slate-950/95 border border-slate-700/90 shadow-2xl backdrop-blur-md p-3.5 text-xs text-slate-200 select-none transition-all duration-75 ease-out"
          >
            {/* Header: Symbol, Timeframe, Exact Date */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-1.5 font-mono">
                <span className="font-bold text-white tracking-wide">{symbol}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 font-semibold border border-blue-800/60">
                  {isDayTradeView ? selectedInterval : selectedSwingInterval === '1d' ? '1D' : selectedSwingInterval === '1wk' ? '1W' : '1M'}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-mono text-slate-300">
                <Calendar className="w-3 h-3 text-blue-400 shrink-0" />
                <span className="font-medium">{activeCandle.time}</span>
              </div>
            </div>

            {/* Price Change & Direction Badge */}
            {(() => {
              const change = activeCandle.close - activeCandle.open;
              const changePct = (change / activeCandle.open) * 100;
              const isBull = change >= 0;
              return (
                <div className="flex items-center justify-between my-2 px-2 py-1 rounded bg-slate-900/90 border border-slate-800/80 font-mono text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${isBull ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                    {isBull ? 'Bullish' : 'Bearish'}
                  </span>
                  <span className={`font-bold ${isBull ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isBull ? '+' : ''}${change.toFixed(2)} ({isBull ? '+' : ''}{changePct.toFixed(2)}%)
                  </span>
                </div>
              );
            })()}

            {/* Exact OHLC Grid */}
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 font-mono text-[11px]">
              <div className="flex items-center justify-between border-b border-slate-800/50 pb-0.5">
                <span className="text-slate-400">Open:</span>
                <span className="text-slate-100 font-semibold">${activeCandle.open.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800/50 pb-0.5">
                <span className="text-slate-400">High:</span>
                <span className="text-emerald-400 font-bold">${activeCandle.high.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800/50 pb-0.5">
                <span className="text-slate-400">Low:</span>
                <span className="text-rose-400 font-bold">${activeCandle.low.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-slate-800/50 pb-0.5">
                <span className="text-slate-400">Close:</span>
                <span className="text-white font-bold">${activeCandle.close.toFixed(2)}</span>
              </div>
            </div>

            {/* Secondary Stats: Volume & Candle Range */}
            <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between font-mono text-[10px] text-slate-400">
              <span>
                Range: <b className="text-slate-200">${(activeCandle.high - activeCandle.low).toFixed(2)}</b>
              </span>
              <span>
                Vol: <b className={activeIsBull ? 'text-emerald-400' : 'text-rose-400'}>{formatVolume(activeCandle.volume)}</b>
              </span>
            </div>

            {/* Candlestick Pattern Signal on this candle (if detected) */}
            {(() => {
              const candleSignal = detectedSignals.find((s) => s.index === hoverIndex);
              if (!candleSignal) return null;
              const isBull = candleSignal.sentiment === 'BULLISH';
              return (
                <div
                  className={`mt-2 pt-1.5 border-t border-slate-800 flex items-center justify-between text-[10px] font-medium font-mono ${
                    isBull ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>{candleSignal.label}</span>
                  </span>
                  <span className="text-slate-400 text-[9px]">{candleSignal.sentiment}</span>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Sub-Panel Indicators (Requirement #12: Volume, RSI, MACD, Stochastic, MFI - Max 3 panels) */}
      {activeSubPanels.length > 0 && (
        <div className="mt-3">
          <SubPanelIndicators
            candles={candles}
            visibleStartIndex={visibleStartIndex}
            visibleEndIndex={visibleEndIndex}
            chartAreaWidth={chartAreaWidth}
            paddingLeft={paddingLeft}
            paddingRight={paddingRight}
            activePanels={activeSubPanels}
            onTogglePanel={handleToggleSubPanel}
            volumeMaPeriod={volumeMaPeriod}
            onChangeVolumeMaPeriod={setVolumeMaPeriod}
            hoverIndex={hoverIndex}
          />
        </div>
      )}

      {/* AI Next Candle Prediction Breakdown & Thesis Conditions Card */}
      {showAiPredictionCard && (
        <AICandlePredictionCard
          prediction={aiPrediction}
          isLoading={isLoadingAiPrediction}
          onRefresh={handleFetchAICandlePrediction}
          showGhostCandle={showAiGhostCandle}
          onToggleGhostCandle={() => setShowAiGhostCandle(!showAiGhostCandle)}
        />
      )}

      {/* AI Indicator Advisor & Strategy Matrix Modal */}
      <AIIndicatorModal
        isOpen={isAIAdvisorModalOpen}
        onClose={() => setIsAIAdvisorModalOpen(false)}
        activeRecommendation={activeAIRecommendation}
        isDayTradeView={isDayTradeView}
        selectedInterval={selectedInterval}
        selectedSwingInterval={selectedSwingInterval}
        onApplyPreset={handleApplyAIPreset}
        onSelectInterval={onSelectInterval}
        onSelectSwingInterval={onSelectSwingInterval}
        symbol={symbol}
      />

      {/* Support & Resistance Level Rationale Modal (Requirement #2) */}
      <SrRationaleModal
        level={activeSrRationaleLevel}
        onClose={() => setActiveSrRationaleLevel(null)}
        currentPrice={currentPrice}
      />

      {/* Market Microstructure, Joe Granville Axiom, & Institutional Footprint Modal (Requirement #13) */}
      <MarketMicrostructureModal
        isOpen={isMicrostructureModalOpen}
        onClose={() => setIsMicrostructureModalOpen(false)}
        quote={effectiveQuote}
        microstructure={microstructureAnalysis}
        footprint={institutionalFootprint}
        optionStrategies={aiOptionStrategies}
        srLevels={detailedSrLevels}
      />

      {/* Strategy Framework & Confluence Matrix Modal (Requirement #13) */}
      <StrategyMatrixModal
        isOpen={isStrategyMatrixModalOpen}
        onClose={() => setIsStrategyMatrixModalOpen(false)}
        symbol={symbol}
        currentPrice={currentPrice}
        indicators={effectiveIndicators}
        frameworks={strategyFrameworkResults}
        srLevels={detailedSrLevels}
      />

      {/* Moving Average Slope Rationale Dialog (Requirement #4) */}
      {selectedSlopeInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-md w-full shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-white text-sm">{selectedSlopeInfo.indicator} Slope Analysis</span>
              </div>
              <button
                onClick={() => setSelectedSlopeInfo(null)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-4 space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Slope Gradient:</span>
                <span className="font-bold text-white text-sm">
                  {selectedSlopeInfo.degrees > 0 ? '+' : ''}{selectedSlopeInfo.degrees.toFixed(1)}° ({selectedSlopeInfo.label})
                </span>
              </div>
              <div className="p-3 rounded bg-slate-800/60 border border-slate-700/80">
                <span className="text-slate-400 text-[10.5px] uppercase font-bold tracking-wider block mb-1">
                  Institutional Interpretation:
                </span>
                <p className="text-slate-200 text-xs leading-relaxed">{selectedSlopeInfo.interpretation}</p>
              </div>
              <div className="p-2.5 rounded bg-blue-950/40 border border-blue-500/30 text-[11px] text-blue-200">
                <span className="font-bold block mb-0.5">Velocity & Trajectory:</span>
                Rate of change is {selectedSlopeInfo.slopePerBar > 0 ? '+' : ''}${selectedSlopeInfo.slopePerBar.toFixed(3)} per bar.
                {Math.abs(selectedSlopeInfo.degrees) > 25
                  ? ' High velocity indicates aggressive institutional commitment and trend urgency.'
                  : Math.abs(selectedSlopeInfo.degrees) < 6
                  ? ' Flattening gradient signals potential momentum exhaustion, base building, or distribution.'
                  : ' Healthy sustainable trend gradient without immediate exhaustion.'}
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedSlopeInfo(null)}
                className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Critical MA Cross Event Dialog (Requirement #4) */}
      {selectedCrossEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-indigo-500/50 rounded-xl p-5 max-w-md w-full shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-white text-sm">{selectedCrossEvent.title}</span>
              </div>
              <button
                onClick={() => setSelectedCrossEvent(null)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-4 space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded bg-slate-950 border border-slate-800">
                <span className="text-slate-400">Execution Price / Date:</span>
                <span className="font-bold text-white">
                  ${selectedCrossEvent.price.toFixed(2)} • {selectedCrossEvent.date}
                </span>
              </div>
              <div className="p-3 rounded bg-slate-800/60 border border-slate-700/80">
                <span className="text-slate-400 text-[10.5px] uppercase font-bold tracking-wider block mb-1">
                  Tactical Significance:
                </span>
                <p className="text-slate-200 text-xs leading-relaxed">{selectedCrossEvent.significance}</p>
              </div>
              <div className={`p-2.5 rounded border text-[11px] font-bold ${
                selectedCrossEvent.sentiment === 'BULLISH'
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                  : 'bg-rose-950/40 text-rose-300 border-rose-500/40'
              }`}>
                Bias: {selectedCrossEvent.sentiment} • Priority: {selectedCrossEvent.priority.toUpperCase()}
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedCrossEvent(null)}
                className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

