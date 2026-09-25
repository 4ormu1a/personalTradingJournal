import { Account, MasterTrade, TradeDirection } from '../types';

export const GOLD_CONTRACT_SIZE = 100; // 1 standard lot = 100 oz
export const GOLD_PIP_VALUE = 0.10; // $0.10 price move = 1 pip (10 points)

/**
 * Calculates cash movement for XAUUSD:
 * Cash = Lots * 100 * (Exit - Entry) for BUY
 * Cash = Lots * 100 * (Entry - Exit) for SELL
 */
export function calculateGoldCashMove(
  direction: TradeDirection,
  entry: number,
  exit: number,
  lots: number
): number {
  if (direction === 'BUY') {
    return lots * GOLD_CONTRACT_SIZE * (exit - entry);
  } else {
    return lots * GOLD_CONTRACT_SIZE * (entry - exit);
  }
}

/**
 * Calculates exact lot size:
 * Lots = Cash Risk / (|Entry - SL| * 100)
 */
export function calculateGoldLotSize(
  entry: number,
  stopLoss: number,
  cashRisk: number
): { lots: number; priceDistance: number; pips: number } {
  const priceDistance = Math.abs(entry - stopLoss);
  if (priceDistance <= 0.01 || cashRisk <= 0) {
    return { lots: 0, priceDistance: 0, pips: 0 };
  }
  const rawLots = cashRisk / (priceDistance * GOLD_CONTRACT_SIZE);
  // Institutional lot sizes rounded to 2 decimal places
  const lots = Math.floor(rawLots * 100) / 100;
  const pips = Math.round((priceDistance / GOLD_PIP_VALUE) * 10) / 10;
  return { lots, priceDistance, pips };
}

/**
 * Bidirectional conversion:
 * From pip distance to Stop Loss Price
 */
export function pipsToStopLoss(
  direction: TradeDirection,
  entry: number,
  pips: number
): number {
  const distance = pips * GOLD_PIP_VALUE;
  if (direction === 'BUY') {
    return Math.round((entry - distance) * 1000) / 1000;
  } else {
    return Math.round((entry + distance) * 1000) / 1000;
  }
}

/**
 * Bidirectional conversion:
 * From Stop Loss Price to pip distance
 */
export function stopLossToPips(entry: number, stopLoss: number): number {
  const distance = Math.abs(entry - stopLoss);
  return Math.round((distance / GOLD_PIP_VALUE) * 10) / 10;
}

/**
 * Calculate the exact minimum TP1 price for Scale-Out to bank >= 1R cash:
 * Profit = partialLots * 100 * |TP1 - Entry| >= 1R (initialPlannedRiskUsd)
 * |TP1 - Entry| >= 1R / (partialLots * 100)
 */
export function calculateMin1RTakeProfit(
  direction: TradeDirection,
  entry: number,
  initialRiskUsd: number,
  partialLots: number
): { minPrice: number; priceDelta: number; minPips: number } {
  if (partialLots <= 0 || initialRiskUsd <= 0) {
    return { minPrice: entry, priceDelta: 0, minPips: 0 };
  }
  const priceDelta = initialRiskUsd / (partialLots * GOLD_CONTRACT_SIZE);
  const minPrice =
    direction === 'BUY'
      ? Math.round((entry + priceDelta) * 1000) / 1000
      : Math.round((entry - priceDelta) * 1000) / 1000;
  const minPips = Math.round((priceDelta / GOLD_PIP_VALUE) * 10) / 10;
  return { minPrice, priceDelta, minPips };
}

/**
 * Validates scale-in rules:
 * 1. Scale into winners only (entry2 > entry1 for BUY, entry2 < entry1 for SELL)
 * 2. Sum of add-on lots <= initial lots
 * 3. Initial leg SL is at Breakeven or in profit
 */
