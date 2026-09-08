import React from 'react';
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  Target,
  ShieldAlert,
  Zap,
  Info,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { AICandlePrediction } from '../types';

interface AICandlePredictionCardProps {
  prediction: AICandlePrediction | null;
  isLoading: boolean;
  onRefresh: () => void;
  showOnChart: boolean;
  onToggleShowOnChart: () => void;
  onClose?: () => void;
}

export const AICandlePredictionCard: React.FC<AICandlePredictionCardProps> = ({
  prediction,
  isLoading,
  onRefresh,
  showOnChart,
  onToggleShowOnChart,
  onClose
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  if (!prediction && !isLoading) {
    return null;
  }

  const isBull = prediction?.predictedCandle?.direction === 'BULLISH';
  const isBear = prediction?.predictedCandle?.direction === 'BEARISH';
  const dirColor = isBull ? 'emerald' : isBear ? 'rose' : 'cyan';

  return (
    <div
      id="ai-candle-prediction-card"
      className="bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden transition-all my-2.5"
    >
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                AI Next Candle Forecast
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {prediction?.timeframe || '1D'} Bar
              </span>
              {prediction?.modelUsed && (
                <span className="hidden sm:inline px-1.5 py-0.2 rounded text-[9.5px] font-mono text-slate-400 bg-slate-800 border border-slate-700">
                  {prediction.modelUsed}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Projection on Chart */}
          <button
            id="toggle-ai-candle-chart-projection-btn"
            onClick={onToggleShowOnChart}
            className={`px-2.5 py-1 rounded text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors border cursor-pointer ${
              showOnChart
                ? 'bg-indigo-950/60 text-indigo-300 border-indigo-700/60 hover:bg-indigo-900/80'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title={showOnChart ? 'Hide AI next candle projection on chart' : 'Display AI next candle projection on chart'}
          >
            {showOnChart ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{showOnChart ? 'Ghost Candle On' : 'Ghost Candle Off'}</span>
          </button>

          {/* Regenerate AI Prediction */}
          <button
            id="refresh-ai-candle-prediction-btn"
            onClick={onRefresh}
            disabled={isLoading}
            className="px-2.5 py-1 rounded text-xs font-mono font-semibold flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors border border-slate-700 cursor-pointer disabled:opacity-50"
            title="Recalculate AI forecast for the next candle"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
            <span className="hidden sm:inline">{isLoading ? 'Analyzing...' : 'Re-Forecast'}</span>
          </button>

          {/* Collapse Button */}
          <button
            id="collapse-ai-candle-prediction-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isCollapsed ? 'Expand Forecast Card' : 'Collapse Forecast Card'}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isLoading && !prediction && (
        <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
          <p className="text-xs font-mono">
            Evaluating recent price action, order flow, wicks, and volatility to forecast next candle...
          </p>
        </div>
      )}

      {prediction && !isCollapsed && (
        <div className="p-4 space-y-4">
          {/* High-Level Forecast KPI Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Direction & Bias */}
            <div className={`p-3 rounded-lg border ${
              isBull
                ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300'
                : isBear
                ? 'bg-rose-950/30 border-rose-800/40 text-rose-300'
                : 'bg-sky-950/30 border-sky-800/40 text-sky-300'
            }`}>
              <div className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1 mb-1">
                {isBull ? <TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> : isBear ? <TrendingDown className="w-3.5 h-3.5 text-rose-400" /> : <Minus className="w-3.5 h-3.5 text-sky-400" />}
                Directional Bias
              </div>
              <div className="text-base font-bold font-mono tracking-tight flex items-center gap-1.5">
                <span>{prediction.predictedCandle.direction}</span>
              </div>
              <div className="text-[11px] font-mono mt-0.5 opacity-90">
                Exp: {prediction.predictedCandle.expectedChange >= 0 ? '+' : ''}${prediction.predictedCandle.expectedChange.toFixed(2)} ({prediction.predictedCandle.expectedChangePercent >= 0 ? '+' : ''}{prediction.predictedCandle.expectedChangePercent.toFixed(2)}%)
              </div>
            </div>

            {/* Probability Score */}
            <div className="p-3 rounded-lg border bg-slate-950/60 border-slate-800">
              <div className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1 mb-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Probability Score
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-extrabold font-mono text-white">
                  {prediction.probabilityScore}%
                </span>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {prediction.conviction}
                </span>
              </div>
              {/* Progress bar */}
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    isBull ? 'bg-emerald-500' : isBear ? 'bg-rose-500' : 'bg-sky-500'
                  }`}
                  style={{ width: `${prediction.probabilityScore}%` }}
                />
              </div>
            </div>

            {/* Target Price & Trigger */}
            <div className="p-3 rounded-lg border bg-slate-950/60 border-slate-800">
              <div className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1 mb-1">
                <Target className="w-3.5 h-3.5 text-indigo-400" />
                Trigger & Target
              </div>
              <div className="text-sm font-bold font-mono text-slate-200">
                Target: <span className={isBull ? 'text-emerald-400' : 'text-rose-400'}>${prediction.keyLevels.targetPrice.toFixed(2)}</span>
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                Trigger: <span className="text-slate-200">${prediction.keyLevels.triggerPrice.toFixed(2)}</span>
              </div>
            </div>

            {/* Invalidation / Stop Level */}
            <div className="p-3 rounded-lg border bg-slate-950/60 border-slate-800">
              <div className="text-[10px] uppercase font-mono text-slate-400 flex items-center gap-1 mb-1">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                Invalidation Stop
              </div>
              <div className="text-sm font-bold font-mono text-rose-300">
                ${prediction.keyLevels.invalidationPrice.toFixed(2)}
              </div>
              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                Expected Range: ${prediction.keyLevels.expectedVolatilityRange.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Predicted Candlestick OHLC Breakdown */}
          <div className="px-3.5 py-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Projected Next Bar OHLC:</span>
              <span className="text-slate-300">O: <b className="text-white">${prediction.predictedCandle.open.toFixed(2)}</b></span>
              <span className="text-slate-300">H: <b className="text-emerald-400">${prediction.predictedCandle.high.toFixed(2)}</b></span>
              <span className="text-slate-300">L: <b className="text-rose-400">${prediction.predictedCandle.low.toFixed(2)}</b></span>
              <span className="text-slate-300">C: <b className={isBull ? 'text-emerald-400' : isBear ? 'text-rose-400' : 'text-white'}>${prediction.predictedCandle.close.toFixed(2)}</b></span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Info className="w-3 h-3 text-sky-400" />
              <span>Drawn on chart in forward 5-candle space</span>
            </div>
          </div>

          {/* Core Thesis Synthesis */}
          <div className="p-3 rounded-lg bg-slate-950/50 border border-slate-800/80 text-xs text-slate-300 leading-relaxed font-sans">
            <span className="font-bold text-indigo-300 uppercase tracking-wider text-[11px] mr-2">Thesis Rationale:</span>
            {prediction.thesisSummary}
          </div>

          {/* Conditions Matrix: What makes this thesis work vs fail */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Conditions for Thesis to WORK */}
            <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-900/40">
              <div className="flex items-center gap-2 text-emerald-400 font-bold font-mono text-xs mb-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>CONDITIONS FOR THESIS TO WORK</span>
              </div>
              <ul className="space-y-2">
                {prediction.worksConditions.map((cond, idx) => (
                  <li key={`work-cond-${idx}`} className="flex items-start gap-2 text-xs text-slate-300 leading-normal">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    <span>{cond}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Conditions for Thesis to FAIL */}
            <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/40">
              <div className="flex items-center gap-2 text-rose-400 font-bold font-mono text-xs mb-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>CONDITIONS THIS THESIS FAILS (INVALIDATION)</span>
              </div>
              <ul className="space-y-2">
                {prediction.failsConditions.map((cond, idx) => (
                  <li key={`fail-cond-${idx}`} className="flex items-start gap-2 text-xs text-slate-300 leading-normal">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                    <span>{cond}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
