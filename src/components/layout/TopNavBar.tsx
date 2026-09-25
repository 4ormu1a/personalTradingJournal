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
    { id: 'analytics', label: 'Edge Analytics', icon: <BarChart3 className="w-4 h-4" /> },
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
    <header className="sticky top-0 z-40 bg-[#0c1017]/95 backdrop-blur-md border-b border-[#1b2333]">
      {/* 1. Global Sentinel Alert Banner (If circuit breaker tripped or rollover imminent) */}
      {(circuitBreaker.isBreakerTripped || rollover.isImminent) && (
        <div className="bg-gradient-to-r from-red-950/90 via-amber-950/80 to-red-950/90 border-b border-red-500/30 px-4 py-1.5 flex items-center justify-between text-xs animate-pulse">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
            <span className="font-semibold text-red-200 uppercase tracking-wide">
              Guardian Sentinel Alert:
            </span>
            <span className="text-amber-200">
              {circuitBreaker.isBreakerTripped
                ? circuitBreaker.reason
                : `Rollover imminent in ${rollover.minutes}m ${rollover.seconds}s. Intraday rule mandates closing all prop positions before 21:55 GMT.`}
            </span>
          </div>
          <span className="text-red-300 font-mono-num font-semibold">
            {rollover.hours.toString().padStart(2, '0')}:{rollover.minutes.toString().padStart(2, '0')}:
            {rollover.seconds.toString().padStart(2, '0')} to Rollover
          </span>
        </div>
      )}

      {/* 2. Top Header Main Bar */}
      <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Branding & Account Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/20 ring-1 ring-amber-400/40">
              <Flame className="w-5 h-5 text-black font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-slate-100 tracking-tight">XAUUSD</span>
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                  Guardian
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono-num leading-none">
                100oz Gold Risk Engine & Journal
              </p>
            </div>
          </div>

          {/* Account Dropdown Switcher */}
          <div className="relative ml-2">
            <button
              onClick={() => setShowAccountDropdown(!showAccountDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#131926] border border-[#232f48] hover:border-amber-500/40 text-xs font-medium text-slate-200 transition-colors"
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  selectedAccount.category === 'personal'
                    ? 'bg-emerald-400 shadow-emerald-500/50'
                    : selectedAccount.category === 'prop_funded'
                    ? 'bg-amber-400 shadow-amber-500/50'
                    : 'bg-blue-400 shadow-blue-500/50'
                } shadow-sm`}
              />
              <span className="max-w-[160px] truncate font-semibold">{selectedAccount.name}</span>
              <span className="font-mono-num text-slate-400">
                ${selectedAccount.current_balance.toLocaleString()}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showAccountDropdown && (
              <div className="absolute left-0 mt-1.5 w-72 rounded-lg bg-[#0e1420] border border-[#232f48] shadow-2xl py-1.5 z-50">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-[#1b2333]">
                  Select Execution Account
                </div>
                {accounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => {
                      setSelectedAccountId(acc.id);
                      setShowAccountDropdown(false);
                    }}
                    className={`w-full px-3 py-2 flex items-center justify-between text-left hover:bg-[#182133] text-xs transition-colors ${
                      acc.id === selectedAccount.id
                        ? 'bg-amber-500/10 text-amber-300 font-semibold border-l-2 border-amber-400'
                        : 'text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span>{acc.name}</span>
                        <span className="text-[9px] px-1 rounded bg-[#1b2333] text-slate-400">
                          {acc.firm_name}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono-num">
                        {acc.category.toUpperCase().replace('_', ' ')} • Max {acc.max_risk_pct_cap}% risk
                      </div>
                    </div>
                    <span className="font-mono-num font-semibold text-slate-200">
                      ${acc.current_balance.toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center: Live Compliance & Guardian Sentinel Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Daily Drawdown Headroom Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#131926] border border-[#232f48] text-xs">
            <div className="flex flex-col">
              <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wider">
                <ShieldAlert className="w-3 h-3 text-amber-400" />
                <span>Daily Drawdown Headroom</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`font-mono-num font-bold text-sm ${
                    compliance.remainingDailyHeadroom < 800
                      ? 'text-red-400'
                      : compliance.remainingDailyHeadroom < 1800
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                >
                  ${compliance.remainingDailyHeadroom.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] text-slate-400 font-mono-num">
                  ({(100 - compliance.dailyUsedPct).toFixed(1)}% buffer)
                </span>
              </div>
            </div>
            {/* Mini Progress Bar */}
            <div className="w-12 h-2 bg-slate-800 rounded-full overflow-hidden shrink-0 border border-slate-700">
              <div
                className={`h-full transition-all ${
                  compliance.dailyUsedPct > 70
                    ? 'bg-red-500'
                    : compliance.dailyUsedPct > 40
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(5, 100 - compliance.dailyUsedPct))}%` }}
              />
            </div>
          </div>

          {/* Prop Target Progress (If P1/P2) */}
          {compliance.targetUsd && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#131926] border border-[#232f48] text-xs">
              <div className="flex flex-col">
                <div className="flex items-center gap-1 text-[10px] text-slate-400 uppercase tracking-wider">
                  <CheckCircle2 className="w-3 h-3 text-blue-400" />
                  <span>Challenge Target ({selectedAccount.profit_target_pct}%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono-num font-bold text-sm text-blue-400">
                    {compliance.targetProgressPct?.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono-num">
                    / ${compliance.targetUsd.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className="w-12 h-2 bg-slate-800 rounded-full overflow-hidden shrink-0 border border-slate-700">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{ width: `${compliance.targetProgressPct || 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Daily Circuit Breaker Status */}
          <div
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs font-mono-num border ${
              circuitBreaker.isBreakerTripped
                ? 'bg-red-950/60 border-red-500/50 text-red-300'
                : 'bg-[#131926] border-[#232f48] text-slate-300'
            }`}
          >
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-slate-400">Daily Breaker</span>
              <span className="font-bold">
                Camp: <span className={circuitBreaker.campaignsToday >= 2 ? 'text-amber-400' : 'text-slate-100'}>{circuitBreaker.campaignsToday}</span>/{circuitBreaker.maxCampaigns}
                {' | '}
                Loss: <span className={circuitBreaker.lossesToday >= 2 ? 'text-red-400' : 'text-slate-100'}>{circuitBreaker.lossesToday}</span>/{circuitBreaker.maxLosses}
              </span>
            </div>
            {circuitBreaker.isBreakerTripped && <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />}
          </div>

          {/* Rollover Countdown Pill */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono-num border ${
              rollover.isImminent
                ? 'bg-amber-950/60 border-amber-500/50 text-amber-300 animate-pulse'
                : 'bg-[#131926] border-[#232f48] text-slate-300'
            }`}
            title="Intraday exit alert: Prop firms require closing positions prior to rollover."
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider text-slate-400">Rollover ({rollover.targetString})</span>
              <span className="font-bold">
                {rollover.hours.toString().padStart(2, '0')}:{rollover.minutes.toString().padStart(2, '0')}:
                {rollover.seconds.toString().padStart(2, '0')}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Quick actions, Theme Toggle & Demo Reset */}
        <div className="flex items-center gap-2">
          {/* Light/Dark Theme Toggle Icon Button */}
          <button
            type="button"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            aria-label={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
            className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-all ${
              theme === 'dark'
                ? 'bg-[#131926] border-[#232f48] text-amber-400 hover:bg-[#1c2538] hover:border-amber-500/50'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 shadow-sm'
            }`}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 transition-transform duration-200 hover:rotate-45" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-600 transition-transform duration-200 hover:-rotate-12" />
            )}
          </button>

          <button
            onClick={() => setShowFilterDrawer(!showFilterDrawer)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
              hasActiveFilters
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-[#131926] text-slate-300 border-[#232f48] hover:border-slate-500'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Universal Filters</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            )}
          </button>

          <button
            onClick={resetToDemoData}
            title="Reset dataset to institutional demo data"
            className="p-1.5 text-slate-400 hover:text-amber-300 rounded hover:bg-[#1b2333] transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. Universal Multi-Filter Bar (Collapsible or permanently accessible) */}
      {showFilterDrawer && (
        <div className="bg-[#0b0e14] border-t border-b border-[#1f283d] px-4 py-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span>Universal Multi-Filter Bar</span>
              <span className="text-[11px] text-slate-500 font-normal">
                (Instantly dynamically slices all Journal & Analytics data)
              </span>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 underline"
              >
                <X className="w-3 h-3" />
                Reset All Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Account Multi-Select */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
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
                          ? 'bg-amber-500/25 border-amber-500 text-amber-300'
                          : 'bg-[#151c29] border-[#222d42] text-slate-400 hover:text-slate-200'
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
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Date Range
              </label>
              <select
                value={filters.dateRange}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, dateRange: e.target.value as FilterState['dateRange'] }))
                }
                className="bg-[#151c29] border border-[#222d42] text-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">All Time</option>
                <option value="TODAY">Today Only</option>
                <option value="WEEK">Last 7 Days</option>
                <option value="MONTH">Last 30 Days</option>
              </select>
            </div>

            {/* Confluences */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Confluences
              </label>
              <select
                value={filters.confluence}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, confluence: e.target.value as FilterState['confluence'] }))
                }
                className="bg-[#151c29] border border-[#222d42] text-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500"
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
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Discipline
              </label>
              <select
                value={filters.discipline}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, discipline: e.target.value as FilterState['discipline'] }))
                }
                className="bg-[#151c29] border border-[#222d42] text-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">All Executions</option>
                <option value="CLEAN">Clean Disciplined Only</option>
                <option value="MISTAKES">Rule Violations & Mistakes</option>
              </select>
            </div>

            {/* Type: Single vs Scaled */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Campaign Type
              </label>
              <select
                value={filters.type}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, type: e.target.value as FilterState['type'] }))
                }
                className="bg-[#151c29] border border-[#222d42] text-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">All Formats</option>
                <option value="SINGLE">Single Leg Only</option>
                <option value="SCALED">Scaled (Multi-Leg Pyramids)</option>
              </select>
            </div>

            {/* Keyword Search */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                Search Notes / Sessions
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-2" />
                <input
                  type="text"
                  placeholder="e.g. sweep, bounce..."
                  value={filters.searchQuery}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))
                  }
                  className="w-full bg-[#151c29] border border-[#222d42] text-slate-200 rounded pl-7 pr-2 py-1 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Primary Navigation Tabs */}
      <nav className="px-4 flex items-center gap-1 overflow-x-auto border-t border-[#182030] bg-[#0d121b]">
        {navItems.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap transition-all border-b-2 ${
                isActive
                  ? 'border-amber-400 text-amber-300 bg-amber-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#141b29]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono-num font-bold ${
                    tab.id === 'triage'
                      ? 'bg-amber-500 text-black'
                      : 'bg-emerald-500 text-black'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
