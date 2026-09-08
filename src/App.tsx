/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User } from 'firebase/auth';
import { initAuth } from './services/firebase';
import {
  fetchStockQuote,
  fetchHistoricalData,
  playAlertChime
} from './services/stockService';
import {
  computeTechnicalIndicators,
  evaluateStrategyFrameworks
} from './services/indicators';
import {
  StockQuote,
  Candle,
  TechnicalIndicators,
  StrategyFrameworkResult,
  StockAlert,
  TriggeredAlertNotification,
  TimeframeInterval,
  SwingCandleInterval,
  CandlestickSignalScope
} from './types';
import { detectCandlestickSignals } from './services/candlestickPatterns';
import { Header } from './components/Header';
import { StockHeader } from './components/StockHeader';
import { StockChart } from './components/StockChart';
import { IndicatorsPanel } from './components/IndicatorsPanel';
import { StrategyPanel } from './components/StrategyPanel';
import { AlertsManager } from './components/AlertsManager';
import { DriveExportModal } from './components/DriveExportModal';
import { BellRing, X, BarChart2, Activity, BrainCircuit } from 'lucide-react';

const INITIAL_ALERTS: StockAlert[] = [
  {
    id: 'alert-1',
    symbol: 'NVDA',
    conditionType: 'PRICE_ABOVE',
    thresholdValue: 136.5,
    createdAt: new Date().toISOString(),
    enabled: true,
    triggeredCount: 0,
    notes: 'Resistance breakout target'
  },
  {
    id: 'alert-2',
    symbol: 'NVDA',
    conditionType: 'RSI_OVERSOLD',
    thresholdValue: 30,
    createdAt: new Date().toISOString(),
    enabled: true,
    triggeredCount: 0,
    notes: 'Tactical oversold dip entry'
  }
];

type MobileActiveTab = 'chart' | 'indicators' | 'strategy';

