import React, { useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import { MasterTrade, TradeLeg } from '../../types';
import {
  validateScaleIn,
  calculateGoldCashMove,
  calculateGoldLotSize,
  GOLD_PIP_VALUE,
  sanitizeNumberInput,
  toNum,
} from '../../utils/math';
import {
  Activity,
  PlusCircle,
  Scissors,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Flame,
} from 'lucide-react';

export const ActiveTradeManager: React.FC = () => {
  const {
    trades,
    addScaleInLeg,
    takePartialProfit,
    updateLegStopLoss,
    closeActiveTrade,
    setActiveTab,
  } = useTrading();

  const openTrades = trades.filter((t) => t.status === 'OPEN');

  // Modals state
  const [scaleInTrade, setScaleInTrade] = useState<MasterTrade | null>(null);
  const [partialTpTrade, setPartialTpTrade] = useState<MasterTrade | null>(null);
  const [closeTradeTarget, setCloseTradeTarget] = useState<MasterTrade | null>(null);

  // Form states for modals
  const [scaleInPrice, setScaleInPrice] = useState<number | string>(0);
  const [scaleInLots, setScaleInLots] = useState<number | string>(0.5);
  const [scaleInSl, setScaleInSl] = useState<number | string>(0);
  const [scaleInError, setScaleInError] = useState<string | null>(null);

  const [partialPrice, setPartialPrice] = useState<number | string>(0);
  const [partialLots, setPartialLots] = useState<number | string>(0.5);

  const [closePrice, setClosePrice] = useState<number | string>(0);
  const [closeNotes, setCloseNotes] = useState<string>('');

  // Expand/collapse leg breakdown per card
  const [expandedLegs, setExpandedLegs] = useState<Record<string, boolean>>({});

  const toggleLegs = (id: string) => {
    setExpandedLegs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Open Scale In Modal
  const handleOpenScaleIn = (trade: MasterTrade) => {
    setScaleInTrade(trade);
    const leg1 = trade.legs[0];
    const defaultAddPrice =
      trade.direction === 'BUY'
        ? Math.round((leg1.price + 3.0) * 100) / 100
        : Math.round((leg1.price - 3.0) * 100) / 100;
    setScaleInPrice(defaultAddPrice);
    setScaleInLots(Math.min(1.0, Math.round((leg1.lot_size * 0.5) * 100) / 100));
    setScaleInSl(leg1.stop_loss || leg1.price);
    setScaleInError(null);
  };

  const handleConfirmScaleIn = () => {
    if (!scaleInTrade) return;
    const numPrice = toNum(scaleInPrice, 0);
    const numLots = toNum(scaleInLots, 0);
    const numSl = toNum(scaleInSl, 0);
    const validation = validateScaleIn(scaleInTrade, numPrice, numLots);
    if (!validation.valid) {
      setScaleInError(validation.error || 'Invalid scale-in parameters');
      return;
    }
    addScaleInLeg(scaleInTrade.id, numPrice, numLots, numSl);
    setScaleInTrade(null);
  };

  // Open Partial TP Modal
  const handleOpenPartialTp = (trade: MasterTrade) => {
    setPartialTpTrade(trade);
    const leg1 = trade.legs[0];
    const initialLots = leg1?.lot_size || trade.initial_planned_lots;
    const currentClosedLots = trade.legs
      .filter((l) => l.action === 'PARTIAL_TP')
      .reduce((sum, l) => sum + l.lot_size, 0);
    const availableLots = Math.max(0.01, initialLots - currentClosedLots);

    setPartialLots(Math.round((availableLots / 2) * 100) / 100 || 0.5);
    const defaultTpPrice =
      trade.direction === 'BUY'
        ? Math.round((leg1.price + 5.0) * 100) / 100
        : Math.round((leg1.price - 5.0) * 100) / 100;
    setPartialPrice(defaultTpPrice);
  };

  const handleConfirmPartialTp = () => {
    if (!partialTpTrade) return;
    const numPrice = toNum(partialPrice, 0);
    const numLots = toNum(partialLots, 0);
    takePartialProfit(partialTpTrade.id, numPrice, numLots);
    setPartialTpTrade(null);
  };

  // Move SL to Breakeven
  const handleMoveToBreakeven = (trade: MasterTrade, leg: TradeLeg) => {
    const entryPrice = trade.legs[0]?.price || trade.planned_entry;
    updateLegStopLoss(trade.id, leg.id, entryPrice);
  };

  // Open Close Trade Modal
  const handleOpenClose = (trade: MasterTrade) => {
    setCloseTradeTarget(trade);
    setClosePrice(trade.planned_tp || trade.planned_entry);
    setCloseNotes('');
  };

  const handleConfirmClose = () => {
    if (!closeTradeTarget) return;
    const numPrice = toNum(closePrice, 0);
    closeActiveTrade(closeTradeTarget.id, numPrice, closeNotes.trim() || undefined);
    setCloseTradeTarget(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1f283d]">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">
              Active Trade Manager (Live Multi-Leg Tracking)
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time tracking of open campaigns • Add pyramid scale-ins, bank 1R partials, lock breakeven, and monitor money left on the table.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('calculator')}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-lg shadow-amber-500/20 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          Plan New Trade
        </button>
      </div>

      {/* Zero State */}
      {openTrades.length === 0 ? (
        <div className="bg-[#0f141e] border border-[#1f283d] rounded-2xl p-12 text-center space-y-4 max-w-lg mx-auto shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
            <Activity className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-200">No Active Positions Open</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            All trade campaigns are currently flat. Use the Sizing & Scaling Planner to model an institutional gold setup and push it live to this ledger.
          </p>
          <button
            onClick={() => setActiveTab('calculator')}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors inline-flex items-center gap-2"
          >
            Open Sizing Planner
          </button>
        </div>
      ) : (
        /* Open Trade Cards List */
        <div className="space-y-6">
          {openTrades.map((trade) => {
            const initialLeg = trade.legs[0];
            const initialLots = initialLeg?.lot_size || trade.initial_planned_lots;
            const scaleInLots = trade.legs
              .filter((l) => l.action === 'SCALE_IN')
              .reduce((sum, l) => sum + l.lot_size, 0);
            const partialLotsClosed = trade.legs
              .filter((l) => l.action === 'PARTIAL_TP')
              .reduce((sum, l) => sum + l.lot_size, 0);
            const openLots = Math.max(0, initialLots + scaleInLots - partialLotsClosed);

            // Is Leg 1 at Breakeven or in profit?
            const leg1Sl = initialLeg?.stop_loss;
            const isLeg1Be =
              leg1Sl !== undefined &&
              (trade.direction === 'BUY'
                ? leg1Sl >= initialLeg.price
                : leg1Sl <= initialLeg.price);

            const isExpanded = expandedLegs[trade.id] ?? true;

            return (
              <div
                key={trade.id}
                className="bg-[#0f141e] border border-[#1f283d] rounded-xl overflow-hidden shadow-2xl transition-all"
              >
                {/* Campaign Top Bar */}
                <div className="p-4 bg-[#131926] border-b border-[#1b2333] flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-extrabold ${
                        trade.direction === 'BUY'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {trade.direction === 'BUY' ? (
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5" />
                      )}
                      {trade.direction} {trade.symbol}
                    </span>

                    <span className="text-xs text-slate-300 font-mono-num font-semibold">
                      Running: {openLots.toFixed(2)} lots ({trade.legs.length} {trade.legs.length === 1 ? 'Leg' : 'Legs'})
                    </span>

                    <span className="text-[11px] px-2 py-0.5 rounded bg-[#1b2333] text-slate-400 font-mono-num">
                      {trade.session} Session
                    </span>

                    {isLeg1Be ? (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30">
                        <ShieldCheck className="w-3 h-3" />
                        SL Secured at BE (Scale-in Unlocked)
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] text-amber-400 font-medium px-2 py-0.5 rounded bg-amber-950/40 border border-amber-500/30">
                        <ShieldAlert className="w-3 h-3" />
                        SL at Risk (Move to BE before scaling in)
                      </span>
                    )}
                  </div>

                  {/* Realized Cash & Campaign R */}
                  <div className="flex items-center gap-4 text-xs font-mono-num">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Realized Cash
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          trade.realized_pnl > 0
                            ? 'text-emerald-400'
                            : trade.realized_pnl < 0
                            ? 'text-rose-400'
                            : 'text-slate-300'
                        }`}
                      >
                        ${trade.realized_pnl.toFixed(2)}
                      </span>
                    </div>

                    <div className="h-6 w-px bg-slate-700" />

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Campaign R
                      </span>
                      <span
                        className={`text-sm font-bold ${
                          trade.campaign_r_multiple >= 1
                            ? 'text-emerald-400'
                            : 'text-slate-300'
                        }`}
                      >
                        {trade.campaign_r_multiple.toFixed(2)}R
                      </span>
                    </div>
                  </div>
                </div>

                {/* Campaign Body Details */}
                <div className="p-4 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 text-xs bg-[#0c1017]">
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 block">Initial Entry</span>
                    <span className="font-mono-num font-bold text-slate-200">
                      ${trade.planned_entry.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 block">Planned SL</span>
                    <span className="font-mono-num font-bold text-rose-400">
                      ${trade.planned_sl.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 block">Planned Target (TP)</span>
                    <span className="font-mono-num font-bold text-emerald-400">
                      ${trade.planned_tp.toFixed(2)} ({trade.setup_r_multiple}R)
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 block">Initial Planned Risk</span>
                    <span className="font-mono-num font-bold text-slate-200">
                      ${trade.initial_planned_risk_usd.toFixed(2)} (1.0R)
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 block">Confluences</span>
                    <span className="text-slate-300 font-medium">
                      {[
                        trade.has_sr && 'S/R',
                        trade.has_trendline_3rd_touch && 'Trendline',
                        trade.has_chart_pattern && 'Pattern',
                        trade.has_fibonacci && 'Fib',
                      ]
                        .filter(Boolean)
                        .join(' + ') || 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-500 block">Candle Confirmed</span>
                    <span
                      className={`font-semibold ${
                        trade.candlestick_confirmed ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {trade.candlestick_confirmed ? trade.candlestick_type : 'Unconfirmed'}
                    </span>
                  </div>
                </div>

                {/* Multi-Leg Execution Sub-Cards */}
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => toggleLegs(trade.id)}
                      className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white"
                    >
                      <Layers className="w-3.5 h-3.5 text-amber-400" />
                      <span>Leg Execution Ledger ({trade.legs.length})</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>

                    {/* Actions Row */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenScaleIn(trade)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-semibold transition-colors"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>Scale In (Add Leg)</span>
                      </button>

                      <button
                        onClick={() => handleOpenPartialTp(trade)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-colors"
                      >
                        <Scissors className="w-3.5 h-3.5" />
                        <span>Take Partial TP</span>
                      </button>

                      <button
                        onClick={() => handleOpenClose(trade)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 text-xs font-semibold transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Close Full Trade</span>
                      </button>
                    </div>
                  </div>

                  {/* Expanded Leg Cards */}
                  {isExpanded && (
                    <div className="space-y-2 pt-1">
                      {trade.legs.map((leg, idx) => {
                        const isBe =
                          leg.stop_loss !== undefined &&
                          (trade.direction === 'BUY'
                            ? leg.stop_loss >= leg.price
                            : leg.stop_loss <= leg.price);

                        return (
                          <div
                            key={leg.id}
                            className="bg-[#121824] border border-[#1e273a] rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 font-mono-num font-bold flex items-center justify-center text-[10px]">
                                #{idx + 1}
                              </span>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                      leg.action === 'INITIAL_ENTRY'
                                        ? 'bg-amber-500/20 text-amber-300'
                                        : leg.action === 'SCALE_IN'
                                        ? 'bg-blue-500/20 text-blue-300'
                                        : 'bg-emerald-500/20 text-emerald-300'
                                    }`}
                                  >
                                    {leg.action.replace('_', ' ')}
                                  </span>
                                  <span className="font-mono-num font-bold text-slate-100">
                                    {leg.lot_size} Lots @ ${leg.price.toFixed(2)}
                                  </span>
                                </div>
                                <span className="text-[11px] text-slate-400 block mt-0.5">
                                  {leg.notes || 'Executed in session'}
                                </span>
                              </div>
                            </div>

                            {/* SL and BE Actions */}
                            <div className="flex items-center gap-3 font-mono-num">
                              {leg.stop_loss !== undefined && leg.action !== 'PARTIAL_TP' && (
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400">SL:</span>
                                  <span
                                    className={`font-semibold ${
                                      isBe ? 'text-emerald-400' : 'text-rose-400'
                                    }`}
                                  >
                                    ${leg.stop_loss.toFixed(2)}
                                    {isBe && ' (BE Locked)'}
                                  </span>

                                  {!isBe && (
                                    <button
                                      onClick={() => handleMoveToBreakeven(trade, leg)}
                                      className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold transition-colors"
                                      title="Move this leg's Stop Loss to initial entry price"
                                    >
                                      Lock BE (${trade.planned_entry})
                                    </button>
                                  )}
                                </div>
                              )}

                              {leg.realized_pnl !== 0 && (
                                <div className="text-right">
                                  <span className="text-slate-400 text-[10px] block">Realized</span>
                                  <span className="font-bold text-emerald-400">
                                    +${leg.realized_pnl.toFixed(2)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Scale-In (Pyramiding) */}
      {scaleInTrade && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f141e] border border-[#222e44] rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#1b2333]">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-sm text-slate-100">
                  Scale-In (Pyramid Add-on)
                </h3>
              </div>
              <button
                onClick={() => setScaleInTrade(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {scaleInError && (
              <div className="p-2.5 rounded bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{scaleInError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Add-on Entry Price ($)</label>
                <input
                  type="number"
                  step="0.05"
                  value={scaleInPrice}
                  onChange={(e) => {
                    setScaleInPrice(sanitizeNumberInput(e.target.value));
                    setScaleInError(null);
                  }}
                  placeholder="0.00"
                  className="w-full bg-[#161d2b] border border-[#232f48] focus:border-amber-400 text-slate-100 rounded px-3 py-2 font-mono-num text-sm outline-none transition-colors placeholder:text-slate-600"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Must be favorable vs initial entry (${scaleInTrade.planned_entry}).
                </span>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Add-on Lots (Cap: {scaleInTrade.legs[0]?.lot_size} lots)
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={scaleInTrade.legs[0]?.lot_size}
                  value={scaleInLots}
                  onChange={(e) => {
                    setScaleInLots(sanitizeNumberInput(e.target.value));
                    setScaleInError(null);
                  }}
                  placeholder="0.00"
                  className="w-full bg-[#161d2b] border border-[#232f48] focus:border-amber-400 text-slate-100 rounded px-3 py-2 font-mono-num text-sm outline-none transition-colors placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Independent Leg Stop Loss ($)</label>
                <input
                  type="number"
                  step="0.05"
                  value={scaleInSl}
                  onChange={(e) => setScaleInSl(sanitizeNumberInput(e.target.value))}
                  placeholder="0.00"
                  className="w-full bg-[#161d2b] border border-[#232f48] focus:border-amber-400 text-slate-100 rounded px-3 py-2 font-mono-num text-sm outline-none transition-colors placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1b2333]">
              <button
                onClick={() => setScaleInTrade(null)}
                className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmScaleIn}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg transition-colors"
              >
                Add Pyramid Leg
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Partial Take Profit (1R Rule Enforced) */}
      {partialTpTrade && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f141e] border border-[#222e44] rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1b2333]">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-sm text-slate-100">Take Partial Profit</h3>
              </div>
              <button
                onClick={() => setPartialTpTrade(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Exit Price ($)</label>
                <input
                  type="number"
                  step="0.05"
                  value={partialPrice}
                  onChange={(e) => setPartialPrice(sanitizeNumberInput(e.target.value))}
                  placeholder="0.00"
                  className="w-full bg-[#161d2b] border border-[#232f48] focus:border-amber-400 text-slate-100 rounded px-3 py-2 font-mono-num text-sm outline-none transition-colors placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Lots to Close</label>
                <input
                  type="number"
                  step="0.01"
                  value={partialLots}
                  onChange={(e) => setPartialLots(sanitizeNumberInput(e.target.value))}
                  placeholder="0.00"
                  className="w-full bg-[#161d2b] border border-[#232f48] focus:border-amber-400 text-slate-100 rounded px-3 py-2 font-mono-num text-sm outline-none transition-colors placeholder:text-slate-600"
                />
              </div>

              {/* 1R check calculation */}
              {(() => {
                const leg1 = partialTpTrade.legs[0];
                const numPPrice = toNum(partialPrice, 0);
                const numPLots = toNum(partialLots, 0);
                const cashBanked = calculateGoldCashMove(
                  partialTpTrade.direction,
                  leg1.price,
                  numPPrice,
                  numPLots
                );
                const is1RBanked = cashBanked >= partialTpTrade.initial_planned_risk_usd;

                return (
                  <div
                    className={`p-3 rounded-lg border ${
                      is1RBanked
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                        : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Projected Partial Cash:</span>
                      <span className="font-mono-num font-bold text-sm">
                        +${cashBanked.toFixed(2)}
                      </span>
                    </div>
                    <span className="text-[11px] block mt-1">
                      {is1RBanked
                        ? '✓ Valid: Banks ≥ 1R cash ($' +
                          partialTpTrade.initial_planned_risk_usd.toFixed(2) +
                          '). Leg 1 SL will auto-lock to Breakeven.'
                        : '⚠ Warning: Cash banked is less than 1R ($' +
                          partialTpTrade.initial_planned_risk_usd.toFixed(2) +
                          '). Institutional rule advises banking ≥ 1R on TP1.'}
                    </span>
                  </div>
                );
              })()}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1b2333]">
              <button
                onClick={() => setPartialTpTrade(null)}
                className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPartialTp}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-colors"
              >
                Confirm Partial TP
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Close Full Trade (Money Left on Table calculation) */}
      {closeTradeTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f141e] border border-[#222e44] rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#1b2333]">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-400" />
                <h3 className="font-bold text-sm text-slate-100">Finalize & Close Trade</h3>
              </div>
              <button
                onClick={() => setCloseTradeTarget(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Final Exit Price ($)</label>
                <input
                  type="number"
                  step="0.05"
                  value={closePrice}
                  onChange={(e) => setClosePrice(sanitizeNumberInput(e.target.value))}
                  placeholder="0.00"
                  className="w-full bg-[#161d2b] border border-[#232f48] focus:border-amber-400 text-slate-100 rounded px-3 py-2 font-mono-num text-sm outline-none transition-colors placeholder:text-slate-600"
                />
              </div>

              {/* Premature Runner Exit Check */}
              {(() => {
                const numCPrice = toNum(closePrice, 0);
                const targetReached =
                  closeTradeTarget.direction === 'BUY'
                    ? numCPrice >= closeTradeTarget.planned_tp
                    : numCPrice <= closeTradeTarget.planned_tp;

                const isWinningExit =
                  closeTradeTarget.direction === 'BUY'
                    ? numCPrice > closeTradeTarget.planned_entry
                    : numCPrice < closeTradeTarget.planned_entry;

                if (isWinningExit && !targetReached && closeTradeTarget.planned_tp) {
                  const initialLots =
                    closeTradeTarget.legs[0]?.lot_size || closeTradeTarget.initial_planned_lots;
                  const scaleInLots = closeTradeTarget.legs
                    .filter((l) => l.action === 'SCALE_IN')
                    .reduce((sum, l) => sum + l.lot_size, 0);
                  const partialLotsClosed = closeTradeTarget.legs
                    .filter((l) => l.action === 'PARTIAL_TP')
                    .reduce((sum, l) => sum + l.lot_size, 0);
                  const remainingLots = Math.max(0, initialLots + scaleInLots - partialLotsClosed);
                  const missedDelta = Math.abs(closeTradeTarget.planned_tp - numCPrice);
                  const moneyLeft = missedDelta * remainingLots * 100;

                  return (
                    <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/40 text-amber-300">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span>Premature Exit Detected</span>
                      </div>
                      <p className="text-[11px] mt-1 text-amber-200/90 leading-relaxed">
                        Exiting before planned TP (${closeTradeTarget.planned_tp.toFixed(2)}) leaves{' '}
                        <strong>${moneyLeft.toFixed(2)} on the table</strong>. This will be tracked in your Cost of Mistakes analytics.
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              <div>
                <label className="text-slate-400 block mb-1">Exit Journal Notes</label>
                <textarea
                  rows={2}
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="Reason for closing (e.g. Structure break, rollover cutoff, target hit)..."
                  className="w-full bg-[#161d2b] border border-[#232f48] text-slate-100 rounded p-2 text-xs outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#1b2333]">
              <button
                onClick={() => setCloseTradeTarget(null)}
                className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClose}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition-colors"
              >
                Confirm Full Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
