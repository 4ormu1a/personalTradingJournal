import React, { useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import { MasterTrade, TradeDirection, TradeLeg, LegAction } from '../../types';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowRight,
  Database,
  Sparkles,
} from 'lucide-react';

export const StatementImporter: React.FC = () => {
  const { selectedAccount, accounts, bulkImportTrades, setActiveTab } = useTrading();

  const [accountId, setAccountId] = useState<string>(selectedAccount.id);
  const [dragActive, setDragActive] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<MasterTrade[]>([]);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Sample CSV / Statement loaders for instant testing
  const generateSampleExnessData = (): string => {
    return `Ticket,Open Time,Type,Size,Item,Open Price,S / L,T / P,Close Time,Close Price,Commission,Taxes,Swap,Profit
8819201,2026-09-23 08:30:00,buy,1.50,XAUUSD,2648.50,2643.50,2660.00,2026-09-23 10:15:00,2656.80,0.00,0.00,0.00,1245.00
8819202,2026-09-23 09:10:00,buy,0.75,XAUUSD,2651.00,2648.50,2660.00,2026-09-23 10:15:00,2656.80,0.00,0.00,0.00,435.00
8819203,2026-09-22 14:00:00,sell,2.00,XAUUSD,2662.00,2666.00,2645.00,2026-09-22 14:45:00,2666.00,0.00,0.00,0.00,-800.00
8819204,2026-09-21 13:00:00,buy,1.00,XAUUSD,2635.00,2630.00,2650.00,2026-09-21 16:30:00,2647.50,0.00,0.00,0.00,1250.00`;
  };

  const generateSampleMT5Html = (): string => {
    return `<html>
    <body>
      <table>
        <tr><th>Time</th><th>Position</th><th>Symbol</th><th>Type</th><th>Volume</th><th>Price</th><th>S / L</th><th>T / P</th><th>Time</th><th>Price</th><th>Commission</th><th>Swap</th><th>Profit</th></tr>
        <tr><td>2026.09.23 11:20</td><td>990145</td><td>XAUUSD</td><td>buy</td><td>2.00</td><td>2652.00</td><td>2648.00</td><td>2665.00</td><td>2026.09.23 13:40</td><td>2660.50</td><td>0.00</td><td>0.00</td><td>1700.00</td></tr>
        <tr><td>2026.09.23 12:05</td><td>990146</td><td>XAUUSD</td><td>buy</td><td>1.00</td><td>2655.50</td><td>2652.00</td><td>2665.00</td><td>2026.09.23 13:40</td><td>2660.50</td><td>0.00</td><td>0.00</td><td>500.00</td></tr>
      </table>
    </body>
    </html>`;
  };

  // Parser & Auto-Grouping Algorithm:
  // Combines order tickets executed on same day, same symbol, and close in time into unified multi-leg parent campaigns!
  const parseStatementText = (content: string) => {
    try {
      const rows: Array<{
        ticket: string;
        openTime: string;
        type: TradeDirection;
        lots: number;
        symbol: string;
        openPrice: number;
        sl: number;
        tp: number;
        closeTime: string;
        closePrice: number;
        profit: number;
      }> = [];

      // Check if CSV format
      if (content.includes('Ticket') || content.includes(',')) {
        const lines = content.split('\n');
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const cols = line.split(',');
          if (cols.length >= 10) {
            const typeStr = cols[2]?.toLowerCase() || '';
            const direction: TradeDirection = typeStr.includes('buy') ? 'BUY' : 'SELL';
            rows.push({
              ticket: cols[0] || `t-${i}`,
              openTime: cols[1] || new Date().toISOString(),
              type: direction,
              lots: parseFloat(cols[3]) || 1.0,
              symbol: cols[4] || 'XAUUSD',
              openPrice: parseFloat(cols[5]) || 2650,
              sl: parseFloat(cols[6]) || 2645,
              tp: parseFloat(cols[7]) || 2665,
              closeTime: cols[8] || new Date().toISOString(),
              closePrice: parseFloat(cols[9]) || 2655,
              profit: parseFloat(cols[cols.length - 1]) || 0,
            });
          }
        }
      } else if (content.includes('<tr')) {
        // Simple HTML statement regex parser
        const trMatches = content.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
        trMatches.slice(1).forEach((tr, idx) => {
          const tds = (tr.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || []).map((td) =>
            td.replace(/<[^>]+>/g, '').trim()
          );
          if (tds.length >= 8) {
            const direction: TradeDirection = (tds[3] || '').toLowerCase().includes('buy') ? 'BUY' : 'SELL';
            rows.push({
              ticket: tds[1] || `html-${idx}`,
              openTime: (tds[0] || '').replace(/\./g, '-'),
              type: direction,
              lots: parseFloat(tds[4]) || 1.0,
              symbol: tds[2] || 'XAUUSD',
              openPrice: parseFloat(tds[5]) || 2650,
              sl: parseFloat(tds[6]) || 2645,
              tp: parseFloat(tds[7]) || 2665,
              closeTime: (tds[8] || '').replace(/\./g, '-'),
              closePrice: parseFloat(tds[9]) || 2655,
              profit: parseFloat(tds[tds.length - 1]) || 0,
            });
          }
        });
      }

      if (rows.length === 0) {
        setImportStatus('No recognizable trade orders found in statement format.');
        return;
      }

      // Auto-Grouping Algorithm:
      // Group tickets by Symbol + Direction + Open Day / Time proximity (within 3 hours)
      const campaigns: MasterTrade[] = [];
      const visited = new Set<number>();

      for (let i = 0; i < rows.length; i++) {
        if (visited.has(i)) continue;
        const baseRow = rows[i];
        visited.add(i);

        const campaignId = `trade-imp-${Date.now()}-${i}`;
        const campaignLegs: TradeLeg[] = [
          {
            id: `leg-imp-${baseRow.ticket}-1`,
            trade_id: campaignId,
            action: 'INITIAL_ENTRY',
            price: baseRow.openPrice,
            lot_size: baseRow.lots,
            stop_loss: baseRow.sl,
            take_profit: baseRow.tp,
            realized_pnl: 0,
            executed_at: new Date(baseRow.openTime).toISOString(),
            notes: `Ticket #${baseRow.ticket}`,
          },
        ];

        let totalProfit = baseRow.profit;
        let totalLots = baseRow.lots;
        const baseDate = new Date(baseRow.openTime).getTime();

        // Search for scale-ins or split closes within 3 hours
        for (let j = i + 1; j < rows.length; j++) {
          if (visited.has(j)) continue;
          const candidate = rows[j];
          const candDate = new Date(candidate.openTime).getTime();
          const diffHours = Math.abs(candDate - baseDate) / (1000 * 3600);

          if (candidate.symbol === baseRow.symbol && candidate.type === baseRow.type && diffHours <= 3) {
            visited.add(j);
            campaignLegs.push({
              id: `leg-imp-${candidate.ticket}`,
              trade_id: campaignId,
              action: 'SCALE_IN',
              price: candidate.openPrice,
              lot_size: candidate.lots,
              stop_loss: candidate.sl,
              take_profit: candidate.tp,
              realized_pnl: 0,
              executed_at: new Date(candidate.openTime).toISOString(),
              notes: `Auto-grouped split ticket #${candidate.ticket}`,
            });
            totalProfit += candidate.profit;
            totalLots += candidate.lots;
          }
        }

        // Add closing exit leg
        campaignLegs.push({
          id: `leg-imp-exit-${Date.now()}-${i}`,
          trade_id: campaignId,
          action: totalProfit >= 0 ? 'FULL_EXIT' : 'SL_HIT',
          price: baseRow.closePrice,
          lot_size: totalLots,
          realized_pnl: Math.round(totalProfit * 100) / 100,
          executed_at: new Date(baseRow.closeTime).toISOString(),
        });

        const initialRisk = Math.abs(baseRow.openPrice - baseRow.sl) * baseRow.lots * 100 || 500;
        const campaignR = Math.round((totalProfit / initialRisk) * 100) / 100;

        campaigns.push({
          id: campaignId,
          account_id: accountId,
          symbol: baseRow.symbol,
          direction: baseRow.type,
          status: 'CLOSED',
          review_status: 'UNREVIEWED', // <--- Lands directly in Triage Inbox!
          session: 'London',
          has_sr: false,
          has_trendline_3rd_touch: false,
          has_chart_pattern: false,
          has_fibonacci: false,
          candlestick_confirmed: false,
          candlestick_type: 'None',
          is_revenge_trade: false,
          is_news_trade: false,
          premature_exit_loss_usd: 0,
          discipline_rating: 'DISCIPLINED',
          initial_planned_risk_usd: initialRisk,
          planned_entry: baseRow.openPrice,
          planned_sl: baseRow.sl,
          planned_tp: baseRow.tp,
          initial_planned_lots: baseRow.lots,
          realized_pnl: Math.round(totalProfit * 100) / 100,
          setup_r_multiple: 3.0,
          campaign_r_multiple: campaignR,
          notes: `Imported statement campaign. Auto-grouped ${campaignLegs.length - 1} order ticket(s).`,
          opened_at: new Date(baseRow.openTime).toISOString(),
          closed_at: new Date(baseRow.closeTime).toISOString(),
          legs: campaignLegs,
        });
      }

      setParsedPreview(campaigns);
      setImportStatus(`Successfully parsed ${campaigns.length} parent trade campaigns from statement!`);
    } catch (err: any) {
      setImportStatus(`Error parsing statement: ${err.message}`);
    }
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseStatementText(text);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (parsedPreview.length === 0) return;
    bulkImportTrades(parsedPreview);
    setParsedPreview([]);
    setActiveTab('triage');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1f283d]">
        <div>
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">
              Statement Importer Engine (MT4 / MT5 / Exness)
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Bulk-ingest historical trade executions • Auto-grouping algorithm detects split orders and partial tickets.
          </p>
        </div>

        {/* Target Account selector */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-semibold">Assign to Account:</span>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="bg-[#141a27] border border-[#232f48] text-slate-200 rounded px-3 py-1.5 font-medium outline-none"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.firm_name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Drag-and-Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
          dragActive
            ? 'border-amber-400 bg-amber-500/10'
            : 'border-[#222e44] bg-[#0f141e] hover:border-slate-500'
        }`}
      >
        <div className="w-16 h-16 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-amber-400 mb-4 shadow-xl">
          <UploadCloud className="w-8 h-8" />
        </div>

        <h3 className="text-base font-bold text-slate-200 mb-1">
          Drag and Drop Broker Statement File Here
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto mb-5 leading-relaxed">
          Supports <strong>MetaTrader 5 (HTML/CSV)</strong>, <strong>MetaTrader 4 (Detailed Statement HTML)</strong>, and <strong>Exness Personal Area (CSV)</strong>.
        </p>

        <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#182133] hover:bg-[#232f48] border border-[#2c3a54] text-slate-200 font-bold text-xs cursor-pointer shadow-lg transition-colors">
          <FileText className="w-4 h-4 text-amber-400" />
          <span>Browse File from Computer</span>
          <input
            type="file"
            accept=".csv,.html,.htm,.txt"
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
            className="hidden"
          />
        </label>

        {/* 1-Click Sample Testing Buttons */}
        <div className="mt-8 pt-6 border-t border-[#1b2333] flex flex-wrap items-center justify-center gap-3 text-xs">
          <span className="text-slate-400 font-semibold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Quick Demo Presets:
          </span>
          <button
            onClick={() => parseStatementText(generateSampleExnessData())}
            className="px-3 py-1.5 rounded-lg bg-[#141b27] hover:bg-[#1b2538] border border-[#26344d] text-slate-300 font-medium transition-colors"
          >
            Load Sample Exness History (CSV)
          </button>
          <button
            onClick={() => parseStatementText(generateSampleMT5Html())}
            className="px-3 py-1.5 rounded-lg bg-[#141b27] hover:bg-[#1b2538] border border-[#26344d] text-slate-300 font-medium transition-colors"
          >
            Load Sample MT5 Statement (HTML)
          </button>
        </div>
      </div>

      {importStatus && (
        <div className="p-3 rounded-lg bg-[#141a27] border border-[#222d42] text-xs text-slate-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{importStatus}</span>
        </div>
      )}

      {/* Parsed Preview Table */}
      {parsedPreview.length > 0 && (
        <div className="bg-[#0f141e] border border-[#1f283d] rounded-xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Database className="w-4 h-4 text-amber-400" />
                Parsed Trade Campaigns Preview ({parsedPreview.length})
              </h3>
              <span className="text-[11px] text-slate-400">
                These trades will land in the Triage Inbox with <code className="text-amber-400 font-mono-num">UNREVIEWED</code> status.
              </span>
            </div>

            <button
              onClick={handleConfirmImport}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-bold text-xs shadow-xl shadow-amber-500/20 flex items-center gap-2 transition-all"
            >
              <span>Confirm & Send to Triage Inbox</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#121824] text-[11px] uppercase tracking-wider text-slate-400 border-b border-[#1f283d]">
                <tr>
                  <th className="py-2.5 px-3">Symbol & Direction</th>
                  <th className="py-2.5 px-3">Execution Time</th>
                  <th className="py-2.5 px-3">Total Lots</th>
                  <th className="py-2.5 px-3">Legs Grouped</th>
                  <th className="py-2.5 px-3 font-mono-num">Realized PnL ($)</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#182133]">
                {parsedPreview.map((trade) => (
                  <tr key={trade.id} className="hover:bg-[#141a27]">
                    <td className="py-2.5 px-3 font-bold text-slate-200">
                      {trade.direction} {trade.symbol}
                    </td>
                    <td className="py-2.5 px-3 font-mono-num text-slate-400">
                      {new Date(trade.opened_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 font-mono-num">{trade.initial_planned_lots}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-semibold">
                        {trade.legs.length} Legs
                      </span>
                    </td>
                    <td
                      className={`py-2.5 px-3 font-mono-num font-bold ${
                        trade.realized_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {trade.realized_pnl >= 0 ? '+' : ''}${trade.realized_pnl.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-extrabold uppercase">
                        UNREVIEWED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
