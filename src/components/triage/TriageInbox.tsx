import React, { useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import { MasterTrade, CandlestickType } from '../../types';
import { sanitizeNumberInput, toNum } from '../../utils/math';
import {
  Inbox,
  CheckCircle,
  Sparkles,
  Link,
  Image as ImageIcon,
  CheckCheck,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Flame,
  ChevronRight,
} from 'lucide-react';

export const TriageInbox: React.FC = () => {
  const { trades, updateTrade, setActiveTab, accounts } = useTrading();

  const unreviewedTrades = trades.filter((t) => t.review_status === 'UNREVIEWED');

  // Currently focused trade in triage
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(
    unreviewedTrades[0]?.id || null
  );

  const currentTrade = trades.find((t) => t.id === selectedTradeId) || unreviewedTrades[0];

  // Local state for fast tagging
  const [hasSr, setHasSr] = useState(false);
  const [hasTrendline, setHasTrendline] = useState(false);
  const [hasPattern, setHasPattern] = useState(false);
  const [hasFib, setHasFib] = useState(false);
  const [candlestickConfirmed, setCandlestickConfirmed] = useState(true);
  const [candlestickType, setCandlestickType] = useState<CandlestickType>('Engulfing');
  const [isPrematureExit, setIsPrematureExit] = useState(false);
  const [prematureAmount, setPrematureAmount] = useState<number | string>(0);
  const [chartUrl, setChartUrl] = useState('');
  const [chartImageData, setChartImageData] = useState('');
  const [triageNotes, setTriageNotes] = useState('');

  // Sync state when focused trade changes
  React.useEffect(() => {
    if (currentTrade) {
      setHasSr(currentTrade.has_sr);
      setHasTrendline(currentTrade.has_trendline_3rd_touch);
      setHasPattern(currentTrade.has_chart_pattern);
      setHasFib(currentTrade.has_fibonacci);
      setCandlestickConfirmed(currentTrade.candlestick_confirmed);
      setCandlestickType(currentTrade.candlestick_type || 'Engulfing');
      setIsPrematureExit(currentTrade.premature_exit_loss_usd > 0);
      setPrematureAmount(currentTrade.premature_exit_loss_usd || 0);
      setChartUrl(currentTrade.chart_before_url || '');
      setChartImageData(currentTrade.chart_image_data || '');
      setTriageNotes(currentTrade.notes || '');
    }
  }, [currentTrade?.id]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setChartImageData(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAndMarkReviewed = () => {
    if (!currentTrade) return;

    const numPremature = toNum(prematureAmount, 0);
    const violations: string[] = [];
    if (!candlestickConfirmed) {
      violations.push('Unconfirmed Candlestick Entry');
    }
    if (isPrematureExit && numPremature > 0) {
      violations.push(`Premature Runner Exit ($${numPremature.toFixed(2)} left on table)`);
    }

    updateTrade(currentTrade.id, {
      review_status: 'REVIEWED',
      has_sr: hasSr,
      has_trendline_3rd_touch: hasTrendline,
      has_chart_pattern: hasPattern,
      has_fibonacci: hasFib,
      candlestick_confirmed: candlestickConfirmed,
      candlestick_type: candlestickType,
      premature_exit_loss_usd: isPrematureExit ? numPremature : 0,
      discipline_rating: violations.length > 0 ? 'RULE_VIOLATION' : 'DISCIPLINED',
      rule_violations: violations,
      chart_before_url: chartUrl.trim() || undefined,
      chart_image_data: chartImageData || undefined,
      notes: triageNotes.trim() || undefined,
    });

    // Pick next unreviewed trade
    const remaining = unreviewedTrades.filter((t) => t.id !== currentTrade.id);
    if (remaining.length > 0) {
      setSelectedTradeId(remaining[0].id);
    } else {
      setSelectedTradeId(null);
    }
  };

  const getAccountName = (accId: string) => {
    const acc = accounts.find((a) => a.id === accId);
    return acc ? `${acc.firm_name} (${acc.name})` : 'Account';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1f283d]">
        <div>
          <div className="flex items-center gap-2">
            <Inbox className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">
              Triage Inbox (Enriching Imported Statements)
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {unreviewedTrades.length} unreviewed trades awaiting setup confluences, candlestick verification, and chart evidence.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('importer')}
          className="text-xs text-amber-400 hover:text-amber-300 font-semibold underline"
        >
          Drop more MT4/MT5/Exness files →
        </button>
      </div>

      {unreviewedTrades.length === 0 ? (
        <div className="bg-[#0f141e] border border-[#1f283d] rounded-xl p-12 text-center max-w-md mx-auto shadow-2xl space-y-3">
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
            <CheckCheck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-200">Inbox Zero: All Trades Reviewed!</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Every imported transaction ticket has been enriched with technical confluences and behavioral tags. Your Intelligence Analytics are 100% synchronized.
          </p>
          <button
            onClick={() => setActiveTab('analytics')}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs"
          >
            View Edge Analytics
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Unreviewed List (4 cols) */}
          <div className="lg:col-span-4 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block px-1">
              Unreviewed Queue ({unreviewedTrades.length})
            </span>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {unreviewedTrades.map((t) => {
                const isSelected = t.id === currentTrade?.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTradeId(t.id)}
                    className={`w-full p-3 rounded-xl text-left border transition-all ${
                      isSelected
                        ? 'bg-[#182235] border-amber-500 text-slate-100 shadow-lg'
                        : 'bg-[#0f141e] border-[#1f283d] text-slate-400 hover:bg-[#131926]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold ${
                            t.direction === 'BUY'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {t.direction}
                        </span>
                        <span className="font-bold text-xs text-slate-200">{t.symbol}</span>
                      </div>
                      <span
                        className={`font-mono-num font-bold text-xs ${
                          t.realized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {t.realized_pnl >= 0 ? '+' : ''}${t.realized_pnl.toFixed(2)}
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 font-mono-num flex justify-between">
                      <span>{t.initial_planned_lots} lots</span>
                      <span>{new Date(t.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Rapid Enrichment Form (8 cols) */}
          {currentTrade && (
            <div className="lg:col-span-8 bg-[#0f141e] border border-[#1f283d] rounded-xl p-6 shadow-2xl space-y-5">
              {/* Top Details of the ticket */}
              <div className="p-4 rounded-xl bg-[#121824] border border-[#1e273a] flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-extrabold ${
                        currentTrade.direction === 'BUY'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {currentTrade.direction} {currentTrade.symbol}
                    </span>
                    <span className="text-xs text-slate-400">
                      {getAccountName(currentTrade.account_id)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 font-mono-num mt-1">
                    Entry: ${currentTrade.planned_entry} • Lots: {currentTrade.initial_planned_lots} • Closed: {new Date(currentTrade.closed_at || currentTrade.opened_at).toLocaleTimeString()}
                  </div>
                </div>

                <div className="text-right font-mono-num">
                  <span className="text-[10px] uppercase text-slate-400 block">Statement Result</span>
                  <span
                    className={`text-xl font-bold ${
                      currentTrade.realized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {currentTrade.realized_pnl >= 0 ? '+' : ''}${currentTrade.realized_pnl.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Confluences tagging */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Select Setup Confluences
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setHasSr(!hasSr)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      hasSr
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-[#141a27] border-[#222c40] text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-xs">
                      <span>Support / Resist</span>
                      {hasSr && <CheckCircle className="w-3.5 h-3.5" />}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHasTrendline(!hasTrendline)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      hasTrendline
                        ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                        : 'bg-[#141a27] border-[#222c40] text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-xs">
                      <span>Trendline Touch</span>
                      {hasTrendline && <CheckCircle className="w-3.5 h-3.5" />}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHasPattern(!hasPattern)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      hasPattern
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                        : 'bg-[#141a27] border-[#222c40] text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-xs">
                      <span>Chart Pattern</span>
                      {hasPattern && <CheckCircle className="w-3.5 h-3.5" />}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setHasFib(!hasFib)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      hasFib
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                        : 'bg-[#141a27] border-[#222c40] text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-xs">
                      <span>Fibonacci</span>
                      {hasFib && <CheckCircle className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                </div>
              </div>

              {/* Candlestick confirmation verification */}
              <div className="p-3.5 rounded-lg bg-[#141a27] border border-[#222d42] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={candlestickConfirmed}
                      onChange={(e) => setCandlestickConfirmed(e.target.checked)}
                      className="rounded text-amber-500"
                    />
                    <span className="font-bold text-slate-200">
                      Candlestick Confirmation Formed?
                    </span>
                  </label>

                  {candlestickConfirmed && (
                    <select
                      value={candlestickType}
                      onChange={(e) => setCandlestickType(e.target.value as CandlestickType)}
                      className="bg-[#1a2336] text-amber-300 rounded px-2.5 py-1 outline-none font-medium"
                    >
                      <option value="Engulfing">Engulfing</option>
                      <option value="Pin Bar / Wick">Pin Bar / Rejection Wick</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Premature runner exit flag */}
              <div className="p-3.5 rounded-lg bg-[#141a27] border border-[#222d42] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isPrematureExit}
                      onChange={(e) => setIsPrematureExit(e.target.checked)}
                      className="rounded text-amber-500"
                    />
                    <span className="font-bold text-slate-200">
                      Premature Runner Exit? (Cut trade before planned target)
                    </span>
                  </label>

                  {isPrematureExit && (
                    <div className="flex items-center gap-1 font-mono-num">
                      <span className="text-slate-400">$</span>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={prematureAmount}
                        onChange={(e) => setPrematureAmount(sanitizeNumberInput(e.target.value))}
                        className="w-24 bg-[#1a2336] border border-[#2b3954] focus:border-amber-400 text-slate-100 rounded px-2 py-0.5 text-xs outline-none transition-colors placeholder:text-slate-600"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Chart Evidence */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">TradingView Snapshot Link</label>
                  <div className="relative">
                    <Link className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="https://www.tradingview.com/x/..."
                      value={chartUrl}
                      onChange={(e) => setChartUrl(e.target.value)}
                      className="w-full bg-[#161d2b] border border-[#232f48] text-slate-100 rounded pl-8 pr-3 py-1.5 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Chart Screenshot</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="w-full text-slate-400 text-xs py-1"
                  />
                </div>
              </div>

              {/* Review Notes */}
              <div>
                <label className="text-xs text-slate-400 block mb-1">Execution Review Notes</label>
                <textarea
                  rows={2}
                  value={triageNotes}
                  onChange={(e) => setTriageNotes(e.target.value)}
                  placeholder="Enrich notes for this ticket..."
                  className="w-full bg-[#161d2b] border border-[#232f48] text-slate-100 rounded p-2 text-xs outline-none"
                />
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleSaveAndMarkReviewed}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-bold text-xs shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Mark as Reviewed & Integrate to Intelligence Analytics</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
