import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Check,
  Clock,
  Calendar,
  Layers,
  ShieldAlert,
  Lightbulb,
  ArrowRight,
  Zap,
  SlidersHorizontal,
  ChevronRight,
  Info,
  CheckCircle2,
  Circle
} from 'lucide-react';
import {
  IndicatorRecommendation,
  SWING_INDICATOR_PRESETS,
  DAY_TRADE_INDICATOR_PRESETS,
  IndicatorPresetFlags,
  INDICATOR_HIERARCHY_TIERS,
  HIERARCHY_PHILOSOPHY,
  IndicatorHierarchyTierId,
  getHierarchyTierFlags
} from '../services/aiIndicatorAdvisor';
import { SwingCandleInterval, TimeframeInterval } from '../types';

interface AIIndicatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRecommendation: IndicatorRecommendation;
  isDayTradeView: boolean;
  selectedInterval: string;
  selectedSwingInterval: SwingCandleInterval;
  onApplyPreset: (flags: IndicatorPresetFlags, presetTitle: string) => void;
  onSelectInterval?: (interval: TimeframeInterval) => void;
  onSelectSwingInterval?: (interval: SwingCandleInterval) => void;
  symbol: string;
}

export const AIIndicatorModal: React.FC<AIIndicatorModalProps> = ({
  isOpen,
  onClose,
  activeRecommendation,
  isDayTradeView,
  selectedInterval,
  selectedSwingInterval,
  onApplyPreset,
  symbol
}) => {
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'swing' | 'daytrade'>('hierarchy');
  const [justAppliedKey, setJustAppliedKey] = useState<string | null>(null);

  // Hierarchy Tier Selection State (Tier 1 is Highest Hierarchy and Default ON)
  const [selectedTiers, setSelectedTiers] = useState<IndicatorHierarchyTierId[]>(['tier1']);

  if (!isOpen) return null;

  const handleApplyPreset = (key: string, rec: IndicatorRecommendation) => {
    onApplyPreset(rec.activeFlags, `${rec.badge} (${rec.title})`);
    setJustAppliedKey(key);
    setTimeout(() => setJustAppliedKey(null), 2500);
  };

  const handleApplyHierarchy = (tierIds: IndicatorHierarchyTierId[], label: string) => {
    const flags = getHierarchyTierFlags(tierIds);
    onApplyPreset(flags, label);
    setJustAppliedKey('hierarchy');
    setTimeout(() => setJustAppliedKey(null), 2500);
  };

  const toggleTier = (tierId: IndicatorHierarchyTierId) => {
    setSelectedTiers((prev) => {
      if (prev.includes(tierId)) {
        // Prevent deselecting everything: keep at least tier1 or current selection
        if (prev.length === 1 && prev[0] === tierId) {
          return ['tier1'];
        }
        return prev.filter((id) => id !== tierId);
      } else {
        return [...prev, tierId];
      }
    });
  };

  const swingKeys: SwingCandleInterval[] = ['1d', '1wk', '1mo'];
  const dayTradeKeys = ['1m', '2m', '5m', '10m', '15m', '30m', '1h', '2h', '4h'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden my-4 sm:my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-950/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-white font-mono flex items-center gap-2">
                  AI Indicator Advisor &amp; Hierarchy Matrix
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {symbol}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400">
                Hierarchical indicator tiers &amp; auto-suggestions for Swing Range (Daily, Weekly, Monthly) and Day Trade (1m – 4h)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Timeframe Highlight Banner */}
        <div className="bg-gradient-to-r from-indigo-950/70 via-slate-900 to-purple-950/60 border-b border-indigo-900/40 px-5 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-3">
            <span className="px-2 py-1 rounded bg-indigo-600 text-white font-mono text-xs font-bold shadow-xs whitespace-nowrap">
              {isDayTradeView ? `${selectedInterval} Day Trade` : `${selectedSwingInterval.toUpperCase()} Swing`}
            </span>
            <div>
              <div className="text-xs font-bold text-slate-200">
                AI Preset: <span className="text-indigo-300">{activeRecommendation.title}</span>
              </div>
              <div className="text-[10.5px] text-slate-400 flex flex-wrap gap-1 mt-0.5">
                {activeRecommendation.primaryIndicators.map((ind, i) => (
                  <span
                    key={i}
                    className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold"
                    style={{ backgroundColor: `${ind.color}18`, color: ind.color, border: `1px solid ${ind.color}35` }}
                  >
                    {ind.name}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={() => handleApplyPreset('active', activeRecommendation)}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs font-mono transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer whitespace-nowrap self-start sm:self-auto"
          >
            {justAppliedKey === 'active' ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span className="text-emerald-200">Applied to Chart!</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-amber-300" />
                <span>Apply Current AI Setup</span>
              </>
            )}
          </button>
        </div>

        {/* Tab Navigation: Hierarchy vs Swing vs Day Trade */}
        <div className="flex items-center gap-1.5 px-4 sm:px-6 pt-3 pb-2 border-b border-slate-800 bg-slate-950/50 overflow-x-auto">
          <button
            onClick={() => setActiveTab('hierarchy')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'hierarchy'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-4 h-4 text-indigo-300" />
            <span>Indicator Hierarchy (Tiers 1–4)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
              Highest Default
            </span>
          </button>

          <button
            onClick={() => setActiveTab('swing')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'swing'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-4 h-4 text-blue-300" />
            <span>Swing Range Frameworks</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-800">
              Daily • Weekly • Monthly
            </span>
          </button>

          <button
            onClick={() => setActiveTab('daytrade')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'daytrade'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-300" />
            <span>Day Trade View Frameworks</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-300 border border-amber-800">
              1m – 4h
            </span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* TAB 1: HIERARCHY & MULTI-TIER CONFLUENCE VIEW */}
          {activeTab === 'hierarchy' && (
            <div className="space-y-6">
              {/* Rationale Banner: Why All Must Be Read */}
              <div className="rounded-xl p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 border border-indigo-500/30 shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                    <Lightbulb className="w-4 h-4" />
                  </div>
                  <div className="space-y-2 text-xs leading-relaxed">
                    <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                      <span>{HIERARCHY_PHILOSOPHY.title}</span>
                    </h3>
                    <p className="text-slate-300">
                      {HIERARCHY_PHILOSOPHY.summary}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2">
                      {HIERARCHY_PHILOSOPHY.principles.map((p, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px]">
                          <div className="font-mono font-bold text-indigo-300 mb-0.5 flex items-center gap-1.5">
                            <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-[10px] border border-indigo-500/30">
                              {p.tier}
                            </span>
                            <span>{p.name}</span>
                          </div>
                          <p className="text-slate-400">{p.detail}</p>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 text-[11.5px] font-semibold text-emerald-400 border-t border-slate-800">
                      ★ Confluence Rule: {HIERARCHY_PHILOSOPHY.conclusion}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Hierarchy Action Ribbon */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono font-bold text-slate-300">Quick Hierarchy Preset:</span>
                  <button
                    onClick={() => {
                      setSelectedTiers(['tier1']);
                      handleApplyHierarchy(['tier1'], 'Tier 1 Only (Highest Hierarchy Baseline)');
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all cursor-pointer border ${
                      selectedTiers.length === 1 && selectedTiers[0] === 'tier1'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-xs'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    ★ Tier 1 Highest (Default)
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTiers(['tier1', 'tier2']);
                      handleApplyHierarchy(['tier1', 'tier2'], 'Tier 1 + Tier 2 (Structure & Trend Bias)');
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all cursor-pointer border ${
                      selectedTiers.length === 2 && selectedTiers.includes('tier1') && selectedTiers.includes('tier2')
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/50 shadow-xs'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    Tier 1 + 2
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTiers(['tier1', 'tier2', 'tier3']);
                      handleApplyHierarchy(['tier1', 'tier2', 'tier3'], 'Tier 1 + 2 + 3 (Structure, Trend & Volume)');
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all cursor-pointer border ${
                      selectedTiers.length === 3 && !selectedTiers.includes('tier4')
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-xs'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    Tier 1 + 2 + 3
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTiers(['tier1', 'tier2', 'tier3', 'tier4']);
                      handleApplyHierarchy(['tier1', 'tier2', 'tier3', 'tier4'], 'All Tiers (Full Multi-Tier Confluence)');
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-all cursor-pointer border ${
                      selectedTiers.length === 4
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-xs'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    All Tiers (Full Confluence)
                  </button>
                </div>

                <button
                  onClick={() => handleApplyHierarchy(selectedTiers, `Selected Hierarchy Tiers (${selectedTiers.join(', ')})`)}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer ml-auto"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>Apply Selected Tiers to Chart</span>
                </button>
              </div>

              {/* Four Hierarchical Tiers Cards */}
              <div className="space-y-4">
                {INDICATOR_HIERARCHY_TIERS.map((tier) => {
                  const isSelected = selectedTiers.includes(tier.id);
                  const isTier1 = tier.id === 'tier1';

                  return (
                    <div
                      key={tier.id}
                      className={`rounded-xl p-5 border transition-all ${
                        isSelected
                          ? isTier1
                            ? 'bg-slate-900/95 border-rose-500/60 ring-1 ring-rose-500/30'
                            : 'bg-slate-900/90 border-indigo-500/60 ring-1 ring-indigo-500/30'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 opacity-80'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleTier(tier.id)}
                            className="cursor-pointer text-slate-400 hover:text-white"
                            aria-label={`Toggle ${tier.title}`}
                          >
                            {isSelected ? (
                              <CheckCircle2 className={`w-5 h-5 ${isTier1 ? 'text-rose-400' : 'text-indigo-400'}`} />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-600" />
                            )}
                          </button>
                          <div>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono border ${
                                  isTier1
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                    : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                                }`}
                              >
                                {tier.badge}
                              </span>
                              <h4 className="text-sm font-bold text-white font-mono">{tier.title}</h4>
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono mt-0.5 block">
                              {tier.rankLabel}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleTier(tier.id)}
                            className={`px-3 py-1 rounded-md text-xs font-mono font-semibold transition-all border cursor-pointer ${
                              isSelected
                                ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-500'
                            }`}
                          >
                            {isSelected ? 'Tier Active (Shown)' : 'Enable This Tier'}
                          </button>
                        </div>
                      </div>

                      {/* Tier Rationale & Why Must Read */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 text-xs bg-slate-950/70 p-3 rounded-lg border border-slate-800/80">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1 font-mono">
                            <Info className="w-3 h-3 text-indigo-400" />
                            <span>Hierarchy Rationale:</span>
                          </div>
                          <p className="text-slate-300 text-[11.5px] leading-relaxed">{tier.rationale}</p>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90 mb-1 flex items-center gap-1 font-mono">
                            <Check className="w-3 h-3 text-amber-400" />
                            <span>Why It Must Be Read:</span>
                          </div>
                          <p className="text-slate-300 text-[11.5px] leading-relaxed">{tier.whyMustRead}</p>
                        </div>
                      </div>

                      {/* Tier Indicators Pill Grid */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {tier.indicators.map((ind, i) => (
                          <div
                            key={i}
                            className="px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-2 border bg-slate-900/90"
                            style={{ borderColor: `${ind.color}40` }}
                            title={ind.description}
                          >
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: ind.color }} />
                            <span className="font-bold" style={{ color: ind.color }}>
                              {ind.name}
                            </span>
                            <span className="text-[10.5px] text-slate-400 border-l border-slate-800 pl-2">
                              {ind.categoryRole}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Tier 3 Discernibility Guide: Clear Contrast Between Volume Indicators */}
                      {tier.id === 'tier3' && (
                        <div className="mt-3.5 pt-3 border-t border-slate-800 space-y-2">
                          <div className="flex items-center gap-1.5 text-amber-400 font-mono font-bold text-[11px]">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Tier 3 Discernibility Matrix (Understanding the Differences):</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-sky-500/30">
                              <div className="text-sky-400 font-bold font-mono text-[11px] mb-1">
                                1. Volume Bars (Magnitude)
                              </div>
                              <p className="text-[10.5px] text-slate-300 leading-normal mb-1.5">
                                <b>What it answers:</b> How many shares/contracts exchanged hands during this specific candle?
                              </p>
                              <span className="text-[9.5px] text-slate-400 block border-t border-slate-800/80 pt-1">
                                Vertical histogram bar at the bottom. Color-coded green (buyers closed higher) or red (sellers closed lower).
                              </span>
                            </div>

                            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-cyan-500/30">
                              <div className="text-cyan-400 font-bold font-mono text-[11px] mb-1">
                                2. Vol MA 20 (Commitment)
                              </div>
                              <p className="text-[10.5px] text-slate-300 leading-normal mb-1.5">
                                <b>What it answers:</b> Is this move backed by institutional capital or retail noise?
                              </p>
                              <span className="text-[9.5px] text-slate-400 block border-t border-slate-800/80 pt-1">
                                Smooth rolling line. Volume &gt; 1.5x MA confirms institutional accumulation; volume &lt; 0.7x MA warns of dry-up traps.
                              </span>
                            </div>

                            <div className="p-2.5 rounded-lg bg-slate-950/80 border border-amber-500/30">
                              <div className="text-amber-400 font-bold font-mono text-[11px] mb-1">
                                3. Volume Profile (Price Liquidity)
                              </div>
                              <p className="text-[10.5px] text-slate-300 leading-normal mb-1.5">
                                <b>What it answers:</b> At WHAT PRICE LEVEL did institutions transact the bulk of shares?
                              </p>
                              <span className="text-[9.5px] text-slate-400 block border-t border-slate-800/80 pt-1">
                                Horizontal profile. Highlights Point of Control (POC), Value Area (70%), HVN (magnets), and LVN (slippage voids).
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: SWING RANGE FRAMEWORKS (Daily, Weekly, Monthly) */}
          {activeTab === 'swing' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {swingKeys.map((key) => {
                const rec = SWING_INDICATOR_PRESETS[key];
                const isCurrentActive = !isDayTradeView && selectedSwingInterval === key;
                const isApplied = justAppliedKey === key;

                return (
                  <div
                    key={key}
                    className={`rounded-xl p-5 border transition-all flex flex-col justify-between ${
                      isCurrentActive
                        ? 'bg-slate-900/90 border-blue-500/60 ring-1 ring-blue-500/40 shadow-lg shadow-blue-500/10'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Card Top */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-blue-500/20 text-blue-300 border border-blue-500/40">
                          {rec.badge}
                        </span>
                        {isCurrentActive && (
                          <span className="text-[10px] font-bold text-blue-400 uppercase font-mono tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                            Active Period
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-white mb-1">{rec.title}</h3>
                      <p className="text-xs text-slate-400 mb-3">{rec.objective}</p>

                      {/* Primary Indicators Tag Cloud */}
                      <div className="mb-4">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 font-mono">
                          AI Selected Hierarchy Stack:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {rec.primaryIndicators.map((ind, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded text-[10.5px] font-semibold font-mono"
                              style={{
                                backgroundColor: `${ind.color}15`,
                                color: ind.color,
                                border: `1px solid ${ind.color}40`
                              }}
                              title={ind.role}
                            >
                              {ind.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* AI Rationale */}
                      <div className="mb-3.5 bg-slate-900/80 rounded-lg p-3 border border-slate-800 text-[11.5px] text-slate-300 leading-relaxed">
                        <div className="flex items-center gap-1 text-indigo-400 font-bold mb-1 font-mono text-[10.5px]">
                          <Lightbulb className="w-3 h-3" />
                          <span>AI RATIONALE:</span>
                        </div>
                        {rec.rationale}
                      </div>

                      {/* Tactics */}
                      <div className="mb-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 font-mono">
                          Trade Execution Tactics:
                        </div>
                        <ul className="space-y-1 text-[11px] text-slate-300">
                          {rec.tactics.slice(0, 3).map((t, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <ArrowRight className="w-3 h-3 text-blue-400 shrink-0 mt-0.5" />
                              <span>{t}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Risk Tip */}
                      <div className="p-2.5 rounded bg-rose-950/20 border border-rose-900/30 text-[10.5px] text-rose-300/90 flex items-start gap-1.5 mb-4">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <span>{rec.riskTip}</span>
                      </div>
                    </div>

                    {/* Apply Button */}
                    <button
                      onClick={() => handleApplyPreset(key, rec)}
                      className={`w-full py-2 rounded-lg font-mono text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                        isApplied
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                          : isCurrentActive
                          ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500 shadow-sm'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      }`}
                    >
                      {isApplied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Applied to Chart</span>
                        </>
                      ) : (
                        <>
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          <span>Apply {rec.badge} Setup</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: DAY TRADE VIEW FRAMEWORKS (1m – 4h) */}
          {activeTab === 'daytrade' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {dayTradeKeys.map((key) => {
                const rec = DAY_TRADE_INDICATOR_PRESETS[key];
                if (!rec) return null;
                const isCurrentActive = isDayTradeView && selectedInterval === key;
                const isApplied = justAppliedKey === key;

                return (
                  <div
                    key={key}
                    className={`rounded-xl p-5 border transition-all flex flex-col justify-between ${
                      isCurrentActive
                        ? 'bg-slate-900/90 border-amber-500/60 ring-1 ring-amber-500/40 shadow-lg shadow-amber-500/10'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Card Top */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          {rec.badge}
                        </span>
                        {isCurrentActive && (
                          <span className="text-[10px] font-bold text-amber-400 uppercase font-mono tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                            Active Bar
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-white mb-1">{rec.title}</h3>
                      <p className="text-xs text-slate-400 mb-3">{rec.objective}</p>

                      {/* Primary Indicators Tag Cloud */}
                      <div className="mb-4">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 font-mono">
                          AI Selected Hierarchy Stack:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {rec.primaryIndicators.map((ind, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded text-[10.5px] font-semibold font-mono"
                              style={{
                                backgroundColor: `${ind.color}15`,
                                color: ind.color,
                                border: `1px solid ${ind.color}40`
                              }}
                              title={ind.role}
                            >
                              {ind.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* AI Rationale */}
                      <div className="mb-3.5 bg-slate-900/80 rounded-lg p-3 border border-slate-800 text-[11.5px] text-slate-300 leading-relaxed">
                        <div className="flex items-center gap-1 text-amber-400 font-bold mb-1 font-mono text-[10.5px]">
                          <Lightbulb className="w-3 h-3" />
                          <span>AI RATIONALE:</span>
                        </div>
                        {rec.rationale}
                      </div>

                      {/* Tactics */}
                      <div className="mb-3">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 font-mono">
                          Intraday Tactics:
                        </div>
                        <ul className="space-y-1 text-[11px] text-slate-300">
                          {rec.tactics.slice(0, 3).map((t, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <ArrowRight className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                              <span>{t}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Risk Tip */}
                      <div className="p-2.5 rounded bg-rose-950/20 border border-rose-900/30 text-[10.5px] text-rose-300/90 flex items-start gap-1.5 mb-4">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <span>{rec.riskTip}</span>
                      </div>
                    </div>

                    {/* Apply Button */}
                    <button
                      onClick={() => handleApplyPreset(key, rec)}
                      className={`w-full py-2 rounded-lg font-mono text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer border ${
                        isApplied
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                          : isCurrentActive
                          ? 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500 shadow-sm'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                      }`}
                    >
                      {isApplied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Applied to Chart</span>
                        </>
                      ) : (
                        <>
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                          <span>Apply {rec.badge} Setup</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
