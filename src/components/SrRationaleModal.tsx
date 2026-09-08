import React from 'react';
import { SupportResistanceLevel } from '../types';
import {
  X,
  Target,
  BarChart3,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

interface SrRationaleModalProps {
  level: SupportResistanceLevel | null;
  onClose: () => void;
  currentPrice: number;
}

export const SrRationaleModal: React.FC<SrRationaleModalProps> = ({
  level,
  onClose,
  currentPrice
}) => {
  if (!level) return null;

  const isSup = level.type === 'SUPPORT';
  const bandLow = level.bandLow ?? (level as any).rangeLow ?? level.price * 0.995;
  const bandHigh = level.bandHigh ?? (level as any).rangeHigh ?? level.price * 1.005;
  const testCount = level.testCount ?? (level as any).touchCount ?? 1;
  const bounceCount = level.bounceCount ?? 1;
  const flips = level.breakoutFlipCount ?? (level as any).breakCount ?? 0;

  const successRate = testCount > 0 ? Math.round((bounceCount / testCount) * 100) : 100;
  const distFromPrice = currentPrice > 0 ? ((level.price - currentPrice) / currentPrice) * 100 : 0;
  const bandSpan = Math.abs(bandHigh - bandLow);
  const bandPct = level.price > 0 ? (bandSpan / level.price) * 100 : 0.8;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className={`px-5 py-3.5 border-b flex items-center justify-between ${
            isSup
              ? 'bg-emerald-950/50 border-emerald-800/60'
              : 'bg-rose-950/50 border-rose-800/60'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                isSup
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
              }`}
            >
              {isSup ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  {isSup ? 'Support Floor' : 'Resistance Ceiling'} Rationale & Statistics
                </h3>
                <span
                  className="px-1.5 py-0.2 rounded text-[10px] font-bold font-mono uppercase bg-purple-500/20 text-purple-300 border border-purple-500/40"
                >
                  Strength: {level.strength}/5 ★
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Centroid Line: ${level.price.toFixed(2)} • Range Band: ${bandLow.toFixed(2)} – ${bandHigh.toFixed(2)} (±{(bandPct / 2).toFixed(2)}%)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Key Metric Stats Grid: Historical Touch & Bounce Track Record */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono font-bold uppercase text-slate-400 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                <span>Historical Occasions & Validation Record</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Current: ${currentPrice.toFixed(2)} ({distFromPrice >= 0 ? `+${distFromPrice.toFixed(2)}%` : `${distFromPrice.toFixed(2)}%`})
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col">
                <span className="text-[10px] text-slate-400 font-mono">Occasions Tested</span>
                <span className="text-lg font-bold text-white font-mono mt-0.5">
                  {testCount} <span className="text-xs font-normal text-slate-400">times</span>
                </span>
                <span className="text-[9.5px] text-slate-500 mt-1">Total price encounters</span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col">
                <span className="text-[10px] text-slate-400 font-mono">Served as {isSup ? 'Support' : 'Resistance'}</span>
                <span className={`text-lg font-bold font-mono mt-0.5 ${isSup ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {bounceCount} <span className="text-xs font-normal text-slate-400">bounces</span>
                </span>
                <span className="text-[9.5px] text-emerald-400/90 font-mono mt-1 font-semibold">
                  {successRate}% bounce success
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col">
                <span className="text-[10px] text-slate-400 font-mono">Role Flips / Breaks</span>
                <span className="text-lg font-bold text-slate-300 font-mono mt-0.5">
                  {flips} <span className="text-xs font-normal text-slate-400">flips</span>
                </span>
                <span className="text-[9.5px] text-slate-500 mt-1">S ↔ R role inversions</span>
              </div>
            </div>
          </div>

          {/* Rationale and Underlying Logic */}
          <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 font-mono font-bold text-[11px]">
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Algorithmic Logic & Rationale:</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-[11.5px]">
              {level.rationale}
            </p>
            {level.institutionalMeaning && (
              <div className="pt-2 border-t border-slate-800/80 text-amber-200/90 text-[11px] leading-relaxed flex items-start gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span><b>Institutional Footprint:</b> {level.institutionalMeaning}</span>
              </div>
            )}
          </div>

          {/* Line vs Band Architecture Explanation */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-1.5 font-bold text-slate-300 font-mono mb-1 text-[11px]">
                <Target className="w-3.5 h-3.5 text-blue-400" />
                <span>Version (a): Precision Line</span>
              </div>
              <p className="text-[10.5px] text-slate-400 leading-normal">
                Represents the exact historical centroid (${level.price.toFixed(2)}) where the highest transaction volume executed.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center gap-1.5 font-bold text-slate-300 font-mono mb-1 text-[11px]">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>Version (b): Range Band</span>
              </div>
              <p className="text-[10.5px] text-slate-400 leading-normal">
                Reflects institutional limit order execution depth from ${bandLow.toFixed(2)} to ${bandHigh.toFixed(2)}.
              </p>
            </div>
          </div>

          {/* Footer Guidance */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span className="font-mono">
              Last Test: <b className="text-white">{level.lastTestedTime || 'Recent history'}</b>
            </span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
