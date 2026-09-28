import React, { useState, useMemo } from 'react';
import { useTrading } from '../../context/TradingContext';
import { MasterTrade } from '../../types';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  TrendingUp,
  TrendingDown,
  Percent,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  Flame,
  X,
  Sparkles,
  DollarSign,
  Hash,
  Scale,
} from 'lucide-react';

export type CalendarMetric = 'pnl' | 'r_multiple' | 'trades_count' | 'win_rate' | 'volume';

export interface PerformanceCalendarProps {
  currentMonth?: Date;
  onMonthChange?: (newMonth: Date) => void;
}

export const PerformanceCalendar: React.FC<PerformanceCalendarProps> = ({
  currentMonth: propCurrentMonth,
  onMonthChange: propOnMonthChange,
}) => {
  const { filteredTrades, accounts } = useTrading();

  // Internal Month state if not controlled from parent
  const [internalMonth, setInternalMonth] = useState<Date>(() => {
    return new Date(2026, 8, 1); // Month 8 is September
  });

  const currentMonth = propCurrentMonth || internalMonth;
  const setMonth = (newDate: Date) => {
    if (propOnMonthChange) {
      propOnMonthChange(newDate);
    } else {
      setInternalMonth(newDate);
    }
  };

  // Metric selector filter (as requested by user)
  const [selectedMetric, setSelectedMetric] = useState<CalendarMetric>('pnl');

  // Specific Account filter within Calendar
  const [accountFilter, setAccountFilter] = useState<string>('ALL');

  // Confluence filter within Calendar
  const [setupFilter, setSetupFilter] = useState<string>('ALL');

  // Discipline filter within Calendar
  const [disciplineFilter, setDisciplineFilter] = useState<string>('ALL');

  // Selected Day for Details Modal
  const [selectedDayInfo, setSelectedDayInfo] = useState<{
    dateStr: string;
    displayDate: string;
    trades: MasterTrade[];
  } | null>(null);

  // Month navigation handlers
  const handlePrevMonth = () => {
    setMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleToday = () => {
    // Anchor to latest active month or current system date
    setMonth(new Date(2026, 8, 1));
  };

  // Filter closed trades based on internal calendar filters
  const eligibleTrades = useMemo(() => {
    return filteredTrades.filter((t) => {
      if (t.status !== 'CLOSED') return false;
      if (accountFilter !== 'ALL' && t.account_id !== accountFilter) return false;
      if (disciplineFilter === 'DISCIPLINED' && t.discipline_rating !== 'DISCIPLINED') return false;
      if (disciplineFilter === 'VIOLATION' && t.discipline_rating === 'DISCIPLINED') return false;
      if (disciplineFilter === 'REVENGE' && !t.is_revenge_trade) return false;

      if (setupFilter === 'SR' && !t.has_sr) return false;
      if (setupFilter === 'TRENDLINE' && !t.has_trendline_3rd_touch) return false;
      if (setupFilter === 'PATTERN' && !t.has_chart_pattern) return false;
      if (setupFilter === 'FIB' && !t.has_fibonacci) return false;

      return true;
    });
  }, [filteredTrades, accountFilter, disciplineFilter, setupFilter]);

  // Calendar matrix calculation for currentMonth
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth(); // 0-indexed

  // Format month name (e.g. "September 2026")
  const monthLabel = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Map trades by local YYYY-MM-DD
  const tradesByDate = useMemo(() => {
    const map = new Map<string, MasterTrade[]>();
    for (const t of eligibleTrades) {
      // Use opened_at or closed_at
      const dateKey = (t.closed_at || t.opened_at).slice(0, 10);
      const existing = map.get(dateKey) || [];
      existing.push(t);
      map.set(dateKey, existing);
    }
    return map;
  }, [eligibleTrades]);

  // Month Statistics Summary
  const monthStats = useMemo(() => {
    let totalPnl = 0;
    let totalR = 0;
    let totalLots = 0;
    let totalTrades = 0;
    let wins = 0;
    let losses = 0;
    let greenDays = 0;
    let redDays = 0;
    let breakevenDays = 0;

    let bestDayPnl = -Infinity;
    let bestDayDate = '';
    let worstDayPnl = Infinity;
    let worstDayDate = '';

    // Check all dates in current month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayTrades = tradesByDate.get(dayStr) || [];
      if (dayTrades.length > 0) {
        const dayPnl = dayTrades.reduce((sum, t) => sum + t.realized_pnl, 0);
        totalPnl += dayPnl;
        totalTrades += dayTrades.length;

        dayTrades.forEach((t) => {
          totalR += t.campaign_r_multiple || 0;
          totalLots += t.initial_planned_lots || 0;
          if (t.realized_pnl > 0) wins++;
          else if (t.realized_pnl < 0) losses++;
        });

        if (dayPnl > 0) {
          greenDays++;
          if (dayPnl > bestDayPnl) {
            bestDayPnl = dayPnl;
            bestDayDate = dayStr;
          }
        } else if (dayPnl < 0) {
          redDays++;
          if (dayPnl < worstDayPnl) {
            worstDayPnl = dayPnl;
            worstDayDate = dayStr;
          }
        } else {
          breakevenDays++;
        }
      }
    }

    const winRate = totalTrades > 0 ? (wins / (wins + losses || 1)) * 100 : 0;
    const activeTradingDays = greenDays + redDays + breakevenDays;
    const avgDailyPnl = activeTradingDays > 0 ? totalPnl / activeTradingDays : 0;

    return {
      totalPnl,
      totalR,
      totalLots,
      totalTrades,
      wins,
      losses,
      winRate,
      greenDays,
      redDays,
      breakevenDays,
      activeTradingDays,
      avgDailyPnl,
      bestDay: bestDayPnl > -Infinity ? { pnl: bestDayPnl, date: bestDayDate } : null,
      worstDay: worstDayPnl < Infinity ? { pnl: worstDayPnl, date: worstDayDate } : null,
    };
  }, [tradesByDate, year, month]);

  // Construct Calendar Weeks (7 days per week + weekly summary column)
  const calendarWeeks = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sunday
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const weeks: Array<{
      days: Array<{
        dateStr: string;
        dayNum: number;
        isCurrentMonth: boolean;
        trades: MasterTrade[];
        netPnl: number;
        netR: number;
        tradesCount: number;
        winRate: number;
        totalLots: number;
        tags: string[];
      }>;
      weeklySummary: {
        totalPnl: number;
        totalR: number;
        totalTrades: number;
        totalLots: number;
        wins: number;
        losses: number;
      };
    }> = [];

    let currentDayCounter = 1;
    let nextMonthDayCounter = 1;

    // Typically 5 or 6 weeks in view
    for (let w = 0; w < 6; w++) {
      const weekDays: Array<any> = [];
      let weekTotalPnl = 0;
      let weekTotalR = 0;
      let weekTotalTrades = 0;
      let weekTotalLots = 0;
      let weekWins = 0;
      let weekLosses = 0;

      for (let d = 0; d < 7; d++) {
        let dayNum: number;
        let isCurrentMonth: boolean;
        let dateStr: string;

        if (w === 0 && d < firstDayIndex) {
          // Previous month trailing days
          dayNum = daysInPrevMonth - (firstDayIndex - d - 1);
          isCurrentMonth = false;
          const prevMonthIndex = month === 0 ? 12 : month;
          const prevYear = month === 0 ? year - 1 : year;
          dateStr = `${prevYear}-${String(prevMonthIndex).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
        } else if (currentDayCounter <= daysInCurrentMonth) {
          // Current month days
          dayNum = currentDayCounter;
          isCurrentMonth = true;
          dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          currentDayCounter++;
        } else {
          // Next month leading days
          dayNum = nextMonthDayCounter;
          isCurrentMonth = false;
          const nextMonthIndex = month === 11 ? 1 : month + 2;
          const nextYear = month === 11 ? year + 1 : year;
          dateStr = `${nextYear}-${String(nextMonthIndex).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
          nextMonthDayCounter++;
        }

        // Fetch trades for this day
        const dayTrades = tradesByDate.get(dateStr) || [];
        const netPnl = dayTrades.reduce((sum, t) => sum + t.realized_pnl, 0);
        const netR = dayTrades.reduce((sum, t) => sum + (t.campaign_r_multiple || 0), 0);
        const totalLots = dayTrades.reduce((sum, t) => sum + (t.initial_planned_lots || 0), 0);
        const dayWins = dayTrades.filter((t) => t.realized_pnl > 0).length;
        const dayLosses = dayTrades.filter((t) => t.realized_pnl < 0).length;
        const winRate = dayTrades.length > 0 ? (dayWins / (dayWins + dayLosses || 1)) * 100 : 0;

        // Extract distinctive tag badges (confluences, setups, patterns)
        const tagsSet = new Set<string>();
        dayTrades.forEach((t) => {
          if (t.has_sr) tagsSet.add('S/R');
          if (t.has_trendline_3rd_touch) tagsSet.add('TRENDLINE');
          if (t.has_chart_pattern) tagsSet.add('PATTERN');
          if (t.has_fibonacci) tagsSet.add('FIB');
          if (t.candlestick_confirmed && t.candlestick_type && t.candlestick_type !== 'None') {
            tagsSet.add(t.candlestick_type.toUpperCase());
          }
          if (t.session) tagsSet.add(t.session.toUpperCase());
          if (t.is_revenge_trade) tagsSet.add('REVENGE');
        });

        // Add to weekly accumulator
        weekTotalPnl += netPnl;
        weekTotalR += netR;
        weekTotalTrades += dayTrades.length;
        weekTotalLots += totalLots;
        weekWins += dayWins;
        weekLosses += dayLosses;

        weekDays.push({
          dateStr,
          dayNum,
          isCurrentMonth,
          trades: dayTrades,
          netPnl,
          netR,
          tradesCount: dayTrades.length,
          winRate,
          totalLots,
          tags: Array.from(tagsSet),
        });
      }

      // Only push the week if it contains at least one day of the current month
      const hasCurrentMonthDays = weekDays.some((d) => d.isCurrentMonth);
      if (hasCurrentMonthDays) {
        weeks.push({
          days: weekDays,
          weeklySummary: {
            totalPnl: weekTotalPnl,
            totalR: weekTotalR,
            totalTrades: weekTotalTrades,
            totalLots: weekTotalLots,
            wins: weekWins,
            losses: weekLosses,
          },
        });
      }
    }

    return weeks;
  }, [year, month, tradesByDate]);

  // Helper to format primary metric for day cell
  const renderDayMetric = (day: {
    netPnl: number;
    netR: number;
    tradesCount: number;
    winRate: number;
    totalLots: number;
  }) => {
    switch (selectedMetric) {
      case 'pnl':
        return day.netPnl >= 0
          ? `+$${day.netPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : `-$${Math.abs(day.netPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'r_multiple':
        return `${day.netR >= 0 ? '+' : ''}${day.netR.toFixed(2)}R`;
      case 'win_rate':
        return `${day.winRate.toFixed(0)}% WR`;
      case 'volume':
        return `${day.totalLots.toFixed(2)} Lots`;
      case 'trades_count':
        return `${day.tradesCount} ${day.tradesCount === 1 ? 'Trade' : 'Trades'}`;
      default:
        return `$${day.netPnl.toFixed(2)}`;
    }
  };

  // Helper for weekly column metric display
  const renderWeeklyMetric = (week: {
    totalPnl: number;
    totalR: number;
    totalTrades: number;
    totalLots: number;
  }) => {
    switch (selectedMetric) {
      case 'pnl':
        return week.totalPnl >= 0
          ? `+$${week.totalPnl.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          : `-$${Math.abs(week.totalPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'r_multiple':
        return `${week.totalR >= 0 ? '+' : ''}${week.totalR.toFixed(2)}R`;
      case 'volume':
        return `${week.totalLots.toFixed(2)} Lots`;
      case 'trades_count':
        return `${week.totalTrades} Trades`;
      default:
        return week.totalPnl >= 0 ? `+$${week.totalPnl.toFixed(2)}` : `-$${Math.abs(week.totalPnl).toFixed(2)}`;
    }
  };

  const getAccountName = (accId: string) => {
    return accounts.find((a) => a.id === accId)?.name || 'Account';
  };

  return (
    <div className="space-y-5">
      {/* 1. Calendar Header & Filter Bar */}
      <div className="bg-white dark:bg-[#0f141e] border border-slate-200 dark:border-[#1f283d] rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left: Navigation and Month Title with Net PnL Pill */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToday}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#182235] dark:hover:bg-[#22304a] text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-300 dark:border-[#253654] transition-all shadow-xs cursor-pointer"
            >
              Today
            </button>

            <div className="flex items-center bg-slate-100 dark:bg-[#131a27] rounded-lg border border-slate-300 dark:border-[#222d42] p-0.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-[#1f2a3e] text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-[#1f2a3e] text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2.5">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                {monthLabel}
              </h2>

              {/* Month Total PnL Highlight Pill (matching screenshot style) */}
              <span
                className={`px-2.5 py-0.5 rounded-lg font-mono-num font-bold text-xs sm:text-sm border shadow-xs ${
                  monthStats.totalPnl > 0
                    ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300'
                    : monthStats.totalPnl < 0
                    ? 'bg-rose-50 dark:bg-rose-950/70 border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-300'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                }`}
              >
                {monthStats.totalPnl >= 0 ? `+$${monthStats.totalPnl.toFixed(2)}` : `-$${Math.abs(monthStats.totalPnl).toFixed(2)}`}
              </span>
            </div>
          </div>

          {/* Right: Metric Selector Switch & Setup Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Metric Switch */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0c1017] p-1 rounded-xl border border-slate-300 dark:border-[#222d42]">
              <button
                type="button"
                onClick={() => setSelectedMetric('pnl')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedMetric === 'pnl'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
                <span>P&L ($)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMetric('r_multiple')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedMetric === 'r_multiple'
                    ? 'bg-amber-500 text-black shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>R Multiple</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMetric('win_rate')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedMetric === 'win_rate'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Percent className="w-3.5 h-3.5" />
                <span>Win Rate</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMetric('trades_count')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedMetric === 'trades_count'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Hash className="w-3.5 h-3.5" />
                <span>Trades</span>
              </button>
            </div>

            {/* Quick Filter: Account */}
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

            {/* Quick Filter: Confluence */}
            <select
              value={setupFilter}
              onChange={(e) => setSetupFilter(e.target.value)}
              className="bg-slate-100 dark:bg-[#141a27] border border-slate-300 dark:border-[#232f48] text-slate-800 dark:text-slate-200 text-xs font-semibold rounded-lg px-2.5 py-1.5 outline-none cursor-pointer"
            >
              <option value="ALL">All Setups</option>
              <option value="SR">Support / Resist</option>
              <option value="TRENDLINE">Trendline 3rd Touch</option>
              <option value="PATTERN">Chart Pattern</option>
              <option value="FIB">Fibonacci</option>
            </select>
          </div>
        </div>

        {/* Month Summary Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-3 border-t border-slate-200 dark:border-[#1a2336] text-xs">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#131926] border border-slate-200 dark:border-[#1e273a]">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
              Net Profit
            </span>
            <span
              className={`text-base font-extrabold font-mono-num ${
                monthStats.totalPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {monthStats.totalPnl >= 0 ? `+$${monthStats.totalPnl.toFixed(2)}` : `-$${Math.abs(monthStats.totalPnl).toFixed(2)}`}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5 font-medium">
              {monthStats.totalTrades} Closed Campaigns
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#131926] border border-slate-200 dark:border-[#1e273a]">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
              Realized R
            </span>
            <span
              className={`text-base font-extrabold font-mono-num ${
                monthStats.totalR >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {monthStats.totalR >= 0 ? '+' : ''}${monthStats.totalR.toFixed(2)}R
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5 font-medium">
              Avg {monthStats.activeTradingDays > 0 ? (monthStats.totalR / monthStats.activeTradingDays).toFixed(2) : '0.00'}R / day
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#131926] border border-slate-200 dark:border-[#1e273a]">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
              Win Rate
            </span>
            <span className="text-base font-extrabold font-mono-num text-slate-900 dark:text-slate-100">
              {monthStats.winRate.toFixed(1)}%
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5 font-medium">
              {monthStats.wins}W / {monthStats.losses}L
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#131926] border border-slate-200 dark:border-[#1e273a]">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
              Day Breakdown
            </span>
            <div className="flex items-baseline gap-1 mt-0.5 font-mono-num font-bold">
              <span className="text-emerald-600 dark:text-emerald-400">{monthStats.greenDays}G</span>
              <span className="text-slate-400">/</span>
              <span className="text-rose-600 dark:text-rose-400">{monthStats.redDays}R</span>
              {monthStats.breakevenDays > 0 && (
                <>
                  <span className="text-slate-400">/</span>
                  <span className="text-amber-500">{monthStats.breakevenDays}BE</span>
                </>
              )}
            </div>
            {/* Visual ratio bar */}
            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mt-1 flex">
              <div
                className="bg-emerald-500 h-full"
                style={{
                  width: `${
                    monthStats.activeTradingDays > 0
                      ? (monthStats.greenDays / monthStats.activeTradingDays) * 100
                      : 50
                  }%`,
                }}
              />
              <div
                className="bg-rose-500 h-full"
                style={{
                  width: `${
                    monthStats.activeTradingDays > 0
                      ? (monthStats.redDays / monthStats.activeTradingDays) * 100
                      : 50
                  }%`,
                }}
              />
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#131926] border border-slate-200 dark:border-[#1e273a]">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
              Best Day
            </span>
            <span className="text-base font-extrabold font-mono-num text-emerald-600 dark:text-emerald-400">
              {monthStats.bestDay ? `+$${monthStats.bestDay.pnl.toFixed(0)}` : '—'}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5 truncate font-medium">
              {monthStats.bestDay ? monthStats.bestDay.date : 'No trades'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#131926] border border-slate-200 dark:border-[#1e273a]">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
              Worst Day
            </span>
            <span className="text-base font-extrabold font-mono-num text-rose-600 dark:text-rose-400">
              {monthStats.worstDay ? `-$${Math.abs(monthStats.worstDay.pnl).toFixed(0)}` : '—'}
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5 truncate font-medium">
              {monthStats.worstDay ? monthStats.worstDay.date : 'No losses'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Calendar Grid (7 Weekdays + Weekly Summary column) */}
      <div className="bg-white dark:bg-[#0c1017] border border-slate-200 dark:border-[#1b2333] rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <div className="min-w-[880px]">
            {/* Weekday Column Headers (7 weekdays + 1 summary column) */}
            <div className="grid grid-cols-8 bg-slate-100 dark:bg-[#121824] border-b border-slate-200 dark:border-[#1b2333] text-center text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 py-3">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
              <div className="text-amber-600 dark:text-amber-400 border-l border-slate-200 dark:border-[#1f283d]">
                Weekly Total
              </div>
            </div>

            {/* Weeks Container */}
            <div className="divide-y divide-slate-200 dark:divide-[#192131]">
              {calendarWeeks.map((week, wIdx) => (
                <div key={wIdx} className="grid grid-cols-8 divide-x divide-slate-200 dark:divide-[#192131]">
                  {/* 7 Calendar Days */}
                  {week.days.map((day, dIdx) => {
                    const hasTrades = day.tradesCount > 0;
                    const isPositive = day.netPnl > 0;
                    const isNegative = day.netPnl < 0;

                    return (
                      <div
                        key={dIdx}
                        onClick={() => {
                          if (hasTrades) {
                            setSelectedDayInfo({
                              dateStr: day.dateStr,
                              displayDate: new Date(day.dateStr + 'T12:00:00Z').toLocaleDateString(
                                undefined,
                                { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
                              ),
                              trades: day.trades,
                            });
                          }
                        }}
                        className={`min-h-[118px] p-2.5 flex flex-col justify-between transition-all relative select-none ${
                          !day.isCurrentMonth
                            ? 'opacity-35 bg-slate-50/50 dark:bg-[#080b10]/60'
                            : hasTrades
                            ? isPositive
                              ? 'bg-emerald-500/10 dark:bg-[#0d3b37]/80 hover:bg-emerald-500/15 dark:hover:bg-[#104843] cursor-pointer ring-1 ring-emerald-500/20 shadow-xs'
                              : isNegative
                              ? 'bg-rose-500/10 dark:bg-[#451928]/80 hover:bg-rose-500/15 dark:hover:bg-[#541e30] cursor-pointer ring-1 ring-rose-500/20 shadow-xs'
                              : 'bg-slate-100 dark:bg-[#141a27] hover:bg-slate-200 dark:hover:bg-[#182133] cursor-pointer'
                            : 'bg-white dark:bg-[#0c1017] hover:bg-slate-50 dark:hover:bg-[#10151f]'
                        }`}
                      >
                        {/* Day Number Header */}
                        <div className="flex items-center justify-between text-[11px] font-mono-num font-bold">
                          <span
                            className={
                              day.isCurrentMonth
                                ? 'text-slate-700 dark:text-slate-300'
                                : 'text-slate-400 dark:text-slate-600'
                            }
                          >
                            {day.dayNum}
                          </span>

                          {hasTrades && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-slate-900/60 text-slate-200 dark:bg-black/40">
                              {day.tradesCount} {day.tradesCount === 1 ? 'Trade' : 'Trades'}
                            </span>
                          )}
                        </div>

                        {/* Middle: Metric Display */}
                        {hasTrades ? (
                          <div className="my-1.5">
                            <span
                              className={`text-sm sm:text-base font-extrabold font-mono-num block leading-tight ${
                                isPositive
                                  ? 'text-emerald-700 dark:text-emerald-300'
                                  : isNegative
                                  ? 'text-rose-700 dark:text-rose-300'
                                  : 'text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              {renderDayMetric(day)}
                            </span>

                            {/* Secondary Line */}
                            <span className="text-[10px] text-slate-600 dark:text-slate-300 font-mono-num font-semibold block mt-0.5">
                              {selectedMetric === 'pnl' ? (
                                `${day.netR >= 0 ? '+' : ''}${day.netR.toFixed(2)}R • ${day.totalLots}L`
                              ) : selectedMetric === 'r_multiple' ? (
                                `${day.netPnl >= 0 ? '+$' : '-$'}${Math.abs(day.netPnl).toFixed(0)} • ${day.tradesCount}T`
                              ) : (
                                `${day.netPnl >= 0 ? '+$' : '-$'}${Math.abs(day.netPnl).toFixed(0)}`
                              )}
                            </span>
                          </div>
                        ) : (
                          <div className="my-auto text-center">
                            <span className="text-[11px] text-slate-400 dark:text-slate-700 font-mono-num font-medium">
                              —
                            </span>
                          </div>
                        )}

                        {/* Bottom: Setup Tags / Confluence Badges (as seen in screenshot) */}
                        {hasTrades && day.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-auto pt-1">
                            {day.tags.slice(0, 2).map((tag, tIdx) => (
                              <span
                                key={tIdx}
                                className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold tracking-tight uppercase truncate max-w-[70px] ${
                                  tag === 'REVENGE'
                                    ? 'bg-rose-600 text-white'
                                    : tag.includes('BUY') || tag.includes('BULL') || tag === 'S/R'
                                    ? 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30'
                                    : 'bg-cyan-500/20 text-cyan-800 dark:text-cyan-300 border border-cyan-500/30'
                                }`}
                              >
                                {tag}
                              </span>
                            ))}
                            {day.tags.length > 2 && (
                              <span className="px-1 py-0.2 rounded text-[9px] font-bold text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-800/80">
                                +{day.tags.length - 2} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* 8th Column: Weekly Summary Cell */}
                  <div
                    className={`min-h-[118px] p-3 flex flex-col justify-between border-l border-slate-200 dark:border-[#1f283d] ${
                      week.weeklySummary.totalTrades > 0
                        ? week.weeklySummary.totalPnl >= 0
                          ? 'bg-emerald-500/10 dark:bg-[#0c2f2b]/70 border-r-2 border-r-emerald-500'
                          : 'bg-rose-500/10 dark:bg-[#3b1522]/70 border-r-2 border-r-rose-500'
                        : 'bg-slate-50 dark:bg-[#090d14]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 tracking-wider">
                      <span>Week {wIdx + 1}</span>
                      {week.weeklySummary.totalTrades > 0 && (
                        <span className="font-mono-num">
                          {week.weeklySummary.totalTrades} {week.weeklySummary.totalTrades === 1 ? 'Trade' : 'Trades'}
                        </span>
                      )}
                    </div>

                    {week.weeklySummary.totalTrades > 0 ? (
                      <div className="my-auto">
                        <span
                          className={`text-sm sm:text-base font-extrabold font-mono-num block leading-tight ${
                            week.weeklySummary.totalPnl >= 0
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : 'text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {renderWeeklyMetric(week.weeklySummary)}
                        </span>

                        <div className="flex items-center gap-1.5 text-[10px] font-mono-num font-bold text-slate-600 dark:text-slate-300 mt-1">
                          <span>{week.weeklySummary.totalR >= 0 ? '+' : ''}{week.weeklySummary.totalR.toFixed(2)}R</span>
                          <span>•</span>
                          <span>{week.weeklySummary.wins}W / {week.weeklySummary.losses}L</span>
                        </div>
                      </div>
                    ) : (
                      <div className="my-auto text-center">
                        <span className="text-xs font-mono-num text-slate-400 dark:text-slate-600 block font-bold">
                          $0.00
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-600 block mt-0.5">
                          0 Trades
                        </span>
                      </div>
                    )}

                    <div className="text-[10px] text-slate-500 font-mono-num text-right">
                      {week.weeklySummary.totalLots > 0 ? `${week.weeklySummary.totalLots.toFixed(2)} Lots` : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Detailed Day Inspector Modal (When user clicks a trading day) */}
      {selectedDayInfo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0f141e] border border-slate-200 dark:border-[#222e44] rounded-2xl max-w-2xl w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#1f283d]">
              <div>
                <span className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
                  Trading Session Breakdown
                </span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                  {selectedDayInfo.displayDate}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDayInfo(null)}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Day Aggregate Summary Card */}
            {(() => {
              const dayPnl = selectedDayInfo.trades.reduce((s, t) => s + t.realized_pnl, 0);
              const dayR = selectedDayInfo.trades.reduce((s, t) => s + (t.campaign_r_multiple || 0), 0);
              const dayLots = selectedDayInfo.trades.reduce((s, t) => s + (t.initial_planned_lots || 0), 0);
              const wins = selectedDayInfo.trades.filter((t) => t.realized_pnl > 0).length;
              const losses = selectedDayInfo.trades.filter((t) => t.realized_pnl < 0).length;

              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-50 dark:bg-[#131926] border border-slate-200 dark:border-[#1e273a] text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">
                      Daily Net P&L
                    </span>
                    <span
                      className={`text-lg font-extrabold font-mono-num ${
                        dayPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {dayPnl >= 0 ? `+$${dayPnl.toFixed(2)}` : `-$${Math.abs(dayPnl).toFixed(2)}`}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">
                      R-Multiple
                    </span>
                    <span
                      className={`text-lg font-extrabold font-mono-num ${
                        dayR >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {dayR >= 0 ? '+' : ''}${dayR.toFixed(2)}R
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">
                      Execution Count
                    </span>
                    <span className="text-lg font-extrabold font-mono-num text-slate-900 dark:text-slate-100">
                      {selectedDayInfo.trades.length} {selectedDayInfo.trades.length === 1 ? 'Trade' : 'Trades'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">{wins}W / {losses}L</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold block">
                      Total Volume
                    </span>
                    <span className="text-lg font-extrabold font-mono-num text-slate-900 dark:text-slate-100">
                      {dayLots.toFixed(2)} Lots
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* List of Trades executed on this day */}
            <div className="space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 block">
                Trade Tickets ({selectedDayInfo.trades.length})
              </span>

              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {selectedDayInfo.trades.map((trade) => (
                  <div
                    key={trade.id}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#121824] border border-slate-200 dark:border-[#1e273a] text-xs space-y-2 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            trade.direction === 'BUY'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                              : 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                          }`}
                        >
                          {trade.direction} {trade.symbol}
                        </span>

                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {getAccountName(trade.account_id)}
                        </span>

                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {trade.session}
                        </span>
                      </div>

                      <div className="text-right font-mono-num">
                        <span
                          className={`text-sm font-bold ${
                            trade.realized_pnl >= 0
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {trade.realized_pnl >= 0 ? '+' : ''}${trade.realized_pnl.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          {trade.campaign_r_multiple >= 0 ? '+' : ''}${trade.campaign_r_multiple.toFixed(2)}R
                        </span>
                      </div>
                    </div>

                    {/* Trade Details Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-slate-200 dark:border-slate-800/60 text-[11px]">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                        <span>Lots: {trade.initial_planned_lots}</span>
                        <span>•</span>
                        <span>Entry: ${trade.planned_entry.toFixed(2)}</span>
                        <span>•</span>
                        <span>SL: ${trade.planned_sl.toFixed(2)}</span>
                      </div>

                      {/* Confluence Chips */}
                      <div className="flex items-center gap-1">
                        {trade.has_sr && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-[9px] font-bold text-slate-700 dark:text-slate-300">
                            S/R
                          </span>
                        )}
                        {trade.has_trendline_3rd_touch && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-[9px] font-bold text-slate-700 dark:text-slate-300">
                            Trendline
                          </span>
                        )}
                        {trade.has_chart_pattern && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-[9px] font-bold text-slate-700 dark:text-slate-300">
                            Pattern
                          </span>
                        )}
                        {trade.has_fibonacci && (
                          <span className="px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-[9px] font-bold text-slate-700 dark:text-slate-300">
                            Fib
                          </span>
                        )}
                        {trade.is_revenge_trade && (
                          <span className="px-1.5 py-0.2 rounded bg-rose-600 text-white text-[9px] font-bold animate-pulse">
                            REVENGE
                          </span>
                        )}
                      </div>
                    </div>

                    {trade.notes && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                        "{trade.notes}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedDayInfo(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                Close Day View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
