import React, { useMemo } from 'react';
import { Candle, SubPanelIndicatorType } from '../types';
import { calculateRSI, calculateMACD, calculateSMA } from '../services/indicators';
import { Layers, Activity, BarChart2, TrendingUp, Sliders, AlertCircle, X } from 'lucide-react';

interface SubPanelIndicatorsProps {
  candles: Candle[];
  visibleStartIndex: number;
  visibleEndIndex: number;
  chartAreaWidth: number;
  paddingLeft: number;
  paddingRight: number;
  activePanels: SubPanelIndicatorType[];
  onTogglePanel: (panel: SubPanelIndicatorType) => void;
  volumeMaPeriod: number;
  onChangeVolumeMaPeriod: (period: number) => void;
  hoverIndex: number | null;
}

export const ALL_SUB_PANEL_OPTIONS: {
  type: SubPanelIndicatorType;
  name: string;
  shortName: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    type: 'VOLUME',
    name: 'Volume & Volume MA',
    shortName: 'VOL',
    description: 'Trading volume bars with customizable moving average institutional baseline',
    icon: BarChart2
  },
  {
    type: 'RSI',
    name: 'RSI (Relative Strength Index 14)',
    shortName: 'RSI',
    description: '14-period momentum oscillator with 70/30 overbought/oversold bands',
    icon: Activity
  },
  {
    type: 'MACD',
    name: 'MACD (12, 26, 9)',
    shortName: 'MACD',
    description: 'Trend-following momentum with MACD line, Signal line, and colored Histogram',
    icon: TrendingUp
  },
  {
    type: 'STOCHASTIC',
    name: 'Stochastic Oscillator (14, 3)',
    shortName: 'STOCH',
    description: 'Momentum indicator comparing closing price to range over 14 bars',
    icon: Sliders
  },
  {
    type: 'MFI',
    name: 'Money Flow Index (MFI 14)',
    shortName: 'MFI',
    description: 'Volume-weighted RSI measuring buying and selling pressure momentum',
    icon: Layers
  }
];

