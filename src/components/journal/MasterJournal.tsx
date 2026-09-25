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
                            <span className="font-bold text-slate-200 text-xs">
                              {trade.symbol}
                            </span>
                            <span className="text-[10px] text-slate-400 truncate max-w-[160px]">
                              {getAccountName(trade.account_id)}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono-num mt-0.5">
                              {new Date(trade.opened_at).toLocaleDateString()}
                            </span>
                          </div>
                        </td>

                        {/* Direction & Session */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                trade.direction === 'BUY'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}
                            >
                              {trade.direction === 'BUY' ? (
                                <ArrowUpRight className="w-3 h-3" />
                              ) : (
                                <ArrowDownRight className="w-3 h-3" />
                              )}
                              {trade.direction}
                            </span>
                            <span className="text-[11px] px-1.5 py-0.5 rounded bg-[#161e2e] text-slate-400">
                              {trade.session}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono-num mt-1">
                            {trade.initial_planned_lots} lots • SL ${trade.planned_sl.toFixed(2)}
                          </div>
                        </td>

                        {/* Confluences & Candle */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1 max-w-[200px]">
                            {trade.has_sr && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-medium">
                                S/R
                              </span>
                            )}
                            {trade.has_trendline_3rd_touch && (
                              <span className="px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[10px] font-medium">
                                Trendline
                              </span>
                            )}
                            {trade.has_chart_pattern && (
                              <span className="px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30 text-[10px] font-medium">
                                Pattern
                              </span>
                            )}
                            {trade.has_fibonacci && (
                              <span className="px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[10px] font-medium">
                                Fib
                              </span>
                            )}
                            {!trade.has_sr &&
                              !trade.has_trendline_3rd_touch &&
                              !trade.has_chart_pattern &&
                              !trade.has_fibonacci && (
                                <span className="text-[10px] text-slate-500">None</span>
                              )}
                          </div>
                          <div className="mt-1">
                            {trade.candlestick_confirmed ? (
                              <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                {trade.candlestick_type}
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-400 font-medium flex items-center gap-1">
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
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3" />
                                Disciplined
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                <AlertTriangle className="w-3 h-3" />
                                Violation
                              </span>
                            )}

                            {trade.premature_exit_loss_usd > 0 && (
                              <span className="block text-[10px] text-amber-400 font-mono-num">
                                Left on table: -${trade.premature_exit_loss_usd.toFixed(0)}
                              </span>
                            )}

                            {trade.is_news_trade && (
                              <span className="block text-[10px] text-blue-400 font-medium">
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
                                ? 'text-emerald-400'
                                : trade.realized_pnl < 0
                                ? 'text-rose-400'
                                : 'text-slate-400'
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
                            className={`px-2 py-0.5 rounded font-bold text-xs ${
                              trade.campaign_r_multiple >= 1
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : trade.campaign_r_multiple < 0
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {trade.campaign_r_multiple.toFixed(2)}R
                          </span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
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
                                className="p-1.5 rounded bg-[#182133] hover:bg-[#232f48] text-blue-400 transition-colors"
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
                              onClick={() => {
                                if (confirm('Delete this trade campaign?')) {
                                  deleteTrade(trade.id);
                                }
                              }}
                              className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                              title="Delete Trade"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Legs Accordion */}
                      {isExpanded && (
                        <tr className="bg-[#0b0f16]">
                          <td colSpan={8} className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-xs border-b border-[#1b2333] pb-2">
                                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                                  Multi-Leg Order Tickets for Campaign #{trade.id.slice(-6)}
                                </span>
                                {trade.notes && (
                                  <span className="text-slate-400 italic max-w-lg truncate">
                                    "{trade.notes}"
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {trade.legs.map((leg, idx) => (
                                  <div
                                    key={leg.id}
                                    className="p-2.5 rounded bg-[#121824] border border-[#1e273a] text-xs space-y-1"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-slate-200">
                                        #{idx + 1} {leg.action.replace('_', ' ')}
                                      </span>
                                      <span className="text-[10px] text-slate-500 font-mono-num">
                                        {new Date(leg.executed_at).toLocaleTimeString([], {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between font-mono-num text-[11px]">
                                      <span className="text-slate-400">
                                        {leg.lot_size} Lots @ ${leg.price.toFixed(2)}
                                      </span>
                                      {leg.realized_pnl !== 0 && (
                                        <span
                                          className={`font-bold ${
                                            leg.realized_pnl > 0
                                              ? 'text-emerald-400'
                                              : 'text-rose-400'
                                          }`}
                                        >
                                          {leg.realized_pnl > 0 ? '+' : ''}${leg.realized_pnl.toFixed(2)}
                                        </span>
                                      )}
                                    </div>
                                    {leg.notes && (
                                      <span className="text-[10px] text-slate-400 block truncate">
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
    </div>
  );
};
