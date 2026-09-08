import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  FileText,
  Table,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  X,
  UploadCloud,
  FileSpreadsheet,
  Clock,
  RefreshCw
} from 'lucide-react';
import { User } from 'firebase/auth';
import { googleSignIn } from '../services/firebase';
import { uploadReportToDrive, uploadCsvToDrive, listAppDriveFiles } from '../services/driveService';
import {
  StockQuote,
  Candle,
  TechnicalIndicators,
  StrategyFrameworkResult,
  DriveExportFile
} from '../types';

interface DriveExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  token: string | null;
  onAuthSuccess: (user: User, token: string) => void;
  quote: StockQuote;
  candles: Candle[];
  indicators: TechnicalIndicators | null;
  frameworks: StrategyFrameworkResult[];
}

export const DriveExportModal: React.FC<DriveExportModalProps> = ({
  isOpen,
  onClose,
  user,
  token,
  onAuthSuccess,
  quote,
  candles,
  indicators,
  frameworks
}) => {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<DriveExportFile | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recentDriveFiles, setRecentDriveFiles] = useState<DriveExportFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [reportTitle, setReportTitle] = useState(`${quote.symbol} Strategic Technical Analysis`);

  // Load recently created files from Google Drive when authenticated
  useEffect(() => {
    if (isOpen && token) {
      loadDriveFiles();
    }
  }, [isOpen, token]);

  const loadDriveFiles = async () => {
    if (!token) return;
    setIsLoadingFiles(true);
    try {
      const files = await listAppDriveFiles(token);
      setRecentDriveFiles(files);
    } catch (err: any) {
      console.error('Failed to load drive files:', err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  if (!isOpen) return null;

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setErrorMessage(null);
    try {
      const res = await googleSignIn();
      if (res) {
        onAuthSuccess(res.user, res.accessToken);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Google sign-in was canceled');
    } finally {
      setIsSigningIn(false);
    }
  };

  // Export Comprehensive Strategy Report (.html formatted for Drive)
  const handleExportReport = async () => {
    if (!token) return;
    setIsUploading(true);
    setErrorMessage(null);
    setUploadSuccess(null);

    const fileName = `${quote.symbol}_Strategy_Report_${new Date().toISOString().split('T')[0]}.html`;

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${reportTitle}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1e293b; max-width: 800px; margin: 40px auto; padding: 20px; }
    h1 { color: #0f172a; border-bottom: 2px solid #38bdf8; padding-bottom: 8px; margin-bottom: 4px; }
    .subtitle { color: #64748b; font-size: 14px; margin-bottom: 24px; }
    .metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 20px 0; }
    .metric-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
    .metric-title { font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: bold; }
    .metric-value { font-size: 18px; font-weight: bold; color: #0f172a; margin-top: 4px; font-family: monospace; }
    .framework-card { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 9999px; font-size: 11px; font-weight: bold; }
    .badge-bull { background: #dcfce7; color: #166534; }
    .badge-bear { background: #fee2e2; color: #991b1b; }
    .badge-neutral { background: #f1f5f9; color: #475569; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <h1>${quote.symbol} — ${quote.name}</h1>
  <div class="subtitle">Generated on ${new Date().toLocaleString()} by Stock Analysis &amp; Strategy Dashboard</div>

  <h2>Price &amp; Key Metrics</h2>
  <div class="metric-grid">
    <div class="metric-box">
      <div class="metric-title">Last Price</div>
      <div class="metric-value">$${quote.price.toFixed(2)}</div>
    </div>
    <div class="metric-box">
      <div class="metric-title">Day Change</div>
      <div class="metric-value" style="color: ${quote.change >= 0 ? '#16a34a' : '#dc2626'}">
        ${quote.change >= 0 ? '+' : ''}$${quote.change.toFixed(2)} (${quote.changePercent.toFixed(2)}%)
      </div>
    </div>
    <div class="metric-box">
      <div class="metric-title">Day Range</div>
      <div class="metric-value">$${quote.dayLow.toFixed(2)} - $${quote.dayHigh.toFixed(2)}</div>
    </div>
    <div class="metric-box">
      <div class="metric-title">52W Range</div>
      <div class="metric-value">$${quote.fiftyTwoWeekLow ?? 'N/A'} - $${quote.fiftyTwoWeekHigh ?? 'N/A'}</div>
    </div>
  </div>

  <h2>Technical Indicators</h2>
  <div class="metric-grid">
    <div class="metric-box">
      <div class="metric-title">RSI (14)</div>
      <div class="metric-value">${indicators !== null ? indicators.rsi.toFixed(1) : 'N/A'}</div>
    </div>
    <div class="metric-box">
      <div class="metric-title">MACD Histogram</div>
      <div class="metric-value">${indicators !== null ? indicators.macd.histogram.toFixed(2) : 'N/A'}</div>
    </div>
    <div class="metric-box">
      <div class="metric-title">SMA 50</div>
      <div class="metric-value">${indicators !== null ? '$' + indicators.sma50.toFixed(2) : 'N/A'}</div>
    </div>
    <div class="metric-box">
      <div class="metric-title">ATR Volatility</div>
      <div class="metric-value">${indicators !== null ? '$' + indicators.atr.toFixed(2) : 'N/A'}</div>
    </div>
  </div>

  <h2>Strategy Framework Evaluations</h2>
  ${frameworks
    .map(
      (fw) => `
    <div class="framework-card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <strong style="font-size: 15px;">${fw.name}</strong>
        <span class="badge ${
          fw.signal === 'BULLISH' ? 'badge-bull' : fw.signal === 'BEARISH' ? 'badge-bear' : 'badge-neutral'
        }">${fw.signal} (Confidence: ${fw.confidence}%)</span>
      </div>
      <p style="margin: 0 0 6px 0; font-size: 13px; color: #334155;">${fw.condition}</p>
      <div style="font-size: 12px; color: #64748b; font-family: monospace;">${fw.details}</div>
      ${fw.triggerZone ? `<div style="margin-top: 6px; font-size: 12px; color: #0284c7; font-weight: bold;">Trigger: ${fw.triggerZone}</div>` : ''}
    </div>
  `
    )
    .join('')}

  <div class="footer">
    Exported to Google Drive with permission from the user. Stock data provided for informational research purposes.
  </div>
</body>
</html>`;

    try {
      const file = await uploadReportToDrive(token, fileName, htmlContent, 'text/html');
      setUploadSuccess(file);
      loadDriveFiles();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to upload report to Google Drive');
    } finally {
      setIsUploading(false);
    }
  };

  // Export Historical CSV Dataset
  const handleExportCsv = async () => {
    if (!token) return;
    setIsUploading(true);
    setErrorMessage(null);
    setUploadSuccess(null);

    const fileName = `${quote.symbol}_Historical_Data_${new Date().toISOString().split('T')[0]}.csv`;

    let csv = 'Date,Open,High,Low,Close,Volume\n';
    candles.forEach((c) => {
      csv += `${c.time},${c.open},${c.high},${c.low},${c.close},${c.volume}\n`;
    });

    try {
      const file = await uploadCsvToDrive(token, fileName, csv);
      setUploadSuccess(file);
      loadDriveFiles();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to export CSV to Google Drive');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-lg w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <HardDrive className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Google Drive Integration</h3>
              <p className="text-xs text-slate-500 font-mono">
                Store technical reports &amp; datasets directly into Drive
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {!user ? (
            /* Unauthenticated View: Official Sign in with Google */
            <div className="text-center py-6 px-4 bg-slate-950 rounded-lg border border-slate-800 space-y-4">
              <div className="w-10 h-10 rounded-md bg-blue-600/10 border border-blue-500/20 text-blue-400 mx-auto flex items-center justify-center">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div className="max-w-md mx-auto">
                <h4 className="font-bold text-sm text-white mb-1">
                  Connect Your Google Drive
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Sign in with Google to enable automatic export of your stock research analyses,
                  indicator matrices, and historical datasets directly to your Google Drive account,
                  with your permission.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSignIn}
                  disabled={isSigningIn}
                  className="inline-flex items-center gap-2.5 px-4 py-2 bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs rounded-md shadow-sm border border-slate-200 transition-all cursor-pointer disabled:opacity-60"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  <span>{isSigningIn ? 'Connecting to Google...' : 'Sign in with Google'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Authenticated View: Export Options & Recent Files */
            <>
              {/* User Identity Pill */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-7 h-7 rounded-full border border-blue-500/50"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                      {user.displayName?.[0] || 'U'}
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      {user.displayName}
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">{user.email}</div>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                  Drive Connected
                </span>
              </div>

              {/* Upload Success Banner */}
              {uploadSuccess && (
                <div className="bg-emerald-950/40 border border-emerald-500/30 p-3.5 rounded-lg text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Uploaded to Google Drive!
                  </div>
                  <div className="text-slate-300 font-mono text-[11px] truncate">{uploadSuccess.name}</div>
                  <a
                    href={uploadSuccess.webViewLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold underline mt-1"
                  >
                    <span>Open in Google Drive</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {/* Export Actions Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Option 1: Strategy Research Report */}
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors">
                  <div>
                    <div className="w-8 h-8 rounded-md bg-blue-600/10 text-blue-400 flex items-center justify-center mb-3 border border-blue-500/20">
                      <FileText className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-white mb-1">
                      Comprehensive Strategy Report
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                      Export executive thesis, technical indicators snapshot, and trade setups formatted for Google Drive.
                    </p>
                  </div>
                  <button
                    onClick={handleExportReport}
                    disabled={isUploading}
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-md text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{isUploading ? 'Uploading...' : 'Save Report to Drive'}</span>
                  </button>
                </div>

                {/* Option 2: Historical CSV Dataset */}
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col justify-between hover:border-slate-700 transition-colors">
                  <div>
                    <div className="w-8 h-8 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 border border-emerald-500/20">
                      <FileSpreadsheet className="w-4 h-4" />
                    </div>
                    <h4 className="text-xs font-bold text-white mb-1">
                      Historical Price Dataset (.CSV)
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                      Export {candles.length} historical candles with OHLCV data into a spreadsheet ready for Google Sheets.
                    </p>
                  </div>
                  <button
                    onClick={handleExportCsv}
                    disabled={isUploading}
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-md text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Table className="w-3.5 h-3.5" />
                    <span>{isUploading ? 'Uploading...' : 'Save CSV to Drive'}</span>
                  </button>
                </div>
              </div>

              {/* Recently Saved Drive Files */}
              <div className="space-y-2 pt-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold uppercase tracking-widest text-slate-500">
                    Your Saved Files in Google Drive
                  </span>
                  <button
                    onClick={loadDriveFiles}
                    disabled={isLoadingFiles}
                    className="text-slate-400 hover:text-blue-400 p-1 cursor-pointer"
                    title="Refresh Drive files"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingFiles ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {recentDriveFiles.length === 0 ? (
                  <div className="text-center py-5 text-slate-500 text-xs bg-slate-950 rounded-lg border border-slate-800">
                    No files saved in your Google Drive by this app yet.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {recentDriveFiles.map((f) => (
                      <div
                        key={f.id}
                        className="p-2.5 bg-slate-950 border border-slate-800 rounded-md flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          {f.name.endsWith('.csv') ? (
                            <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                          )}
                          <div className="truncate">
                            <span className="font-semibold text-slate-200 block truncate font-mono text-xs">
                              {f.name}
                            </span>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                              <Clock className="w-3 h-3" />
                              {new Date(f.createdTime).toLocaleDateString()}
                            </span>
                          </div>
                        </div>

                        <a
                          href={f.webViewLink}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-semibold px-2 py-1 bg-slate-900 rounded border border-slate-800 hover:bg-slate-800 transition-colors shrink-0 ml-2"
                        >
                          <span>Open</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {errorMessage && (
            <div className="bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs p-3 rounded-md flex items-center gap-2 font-mono">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
