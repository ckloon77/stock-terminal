import React, { useState } from 'react';
import {
  Gauge,
  Activity,
  Maximize2,
  GitCommit,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  BarChart2,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { TechnicalIndicators, StockQuote } from '../types';

interface IndicatorsPanelProps {
  indicators: TechnicalIndicators;
  quote: StockQuote;
}

const formatVolume = (val: number): string => {
  if (isNaN(val) || val === 0) return '0';
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(2)}B`;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return val.toFixed(0);
};

export const IndicatorsPanel: React.FC<IndicatorsPanelProps> = ({ indicators, quote }) => {
  const [activeTab, setActiveTab] = useState<'oscillators' | 'volumeProfile'>('volumeProfile');
  const [selectedBinIndex, setSelectedBinIndex] = useState<number | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { rsi, macd, bollinger, atr, volumeProfile } = indicators;

  // RSI status
  const isRsiOverbought = rsi >= 70;
  const isRsiOversold = rsi <= 30;
  const rsiZone = isRsiOverbought ? 'OVERBOUGHT' : isRsiOversold ? 'OVERSOLD' : 'NEUTRAL';

  // MACD status
  const isMacdBullish = macd.histogram > 0 && macd.macdLine > macd.signalLine;
  const isMacdBearish = macd.histogram < 0 && macd.macdLine < macd.signalLine;

  // Volume Profile Metrics
  const vp = volumeProfile;
  const distFromPocPct = vp ? ((quote.price - vp.pocPrice) / vp.pocPrice) * 100 : 0;
  const vaSpread = vp ? vp.vah - vp.val : 0;
  const vaSpreadPct = vp && vp.val > 0 ? (vaSpread / vp.val) * 100 : 0;

  return (
    <div id="technical-indicators-panel" className="w-full bg-slate-900 border-b border-slate-800 px-6 py-5 text-slate-200">
      <div className="max-w-7xl mx-auto">
        {/* Panel Header & Tab Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <h2 className="text-xs font-bold uppercase text-slate-500 tracking-widest">
                Technical Sentiment &amp; Market Dynamics
              </h2>
            </div>

            {/* Tab Pill Buttons */}
            <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950 p-1">
              <button
                onClick={() => setActiveTab('volumeProfile')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer font-mono ${
                  activeTab === 'volumeProfile'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                Volume Profile Analysis
                {vp && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-amber-500/30 text-amber-200 font-bold">
                    POC ${vp.pocPrice.toFixed(2)}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('oscillators')}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center gap-1.5 cursor-pointer font-mono ${
                  activeTab === 'oscillators'
                    ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Gauge className="w-3.5 h-3.5 text-blue-400" />
                Oscillators &amp; Momentum
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
            {activeTab === 'volumeProfile' && vp && (
              <span className="hidden sm:flex items-center gap-2">
                <span>Total Vol: <b className="text-slate-200">{formatVolume(vp.totalVolume)}</b></span>
                <span className="text-slate-700">|</span>
                <span>VA: <b className="text-sky-300">${vp.val.toFixed(2)} - ${vp.vah.toFixed(2)}</b></span>
              </span>
            )}
            {activeTab === 'oscillators' && (
              <span className="hidden sm:inline">Real-time multi-oscillator analytics</span>
            )}
            <button
              id="toggle-indicators-panel-collapse-btn"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="px-2 py-1 rounded text-xs text-slate-300 hover:text-white bg-slate-950 hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer font-mono border border-slate-800 shadow-xs"
              title={isCollapsed ? 'Expand Technical Indicators Panel' : 'Collapse Indicators Panel'}
            >
              <span>{isCollapsed ? 'Expand Panel' : 'Collapse'}</span>
              {isCollapsed ? <ChevronDown className="w-3.5 h-3.5 text-blue-400" /> : <ChevronUp className="w-3.5 h-3.5 text-slate-400" />}
            </button>
          </div>
        </div>

        {!isCollapsed && (
          <>
        {/* ------------------------------------------------------------- */}
        {/* TAB 1: VOLUME PROFILE ANALYSIS VIEW                          */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'volumeProfile' && vp && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Point of Control (POC) */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col justify-between hover:border-amber-500/40 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      Point of Control (POC)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      HIGH LIQUIDITY
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold font-mono text-white">
                      ${vp.pocPrice.toFixed(2)}
                    </span>
                    <span
                      className={`text-xs font-mono font-semibold ${
                        distFromPocPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {distFromPocPct >= 0 ? '+' : ''}{distFromPocPct.toFixed(2)}% vs Current
                    </span>
                  </div>

                  <div className="mt-3 text-xs font-mono text-slate-400 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Volume at POC:</span>
                      <span className="text-slate-200 font-bold">{formatVolume(vp.pocVolume)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Share of Total:</span>
                      <span className="text-amber-300 font-bold">
                        {((vp.pocVolume / (vp.totalVolume || 1)) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 mt-3 pt-2 border-t border-slate-800 leading-relaxed">
                  POC is the single highest-volume price tier. It acts as an institutional gravitational magnet.
                </div>
              </div>

              {/* Card 2: 70% Value Area Range */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col justify-between hover:border-sky-500/40 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                      <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                      70% Value Area (VA)
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                        vp.currentPriceStatus === 'ABOVE_VAH'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : vp.currentPriceStatus === 'BELOW_VAL'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : vp.currentPriceStatus === 'AT_POC'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                      }`}
                    >
                      {vp.currentPriceStatus === 'ABOVE_VAH'
                        ? 'ABOVE VAH'
                        : vp.currentPriceStatus === 'BELOW_VAL'
                        ? 'BELOW VAL'
                        : vp.currentPriceStatus === 'AT_POC'
                        ? 'AT POC'
                        : 'INSIDE VALUE'}
                    </span>
                  </div>

                  <div className="space-y-1.5 mt-2 text-xs font-mono">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-slate-500">VAH (Ceiling):</span>
                      <span className="text-sky-300 font-bold">${vp.vah.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-slate-500">VAL (Floor):</span>
                      <span className="text-sky-300 font-bold">${vp.val.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-slate-500">VA Spread:</span>
                      <span className="text-slate-200 font-semibold">
                        ${vaSpread.toFixed(2)} ({vaSpreadPct.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 mt-3 pt-2 border-t border-slate-800 leading-relaxed">
                  {vp.currentPriceStatus === 'ABOVE_VAH'
                    ? 'Price accepted above Value Area High. Buyers seeking higher price discovery.'
                    : vp.currentPriceStatus === 'BELOW_VAL'
                    ? 'Price rejected below Value Area Low. Sellers dominant in discovery.'
                    : 'Trading inside institutional value area. Likely mean-reverting rotation.'}
                </div>
              </div>

              {/* Card 3: Order Flow Volume Delta */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col justify-between hover:border-emerald-500/40 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                      <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />
                      Order Flow Delta
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                        vp.buyRatio > 0.52
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : vp.buyRatio < 0.48
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {vp.buyRatio > 0.52 ? 'NET BUYERS' : vp.buyRatio < 0.48 ? 'NET SELLERS' : 'BALANCED'}
                    </span>
                  </div>

                  {/* Ratio bar */}
                  <div className="mt-2">
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-emerald-400 font-bold">
                        {(vp.buyRatio * 100).toFixed(0)}% Buy
                      </span>
                      <span className="text-rose-400 font-bold">
                        {((1 - vp.buyRatio) * 100).toFixed(0)}% Sell
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{ width: `${Math.round(vp.buyRatio * 100)}%` }}
                      />
                      <div
                        className="h-full bg-rose-500 transition-all duration-500"
                        style={{ width: `${Math.round((1 - vp.buyRatio) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-3 text-xs font-mono text-slate-400 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Aggressive Buy Vol:</span>
                      <span className="text-emerald-400">{formatVolume(vp.totalBuyVolume)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Defensive Sell Vol:</span>
                      <span className="text-rose-400">{formatVolume(vp.totalSellVolume)}</span>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 mt-3 pt-2 border-t border-slate-800 leading-relaxed">
                  Aggressive bid volume vs offer liquidation computed across all historical candles.
                </div>
              </div>

              {/* Card 4: High & Low Volume Nodes */}
              <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col justify-between hover:border-indigo-500/40 transition-colors">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                      <GitCommit className="w-3.5 h-3.5 text-indigo-400" />
                      Key Liquidity Nodes
                    </span>
                    <span className="text-[10px] font-mono font-semibold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">
                      HVN / LVN
                    </span>
                  </div>

                  <div className="space-y-2 mt-2 text-xs font-mono">
                    <div>
                      <span className="text-indigo-300 font-semibold text-[11px] flex items-center gap-1">
                        High Volume Nodes (Support/Resist):
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {vp.highVolumeNodes.length > 0 ? (
                          vp.highVolumeNodes.slice(0, 3).map((price, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px]"
                            >
                              ${price.toFixed(2)}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 text-[11px]">Concentrated at POC</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-amber-300 font-semibold text-[11px] flex items-center gap-1">
                        Low Volume Nodes (Breakout Slipways):
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {vp.lowVolumeNodes.length > 0 ? (
                          vp.lowVolumeNodes.slice(0, 3).map((price, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]"
                            >
                              ${price.toFixed(2)}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 text-[11px]">Uniform liquidity profile</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 mt-3 pt-2 border-t border-slate-800 leading-relaxed">
                  HVNs represent high liquidity stall zones; LVNs are thin areas where price travels rapidly.
                </div>
              </div>
            </div>

            {/* Interactive Volume Profile Price Ladder */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">
                    Volume Profile Price Distribution Ladder
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    (Horizontal auction depth &amp; order-flow split)
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block"></span>
                    Buy Vol
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block"></span>
                    Sell Vol
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-300">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 border border-amber-300 inline-block"></span>
                    ★ POC
                  </span>
                  <span className="flex items-center gap-1.5 text-sky-300">
                    <span className="w-2.5 h-2.5 rounded-sm bg-sky-500/40 border border-sky-400 inline-block"></span>
                    VA (70%)
                  </span>
                </div>
              </div>

              {/* Price Ladder Bins (Sorted Highest Price to Lowest Price) */}
              <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                {[...vp.bins]
                  .sort((a, b) => b.priceMid - a.priceMid)
                  .map((bin) => {
                    const isSelected = selectedBinIndex === bin.binIndex;
                    const buyPct = bin.totalVolume > 0 ? (bin.buyVolume / bin.totalVolume) * 100 : 50;

                    return (
                      <div
                        key={bin.binIndex}
                        onClick={() => setSelectedBinIndex(isSelected ? null : bin.binIndex)}
                        className={`flex items-center gap-3 px-2 py-1 rounded text-xs font-mono cursor-pointer transition-colors ${
                          bin.isPoc
                            ? 'bg-amber-950/30 border border-amber-500/40'
                            : bin.isValueArea
                            ? 'bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800'
                            : 'bg-slate-950/60 hover:bg-slate-900/60 border border-transparent'
                        } ${isSelected ? 'ring-1 ring-blue-400' : ''}`}
                      >
                        {/* Price Range */}
                        <div className="w-28 flex items-center justify-between text-slate-300">
                          <span className={bin.isPoc ? 'text-amber-300 font-bold' : ''}>
                            ${bin.priceLow.toFixed(2)}
                          </span>
                          <span className="text-slate-600">-</span>
                          <span className={bin.isPoc ? 'text-amber-300 font-bold' : ''}>
                            ${bin.priceHigh.toFixed(2)}
                          </span>
                        </div>

                        {/* Badges */}
                        <div className="w-16 flex items-center">
                          {bin.isPoc ? (
                            <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 text-[9px] font-bold">
                              ★ POC
                            </span>
                          ) : bin.isValueArea ? (
                            <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 text-[9px] font-semibold border border-sky-500/30">
                              VA 70%
                            </span>
                          ) : bin.isHvn ? (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[9px]">
                              HVN
                            </span>
                          ) : bin.isLvn ? (
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-500 text-[9px]">
                              LVN
                            </span>
                          ) : null}
                        </div>

                        {/* Volume Bar & Buy/Sell Split */}
                        <div className="flex-1 flex items-center gap-2">
                          <div className="flex-1 h-3 bg-slate-800 rounded-sm overflow-hidden flex">
                            <div
                              style={{ width: `${(bin.percentOfMax * 100).toFixed(1)}%` }}
                              className="h-full flex overflow-hidden rounded-sm"
                            >
                              <div
                                style={{ width: `${buyPct.toFixed(1)}%` }}
                                className={`h-full ${bin.isPoc ? 'bg-emerald-400' : 'bg-emerald-500'}`}
                                title={`Buy Volume: ${formatVolume(bin.buyVolume)}`}
                              />
                              <div
                                style={{ width: `${(100 - buyPct).toFixed(1)}%` }}
                                className={`h-full ${bin.isPoc ? 'bg-rose-400' : 'bg-rose-500'}`}
                                title={`Sell Volume: ${formatVolume(bin.sellVolume)}`}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Total Volume */}
                        <div className="w-20 text-right font-bold text-slate-300">
                          {formatVolume(bin.totalVolume)}
                        </div>

                        {/* Buy/Sell % */}
                        <div className="w-20 text-right text-[11px] text-slate-400">
                          <span className="text-emerald-400">{buyPct.toFixed(0)}%B</span>
                          <span className="text-slate-600"> / </span>
                          <span className="text-rose-400">{(100 - buyPct).toFixed(0)}%S</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* TAB 2: CLASSIC OSCILLATORS & MOMENTUM VIEW                   */}
        {/* ------------------------------------------------------------- */}
        {activeTab === 'oscillators' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: RSI (14) */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-blue-400" />
                    RSI (14-Period)
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                      isRsiOverbought
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : isRsiOversold
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {rsiZone}
                  </span>
                </div>

                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold font-mono text-white">
                    {rsi.toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">/ 100</span>
                </div>

                {/* RSI Visual Scale Bar */}
                <div className="mt-3 relative">
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                    <div className="h-full bg-emerald-500/60 w-[30%]" title="Oversold (0-30)"></div>
                    <div className="h-full bg-slate-700 w-[40%]" title="Neutral (30-70)"></div>
                    <div className="h-full bg-rose-500/60 w-[30%]" title="Overbought (70-100)"></div>
                  </div>
                  {/* Pointer Marker */}
                  <div
                    className="absolute top-0 -mt-1 w-1.5 h-3.5 bg-white rounded-full shadow-md -translate-x-1/2 transition-all duration-300"
                    style={{ left: `${Math.min(100, Math.max(0, rsi))}%` }}
                  />
                </div>
              </div>

              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-3 pt-2 border-t border-slate-800">
                <span>Oversold: &le;30</span>
                <span>Neutral: 50</span>
                <span>Overbought: &ge;70</span>
              </div>
            </div>

            {/* Card 2: MACD (12, 26, 9) */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-indigo-400" />
                    MACD (12, 26, 9)
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 font-mono ${
                      isMacdBullish
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : isMacdBearish
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {isMacdBullish ? (
                      <>
                        <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                        BULLISH CROSS
                      </>
                    ) : isMacdBearish ? (
                      <>
                        <ArrowDownRight className="w-3 h-3 text-rose-400" />
                        BEARISH CROSS
                      </>
                    ) : (
                      <>
                        <Minus className="w-3 h-3 text-slate-400" />
                        NEUTRAL
                      </>
                    )}
                  </span>
                </div>

                <div className="flex items-baseline gap-3 mt-1">
                  <div>
                    <span className="text-[11px] text-slate-500">Histogram</span>
                    <div
                      className={`text-xl font-bold font-mono ${
                        macd.histogram >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {macd.histogram >= 0 ? '+' : ''}
                      {macd.histogram.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 pl-3 border-l border-slate-800 font-mono">
                    <div>MACD: <span className="text-slate-200 font-semibold">{macd.macdLine.toFixed(2)}</span></div>
                    <div>Signal: <span className="text-slate-200 font-semibold">{macd.signalLine.toFixed(2)}</span></div>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-800 flex items-center justify-between">
                <span>Momentum:</span>
                <span className={macd.histogram >= 0 ? 'text-emerald-400 font-semibold font-mono' : 'text-rose-400 font-semibold font-mono'}>
                  {macd.histogram >= 0 ? 'Accelerating Upwards' : 'Decelerating'}
                </span>
              </div>
            </div>

            {/* Card 3: Bollinger Bands (20, 2) */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                    Bollinger Bands
                  </span>
                  <span className="text-[10px] font-mono font-semibold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    Width: {bollinger.bandwidth.toFixed(1)}%
                  </span>
                </div>

                <div className="space-y-1.5 mt-2 text-xs font-mono">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="text-[11px]">Upper Band (+2σ):</span>
                    <span className="text-rose-300 font-bold">${bollinger.upper.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="text-[11px]">Middle (SMA20):</span>
                    <span className="text-slate-200 font-bold">${bollinger.middle.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="text-[11px]">Lower Band (-2σ):</span>
                    <span className="text-emerald-300 font-bold">${bollinger.lower.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-800 flex items-center justify-between">
                <span>Band Squeeze:</span>
                <span className={bollinger.bandwidth < 8 ? 'text-amber-400 font-semibold font-mono' : 'text-slate-300 font-mono'}>
                  {bollinger.bandwidth < 8 ? 'Squeeze Alert (Breakout)' : 'Normal Volatility'}
                </span>
              </div>
            </div>

            {/* Card 4: Moving Average Alignment & ATR */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                    <GitCommit className="w-3.5 h-3.5 text-amber-400" />
                    Trend Alignment
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                      indicators.goldenCross
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {indicators.goldenCross ? 'GOLDEN CROSS' : 'STANDARD'}
                  </span>
                </div>

                <div className="space-y-1.5 mt-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Price vs SMA 50:</span>
                    <span className={`font-mono font-semibold ${indicators.priceAboveSma50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {indicators.priceAboveSma50 ? 'ABOVE (Bullish)' : 'BELOW (Bearish)'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">EMA Ribbon (9/21):</span>
                    <span className={`font-mono font-semibold ${indicators.emaBullishCross ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {indicators.emaBullishCross ? '9 > 21 (Bullish)' : '9 < 21 (Bearish)'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">ATR(14) Volatility:</span>
                    <span className="text-blue-400 font-mono font-bold">${atr.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 mt-3 pt-2 border-t border-slate-800 flex items-center justify-between">
                <span>Suggested Stop:</span>
                <span className="font-mono text-slate-200">
                  1.5 ATR (~${(atr * 1.5).toFixed(2)})
                </span>
              </div>
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
};
