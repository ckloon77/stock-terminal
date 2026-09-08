import React from 'react';
import { TechnicalIndicators, StrategyFrameworkResult, SupportResistanceLevel } from '../types';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Layers,
  Scale,
  Target,
  FileText,
  X,
  TrendingUp,
  Activity,
  BarChart2
} from 'lucide-react';

interface StrategyMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  currentPrice: number;
  indicators: TechnicalIndicators;
  frameworks: StrategyFrameworkResult[];
  srLevels: SupportResistanceLevel[];
}

export const StrategyMatrixModal: React.FC<StrategyMatrixModalProps> = ({
  isOpen,
  onClose,
  symbol,
  currentPrice,
  indicators,
  frameworks,
  srLevels
}) => {
  if (!isOpen) return null;

  // Compute Confluence Matrix Rating
  const bullishCount = frameworks.filter((f) => f.signal === 'BULLISH').length;
  const bearishCount = frameworks.filter((f) => f.signal === 'BEARISH').length;
  const neutralCount = frameworks.filter((f) => f.signal === 'NEUTRAL').length;
  const total = frameworks.length || 1;

  const rawScore = ((bullishCount - bearishCount) / total) * 100;
  const confluenceScore = Math.round(rawScore);

  let overallRating: 'STRONG BULLISH' | 'MODERATE BULLISH' | 'NEUTRAL CONSOLIDATION' | 'MODERATE BEARISH' | 'STRONG BEARISH';
  let badgeClass = '';

  if (confluenceScore >= 50) {
    overallRating = 'STRONG BULLISH';
    badgeClass = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50';
  } else if (confluenceScore > 15) {
    overallRating = 'MODERATE BULLISH';
    badgeClass = 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30';
  } else if (confluenceScore <= -50) {
    overallRating = 'STRONG BEARISH';
    badgeClass = 'bg-rose-500/20 text-rose-300 border-rose-500/50';
  } else if (confluenceScore < -15) {
    overallRating = 'MODERATE BEARISH';
    badgeClass = 'bg-rose-500/15 text-rose-200 border-rose-500/30';
  } else {
    overallRating = 'NEUTRAL CONSOLIDATION';
    badgeClass = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
  }

  const nearestSupport = srLevels.filter((s) => s.type === 'SUPPORT' && s.price < currentPrice).pop()?.price || +(currentPrice * 0.97).toFixed(2);
  const nearestResistance = srLevels.filter((s) => s.type === 'RESISTANCE' && s.price > currentPrice)[0]?.price || +(currentPrice * 1.03).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-750 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Strategy Framework &amp; Signal Matrix Rationale</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${badgeClass}`}>
                  {overallRating} ({confluenceScore > 0 ? `+${confluenceScore}` : confluenceScore}/100)
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Mathematical multi-tier rating system and thesis derivation for {symbol}.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-300">
          {/* Section 1: The Core Rationale */}
          <div className="p-4 rounded-lg bg-indigo-950/30 border border-indigo-500/30 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-wider font-mono">
              <Layers className="w-4 h-4" />
              <span>Why a Strategy Framework &amp; Signal Matrix is Crucial</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              In retail trading, single-indicator decisions suffer from a failure rate exceeding 50%. Moving averages fail in choppy ranges; RSI oscillators stay "overbought" for weeks during secular momentum runs.
            </p>
            <p className="text-xs text-slate-300 leading-relaxed font-mono text-[11px] text-indigo-200/90">
              The Strategy Framework solves this by establishing <strong>Multi-Tier Confluence</strong>:
              <br />
              • <strong>Tier 1 (Market Structure)</strong> answers <em>WHERE</em> to take trades (S/R Lines, VWAP, Volume Profile).
              <br />
              • <strong>Tier 2 (Trend Bias)</strong> answers <em>WHICH DIRECTION</em> to lean (SMAs, EMAs, Bollinger Bands).
              <br />
              • <strong>Tier 3 (Volume Conviction)</strong> answers <em>WHETHER THE MOVE IS REAL</em> (Institutional volume surges &gt;1.5x MA).
              <br />
              • <strong>Tier 4 (Micro Patterns)</strong> answers <em>EXACTLY WHEN TO EXECUTE</em> (Candlestick &amp; Chart Patterns).
            </p>
          </div>

          {/* Section 2: Confluence Scoring & Signal Matrix */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider">
                Multi-Strategy Framework Signal Breakdown
              </span>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> {bullishCount} Bullish (+1)
                </span>
                <span className="text-rose-400 font-bold flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> {bearishCount} Bearish (-1)
                </span>
                <span className="text-amber-400 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> {neutralCount} Neutral (0)
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden bg-slate-950/60">
              {frameworks.map((fw) => (
                <div key={fw.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-200 flex items-center gap-2">
                      <span>{fw.name}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                        {fw.category}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">{fw.condition}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                        fw.signal === 'BULLISH'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : fw.signal === 'BEARISH'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {fw.signal} ({fw.confidence}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Definitive Trade Thesis & Conclusion */}
          <div className="p-4 rounded-lg bg-slate-800/80 border border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider flex items-center gap-1.5">
                <Target className="w-4 h-4 text-indigo-400" />
                <span>Actionable Trade Thesis &amp; Invalidation Conclusion</span>
              </span>
              <span className="text-xs font-mono font-bold text-slate-300">
                Current: ${currentPrice.toFixed(2)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
              <div className="p-2.5 rounded bg-slate-900 border border-slate-750">
                <span className="text-slate-500 block text-[10px]">Structural Invalidation (Stop)</span>
                <span className="font-bold text-rose-400">${nearestSupport}</span>
                <span className="text-[9px] text-slate-500 block mt-0.5">Tier 1 Key Support Floor</span>
              </div>
              <div className="p-2.5 rounded bg-slate-900 border border-slate-750">
                <span className="text-slate-500 block text-[10px]">Primary Profit Target</span>
                <span className="font-bold text-emerald-400">${nearestResistance}</span>
                <span className="text-[9px] text-slate-500 block mt-0.5">Tier 1 Structural Resistance</span>
              </div>
              <div className="p-2.5 rounded bg-slate-900 border border-slate-750">
                <span className="text-slate-500 block text-[10px]">Expected Risk/Reward</span>
                <span className="font-bold text-amber-300">
                  {currentPrice > nearestSupport
                    ? `1 : ${((nearestResistance - currentPrice) / Math.max(0.01, currentPrice - nearestSupport)).toFixed(2)}`
                    : '1 : 1.50'}
                </span>
                <span className="text-[9px] text-slate-500 block mt-0.5">Asymmetric Statistical Edge</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-mono text-[11px]">
              <strong>Strategic Verdict:</strong>{' '}
              {confluenceScore > 15
                ? `High-probability bullish bias supported by ${bullishCount} aligned frameworks. Pullbacks into the $${nearestSupport} demand zone offer favorable asymmetric risk/reward entries.`
                : confluenceScore < -15
                ? `Defensive or short posture warranted. Overhead supply at $${nearestResistance} caps momentum; risk of further breakdown persists.`
                : `Range-bound consolidation regime. Favor mean-reversion trades between support $${nearestSupport} and resistance $${nearestResistance} with tight stops.`}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/80 text-xs text-slate-400">
          <span className="font-mono">Confluence Engine v2.4</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 font-semibold cursor-pointer"
          >
            Close Framework Matrix
          </button>
        </div>
      </div>
    </div>
  );
};
