import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Area,
} from 'recharts';
import { useTrading } from '../../context/TradingContext';
import { MasterTrade } from '../../types';
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  DollarSign,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react';

export type ChartViewMode = 'daily' | 'cumulative' | 'both';

interface DailyPnLLineChartProps {
  selectedMonth: Date;
  onMonthChange: (newMonth: Date) => void;
}

export const DailyPnLLineChart: React.FC<DailyPnLLineChartProps> = ({
  selectedMonth,
  onMonthChange,
}) => {
  const { filteredTrades, accounts } = useTrading();

  // Mode: Daily PnL vs Cumulative Trajectory vs Both
  const [viewMode, setViewMode] = useState<ChartViewMode>('both');
  const [accountFilter, setAccountFilter] = useState<string>('ALL');

  const year = selectedMonth.getFullYear();
  const month = selectedMonth.getMonth(); // 0-indexed

  const monthLabel = selectedMonth.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });

  const handlePrevMonth = () => {
    onMonthChange(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    onMonthChange(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    onMonthChange(new Date(2026, 8, 1)); // Default anchor: Sep 2026
  };

  // Filter closed trades for the selected month and optional account
  const monthTrades = useMemo(() => {
    return filteredTrades.filter((t) => {
      if (t.status !== 'CLOSED') return false;
      if (accountFilter !== 'ALL' && t.account_id !== accountFilter) return false;

      const dateStr = t.closed_at || t.opened_at;
      if (!dateStr) return false;

      const tradeDate = new Date(dateStr);
      return (
        tradeDate.getFullYear() === year &&
        tradeDate.getMonth() === month
      );
    });
  }, [filteredTrades, year, month, accountFilter]);

  // Aggregate trades by day number (1 .. totalDaysInMonth)
  const chartData = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const data: Array<{
      day: number;
      dateStr: string;
      displayDate: string;
      shortLabel: string;
      dailyPnl: number;
      cumulativePnl: number;
      tradesCount: number;
      wins: number;
      losses: number;
      rMultiple: number;
      volume: number;
      hasTrades: boolean;
      tags: string[];
    }> = [];

    // Group month trades by day of month
    const tradesByDay = new Map<number, MasterTrade[]>();
    for (const t of monthTrades) {
      const dateStr = t.closed_at || t.opened_at;
      const dayNum = new Date(dateStr).getDate();
      const existing = tradesByDay.get(dayNum) || [];
      existing.push(t);
      tradesByDay.set(dayNum, existing);
    }

    let runningCumulativePnl = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dayTrades = tradesByDay.get(d) || [];
      const hasTrades = dayTrades.length > 0;
      const dailyPnl = dayTrades.reduce((sum, t) => sum + t.realized_pnl, 0);
      const rMultiple = dayTrades.reduce((sum, t) => sum + (t.campaign_r_multiple || 0), 0);
      const volume = dayTrades.reduce((sum, t) => sum + (t.initial_planned_lots || 0), 0);
      const wins = dayTrades.filter((t) => t.realized_pnl > 0).length;
      const losses = dayTrades.filter((t) => t.realized_pnl < 0).length;

      runningCumulativePnl += dailyPnl;

      const fullDate = new Date(year, month, d);
      const shortMonth = fullDate.toLocaleString('default', { month: 'short' });
      const weekday = fullDate.toLocaleString('default', { weekday: 'short' });

      // Collect setup tags
      const tagsSet = new Set<string>();
      dayTrades.forEach((t) => {
        if (t.has_sr) tagsSet.add('S/R');
        if (t.has_trendline_3rd_touch) tagsSet.add('Trendline');
        if (t.has_chart_pattern) tagsSet.add('Pattern');
        if (t.has_fibonacci) tagsSet.add('Fib');
        if (t.is_revenge_trade) tagsSet.add('Revenge');
      });

      data.push({
        day: d,
        dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        displayDate: `${weekday}, ${shortMonth} ${d}`,
        shortLabel: `${shortMonth} ${d}`,
        dailyPnl: Number(dailyPnl.toFixed(2)),
        cumulativePnl: Number(runningCumulativePnl.toFixed(2)),
        tradesCount: dayTrades.length,
        wins,
        losses,
        rMultiple: Number(rMultiple.toFixed(2)),
        volume: Number(volume.toFixed(2)),
        hasTrades,
        tags: Array.from(tagsSet),
      });
    }

    return data;
  }, [year, month, monthTrades]);

  // Aggregate statistics for selected month
  const monthStats = useMemo(() => {
    let totalPnl = 0;
    let totalR = 0;
    let greenDays = 0;
    let redDays = 0;
    let activeDays = 0;
    let bestDayPnl = -Infinity;
    let bestDayLabel = '';
    let worstDayPnl = Infinity;
    let worstDayLabel = '';

    chartData.forEach((d) => {
      if (d.hasTrades) {
        activeDays++;
        totalPnl += d.dailyPnl;
        totalR += d.rMultiple;
        if (d.dailyPnl > 0) {
          greenDays++;
          if (d.dailyPnl > bestDayPnl) {
            bestDayPnl = d.dailyPnl;
            bestDayLabel = d.displayDate;
          }
        } else if (d.dailyPnl < 0) {
          redDays++;
          if (d.dailyPnl < worstDayPnl) {
            worstDayPnl = d.dailyPnl;
            worstDayLabel = d.displayDate;
          }
        }
      }
    });

    const avgDailyPnl = activeDays > 0 ? totalPnl / activeDays : 0;

    return {
      totalPnl,
      totalR,
      greenDays,
      redDays,
      activeDays,
      avgDailyPnl,
      bestDay: bestDayPnl > -Infinity ? { pnl: bestDayPnl, label: bestDayLabel } : null,
      worstDay: worstDayPnl < Infinity ? { pnl: worstDayPnl, label: worstDayLabel } : null,
    };
  }, [chartData]);

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isPositive = data.dailyPnl >= 0;
      const isCumPositive = data.cumulativePnl >= 0;

      return (
        <div className="bg-white dark:bg-[#0f141e] border border-slate-200 dark:border-[#222d42] p-3.5 rounded-xl shadow-2xl text-xs space-y-2 min-w-[200px]">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-[#1b2333]">
            <span className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              {data.displayDate}
            </span>
            {data.hasTrades ? (
              <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {data.tradesCount} {data.tradesCount === 1 ? 'Trade' : 'Trades'}
              </span>
            ) : (
              <span className="text-[10px] text-slate-400">No executions</span>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Daily P&L:</span>
              <span
                className={`font-mono-num font-extrabold text-sm ${
                  data.hasTrades
                    ? isPositive
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-400'
                }`}
              >
                {data.hasTrades
                  ? `${isPositive ? '+' : ''}$${data.dailyPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : '$0.00'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Cumulative Trajectory:</span>
              <span
                className={`font-mono-num font-bold ${
                  isCumPositive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {isCumPositive ? '+' : ''}${data.cumulativePnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {data.hasTrades && (
              <>
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="text-slate-500 dark:text-slate-400">Realized R / Volume:</span>
                  <span className="font-mono-num text-slate-700 dark:text-slate-200 font-semibold">
                    {data.rMultiple >= 0 ? '+' : ''}{data.rMultiple.toFixed(2)}R • {data.volume.toFixed(2)}L
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 dark:text-slate-400">Outcome:</span>
                  <span className="font-mono-num text-slate-700 dark:text-slate-200 font-semibold">
                    {data.wins}W / {data.losses}L
                  </span>
                </div>

                {data.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {data.tags.map((t: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom dot renderer for daily PnL line
  const renderDailyDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload || !payload.hasTrades) return null;

    const isPositive = payload.dailyPnl >= 0;
    return (
      <circle
        key={`dot-${payload.day}`}
        cx={cx}
        cy={cy}
        r={4.5}
        fill={isPositive ? '#10b981' : '#f43f5e'}
        stroke="#ffffff"
        strokeWidth={1.5}
        className="transition-all hover:r-6 cursor-pointer"
      />
    );
  };

  return (
    <div className="bg-white dark:bg-[#0f141e] border border-slate-200 dark:border-[#1f283d] rounded-2xl p-5 shadow-2xl space-y-4">
      {/* 1. Header with Month Navigator and View Mode Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-[#1a2336]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Daily PnL Performance Line Chart
              </h2>
              <span
                className={`px-2 py-0.5 rounded-lg text-xs font-mono-num font-bold border shadow-xs ${
                  monthStats.totalPnl >= 0
                    ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                    : 'bg-rose-50 dark:bg-rose-950/70 border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300'
                }`}
              >
                {monthStats.totalPnl >= 0
                  ? `+$${monthStats.totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : `-$${Math.abs(monthStats.totalPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Visualizes daily realized P&L and cumulative month trajectory across {monthLabel}.
            </p>
          </div>
        </div>

        {/* Controls: Month Nav & View Mode */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Month Stepper */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-[#131a27] p-1 rounded-xl border border-slate-300 dark:border-[#222d42]">
            <button
              type="button"
              onClick={handleToday}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#1f2a3e] text-slate-800 dark:text-slate-200 font-bold border border-slate-200 dark:border-[#2f3e58] hover:bg-slate-50 dark:hover:bg-[#283852] transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-[#1f2a3e] text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-slate-800 dark:text-slate-200 px-2 min-w-[110px] text-center">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-[#1f2a3e] text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#131a27] p-1 rounded-xl border border-slate-300 dark:border-[#222d42]">
            <button
              type="button"
              onClick={() => setViewMode('daily')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'daily'
                  ? 'bg-amber-500 text-black shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Daily P&L
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cumulative')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'cumulative'
                  ? 'bg-amber-500 text-black shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Cumulative Trajectory
            </button>
            <button
              type="button"
              onClick={() => setViewMode('both')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                viewMode === 'both'
                  ? 'bg-amber-500 text-black shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Combined View
            </button>
          </div>

          {/* Account Filter */}
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="bg-slate-100 dark:bg-[#141a27] border border-slate-300 dark:border-[#232f48] text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
          >
            <option value="ALL">All Accounts</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 2. Micro Stat Badges Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#131926] border border-slate-200 dark:border-[#1e273a]">
          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
            Trading Days
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-extrabold font-mono-num text-slate-900 dark:text-slate-100">
              {monthStats.activeDays}
            </span>
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
              {monthStats.greenDays}G
            </span>
            <span className="text-slate-400">/</span>
            <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
              {monthStats.redDays}R
            </span>
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#131926] border border-slate-200 dark:border-[#1e273a]">
          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
            Average Day P&L
          </span>
          <span
            className={`text-base font-extrabold font-mono-num ${
              monthStats.avgDailyPnl >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {monthStats.avgDailyPnl >= 0 ? '+' : ''}${monthStats.avgDailyPnl.toFixed(2)}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#131926] border border-slate-200 dark:border-[#1e273a]">
          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
            Total Campaign R
          </span>
          <span
            className={`text-base font-extrabold font-mono-num ${
              monthStats.totalR >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {monthStats.totalR >= 0 ? '+' : ''}${monthStats.totalR.toFixed(2)}R
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#131926] border border-slate-200 dark:border-[#1e273a]">
          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
            Best Winning Day
          </span>
          <span className="text-base font-extrabold font-mono-num text-emerald-600 dark:text-emerald-400">
            {monthStats.bestDay ? `+$${monthStats.bestDay.pnl.toFixed(2)}` : '—'}
          </span>
          <span className="text-[10px] text-slate-500 block truncate mt-0.5">
            {monthStats.bestDay ? monthStats.bestDay.label : 'None'}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#131926] border border-slate-200 dark:border-[#1e273a]">
          <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
            Worst Losing Day
          </span>
          <span className="text-base font-extrabold font-mono-num text-rose-600 dark:text-rose-400">
            {monthStats.worstDay ? `-$${Math.abs(monthStats.worstDay.pnl).toFixed(2)}` : '—'}
          </span>
          <span className="text-[10px] text-slate-500 block truncate mt-0.5">
            {monthStats.worstDay ? monthStats.worstDay.label : 'None'}
          </span>
        </div>
      </div>

      {/* 3. Recharts Line Chart Canvas */}
      <div className="w-full h-[320px] pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 15, left: 0, bottom: 5 }}
          >
            <defs>
              {/* Gradient for Cumulative Equity Area */}
              <linearGradient id="pnlGradGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="pnlGradCyan" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#334155"
              strokeOpacity={0.4}
              vertical={false}
            />

            <XAxis
              dataKey="day"
              stroke="#64748b"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={{ stroke: '#475569' }}
              axisLine={{ stroke: '#475569' }}
              tickFormatter={(val) => `D${val}`}
            />

            <YAxis
              stroke="#64748b"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={{ stroke: '#475569' }}
              axisLine={{ stroke: '#475569' }}
              tickFormatter={(val) => `$${val}`}
              domain={['auto', 'auto']}
            />

            {/* Zero Baseline */}
            <ReferenceLine
              y={0}
              stroke="#94a3b8"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              label={{
                value: '$0.00 Break-Even',
                fill: '#94a3b8',
                fontSize: 10,
                position: 'right',
              }}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Daily PnL Bars or Line */}
            {(viewMode === 'daily' || viewMode === 'both') && (
              <Bar
                dataKey="dailyPnl"
                name="Daily P&L"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
                maxBarSize={16}
                // Custom color based on positive / negative
                shape={(props: any) => {
                  const { x, y, width, height, payload } = props;
                  const isPos = payload.dailyPnl >= 0;
                  const fill = isPos ? '#10b981' : '#f43f5e';
                  if (!payload.hasTrades) return null;
                  return (
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={Math.max(2, Math.abs(height))}
                      fill={fill}
                      rx={3}
                      ry={3}
                    />
                  );
                }}
              />
            )}

            {/* Daily PnL Trendline */}
            {(viewMode === 'daily') && (
              <Line
                type="monotone"
                dataKey="dailyPnl"
                name="Daily P&L Curve"
                stroke="#f59e0b"
                strokeWidth={2.5}
                dot={renderDailyDot}
                activeDot={{ r: 6, fill: '#f59e0b', stroke: '#ffffff', strokeWidth: 2 }}
              />
            )}

            {/* Cumulative Month Trajectory Line & Area Fill */}
            {(viewMode === 'cumulative' || viewMode === 'both') && (
              <>
                <Area
                  type="monotone"
                  dataKey="cumulativePnl"
                  name="Cumulative Trajectory"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  fill="url(#pnlGradCyan)"
                  dot={false}
                  activeDot={{ r: 6, fill: '#06b6d4', stroke: '#ffffff', strokeWidth: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="cumulativePnl"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#06b6d4' }}
                />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 4. Chart Legend and Insights Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-[#1a2336] text-xs">
        <div className="flex flex-wrap items-center gap-4 text-[11px] font-medium text-slate-600 dark:text-slate-300">
          {(viewMode === 'daily' || viewMode === 'both') && (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500 shrink-0" />
                <span>Green Day (Profit)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-rose-500 shrink-0" />
                <span>Red Day (Loss)</span>
              </div>
            </>
          )}

          {(viewMode === 'cumulative' || viewMode === 'both') && (
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-cyan-400 shrink-0" />
              <span>Cumulative Trajectory Curve</span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 border-t border-dashed border-slate-400 shrink-0" />
            <span>$0.00 Break-Even Baseline</span>
          </div>
        </div>

        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono-num font-medium">
          Hover over data points to inspect execution tickets and confluences
        </span>
      </div>
    </div>
  );
};
