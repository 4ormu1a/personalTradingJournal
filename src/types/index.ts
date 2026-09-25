export type AccountCategory = 'personal' | 'prop_p1' | 'prop_p2' | 'prop_funded';
export type AccountStatus = 'active' | 'passed' | 'breached' | 'archived';
export type TradeDirection = 'BUY' | 'SELL';
export type TradeStatus = 'PLANNED' | 'OPEN' | 'CLOSED';
export type LegAction = 'INITIAL_ENTRY' | 'SCALE_IN' | 'PARTIAL_TP' | 'FULL_EXIT' | 'SL_HIT';
export type ReviewStatus = 'UNREVIEWED' | 'REVIEWED';
export type DisciplineRating = 'DISCIPLINED' | 'RULE_VIOLATION';
export type CandlestickType = 'Engulfing' | 'Pin Bar / Wick' | 'None';
export type TradingSession = 'Asian' | 'London' | 'NY Overlap' | 'NY PM';

export interface Account {
  id: string;
  user_id: string;
  name: string;
  firm_name: string;
  category: AccountCategory;
  status: AccountStatus;
  starting_balance: number;
  current_balance: number;
  high_water_mark: number; // For daily drawdown calculation at broker rollover
  profit_target_pct: number | null; // e.g. 8.00% (P1), 5.00% (P2), null for personal
  default_risk_pct: number;
  max_risk_pct_cap: number; // 1.5% for props
  daily_drawdown_limit_pct: number; // default 5.0%
  max_drawdown_limit_pct: number; // default 10.0%
  server_timezone_offset: number; // UTC+2 or UTC+3
  created_at: string;
  archived_at?: string | null;
}

export interface TradeLeg {
  id: string;
  trade_id: string;
  action: LegAction;
  price: number;
  lot_size: number;
  stop_loss?: number;
  take_profit?: number;
  realized_pnl: number;
  executed_at: string;
  notes?: string;
}

export interface MasterTrade {
  id: string;
  account_id: string;
  symbol: string; // 'XAUUSD'
  direction: TradeDirection;
  status: TradeStatus;
  review_status: ReviewStatus;
  session: TradingSession;

  // Setup confluences
  has_sr: boolean;
  has_trendline_3rd_touch: boolean;
  has_chart_pattern: boolean;
  has_fibonacci: boolean;
  candlestick_confirmed: boolean;
  candlestick_type: CandlestickType;

  // Behavioral & Compliance Flags
  is_revenge_trade: boolean;
  is_news_trade: boolean;
  premature_exit_loss_usd: number; // Money left on table
  discipline_rating: DisciplineRating;
  rule_violations?: string[];

  // Planned Targets
  initial_planned_risk_usd: number;
  planned_entry: number;
  planned_sl: number;
  planned_tp: number;
  initial_planned_lots: number;

  // Realized Outputs
  realized_pnl: number;
  setup_r_multiple: number;
  campaign_r_multiple: number;

  // Visual Evidence
  chart_before_url?: string;
  chart_after_url?: string;
  chart_image_data?: string; // base64 or object url
  notes?: string;

  opened_at: string;
  closed_at?: string | null;
  legs: TradeLeg[];
}

export interface FilterState {
  selectedAccountIds: string[]; // empty means all
  dateRange: 'ALL' | 'TODAY' | 'WEEK' | 'MONTH';
  confluence: 'ALL' | 'SR' | 'TRENDLINE' | 'PATTERN' | 'FIB';
  discipline: 'ALL' | 'CLEAN' | 'MISTAKES';
  type: 'ALL' | 'SINGLE' | 'SCALED';
  searchQuery: string;
}