export const SubPanelIndicators: React.FC<SubPanelIndicatorsProps> = ({
  candles,
  visibleStartIndex,
  visibleEndIndex,
  chartAreaWidth,
  paddingLeft,
  paddingRight,
  activePanels,
  onTogglePanel,
  volumeMaPeriod,
  onChangeVolumeMaPeriod,
  hoverIndex
}) => {
  const n = candles.length;
  const closes = useMemo(() => candles.map((c) => c.close), [candles]);
  const volumes = useMemo(() => candles.map((c) => c.volume), [candles]);

  // Compute indicator series
  const rsiSeries = useMemo(() => calculateRSI(closes, 14), [closes]);
  const macdData = useMemo(() => calculateMACD(closes, 12, 26, 9), [closes]);
  const volumeMaSeries = useMemo(() => calculateSMA(volumes, volumeMaPeriod), [volumes, volumeMaPeriod]);

  // Stochastic %K (14) and %D (3)
  const stochData = useMemo(() => {
    const kSeries: number[] = [];
    const period = 14;
    for (let i = 0; i < n; i++) {
      if (i < period - 1) {
        kSeries.push(NaN);
      } else {
        const slice = candles.slice(i - period + 1, i + 1);
        const highestHigh = Math.max(...slice.map((c) => c.high));
        const lowestLow = Math.min(...slice.map((c) => c.low));
        const currentClose = candles[i].close;
        const span = highestHigh - lowestLow;
        const k = span === 0 ? 50 : ((currentClose - lowestLow) / span) * 100;
        kSeries.push(k);
      }
    }
    const dSeries = calculateSMA(kSeries.map((v) => (isNaN(v) ? 50 : v)), 3);
    return { k: kSeries, d: dSeries };
  }, [candles, n]);

  // Money Flow Index (14)
  const mfiSeries = useMemo(() => {
    const period = 14;
    const result: number[] = [];
    if (n < period + 1) return candles.map(() => 50);

    const typicalPrices = candles.map((c) => (c.high + c.low + c.close) / 3);
    const rawMoneyFlow = typicalPrices.map((tp, i) => tp * (candles[i].volume || 1));

    for (let i = 0; i < n; i++) {
      if (i < period) {
        result.push(NaN);
      } else {
        let posFlow = 0;
        let negFlow = 0;
        for (let j = i - period + 1; j <= i; j++) {
          if (typicalPrices[j] > typicalPrices[j - 1]) {
            posFlow += rawMoneyFlow[j];
          } else if (typicalPrices[j] < typicalPrices[j - 1]) {
            negFlow += rawMoneyFlow[j];
          }
        }
        const moneyRatio = negFlow === 0 ? 100 : posFlow / negFlow;
        const mfi = 100 - 100 / (1 + moneyRatio);
        result.push(Number(mfi.toFixed(2)));
      }
    }
    return result;
  }, [candles, n]);

  // Viewport mapping
  const totalSlots = Math.max(1, visibleEndIndex - visibleStartIndex);
  const candleWidth = Math.max(4.5, (chartAreaWidth / totalSlots) * 0.75);

  const getX = (index: number) => {
    const offset = index - visibleStartIndex;
    return paddingLeft + offset * (chartAreaWidth / totalSlots) + (chartAreaWidth / totalSlots) / 2;
  };

  const svgWidth = paddingLeft + chartAreaWidth + paddingRight;
  const panelHeight = 84; // Compact responsive height per sub-panel

  if (activePanels.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-slate-900 border-t border-slate-800 flex flex-col select-none">
      {/* Sub-Panel Selector Ribbon */}
      <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-slate-950/80 border-b border-slate-800 text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-1.5 font-mono">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-bold text-slate-200">Sub-Panels:</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
            {activePanels.length}/3 Active (Max 3)
          </span>
        </div>

        <div className="flex items-center flex-wrap gap-1.5">
          {ALL_SUB_PANEL_OPTIONS.map((opt) => {
            const isActive = activePanels.includes(opt.type);
            const isLimitReached = activePanels.length >= 3 && !isActive;
            const Icon = opt.icon;

            return (
              <button
                key={opt.type}
                id={`subpanel-toggle-${opt.type.toLowerCase()}-btn`}
                onClick={() => onTogglePanel(opt.type)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium transition-all flex items-center gap-1 cursor-pointer border ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-xs'
                    : isLimitReached
                    ? 'bg-slate-900/50 text-slate-600 border-slate-850 cursor-not-allowed'
                    : 'bg-slate-850 text-slate-400 border-slate-750 hover:bg-slate-800 hover:text-slate-200'
                }`}
                title={
                  isLimitReached
                    ? 'Maximum 3 sub-panels reached. Toggle one off first to enable this one.'
                    : `${opt.name} - ${opt.description}`
                }
              >
                <Icon className="w-3 h-3" />
                <span>{opt.shortName}</span>
                {isActive && <span className="text-[9px] font-bold">✓</span>}
              </button>
            );
          })}

          {/* Volume MA Period selector if Volume panel is active */}
          {activePanels.includes('VOLUME') && (
            <div className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-800 text-[10px] font-mono">
              <span className="text-slate-400">Vol MA:</span>
              {[10, 20, 50].map((p) => (
                <button
                  key={p}
                  onClick={() => onChangeVolumeMaPeriod(p)}
                  className={`px-1.5 py-0.2 rounded font-bold transition-all ${
                    volumeMaPeriod === p
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Render Active Sub-Panels */}
      <div className="divide-y divide-slate-800/80">
        {activePanels.map((panelType) => {
          if (panelType === 'VOLUME') {
            // Volume Histogram + Volume MA
            const visibleVols = candles
              .slice(visibleStartIndex, visibleEndIndex)
              .map((c) => c.volume);
            const maxVol = Math.max(...visibleVols, 1000);
            const volYScale = (v: number) => panelHeight - (v / maxVol) * (panelHeight - 14) - 2;

            const inspectedIndex = hoverIndex !== null && hoverIndex >= visibleStartIndex && hoverIndex < visibleEndIndex ? hoverIndex : n - 1;
            const curVol = candles[inspectedIndex]?.volume || 0;
            const curVolMa = volumeMaSeries[inspectedIndex] || 0;
            const isSurge = curVolMa > 0 && curVol >= curVolMa * 1.5;

            return (
              <div key="panel-volume" className="relative w-full bg-slate-950/40">
                <div className="absolute top-1 left-3 z-10 flex items-center gap-2 text-[10px] font-mono pointer-events-none">
                  <span className="font-bold text-slate-300">Volume</span>
                  <span className="text-emerald-400 font-semibold">{curVol.toLocaleString()}</span>
                  <span className="text-amber-400 font-semibold">MA({volumeMaPeriod}): {Math.round(curVolMa).toLocaleString()}</span>
                  {isSurge && (
                    <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                      ★ Institutional Surge
                    </span>
                  )}
                </div>

                <div className="absolute top-1 right-3 z-10 flex items-center gap-1">
                  <button
                    onClick={() => onTogglePanel('VOLUME')}
                    className="p-0.5 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                    title="Close Volume sub-panel"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                <svg width="100%" height={panelHeight} viewBox={`0 0 ${svgWidth} ${panelHeight}`} preserveAspectRatio="none" className="w-full block">
                  {/* Zero baseline */}
                  <line x1={paddingLeft} y1={panelHeight - 2} x2={paddingLeft + chartAreaWidth} y2={panelHeight - 2} stroke="#334155" strokeWidth={0.8} />

                  {/* Volume Bars */}
                  {candles.slice(visibleStartIndex, visibleEndIndex).map((c, i) => {
                    const actualIdx = visibleStartIndex + i;
                    const x = getX(actualIdx);
                    const y = volYScale(c.volume);
                    const h = Math.max(1, panelHeight - 2 - y);
                    const isUp = c.close >= c.open;
                    const isInstSurge = volumeMaSeries[actualIdx] > 0 && c.volume >= volumeMaSeries[actualIdx] * 1.5;

                    return (
                      <rect
                        key={`subvol-${actualIdx}`}
                        x={x - candleWidth / 2}
                        y={y}
                        width={candleWidth}
                        height={h}
                        fill={
                          isInstSurge
                            ? isUp
                              ? '#06b6d4' // Cyan for institutional surge up
                              : '#a855f7' // Purple for institutional surge down
                            : isUp
                            ? '#10b981'
                            : '#ef4444'
                        }
                        opacity={isInstSurge ? 0.95 : 0.65}
                      />
                    );
                  })}

                  {/* Volume MA Line */}
                  <path
                    d={candles
                      .slice(visibleStartIndex, visibleEndIndex)
                      .map((_, i) => {
                        const actualIdx = visibleStartIndex + i;
                        const vMa = volumeMaSeries[actualIdx];
                        if (isNaN(vMa)) return '';
                        const x = getX(actualIdx);
                        const y = volYScale(vMa);
                        return `${i === 0 || isNaN(volumeMaSeries[actualIdx - 1]) ? 'M' : 'L'} ${x} ${y}`;
                      })
                      .filter(Boolean)
                      .join(' ')}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                  />
                </svg>
              </div>
            );
          }

          if (panelType === 'RSI') {
            // RSI 14 with 70 / 50 / 30 guide lines
            const inspectedIndex = hoverIndex !== null && hoverIndex >= visibleStartIndex && hoverIndex < visibleEndIndex ? hoverIndex : n - 1;
            const curRsi = rsiSeries[inspectedIndex] || 50;
            const rsiYScale = (val: number) => panelHeight - (val / 100) * (panelHeight - 16) - 8;

            const isOverbought = curRsi >= 70;
            const isOversold = curRsi <= 30;

            return (
              <div key="panel-rsi" className="relative w-full bg-slate-950/40">
                <div className="absolute top-1 left-3 z-10 flex items-center gap-2 text-[10px] font-mono pointer-events-none">
                  <span className="font-bold text-slate-300">RSI(14)</span>
                  <span
                    className={`font-bold ${
                      isOverbought ? 'text-rose-400' : isOversold ? 'text-emerald-400' : 'text-purple-300'
                    }`}
                  >
                    {curRsi.toFixed(1)}
                  </span>
                  {isOverbought && (
                    <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Overbought &gt; 70
                    </span>
                  )}
                  {isOversold && (
                    <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Oversold &lt; 30
                    </span>
                  )}
                </div>

                <div className="absolute top-1 right-3 z-10 flex items-center gap-1">
                  <button
                    onClick={() => onTogglePanel('RSI')}
                    className="p-0.5 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                    title="Close RSI sub-panel"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                <svg width="100%" height={panelHeight} viewBox={`0 0 ${svgWidth} ${panelHeight}`} preserveAspectRatio="none" className="w-full block">
                  {/* 70 Overbought line */}
                  <line x1={paddingLeft} y1={rsiYScale(70)} x2={paddingLeft + chartAreaWidth} y2={rsiYScale(70)} stroke="#f43f5e" strokeDasharray="3 3" strokeWidth={0.8} />
                  {/* 50 Midline */}
                  <line x1={paddingLeft} y1={rsiYScale(50)} x2={paddingLeft + chartAreaWidth} y2={rsiYScale(50)} stroke="#475569" strokeDasharray="2 2" strokeWidth={0.6} />
                  {/* 30 Oversold line */}
                  <line x1={paddingLeft} y1={rsiYScale(30)} x2={paddingLeft + chartAreaWidth} y2={rsiYScale(30)} stroke="#10b981" strokeDasharray="3 3" strokeWidth={0.8} />

                  {/* Overbought / Oversold background tint */}
                  <rect x={paddingLeft} y={rsiYScale(100)} width={chartAreaWidth} height={rsiYScale(70) - rsiYScale(100)} fill="rgba(244, 63, 94, 0.05)" />
                  <rect x={paddingLeft} y={rsiYScale(30)} width={chartAreaWidth} height={rsiYScale(0) - rsiYScale(30)} fill="rgba(16, 185, 129, 0.05)" />

                  {/* RSI Curve */}
                  <path
                    d={candles
                      .slice(visibleStartIndex, visibleEndIndex)
                      .map((_, i) => {
                        const actualIdx = visibleStartIndex + i;
                        const rsi = rsiSeries[actualIdx];
                        if (isNaN(rsi)) return '';
                        const x = getX(actualIdx);
                        const y = rsiYScale(rsi);
                        return `${i === 0 || isNaN(rsiSeries[actualIdx - 1]) ? 'M' : 'L'} ${x} ${y}`;
                      })
                      .filter(Boolean)
                      .join(' ')}
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth={1.75}
                  />

                  {/* Right Axis Labels */}
                  <text x={paddingLeft + chartAreaWidth + 4} y={rsiYScale(70) + 3} fill="#f43f5e" fontSize="9" fontFamily="monospace">70</text>
                  <text x={paddingLeft + chartAreaWidth + 4} y={rsiYScale(30) + 3} fill="#10b981" fontSize="9" fontFamily="monospace">30</text>
                </svg>
              </div>
            );
          }

          if (panelType === 'MACD') {
            // MACD (12, 26, 9)
            const inspectedIndex = hoverIndex !== null && hoverIndex >= visibleStartIndex && hoverIndex < visibleEndIndex ? hoverIndex : n - 1;
            const curMacd = macdData.macdLine[inspectedIndex] || 0;
            const curSignal = macdData.signalLine[inspectedIndex] || 0;
            const curHist = macdData.histogram[inspectedIndex] || 0;

            const visibleHist = macdData.histogram.slice(visibleStartIndex, visibleEndIndex).filter((v) => !isNaN(v));
            const visibleMacd = macdData.macdLine.slice(visibleStartIndex, visibleEndIndex).filter((v) => !isNaN(v));
            const visibleSignal = macdData.signalLine.slice(visibleStartIndex, visibleEndIndex).filter((v) => !isNaN(v));

            const allVals = [...visibleHist, ...visibleMacd, ...visibleSignal];
            const maxAbs = Math.max(0.2, ...allVals.map((v) => Math.abs(v)));
            const macdYScale = (val: number) => panelHeight / 2 - (val / maxAbs) * (panelHeight / 2 - 8);

            return (
              <div key="panel-macd" className="relative w-full bg-slate-950/40">
                <div className="absolute top-1 left-3 z-10 flex items-center gap-2 text-[10px] font-mono pointer-events-none">
                  <span className="font-bold text-slate-300">MACD(12, 26, 9)</span>
                  <span className="text-sky-400 font-semibold">MACD: {curMacd.toFixed(2)}</span>
                  <span className="text-amber-400 font-semibold">Signal: {curSignal.toFixed(2)}</span>
                  <span className={`font-bold ${curHist >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    Hist: {curHist.toFixed(2)}
                  </span>
                </div>

                <div className="absolute top-1 right-3 z-10 flex items-center gap-1">
                  <button
                    onClick={() => onTogglePanel('MACD')}
                    className="p-0.5 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                    title="Close MACD sub-panel"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                <svg width="100%" height={panelHeight} viewBox={`0 0 ${svgWidth} ${panelHeight}`} preserveAspectRatio="none" className="w-full block">
                  {/* Zero Center Line */}
                  <line x1={paddingLeft} y1={panelHeight / 2} x2={paddingLeft + chartAreaWidth} y2={panelHeight / 2} stroke="#475569" strokeWidth={0.8} />

                  {/* Histogram Bars */}
                  {candles.slice(visibleStartIndex, visibleEndIndex).map((_, i) => {
                    const actualIdx = visibleStartIndex + i;
                    const hist = macdData.histogram[actualIdx];
                    if (isNaN(hist)) return null;
                    const x = getX(actualIdx);
                    const zeroY = panelHeight / 2;
                    const y = macdYScale(hist);
                    const h = Math.abs(y - zeroY);
                    const barY = hist >= 0 ? y : zeroY;

                    return (
                      <rect
                        key={`subhist-${actualIdx}`}
                        x={x - candleWidth / 2}
                        y={barY}
                        width={candleWidth}
                        height={Math.max(1, h)}
                        fill={hist >= 0 ? '#10b981' : '#f43f5e'}
                        opacity={0.85}
                      />
                    );
                  })}

                  {/* MACD Line (Fast - Blue) */}
                  <path
                    d={candles
                      .slice(visibleStartIndex, visibleEndIndex)
                      .map((_, i) => {
                        const actualIdx = visibleStartIndex + i;
                        const v = macdData.macdLine[actualIdx];
                        if (isNaN(v)) return '';
                        const x = getX(actualIdx);
                        const y = macdYScale(v);
                        return `${i === 0 || isNaN(macdData.macdLine[actualIdx - 1]) ? 'M' : 'L'} ${x} ${y}`;
                      })
                      .filter(Boolean)
                      .join(' ')}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth={1.5}
                  />

                  {/* Signal Line (Slow - Amber) */}
                  <path
                    d={candles
                      .slice(visibleStartIndex, visibleEndIndex)
                      .map((_, i) => {
                        const actualIdx = visibleStartIndex + i;
                        const v = macdData.signalLine[actualIdx];
                        if (isNaN(v)) return '';
                        const x = getX(actualIdx);
                        const y = macdYScale(v);
                        return `${i === 0 || isNaN(macdData.signalLine[actualIdx - 1]) ? 'M' : 'L'} ${x} ${y}`;
                      })
                      .filter(Boolean)
                      .join(' ')}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth={1.3}
                  />
                </svg>
              </div>
            );
          }

          if (panelType === 'STOCHASTIC') {
            // Stochastic %K (14) & %D (3) with 80/20 bands
            const inspectedIndex = hoverIndex !== null && hoverIndex >= visibleStartIndex && hoverIndex < visibleEndIndex ? hoverIndex : n - 1;
            const curK = stochData.k[inspectedIndex] || 50;
            const curD = stochData.d[inspectedIndex] || 50;
            const stochYScale = (val: number) => panelHeight - (val / 100) * (panelHeight - 16) - 8;

            return (
              <div key="panel-stoch" className="relative w-full bg-slate-950/40">
                <div className="absolute top-1 left-3 z-10 flex items-center gap-2 text-[10px] font-mono pointer-events-none">
                  <span className="font-bold text-slate-300">Stochastic(14, 3)</span>
                  <span className="text-cyan-400 font-semibold">%K: {curK.toFixed(1)}</span>
                  <span className="text-pink-400 font-semibold">%D: {curD.toFixed(1)}</span>
                  {curK >= 80 && (
                    <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Overbought &gt; 80
                    </span>
                  )}
                  {curK <= 20 && (
                    <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Oversold &lt; 20
                    </span>
                  )}
                </div>

                <div className="absolute top-1 right-3 z-10 flex items-center gap-1">
                  <button
                    onClick={() => onTogglePanel('STOCHASTIC')}
                    className="p-0.5 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                    title="Close Stochastic sub-panel"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                <svg width="100%" height={panelHeight} viewBox={`0 0 ${svgWidth} ${panelHeight}`} preserveAspectRatio="none" className="w-full block">
                  {/* 80 & 20 Lines */}
                  <line x1={paddingLeft} y1={stochYScale(80)} x2={paddingLeft + chartAreaWidth} y2={stochYScale(80)} stroke="#f43f5e" strokeDasharray="3 3" strokeWidth={0.8} />
                  <line x1={paddingLeft} y1={stochYScale(50)} x2={paddingLeft + chartAreaWidth} y2={stochYScale(50)} stroke="#475569" strokeDasharray="2 2" strokeWidth={0.6} />
                  <line x1={paddingLeft} y1={stochYScale(20)} x2={paddingLeft + chartAreaWidth} y2={stochYScale(20)} stroke="#10b981" strokeDasharray="3 3" strokeWidth={0.8} />

                  {/* %K Line (Cyan) */}
                  <path
                    d={candles
                      .slice(visibleStartIndex, visibleEndIndex)
                      .map((_, i) => {
                        const actualIdx = visibleStartIndex + i;
                        const v = stochData.k[actualIdx];
                        if (isNaN(v)) return '';
                        const x = getX(actualIdx);
                        const y = stochYScale(v);
                        return `${i === 0 || isNaN(stochData.k[actualIdx - 1]) ? 'M' : 'L'} ${x} ${y}`;
                      })
                      .filter(Boolean)
                      .join(' ')}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth={1.5}
                  />

                  {/* %D Line (Pink) */}
                  <path
                    d={candles
                      .slice(visibleStartIndex, visibleEndIndex)
                      .map((_, i) => {
                        const actualIdx = visibleStartIndex + i;
                        const v = stochData.d[actualIdx];
                        if (isNaN(v)) return '';
                        const x = getX(actualIdx);
                        const y = stochYScale(v);
                        return `${i === 0 || isNaN(stochData.d[actualIdx - 1]) ? 'M' : 'L'} ${x} ${y}`;
                      })
                      .filter(Boolean)
                      .join(' ')}
                    fill="none"
                    stroke="#ec4899"
                    strokeWidth={1.3}
                  />

                  <text x={paddingLeft + chartAreaWidth + 4} y={stochYScale(80) + 3} fill="#f43f5e" fontSize="9" fontFamily="monospace">80</text>
                  <text x={paddingLeft + chartAreaWidth + 4} y={stochYScale(20) + 3} fill="#10b981" fontSize="9" fontFamily="monospace">20</text>
                </svg>
              </div>
            );
          }

          if (panelType === 'MFI') {
            // Money Flow Index (14) with 80/20 bands
            const inspectedIndex = hoverIndex !== null && hoverIndex >= visibleStartIndex && hoverIndex < visibleEndIndex ? hoverIndex : n - 1;
            const curMfi = mfiSeries[inspectedIndex] || 50;
            const mfiYScale = (val: number) => panelHeight - (val / 100) * (panelHeight - 16) - 8;

            return (
              <div key="panel-mfi" className="relative w-full bg-slate-950/40">
                <div className="absolute top-1 left-3 z-10 flex items-center gap-2 text-[10px] font-mono pointer-events-none">
                  <span className="font-bold text-slate-300">MFI(14)</span>
                  <span className="text-teal-400 font-semibold">{curMfi.toFixed(1)}</span>
                  <span className="text-slate-500">(Volume-Weighted Momentum)</span>
                </div>

                <div className="absolute top-1 right-3 z-10 flex items-center gap-1">
                  <button
                    onClick={() => onTogglePanel('MFI')}
                    className="p-0.5 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                    title="Close MFI sub-panel"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>

                <svg width="100%" height={panelHeight} viewBox={`0 0 ${svgWidth} ${panelHeight}`} preserveAspectRatio="none" className="w-full block">
                  <line x1={paddingLeft} y1={mfiYScale(80)} x2={paddingLeft + chartAreaWidth} y2={mfiYScale(80)} stroke="#f43f5e" strokeDasharray="3 3" strokeWidth={0.8} />
                  <line x1={paddingLeft} y1={mfiYScale(20)} x2={paddingLeft + chartAreaWidth} y2={mfiYScale(20)} stroke="#10b981" strokeDasharray="3 3" strokeWidth={0.8} />

                  <path
                    d={candles
                      .slice(visibleStartIndex, visibleEndIndex)
                      .map((_, i) => {
                        const actualIdx = visibleStartIndex + i;
                        const v = mfiSeries[actualIdx];
                        if (isNaN(v)) return '';
                        const x = getX(actualIdx);
                        const y = mfiYScale(v);
                        return `${i === 0 || isNaN(mfiSeries[actualIdx - 1]) ? 'M' : 'L'} ${x} ${y}`;
                      })
                      .filter(Boolean)
                      .join(' ')}
                    fill="none"
                    stroke="#14b8a6"
                    strokeWidth={1.5}
                  />

                  <text x={paddingLeft + chartAreaWidth + 4} y={mfiYScale(80) + 3} fill="#f43f5e" fontSize="9" fontFamily="monospace">80</text>
                  <text x={paddingLeft + chartAreaWidth + 4} y={mfiYScale(20) + 3} fill="#10b981" fontSize="9" fontFamily="monospace">20</text>
                </svg>
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
};