export function validateScaleIn(
  trade: MasterTrade,
  newPrice: number,
  newLots: number
): { valid: boolean; error?: string } {
  if (trade.legs.length === 0) {
    return { valid: false, error: 'No initial leg found on this trade campaign.' };
  }

  const initialLeg = trade.legs[0];

  // Check 1: Winner direction
  const isWinner =
    trade.direction === 'BUY'
      ? newPrice > initialLeg.price
      : newPrice < initialLeg.price;
  if (!isWinner) {
    return {
      valid: false,
      error: `Rule violation: Scale into winners only. Add-on price (${newPrice}) must be favorable compared to initial entry (${initialLeg.price}).`,
    };
  }

  // Check 2: Initial leg SL must be at Breakeven or better
  const sl = initialLeg.stop_loss;
  if (sl === undefined || sl === null) {
    return {
      valid: false,
      error: 'Rule violation: Leg 1 must have an active Stop-Loss at or beyond Breakeven before scaling in.',
    };
  }
  const isBeOrProfit =
    trade.direction === 'BUY' ? sl >= initialLeg.price : sl <= initialLeg.price;
  if (!isBeOrProfit) {
    return {
      valid: false,
      error: `Rule violation: Leg 1 SL (${sl}) must be moved to Breakeven (${initialLeg.price}) or in profit before adding contracts.`,
    };
  }

  // Check 3: Add-on lots <= initial lots
  const currentAddOnLots = trade.legs
    .slice(1)
    .filter((l) => l.action === 'SCALE_IN')
    .reduce((sum, l) => sum + l.lot_size, 0);

  if (currentAddOnLots + newLots > initialLeg.lot_size + 0.001) {
    return {
      valid: false,
      error: `Rule violation: Cumulative add-on lots (${(currentAddOnLots + newLots).toFixed(2)}) cannot exceed initial leg lot size (${initialLeg.lot_size.toFixed(2)}).`,
    };
  }

  return { valid: true };
}

/**
 * Prop Firm Drawdown Calculations
 */
export function calculateAccountCompliance(account: Account) {
  const isProp = account.category !== 'personal';
  const highWaterMark = account.high_water_mark || account.starting_balance;

  // Daily drawdown watermark floor
  // Daily limit is based on the higher of starting-day balance or midnight floating equity (High-Water Mark)
  const dailyDrawdownBudget = highWaterMark * (account.daily_drawdown_limit_pct / 100);
  const dailyFloor = highWaterMark - dailyDrawdownBudget;
  const remainingDailyHeadroom = Math.max(0, account.current_balance - dailyFloor);
  const dailyUsedPct = Math.min(
    100,
    Math.max(0, ((highWaterMark - account.current_balance) / dailyDrawdownBudget) * 100)
  );

  // Overall Max Drawdown
  const maxDrawdownBudget = account.starting_balance * (account.max_drawdown_limit_pct / 100);
  const maxFloor = account.starting_balance - maxDrawdownBudget;
  const remainingMaxHeadroom = Math.max(0, account.current_balance - maxFloor);

  // Profit target progression (for P1 / P2)
  let targetUsd: number | null = null;
  let targetProgressPct: number | null = null;
  if (isProp && account.profit_target_pct) {
    targetUsd = account.starting_balance * (account.profit_target_pct / 100);
    const gained = account.current_balance - account.starting_balance;
    targetProgressPct = Math.min(100, Math.max(0, (gained / targetUsd) * 100));
  }

  return {
    isProp,
    highWaterMark,
    dailyFloor,
    remainingDailyHeadroom,
    dailyUsedPct,
    maxFloor,
    remainingMaxHeadroom,
    targetUsd,
    targetProgressPct,
  };
}

/**
 * 2x Rolling Average Consistency Rule
 * Returns warning if proposed lot size > 2x average historical lots
 */
export function checkLotConsistency(
  accountTrades: MasterTrade[],
  proposedLots: number
): { isConsistent: boolean; avgLots: number; maxAllowedLots: number } {
  const closedTrades = accountTrades.filter((t) => t.status === 'CLOSED' && t.legs.length > 0);
  if (closedTrades.length < 3) {
    // Not enough sample size yet
    return { isConsistent: true, avgLots: proposedLots, maxAllowedLots: proposedLots * 2 };
  }

  const allLots = closedTrades.map((t) => t.initial_planned_lots || t.legs[0]?.lot_size || 0);
  const sumLots = allLots.reduce((a, b) => a + b, 0);
  const avgLots = sumLots / allLots.length;
  const maxAllowedLots = Math.round(avgLots * 2 * 100) / 100;

  return {
    isConsistent: proposedLots <= maxAllowedLots + 0.01,
    avgLots: Math.round(avgLots * 100) / 100,
    maxAllowedLots,
  };
}

/**
 * Daily Circuit Breaker Status:
 * Max 2 campaigns per day
 * Max 2 losses per day
 */
