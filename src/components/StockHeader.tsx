import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  BellPlus,
  Sparkles,
  HardDriveUpload,
  RefreshCw,
  Activity,
  Layers,
  Zap
} from 'lucide-react';
import {
  StockQuote,
  TechnicalIndicators,
  TimeframeInterval,
  SwingCandleInterval,
  CandlestickSignalScope
} from '../types';

export const SWING_CANDLE_INTERVALS: {
  id: SwingCandleInterval;
  label: string;
  badge: string;
  description: string;
}[] = [
  { id: '1d', label: 'Daily', badge: '1D', description: 'Daily candlesticks (1 day per candle)' },
  { id: '1wk', label: 'Weekly', badge: '1W', description: 'Weekly candlesticks (1 week per candle)' },
  { id: '1mo', label: 'Monthly', badge: '1M', description: 'Monthly candlesticks (1 month per candle)' },
];

export const DAY_TRADE_INTERVALS: { id: TimeframeInterval; label: string; fullLabel: string }[] = [
  { id: '1m', label: '1m', fullLabel: '1-min' },
  { id: '2m', label: '2m', fullLabel: '2-min' },
  { id: '5m', label: '5m', fullLabel: '5-min' },
  { id: '10m', label: '10m', fullLabel: '10-min' },
  { id: '15m', label: '15m', fullLabel: '15-min' },
  { id: '30m', label: '30m', fullLabel: '30-min' },
  { id: '1h', label: '1h', fullLabel: '1-hr' },
  { id: '2h', label: '2h', fullLabel: '2-hr' },
  { id: '4h', label: '4h', fullLabel: '4-hr' },
];

export const RANGES = [
  { id: '1w', label: '1W' },
  { id: '1mo', label: '1M' },
  { id: '3mo', label: '3M' },
  { id: '6mo', label: '6M' },
  { id: '1y', label: '1Y' },
  { id: '2y', label: '2Y' },
  { id: '5y', label: '5Y' },
];

interface StockHeaderProps {
  quote: StockQuote;
  indicators: TechnicalIndicators | null;
  selectedRange?: string;
  onSelectRange?: (r: string) => void;
  isDayTradeView?: boolean;
  onToggleDayTradeView?: (active: boolean) => void;
  selectedInterval?: TimeframeInterval;
  onSelectInterval?: (interval: TimeframeInterval) => void;
  selectedSwingInterval?: SwingCandleInterval;
  onSelectSwingInterval?: (interval: SwingCandleInterval) => void;
  candleSignalsCount?: number;
  showCandleSignals?: boolean;
  onToggleCandleSignals?: () => void;
  signalScope?: CandlestickSignalScope;
  onSelectSignalScope?: (scope: CandlestickSignalScope) => void;
  chartType: 'candle' | 'area';
  onChangeChartType: (t: 'candle' | 'area') => void;
  onOpenCreateAlert: () => void;
  onOpenStrategyModal: () => void;
  onOpenDriveExport: () => void;
  onRefreshQuote: () => void;
  isLoading: boolean;
}

