import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Account,
  MasterTrade,
  TradeLeg,
  FilterState,
  TradeDirection,
  LegAction,
} from '../types';
import { INITIAL_ACCOUNTS, INITIAL_TRADES } from '../utils/mockData';
import { calculateGoldCashMove } from '../utils/math';

export type NavigationTab =
  | 'calculator'
  | 'active_manager'
  | 'journal'
  | 'triage'
  | 'importer'
  | 'analytics'
  | 'accounts';

interface TradingContextType {
  accounts: Account[];
  trades: MasterTrade[];
  selectedAccount: Account;
  setSelectedAccountId: (id: string) => void;
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;

  // Filter Bar state
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  filteredTrades: MasterTrade[];
  unreviewedTradesCount: number;
  openTradesCount: number;

  // Theme state
  theme: 'dark' | 'light';
  toggleTheme: () => void;

  // Account operations
  addAccount: (account: Omit<Account, 'id' | 'created_at'>) => void;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  deleteAccount: (id: string) => void;

  // Trade operations
  createTradeFromCalculator: (data: {
    accountId: string;
    direction: TradeDirection;
    entry: number;
    stopLoss: number;
    takeProfit: number;
    lots: number;
    riskUsd: number;
    session: MasterTrade['session'];
    hasSr: boolean;
    hasTrendline: boolean;
    hasPattern: boolean;
    hasFib: boolean;
    candlestickConfirmed: boolean;
    candlestickType: MasterTrade['candlestick_type'];
    chartUrl?: string;
    chartImageData?: string;
    notes?: string;
  }) => MasterTrade;

