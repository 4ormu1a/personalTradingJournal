import React, { useMemo } from 'react';
import { useTrading } from '../../context/TradingContext';
import { MasterTrade } from '../../types';
import { calculateAccountCompliance, checkLotConsistency } from '../../utils/math';
import {
  BarChart3,
  TrendingUp,
  ShieldAlert,
  Flame,
  AlertTriangle,
  Award,
  Sparkles,
  PieChart,
  Layers,
  CheckCircle2,
  DollarSign,
  TrendingDown,
  Percent,
} from 'lucide-react';

export const IntelligenceAnalytics: React.FC = () => {
  const { filteredTrades, selectedAccount } = useTrading();

  const closedTrades = useMemo(
    () => filteredTrades.filter((t) => t.status === 'CLOSED'),
    [filteredTrades]
  );

  // High-Level KPIs
  const totalTrades = closedTrades.length;
  const winningTrades = closedTrades.filter((t) => t.realized_pnl > 0);
  const losingTrades = closedTrades.filter((t) => t.realized_pnl < 0);
  const breakevenTrades = closedTrades.filter((t) => t.realized_pnl === 0);

  const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
  const netProfit = closedTrades.reduce((sum, t) => sum + t.realized_pnl, 0);

  const grossProfit = winningTrades.reduce((sum, t) => sum + t.realized_pnl, 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.realized_pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;

  const avgWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
  const avgLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;

  const avgCampaignR =
    totalTrades > 0
      ? closedTrades.reduce((sum, t) => sum + t.campaign_r_multiple, 0) / totalTrades
      : 0;

  // 1. Cost of Mistakes & Indiscipline Meter
  const revengeLosses = closedTrades
    .filter((t) => t.is_revenge_trade && t.realized_pnl < 0)
    .reduce((sum, t) => sum + Math.abs(t.realized_pnl), 0);

  const unconfirmedLosses = closedTrades
    .filter((t) => !t.candlestick_confirmed && t.realized_pnl < 0)
    .reduce((sum, t) => sum + Math.abs(t.realized_pnl), 0);

  const prematureExitLosses = closedTrades.reduce(
    (sum, t) => sum + (t.premature_exit_loss_usd || 0),
    0
  );

  const totalMistakeCost = revengeLosses + unconfirmedLosses + prematureExitLosses;
  const potentialNetProfit = netProfit + totalMistakeCost;

  // 2. Setup Confluences Win-Rate Matrix
  const confluenceMatrix = useMemo(() => {
    const categories = [
      {
        id: 'sr_trend',
        label: 'S/R + Trendline 3rd Touch',
        filter: (t: MasterTrade) => t.has_sr && t.has_trendline_3rd_touch,
      },
      {
        id: 'sr_fib',
        label: 'S/R + Fibonacci Pocket',
        filter: (t: MasterTrade) => t.has_sr && t.has_fibonacci,
      },
      {
        id: 'pattern_sr',
        label: 'Chart Pattern + S/R Level',
        filter: (t: MasterTrade) => t.has_chart_pattern && t.has_sr,
      },
      {
        id: 'sr_only',
        label: 'Support / Resistance Alone',
        filter: (t: MasterTrade) => t.has_sr && !t.has_trendline_3rd_touch && !t.has_fibonacci,
      },
      {
        id: 'multi_confluence',
        label: 'Triple+ Confluence (S/R + Trend + Fib/Pattern)',
        filter: (t: MasterTrade) =>
          [t.has_sr, t.has_trendline_3rd_touch, t.has_chart_pattern, t.has_fibonacci].filter(
            Boolean
          ).length >= 3,
      },
    ];

    return categories.map((cat) => {
      const matchTrades = closedTrades.filter(cat.filter);
      const wins = matchTrades.filter((t) => t.realized_pnl > 0).length;
      const count = matchTrades.length;
      const rate = count > 0 ? (wins / count) * 100 : 0;
      const pnl = matchTrades.reduce((sum, t) => sum + t.realized_pnl, 0);
      const avgR =
        count > 0 ? matchTrades.reduce((sum, t) => sum + t.campaign_r_multiple, 0) / count : 0;

      return {
        ...cat,
        count,
        wins,
        rate,
        pnl,
        avgR,
      };
    });
  }, [closedTrades]);

  // Prop Compliance & Watermark
  const compliance = calculateAccountCompliance(selectedAccount);
  const consistency = checkLotConsistency(closedTrades, 2.0);

  // SVG Equity Curve Data Points
  const equityPoints = useMemo(() => {
    let running = selectedAccount.starting_balance;
    const points: Array<{ date: string; balance: number }> = [
      { date: 'Start', balance: running },
    ];
    // Sort chronological
    const sorted = [...closedTrades].sort(
      (a, b) => new Date(a.opened_at).getTime() - new Date(b.opened_at).getTime()
    );
    sorted.forEach((t) => {
      running += t.realized_pnl;
      points.push({
        date: new Date(t.opened_at).toLocaleDateString([], { month: 'numeric', day: 'numeric' }),
        balance: Math.round(running * 100) / 100,
      });
    });
    return points;
  }, [closedTrades, selectedAccount.starting_balance]);

  // Compute SVG polyline coordinates
  const minBal = Math.min(...equityPoints.map((p) => p.balance), selectedAccount.starting_balance * 0.95);
  const maxBal = Math.max(...equityPoints.map((p) => p.balance), selectedAccount.starting_balance * 1.08);
  const svgWidth = 600;
  const svgHeight = 180;
  const padding = 20;

  const svgCoords = equityPoints.map((p, idx) => {
    const x = padding + (idx / Math.max(1, equityPoints.length - 1)) * (svgWidth - padding * 2);
    const y =
      svgHeight -
      padding -
      ((p.balance - minBal) / Math.max(1, maxBal - minBal)) * (svgHeight - padding * 2);
    return `${x},${y}`;
  });

  const polylineStr = svgCoords.join(' ');

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1f283d]">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">
              Behavioral & Confluence Edge Intelligence
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Institutional metrics • Confluence win-rate matrix, cost of indiscipline meter, and prop firm drawdown watermark.
          </p>
        </div>

        <span className="text-xs font-mono-num text-slate-400 bg-[#121824] px-3 py-1.5 rounded-lg border border-[#1f283d]">
          Analyzing {totalTrades} Closed Campaigns
        </span>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#0f141e] border border-[#1f283d] rounded-xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Win Rate</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold font-mono-num text-slate-100">
              {winRate.toFixed(1)}%
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {winningTrades.length}W / {losingTrades.length}L / {breakevenTrades.length}BE
          </span>
        </div>

        <div className="bg-[#0f141e] border border-[#1f283d] rounded-xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Net Realized PnL</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span
              className={`text-2xl font-bold font-mono-num ${
                netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {netProfit >= 0 ? `+$${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `-$${Math.abs(netProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Filtered campaigns</span>
        </div>

        <div className="bg-[#0f141e] border border-[#1f283d] rounded-xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Profit Factor</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold font-mono-num text-amber-300">
              {profitFactor.toFixed(2)}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            +${grossProfit.toFixed(0)} / -${grossLoss.toFixed(0)}
          </span>
        </div>

        <div className="bg-[#0f141e] border border-[#1f283d] rounded-xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Avg Campaign R</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span
              className={`text-2xl font-bold font-mono-num ${
                avgCampaignR >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {avgCampaignR.toFixed(2)}R
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Realized multiple</span>
        </div>

        <div className="bg-[#0f141e] border border-[#1f283d] rounded-xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Avg Win / Avg Loss</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-lg font-bold font-mono-num text-slate-100">
              ${avgWin.toFixed(0)} / ${avgLoss.toFixed(0)}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            Ratio: {avgLoss > 0 ? (avgWin / avgLoss).toFixed(2) : '—'}
          </span>
        </div>

        <div className="bg-[#0f141e] border border-[#1f283d] rounded-xl p-4">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Leak Cost</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold font-mono-num text-rose-400">
              -${totalMistakeCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>
          <span className="text-[10px] text-rose-300/80 mt-1 block">Lost to indiscipline</span>
        </div>
      </div>

      {/* Row 2: Equity Curve & Cost of Indiscipline Comparative Meter */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Dynamic SVG Equity Curve (7 cols) */}
        <div className="lg:col-span-7 bg-[#0f141e] border border-[#1f283d] rounded-xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Cumulative Capital Curve (Realized)
              </span>
              <span className="text-[11px] text-slate-500">
                Tracked from initial starting balance of ${selectedAccount.starting_balance.toLocaleString()}
              </span>
            </div>

            <div className="text-right font-mono-num">
              <span className="text-xs text-slate-400">Current Balance:</span>
              <span className="text-sm font-bold text-amber-300 ml-1.5">
                ${selectedAccount.current_balance.toLocaleString()}
              </span>
            </div>
          </div>

          {/* SVG Chart */}
          <div className="w-full bg-[#0c1017] rounded-lg border border-[#182030] p-2 relative overflow-hidden">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-44 overflow-visible"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Baseline at starting balance */}
              {(() => {
                const yBase =
                  svgHeight -
                  padding -
                  ((selectedAccount.starting_balance - minBal) / Math.max(1, maxBal - minBal)) *
                    (svgHeight - padding * 2);
                return (
                  <line
                    x1={padding}
                    y1={yBase}
                    x2={svgWidth - padding}
                    y2={yBase}
                    stroke="#334155"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                );
              })()}

              {/* Area polygon */}
              {polylineStr && (
                <polygon
                  points={`${padding},${svgHeight - padding} ${polylineStr} ${
                    svgCoords[svgCoords.length - 1]?.split(',')[0]
                  },${svgHeight - padding}`}
                  fill="url(#equityGrad)"
                />
              )}

              {/* Line */}
              {polylineStr && (
                <polyline
                  points={polylineStr}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Dots */}
              {svgCoords.map((coord, i) => {
                const [cx, cy] = coord.split(',').map(Number);
                return (
                  <circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r="3.5"
                    fill="#10b981"
                    stroke="#0c1017"
                    strokeWidth="1.5"
                  />
                );
              })}
            </svg>

            <div className="flex justify-between text-[10px] text-slate-500 px-2 mt-1 font-mono-num">
              <span>{equityPoints[0]?.date}</span>
              <span>{equityPoints[equityPoints.length - 1]?.date}</span>
            </div>
          </div>
        </div>

        {/* Cost of Indiscipline Comparative Meter (5 cols) */}
        <div className="lg:col-span-5 bg-[#0f141e] border border-[#1f283d] rounded-xl p-5 shadow-2xl space-y-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-rose-400" />
              Cost of Indiscipline Meter
            </span>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Quantifying money lost to revenge trades, impulse entries, and fear-based runner exits.
            </span>
          </div>

          {/* Comparative Bar: Actual vs Potential */}
          <div className="p-3.5 rounded-lg bg-[#141a27] border border-[#222d42] space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Actual Realized Net P&L:</span>
              <span
                className={`font-mono-num font-bold ${
                  netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                ${netProfit.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-emerald-300">P&L Without Rule Violations:</span>
              <span className="font-mono-num text-emerald-400 text-sm">
                +${potentialNetProfit.toFixed(2)}
              </span>
            </div>

            {/* Visual ratio bar */}
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(10, (Math.max(0, netProfit) / Math.max(1, potentialNetProfit)) * 100)
                  )}%`,
                }}
                title="Disciplined profit retained"
              />
              <div
                className="bg-rose-500 h-full"
                style={{
                  width: `${Math.min(
                    90,
                    Math.max(10, (totalMistakeCost / Math.max(1, potentialNetProfit)) * 100)
                  )}%`,
                }}
                title="Lost to indiscipline"
              />
            </div>
          </div>

          {/* Breakdown of Leaks */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded bg-[#121824] border border-[#1c2537]">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                Revenge Trades (&lt;60m cooldown breach)
              </span>
              <span className="font-mono-num font-bold text-rose-400">
                -${revengeLosses.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-[#121824] border border-[#1c2537]">
              <span className="flex items-center gap-1.5 text-slate-300">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Impulse / Unconfirmed Candlestick
              </span>
              <span className="font-mono-num font-bold text-amber-400">
                -${unconfirmedLosses.toFixed(2)}
              </span>
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-[#121824] border border-[#1c2537]">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Layers className="w-3.5 h-3.5 text-blue-400" />
                Premature Runner Exits (Left on table)
              </span>
              <span className="font-mono-num font-bold text-blue-400">
                -${prematureExitLosses.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Confluence Win-Rate Matrix & Prop Firm Compliance Watermark */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Setup Confluence Matrix (8 cols) */}
        <div className="lg:col-span-8 bg-[#0f141e] border border-[#1f283d] rounded-xl p-5 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Setup Confluence Win-Rate Matrix & Edge Ranking
              </span>
              <span className="text-[11px] text-slate-500">
                Comparing win rate, average R multiple, and net yield across strategy combinations.
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#121824] text-[10px] uppercase tracking-wider text-slate-400 border-b border-[#1f283d]">
                <tr>
                  <th className="py-2.5 px-3">Setup Confluence</th>
                  <th className="py-2.5 px-3 text-center">Trades</th>
                  <th className="py-2.5 px-3 text-center">Win Rate</th>
                  <th className="py-2.5 px-3 font-mono-num text-center">Avg R</th>
                  <th className="py-2.5 px-3 font-mono-num text-right">Net PnL ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#182133]">
                {confluenceMatrix.map((item) => (
                  <tr key={item.id} className="hover:bg-[#141a27]">
                    <td className="py-3 px-3 font-bold text-slate-200">
                      {item.label}
                    </td>
                    <td className="py-3 px-3 text-center font-mono-num text-slate-400">
                      {item.count}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              item.rate >= 60
                                ? 'bg-emerald-500'
                                : item.rate >= 40
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${item.rate}%` }}
                          />
                        </div>
                        <span className="font-mono-num font-bold text-slate-200">
                          {item.rate.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center font-mono-num font-semibold text-amber-300">
                      {item.avgR.toFixed(2)}R
                    </td>
                    <td
                      className={`py-3 px-3 text-right font-mono-num font-bold ${
                        item.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {item.pnl >= 0 ? '+' : ''}${item.pnl.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Prop Firm Compliance Gauge & Watermark (4 cols) */}
        <div className="lg:col-span-4 bg-[#0f141e] border border-[#1f283d] rounded-xl p-5 shadow-2xl space-y-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Prop Compliance Sentinel
            </span>
            <span className="text-[11px] text-slate-500 block mt-0.5">
              {selectedAccount.name} ({selectedAccount.category.toUpperCase().replace('_', ' ')})
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Daily Floor */}
            <div className="p-3 rounded-lg bg-[#141a27] border border-[#222d42] space-y-1.5">
              <div className="flex justify-between items-center text-slate-400">
                <span>Daily Drawdown Floor:</span>
                <span className="font-mono-num text-slate-200 font-bold">
                  ${compliance.dailyFloor.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Remaining Daily Headroom:</span>
                <span
                  className={`font-mono-num font-bold ${
                    compliance.remainingDailyHeadroom < 1000 ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  ${compliance.remainingDailyHeadroom.toFixed(2)}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full"
                  style={{ width: `${Math.max(5, 100 - compliance.dailyUsedPct)}%` }}
                />
              </div>
            </div>

            {/* Overall Max Floor */}
            <div className="p-3 rounded-lg bg-[#141a27] border border-[#222d42] space-y-1.5">
              <div className="flex justify-between items-center text-slate-400">
                <span>Overall Max Drawdown Floor:</span>
                <span className="font-mono-num text-slate-200 font-bold">
                  ${compliance.maxFloor.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Remaining Max Headroom:</span>
                <span className="font-mono-num font-bold text-emerald-400">
                  ${compliance.remainingMaxHeadroom.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Rolling 2x Lot Size Consistency */}
            <div className="p-3 rounded-lg bg-[#141a27] border border-[#222d42] space-y-1">
              <div className="flex justify-between items-center text-slate-400">
                <span>Historical Rolling Avg Lots:</span>
                <span className="font-mono-num text-slate-200 font-bold">
                  {consistency.avgLots.toFixed(2)} lots
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Consistency Ceiling (2x):</span>
                <span className="font-mono-num text-amber-400 font-bold">
                  {consistency.maxAllowedLots.toFixed(2)} lots
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
