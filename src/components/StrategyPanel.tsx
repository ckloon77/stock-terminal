import React, { useState } from 'react';
import {
  Compass,
  Sparkles,
  TrendingUp,
  Target,
  ShieldCheck,
  AlertTriangle,
  HardDriveUpload,
  Zap,
  CheckCircle2,
  RefreshCw,
  SlidersHorizontal
} from 'lucide-react';
import {
  StrategyFrameworkResult,
  StockQuote,
  TechnicalIndicators,
  AIStrategicThesis
} from '../types';
import { fetchAIStrategyAnalysis } from '../services/stockService';

interface StrategyPanelProps {
  symbol: string;
  quote: StockQuote;
  indicators: TechnicalIndicators;
  frameworks: StrategyFrameworkResult[];
  onOpenDriveExport: () => void;
}

export const StrategyPanel: React.FC<StrategyPanelProps> = ({
  symbol,
  quote,
  indicators,
  frameworks,
  onOpenDriveExport
}) => {
  const [aiThesis, setAiThesis] = useState<AIStrategicThesis | null>(null);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleRunAiAnalysis = async () => {
    setIsLoadingAi(true);
    setAiError(null);
    try {
      const result = await fetchAIStrategyAnalysis(symbol, quote, indicators, frameworks);
      setAiThesis(result);
    } catch (err: any) {
      setAiError(err.message || 'Failed to generate AI strategy');
    } finally {
      setIsLoadingAi(false);
    }
  };

  return (
    <div id="strategy-framework-section" className="w-full bg-slate-900 border-b border-slate-800 px-6 py-5 text-slate-200">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-400" />
              <h2 className="text-xs font-bold uppercase text-slate-500 tracking-widest">
                Strategy Framework &amp; Signal Matrix
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Algorithmic rule engines evaluating tactical setups for <span className="text-white font-bold">{symbol}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunAiAnalysis}
              disabled={isLoadingAi}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-md shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 text-blue-200 ${isLoadingAi ? 'animate-spin' : ''}`} />
              <span>{isLoadingAi ? 'Synthesizing Analysis...' : 'Run Deep AI Strategy'}</span>
            </button>

            <button
              onClick={onOpenDriveExport}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs rounded-md transition-colors cursor-pointer"
            >
              <HardDriveUpload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Save to Drive</span>
            </button>
          </div>
        </div>

        {/* Strategy Framework Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-5">
          {frameworks.map((fw) => {
            const isBull = fw.signal === 'BULLISH';
            const isBear = fw.signal === 'BEARISH';
            return (
              <div
                key={fw.id}
                className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col justify-between hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      {fw.category}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                        isBull
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : isBear
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {fw.signal}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-white mb-1.5">{fw.name}</h3>

                  <p className="text-xs text-slate-400 leading-relaxed mb-3">
                    {fw.condition}
                  </p>
                </div>

                <div>
                  {/* Confidence Bar */}
                  <div className="mb-2">
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono mb-1">
                      <span>Conviction</span>
                      <span className="font-bold text-slate-200">{fw.confidence}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isBull ? 'bg-emerald-500' : isBear ? 'bg-rose-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${fw.confidence}%` }}
                      />
                    </div>
                  </div>

                  {fw.triggerZone && (
                    <div className="text-[11px] font-mono text-blue-400 bg-blue-600/10 border border-blue-500/20 px-2 py-1 rounded">
                      {fw.triggerZone}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* AI Strategic Deep-Dive Result Section */}
        {aiThesis && (
          <div className="bg-slate-950 border border-slate-800 rounded-lg p-5 shadow-xl mb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md bg-blue-600/10 border border-blue-500/30 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base text-white">
                      AI Quantitative Strategy Thesis
                    </h3>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
                      {aiThesis.modelUsed || 'gemini-3.8-flash'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono">
                    Calculated for {symbol} at ${quote.price.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Verdict & Conviction Badge */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                    Tactical Action
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded inline-block mt-0.5 font-mono ${
                      aiThesis.verdict.includes('BUY')
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : aiThesis.verdict.includes('SELL')
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                    }`}
                  >
                    {aiThesis.verdict}
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-800 hidden sm:block" />
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
                    Conviction
                  </div>
                  <div className="text-base font-bold font-mono text-white mt-0.5">
                    {aiThesis.convictionScore}%
                  </div>
                </div>
              </div>
            </div>

            {/* AI Summary Text */}
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed my-4 bg-slate-900 border border-slate-800 p-3.5 rounded-md">
              {aiThesis.summary}
            </p>

            {/* Tactical Execution Plan: Entry, Stop, Targets, R:R */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 my-4">
              <div className="bg-slate-900 p-3 rounded-md border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Entry Zone</span>
                <span className="text-xs sm:text-sm font-bold font-mono text-blue-400 mt-1 block">
                  {aiThesis.setup.entryZone}
                </span>
              </div>

              <div className="bg-slate-900 p-3 rounded-md border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Stop-Loss</span>
                <span className="text-xs sm:text-sm font-bold font-mono text-rose-400 mt-1 block">
                  {aiThesis.setup.stopLoss}
                </span>
              </div>

              <div className="bg-slate-900 p-3 rounded-md border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Target 1</span>
                <span className="text-xs sm:text-sm font-bold font-mono text-emerald-400 mt-1 block">
                  {aiThesis.setup.target1}
                </span>
              </div>

              <div className="bg-slate-900 p-3 rounded-md border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Target 2</span>
                <span className="text-xs sm:text-sm font-bold font-mono text-emerald-300 mt-1 block">
                  {aiThesis.setup.target2}
                </span>
              </div>

              <div className="bg-slate-900 p-3 rounded-md border border-slate-800 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Risk / Reward</span>
                <span className="text-xs sm:text-sm font-bold font-mono text-amber-400 mt-1 block">
                  {aiThesis.setup.riskRewardRatio}
                </span>
              </div>
            </div>

            {/* Catalysts & Invalidation Risks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-800 text-xs">
              <div>
                <h4 className="font-semibold text-emerald-400 flex items-center gap-1.5 mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Key Technical Catalysts
                </h4>
                <ul className="space-y-1.5 text-slate-300">
                  {aiThesis.keyCatalysts.map((cat, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>{cat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-rose-400 flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Thesis Invalidation &amp; Risks
                </h4>
                <ul className="space-y-1.5 text-slate-300">
                  {aiThesis.risks.map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-rose-500 font-bold">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {aiError && (
          <div className="bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs p-3 rounded-md mb-4 font-mono">
            {aiError}
          </div>
        )}
      </div>
    </div>
  );
};
