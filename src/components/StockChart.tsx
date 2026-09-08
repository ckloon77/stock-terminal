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
  ChevronDown,
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
  BarChart2,
  Clock,
  SlidersHorizontal
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

  // Grouped Menu Dropdown States
  const [activeGroupMenu, setActiveGroupMenu] = useState<'trend' | 'levels' | 'volume' | null>(null);

  // Candlestick Signal Recognition State
  const [internalShowCandleSignals, setInternalShowCandleSignals] = useState(false);
  const showCandleSignals = propShowCandleSignals !== undefined ? propShowCandleSignals : internalShowCandleSignals;
  const toggleCandleSignals = useCallback(() => {
    if (propOnToggleCandleSignals) {
      propOnToggleCandleSignals();
    } else {
      setInternalShowCandleSignals((prev) => !prev);
    }
  }, [propOnToggleCandleSignals]);

  // Unified Pattern Confluence Set
  const [showChartPatterns, setShowChartPatterns] = useState<boolean>(false);
  const [patternDisplayMode, setPatternDisplayMode] = useState<'last' | 'all'>('last');
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);
  const [patternFilter, setPatternFilter] = useState<'ALL' | 'BULLISH' | 'BEARISH'>('ALL');
  const [hoveredPatternId, setHoveredPatternId] = useState<string | null>(null);

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

  const detectedSignals = useMemo(() => detectCandlestickSignals(candles), [candles]);
  const detectedChartPatterns = useMemo(() => detectChartPatterns(candles), [candles]);

  const filteredChartPatterns = useMemo(() => {
    if (patternFilter === 'ALL') return detectedChartPatterns;
    return detectedChartPatterns.filter((p) => p.sentiment === patternFilter);
  }, [detectedChartPatterns, patternFilter]);

  const visibleChartPatterns = useMemo(() => {
    if (patternDisplayMode === 'last') return filteredChartPatterns.slice(0, 1);
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

  const scopeSignals = useMemo(() => {
    if (patternDisplayMode === 'last' || signalScope === 'last') {
      if (lastCandleSignal) return [lastCandleSignal];
      if (latestDetectedSignal) return [latestDetectedSignal];
      return [];
    }
    return detectedSignals;
  }, [detectedSignals, patternDisplayMode, signalScope, lastCandleSignal, latestDetectedSignal]);

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
    if (signalScope === 'last' && lastCandleSignal) return lastCandleSignal;
    return null;
  }, [hoveredSignal, selectedSignalIndex, detectedSignals, signalScope, lastCandleSignal]);

  // Overlays
  const [showSMA20, setShowSMA20] = useState(false);
  const [showSMA50, setShowSMA50] = useState(false);
  const [showSMA200, setShowSMA200] = useState(false);
  const [showEMA9, setShowEMA9] = useState(false);
  const [showEMA21, setShowEMA21] = useState(false);
  const [showBollinger, setShowBollinger] = useState(false);
  const [showVWAP, setShowVWAP] = useState(false);
  const [showSR, setShowSR] = useState(true);

  const [srDisplayMode, setSrDisplayMode] = useState<'line' | 'band' | 'both'>('band');
  const [activeSrRationaleLevel, setActiveSrRationaleLevel] = useState<SupportResistanceLevel | null>(null);

  const [showFibonacci, setShowFibonacci] = useState(false);
  const [fibDirection, setFibDirection] = useState<'auto' | 'uptrend' | 'downtrend'>('auto');
  const [showFibZones, setShowFibZones] = useState(true);
  const [showFibAnchors, setShowFibAnchors] = useState(true);
  const [showFibExtensions, setShowFibExtensions] = useState(true);
  const [hoveredFibRatio, setHoveredFibRatio] = useState<number | null>(null);

  const [showVolume, setShowVolume] = useState(false);
  const [volumeMode, setVolumeMode] = useState<'separate' | 'overlay'>('separate');
  const [showVolMA, setShowVolMA] = useState(false);

  const [showVolumeProfile, setShowVolumeProfile] = useState(false);
  const [volumeProfileSide, setVolumeProfileSide] = useState<'right' | 'left'>('right');
  const [showPocLine, setShowPocLine] = useState(true);
  const [showVaBounds, setShowVaBounds] = useState(true);
  const [showHvnLvn, setShowHvnLvn] = useState(true);
  const [hoveredVpBin, setHoveredVpBin] = useState<number | null>(null);

  const [activeSubPanels, setActiveSubPanels] = useState<SubPanelIndicatorType[]>([]);
  const [volumeMaPeriod, setVolumeMaPeriod] = useState<number>(20);

  const handleToggleSubPanel = useCallback((panel: SubPanelIndicatorType) => {
    setActiveSubPanels((prev) => {
      if (prev.includes(panel)) return prev.filter((p) => p !== panel);
      if (prev.length >= 3) return [...prev.slice(1), panel];
      return [...prev, panel];
    });
  }, []);

  const [isMicrostructureModalOpen, setIsMicrostructureModalOpen] = useState(false);
  const [isStrategyMatrixModalOpen, setIsStrategyMatrixModalOpen] = useState(false);
  const [selectedSlopeInfo, setSelectedSlopeInfo] = useState<MovingAverageSlope | null>(null);
  const [selectedCrossEvent, setSelectedCrossEvent] = useState<MACriticalCross | null>(null);
  const [isAIAdvisorModalOpen, setIsAIAdvisorModalOpen] = useState(false);
  const [aiAdvisorToast, setAiAdvisorToast] = useState<string | null>(null);
  const [activeHierarchyTier, setActiveHierarchyTier] = useState<IndicatorHierarchyTierId | 'confluence_all'>('tier1');

  const activeAIRecommendation: IndicatorRecommendation = useMemo(() => {
    return getAIIndicatorRecommendation(
      isDayTradeView,
      isDayTradeView ? selectedInterval : selectedSwingInterval,
      candles,
      quote
    );
  }, [isDayTradeView, selectedInterval, selectedSwingInterval, candles, quote]);

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
      setTimeout(() => setAiAdvisorToast(null), 4500);
    },
    [showCandleSignals, toggleCandleSignals]
  );

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
    if (showCandleSignals) toggleCandleSignals();
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
      if (s.showCandleSignals !== showCandleSignals) toggleCandleSignals();
      setShowChartPatterns(s.showChartPatterns);
    } else {
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

  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [trendlineType, setTrendlineType] = useState<'support' | 'resistance' | 'neutral'>('support');
  const [drawingState, setDrawingState] = useState<DrawingState | null>(null);
  const [hoveredTrendlineId, setHoveredTrendlineId] = useState<string | null>(null);
  const [selectedTrendlineId, setSelectedTrendlineId] = useState<string | null>(null);

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
      // Gracefully silent
    } finally {
      setIsLoadingAiPrediction(false);
    }
  }, [symbol, candles, isDayTradeView, selectedInterval, selectedSwingInterval, indicators, quote]);

  useEffect(() => {
    if (showAiGhostCandle || showAiPredictionCard) {
      handleFetchAICandlePrediction();
    }
  }, [symbol, isDayTradeView ? selectedInterval : selectedSwingInterval, showAiGhostCandle, showAiPredictionCard, handleFetchAICandlePrediction]);

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

  const handleToggleAiForecast = useCallback(() => {
    const nextVal = !showAiGhostCandle;
    if (nextVal) {
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
      if (showCandleSignals) toggleCandleSignals();
      setShowVolume(true);
      setShowAiGhostCandle(true);
      if (!aiPrediction) handleFetchAICandlePrediction();
    } else {
      setShowAiGhostCandle(false);
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
        if (s.showCandleSignals !== showCandleSignals) toggleCandleSignals();
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (drawingState) setDrawingState(null);
        else if (isDrawingMode) setIsDrawingMode(false);
        setActiveGroupMenu(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawingState, isDrawingMode]);

  const trendlineColor = useMemo(() => {
    if (trendlineType === 'support') return '#10b981';
    if (trendlineType === 'resistance') return '#f43f5e';
    return '#38bdf8';
  }, [trendlineType]);

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

  const sma20Series = useMemo(() => calculateSMA(closes, 20), [closes]);
  const sma50Series = useMemo(() => calculateSMA(closes, 50), [closes]);
  const sma200Series = useMemo(() => calculateSMA(closes, Math.min(200, closes.length)), [closes]);
  const ema9Series = useMemo(() => calculateEMA(closes, 9), [closes]);
  const ema21Series = useMemo(() => calculateEMA(closes, 21), [closes]);
  const bbSeries = useMemo(() => calculateBollingerBands(closes, 20), [closes]);
  const vwapSeries = useMemo(() => calculateVWAP(candles), [candles]);

  const detailedSrLevels: SupportResistanceLevel[] = useMemo(() => findDetailedSupportResistanceLevels(candles), [candles]);
  const maSlopes = useMemo(() => calculateMASlopes(candles), [candles]);
  const maCrosses = useMemo(() => findCriticalMACrosses(candles), [candles]);

  const bbInterpretation = useMemo(() => {
    const lastClose = candles[candles.length - 1]?.close;
    return interpretBollingerBands(closes, lastClose);
  }, [closes, candles]);

  const volumeMA20Series = useMemo(() => calculateSMA(volumes, 20), [volumes]);

  const volumeProfile = useMemo(() => {
    if (indicators?.volumeProfile) return indicators.volumeProfile;
    return calculateVolumeProfile(candles);
  }, [indicators?.volumeProfile, candles]);

  const fibRetracement = useMemo(() => {
    if (!candles || candles.length < 2) return null;
    const currentClose = candles[candles.length - 1]?.close;
    return calculateFibonacciRetracement(candles, currentClose, fibDirection);
  }, [candles, fibDirection]);

  const microstructureAnalysis = useMemo(() => analyzeQuantityPriceRelation(candles), [candles]);
  const institutionalFootprint = useMemo(() => analyzeInstitutionalFootprint(candles), [candles]);

  const currentPrice = useMemo(() => quote?.price ?? (candles.length > 0 ? candles[candles.length - 1].close : 0), [quote?.price, candles]);

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

  const strategyFrameworkResults = useMemo(() => evaluateAllStrategyFrameworks(candles, indicators), [candles, indicators]);

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

  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<number>(0);
  const [showAllCandlesMode, setShowAllCandlesMode] = useState<boolean>(false);

  useEffect(() => {
    setPanOffset(0);
  }, [symbol, selectedInterval, selectedSwingInterval, isDayTradeView]);

  const isMobilePortrait = containerWidth < 500;
  const isMobileLandscapeOrTablet = containerWidth >= 500 && containerWidth < 850;

  const defaultTargetCandles = useMemo(() => {
    if (isMobilePortrait) return 28;
    if (isMobileLandscapeOrTablet) return 46;
    if (containerWidth < 1200) return 70;
    return 88;
  }, [isMobilePortrait, isMobileLandscapeOrTablet, containerWidth]);

  const effectiveCandleCount = useMemo(() => {
    if (showAllCandlesMode || candles.length <= 14) return Math.max(1, candles.length);
    const target = Math.round(defaultTargetCandles / zoomLevel);
    return Math.max(12, Math.min(candles.length, target));
  }, [showAllCandlesMode, candles.length, defaultTargetCandles, zoomLevel]);

  const maxPanOffset = useMemo(() => Math.max(0, candles.length - effectiveCandleCount), [candles.length, effectiveCandleCount]);
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

  const rightBufferCandles = useMemo(() => {
    if (clampedPanOffset > 0 || showAllCandlesMode || candles.length === 0) return 2;
    if (isMobilePortrait) return Math.max(4, Math.min(8, Math.ceil(effectiveCandleCount * 0.12)));
    return Math.max(6, Math.min(18, Math.ceil(effectiveCandleCount * 0.16)));
  }, [clampedPanOffset, showAllCandlesMode, candles.length, isMobilePortrait, effectiveCandleCount]);

  const totalSlots = Math.max(1, effectiveCandleCount + rightBufferCandles);

  const isSeparateVolume = showVolume && volumeMode === 'separate';
  const isOverlayVolume = showVolume && volumeMode === 'overlay';

  const height = isSeparateVolume ? 570 : isOverlayVolume ? 490 : 460;
  const paddingLeft = 10;
  const paddingRight = isMobilePortrait ? 60 : 72;
  const paddingTop = 22;

  const chartAreaWidth = Math.max(100, containerWidth - paddingLeft - paddingRight);
  const priceChartHeight = isSeparateVolume ? 360 : isOverlayVolume ? 400 : 390;
  const priceChartBottom = paddingTop + priceChartHeight;

  const volumeChartHeight = isSeparateVolume ? 100 : 75;
  const volumeTop = isSeparateVolume ? priceChartBottom + 28 : priceChartBottom - volumeChartHeight;
  const volumeBottom = volumeTop + volumeChartHeight;

  const candleWidth = useMemo(() => {
    if (candles.length === 0) return 6;
    const calculated = (chartAreaWidth / totalSlots) * 0.72;
    return Math.max(5.5, Math.min(22, calculated));
  }, [candles.length, chartAreaWidth, totalSlots]);

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

  const formatVolume = (val: number): string => {
    if (isNaN(val) || val === 0) return '0';
    if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(2)}B`;
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
    if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
    return val.toFixed(0);
  };

  const getX = useCallback(
    (index: number) => {
      if (candles.length <= 1) return paddingLeft + chartAreaWidth / 2;
      const localIndex = index - visibleStartIndex;
      return paddingLeft + (localIndex / totalSlots) * chartAreaWidth;
    },
    [candles.length, chartAreaWidth, paddingLeft, visibleStartIndex, totalSlots]
  );

  const getY = (price: number) => paddingTop + priceChartHeight - ((price - minPrice) / priceSpan) * priceChartHeight;

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

    if (rawY < paddingTop || rawY > paddingTop + priceChartHeight) return;
    if (rawX < paddingLeft || rawX > containerWidth - paddingRight) return;

    const idx = getIndexFromX(rawX);
    const price = getPriceFromY(rawY);
    const candleTime = candles[idx]?.time;

    if (!drawingState) {
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

  const handleUndoTrendline = () => setTrendlines((prev) => prev.slice(0, prev.length - 1));
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

  const createPolylinePoints = (series: number[]) => {
    return series
      .map((val, i) => {
        if (isNaN(val)) return null;
        return `${getX(i).toFixed(1)},${getY(val).toFixed(1)}`;
      })
      .filter(Boolean)
      .join(' ');
  };

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
    <div id="stock-chart-panel" ref={containerRef} className="w-full bg-slate-900 border-b border-slate-800 px-3 sm:px-6 py-3 sm:py-4 min-w-0">
      {/* AI Setup Notification Toast */}
      {aiAdvisorToast && (
        <div className="mb-2.5 px-3 py-1.5 rounded-lg bg-indigo-950/90 border border-indigo-500/50 text-indigo-200 text-xs font-mono flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-2 truncate">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="font-semibold truncate">{aiAdvisorToast}</span>
          </div>
          <button onClick={() => setAiAdvisorToast(null)} className="text-slate-400 hover:text-white p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TOP CONTROL RIBBON: Master Clean Chart, AI Hierarchy, Advanced Modals */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5 text-xs min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {/* Master Indicator Clean Toggle */}
          <button
            id="chart-turn-off-all-indicators-btn"
            onClick={activeIndicatorsCount > 0 ? handleTurnOffAllIndicators : handleRestoreIndicators}
            className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1.5 border cursor-pointer font-mono ${
              activeIndicatorsCount > 0
                ? 'bg-rose-950/40 text-rose-300 border-rose-800/60 hover:bg-rose-900/60 hover:text-white'
                : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/60 hover:bg-emerald-900/60 hover:text-white font-bold'
            }`}
          >
            {activeIndicatorsCount > 0 ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-rose-400" />
                <span>Clean Chart</span>
                <span className="px-1 py-0.2 rounded text-[9.5px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {activeIndicatorsCount}
                </span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>Restore Overlays</span>
              </>
            )}
          </button>

          {/* AI Auto-Suggest Button */}
          <button
            onClick={() =>
              handleApplyAIPreset(
                activeAIRecommendation.activeFlags,
                `${activeAIRecommendation.badge} (${activeAIRecommendation.title})`
              )
            }
            className="px-2 py-1 rounded text-xs font-semibold flex items-center gap-1.5 border cursor-pointer font-mono bg-gradient-to-r from-indigo-950/90 to-purple-950/80 text-indigo-200 border-indigo-500/50 hover:border-indigo-400 hover:text-white"
          >
            <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" />
            <span className="text-amber-300 font-bold">AI Suggest:</span>
            <span className="text-slate-200 font-semibold">{activeAIRecommendation.badge}</span>
          </button>

          {/* AI Forecast Toggle */}
          <button
            onClick={handleToggleAiForecast}
            className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1.5 border cursor-pointer font-mono ${
              showAiGhostCandle
                ? 'bg-indigo-950/90 text-indigo-200 border-indigo-500/80 hover:bg-indigo-900 hover:text-white shadow-indigo-500/20'
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${isLoadingAiPrediction ? 'animate-spin text-indigo-400' : showAiGhostCandle ? 'text-indigo-400' : 'text-slate-400'}`} />
            <span>{showAiGhostCandle ? 'Forecast: ON' : 'Forecast: OFF'}</span>
          </button>
        </div>

        {/* Tactical Modals */}
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            onClick={() => setIsMicrostructureModalOpen(true)}
            className="px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 border cursor-pointer font-mono bg-cyan-950/70 text-cyan-200 border-cyan-500/40 hover:bg-cyan-900/80 hover:text-white"
          >
            <Activity className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">Microstructure</span>
            <span className="sm:hidden">Tape</span>
          </button>

          <button
            onClick={() => setIsStrategyMatrixModalOpen(true)}
            className="px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 border cursor-pointer font-mono bg-indigo-950/70 text-indigo-200 border-indigo-500/40 hover:bg-indigo-900/80 hover:text-white"
          >
            <Scale className="w-3 h-3 text-amber-300" />
            <span className="hidden sm:inline">Strategy Matrix</span>
            <span className="sm:hidden">Matrix</span>
          </button>
        </div>
      </div>

      {/* CATEGORICAL INDICATOR MENUS (Logically Grouped & Fully Overflow-Proof) */}
      <div className="relative flex flex-wrap items-center gap-2 mb-2.5 text-xs bg-slate-950/80 p-2 rounded-lg border border-slate-800/80 min-w-0">
        <span className="text-[10.5px] font-mono text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
          <SlidersHorizontal className="w-3 h-3 text-blue-400" />
          Studies:
        </span>

        {/* Group 1: Trend & MAs Dropdown Menu */}
        <div className="relative">
          <button
            onClick={() => setActiveGroupMenu(activeGroupMenu === 'trend' ? null : 'trend')}
            className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 border transition-all cursor-pointer ${
              showSMA20 || showSMA50 || showSMA200 || showEMA9 || showEMA21 || showVWAP
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 font-bold'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <span>Trend & MAs</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {activeGroupMenu === 'trend' && (
            <div className="absolute left-0 top-full mt-1 w-52 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-2 z-40 grid grid-cols-2 gap-1.5">
              <button
                onClick={() => setShowSMA20(!showSMA20)}
                className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 border ${
                  showSMA20 ? 'bg-blue-600/30 text-blue-300 border-blue-500 font-bold' : 'text-slate-400 border-slate-800'
                }`}
              >
                <span className="w-2 h-0.5 bg-blue-400" /> SMA 20
              </button>
              <button
                onClick={() => setShowSMA50(!showSMA50)}
                className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 border ${
                  showSMA50 ? 'bg-amber-600/30 text-amber-300 border-amber-500 font-bold' : 'text-slate-400 border-slate-800'
                }`}
              >
                <span className="w-2 h-0.5 bg-amber-400" /> SMA 50
              </button>
              <button
                onClick={() => setShowSMA200(!showSMA200)}
                className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 border ${
                  showSMA200 ? 'bg-purple-600/30 text-purple-300 border-purple-500 font-bold' : 'text-slate-400 border-slate-800'
                }`}
              >
                <span className="w-2 h-0.5 bg-purple-400" /> SMA 200
              </button>
              <button
                onClick={() => setShowEMA9(!showEMA9)}
                className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 border ${
                  showEMA9 ? 'bg-pink-600/30 text-pink-300 border-pink-500 font-bold' : 'text-slate-400 border-slate-800'
                }`}
              >
                <span className="w-2 h-0.5 bg-pink-400" /> EMA 9
              </button>
              <button
                onClick={() => setShowEMA21(!showEMA21)}
                className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 border ${
                  showEMA21 ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500 font-bold' : 'text-slate-400 border-slate-800'
                }`}
              >
                <span className="w-2 h-0.5 bg-indigo-400" /> EMA 21
              </button>
              <button
                onClick={() => setShowVWAP(!showVWAP)}
                className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 border ${
                  showVWAP ? 'bg-teal-600/30 text-teal-300 border-teal-500 font-bold' : 'text-slate-400 border-slate-800'
                }`}
              >
                <span className="w-2 h-0.5 bg-teal-400" /> VWAP
              </button>
            </div>
          )}
        </div>

        {/* Group 2: Volatility & Levels Dropdown Menu */}
        <div className="relative">
          <button
            onClick={() => setActiveGroupMenu(activeGroupMenu === 'levels' ? null : 'levels')}
            className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 border transition-all cursor-pointer ${
              showBollinger || showSR || showFibonacci
                ? 'bg-amber-600/20 text-amber-300 border-amber-500/40 font-bold'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <span>Levels & Bands</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {activeGroupMenu === 'levels' && (
            <div className="absolute left-0 top-full mt-1 w-56 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-2 z-40 space-y-1.5">
              <button
                onClick={() => setShowSR(!showSR)}
                className={`w-full px-2.5 py-1.5 rounded text-xs font-mono flex items-center justify-between border ${
                  showSR ? 'bg-rose-600/30 text-rose-300 border-rose-500 font-bold' : 'text-slate-400 border-slate-800'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-0.5 bg-rose-400" /> Support / Resistance
                </span>
                <span className="text-[10px] text-slate-400 uppercase">{srDisplayMode}</span>
              </button>

              <button
                onClick={() => setShowBollinger(!showBollinger)}
                className={`w-full px-2.5 py-1.5 rounded text-xs font-mono flex items-center justify-between border ${
                  showBollinger ? 'bg-emerald-600/30 text-emerald-300 border-emerald-500 font-bold' : 'text-slate-400 border-slate-800'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-0.5 bg-emerald-400" /> Bollinger Bands (20,2)
                </span>
              </button>

              <button
                onClick={() => setShowFibonacci(!showFibonacci)}
                className={`w-full px-2.5 py-1.5 rounded text-xs font-mono flex items-center justify-between border ${
                  showFibonacci ? 'bg-amber-600/30 text-amber-300 border-amber-500 font-bold' : 'text-slate-400 border-slate-800'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-0.5 bg-amber-400" /> Fibonacci Retracement
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Group 3: Volume & Sub-Panels Dropdown Menu */}
        <div className="relative">
          <button
            onClick={() => setActiveGroupMenu(activeGroupMenu === 'volume' ? null : 'volume')}
            className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 border transition-all cursor-pointer ${
              showVolume || showVolumeProfile || activeSubPanels.length > 0
                ? 'bg-purple-600/20 text-purple-300 border-purple-500/40 font-bold'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <span>Volume & Oscillators</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>

          {activeGroupMenu === 'volume' && (
            <div className="absolute left-0 top-full mt-1 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-2.5 z-40 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono">Volume Bars:</span>
                <button
                  onClick={() => setShowVolume(!showVolume)}
                  className={`px-2 py-0.5 rounded text-[10.5px] font-mono border ${
                    showVolume ? 'bg-blue-600 text-white font-bold' : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {showVolume ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono">Volume Profile:</span>
                <button
                  onClick={() => setShowVolumeProfile(!showVolumeProfile)}
                  className={`px-2 py-0.5 rounded text-[10.5px] font-mono border ${
                    showVolumeProfile ? 'bg-amber-600 text-white font-bold' : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {showVolumeProfile ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="pt-1.5 border-t border-slate-800">
                <span className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Sub-Panels (Max 3):</span>
                <div className="flex flex-wrap gap-1">
                  {(['RSI', 'MACD', 'STOCHASTIC', 'MFI'] as SubPanelIndicatorType[]).map((panel) => {
                    const active = activeSubPanels.includes(panel);
                    return (
                      <button
                        key={panel}
                        onClick={() => handleToggleSubPanel(panel)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                          active ? 'bg-purple-600 text-white border-purple-500 font-bold' : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {panel}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pattern & Signal Fast Toggles */}
        <button
          onClick={toggleCandleSignals}
          className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 border transition-all cursor-pointer ${
            showCandleSignals
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600 font-bold'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
        >
          <Zap className="w-3 h-3 text-amber-400" />
          <span>Signals</span>
        </button>

        <button
          onClick={() => setShowChartPatterns(!showChartPatterns)}
          className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 border transition-all cursor-pointer ${
            showChartPatterns
              ? 'bg-cyan-950/60 text-cyan-300 border-cyan-600 font-bold'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
        >
          <Shapes className="w-3 h-3 text-cyan-400" />
          <span>Patterns</span>
        </button>

        <button
          onClick={() => setShowCrosshair(!showCrosshair)}
          className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 border ml-auto transition-all cursor-pointer ${
            showCrosshair
              ? 'bg-blue-600/30 text-blue-300 border-blue-500 font-bold'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
          }`}
        >
          <Crosshair className="w-3 h-3 text-blue-400" />
          <span>{showCrosshair ? 'Crosshair' : 'Crosshair Off'}</span>
        </button>
      </div>

      {/* ANCHORED VIEWPORT CONTROLS: Placed Directly Above the Date/OHLCV bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-3 py-2 bg-slate-950 rounded-lg border border-slate-800 mb-2 text-xs min-w-0">
        {/* View Mode Switcher Dropdown */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] font-mono text-slate-500 font-bold uppercase shrink-0">Mode:</span>
          <select
            value={isDayTradeView ? 'day' : 'swing'}
            onChange={(e) => onToggleDayTradeView?.(e.target.value === 'day')}
            className="bg-slate-900 text-white font-mono text-xs font-semibold px-2.5 py-1 rounded-md border border-slate-700 outline-none cursor-pointer"
          >
            <option value="swing">Swing Range View</option>
            <option value="day">Day Trade View (Intraday)</option>
          </select>
        </div>

        {/* Timeframe Dropdown for the Active Mode */}
        <div className="flex items-center gap-2 min-w-0 ml-auto">
          <span className="text-[10px] font-mono text-slate-500 font-bold uppercase shrink-0">Interval:</span>
          {isDayTradeView ? (
            <select
              value={selectedInterval}
              onChange={(e) => onSelectInterval?.(e.target.value as TimeframeInterval)}
              className="bg-amber-950/80 text-amber-300 font-mono text-xs font-bold px-2.5 py-1 rounded-md border border-amber-600/60 outline-none cursor-pointer"
            >
              {DAY_TRADE_INTERVALS.map((intv) => (
                <option key={intv.id} value={intv.id}>
                  {intv.label} ({intv.fullLabel})
                </option>
              ))}
            </select>
          ) : (
            <select
              value={selectedSwingInterval}
              onChange={(e) => onSelectSwingInterval?.(e.target.value as SwingCandleInterval)}
              className="bg-blue-950/80 text-blue-300 font-mono text-xs font-bold px-2.5 py-1 rounded-md border border-blue-600/60 outline-none cursor-pointer"
            >
              {SWING_CANDLE_INTERVALS.map((intv) => (
                <option key={intv.id} value={intv.id}>
                  {intv.badge} - {intv.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* OHLCV & Inspection Telemetry Strip */}
      {activeCandle && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 mb-2 rounded-lg bg-slate-950/90 border border-slate-800 text-xs font-mono min-w-0">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-slate-300 font-semibold">{activeCandle.time}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-slate-300">
            <span>O: <b className="text-white">${activeCandle.open.toFixed(2)}</b></span>
            <span>H: <b className="text-emerald-400">${activeCandle.high.toFixed(2)}</b></span>
            <span>L: <b className="text-rose-400">${activeCandle.low.toFixed(2)}</b></span>
            <span>C: <b className="text-white">${activeCandle.close.toFixed(2)}</b></span>
            <span>Vol: <b className={activeIsBull ? 'text-emerald-400' : 'text-rose-400'}>{formatVolume(activeCandle.volume)}</b></span>
          </div>
        </div>
      )}

      {/* SVG Canvas Area */}
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
          </defs>

          {/* Watermark */}
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
            {symbol} • {isDayTradeView ? `${selectedInterval} Intraday` : selectedSwingInterval === '1d' ? 'Daily (1D)' : selectedSwingInterval === '1wk' ? 'Weekly (1W)' : 'Monthly (1M)'} ({candles.length} bars)
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

          {/* Support & Resistance */}
          {showSR && detailedSrLevels.length > 0 && (
            <g id="detailed-sr-layer">
              {detailedSrLevels.map((lvl) => {
                const isSup = lvl.type === 'SUPPORT';
                const mainColor = isSup ? '#10b981' : '#f43f5e';
                const yCenter = getY(lvl.price);
                return (
                  <line
                    key={lvl.id}
                    x1={paddingLeft}
                    y1={yCenter}
                    x2={containerWidth - paddingRight}
                    y2={yCenter}
                    stroke={mainColor}
                    strokeWidth="1.2"
                    strokeDasharray="4 4"
                    opacity="0.8"
                  />
                );
              })}
            </g>
          )}

          {/* Area Chart Mode */}
          {chartType === 'area' && (
            <g>
              <path d={areaPath} fill="url(#areaGradient)" />
              <path d={`M ${linePath}`} fill="none" stroke="#2563eb" strokeWidth="2" />
            </g>
          )}

          {/* Candlestick Mode */}
          {chartType === 'candle' && (
            <g id="candlestick-bars-group">
              {visibleCandles.map((candle, localIdx) => {
                const globalIdx = visibleStartIndex + localIdx;
                const x = getX(globalIdx);
                const isBullish = candle.close >= candle.open;
                const bodyTop = getY(Math.max(candle.open, candle.close));
                const bodyBottom = getY(Math.min(candle.open, candle.close));
                const bodyHeight = Math.max(2.0, bodyBottom - bodyTop);
                const highY = getY(candle.high);
                const lowY = getY(candle.low);
                const isHovered = hoverIndex === globalIdx;

                const color = isBullish ? '#10b981' : '#f43f5e';

                return (
                  <g
                    key={`candle-${globalIdx}-${candle.time}`}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoverIndex(globalIdx)}
                    onClick={() => setHoverIndex(globalIdx)}
                  >
                    <line
                      x1={x}
                      y1={highY}
                      x2={x}
                      y2={lowY}
                      stroke={color}
                      strokeWidth={isHovered ? 2.0 : 1.4}
                    />
                    <rect
                      x={x - candleWidth / 2}
                      y={bodyTop}
                      width={candleWidth}
                      height={bodyHeight}
                      fill={color}
                      stroke={isBullish ? '#34d399' : '#fb7185'}
                      strokeWidth={0.8}
                      rx="1"
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* Overlays: SMA / EMA */}
          {showSMA20 && sma20Series.length > 0 && (
            <polyline fill="none" stroke="#3b82f6" strokeWidth="1.5" points={createPolylinePoints(sma20Series)} />
          )}
          {showSMA50 && sma50Series.length > 0 && (
            <polyline fill="none" stroke="#fbbf24" strokeWidth="1.8" points={createPolylinePoints(sma50Series)} />
          )}
          {showSMA200 && sma200Series.length > 0 && (
            <polyline fill="none" stroke="#c084fc" strokeWidth="2" points={createPolylinePoints(sma200Series)} />
          )}
          {showEMA9 && ema9Series.length > 0 && (
            <polyline fill="none" stroke="#f472b6" strokeWidth="1.5" points={createPolylinePoints(ema9Series)} />
          )}
          {showEMA21 && ema21Series.length > 0 && (
            <polyline fill="none" stroke="#818cf8" strokeWidth="1.5" points={createPolylinePoints(ema21Series)} />
          )}
          {showVWAP && vwapSeries.length > 0 && (
            <polyline fill="none" stroke="#2dd4bf" strokeWidth="1.5" strokeDasharray="3 2" points={createPolylinePoints(vwapSeries)} />
          )}

          {/* Volume Section */}
          {showVolume && (
            <g id="volume-visualization-layer">
              {visibleCandles.map((candle, localIdx) => {
                const i = visibleStartIndex + localIdx;
                const x = getX(i);
                const isBullish = candle.close >= candle.open;
                const barHeight = getVolumeBarHeight(candle.volume);
                const barY = volumeBottom - barHeight;
                return (
                  <rect
                    key={`vol-${i}`}
                    x={x - candleWidth / 2}
                    y={barY}
                    width={candleWidth}
                    height={barHeight}
                    fill={isBullish ? '#10b981' : '#f43f5e'}
                    opacity={0.65}
                    rx="1"
                  />
                );
              })}
            </g>
          )}

          {/* Crosshair Tracking */}
          {showCrosshair && hoverIndex !== null && activeCandle && (
            <g id="interactive-crosshairs" pointerEvents="none">
              <line
                x1={getX(hoverIndex)}
                y1={paddingTop}
                x2={getX(hoverIndex)}
                y2={priceChartBottom}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              {cursorPos && (
                <line
                  x1={paddingLeft}
                  y1={cursorPos.y}
                  x2={containerWidth - paddingRight}
                  y2={cursorPos.y}
                  stroke="#64748b"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
              )}
            </g>
          )}
        </svg>
      </div>

      {/* Sub-Panel Indicators */}
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

      {/* AI Prediction Thesis Card */}
      {showAiPredictionCard && (
        <AICandlePredictionCard
          prediction={aiPrediction}
          isLoading={isLoadingAiPrediction}
          onRefresh={handleFetchAICandlePrediction}
          showGhostCandle={showAiGhostCandle}
          onToggleGhostCandle={() => setShowAiGhostCandle(!showAiGhostCandle)}
        />
      )}

      {/* Modals */}
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

      <SrRationaleModal
        level={activeSrRationaleLevel}
        onClose={() => setActiveSrRationaleLevel(null)}
        currentPrice={currentPrice}
      />

      <MarketMicrostructureModal
        isOpen={isMicrostructureModalOpen}
        onClose={() => setIsMicrostructureModalOpen(false)}
        quote={effectiveQuote}
        microstructure={microstructureAnalysis}
        footprint={institutionalFootprint}
        optionStrategies={aiOptionStrategies}
        srLevels={detailedSrLevels}
      />

      <StrategyMatrixModal
        isOpen={isStrategyMatrixModalOpen}
        onClose={() => setIsStrategyMatrixModalOpen(false)}
        symbol={symbol}
        currentPrice={currentPrice}
        indicators={effectiveIndicators}
        frameworks={strategyFrameworkResults}
        srLevels={detailedSrLevels}
      />
    </div>
  );
};