  addScaleInLeg: (tradeId: string, price: number, lots: number, sl?: number, notes?: string) => void;
  takePartialProfit: (tradeId: string, price: number, lots: number, notes?: string) => void;
  updateLegStopLoss: (tradeId: string, legId: string, newSl: number) => void;
  closeActiveTrade: (tradeId: string, exitPrice: number, notes?: string) => void;
  logCompletedTrade: (trade: Omit<MasterTrade, 'id' | 'status'>) => void;
  updateTrade: (tradeId: string, updates: Partial<MasterTrade>) => void;
  deleteTrade: (tradeId: string) => void;
  bulkImportTrades: (importedTrades: MasterTrade[]) => void;
  resetToDemoData: () => void;
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

const ACCOUNTS_STORAGE_KEY = 'xauusd_guardian_accounts_v1';
const TRADES_STORAGE_KEY = 'xauusd_guardian_trades_v1';
const THEME_STORAGE_KEY = 'xauusd_guardian_theme_v1';

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
      return 'dark';
    } catch {
      return 'dark';
    }
  });

  const [accounts, setAccounts] = useState<Account[]>(() => {
    try {
      const saved = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_ACCOUNTS;
    } catch {
      return INITIAL_ACCOUNTS;
    }
  });

  const [trades, setTrades] = useState<MasterTrade[]>(() => {
    try {
      const saved = localStorage.getItem(TRADES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_TRADES;
    } catch {
      return INITIAL_TRADES;
    }
  });

  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    accounts[0]?.id || 'acc-ftmo-100k'
  );

  const [activeTab, setActiveTab] = useState<NavigationTab>('calculator');

  const [filters, setFilters] = useState<FilterState>({
    selectedAccountIds: [], // empty = all
    dateRange: 'ALL',
    confluence: 'ALL',
    discipline: 'ALL',
    type: 'ALL',
    searchQuery: '',
  });

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
    } catch (e) {
      console.error('Failed to save accounts to localStorage', e);
    }
  }, [accounts]);

  useEffect(() => {
    try {
      localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(trades));
    } catch (e) {
      console.error('Failed to save trades to localStorage', e);
    }
  }, [trades]);

  // Sync theme to localStorage and document root
  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (e) {
      console.error('Failed to save theme to localStorage', e);
    }

    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === selectedAccountId) || accounts[0] || INITIAL_ACCOUNTS[0];
  }, [accounts, selectedAccountId]);

  const unreviewedTradesCount = useMemo(() => {
    return trades.filter((t) => t.review_status === 'UNREVIEWED').length;
  }, [trades]);

  const openTradesCount = useMemo(() => {
    return trades.filter((t) => t.status === 'OPEN').length;
  }, [trades]);

  // Dynamic Slicing & Filter Logic
  const filteredTrades = useMemo(() => {
    return trades.filter((t) => {
      // 1. Account Filter
      if (
        filters.selectedAccountIds.length > 0 &&
        !filters.selectedAccountIds.includes(t.account_id)
      ) {
        return false;
      }

      // 2. Date Range Filter
      if (filters.dateRange !== 'ALL' && t.opened_at) {
        const tradeDate = new Date(t.opened_at).getTime();
        const now = Date.now();
        const oneDayMs = 24 * 3600 * 1000;

        if (filters.dateRange === 'TODAY') {
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          if (tradeDate < todayStart.getTime()) return false;
        } else if (filters.dateRange === 'WEEK') {
          if (now - tradeDate > 7 * oneDayMs) return false;
        } else if (filters.dateRange === 'MONTH') {
          if (now - tradeDate > 30 * oneDayMs) return false;
        }
      }

      // 3. Confluence Filter
      if (filters.confluence === 'SR' && !t.has_sr) return false;
      if (filters.confluence === 'TRENDLINE' && !t.has_trendline_3rd_touch) return false;
      if (filters.confluence === 'PATTERN' && !t.has_chart_pattern) return false;
      if (filters.confluence === 'FIB' && !t.has_fibonacci) return false;

      // 4. Discipline Filter
      if (filters.discipline === 'CLEAN' && t.discipline_rating !== 'DISCIPLINED') return false;
      if (filters.discipline === 'MISTAKES' && t.discipline_rating === 'DISCIPLINED') return false;

      // 5. Type Filter (Single vs Scaled multi-leg)
      const isScaled = t.legs && t.legs.length > 1;
      if (filters.type === 'SINGLE' && isScaled) return false;
      if (filters.type === 'SCALED' && !isScaled) return false;

      // 6. Search query
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const matchNotes = (t.notes || '').toLowerCase().includes(query);
        const matchSymbol = t.symbol.toLowerCase().includes(query);
        const matchSession = (t.session || '').toLowerCase().includes(query);
        if (!matchNotes && !matchSymbol && !matchSession) return false;
      }

      return true;
    });
  }, [trades, filters]);

  // Account operations
  const addAccount = (data: Omit<Account, 'id' | 'created_at'>) => {
    const newAccount: Account = {
      ...data,
      id: `acc-${Date.now()}`,
      created_at: new Date().toISOString(),
    };
    setAccounts((prev) => [...prev, newAccount]);
    setSelectedAccountId(newAccount.id);
  };

  const updateAccount = (id: string, updates: Partial<Account>) => {
    setAccounts((prev) =>
      prev.map((acc) => (acc.id === id ? { ...acc, ...updates } : acc))
    );
  };

  const deleteAccount = (id: string) => {
    setAccounts((prev) => prev.filter((acc) => acc.id !== id));
  };

  // Trade operations
  const createTradeFromCalculator = (data: {
    accountId: string;
    direction: TradeDirection;
    entry: number;
    stopLoss: number;
    takeProfit: number;
    lots: number;
    riskUsd: number;
    session: MasterTrade['session'];
    hasSr: boolean;
    hasTrendline: boolean;
    hasPattern: boolean;
    hasFib: boolean;
    candlestickConfirmed: boolean;
    candlestickType: MasterTrade['candlestick_type'];
    chartUrl?: string;
    chartImageData?: string;
    notes?: string;
  }): MasterTrade => {
    const tradeId = `trade-${Date.now()}`;
    const initialLeg: TradeLeg = {
      id: `leg-${Date.now()}-1`,
      trade_id: tradeId,
      action: 'INITIAL_ENTRY',
      price: data.entry,
      lot_size: data.lots,
      stop_loss: data.stopLoss,
      take_profit: data.takeProfit,
      realized_pnl: 0,
      executed_at: new Date().toISOString(),
      notes: 'Initial position opened from Sizing Planner.',
    };

    // Calculate Planned R-Multiple: Setup R = (TP - Entry) / (Entry - SL)
    const slDist = Math.abs(data.entry - data.stopLoss);
    const tpDist = Math.abs(data.takeProfit - data.entry);
    const setupR = slDist > 0 ? Math.round((tpDist / slDist) * 100) / 100 : 0;

    const newTrade: MasterTrade = {
      id: tradeId,
      account_id: data.accountId,
      symbol: 'XAUUSD',
      direction: data.direction,
      status: 'OPEN',
      review_status: 'REVIEWED',
      session: data.session,
      has_sr: data.hasSr,
      has_trendline_3rd_touch: data.hasTrendline,
      has_chart_pattern: data.hasPattern,
      has_fibonacci: data.hasFib,
      candlestick_confirmed: data.candlestickConfirmed,
      candlestick_type: data.candlestickType,
      is_revenge_trade: false,
      is_news_trade: false,
      premature_exit_loss_usd: 0,
      discipline_rating: data.candlestickConfirmed ? 'DISCIPLINED' : 'RULE_VIOLATION',
      rule_violations: data.candlestickConfirmed ? [] : ['Unconfirmed Candlestick Entry'],
      initial_planned_risk_usd: data.riskUsd,
      planned_entry: data.entry,
      planned_sl: data.stopLoss,
      planned_tp: data.takeProfit,
      initial_planned_lots: data.lots,
      realized_pnl: 0,
      setup_r_multiple: setupR,
      campaign_r_multiple: 0,
      chart_before_url: data.chartUrl,
      chart_image_data: data.chartImageData,
      notes: data.notes,
      opened_at: new Date().toISOString(),
      legs: [initialLeg],
    };

    setTrades((prev) => [newTrade, ...prev]);
    return newTrade;
  };

  const addScaleInLeg = (
    tradeId: string,
    price: number,
    lots: number,
    sl?: number,
    notes?: string
  ) => {
    setTrades((prev) =>
      prev.map((trade) => {
        if (trade.id !== tradeId) return trade;
        const newLeg: TradeLeg = {
          id: `leg-${Date.now()}`,
          trade_id: tradeId,
          action: 'SCALE_IN',
          price,
          lot_size: lots,
          stop_loss: sl || trade.legs[0]?.stop_loss,
          take_profit: trade.planned_tp,
          realized_pnl: 0,
          executed_at: new Date().toISOString(),
          notes: notes || `Pyramided add-on of ${lots} lots at ${price}`,
        };
        return {
          ...trade,
          legs: [...trade.legs, newLeg],
        };
      })
    );
  };

  const takePartialProfit = (
    tradeId: string,
    price: number,
    lots: number,
    notes?: string
  ) => {
    setTrades((prev) =>
      prev.map((trade) => {
        if (trade.id !== tradeId) return trade;
        const leg1 = trade.legs[0];
        const realizedLegCash = calculateGoldCashMove(trade.direction, leg1.price, price, lots);

        const newLeg: TradeLeg = {
          id: `leg-${Date.now()}`,
          trade_id: tradeId,
          action: 'PARTIAL_TP',
          price,
          lot_size: lots,
          stop_loss: leg1.price, // move SL to BE automatically on partial TP
          realized_pnl: Math.round(realizedLegCash * 100) / 100,
          executed_at: new Date().toISOString(),
          notes: notes || `Partial take-profit of ${lots} lots at ${price}. Banked $${realizedLegCash.toFixed(2)}`,
        };

        const updatedRealizedPnl = trade.realized_pnl + realizedLegCash;
        const campaignR =
          trade.initial_planned_risk_usd > 0
            ? Math.round((updatedRealizedPnl / trade.initial_planned_risk_usd) * 100) / 100
            : 0;

        // Auto move initial leg SL to BE if not already
        const updatedLegs = trade.legs.map((l, idx) =>
          idx === 0 ? { ...l, stop_loss: l.price } : l
        );

        return {
          ...trade,
          realized_pnl: Math.round(updatedRealizedPnl * 100) / 100,
          campaign_r_multiple: campaignR,
          legs: [...updatedLegs, newLeg],
        };
      })
    );
  };

  const updateLegStopLoss = (tradeId: string, legId: string, newSl: number) => {
    setTrades((prev) =>
      prev.map((trade) => {
        if (trade.id !== tradeId) return trade;
        return {
          ...trade,
          legs: trade.legs.map((leg) =>
            leg.id === legId ? { ...leg, stop_loss: newSl } : leg
          ),
        };
      })
    );
  };

  const closeActiveTrade = (tradeId: string, exitPrice: number, notes?: string) => {
    setTrades((prev) =>
      prev.map((trade) => {
        if (trade.id !== tradeId) return trade;

        // Compute remaining lots to close
        const initialLots = trade.legs[0]?.lot_size || trade.initial_planned_lots || 1;
        const scaleInLots = trade.legs
          .filter((l) => l.action === 'SCALE_IN')
          .reduce((sum, l) => sum + l.lot_size, 0);
        const partialClosedLots = trade.legs
          .filter((l) => l.action === 'PARTIAL_TP')
          .reduce((sum, l) => sum + l.lot_size, 0);

        const remainingLots = Math.max(0, initialLots + scaleInLots - partialClosedLots);
        const exitAction: LegAction =
          (trade.direction === 'BUY' && exitPrice <= trade.planned_sl) ||
          (trade.direction === 'SELL' && exitPrice >= trade.planned_sl)
            ? 'SL_HIT'
            : 'FULL_EXIT';

        const finalLegCash =
          remainingLots > 0
            ? calculateGoldCashMove(
                trade.direction,
                trade.legs[0]?.price || trade.planned_entry,
                exitPrice,
                remainingLots
              )
            : 0;

        const totalRealizedPnl = Math.round((trade.realized_pnl + finalLegCash) * 100) / 100;
        const campaignR =
          trade.initial_planned_risk_usd > 0
            ? Math.round((totalRealizedPnl / trade.initial_planned_risk_usd) * 100) / 100
            : 0;

        // Premature runner exit check:
        // If trade was closed in profit before reaching planned TP, calculate money left on table
        let moneyLeftOnTable = 0;
        const reachedTarget =
          trade.direction === 'BUY'
            ? exitPrice >= trade.planned_tp
            : exitPrice <= trade.planned_tp;

        const isWinningExit =
          trade.direction === 'BUY'
            ? exitPrice > trade.planned_entry
            : exitPrice < trade.planned_entry;

        if (isWinningExit && !reachedTarget && trade.planned_tp) {
          const missedDistance = Math.abs(trade.planned_tp - exitPrice);
          moneyLeftOnTable = Math.round(missedDistance * remainingLots * 100 * 100) / 100;
        }

        const newLeg: TradeLeg = {
          id: `leg-${Date.now()}`,
          trade_id: tradeId,
          action: exitAction,
          price: exitPrice,
          lot_size: remainingLots,
          realized_pnl: Math.round(finalLegCash * 100) / 100,
          executed_at: new Date().toISOString(),
          notes: notes || `Position finalized at ${exitPrice}`,
        };

        const violations = [...(trade.rule_violations || [])];
        if (moneyLeftOnTable > 150) {
          violations.push(`Premature Runner Exit ($${moneyLeftOnTable.toFixed(2)} left on table)`);
        }

        // Update account balance
        updateAccountBalance(trade.account_id, totalRealizedPnl);

        return {
          ...trade,
          status: 'CLOSED' as const,
          closed_at: new Date().toISOString(),
          realized_pnl: totalRealizedPnl,
          campaign_r_multiple: campaignR,
          premature_exit_loss_usd: moneyLeftOnTable,
          discipline_rating: violations.length > 0 ? ('RULE_VIOLATION' as const) : ('DISCIPLINED' as const),
          rule_violations: violations,
          notes: notes ? (trade.notes ? `${trade.notes} | ${notes}` : notes) : trade.notes,
          legs: [...trade.legs, newLeg],
        };
      })
    );
  };

  const updateAccountBalance = (accId: string, pnlChange: number) => {
    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.id !== accId) return acc;
        const newBal = acc.current_balance + pnlChange;
        return {
          ...acc,
          current_balance: Math.round(newBal * 100) / 100,
          high_water_mark: Math.max(acc.high_water_mark, newBal),
        };
      })
    );
  };

  const logCompletedTrade = (tradeData: Omit<MasterTrade, 'id' | 'status'>) => {
    const newTrade: MasterTrade = {
      ...tradeData,
      id: `trade-${Date.now()}`,
      status: 'CLOSED',
    };
    setTrades((prev) => [newTrade, ...prev]);
    updateAccountBalance(tradeData.account_id, tradeData.realized_pnl);
  };

  const updateTrade = (tradeId: string, updates: Partial<MasterTrade>) => {
    setTrades((prev) =>
      prev.map((trade) => (trade.id === tradeId ? { ...trade, ...updates } : trade))
    );
  };

  const deleteTrade = (tradeId: string) => {
    setTrades((prev) => prev.filter((t) => t.id !== tradeId));
  };

  const bulkImportTrades = (importedTrades: MasterTrade[]) => {
    setTrades((prev) => [...importedTrades, ...prev]);
  };

  const resetToDemoData = () => {
    setAccounts(INITIAL_ACCOUNTS);
    setTrades(INITIAL_TRADES);
    setSelectedAccountId(INITIAL_ACCOUNTS[0].id);
    localStorage.removeItem(ACCOUNTS_STORAGE_KEY);
    localStorage.removeItem(TRADES_STORAGE_KEY);
  };

  return (
    <TradingContext.Provider
      value={{
        accounts,
        trades,
        selectedAccount,
        setSelectedAccountId,
        activeTab,
        setActiveTab,
        filters,
        setFilters,
        filteredTrades,
        unreviewedTradesCount,
        openTradesCount,
        theme,
        toggleTheme,
        addAccount,
        updateAccount,
        deleteAccount,
        createTradeFromCalculator,
        addScaleInLeg,
        takePartialProfit,
        updateLegStopLoss,
        closeActiveTrade,
        logCompletedTrade,
        updateTrade,
        deleteTrade,
        bulkImportTrades,
        resetToDemoData,
      }}
    >
      {children}
    </TradingContext.Provider>
  );
};

export const useTrading = () => {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error('useTrading must be used within a TradingProvider');
  }
  return context;
};
