import React, { useState } from 'react';
import { useTrading } from '../../context/TradingContext';
import { Account, AccountCategory, AccountStatus } from '../../types';
import { calculateAccountCompliance, sanitizeNumberInput, toNum } from '../../utils/math';
import {
  Layers,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Award,
  Trash2,
  Archive,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Download,
  Upload,
  Clock,
  DollarSign,
  Briefcase,
} from 'lucide-react';

export const AccountHub: React.FC = () => {
  const {
    accounts,
    selectedAccount,
    setSelectedAccountId,
    addAccount,
    updateAccount,
    deleteAccount,
    trades,
    bulkImportTrades,
  } = useTrading();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

  // New Account Form State
  const [name, setName] = useState('My Funded Account');
  const [firmName, setFirmName] = useState('FTMO');
  const [category, setCategory] = useState<AccountCategory>('prop_p1');
  const [startingBalance, setStartingBalance] = useState<number | string>(100000);
  const [profitTargetPct, setProfitTargetPct] = useState<number | string>(8.0);
  const [defaultRiskPct, setDefaultRiskPct] = useState<number | string>(1.0);
  const [maxRiskCap, setMaxRiskCap] = useState<number | string>(1.5);
  const [dailyDrawdownLimitPct, setDailyDrawdownLimitPct] = useState<number | string>(5.0);
  const [maxDrawdownLimitPct, setMaxDrawdownLimitPct] = useState<number | string>(10.0);
  const [serverTzOffset, setServerTzOffset] = useState<number | string>(2);

  // Balance Adjuster State
  const [adjustBalanceAmount, setAdjustBalanceAmount] = useState<number | string>(0);
  const [adjustAccountId, setAdjustAccountId] = useState<string | null>(null);

  const handleCreateAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const numStartingBalance = toNum(startingBalance, 100000);
    const numProfitTarget = toNum(profitTargetPct, 8.0);
    const numDefaultRisk = toNum(defaultRiskPct, 1.0);
    const numMaxRiskCap = toNum(maxRiskCap, 1.5);
    const numDailyDd = toNum(dailyDrawdownLimitPct, 5.0);
    const numMaxDd = toNum(maxDrawdownLimitPct, 10.0);
    const numTzOffset = toNum(serverTzOffset, 2);

    addAccount({
      user_id: 'user-default',
      name,
      firm_name: firmName,
      category,
      status: 'active',
      starting_balance: numStartingBalance,
      current_balance: numStartingBalance,
      high_water_mark: numStartingBalance,
      profit_target_pct: category === 'personal' ? null : numProfitTarget,
      default_risk_pct: numDefaultRisk,
      max_risk_pct_cap: category === 'personal' ? 100 : numMaxRiskCap,
      daily_drawdown_limit_pct: numDailyDd,
      max_drawdown_limit_pct: numMaxDd,
      server_timezone_offset: numTzOffset,
    });
    setIsCreateOpen(false);
  };

  const handleAdvanceStage = (acc: Account) => {
    let nextCategory: AccountCategory = acc.category;
    let nextTarget: number | null = acc.profit_target_pct;

    if (acc.category === 'prop_p1') {
      nextCategory = 'prop_p2';
      nextTarget = 5.0; // Phase 2 target 5%
    } else if (acc.category === 'prop_p2') {
      nextCategory = 'prop_funded';
      nextTarget = null; // Funded stage
    }

    updateAccount(acc.id, {
      category: nextCategory,
      profit_target_pct: nextTarget,
      status: 'active',
    });
  };

  const handleResetHighWaterMark = (accId: string) => {
    const acc = accounts.find((a) => a.id === accId);
    if (!acc) return;
    // Reset daily watermark to current balance (simulates broker server midnight rollover)
    updateAccount(accId, {
      high_water_mark: acc.current_balance,
    });
    alert(`Broker rollover simulated: Daily High-Water Mark reset to current balance ($${acc.current_balance.toLocaleString()}).`);
  };

  // Export JSON Backup
  const handleExportJson = () => {
    const backupData = {
      accounts,
      trades,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `xauusd-guardian-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON Backup
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.accounts && parsed.trades) {
            // Restore
            localStorage.setItem('xauusd_guardian_accounts_v1', JSON.stringify(parsed.accounts));
            localStorage.setItem('xauusd_guardian_trades_v1', JSON.stringify(parsed.trades));
            window.location.reload();
          } else {
            alert('Invalid backup file format.');
          }
        } catch (err: any) {
          alert(`Error importing file: ${err.message}`);
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1f283d]">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">
              Account Hub & Challenge Lifecycle Manager
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage your personal broker accounts and prop firm evaluation stages (P1, P2, Funded Master).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141a27] hover:bg-[#1b2538] border border-[#26344d] text-slate-300 text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            Export Backup
          </button>

          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141a27] hover:bg-[#1b2538] border border-[#26344d] text-slate-300 text-xs font-semibold cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Import Backup</span>
            <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
          </label>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-lg shadow-amber-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Account</span>
          </button>
        </div>
      </div>

      {/* Accounts List Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {accounts.map((acc) => {
          const compliance = calculateAccountCompliance(acc);
          const isSelected = acc.id === selectedAccount.id;
          const isProp = acc.category !== 'personal';

          return (
            <div
              key={acc.id}
              className={`bg-[#0f141e] border rounded-xl overflow-hidden shadow-2xl transition-all ${
                isSelected
                  ? 'border-amber-500/70 ring-1 ring-amber-500/30'
                  : 'border-[#1f283d] hover:border-slate-600'
              }`}
            >
              {/* Top Banner */}
              <div className="p-4 bg-[#131926] border-b border-[#1b2333] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-100">{acc.name}</span>
                    {isSelected && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-500 text-black text-[9px] font-extrabold uppercase">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {acc.firm_name} • Server UTC+{acc.server_timezone_offset}
                  </span>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    acc.category === 'personal'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : acc.category === 'prop_funded'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-blue-500/20 text-blue-300'
                  }`}
                >
                  {acc.category.toUpperCase().replace('_', ' ')}
                </span>
              </div>

              {/* Balances & Targets */}
              <div className="p-4 space-y-3.5 text-xs">
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-400">Current Balance:</span>
                  <span className="text-xl font-bold font-mono-num text-slate-100">
                    ${acc.current_balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-400 text-[11px]">
                  <span>Starting Capital:</span>
                  <span className="font-mono-num text-slate-300">
                    ${acc.starting_balance.toLocaleString()}
                  </span>
                </div>

                {/* Target progress for P1/P2 */}
                {compliance.targetUsd && (
                  <div className="p-2.5 rounded-lg bg-[#141a27] border border-[#222d42] space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-blue-300 font-bold">
                        Target ({acc.profit_target_pct}%):
                      </span>
                      <span className="font-mono-num font-bold text-blue-400">
                        {compliance.targetProgressPct?.toFixed(1)}% (${compliance.targetUsd.toLocaleString()})
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-500 h-full transition-all"
                        style={{ width: `${compliance.targetProgressPct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Daily Drawdown Floor */}
                {isProp && (
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between text-slate-400">
                      <span>Daily Drawdown Headroom:</span>
                      <span
                        className={`font-mono-num font-bold ${
                          compliance.remainingDailyHeadroom < 1000
                            ? 'text-rose-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        ${compliance.remainingDailyHeadroom.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Max Risk Cap / Trade:</span>
                      <span className="font-mono-num text-amber-300">
                        {acc.max_risk_pct_cap}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Rollover Watermark action */}
                {isProp && (
                  <button
                    onClick={() => handleResetHighWaterMark(acc.id)}
                    className="w-full py-1.5 rounded bg-[#161e2e] hover:bg-[#1d273a] text-slate-300 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3 text-amber-400" />
                    <span>Simulate Midnight Rollover Watermark</span>
                  </button>
                )}

                {/* Lifecycle advancement button */}
                {acc.category === 'prop_p1' && (
                  <button
                    onClick={() => handleAdvanceStage(acc)}
                    className="w-full py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Pass Phase 1 → Advance to Phase 2</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {acc.category === 'prop_p2' && (
                  <button
                    onClick={() => handleAdvanceStage(acc)}
                    className="w-full py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Pass Phase 2 → Advance to Funded Master</span>
                  </button>
                )}

                {/* Switch to this account / Delete */}
                <div className="flex items-center justify-between pt-2 border-t border-[#1a2336]">
                  {!isSelected && (
                    <button
                      onClick={() => setSelectedAccountId(acc.id)}
                      className="text-amber-400 hover:text-amber-300 font-bold text-xs"
                    >
                      Select Account
                    </button>
                  )}
                  {isSelected && (
                    <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Active Selection
                    </span>
                  )}

                  {accounts.length > 1 && (
                    <button
                      onClick={() => {
                        if (confirm(`Delete account "${acc.name}"?`)) {
                          deleteAccount(acc.id);
                        }
                      }}
                      className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                      title="Delete account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Create New Account */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f141e] border border-[#222e44] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#1b2333]">
              <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-amber-400" />
                Add New Trading Account
              </h3>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Account Label</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. FTMO 100K P1"
                    className="w-full bg-[#161d2b] border border-[#232f48] text-slate-100 rounded px-2.5 py-1.5 outline-none"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Broker / Prop Firm</label>
                  <input
                    type="text"
                    required
                    value={firmName}
                    onChange={(e) => setFirmName(e.target.value)}
                    placeholder="e.g. FTMO, FundedNext, Exness"
                    className="w-full bg-[#161d2b] border border-[#232f48] text-slate-100 rounded px-2.5 py-1.5 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Account Stage</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as AccountCategory)}
                    className="w-full bg-[#161d2b] border border-[#232f48] text-slate-100 rounded px-2.5 py-1.5 outline-none"
                  >
                    <option value="prop_p1">Prop Phase 1 (Evaluation)</option>
                    <option value="prop_p2">Prop Phase 2 (Verification)</option>
                    <option value="prop_funded">Prop Funded Master</option>
                    <option value="personal">Personal Broker (Exness)</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1 font-semibold">Starting Capital ($)</label>
                  <input
                    type="number"
                    step="1000"
                    required
                    value={startingBalance}
                    onChange={(e) => setStartingBalance(sanitizeNumberInput(e.target.value))}
                    placeholder="100000"
                    className="w-full bg-[#161d2b] border border-[#232f48] focus:border-amber-400 text-slate-100 rounded px-2.5 py-1.5 font-mono-num outline-none transition-colors placeholder:text-slate-600"
                  />
                </div>
              </div>

              {category !== 'personal' && (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1 font-semibold">Profit Target %</label>
                    <input
                      type="number"
                      step="0.5"
                      value={profitTargetPct}
                      onChange={(e) => setProfitTargetPct(sanitizeNumberInput(e.target.value))}
                      placeholder="8.0"
                      className="w-full bg-[#161d2b] border border-[#232f48] focus:border-amber-400 text-slate-100 rounded px-2.5 py-1.5 font-mono-num outline-none transition-colors placeholder:text-slate-600"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1 font-semibold">Daily Drawdown %</label>
                    <input
                      type="number"
                      step="0.5"
                      value={dailyDrawdownLimitPct}
                      onChange={(e) => setDailyDrawdownLimitPct(sanitizeNumberInput(e.target.value))}
                      placeholder="5.0"
                      className="w-full bg-[#161d2b] border border-[#232f48] focus:border-amber-400 text-slate-100 rounded px-2.5 py-1.5 font-mono-num outline-none transition-colors placeholder:text-slate-600"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1 font-semibold">Max Risk Cap %</label>
                    <input
                      type="number"
                      step="0.1"
                      max="1.5"
                      value={maxRiskCap}
                      onChange={(e) => setMaxRiskCap(sanitizeNumberInput(e.target.value))}
                      placeholder="1.5"
                      className="w-full bg-[#161d2b] border border-[#232f48] focus:border-amber-400 text-slate-100 rounded px-2.5 py-1.5 font-mono-num outline-none transition-colors placeholder:text-slate-600"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1b2333]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shadow-lg transition-colors"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