export function calculateDailyCircuitBreaker(
  trades: MasterTrade[],
  accountId?: string
): {
  campaignsToday: number;
  lossesToday: number;
  maxCampaigns: number;
  maxLosses: number;
  isBreakerTripped: boolean;
  reason?: string;
} {
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayTrades = trades.filter((t) => {
    if (accountId && t.account_id !== accountId) return false;
    const date = t.opened_at ? t.opened_at.slice(0, 10) : '';
    return date === todayStr;
  });

  const campaignsToday = todayTrades.length;
  const lossesToday = todayTrades.filter(
    (t) => t.status === 'CLOSED' && t.realized_pnl < -1
  ).length;

  const maxCampaigns = 2;
  const maxLosses = 2;

  let isBreakerTripped = false;
  let reason: string | undefined;

  if (lossesToday >= maxLosses) {
    isBreakerTripped = true;
    reason = `HARD LOCKOUT: Maximum daily loss limit reached (${lossesToday}/${maxLosses} losses). Do not open further trades today!`;
  } else if (campaignsToday >= maxCampaigns) {
    isBreakerTripped = true;
    reason = `Campaign quota reached (${campaignsToday}/${maxCampaigns} campaigns taken today). Protect capital and wait for next session.`;
  }

  return {
    campaignsToday,
    lossesToday,
    maxCampaigns,
    maxLosses,
    isBreakerTripped,
    reason,
  };
}

/**
 * Revenge Trade Sentinel:
 * Any trade opened < 60 minutes after a stopped-out trade.
 */
export function checkRevengeTrade(
  trades: MasterTrade[],
  newOpenTimeIso: string,
  accountId: string
): { isRevenge: boolean; minutesSinceStop?: number; previousTradeId?: string } {
  const openTime = new Date(newOpenTimeIso).getTime();

  // Find closed losing trades on same account
  const stoppedTrades = trades
    .filter(
      (t) =>
        t.account_id === accountId &&
        t.status === 'CLOSED' &&
        t.realized_pnl < -1 &&
        t.closed_at
    )
    .sort((a, b) => new Date(b.closed_at!).getTime() - new Date(a.closed_at!).getTime());

  if (stoppedTrades.length === 0) {
    return { isRevenge: false };
  }

  const lastStop = stoppedTrades[0];
  const lastStopTime = new Date(lastStop.closed_at!).getTime();
  const diffMinutes = Math.floor((openTime - lastStopTime) / (1000 * 60));

  if (diffMinutes >= 0 && diffMinutes < 60) {
    return {
      isRevenge: true,
      minutesSinceStop: diffMinutes,
      previousTradeId: lastStop.id,
    };
  }

  return { isRevenge: false };
}

/**
 * Computes Rollover Alert & Countdown:
 * Warning before 21:55 GMT (and Friday 21:00 GMT).
 */
export function getRolloverCountdown(nowDate: Date = new Date()) {
  const utcDay = nowDate.getUTCDay(); // 0 = Sun, 5 = Fri
  const isFriday = utcDay === 5;
  const targetHour = isFriday ? 21 : 21;
  const targetMinute = isFriday ? 0 : 55;

  const target = new Date(nowDate);
  target.setUTCHours(targetHour, targetMinute, 0, 0);

  // If today's target is past, next target is tomorrow's
  if (nowDate.getTime() > target.getTime()) {
    target.setUTCDate(target.getUTCDate() + 1);
    if (target.getUTCDay() === 5) {
      target.setUTCHours(21, 0, 0, 0);
    } else {
      target.setUTCHours(21, 55, 0, 0);
    }
  }

  const diffMs = target.getTime() - nowDate.getTime();
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  // Warning when less than 30 minutes to cutoff
  const isImminent = totalMinutes <= 30;

  return {
    hours,
    minutes,
    seconds,
    totalMinutes,
    isImminent,
    targetString: `${String(targetHour).padStart(2, '0')}:${String(targetMinute).padStart(2, '0')} GMT`,
    isFriday,
  };
}

/**
 * Sanitizes numeric input strings to ensure:
 * - Emptying the field completely removes all characters without leaving an unwanted '0'
 * - Typing a new value does not leave a lingering leading '0' (e.g. '02' -> '2')
 * - Deliberate entry of '0' or decimals like '0.5' is fully preserved
 */
export function sanitizeNumberInput(rawVal: string): string {
  if (rawVal === '') return '';
  // If the string starts with 0 followed by another digit without a decimal point, strip leading zeros
  // e.g., '02' -> '2', '02650' -> '2650'
  if (/^0\d/.test(rawVal) && !rawVal.startsWith('0.')) {
    return rawVal.replace(/^0+/, '') || '0';
  }
  return rawVal;
}

/**
 * Converts a number or string parameter input to a safe numeric value
 */
export function toNum(val: number | string | undefined | null, fallback: number = 0): number {
  if (typeof val === 'number') return isNaN(val) ? fallback : val;
  if (val === '' || val === undefined || val === null) return fallback;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? fallback : parsed;
}