export default function App() {
  const [currentSymbol, setCurrentSymbol] = useState<string>('NVDA');
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [selectedRange, setSelectedRange] = useState<string>('3mo');
  const [chartType, setChartType] = useState<'candle' | 'area'>('candle');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Responsive & Mobile Tabs
  const [mobileTab, setMobileTab] = useState<MobileActiveTab>('chart');

  // Day Trade View & Candlestick Signals State
  const [isDayTradeView, setIsDayTradeView] = useState<boolean>(false);
  const [selectedInterval, setSelectedInterval] = useState<TimeframeInterval>('5m');
  const [selectedSwingInterval, setSelectedSwingInterval] = useState<SwingCandleInterval>('1d');
  const [showCandleSignals, setShowCandleSignals] = useState<boolean>(false);
  const [candleSignalScope, setCandleSignalScope] = useState<CandlestickSignalScope>('all');

  // Live ticker tape quotes
  const [liveQuotes, setLiveQuotes] = useState<Record<string, StockQuote>>({});

  // Real-time Alerts Engine State
  const [alerts, setAlerts] = useState<StockAlert[]>(() => {
    const saved = localStorage.getItem('apex_stock_alerts');
    return saved ? JSON.parse(saved) : INITIAL_ALERTS;
  });
  const [notifications, setNotifications] = useState<TriggeredAlertNotification[]>([]);
  const [activeToast, setActiveToast] = useState<TriggeredAlertNotification | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isAlertsOpen, setIsAlertsOpen] = useState<boolean>(false);

  // Google Drive & Auth State
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState<boolean>(false);

  // Initialize Firebase Auth on app mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (authUser, authToken) => {
        setUser(authUser);
        setToken(authToken);
      },
      () => {
        setUser(null);
        setToken(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Save alerts to localStorage
  useEffect(() => {
    localStorage.setItem('apex_stock_alerts', JSON.stringify(alerts));
  }, [alerts]);

  // Detected Candlestick Signals across current active candles
  const candlestickSignals = useMemo(() => {
    return detectCandlestickSignals(candles);
  }, [candles]);

  const lastCandleSignalCount = useMemo(() => {
    if (candles.length === 0) return 0;
    const lastIdx = candles.length - 1;
    return candlestickSignals.filter((s) => s.index === lastIdx).length;
  }, [candles, candlestickSignals]);

  const activeSignalsCount = candleSignalScope === 'last' ? lastCandleSignalCount : candlestickSignals.length;

  // Fetch stock quote and historical candles for the active symbol
  const loadStockData = useCallback(
    async (
      sym: string,
      range: string,
      isIntraday: boolean,
      intradayInterval: TimeframeInterval,
      swingInterval: SwingCandleInterval
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        const activeInterval = isIntraday ? intradayInterval : swingInterval;
        const [fetchedQuote, fetchedCandles] = await Promise.all([
          fetchStockQuote(sym),
          fetchHistoricalData(sym, isIntraday ? '1d' : range, activeInterval)
        ]);
        setQuote(fetchedQuote);
        setCandles(fetchedCandles);
        setLiveQuotes((prev) => ({ ...prev, [sym]: fetchedQuote }));
      } catch (err: any) {
        console.error('Error loading stock data:', err);
        setError(err.message || 'Failed to load stock data');
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadStockData(currentSymbol, selectedRange, isDayTradeView, selectedInterval, selectedSwingInterval);
  }, [currentSymbol, selectedRange, isDayTradeView, selectedInterval, selectedSwingInterval, loadStockData]);

  const handleSelectSwingInterval = (newInterval: SwingCandleInterval) => {
    setSelectedSwingInterval(newInterval);
    if (newInterval === '1wk') {
      if (selectedRange === '1w' || selectedRange === '1mo') {
        setSelectedRange('1y');
      }
    } else if (newInterval === '1mo') {
      if (selectedRange === '1w' || selectedRange === '1mo' || selectedRange === '3mo' || selectedRange === '6mo') {
        setSelectedRange('2y');
      }
    }
  };

  // Preload top market tape tickers
  useEffect(() => {
    const tapeTickers = ['SPY', 'QQQ', 'AAPL', 'MSFT', 'TSLA', 'META', 'AMD'];
    tapeTickers.forEach(async (sym) => {
      try {
        const q = await fetchStockQuote(sym);
        setLiveQuotes((prev) => ({ ...prev, [sym]: q }));
      } catch (e) {
        // Silently ignore ticker tape load errors
      }
    });
  }, []);

  // Compute indicators and strategy frameworks whenever candles or quote change
  const indicators: TechnicalIndicators | null = useMemo(() => {
    if (candles.length < 5) return null;
    return computeTechnicalIndicators(candles);
  }, [candles]);

  const frameworks: StrategyFrameworkResult[] = useMemo(() => {
    if (!indicators || !quote) return [];
    return evaluateStrategyFrameworks(quote.price, indicators);
  }, [quote, indicators]);

  // Alert Verification Engine
  const checkAlertConditions = useCallback(
    (
      currentPrice: number,
      currentIndicators: TechnicalIndicators | null,
      currentChangePercent: number = 0,
      currentChange: number = 0
    ) => {
      if (!currentIndicators) return;

      alerts.forEach((alert) => {
        if (!alert.enabled || alert.symbol !== currentSymbol) return;

        let isTriggered = false;
        let title = '';
        let message = '';

        switch (alert.conditionType) {
          case 'PRICE_ABOVE':
            if (currentPrice >= alert.thresholdValue) {
              isTriggered = true;
              title = `${alert.symbol} Crossed Above $${alert.thresholdValue}`;
              message = `Price traded up to $${currentPrice.toFixed(2)}, crossing your target of $${alert.thresholdValue}.`;
            }
            break;
          case 'PRICE_BELOW':
            if (currentPrice <= alert.thresholdValue) {
              isTriggered = true;
              title = `${alert.symbol} Dropped Below $${alert.thresholdValue}`;
              message = `Price slipped to $${currentPrice.toFixed(2)}, breaching your floor of $${alert.thresholdValue}.`;
            }
            break;
          case 'PCT_CHANGE_UP':
            if (currentChangePercent >= alert.thresholdValue) {
              isTriggered = true;
              title = `${alert.symbol} Up +${currentChangePercent.toFixed(2)}%`;
              message = `Day gain exceeded your ${alert.thresholdValue}% momentum trigger.`;
            }
            break;
          case 'PCT_CHANGE_DOWN':
            if (currentChangePercent <= alert.thresholdValue) {
              isTriggered = true;
              title = `${alert.symbol} Down ${currentChangePercent.toFixed(2)}%`;
              message = `Day loss reached your ${alert.thresholdValue}% drawdown limit.`;
            }
            break;
          case 'RSI_OVERSOLD':
            if (currentIndicators.rsi <= alert.thresholdValue) {
              isTriggered = true;
              title = `${alert.symbol} RSI Oversold (${currentIndicators.rsi.toFixed(1)})`;
              message = `RSI reached oversold threshold (${alert.thresholdValue}). High mean-reversion bounce probability.`;
            }
            break;
          case 'RSI_OVERBOUGHT':
            if (currentIndicators.rsi >= alert.thresholdValue) {
              isTriggered = true;
              title = `${alert.symbol} RSI Overbought (${currentIndicators.rsi.toFixed(1)})`;
              message = `RSI reached overbought territory (${alert.thresholdValue}). Consider taking tactical profits.`;
            }
            break;
          case 'SMA50_CROSSOVER':
            if (currentPrice >= currentIndicators.sma50) {
              isTriggered = true;
              title = `${alert.symbol} Crossed 50-Day SMA`;
              message = `Price ($${currentPrice.toFixed(2)}) is now trading above the 50-day moving average ($${currentIndicators.sma50.toFixed(2)}).`;
            }
            break;
          case 'MACD_BULLISH_CROSS':
            if (currentIndicators.macd.histogram > 0) {
              isTriggered = true;
              title = `${alert.symbol} MACD Bullish Crossover`;
              message = `MACD line crossed above signal line with positive histogram (${currentIndicators.macd.histogram.toFixed(2)}).`;
            }
            break;
        }

        if (isTriggered) {
          if (soundEnabled) {
            playAlertChime(alert.conditionType.includes('ABOVE') || alert.conditionType.includes('BULLISH') ? 'bullish' : 'bearish');
          }

          const notification: TriggeredAlertNotification = {
            id: `notif-${Date.now()}-${Math.random()}`,
            alertId: alert.id,
            symbol: alert.symbol,
            title,
            message,
            timestamp: new Date().toISOString(),
            priceAtTrigger: currentPrice,
            conditionType: alert.conditionType,
            read: false
          };

          setNotifications((prev) => [notification, ...prev]);
          setActiveToast(notification);
          setTimeout(() => setActiveToast(null), 6000);

          setAlerts((prev) =>
            prev.map((a) =>
              a.id === alert.id
                ? { ...a, triggeredCount: a.triggeredCount + 1, lastTriggeredAt: new Date().toISOString(), enabled: false }
                : a
            )
          );
        }
      });
    },
    [alerts, currentSymbol, soundEnabled]
  );

  // Periodic real-time price poll
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!quote) return;
      try {
        const fresh = await fetchStockQuote(currentSymbol);
        setQuote(fresh);
        setLiveQuotes((prev) => ({ ...prev, [currentSymbol]: fresh }));
        checkAlertConditions(fresh.price, indicators, fresh.changePercent, fresh.change);
      } catch (err) {
        const jitter = (Math.random() - 0.5) * 0.15;
        const newPrice = Number(Math.max(1, quote.price + jitter).toFixed(2));
        const newChange = Number((quote.change + jitter).toFixed(2));
        const newChangePct = Number(((newChange / quote.previousClose) * 100).toFixed(2));

        const updatedQuote: StockQuote = {
          ...quote,
          price: newPrice,
          change: newChange,
          changePercent: newChangePct,
          updatedAt: new Date().toISOString()
        };
        setQuote(updatedQuote);
        checkAlertConditions(newPrice, indicators, newChangePct, newChange);
      }
    }, 7000);

    return () => clearInterval(interval);
  }, [currentSymbol, quote, indicators, checkAlertConditions]);

  const handleSimulateTick = (simulatedPrice: number) => {
    if (!quote) return;
    const diff = simulatedPrice - quote.previousClose;
    const pct = (diff / quote.previousClose) * 100;
    const simulatedQuote: StockQuote = {
      ...quote,
      price: simulatedPrice,
      change: Number(diff.toFixed(2)),
      changePercent: Number(pct.toFixed(2)),
      updatedAt: new Date().toISOString()
    };
    setQuote(simulatedQuote);
    checkAlertConditions(simulatedPrice, indicators, Number(pct.toFixed(2)), Number(diff.toFixed(2)));
  };

  const handleAddAlert = (newAlert: Omit<StockAlert, 'id' | 'createdAt' | 'triggeredCount'>) => {
    const created: StockAlert = {
      ...newAlert,
      id: `alert-${Date.now()}`,
      createdAt: new Date().toISOString(),
      triggeredCount: 0
    };
    setAlerts((prev) => [created, ...prev]);
  };

  const handleToggleAlert = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600/30 selection:text-white antialiased w-full max-w-full overflow-x-hidden">
      {/* Toast Notification */}
      {activeToast && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm w-[calc(100vw-2rem)] sm:w-full bg-slate-900 border border-slate-700 shadow-2xl rounded-xl p-4 flex items-start gap-3 transition-all animate-in fade-in slide-in-from-bottom-5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
            <BellRing className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start gap-2">
              <h5 className="font-bold text-xs text-white truncate">{activeToast.title}</h5>
              <button
                onClick={() => setActiveToast(null)}
                className="text-slate-400 hover:text-white p-0.5 cursor-pointer rounded hover:bg-slate-800"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{activeToast.message}</p>
            <div className="text-[10px] text-amber-300 font-mono mt-1">
              Trigger Price: ${activeToast.priceAtTrigger.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* Global Header */}
      <Header
        currentSymbol={currentSymbol}
        onSelectSymbol={(sym) => setCurrentSymbol(sym)}
        user={user}
        setUser={setUser}
        token={token}
        setToken={setToken}
        onOpenAlerts={() => setIsAlertsOpen(true)}
        unreadAlertCount={notifications.filter((n) => !n.read).length}
        onOpenDriveModal={() => setIsDriveModalOpen(true)}
        liveQuotes={liveQuotes}
      />

      {/* Main Terminal Body */}
      <main className="flex-1 flex flex-col w-full max-w-[1720px] mx-auto px-2 sm:px-4 lg:px-6 py-2 sm:py-4 gap-3 sm:gap-4 min-w-0 overflow-x-hidden">
        {error && (
          <div className="w-full bg-rose-950/70 border border-rose-800 text-rose-300 text-xs p-3 rounded-xl flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200 ml-4 font-mono text-[11px]">Dismiss</button>
          </div>
        )}

        {quote ? (
          <>
            {/* Top Bar: Telemetry & Timeframe Controls */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md shadow-sm">
              <StockHeader
                quote={quote}
                indicators={indicators}
                selectedRange={selectedRange}
                onSelectRange={setSelectedRange}
                isDayTradeView={isDayTradeView}
                onToggleDayTradeView={setIsDayTradeView}
                selectedInterval={selectedInterval}
                onSelectInterval={setSelectedInterval}
                selectedSwingInterval={selectedSwingInterval}
                onSelectSwingInterval={handleSelectSwingInterval}
                candleSignalsCount={activeSignalsCount}
                showCandleSignals={showCandleSignals}
                onToggleCandleSignals={() => setShowCandleSignals(!showCandleSignals)}
                signalScope={candleSignalScope}
                onSelectSignalScope={setCandleSignalScope}
                chartType={chartType}
                onChangeChartType={setChartType}
                onOpenCreateAlert={() => setIsAlertsOpen(true)}
                onOpenStrategyModal={() => setMobileTab('strategy')}
                onOpenDriveExport={() => setIsDriveModalOpen(true)}
                onRefreshQuote={() => loadStockData(currentSymbol, selectedRange, isDayTradeView, selectedInterval, selectedSwingInterval)}
                isLoading={isLoading}
              />
            </div>

            {/* Mobile & Tablet Navigation Ribbon (Hidden on XL screens) */}
            <div className="flex xl:hidden w-full items-center p-1 bg-slate-900/90 border border-slate-800 rounded-xl gap-1">
              <button
                onClick={() => setMobileTab('chart')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  mobileTab === 'chart'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Chart & Tape</span>
              </button>
              <button
                onClick={() => setMobileTab('indicators')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  mobileTab === 'indicators'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Indicators</span>
              </button>
              <button
                onClick={() => setMobileTab('strategy')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                  mobileTab === 'strategy'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <BrainCircuit className="w-3.5 h-3.5" />
                <span>Strategy Matrix</span>
              </button>
            </div>

            {/* Workstation Matrix Layout */}
            <div className="w-full flex flex-col xl:grid xl:grid-cols-12 gap-4 items-start">
              {/* Primary Column (Left 7 or 8 columns on Desktop) */}
              <div
                className={`w-full flex-col gap-4 ${
                  mobileTab === 'chart' || mobileTab === 'indicators' ? 'flex' : 'hidden xl:flex'
                } xl:col-span-7 2xl:col-span-8`}
              >
                {/* Candlestick & Technical Canvas */}
                <div
                  className={`w-full rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm overflow-hidden ${
                    mobileTab === 'chart' ? 'block' : 'hidden xl:block'
                  }`}
                >
                  <StockChart
                    candles={candles}
                    symbol={currentSymbol}
                    chartType={chartType}
                    indicators={indicators}
                    quote={quote}
                    isDayTradeView={isDayTradeView}
                    selectedInterval={selectedInterval}
                    onSelectInterval={setSelectedInterval}
                    selectedSwingInterval={selectedSwingInterval}
                    onSelectSwingInterval={handleSelectSwingInterval}
                    onToggleDayTradeView={setIsDayTradeView}
                    showCandleSignals={showCandleSignals}
                    onToggleCandleSignals={() => setShowCandleSignals(!showCandleSignals)}
                    signalScope={candleSignalScope}
                    onSelectSignalScope={setCandleSignalScope}
                  />
                </div>

                {/* Indicators & Oscillator Panel */}
                {indicators && (
                  <div
                    className={`w-full rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm overflow-hidden ${
                      mobileTab === 'indicators' ? 'block' : 'hidden xl:block'
                    }`}
                  >
                    <IndicatorsPanel indicators={indicators} quote={quote} />
                  </div>
                )}
              </div>

              {/* Secondary Column: Quantitative Strategy & AI Forecasts (Right on Desktop) */}
              {indicators && (
                <div
                  className={`w-full ${
                    mobileTab === 'strategy' ? 'block' : 'hidden xl:block'
                  } xl:col-span-5 2xl:col-span-4`}
                >
                  <div className="w-full rounded-xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-sm overflow-hidden">
                    <StrategyPanel
                      symbol={currentSymbol}
                      quote={quote}
                      indicators={indicators}
                      frameworks={frameworks}
                      onOpenDriveExport={() => setIsDriveModalOpen(true)}
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 min-h-[500px] flex items-center justify-center p-8">
            <div className="text-center space-y-3 p-6 rounded-2xl bg-slate-900/60 border border-slate-800">
              <div className="w-9 h-9 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-400 font-mono tracking-wide">
                Streaming {currentSymbol} order books & historical candles...
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Real-time Alerts Manager Modal */}
      {quote && (
        <AlertsManager
          isOpen={isAlertsOpen}
          onClose={() => setIsAlertsOpen(false)}
          symbol={currentSymbol}
          quote={quote}
          alerts={alerts}
          onAddAlert={handleAddAlert}
          onToggleAlert={handleToggleAlert}
          onDeleteAlert={handleDeleteAlert}
          notifications={notifications}
          onClearNotifications={() => setNotifications([])}
          soundEnabled={soundEnabled}
          onToggleSound={() => setSoundEnabled(!soundEnabled)}
          onSimulateTick={handleSimulateTick}
        />
      )}

      {/* Google Drive Export & Backup Modal */}
      {quote && (
        <DriveExportModal
          isOpen={isDriveModalOpen}
          onClose={() => setIsDriveModalOpen(false)}
          user={user}
          token={token}
          onAuthSuccess={(u, t) => {
            setUser(u);
            setToken(t);
          }}
          quote={quote}
          candles={candles}
          indicators={indicators}
          frameworks={frameworks}
        />
      )}
    </div>
  );
}