export const StockHeader: React.FC<StockHeaderProps> = ({
  quote,
  indicators,
  candleSignalsCount = 0,
  showCandleSignals = false,
  onToggleCandleSignals,
  signalScope = 'all',
  onSelectSignalScope,
  chartType,
  onChangeChartType,
  onOpenCreateAlert,
  onOpenStrategyModal,
  onOpenDriveExport,
  onRefreshQuote,
  isLoading
}) => {
  const [flashColor, setFlashColor] = useState<'green' | 'red' | null>(null);

  useEffect(() => {
    if (quote.change >= 0) {
      setFlashColor('green');
    } else {
      setFlashColor('red');
    }
    const timer = setTimeout(() => setFlashColor(null), 800);
    return () => clearTimeout(timer);
  }, [quote.price]);

  const isPositive = quote.change >= 0;

  // Calculate Day Range percentage
  const daySpan = quote.dayHigh - quote.dayLow;
  const dayProgress = daySpan > 0 ? Math.min(100, Math.max(0, ((quote.price - quote.dayLow) / daySpan) * 100)) : 50;

  // Calculate 52W Range percentage
  const yearHigh = quote.fiftyTwoWeekHigh || quote.price * 1.2;
  const yearLow = quote.fiftyTwoWeekLow || quote.price * 0.8;
  const yearSpan = yearHigh - yearLow;
  const yearProgress = yearSpan > 0 ? Math.min(100, Math.max(0, ((quote.price - yearLow) / yearSpan) * 100)) : 50;

  return (
    <div id="stock-hero-header" className="w-full bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-4 text-slate-200 min-w-0">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
        {/* Left: Ticker, Name, Price, and Day Performance */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 sm:gap-6 min-w-0">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl lg:text-3xl font-bold tracking-tight text-white font-mono">
                {quote.symbol}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 uppercase">
                {quote.exchange || 'NASDAQ'}
              </span>
              <span className="text-xs text-slate-500 font-medium truncate max-w-[120px] sm:max-w-none">
                {quote.sector || 'Equities'}
              </span>
              <button
                onClick={onRefreshQuote}
                disabled={isLoading}
                title="Refresh Price & Historical Data"
                className="text-slate-400 hover:text-blue-400 p-1 rounded hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-400' : ''}`} />
              </button>
            </div>
            <div className="text-sm font-medium text-slate-400 mt-0.5 truncate max-w-[280px] sm:max-w-none">
              {quote.name}
            </div>
          </div>

          <div className="h-10 w-px bg-slate-800 hidden md:block" />

          {/* Real-Time Price with Flashing Tick */}
          <div>
            <div className="flex items-baseline gap-3">
              <div
                className={`text-3xl lg:text-4xl font-bold font-mono transition-colors duration-300 ${
                  flashColor === 'green'
                    ? 'text-emerald-400'
                    : flashColor === 'red'
                    ? 'text-rose-400'
                    : 'text-white'
                }`}
              >
                ${quote.price.toFixed(2)}
              </div>
              <div
                className={`flex items-center gap-1 text-xs lg:text-sm font-mono font-semibold px-2 py-0.5 rounded ${
                  isPositive
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'
                }`}
              >
                {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                <span>
                  {isPositive ? '+' : ''}${quote.change.toFixed(2)} ({isPositive ? '+' : ''}
                  {quote.changePercent.toFixed(2)}%)
                </span>
              </div>
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2 font-mono">
              <span>Prev: ${quote.previousClose.toFixed(2)}</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-400 font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Updated {new Date(quote.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Range Visualizers */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-6 bg-slate-950 p-2.5 sm:p-3 rounded-lg border border-slate-800 min-w-0">
          {/* Day Range Bar */}
          <div className="min-w-0">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              <span>Day Range</span>
              <span className="text-slate-300 font-mono font-normal ml-1 truncate">${quote.dayLow.toFixed(2)} - ${quote.dayHigh.toFixed(2)}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${dayProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 mt-0.5 font-mono">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>

          {/* 52-Week Range Bar */}
          <div className="min-w-0">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              <span>52W Range</span>
              <span className="text-slate-300 font-mono font-normal ml-1 truncate">${yearLow.toFixed(2)} - ${yearHigh.toFixed(2)}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden relative">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${yearProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 mt-0.5 font-mono">
              <span>52W L</span>
              <span>52W H</span>
            </div>
          </div>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="create-alert-btn"
            onClick={onOpenCreateAlert}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs rounded-md transition-colors cursor-pointer"
          >
            <BellPlus className="w-3.5 h-3.5 text-amber-400" />
            <span>Set Alert</span>
          </button>

          <button
            id="run-ai-strategy-btn"
            onClick={onOpenStrategyModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-md shadow-sm transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-200" />
            <span>AI Strategy</span>
          </button>

          <button
            id="export-drive-btn"
            onClick={onOpenDriveExport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs rounded-md transition-colors cursor-pointer"
          >
            <HardDriveUpload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export Drive</span>
          </button>
        </div>
      </div>

      {/* Secondary Bar: Candlestick Signals & Chart Types */}
      <div className="max-w-7xl mx-auto mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Candlestick Signals Quick Toggle */}
        <div className="flex items-center gap-2 min-w-0">
          {onToggleCandleSignals && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={onToggleCandleSignals}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all border cursor-pointer ${
                  showCandleSignals
                    ? 'bg-emerald-950/50 text-emerald-300 border-emerald-600/50 shadow-sm'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
                title="Toggle automatic candlestick pattern recognition"
              >
                <Zap className={`w-3.5 h-3.5 ${showCandleSignals ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>Signals</span>
                {candleSignalsCount > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                    showCandleSignals ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {candleSignalsCount}
                  </span>
                )}
              </button>

              {showCandleSignals && onSelectSignalScope && (
                <div className="flex items-center rounded-lg bg-slate-950 p-0.5 border border-slate-800 text-xs">
                  <button
                    onClick={() => onSelectSignalScope('all')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                      signalScope === 'all'
                        ? 'bg-slate-800 text-white font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => onSelectSignalScope('last')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                      signalScope === 'last'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Last Candle
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick Stats & Candles / Mountain Style */}
        <div className="flex items-center gap-3 sm:gap-4 text-xs ml-auto">
          <div className="hidden sm:flex items-center gap-3 text-slate-400 font-medium">
            <span>Vol: <b className="text-slate-200 font-mono">{(quote.volume / 1000000).toFixed(2)}M</b></span>
            {indicators && (
              <>
                <span>ATR: <b className="text-slate-200 font-mono">${indicators.atr.toFixed(2)}</b></span>
                <span>RSI: <b className={`font-mono ${indicators.rsi > 70 ? 'text-rose-400' : indicators.rsi < 30 ? 'text-emerald-400' : 'text-slate-200'}`}>{indicators.rsi.toFixed(1)}</b></span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-md border border-slate-800">
            <button
              onClick={() => onChangeChartType('candle')}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                chartType === 'candle'
                  ? 'bg-slate-800 text-blue-400 border border-slate-700 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Candles</span>
            </button>
            <button
              onClick={() => onChangeChartType('area')}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                chartType === 'area'
                  ? 'bg-slate-800 text-blue-400 border border-slate-700 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Mountain</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};