import React, { useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import { TradeDirection, CandlestickType, TradingSession } from '../../types';
import {
  calculateGoldCashMove,
  checkRevengeTrade,
  stopLossToPips,
  sanitizeNumberInput,
  toNum,
} from '../../utils/math';
import {
  X,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Link,
  Image as ImageIcon,
  ShieldAlert,
} from 'lucide-react';

interface LogTradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogTradeModal: React.FC<LogTradeModalProps> = ({ isOpen, onClose }) => {
  const { accounts, selectedAccount, trades, logCompletedTrade } = useTrading();

  const [accountId, setAccountId] = useState<string>(selectedAccount.id);
  const [direction, setDirection] = useState<TradeDirection>('BUY');
  const [entryPrice, setEntryPrice] = useState<number | string>(2640.0);
  const [exitPrice, setExitPrice] = useState<number | string>(2652.0);
  const [stopLossPrice, setStopLossPrice] = useState<number | string>(2635.0);
  const [plannedTp, setPlannedTp] = useState<number | string>(2655.0);
  const [lots, setLots] = useState<number | string>(1.0);
  const [session, setSession] = useState<TradingSession>('London');
  const [openTime, setOpenTime] = useState<string>(
    new Date(Date.now() - 4 * 3600 * 1000).toISOString().slice(0, 16)
  );
  const [closeTime, setCloseTime] = useState<string>(
    new Date().toISOString().slice(0, 16)
  );

  // Confluences
  const [hasSr, setHasSr] = useState<boolean>(true);
  const [hasTrendline, setHasTrendline] = useState<boolean>(true);
  const [hasPattern, setHasPattern] = useState<boolean>(false);
  const [hasFib, setHasFib] = useState<boolean>(false);
  const [candlestickConfirmed, setCandlestickConfirmed] = useState<boolean>(true);
  const [candlestickType, setCandlestickType] = useState<CandlestickType>('Engulfing');
  const [isNewsTrade, setIsNewsTrade] = useState<boolean>(false);

  // Visuals
  const [chartBeforeUrl, setChartBeforeUrl] = useState<string>('');
  const [chartAfterUrl, setChartAfterUrl] = useState<string>('');
  const [chartImageData, setChartImageData] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  if (!isOpen) return null;

  // Numeric values
  const numEntryPrice = toNum(entryPrice, 0);
  const numExitPrice = toNum(exitPrice, 0);
  const numStopLossPrice = toNum(stopLossPrice, 0);
  const numPlannedTp = toNum(plannedTp, 0);
  const numLots = toNum(lots, 0);

  // Math
  const realizedCash = calculateGoldCashMove(direction, numEntryPrice, numExitPrice, numLots);
  const initialRisk = Math.abs(numEntryPrice - numStopLossPrice) * numLots * 100;
  const slDist = Math.abs(numEntryPrice - numStopLossPrice);
  const tpDist = Math.abs(numPlannedTp - numEntryPrice);
  const setupR = slDist > 0 && numPlannedTp > 0 ? Math.round((tpDist / slDist) * 100) / 100 : 0;
  const campaignR = initialRisk > 0 ? Math.round((realizedCash / initialRisk) * 100) / 100 : 0;

  // Revenge Trade Sentinel Check (<60 mins after previous stopped trade)
  const revengeCheck = checkRevengeTrade(
    trades,
    new Date(openTime).toISOString(),
    accountId
  );

  // Premature runner exit calculation
  let prematureExitLoss = 0;
  const reachedTp = direction === 'BUY' ? numExitPrice >= numPlannedTp : numExitPrice <= numPlannedTp;
  const isWinningExit = direction === 'BUY' ? numExitPrice > numEntryPrice : numExitPrice < numEntryPrice;
  if (isWinningExit && !reachedTp && numPlannedTp > 0) {
    prematureExitLoss = Math.abs(numPlannedTp - numExitPrice) * numLots * 100;
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setChartImageData(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const violations: string[] = [];
    if (revengeCheck.isRevenge) {
      violations.push(`Revenge Trade (${revengeCheck.minutesSinceStop}m cooldown breach)`);
    }
    if (!candlestickConfirmed) {
      violations.push('Unconfirmed Candlestick Entry');
    }
    if (prematureExitLoss > 150) {
      violations.push(`Premature Runner Exit ($${prematureExitLoss.toFixed(2)} left on table)`);
    }
    if (isNewsTrade) {
      violations.push('Red Folder News Trade');
    }

    const tradeId = `trade-${Date.now()}`;
    const initialLeg = {
      id: `leg-${Date.now()}-1`,
      trade_id: tradeId,
      action: 'INITIAL_ENTRY' as const,
      price: numEntryPrice,
      lot_size: numLots,
      stop_loss: numStopLossPrice,
      take_profit: numPlannedTp,
      realized_pnl: 0,
      executed_at: new Date(openTime).toISOString(),
    };

    const exitAction = realizedCash >= 0 ? ('FULL_EXIT' as const) : ('SL_HIT' as const);
    const exitLeg = {
      id: `leg-${Date.now()}-2`,
      trade_id: tradeId,
      action: exitAction,
      price: numExitPrice,
      lot_size: numLots,
      realized_pnl: realizedCash,
      executed_at: new Date(closeTime).toISOString(),
    };

    logCompletedTrade({
      account_id: accountId,
      symbol: 'XAUUSD',
      direction,
      review_status: 'REVIEWED',
      session,
      has_sr: hasSr,
      has_trendline_3rd_touch: hasTrendline,
      has_chart_pattern: hasPattern,
      has_fibonacci: hasFib,
      candlestick_confirmed: candlestickConfirmed,
      candlestick_type: candlestickType,
      is_revenge_trade: revengeCheck.isRevenge,
      is_news_trade: isNewsTrade,
      premature_exit_loss_usd: prematureExitLoss,
      discipline_rating: violations.length > 0 ? 'RULE_VIOLATION' : 'DISCIPLINED',
      rule_violations: violations,
      initial_planned_risk_usd: initialRisk,
      planned_entry: numEntryPrice,
      planned_sl: numStopLossPrice,
      planned_tp: numPlannedTp,
      initial_planned_lots: numLots,
      realized_pnl: Math.round(realizedCash * 100) / 100,
      setup_r_multiple: setupR,
      campaign_r_multiple: campaignR,
      chart_before_url: chartBeforeUrl.trim() || undefined,
      chart_after_url: chartAfterUrl.trim() || undefined,
      chart_image_data: chartImageData || undefined,
      notes: notes.trim() || undefined,
      opened_at: new Date(openTime).toISOString(),
      closed_at: new Date(closeTime).toISOString(),
      legs: [initialLeg, exitLeg],
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0f141e] border border-[#222e44] rounded-xl max-w-2xl w-full p-6 space-y-5 shadow-2xl my-8">
        <div className="flex items-center justify-between pb-3 border-b border-[#1b2333]">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h2 className="font-bold text-base text-slate-100">
              Log Past Trade (Standalone Mobile/Manual Entry)
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Revenge Sentinel Alert if detected */}
        {revengeCheck.isRevenge && (
          <div className="p-3 rounded-lg bg-red-950/60 border border-red-500/50 flex items-center gap-2 text-xs text-red-200">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span>
              <strong>Revenge Trade Detected:</strong> This trade was opened only {revengeCheck.minutesSinceStop} minutes after your previous stopped-out trade (rule requires ≥60m cooldown).
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Account & Direction */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-slate-400 block mb-1 font-semibold">Account</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full bg-[#161d2b] border border-[#232f48] text-slate-100 rounded px-3 py-2 outline-none"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.firm_name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1 font-semibold">Direction</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDirection('BUY')}
                  className={`flex-1 py-2 rounded font-bold transition-colors flex items-center justify-center gap-1.5 ${
                    direction === 'BUY'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#161d2b] text-slate-400 border border-[#232f48]'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  BUY (LONG)
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('SELL')}
                  className={`flex-1 py-2 rounded font-bold transition-colors flex items-center justify-center gap-1.5 ${
                    direction === 'SELL'
                      ? 'bg-rose-600 text-white'
                      : 'bg-[#161d2b] text-slate-400 border border-[#232f48]'
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  SELL (SHORT)
                </button>
              </div>
            </div>
          </div>

          {/* Execution Prices & Lots */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Entry Price ($)</label>
              <input
                type="number"
                step="0.05"
                required
                value={entryPrice}
                onChange={(e) => setEntryPrice(sanitizeNumberInput(e.target.value))}
                placeholder="0.00"
                className="w-full bg-[#161d2b] border border-[#232f48] focus:border-amber-400 text-slate-100 rounded px-2.5 py-1.5 font-mono-num outline-none transition-colors placeholder:text-slate-600"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Exit Price ($)</label>
              <input
                type="number"
                step="0.05"
                required
                value={exitPrice}
                onChange={(e) => setExitPrice(sanitizeNumberInput(e.target.value))}
                placeholder="0.00"
                className="w-full bg-[#161d2b] border border-[#232f48] focus:border-amber-400 text-slate-100 rounded px-2.5 py-1.5 font-mono-num outline-none transition-colors placeholder:text-slate-600"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Stop Loss ($)</label>
              <input
                type="number"
                step="0.05"
                required
                value={stopLossPrice}
                onChange={(e) => setStopLossPrice(sanitizeNumberInput(e.target.value))}
                placeholder="0.00"
                className="w-full bg-[#161d2b] border border-[#232f48] focus:border-amber-400 text-slate-100 rounded px-2.5 py-1.5 font-mono-num outline-none transition-colors placeholder:text-slate-600"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Planned TP ($)</label>
              <input
                type="number"
                step="0.05"
                required
                value={plannedTp}
                onChange={(e) => setPlannedTp(sanitizeNumberInput(e.target.value))}
                placeholder="0.00"
                className="w-full bg-[#161d2b] border border-[#232f48] focus:border-amber-400 text-slate-100 rounded px-2.5 py-1.5 font-mono-num outline-none transition-colors placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* Lots, Session, Timestamps */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">Lot Size</label>
              <input
                type="number"
                step="0.01"
                required
                value={lots}
                onChange={(e) => setLots(sanitizeNumberInput(e.target.value))}
                placeholder="0.00"
                className="w-full bg-[#161d2b] border border-[#232f48] focus:border-amber-400 text-slate-100 rounded px-2.5 py-1.5 font-mono-num outline-none transition-colors placeholder:text-slate-600"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1 font-medium">Session (GMT)</label>
              <select
                value={session}
                onChange={(e) => setSession(e.target.value as TradingSession)}
                className="w-full bg-[#161d2b] border border-[#232f48] focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 text-slate-100 rounded px-2.5 py-1.5 outline-none transition-colors cursor-pointer"
              >
                <option value="London">London Open (07:00 - 10:00 GMT)</option>
                <option value="NY Overlap">NY Overlap (12:00 - 16:00 GMT)</option>
                <option value="NY PM">NY PM Session (16:00 - 20:00 GMT)</option>
                <option value="Asian">Asian Session (00:00 - 06:00 GMT)</option>
              </select>
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Opened At</label>
              <input
                type="datetime-local"
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
                className="w-full bg-[#161d2b] border border-[#232f48] text-slate-100 rounded px-2 py-1 font-mono-num outline-none text-[11px]"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Closed At</label>
              <input
                type="datetime-local"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
                className="w-full bg-[#161d2b] border border-[#232f48] text-slate-100 rounded px-2 py-1 font-mono-num outline-none text-[11px]"
              />
            </div>
          </div>

          {/* Calculated Preview Banner */}
          <div className="p-3 rounded-lg bg-[#141a27] border border-[#222d42] flex items-center justify-between font-mono-num">
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Realized Net P&L</span>
              <span
                className={`text-base font-bold ${
                  realizedCash >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {realizedCash >= 0 ? `+$${realizedCash.toFixed(2)}` : `-$${Math.abs(realizedCash).toFixed(2)}`}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Initial 1R Risk</span>
              <span className="text-sm font-bold text-slate-200">${initialRisk.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Setup R</span>
              <span className="text-sm font-bold text-amber-300">{setupR}R</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block">Campaign R</span>
              <span
                className={`text-sm font-bold ${
                  campaignR >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {campaignR}R
              </span>
            </div>
          </div>

          {/* Confluences checkboxes */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-300 uppercase">
              Technical Confluences Present
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <label className="flex items-center gap-1.5 p-2 rounded bg-[#161d2b] border border-[#232f48] cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasSr}
                  onChange={(e) => setHasSr(e.target.checked)}
                  className="rounded text-amber-500"
                />
                <span>Support/Resist</span>
              </label>
              <label className="flex items-center gap-1.5 p-2 rounded bg-[#161d2b] border border-[#232f48] cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasTrendline}
                  onChange={(e) => setHasTrendline(e.target.checked)}
                  className="rounded text-amber-500"
                />
                <span>Trendline Touch</span>
              </label>
              <label className="flex items-center gap-1.5 p-2 rounded bg-[#161d2b] border border-[#232f48] cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasPattern}
                  onChange={(e) => setHasPattern(e.target.checked)}
                  className="rounded text-amber-500"
                />
                <span>Chart Pattern</span>
              </label>
              <label className="flex items-center gap-1.5 p-2 rounded bg-[#161d2b] border border-[#232f48] cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasFib}
                  onChange={(e) => setHasFib(e.target.checked)}
                  className="rounded text-amber-500"
                />
                <span>Fibonacci</span>
              </label>
            </div>
          </div>

          {/* Candlestick confirmation */}
          <div className="p-2.5 rounded bg-[#161d2b] border border-[#232f48] flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={candlestickConfirmed}
                onChange={(e) => setCandlestickConfirmed(e.target.checked)}
                className="rounded text-amber-500"
              />
              <span className="font-semibold text-slate-200">
                Candlestick Confirmation Formed?
              </span>
            </label>

            {candlestickConfirmed && (
              <select
                value={candlestickType}
                onChange={(e) => setCandlestickType(e.target.value as CandlestickType)}
                className="bg-[#1a2336] text-amber-300 rounded px-2 py-1 outline-none font-medium"
              >
                <option value="Engulfing">Engulfing</option>
                <option value="Pin Bar / Wick">Pin Bar / Rejection Wick</option>
              </select>
            )}
          </div>

          {/* Chart evidence & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 block mb-1">TradingView Chart Link</label>
              <input
                type="text"
                placeholder="https://www.tradingview.com/x/..."
                value={chartBeforeUrl}
                onChange={(e) => setChartBeforeUrl(e.target.value)}
                className="w-full bg-[#161d2b] border border-[#232f48] text-slate-100 rounded px-2.5 py-1.5 outline-none"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">Upload Screenshot</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full text-slate-400 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-400 block mb-1">Post-Trade Notes / Journal</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What happened during execution? Any emotional impulses or hesitations?"
              className="w-full bg-[#161d2b] border border-[#232f48] text-slate-100 rounded p-2 outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1b2333]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-lg transition-colors"
            >
              Save to Master Journal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
