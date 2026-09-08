import React, { useState } from 'react';
import {
  Bell,
  BellRing,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Volume2,
  VolumeX,
  X,
  Zap,
  TrendingUp,
  TrendingDown,
  History
} from 'lucide-react';
import { StockAlert, TriggeredAlertNotification, AlertConditionType, StockQuote } from '../types';

interface AlertsManagerProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  quote: StockQuote;
  alerts: StockAlert[];
  onAddAlert: (newAlert: Omit<StockAlert, 'id' | 'createdAt' | 'triggeredCount'>) => void;
  onToggleAlert: (id: string) => void;
  onDeleteAlert: (id: string) => void;
  notifications: TriggeredAlertNotification[];
  onClearNotifications: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onSimulateTick: (simulatedPrice: number) => void;
}

export const AlertsManager: React.FC<AlertsManagerProps> = ({
  isOpen,
  onClose,
  symbol,
  quote,
  alerts,
  onAddAlert,
  onToggleAlert,
  onDeleteAlert,
  notifications,
  onClearNotifications,
  soundEnabled,
  onToggleSound,
  onSimulateTick
}) => {
  const [targetSymbol, setTargetSymbol] = useState(symbol);
  const [conditionType, setConditionType] = useState<AlertConditionType>('PRICE_ABOVE');
  const [thresholdValue, setThresholdValue] = useState<number>(Number((quote.price * 1.03).toFixed(2)));
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'manage' | 'history'>('manage');

  if (!isOpen) return null;

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();
    onAddAlert({
      symbol: targetSymbol.toUpperCase(),
      conditionType,
      thresholdValue: Number(thresholdValue),
      enabled: true,
      notes: notes.trim() || undefined
    });
    setNotes('');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
              <BellRing className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Real-Time Alert Engine</h3>
              <p className="text-xs text-slate-500 font-mono">
                Condition triggers with browser notifications &amp; audio alerts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleSound}
              className={`p-1.5 rounded-md border text-xs transition-colors cursor-pointer ${
                soundEnabled
                  ? 'bg-slate-800 text-blue-400 border-slate-700'
                  : 'bg-slate-800/50 text-slate-500 border-slate-800'
              }`}
              title={soundEnabled ? 'Audio Chime Enabled' : 'Audio Chime Muted'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-5 pt-2 gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('manage')}
            className={`pb-2.5 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'manage'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Active Alerts ({alerts.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Triggered Log ({notifications.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'manage' ? (
            <>
              {/* Form: Create New Alert */}
              <form onSubmit={handleCreateAlert} className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-4">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5 text-blue-400" />
                  Set New Real-Time Alert
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Ticker Symbol</label>
                    <input
                      type="text"
                      value={targetSymbol}
                      onChange={(e) => setTargetSymbol(e.target.value.toUpperCase())}
                      className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-white uppercase font-mono font-bold focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] text-slate-400 block mb-1">Condition Trigger</label>
                    <select
                      value={conditionType}
                      onChange={(e) => {
                        const val = e.target.value as AlertConditionType;
                        setConditionType(val);
                        if (val === 'PRICE_ABOVE') setThresholdValue(Number((quote.price * 1.03).toFixed(2)));
                        else if (val === 'PRICE_BELOW') setThresholdValue(Number((quote.price * 0.97).toFixed(2)));
                        else if (val === 'PCT_CHANGE_UP') setThresholdValue(3.0);
                        else if (val === 'PCT_CHANGE_DOWN') setThresholdValue(-3.0);
                        else if (val === 'RSI_OVERSOLD') setThresholdValue(30);
                        else if (val === 'RSI_OVERBOUGHT') setThresholdValue(70);
                        else if (val === 'SMA50_CROSSOVER') setThresholdValue(quote.price);
                        else if (val === 'MACD_BULLISH_CROSS') setThresholdValue(0);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="PRICE_ABOVE">Price Crosses Above ($)</option>
                      <option value="PRICE_BELOW">Price Crosses Below ($)</option>
                      <option value="PCT_CHANGE_UP">Day Gain Reaches (+%)</option>
                      <option value="PCT_CHANGE_DOWN">Day Drop Reaches (-%)</option>
                      <option value="RSI_OVERSOLD">RSI Drops Below Oversold (&le; 30)</option>
                      <option value="RSI_OVERBOUGHT">RSI Rises Above Overbought (&ge; 70)</option>
                      <option value="SMA50_CROSSOVER">Price Crosses Above 50-Day SMA</option>
                      <option value="MACD_BULLISH_CROSS">MACD Bullish Signal Crossover</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">
                      Threshold Value ({conditionType.includes('PRICE') ? '$' : conditionType.includes('PCT') ? '%' : 'pts'})
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={thresholdValue}
                      onChange={(e) => setThresholdValue(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-white font-mono font-bold focus:border-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Custom Note (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Breakout retest entry / Take profit"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <div className="text-[11px] text-slate-500 font-mono">
                    Current {quote.symbol} Price: <span className="text-white font-bold">${quote.price.toFixed(2)}</span>
                  </div>
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-md shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Arm Alert</span>
                  </button>
                </div>
              </form>

              {/* Simulation Sandbox for Testing Alerts */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-300 font-medium">Test Real-Time Alert Trigger:</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSimulateTick(Number((quote.price * 1.04).toFixed(2)))}
                    className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer font-mono"
                  >
                    <TrendingUp className="w-3 h-3" />
                    +4% Spike (${(quote.price * 1.04).toFixed(2)})
                  </button>
                  <button
                    onClick={() => onSimulateTick(Number((quote.price * 0.96).toFixed(2)))}
                    className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer font-mono"
                  >
                    <TrendingDown className="w-3 h-3" />
                    -4% Drop (${(quote.price * 0.96).toFixed(2)})
                  </button>
                </div>
              </div>

              {/* Alerts List */}
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Configured Watch Triggers
                </div>

                {alerts.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs bg-slate-950 rounded-lg border border-slate-800">
                    No active alerts configured. Use the form above to add price or indicator targets.
                  </div>
                ) : (
                  alerts.map((al) => (
                    <div
                      key={al.id}
                      className={`p-3 rounded-lg border flex items-center justify-between gap-3 transition-colors ${
                        al.enabled
                          ? 'bg-slate-950 border-slate-800'
                          : 'bg-slate-950/40 border-slate-800/40 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={al.enabled}
                          onChange={() => onToggleAlert(al.id)}
                          className="w-4 h-4 rounded text-blue-500 focus:ring-0 focus:ring-offset-0 bg-slate-900 border-slate-700 cursor-pointer"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white font-mono text-xs">{al.symbol}</span>
                            <span className="text-xs text-slate-300 font-medium">
                              {al.conditionType.replace(/_/g, ' ')}
                            </span>
                            <span className="font-mono text-xs text-blue-400 font-bold">
                              {al.conditionType.includes('PRICE') ? `$${al.thresholdValue}` : al.thresholdValue}
                            </span>
                          </div>
                          {al.notes && (
                            <div className="text-[11px] text-slate-500 mt-0.5">{al.notes}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {al.triggeredCount > 0 && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded font-mono">
                            Triggered {al.triggeredCount}x
                          </span>
                        )}
                        <button
                          onClick={() => onDeleteAlert(al.id)}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-900 transition-colors cursor-pointer"
                          title="Delete alert"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            /* History / Triggered Notifications Log */
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-mono">
                  Real-time events recorded during this session
                </span>
                {notifications.length > 0 && (
                  <button
                    onClick={onClearNotifications}
                    className="text-xs text-rose-400 hover:underline cursor-pointer"
                  >
                    Clear History
                  </button>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs bg-slate-950 rounded-lg border border-slate-800">
                  No alert triggers recorded yet. Triggers will be logged here as live prices move.
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-start gap-3"
                  >
                    <div className="w-7 h-7 rounded-md bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                      <BellRing className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-bold text-white">{n.title}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(n.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{n.message}</p>
                      <div className="text-[11px] text-slate-500 font-mono mt-1">
                        Price at trigger: <span className="text-amber-300 font-bold">${n.priceAtTrigger.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
