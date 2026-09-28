/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { TradingProvider, useTrading } from './context/TradingContext';
import { TopNavBar } from './components/layout/TopNavBar';
import { SizingPlanner } from './components/calculator/SizingPlanner';
import { ActiveTradeManager } from './components/active/ActiveTradeManager';
import { MasterJournal } from './components/journal/MasterJournal';
import { TriageInbox } from './components/triage/TriageInbox';
import { StatementImporter } from './components/importer/StatementImporter';
import { IntelligenceAnalytics } from './components/analytics/IntelligenceAnalytics';
import { AccountHub } from './components/accounts/AccountHub';

const MainContent: React.FC = () => {
  const { activeTab } = useTrading();

  return (
    <main className="flex-1 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-150">
      {activeTab === 'calculator' && <SizingPlanner />}
      {activeTab === 'active_manager' && <ActiveTradeManager />}
      {activeTab === 'journal' && <MasterJournal />}
      {activeTab === 'triage' && <TriageInbox />}
      {activeTab === 'importer' && <StatementImporter />}
      {activeTab === 'analytics' && <IntelligenceAnalytics />}
      {activeTab === 'accounts' && <AccountHub />}
    </main>
  );
};

const AppContent: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col selection:bg-amber-500/20 selection:text-amber-500 font-sans antialiased transition-colors duration-150">
      <TopNavBar />
      <MainContent />
    </div>
  );
};

export default function App() {
  return (
    <TradingProvider>
      <AppContent />
    </TradingProvider>
  );
}
