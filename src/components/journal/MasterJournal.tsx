import React, { useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import { MasterTrade } from '../../types';
import { LogTradeModal } from './LogTradeModal';
import {
  BookOpen,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ExternalLink,
  Eye,
  Layers,
  Trash2,
  Sparkles,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
} from 'lucide-react';

export const MasterJournal: React.FC = () => {
  const { filteredTrades, accounts, deleteTrade } = useTrading();
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [expandedTradeId, setExpandedTradeId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [tradeToDelete, setTradeToDelete] = useState<MasterTrade | null>(null);

  const getAccountName = (accId: string) => {
    const acc = accounts.find((a) => a.id === accId);
    return acc ? `${acc.firm_name} (${acc.name})` : 'Account';
  };

  const toggleExpand = (id: string) => {
    setExpandedTradeId(expandedTradeId === id ? null : id);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1f283d]">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">
              Master Trade Journal & Execution Ledger
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Displaying {filteredTrades.length} trade campaigns dynamically filtered by account, confluences, and discipline.
          </p>
        </div>

        <button
          onClick={() => setIsLogModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-lg shadow-amber-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Log Past Trade (Mobile/Manual)</span>
        </button>
      </div>

      {/* Main Journal Table */}
      {filteredTrades.length === 0 ? (
        <div className="bg-[#0f141e] border border-[#1f283d] rounded-xl p-12 text-center text-slate-400">
          <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-500" />
          <p className="font-semibold">No trade campaigns match your current filters.</p>
          <span className="text-xs text-slate-500 block mt-1">
            Try adjusting your Universal Filter bar or log a new trade above.
          </span>
        </div>
      ) : (
        <div className="bg-[#0f141e] border border-[#1f283d] rounded-xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#121824] text-[11px] uppercase tracking-wider text-slate-400 font-semibold border-b border-[#1f283d]">
                <tr>
                  <th className="py-3 px-4">Trade / Account</th>
                  <th className="py-3 px-4">Direction & Session</th>
                  <th className="py-3 px-4">Confluences & Candle</th>
                  <th className="py-3 px-4">Discipline & Flags</th>
                  <th className="py-3 px-4 font-mono-num">Realized PnL ($)</th>
                  <th className="py-3 px-4 font-mono-num">Campaign R</th>
                  <th className="py-3 px-4">Evidence</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#182133]">
                {filteredTrades.map((trade) => {
                  const isExpanded = expandedTradeId === trade.id;
                  const isScaled = trade.legs && trade.legs.length > 1;

                  return (
                    <React.Fragment key={trade.id}>
                      <tr className="hover:bg-[#131a26]/70 transition-colors">
                        {/* Trade / Account */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                              {trade.symbol}
                            </span>
                            <span className="text-[10px] text-slate-600 dark:text-slate-300 font-medium truncate max-w-[160px]">
                              {getAccountName(trade.account_id)}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono-num font-semibold mt-0.5">
                              {new Date(trade.opened_at).toLocaleDateString()}
                            </span>
                          </div>
                        </td>

                        {/* Direction & Session */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-bold ${
                                trade.direction === 'BUY'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-50 border border-emerald-300 dark:border-emerald-500/60 shadow-xs'
                                  : 'bg-rose-50 dark:bg-rose-950/80 text-rose-900 dark:text-rose-50 border border-rose-300 dark:border-rose-500/60 shadow-xs'
                              }`}
                            >
                              {trade.direction === 'BUY' ? (
                                <ArrowUpRight className="w-3 h-3" />
                              ) : (
                                <ArrowDownRight className="w-3 h-3" />
                              )}
                              {trade.direction}
                            </span>
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#161e2e] text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-semibold">
                              {trade.session}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-600 dark:text-slate-300 font-mono-num font-medium mt-1">
                            {trade.initial_planned_lots} lots • SL ${trade.planned_sl.toFixed(2)}
                          </div>
                        </td>

                        {/* Confluences & Candle */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {trade.has_sr && (
                              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 text-[10px] font-bold shadow-xs">
                                S/R
                              </span>
                            )}
                            {trade.has_trendline_3rd_touch && (
                              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 text-[10px] font-bold shadow-xs">
                                Trendline
                              </span>
                            )}
                            {trade.has_chart_pattern && (
                              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 text-[10px] font-bold shadow-xs">
                                Pattern
                              </span>
                            )}
                            {trade.has_fibonacci && (
                              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 text-[10px] font-bold shadow-xs">
                                Fib
                              </span>
                            )}
                            {!trade.has_sr &&
                              !trade.has_trendline_3rd_touch &&
                              !trade.has_chart_pattern &&
                              !trade.has_fibonacci && (
                                <span className="text-[10px] text-slate-500 font-medium">None</span>
                              )}
                          </div>
                          <div className="mt-1">
                            {trade.candlestick_confirmed ? (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                {trade.candlestick_type}
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Unconfirmed
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Discipline & Flags */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            {trade.is_revenge_trade ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-600 text-white shadow-lg shadow-rose-600/40 animate-pulse">
                                <Flame className="w-3 h-3" />
                                REVENGE TRADE
                              </span>
                            ) : trade.discipline_rating === 'DISCIPLINED' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-50 border border-emerald-300 dark:border-emerald-500/60 shadow-xs">
                                <CheckCircle2 className="w-3 h-3" />
                                Disciplined
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 dark:bg-amber-950/80 text-amber-900 dark:text-amber-50 border border-amber-300 dark:border-amber-500/60 shadow-xs">
                                <AlertTriangle className="w-3 h-3" />
                                Violation
                              </span>
                            )}

                            {trade.premature_exit_loss_usd > 0 && (
                              <span className="block text-[10px] text-amber-700 dark:text-amber-300 font-mono-num font-semibold">
                                Left on table: -${trade.premature_exit_loss_usd.toFixed(0)}
                              </span>
                            )}

                            {trade.is_news_trade && (
                              <span className="block text-[10px] text-amber-700 dark:text-amber-300 font-semibold">
                                News Window
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Realized PnL */}
                        <td className="py-3.5 px-4 font-mono-num">
                          <span
                            className={`text-sm font-bold ${
                              trade.realized_pnl > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : trade.realized_pnl < 0
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {trade.realized_pnl >= 0
                              ? `+$${trade.realized_pnl.toFixed(2)}`
                              : `-$${Math.abs(trade.realized_pnl).toFixed(2)}`}
                          </span>
                        </td>

                        {/* Campaign R */}
                        <td className="py-3.5 px-4 font-mono-num">
                          <span
                            className={`px-2 py-0.5 rounded font-bold text-xs inline-block ${
                              trade.campaign_r_multiple >= 1
                                ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-50 border border-emerald-300 dark:border-emerald-500/60 shadow-xs'
                                : trade.campaign_r_multiple < 0
                                ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-900 dark:text-rose-50 border border-rose-300 dark:border-rose-500/60 shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 shadow-xs'
                            }`}
                          >
                            {trade.campaign_r_multiple.toFixed(2)}R
                          </span>
                          <span className="text-[10px] text-slate-600 dark:text-slate-400 font-semibold block mt-0.5">
                            Plan: {trade.setup_r_multiple}R
                          </span>
                        </td>

                        {/* Evidence */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            {trade.chart_before_url && (
                              <a
                                href={trade.chart_before_url}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded bg-[#182133] hover:bg-[#232f48] text-amber-400 transition-colors"
                                title="Open TradingView Chart"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            {(trade.chart_image_data || trade.chart_before_url) && (
                              <button
                                onClick={() =>
                                  setSelectedImage(trade.chart_image_data || trade.chart_before_url || '')
                                }
                                className="p-1.5 rounded bg-[#182133] hover:bg-[#232f48] text-slate-300 hover:text-white transition-colors"
                                title="View Chart Preview"
                              >
                                <ImageIcon className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {!trade.chart_before_url && !trade.chart_image_data && (
                              <span className="text-slate-600">—</span>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => toggleExpand(trade.id)}
                              className="px-2 py-1 rounded bg-[#182133] hover:bg-[#232f48] text-slate-300 text-[11px] font-semibold flex items-center gap-1"
                            >
                              <Layers className="w-3 h-3 text-amber-400" />
                              <span>{trade.legs.length} {trade.legs.length === 1 ? 'Leg' : 'Legs'}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => setTradeToDelete(trade)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
                              title="Delete Trade"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Legs Accordion */}
                      {isExpanded && (
                        <tr className="bg-slate-50 dark:bg-[#0b0f16]">
                          <td colSpan={8} className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-xs border-b border-slate-200 dark:border-[#1b2333] pb-2">
                                <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                  <Layers className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                                  Multi-Leg Order Tickets for Campaign #{trade.id.slice(-6)}
                                </span>
                                {trade.notes && (
                                  <span className="text-slate-600 dark:text-slate-300 italic max-w-lg truncate">
                                    "{trade.notes}"
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {trade.legs.map((leg, idx) => (
                                  <div
                                    key={leg.id}
                                    className="p-2.5 rounded-lg bg-white dark:bg-[#121824] border border-slate-200 dark:border-[#1e273a] text-xs space-y-1 shadow-xs"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-slate-900 dark:text-slate-100">
                                        #{idx + 1} {leg.action.replace('_', ' ')}
                                      </span>
                                      <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono-num font-semibold">
                                        {new Date(leg.executed_at).toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between font-mono-num text-[11px]">
                                      <span className="text-slate-700 dark:text-slate-300 font-semibold">
                                        {leg.lot_size} Lots @ ${leg.price.toFixed(2)}
                                      </span>
                                      {leg.realized_pnl !== 0 && (
                                        <span
                                          className={`font-bold ${
                                            leg.realized_pnl > 0
                                              ? 'text-emerald-600 dark:text-emerald-400'
                                              : 'text-rose-600 dark:text-rose-400'
                                          }`}
                                        >
                                          {leg.realized_pnl > 0 ? '+' : ''}${leg.realized_pnl.toFixed(2)}
                                        </span>
                                      )}
                                    </div>
                                    {leg.notes && (
                                      <span className="text-[10px] text-slate-600 dark:text-slate-400 block truncate">
                                        {leg.notes}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Standalone Log Trade Modal */}
      <LogTradeModal isOpen={isLogModalOpen} onClose={() => setIsLogModalOpen(false)} />

      {/* Chart Lightbox Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={selectedImage}
              alt="Trading Chart"
              className="rounded-lg shadow-2xl border border-slate-700 max-h-[85vh] object-contain"
            />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-3 -right-3 bg-red-600 text-white rounded-full w-7 h-7 font-bold flex items-center justify-center text-sm shadow-lg"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {tradeToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f141e] border border-slate-200 dark:border-[#222e44] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-500/30 flex items-center justify-center shrink-0 text-rose-600 dark:text-rose-400">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Delete Trade Campaign</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#141a27] border border-slate-200 dark:border-[#222d42] text-xs space-y-1.5 shadow-xs">
              <div className="flex items-center justify-between font-bold">
                <span className="text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                    tradeToDelete.direction === 'BUY'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                  }`}>
                    {tradeToDelete.direction}
                  </span>
                  <span>{tradeToDelete.symbol}</span>
                </span>
                <span className={`font-mono-num font-bold text-sm ${
                  tradeToDelete.realized_pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                }`}>
                  {tradeToDelete.realized_pnl >= 0 ? '+' : ''}${tradeToDelete.realized_pnl.toFixed(2)}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
                <span>Account: {getAccountName(tradeToDelete.account_id)}</span>
                <span className="font-mono-num">{tradeToDelete.legs.length} {tradeToDelete.legs.length === 1 ? 'Leg' : 'Legs'} ({tradeToDelete.initial_planned_lots} lots)</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Are you sure you want to permanently delete this trade? It will be removed from your Master Journal and all performance intelligence analytics and drawdown watermarks will automatically resynchronize.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setTradeToDelete(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteTrade(tradeToDelete.id);
                  setTradeToDelete(null);
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
              >
                Delete Campaign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
