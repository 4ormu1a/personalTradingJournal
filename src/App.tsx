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
  const { activeTab, theme } = useTrading();

  return (
    <main
      className={`min-h-[calc(100vh-120px)] ${
        theme === 'light' ? 'bg-[#f8fafc] text-slate-800' : 'bg-[#090b10] text-[#e2e8f0]'
      } transition-colors duration-200`}
    >
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
  const { theme } = useTrading();

  return (
    <div
      className={`min-h-screen ${
        theme === 'light' ? 'bg-[#f8fafc] text-slate-900' : 'bg-[#090b10] text-slate-100'
      } flex flex-col selection:bg-amber-500/20 selection:text-amber-300 transition-colors duration-200`}
    >
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
