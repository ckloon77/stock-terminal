import React, { useState, useEffect, useRef } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Search,
  Bell,
  HardDrive,
  CheckCircle2,
  LogOut,
  AlertCircle,
  Sliders,
  ExternalLink
} from 'lucide-react';
import { User } from 'firebase/auth';
import { googleSignIn, googleSignOut } from '../services/firebase';
import { StockQuote } from '../types';

interface HeaderProps {
  currentSymbol: string;
  onSelectSymbol: (sym: string) => void;
  user: User | null;
  setUser: (u: User | null) => void;
  token: string | null;
  setToken: (t: string | null) => void;
  onOpenAlerts: () => void;
  unreadAlertCount: number;
  onOpenDriveModal: () => void;
  liveQuotes: Record<string, StockQuote>;
}

const POPULAR_TICKERS = ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'SPY', 'QQQ', 'GOOGL', 'AMZN', 'META', 'AMD', 'COIN', 'PLTR'];

export const Header: React.FC<HeaderProps> = ({
  currentSymbol,
  onSelectSymbol,
  user,
  setUser,
  setToken,
  onOpenAlerts,
  unreadAlertCount,
  onOpenDriveModal,
  liveQuotes
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignIn = async () => {
    setAuthError(null);
    setIsSigningIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Sign in canceled or failed');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await googleSignOut();
      setUser(null);
      setToken(null);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredSymbols = POPULAR_TICKERS.filter((sym) =>
    sym.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <header id="app-header" className="w-full bg-slate-900 border-b border-slate-800 text-slate-200 sticky top-0 z-40">
      {/* Top Ticker Tape Ribbon with Professional Polish styling */}
      <div className="w-full bg-slate-900/60 border-b border-slate-800 px-6 py-2.5 overflow-x-auto no-scrollbar flex items-center gap-4 text-xs whitespace-nowrap">
        <div className="flex items-center gap-2 min-w-fit">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Markets</span>
        </div>

        <div className="w-px h-4 bg-slate-700"></div>

        {['SPY', 'QQQ', 'NVDA', 'AAPL', 'MSFT', 'TSLA', 'META', 'AMD'].map((sym, idx, arr) => {
          const q = liveQuotes[sym];
          const price = q ? `$${q.price.toFixed(2)}` : '---';
          const isUp = q ? q.change >= 0 : true;
          return (
            <React.Fragment key={sym}>
              <button
                onClick={() => onSelectSymbol(sym)}
                className={`flex items-center gap-2 min-w-fit px-2 py-1 rounded transition-colors hover:bg-slate-800 cursor-pointer ${
                  sym === currentSymbol ? 'bg-slate-800 text-blue-400 font-bold border-l-2 border-blue-500' : 'text-slate-300'
                }`}
              >
                <span className="text-xs font-bold tracking-tight text-slate-400">{sym}</span>
                <span className="text-sm font-mono font-medium">{price}</span>
                {q && (
                  <span className={`text-xs font-mono font-semibold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isUp ? '+' : ''}{q.changePercent.toFixed(2)}%
                  </span>
                )}
              </button>
              {idx < arr.length - 1 && <div className="w-px h-4 bg-slate-700"></div>}
            </React.Fragment>
          );
        })}
      </div>

      {/* Main Navbar Bar */}
      <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between gap-6">
        {/* Brand Logo & Name + Nav Links */}
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center shadow-sm">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white uppercase">QuantView</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30 uppercase tracking-widest">
                PRO
              </span>
            </div>
          </div>

          <nav className="hidden md:flex gap-6 text-sm font-medium">
            <a
              href="#stock-hero-header"
              className="text-blue-400 border-b-2 border-blue-400 pb-1 font-semibold"
            >
              Dashboard
            </a>
            <a
              href="#technical-indicators-panel"
              className="text-slate-400 hover:text-white transition-colors"
            >
              Analysis
            </a>
            <a
              href="#strategy-framework-section"
              className="text-slate-400 hover:text-white transition-colors"
            >
              Strategy Lab
            </a>
          </nav>
        </div>

        {/* Search & Watchlist Autocomplete */}
        <div ref={searchRef} className="relative flex-1 max-w-sm mx-2">
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search ticker..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  onSelectSymbol(searchQuery.trim().toUpperCase());
                  setIsSearchOpen(false);
                  setSearchQuery('');
                }
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-md py-1.5 pl-10 pr-12 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-500 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-700">
              ↵
            </span>
          </div>

          {/* Autocomplete Dropdown */}
          {isSearchOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl p-2 z-50 max-h-72 overflow-y-auto">
              <div className="text-[10px] font-bold uppercase text-slate-500 mb-2 px-2 py-1 tracking-widest">
                Suggested Instruments
              </div>
              <div className="grid grid-cols-2 gap-1">
                {filteredSymbols.map((sym) => (
                  <button
                    key={sym}
                    onClick={() => {
                      onSelectSymbol(sym);
                      setIsSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-md text-left hover:bg-slate-800 transition-colors"
                  >
                    <span className="font-bold text-sm text-white font-mono">{sym}</span>
                    <span className="text-xs text-slate-400 font-mono">
                      {liveQuotes[sym] ? `$${liveQuotes[sym].price.toFixed(2)}` : ''}
                    </span>
                  </button>
                ))}
              </div>
              {searchQuery.trim() && !filteredSymbols.includes(searchQuery.trim().toUpperCase()) && (
                <button
                  onClick={() => {
                    onSelectSymbol(searchQuery.trim().toUpperCase());
                    setIsSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className="w-full mt-2 text-center text-xs font-semibold py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-colors"
                >
                  Load ticker: <span className="font-mono">{searchQuery.toUpperCase()}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Action Controls: Alerts, Drive, Auth */}
        <div className="flex items-center gap-3">
          {/* Alerts Bell Button */}
          <button
            id="open-alerts-button"
            onClick={onOpenAlerts}
            className="relative p-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center justify-center cursor-pointer"
            title="Real-time Stock Alerts"
          >
            <Bell className="w-4 h-4" />
            {unreadAlertCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                {unreadAlertCount}
              </span>
            )}
          </button>

          {/* Google Drive Export & Management Button */}
          <button
            id="open-drive-button"
            onClick={onOpenDriveModal}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-colors cursor-pointer"
            title="Google Drive Integration"
          >
            <HardDrive className="w-3.5 h-3.5 text-blue-400" />
            <span className="hidden md:inline">Drive Backup</span>
            {user && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
          </button>

          {/* Official Google Sign In Button or User Profile Pill */}
          {!user ? (
            <button
              id="google-signin-btn"
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 font-semibold text-xs rounded-md shadow-sm border border-slate-200 transition-all cursor-pointer disabled:opacity-60"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>{isSigningIn ? 'Connecting...' : 'Sign In'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 pl-1.5 pr-2 py-1 rounded-md text-xs">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-5 h-5 rounded-full border border-blue-400"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-5 h-5 bg-slate-700 rounded-full border border-slate-600 flex items-center justify-center text-[10px] font-bold text-white">
                  {user.displayName?.[0] || 'U'}
                </div>
              )}
              <span className="text-slate-200 font-medium hidden sm:inline max-w-[90px] truncate">
                {user.displayName?.split(' ')[0] || 'User'}
              </span>
              <button
                onClick={handleSignOut}
                title="Sign out of Google"
                className="text-slate-400 hover:text-rose-400 p-0.5 rounded transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {authError && (
        <div className="bg-rose-950/80 border-t border-rose-800 text-rose-300 text-xs px-4 py-1.5 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
            {authError}
          </span>
          <button onClick={() => setAuthError(null)} className="underline text-[11px]">
            Dismiss
          </button>
        </div>
      )}
    </header>
  );
};
