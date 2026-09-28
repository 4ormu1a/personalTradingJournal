import React, { useState, useEffect } from 'react';
import { useTrading, NavigationTab } from '../../context/TradingContext';
import { FilterState } from '../../types';
import {
  calculateAccountCompliance,
  calculateDailyCircuitBreaker,
  getRolloverCountdown,
} from '../../utils/math';
import {
  ShieldAlert,
  Clock,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Calculator,
  Activity,
  BookOpen,
  Inbox,
  UploadCloud,
  BarChart3,
  Layers,
  ChevronDown,
  RotateCcw,
  SlidersHorizontal,
  X,
  Search,
  Sun,
  Moon,
} from 'lucide-react';

export const TopNavBar: React.FC = () => {
  const {
    accounts,
    trades,
    selectedAccount,
    setSelectedAccountId,
    activeTab,
    setActiveTab,
    filters,
    setFilters,
    unreviewedTradesCount,
    openTradesCount,
    resetToDemoData,
    theme,
    toggleTheme,
  } = useTrading();

  const [rollover, setRollover] = useState(getRolloverCountdown());
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

  // Update rollover countdown every second
  useEffect(() => {
    const timer = setInterval(() => {
      setRollover(getRolloverCountdown());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const compliance = calculateAccountCompliance(selectedAccount);
  const circuitBreaker = calculateDailyCircuitBreaker(trades, selectedAccount.id);

  const navItems: { id: NavigationTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'calculator', label: 'Sizing & Planner', icon: <Calculator className="w-4 h-4" /> },
    {
      id: 'active_manager',
      label: 'Active Manager',
      icon: <Activity className="w-4 h-4" />,
      badge: openTradesCount,
    },
    { id: 'journal', label: 'Master Journal', icon: <BookOpen className="w-4 h-4" /> },
    {
      id: 'triage',
      label: 'Triage Inbox',
      icon: <Inbox className="w-4 h-4" />,
      badge: unreviewedTradesCount,
    },
    { id: 'importer', label: 'Statement Drop', icon: <UploadCloud className="w-4 h-4" /> },
    { id: 'analytics', label: 'Calendar & Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'accounts', label: 'Account Hub', icon: <Layers className="w-4 h-4" /> },
  ];

  const toggleAccountFilter = (accId: string) => {
    setFilters((prev) => {
      const exists = prev.selectedAccountIds.includes(accId);
      const updated = exists
        ? prev.selectedAccountIds.filter((id) => id !== accId)
        : [...prev.selectedAccountIds, accId];
      return { ...prev, selectedAccountIds: updated };
    });
  };

  const clearAllFilters = () => {
    setFilters({
      selectedAccountIds: [],
      dateRange: 'ALL',
      confluence: 'ALL',
      discipline: 'ALL',
      type: 'ALL',
      searchQuery: '',
    });
  };

  const hasActiveFilters =
    filters.selectedAccountIds.length > 0 ||
    filters.dateRange !== 'ALL' ||
    filters.confluence !== 'ALL' ||
    filters.discipline !== 'ALL' ||
    filters.type !== 'ALL' ||
    filters.searchQuery !== '';

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 transition-colors">
      {/* 1. Global Sentinel Alert Banner */}
      {(circuitBreaker.isBreakerTripped || rollover.isImminent) && (
        <div className="bg-rose-50 dark:bg-rose-950/60 border-b border-rose-200 dark:border-rose-500/30 px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span className="font-semibold text-rose-800 dark:text-rose-200 tracking-wide">
              Guardian Sentinel Alert:
            </span>
            <span className="text-slate-700 dark:text-slate-300">
              {circuitBreaker.isBreakerTripped
                ? circuitBreaker.reason
                : `Rollover imminent in ${rollover.minutes}m ${rollover.seconds}s. Intraday rule mandates closing all prop positions before 21:55 GMT.`}
            </span>
          </div>
          <span className="text-rose-700 dark:text-rose-300 font-mono-num font-bold">
            {rollover.hours.toString().padStart(2, '0')}:{rollover.minutes.toString().padStart(2, '0')}:
            {rollover.seconds.toString().padStart(2, '0')} to Rollover
          </span>
        </div>
      )}

      {/* 2. Top Header Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Branding & Account Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-sm">
              <Flame className="w-4 h-4 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-slate-900 dark:text-slate-100 tracking-tight">XAUUSD</span>
                <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 tracking-wide uppercase">
                  Guardian
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono-num leading-none">
                100oz Gold Risk Engine
              </p>
            </div>
          </div>

          {/* Account Dropdown Switcher */}
          <div className="relative ml-1">
            <button
              onClick={() => setShowAccountDropdown(!showAccountDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500/50 text-xs font-medium text-slate-800 dark:text-slate-200 transition-colors shadow-xs"
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  selectedAccount.category === 'personal'
                    ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50'
                    : selectedAccount.category === 'prop_funded'
                    ? 'bg-amber-500 shadow-xs shadow-amber-500/50'
                    : 'bg-slate-400 shadow-xs shadow-slate-400/50'
                }`}
              />
              <span className="max-w-[140px] truncate font-semibold">{selectedAccount.name}</span>
              <span className="font-mono-num text-slate-500 dark:text-slate-400">
                ${selectedAccount.current_balance.toLocaleString()}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            </button>

            {showAccountDropdown && (
              <div className="absolute left-0 mt-1.5 w-72 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                  Select Execution Account
                </div>
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => {
                      setSelectedAccountId(acc.id);
                      setShowAccountDropdown(false);
                    }}
                    className={`w-full px-3 py-2 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 text-xs transition-colors ${
                      acc.id === selectedAccount.id
                        ? 'bg-amber-50/80 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold border-l-2 border-amber-500'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span>{acc.name}</span>
                        <span className="text-[9px] px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                          {acc.firm_name}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono-num">
                        {acc.category.toUpperCase().replace('_', ' ')} • Max {acc.max_risk_pct_cap}% risk
                      </div>
                    </div>
                    <span className="font-mono-num font-semibold text-slate-900 dark:text-slate-100">
                      ${acc.current_balance.toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center: Live Compliance & Sentinel HUD */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Daily Drawdown Headroom */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-xs shadow-xs">
            <div className="flex flex-col">
              <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <ShieldAlert className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>Daily Headroom</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`font-mono-num font-bold text-xs ${
                    compliance.remainingDailyHeadroom < 800
                      ? 'text-rose-600 dark:text-rose-400'
                      : compliance.remainingDailyHeadroom < 1800
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  ${compliance.remainingDailyHeadroom.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono-num">
                  ({(100 - compliance.dailyUsedPct).toFixed(1)}%)
                </span>
              </div>
            </div>
            {/* Progress Mini Track */}
            <div className="w-10 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shrink-0">
              <div
                className={`h-full transition-all ${
                  compliance.dailyUsedPct > 70
                    ? 'bg-rose-500'
                    : compliance.dailyUsedPct > 40
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(5, 100 - compliance.dailyUsedPct))}%` }}
              />
            </div>
          </div>

          {/* Prop Target Progress */}
          {compliance.targetUsd && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-xs shadow-xs">
              <div className="flex flex-col">
                <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Target ({selectedAccount.profit_target_pct}%)</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono-num font-bold text-xs text-emerald-600 dark:text-emerald-400">
                    {compliance.targetProgressPct?.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono-num">
                    / ${compliance.targetUsd.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="w-10 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shrink-0">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${compliance.targetProgressPct || 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Daily Breaker */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono-num border transition-colors shadow-xs ${
              circuitBreaker.isBreakerTripped
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300'
                : 'bg-slate-50 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex flex-col">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <Activity className="w-2.5 h-2.5 text-amber-500" />
                Breaker Quota
              </span>
              <span className="font-semibold text-xs mt-0.5">
                C: <span className={circuitBreaker.campaignsToday >= 2 ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-900 dark:text-slate-100 font-bold'}>{circuitBreaker.campaignsToday}</span>/{circuitBreaker.maxCampaigns}
                {' · '}
                L: <span className={circuitBreaker.lossesToday >= 2 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-900 dark:text-slate-100 font-bold'}>{circuitBreaker.lossesToday}</span>/{circuitBreaker.maxLosses}
              </span>
            </div>
            {circuitBreaker.isBreakerTripped && <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
          </div>

          {/* Rollover Timer */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono-num border transition-colors shadow-xs ${
              rollover.isImminent
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-300 animate-pulse'
                : 'bg-slate-50 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
            }`}
            title="Intraday exit alert: Prop firms require closing positions prior to rollover."
          >
            <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Rollover ({rollover.targetString})
              </span>
              <span className="font-bold text-xs text-slate-900 dark:text-slate-100 mt-0.5">
                {rollover.hours.toString().padStart(2, '0')}:{rollover.minutes.toString().padStart(2, '0')}:
                {rollover.seconds.toString().padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Quick actions, Theme Toggle & Demo Reset */}
        <div className="flex items-center gap-1.5">
          {/* Light/Dark Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            aria-label={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-xs"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          <button
            onClick={() => setShowFilterDrawer(!showFilterDrawer)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors shadow-xs ${
              hasActiveFilters
                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/40'
                : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            )}
          </button>

          <button
            onClick={resetToDemoData}
            title="Reset dataset to institutional demo data"
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Universal Multi-Filter Bar */}
      {showFilterDrawer && (
        <div className="bg-slate-50 dark:bg-slate-900/95 border-t border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 text-xs animate-in fade-in duration-150">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold">
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500" />
                <span>Universal Multi-Filter Bar</span>
                <span className="text-[11px] text-slate-500 font-normal">
                  (Dynamically slices Journal & Analytics data)
                </span>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-medium"
                >
                  <X className="w-3 h-3" />
                  Reset Filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Account Multi-Select */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                  Accounts ({filters.selectedAccountIds.length || 'All'})
                </label>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                  {accounts.map((acc) => {
                    const isChecked = filters.selectedAccountIds.includes(acc.id);
                    return (
                      <button
                        key={acc.id}
                        onClick={() => toggleAccountFilter(acc.id)}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                          isChecked
                            ? 'bg-amber-500/20 border-amber-500 text-amber-800 dark:text-amber-300 font-semibold'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        {acc.firm_name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date Range */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                  Date Range
                </label>
                <select
                  value={filters.dateRange}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, dateRange: e.target.value as FilterState['dateRange'] }))
                  }
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">All Time</option>
                  <option value="TODAY">Today Only</option>
                  <option value="WEEK">Last 7 Days</option>
                  <option value="MONTH">Last 30 Days</option>
                </select>
              </div>

              {/* Confluences */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                  Confluences
                </label>
                <select
                  value={filters.confluence}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, confluence: e.target.value as FilterState['confluence'] }))
                  }
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">All Setups</option>
                  <option value="SR">Support / Resistance</option>
                  <option value="TRENDLINE">Trendline 3rd Touch</option>
                  <option value="PATTERN">Chart Pattern</option>
                  <option value="FIB">Fibonacci</option>
                </select>
              </div>

              {/* Discipline */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                  Discipline
                </label>
                <select
                  value={filters.discipline}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, discipline: e.target.value as FilterState['discipline'] }))
                  }
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">All Executions</option>
                  <option value="CLEAN">Clean Disciplined Only</option>
                  <option value="MISTAKES">Rule Violations & Mistakes</option>
                </select>
              </div>

              {/* Type: Single vs Scaled */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                  Campaign Type
                </label>
                <select
                  value={filters.type}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, type: e.target.value as FilterState['type'] }))
                  }
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">All Formats</option>
                  <option value="SINGLE">Single Leg Only</option>
                  <option value="SCALED">Scaled (Multi-Leg Pyramids)</option>
                </select>
              </div>

              {/* Keyword Search */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                  Search Notes
                </label>
                <div className="relative">
                  <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="e.g. sweep, bounce..."
                    value={filters.searchQuery}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))
                    }
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg pl-7 pr-2 py-1 text-xs focus:outline-none focus:border-amber-500 placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Primary Navigation Tabs */}
      <nav className="border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto">
          {navItems.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
                  isActive
                    ? 'border-amber-500 text-amber-700 dark:text-amber-400 font-semibold bg-amber-500/5'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/50 dark:hover:bg-slate-900/50'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {typeof tab.badge === 'number' && tab.badge > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono-num font-semibold ${
                      tab.id === 'triage'
                        ? 'bg-amber-500/20 text-amber-800 dark:text-amber-300'
                        : 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
};
