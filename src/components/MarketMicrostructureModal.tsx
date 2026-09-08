import React, { useState } from 'react';
import {
  StockQuote,
  QuantityPriceAnalysis,
  InstitutionalFootprintAnalysis,
  AIOptionStrategy,
  SupportResistanceLevel
} from '../types';
import {
  QUANTITY_PRICE_AXIOM,
  EIGHT_RELATIONS_EXPLANATIONS
} from '../services/marketMicrostructure';
import {
  Sparkles,
  ShieldAlert,
  Activity,
  Zap,
  TrendingUp,
  Sliders,
  DollarSign,
  HelpCircle,
  CheckCircle2,
  X,
  Clock,
  Eye,
  Crosshair
} from 'lucide-react';

interface MarketMicrostructureModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: StockQuote;
  microstructure: QuantityPriceAnalysis;
  footprint: InstitutionalFootprintAnalysis;
  optionStrategies: AIOptionStrategy[];
  srLevels: SupportResistanceLevel[];
}

export const MarketMicrostructureModal: React.FC<MarketMicrostructureModalProps> = ({
  isOpen,
  onClose,
  quote,
  microstructure,
  footprint,
  optionStrategies,
  srLevels
}) => {
  const [activeTab, setActiveTab] = useState<'quantity_price' | 'institutional_footprint' | 'options_ai'>('quantity_price');
  const [selectedRelationNum, setSelectedRelationNum] = useState<number>(microstructure.relationNumber);

  if (!isOpen) return null;

  const currentRelationObj =
    EIGHT_RELATIONS_EXPLANATIONS.find((r) => r.num === selectedRelationNum) ||
    EIGHT_RELATIONS_EXPLANATIONS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-750 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Market Microstructure & Quantity-Price Intelligence</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  Joe Granville Axioms & Institutional Footprints
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Integrating quantity-price mechanics, off-exchange dark pool footprints, and AI option strategies for {quote.symbol}.
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

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-800 bg-slate-900/90 px-6 gap-2">
          <button
            onClick={() => setActiveTab('quantity_price')}
            className={`py-3 px-3 text-xs font-semibold font-mono border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'quantity_price'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>8 Quantity-Price Relations</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-indigo-500/20 text-indigo-300 font-bold">
              Active #{microstructure.relationNumber}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('institutional_footprint')}
            className={`py-3 px-3 text-xs font-semibold font-mono border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'institutional_footprint'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-4 h-4" />
            <span>Institutional Footprint Radar</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-purple-500/20 text-purple-300 font-bold">
              Dark Pools & GEX
            </span>
          </button>

          <button
            onClick={() => setActiveTab('options_ai')}
            className={`py-3 px-3 text-xs font-semibold font-mono border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'options_ai'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Options Strategies</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-bold">
              {optionStrategies.length} Setups
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-300">
          {/* TAB 1: QUANTITY-PRICE RELATIONS */}
          {activeTab === 'quantity_price' && (
            <div className="space-y-6">
              {/* Core Axiom Box */}
              <div className="p-4 rounded-lg bg-indigo-950/30 border border-indigo-500/30">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>The Granville Quantity-Price Axiom</span>
                </div>
                <p className="text-xs text-indigo-100/90 leading-relaxed italic">
                  "{QUANTITY_PRICE_AXIOM}"
                </p>
                <div className="mt-2 text-[11px] text-indigo-300/80">
                  Volume does not predict price in a vacuum; it reveals the intensity of disagreement and the liquidity commitment of dominant capital.
                </div>
              </div>

              {/* Active Diagnosis Banner */}
              <div className="p-4 rounded-lg bg-slate-800/80 border border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-400">Current Bar Microstructure Diagnosis:</span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                      microstructure.sentiment === 'BULLISH'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : microstructure.sentiment === 'BEARISH'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    }`}
                  >
                    Relation #{microstructure.relationNumber}: {microstructure.title}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-mono">
                  {microstructure.implication}
                </p>
                <div className="flex items-center gap-4 text-xs font-mono pt-1 text-slate-400">
                  <span>Confidence: <strong className="text-white">{microstructure.confidence}%</strong></span>
                  <span>Volume Ratio: <strong className="text-amber-400">{microstructure.volumeRatio}x</strong> 20-MA</span>
                  <span>Current Bar Vol: <strong className="text-emerald-400">{microstructure.barVolume.toLocaleString()}</strong></span>
                </div>
              </div>

              {/* Eight Relations Interactive Matrix */}
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                  The Eight Canonical Relations of Quantity-Price Theory
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {EIGHT_RELATIONS_EXPLANATIONS.map((rel) => {
                    const isDiagnosed = microstructure.relationNumber === rel.num;
                    const isSelected = selectedRelationNum === rel.num;

                    return (
                      <div
                        key={rel.num}
                        onClick={() => setSelectedRelationNum(rel.num)}
                        className={`p-3 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-950/60 border-indigo-500 shadow-xs'
                            : 'bg-slate-850/70 border-slate-750 hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold font-mono text-slate-200">
                            #{rel.num}. {rel.title}
                          </span>
                          {isDiagnosed && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              Active Now
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-normal">
                          {rel.detail}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Detail on selected relation */}
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono space-y-1.5">
                <div className="text-indigo-300 font-bold">
                  Tactical Playbook for Relation #{currentRelationObj.num}: {currentRelationObj.title}
                </div>
                <p className="text-slate-300 text-[11px]">
                  {currentRelationObj.detail}
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: INSTITUTIONAL FOOTPRINT RADAR */}
          {activeTab === 'institutional_footprint' && (
            <div className="space-y-6">
              {/* Dark Pool & Vol/OI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Dark Pool / TRF Ratio */}
                <div className="p-4 rounded-lg bg-slate-800/80 border border-slate-700">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="font-mono">Dark Pool / TRF Ratio</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      Off-Exchange
                    </span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-purple-300">
                    {footprint.darkPoolRatio}%
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Sentiment: <strong className="text-slate-200">{footprint.darkPoolSentiment}</strong>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">
                    FINRA TRF prints estimate dark pool accumulation vs distribution blocks without tipping order books.
                  </p>
                </div>

                {/* Vol / OI Asymmetry */}
                <div className="p-4 rounded-lg bg-slate-800/80 border border-slate-700">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="font-mono">Vol / OI Asymmetry</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded ${
                        footprint.volOiAsymmetry.isSignificant
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {footprint.volOiAsymmetry.isSignificant ? 'High Conviction' : 'Routine'}
                    </span>
                  </div>
                  <div className="text-2xl font-bold font-mono text-cyan-300">
                    {footprint.volOiAsymmetry.ratio}x
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Threshold: &ge; 1.5x signals sweeper flow
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">
                    {footprint.volOiAsymmetry.signal}
                  </p>
                </div>

                {/* Dealer Gamma Regime */}
                <div className="p-4 rounded-lg bg-slate-800/80 border border-slate-700">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span className="font-mono">Dealer Gamma Regime</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                        footprint.gammaRegime.type === 'POSITIVE'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {footprint.gammaRegime.type} GEX
                    </span>
                  </div>
                  <div className="text-xl font-bold font-mono text-amber-300">
                    Pivot: ${footprint.gammaRegime.gexPivotPrice}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Current: ${quote.price.toFixed(2)}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">
                    {footprint.gammaRegime.implication}
                  </p>
                </div>
              </div>

              {/* Late-Day / Market-Close Dynamics */}
              <div className="p-4 rounded-lg bg-slate-800/80 border border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-300 font-mono">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <span>Late-Day / Closing Volume Mechanics (10-Day MA Slope: {footprint.lateDayVolumeDynamics.ma10Slope})</span>
                  </div>
                </div>
                <div className="text-xs font-semibold text-slate-200">
                  Observation: {footprint.lateDayVolumeDynamics.observation}
                </div>
                <p className="text-xs text-slate-400 leading-relaxed font-mono">
                  {footprint.lateDayVolumeDynamics.implication}
                </p>
              </div>

              {/* "Dark Horse" Stock Evaluation */}
              <div className="p-4 rounded-lg bg-indigo-950/30 border border-indigo-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider font-mono">
                    "Dark Horse" (Black Horse) Accumulation Detector
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
                    {footprint.darkHorseEvaluation.status}
                  </span>
                </div>
                <p className="text-xs text-indigo-100/90 leading-relaxed font-mono">
                  {footprint.darkHorseEvaluation.details}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[11px] font-mono">
                  <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                    <div className="text-slate-400">Est. Daily Turnover</div>
                    <div className="font-bold text-white">{footprint.darkHorseEvaluation.turnoverPct}%</div>
                    <div className="text-[9px] text-slate-500">&lt;10% Glide / &gt;30% Alert</div>
                  </div>
                  <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                    <div className="text-slate-400">Trough Volume Inversion</div>
                    <div className={`font-bold ${footprint.darkHorseEvaluation.isTroughVolumeInversion ? 'text-emerald-400' : 'text-slate-400'}`}>
                      {footprint.darkHorseEvaluation.isTroughVolumeInversion ? 'YES (Accumulating)' : 'NO'}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                    <div className="text-slate-400">Low-Vol Upward Glide</div>
                    <div className={`font-bold ${footprint.darkHorseEvaluation.glideUnderway ? 'text-cyan-400' : 'text-slate-400'}`}>
                      {footprint.darkHorseEvaluation.glideUnderway ? 'ACTIVE' : 'INACTIVE'}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                    <div className="text-slate-400">Distribution Warning</div>
                    <div className={`font-bold ${footprint.darkHorseEvaluation.distributionAlert ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {footprint.darkHorseEvaluation.distributionAlert ? 'CRITICAL ALERT' : 'SAFE'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AI OPTIONS STRATEGY RECOMMENDATION */}
          {activeTab === 'options_ai' && (
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-indigo-950/30 border border-indigo-500/30 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-bold text-indigo-300">
                    AI Options Strategy Engine Grounded in Market Microstructure & Structural S/R
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Options strategies are algorithmically mapped against current implied volatility regime, Joe Granville quantity-price relations, and verified Support &amp; Resistance key levels.
                  </p>
                </div>
              </div>

              {/* Strategy Cards */}
              <div className="space-y-4">
                {optionStrategies.map((strat) => (
                  <div
                    key={strat.id}
                    className="p-4 rounded-lg bg-slate-850 border border-slate-750 hover:border-slate-650 transition-all space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{strat.name}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            strat.bias === 'BULLISH'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : strat.bias === 'BEARISH'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {strat.bias}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-400 font-mono">
                          {strat.category}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-slate-400">
                        Expiry: <strong className="text-white">{strat.recommendedExpiration}</strong>
                      </div>
                    </div>

                    {/* Strikes & Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-slate-500 block text-[10px]">Strikes Architecture</span>
                        <span className="font-bold text-indigo-300">{strat.strikesDescription}</span>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-slate-500 block text-[10px]">Breakeven Price</span>
                        <span className="font-bold text-white">{strat.breakeven}</span>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-slate-500 block text-[10px]">Max Profit</span>
                        <span className="font-bold text-emerald-400">{strat.maxProfit}</span>
                      </div>
                      <div className="p-2 rounded bg-slate-900 border border-slate-800">
                        <span className="text-slate-500 block text-[10px]">Risk / Reward</span>
                        <span className="font-bold text-amber-400">{strat.riskRewardRatio}</span>
                      </div>
                    </div>

                    {/* Rationale & Greeks */}
                    <div className="space-y-1 text-xs">
                      <p className="text-slate-300 leading-relaxed font-mono">
                        <strong className="text-slate-200">AI Rationale:</strong> {strat.rationale}
                      </p>
                      <div className="flex items-center gap-4 text-[11px] font-mono text-slate-400 pt-1">
                        <span>Delta: <strong className="text-slate-200">{strat.greeksContext.delta}</strong></span>
                        <span>Theta: <strong className="text-slate-200">{strat.greeksContext.theta}</strong></span>
                        <span>Vega: <strong className="text-slate-200">{strat.greeksContext.vega}</strong></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-800 bg-slate-950/80 text-xs text-slate-400">
          <span className="font-mono">Symbol: {quote.symbol} (${quote.price.toFixed(2)})</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 font-semibold cursor-pointer"
          >
            Close Intelligence Center
          </button>
        </div>
      </div>
    </div>
  );
};
