import React from 'react';
import { AuthProvider } from './context/AuthContext';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { Dashboard } from './pages/Dashboard';
import { AddTransaction } from './pages/AddTransaction';
import { TransactionHistory } from './pages/TransactionHistory';
import { Accounts } from './pages/Accounts';
import { Reports } from './pages/Reports';
import { Budgets } from './pages/Budgets';
import { Settings } from './pages/Settings';
import { InstallPrompt } from './components/InstallPrompt';
import { Logo } from './components/Logo';
import { AlertCircle, RefreshCw } from 'lucide-react';

const MainContent = () => {
  const { activeScreen, loading, error, refreshData } = useFinance();

  const renderScreen = () => {
    switch (activeScreen) {
      case 'dashboard':
        return <Dashboard />;
      case 'add-transaction':
        return <AddTransaction />;
      case 'transactions':
        return <TransactionHistory />;
      case 'accounts':
        return <Accounts />;
      case 'reports':
        return <Reports />;
      case 'budgets':
        return <Budgets />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 font-sans">
      {/* Desktop Persistent Sidebar */}
      <Sidebar />

      {/* Mobile Top Brand Navbar */}
      <div className="md:hidden bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 sticky top-0 z-30 flex items-center justify-between">
        <Logo size="sm" />
        <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
          Cloud
        </span>
      </div>

      {/* Main Dynamic Viewport */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 max-w-7xl mx-auto w-full pb-24 md:pb-10">
        {/* Safe Database Error Notice: never silently mask database errors as empty states */}
        {error && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-950 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-start gap-3 min-w-0">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-900">
                  Database Sync Notice
                </p>
                <p className="text-xs text-amber-800 mt-0.5 font-medium break-words">
                  {error}
                </p>
                <p className="text-[11px] text-amber-700/80 mt-1">
                  Your stored records are preserved in Supabase. Tap retry to re-establish the connection.
                </p>
              </div>
            </div>
            <button
              onClick={refreshData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shrink-0 transition-colors shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Sync</span>
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-semibold text-slate-500">Loading your financial records...</p>
          </div>
        ) : (
          renderScreen()
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
};

const ProtectedRoot = () => {
  return (
    <FinanceProvider>
      <MainContent />
    </FinanceProvider>
  );
};

export function App() {
  return (
    <AuthProvider>
      <ProtectedRoot />
      <InstallPrompt />
    </AuthProvider>
  );
}

export default App;
