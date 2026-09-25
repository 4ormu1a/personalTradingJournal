import React, { useState, useEffect } from 'react';
import { useTrading } from '../../context/TradingContext';
import { TradeDirection, CandlestickType, TradingSession } from '../../types';
import {
  calculateGoldLotSize,
  pipsToStopLoss,
  stopLossToPips,
  calculateMin1RTakeProfit,
  checkLotConsistency,
  calculateGoldCashMove,
  GOLD_PIP_VALUE,
  sanitizeNumberInput,
  toNum,
} from '../../utils/math';
import {
  Calculator,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  Link,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Clock,
  Split,
  DollarSign,
} from 'lucide-react';

export const SizingPlanner: React.FC = () => {
  const {
    selectedAccount,
    trades,
    createTradeFromCalculator,
    setActiveTab,
  } = useTrading();

  // Inputs: Stored as number | string so users can completely clear fields without an unwanted '0' appearing
  const [direction, setDirection] = useState<TradeDirection>('BUY');
  const [entryPrice, setEntryPrice] = useState<number | string>(2650.0);
  const [stopLossPrice, setStopLossPrice] = useState<number | string>(2645.0);
  const [takeProfitPrice, setTakeProfitPrice] = useState<number | string>(2665.0);
  const [pipDistance, setPipDistance] = useState<number | string>(50.0); // 50 pips = $5.00
  const [riskPercent, setRiskPercent] = useState<number | string>(selectedAccount.default_risk_pct || 1.0);
  const [riskCash, setRiskCash] = useState<number | string>(
    Math.round(((selectedAccount.current_balance * (selectedAccount.default_risk_pct || 1.0)) / 100) * 100) / 100
  );

  // Synchronize risk percent and cash when account changes
  useEffect(() => {
    const isProp = selectedAccount.category !== 'personal';
    const maxCap = selectedAccount.max_risk_pct_cap || 1.5;
    let initialPct = selectedAccount.default_risk_pct;
    if (isProp && initialPct > maxCap) {
      initialPct = maxCap;
    }
    setRiskPercent(initialPct);
    setRiskCash(Math.round((selectedAccount.current_balance * (initialPct / 100)) * 100) / 100);
  }, [selectedAccount]);

  // Safe numeric values for calculations
  const numEntryPrice = toNum(entryPrice, 0);
  const numStopLossPrice = toNum(stopLossPrice, 0);
  const numTakeProfitPrice = toNum(takeProfitPrice, 0);
  const numPipDistance = toNum(pipDistance, 0);
  const numRiskPercent = toNum(riskPercent, 0);
  const numRiskCash = toNum(riskCash, 0);

  // Handle Dual Stop Loss Input: Bidirectional sync
  const handleStopLossChange = (raw: string) => {
    const clean = sanitizeNumberInput(raw);
    setStopLossPrice(clean);
    if (clean !== '' && numEntryPrice > 0) {
      const pips = stopLossToPips(numEntryPrice, Number(clean));
      setPipDistance(pips);
    }
  };

  const handlePipDistanceChange = (raw: string) => {
    const clean = sanitizeNumberInput(raw);
    setPipDistance(clean);
    if (clean !== '' && numEntryPrice > 0) {
      const calculatedSl = pipsToStopLoss(direction, numEntryPrice, Number(clean));
      setStopLossPrice(calculatedSl);
    }
  };

  const handleEntryChange = (raw: string) => {
    const clean = sanitizeNumberInput(raw);
    setEntryPrice(clean);
    if (clean !== '') {
      const newEntry = Number(clean);
      const calculatedSl = pipsToStopLoss(direction, newEntry, numPipDistance);
      setStopLossPrice(calculatedSl);
      // Keep 3R default TP
      const delta = Math.abs(newEntry - calculatedSl) * 3;
      setTakeProfitPrice(
        direction === 'BUY'
          ? Math.round((newEntry + delta) * 100) / 100
          : Math.round((newEntry - delta) * 100) / 100
      );
    }
  };

  const handleTakeProfitChange = (raw: string) => {
    const clean = sanitizeNumberInput(raw);
    setTakeProfitPrice(clean);
  };

  const handleDirectionChange = (newDir: TradeDirection) => {
    setDirection(newDir);
    if (numEntryPrice > 0) {
      const calculatedSl = pipsToStopLoss(newDir, numEntryPrice, numPipDistance);
      setStopLossPrice(calculatedSl);
      const delta = Math.abs(numEntryPrice - calculatedSl) * 3;
      setTakeProfitPrice(
        newDir === 'BUY'
          ? Math.round((numEntryPrice + delta) * 100) / 100
          : Math.round((numEntryPrice - delta) * 100) / 100
      );
    }
  };

  const handleRiskPercentChange = (raw: string) => {
    const clean = sanitizeNumberInput(raw);
    const isProp = selectedAccount.category !== 'personal';
    const cap = selectedAccount.max_risk_pct_cap;
    if (clean === '') {
      setRiskPercent('');
      return;
    }
    const pct = Number(clean);
    const cappedPct = isProp && cap ? Math.min(pct, cap) : pct;
    setRiskPercent(clean === String(pct) ? cappedPct : clean);
    setRiskCash(Math.round((selectedAccount.current_balance * (cappedPct / 100)) * 100) / 100);
  };

  const handleRiskCashChange = (raw: string) => {
    const clean = sanitizeNumberInput(raw);
    setRiskCash(clean);
    if (clean === '') {
      return;
    }
    const cash = Number(clean);
    if (selectedAccount.current_balance > 0) {
      const calculatedPct = (cash / selectedAccount.current_balance) * 100;
      setRiskPercent(Math.round(calculatedPct * 100) / 100);
    }
  };

  // Mathematical lot size calculation
  const computedLotSize = calculateGoldLotSize(numEntryPrice, numStopLossPrice, numRiskCash);
  const calculatedLots = computedLotSize.lots;

  // Consistency rule check
  const consistency = checkLotConsistency(trades, calculatedLots);

  // Setup R-Multiple
  const priceDistanceSL = Math.abs(numEntryPrice - numStopLossPrice);
  const priceDistanceTP = Math.abs(numTakeProfitPrice - numEntryPrice);
  const setupRMultiple =
    priceDistanceSL > 0 && numTakeProfitPrice > 0
      ? Math.round((priceDistanceTP / priceDistanceSL) * 100) / 100
      : 0;
  const potentialGrossProfit = calculateGoldCashMove(direction, numEntryPrice, numTakeProfitPrice, calculatedLots);

  // Scale-Out 1R Calculator state
  const [partialLotsToTake, setPartialLotsToTake] = useState<number | string>(
    Math.max(0.01, Math.round((calculatedLots / 2) * 100) / 100)
  );

  useEffect(() => {
    if (calculatedLots > 0) {
      setPartialLotsToTake(Math.max(0.01, Math.round((calculatedLots / 2) * 100) / 100));
    }
  }, [calculatedLots]);

  const numPartialLots = toNum(partialLotsToTake, 0.01);
  const min1RTakeProfit = calculateMin1RTakeProfit(
    direction,
    numEntryPrice,
    numRiskCash,
    numPartialLots
  );

  // Scale-In Planner Module preview state
  const [scaleInPrice, setScaleInPrice] = useState<number | string>(
    direction === 'BUY' ? numEntryPrice + 3.0 : numEntryPrice - 3.0
  );
  const [scaleInLots, setScaleInLots] = useState<number | string>(
    Math.max(0.01, Math.round((calculatedLots * 0.5) * 100) / 100)
  );

  const handlePartialLotsChange = (raw: string) => {
    setPartialLotsToTake(sanitizeNumberInput(raw));
  };

  const handleScaleInPriceChange = (raw: string) => {
    setScaleInPrice(sanitizeNumberInput(raw));
  };

  const handleScaleInLotsChange = (raw: string) => {
    setScaleInLots(sanitizeNumberInput(raw));
  };

  // Confluences & Checklist state
  const [session, setSession] = useState<TradingSession>('London');
  const [hasSr, setHasSr] = useState<boolean>(true);
  const [hasTrendline, setHasTrendline] = useState<boolean>(true);
  const [hasPattern, setHasPattern] = useState<boolean>(false);
  const [hasFib, setHasFib] = useState<boolean>(true);
  const [candlestickConfirmed, setCandlestickConfirmed] = useState<boolean>(true);
  const [candlestickType, setCandlestickType] = useState<CandlestickType>('Engulfing');
  const [isNewsTrade, setIsNewsTrade] = useState<boolean>(false);
  const [chartUrl, setChartUrl] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [screenshotPreview, setScreenshotPreview] = useState<string>('');

  // Handle direct screenshot upload or Ctrl+V paste
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          reader.onload = () => {
            setScreenshotPreview(reader.result as string);
          };
          reader.readAsDataURL(blob);
        }
      }
    }
  };

  const handleSendToActiveManager = () => {
    if (calculatedLots <= 0) {
      alert('Cannot create trade with 0 lots. Check your SL distance and cash risk.');
      return;
    }

    createTradeFromCalculator({
      accountId: selectedAccount.id,
      direction,
      entry: numEntryPrice,
      stopLoss: numStopLossPrice,
      takeProfit: numTakeProfitPrice,
      lots: calculatedLots,
      riskUsd: numRiskCash,
      session,
      hasSr,
      hasTrendline,
      hasPattern,
      hasFib,
      candlestickConfirmed,
      candlestickType,
      chartUrl: chartUrl.trim() || undefined,
      chartImageData: screenshotPreview || undefined,
      notes: notes.trim() ? (isNewsTrade ? `[NEWS WINDOW] ${notes}` : notes) : isNewsTrade ? '[NEWS WINDOW]' : undefined,
    });

    setActiveTab('active_manager');
  };

  const isProp = selectedAccount.category !== 'personal';

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6" onPaste={handlePaste}>
      {/* Header info */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#1f283d]">
        <div>
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-bold text-slate-100 tracking-tight">
              XAUUSD Institutional Sizing & Scaling Planner
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Engineered for 100 oz Gold contracts • Enforces prop drawdown caps, dual-input stop losses, and multi-leg scale models.
          </p>
        </div>

        {/* Account Info Badge */}
        <div className="flex items-center gap-3 bg-[#111622] border border-[#222d42] px-3.5 py-2 rounded-lg">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              Active Risk Account
            </span>
            <span className="text-sm font-bold text-slate-200">{selectedAccount.name}</span>
          </div>
          <div className="h-8 w-px bg-slate-700" />
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              Balance
            </span>
            <span className="text-sm font-mono-num font-bold text-amber-400">
              ${selectedAccount.current_balance.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Calculator Left, Scaling Modules Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Sizing Engine (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Card: Direction & Sizing Parameters */}
          <div className="bg-[#0f141e] border border-[#1f283d] rounded-xl p-5 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-amber-400" />
                Position Execution Parameters
              </span>

              {/* Direction Toggle */}
              <div className="flex items-center p-1 bg-[#090c12] rounded-lg border border-[#1b2333]">
                <button
                  type="button"
                  onClick={() => handleDirectionChange('BUY')}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                    direction === 'BUY'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5" />
                  BUY (LONG)
                </button>
                <button
                  type="button"
                  onClick={() => handleDirectionChange('SELL')}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                    direction === 'SELL'
                      ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  SELL (SHORT)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Entry Price */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex justify-between">
                  <span>Entry Price ($)</span>
                  <span className="text-[10px] text-slate-500 font-mono-num">Broker Quote</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    value={entryPrice}
                    onChange={(e) => handleEntryChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#161d2b] border border-[#232f48] focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 text-slate-100 rounded-lg px-3 py-2 text-sm font-mono-num font-semibold outline-none transition-colors placeholder:text-slate-600"
                  />
                  <span className="absolute right-2.5 top-2.5 text-[11px] text-slate-500 font-mono-num">
                    USD
                  </span>
                </div>
              </div>

              {/* Dual Stop Loss: Price Level */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex justify-between">
                  <span>Stop Loss Price ($)</span>
                  <span className="text-[10px] text-amber-400/80 font-mono-num">Dual Sync</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    value={stopLossPrice}
                    onChange={(e) => handleStopLossChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#161d2b] border border-[#232f48] focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 text-slate-100 rounded-lg px-3 py-2 text-sm font-mono-num font-semibold outline-none transition-colors placeholder:text-slate-600"
                  />
                  <span className="absolute right-2.5 top-2.5 text-[11px] text-slate-500 font-mono-num">
                    USD
                  </span>
                </div>
              </div>

              {/* Dual Stop Loss: Pip Distance */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex justify-between">
                  <span>SL Distance</span>
                  <span className="text-[10px] text-slate-400 font-mono-num">
                    ${(numPipDistance * GOLD_PIP_VALUE).toFixed(2)} move
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    value={pipDistance}
                    onChange={(e) => handlePipDistanceChange(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#161d2b] border border-[#232f48] focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 text-slate-100 rounded-lg px-3 py-2 text-sm font-mono-num font-semibold outline-none transition-colors placeholder:text-slate-600"
                  />
                  <span className="absolute right-2.5 top-2.5 text-[11px] text-slate-500 font-mono-num">
                    pips
                  </span>
                </div>
              </div>
            </div>

            {/* Take Profit & Risk Sizing Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-[#1a2336]">
              {/* Take Profit Price */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex justify-between">
                  <span>Take Profit Price ($)</span>
                  <span className="text-[10px] text-emerald-400 font-mono-num font-semibold">
                    {setupRMultiple}R Setup
                  </span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.05"
                    value={takeProfitPrice}
                    onChange={(e) => handleTakeProfitChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#161d2b] border border-[#232f48] focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 text-slate-100 rounded-lg px-3 py-2 text-sm font-mono-num font-semibold outline-none transition-colors placeholder:text-slate-600"
                  />
                  <span className="absolute right-2.5 top-2.5 text-[11px] text-slate-500 font-mono-num">
                    USD
                  </span>
                </div>
              </div>

              {/* Risk % Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex justify-between">
                  <span>Risk % of Balance</span>
                  {isProp && (
                    <span className="text-[10px] text-amber-400 font-semibold">
                      Max Cap: {selectedAccount.max_risk_pct_cap}%
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    max={isProp ? selectedAccount.max_risk_pct_cap : 100}
                    value={riskPercent}
                    onChange={(e) => handleRiskPercentChange(e.target.value)}
                    placeholder="0.0"
                    className="w-full bg-[#161d2b] border border-[#232f48] focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 text-slate-100 rounded-lg px-3 py-2 text-sm font-mono-num font-semibold outline-none transition-colors placeholder:text-slate-600"
                  />
                  <span className="absolute right-2.5 top-2.5 text-[11px] text-slate-500 font-mono-num">
                    %
                  </span>
                </div>
              </div>

              {/* Risk Cash Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex justify-between">
                  <span>Monetary Risk ($1R)</span>
                  <span className="text-[10px] text-slate-400 font-mono-num">Cash at Risk</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="10"
                    value={riskCash}
                    onChange={(e) => handleRiskCashChange(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-[#161d2b] border border-[#232f48] focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 text-slate-100 rounded-lg px-3 py-2 text-sm font-mono-num font-semibold outline-none transition-colors placeholder:text-slate-600"
                  />
                  <span className="absolute right-2.5 top-2.5 text-[11px] text-slate-500 font-mono-num">
                    USD
                  </span>
                </div>
              </div>
            </div>

            {/* Calculated Output Callout Banner */}
            <div className="mt-5 p-4 rounded-xl bg-amber-50/90 dark:bg-gradient-to-br dark:from-[#121a28] dark:to-[#0d131f] border border-amber-300 dark:border-amber-500/30 flex flex-wrap items-center justify-between gap-4 shadow-sm dark:shadow-none">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-amber-800 dark:text-amber-400/90 font-bold block">
                  Computed Contract Size (100 oz / Lot)
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold text-amber-700 dark:text-amber-300 font-mono-num">
                    {calculatedLots.toFixed(2)}
                  </span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-300">Lots</span>
                  <span className="text-xs text-slate-600 dark:text-slate-400 font-mono-num ml-2">
                    ({(calculatedLots * 100).toFixed(0)} oz Gold)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono-num">
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">
                    Cash at Risk (1R)
                  </span>
                  <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                    -${toNum(riskCash).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="h-7 w-px bg-slate-300 dark:bg-slate-700" />
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-semibold block">
                    Target Profit ({setupRMultiple}R)
                  </span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    +${potentialGrossProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Consistency & Prop Rule Warnings */}
            {!consistency.isConsistent && isProp && (
              <div className="mt-3 p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-500/40 flex items-center gap-2 text-xs text-red-800 dark:text-red-300">
                <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                <span>
                  <strong>2x Consistency Warning:</strong> Proposed lot size ({calculatedLots}) exceeds 2x your historical rolling average ({consistency.avgLots} lots, ceiling {consistency.maxAllowedLots}). Prop firm audit risk!
                </span>
              </div>
            )}
          </div>

          {/* Card: Strategy Confluences & Candlestick Checklist */}
          <div className="bg-[#0f141e] border border-[#1f283d] rounded-xl p-5 shadow-xl space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Pre-Execution Technical Confluences & Verification
            </span>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* S/R */}
              <button
                type="button"
                onClick={() => setHasSr(!hasSr)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  hasSr
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                    : 'bg-[#141a27] border-[#222c40] text-slate-400 hover:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">Support / Resist</span>
                  {hasSr && <CheckCircle className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">Key HTF level sweep</span>
              </button>

              {/* Trendline 3rd touch */}
              <button
                type="button"
                onClick={() => setHasTrendline(!hasTrendline)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  hasTrendline
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                    : 'bg-[#141a27] border-[#222c40] text-slate-400 hover:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">Trendline 3rd Touch</span>
                  {hasTrendline && <CheckCircle className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">Clean channel bounce</span>
              </button>

              {/* Chart Pattern */}
              <button
                type="button"
                onClick={() => setHasPattern(!hasPattern)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  hasPattern
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                    : 'bg-[#141a27] border-[#222c40] text-slate-400 hover:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">Chart Pattern</span>
                  {hasPattern && <CheckCircle className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">Double bot / Flag / H&S</span>
              </button>

              {/* Fib */}
              <button
                type="button"
                onClick={() => setHasFib(!hasFib)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  hasFib
                    ? 'bg-amber-500/15 border-amber-500/50 text-amber-300'
                    : 'bg-[#141a27] border-[#222c40] text-slate-400 hover:text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">Fibonacci 61.8/78.6</span>
                  {hasFib && <CheckCircle className="w-3.5 h-3.5 text-amber-400" />}
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">Golden pocket zone</span>
              </button>
            </div>

            {/* Mandatory Candlestick Confirmation Checklist */}
            <div className="p-3.5 rounded-lg bg-[#141a27] border border-[#222d42] space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={candlestickConfirmed}
                    onChange={(e) => setCandlestickConfirmed(e.target.checked)}
                    className="w-4 h-4 text-amber-500 rounded border-slate-700 focus:ring-amber-500 bg-[#0c1017]"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-200">
                      Mandatory Checklist: Candlestick Confirmation Formed?
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Enforces patient entry confirmation to prevent premature impulse entries.
                    </span>
                  </div>
                </label>

                {candlestickConfirmed && (
                  <select
                    value={candlestickType}
                    onChange={(e) => setCandlestickType(e.target.value as CandlestickType)}
                    className="bg-[#182133] border border-[#2b3954] text-xs text-amber-300 rounded px-2 py-1 outline-none font-medium"
                  >
                    <option value="Engulfing">Engulfing Candle</option>
                    <option value="Pin Bar / Wick">Pin Bar / Rejection Wick</option>
                    <option value="None">None</option>
                  </select>
                )}
              </div>

              {!candlestickConfirmed && (
                <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>
                    Warning: Entering without confirmed candle will classify this execution as an <strong>Impulse Rule Violation</strong> in your Edge Analytics.
                  </span>
                </div>
              )}
            </div>

            {/* Session & News Trading Flag */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1">
                  Trading Session (GMT)
                </label>
                <select
                  value={session}
                  onChange={(e) => setSession(e.target.value as TradingSession)}
                  className="w-full bg-[#161d2b] border border-[#232f48] focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 text-slate-200 rounded-lg px-3 py-2 text-xs font-medium outline-none transition-colors cursor-pointer"
                >
                  <option value="London">London Open (07:00 - 10:00 GMT)</option>
                  <option value="NY Overlap">NY Overlap (12:00 - 16:00 GMT)</option>
                  <option value="NY PM">NY PM Session (16:00 - 20:00 GMT)</option>
                  <option value="Asian">Asian Session (00:00 - 06:00 GMT)</option>
                </select>
              </div>

              <div className="flex items-end">
                <label className="flex items-center gap-2 p-2 rounded-lg bg-[#161d2b] border border-[#232f48] w-full cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isNewsTrade}
                    onChange={(e) => setIsNewsTrade(e.target.checked)}
                    className="w-4 h-4 text-amber-500 rounded border-slate-700 bg-[#0c1017]"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-slate-200">Red Folder News Window?</span>
                    <span className="text-[10px] text-slate-400 block">50% sim deduction for prop audit</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Scaling Modules & Evidence Input (5 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Module: Scale-Out 1R Calculator */}
          <div className="bg-[#0f141e] border border-[#1f283d] rounded-xl p-5 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Split className="w-4 h-4 text-emerald-400" />
                Scale-Out Module (Bank ≥ 1R Target)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono-num">
                Rule: Realized ≥ Initial Risk
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Calculates the exact minimum price for TP1 so your partial close secures <strong>100% of your initial dollar risk</strong> ($1R = ${numRiskCash.toFixed(2)}).
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Partial Lots to Close
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={calculatedLots}
                  value={partialLotsToTake}
                  onChange={(e) => handlePartialLotsChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#161d2b] border border-[#232f48] focus:border-amber-400 text-slate-200 rounded px-2.5 py-1.5 text-xs font-mono-num outline-none transition-colors placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">
                  Required Distance
                </label>
                <div className="px-2.5 py-1.5 rounded bg-slate-100 dark:bg-[#161d2b] border border-slate-200 dark:border-[#232f48] text-xs font-mono-num text-slate-800 dark:text-slate-300">
                  {min1RTakeProfit.minPips} pips (${min1RTakeProfit.priceDelta.toFixed(2)})
                </div>
              </div>
            </div>

            {/* Result callout */}
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-between shadow-sm dark:shadow-none">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-800 dark:text-emerald-400 block">
                  Exact Minimum TP1 Price
                </span>
                <span className="text-lg font-bold font-mono-num text-emerald-700 dark:text-emerald-300">
                  ${min1RTakeProfit.minPrice.toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-medium">Banked at TP1</span>
                <span className="text-xs font-mono-num font-bold text-slate-900 dark:text-slate-200">
                  +${numRiskCash.toFixed(2)} (1.00R)
                </span>
              </div>
            </div>
          </div>

          {/* Module: Scale-In (Pyramiding) Planner */}
          <div className="bg-[#0f141e] border border-[#1f283d] rounded-xl p-5 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-400" />
                Scale-In (Pyramiding) Validation
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono-num">
                Add-on ≤ Initial Lots
              </span>
            </div>

            <div className="text-xs text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-300">
                <CheckCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Leg 1 SL must be at Breakeven before adding contracts.</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <CheckCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Scale into winners only (favorable price relative to entry).</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Planned Add-on Price
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={scaleInPrice}
                  onChange={(e) => handleScaleInPriceChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#161d2b] border border-[#232f48] focus:border-amber-400 text-slate-200 rounded px-2.5 py-1.5 text-xs font-mono-num outline-none transition-colors placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Add-on Lots (Max: {calculatedLots.toFixed(2)})
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={calculatedLots}
                  value={scaleInLots}
                  onChange={(e) => handleScaleInLotsChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#161d2b] border border-[#232f48] focus:border-amber-400 text-slate-200 rounded px-2.5 py-1.5 text-xs font-mono-num outline-none transition-colors placeholder:text-slate-600"
                />
              </div>
            </div>
          </div>

          {/* Visual Evidence & Notes */}
          <div className="bg-[#0f141e] border border-[#1f283d] rounded-xl p-5 shadow-xl space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-amber-400" />
              Chart Evidence & Plan Notes
            </span>

            <div className="space-y-2">
              <div className="relative">
                <Link className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="TradingView snapshot URL (e.g. https://tradingview.com/x/...)"
                  value={chartUrl}
                  onChange={(e) => setChartUrl(e.target.value)}
                  className="w-full bg-[#161d2b] border border-[#232f48] text-slate-200 rounded pl-8 pr-3 py-1.5 text-xs outline-none focus:border-amber-400"
                />
              </div>

              {/* Paste or Upload Drag Zone */}
              <div className="border border-dashed border-slate-300 dark:border-[#232f48] rounded-lg p-3 text-center bg-slate-50 dark:bg-[#131926]/50 hover:bg-slate-100 dark:hover:bg-[#131926] transition-colors relative">
                {screenshotPreview ? (
                  <div className="relative inline-block">
                    <img
                      src={screenshotPreview}
                      alt="Chart Preview"
                      className="max-h-24 rounded border border-slate-300 dark:border-slate-700 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setScreenshotPreview('')}
                      className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div>
                    <span className="text-xs text-slate-600 dark:text-slate-400 block">
                      Direct Chart Paste (<strong className="text-slate-900 dark:text-slate-200">Ctrl+V</strong>) or drop image
                    </span>
                    <label className="text-[10px] text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:underline cursor-pointer font-semibold">
                      Browse file
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              <textarea
                rows={2}
                placeholder="Execution thesis & trigger notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[#161d2b] border border-[#232f48] text-slate-200 rounded p-2 text-xs outline-none focus:border-amber-400"
              />
            </div>

            {/* Action Bridge Button */}
            <button
              type="button"
              onClick={handleSendToActiveManager}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-bold text-sm shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-[0.98]"
            >
              <span>Send to Journal as Active Trade</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
