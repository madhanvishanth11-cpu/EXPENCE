import React, { useState } from 'react';
import {
  RotateCcw,
  ShieldCheck,
  Sliders,
  Bell,
  Smartphone,
  HardDrive,
  Info,
  Check,
  Database,
  ExternalLink,
  User,
  LogOut,
  Copy,
  AlertTriangle,
  KeyRound
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { Header } from '../components/Header';
import { isSupabaseConfigured, supabaseHost, checkSupabaseHealth } from '../services/supabase';

export const Settings = () => {
  const { transactions, accounts, categories, budgets, profile, error, refreshData } = useFinance();
  const { user, signOut } = useAuth();
  const [syncDone, setSyncDone] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [healthStatus, setHealthStatus] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);

  const testConnection = async () => {
    setTestingConnection(true);
    const res = await checkSupabaseHealth();
    setHealthStatus(res);
    setTestingConnection(false);
  };

  const handleRefresh = async () => {
    await refreshData();
    setSyncDone(true);
    setTimeout(() => setSyncDone(false), 2000);
  };

  const copyUserId = () => {
    if (user?.id) {
      navigator.clipboard.writeText(user.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <Header
        title="Preferences & Settings"
        subtitle="Manage cloud database sync, user profile, and localization"
      />

      {syncDone && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-center gap-2 text-sm font-medium animate-fadeIn">
          <Check className="w-5 h-5 text-emerald-600" />
          <span>Financial records synced with Supabase cloud.</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-amber-950 flex items-start gap-2.5 text-xs font-medium animate-fadeIn">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-900">Database Diagnostic Alert:</p>
            <p className="mt-0.5 text-amber-800">{error}</p>
          </div>
        </div>
      )}

      {/* User Account Info & RLS Identity */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <User className="w-4 h-4 text-emerald-700" />
          <span>Authenticated Account & Identity</span>
        </h3>

        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {profile?.display_name || user?.user_metadata?.display_name || 'Authenticated User'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
            </div>
            <button
              onClick={signOut}
              className="self-start sm:self-center inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="min-w-0">
              <span className="font-medium text-slate-500 text-[11px] uppercase tracking-wider block">
                Supabase User ID (auth.uid)
              </span>
              <span className="font-mono text-slate-800 text-xs select-all break-all">
                {user?.id || 'No active session'}
              </span>
            </div>
            {user?.id && (
              <button
                onClick={copyUserId}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-md text-[11px] font-semibold shrink-0 transition-colors shadow-2xs"
              >
                {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId ? 'Copied' : 'Copy ID'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Supabase Connection & Diagnostics Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-700">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Supabase Cloud Database</h3>
              <p className="text-xs text-slate-500 mt-0.5">PostgreSQL backend with Row Level Security (RLS)</p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              isSupabaseConfigured
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-amber-50 text-amber-700 border border-amber-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isSupabaseConfigured ? 'bg-emerald-500' : 'bg-amber-500'
              }`}
            ></span>
            {isSupabaseConfigured ? 'Connected' : 'Credentials Needed'}
          </span>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <span className="text-lg font-bold text-slate-900">{accounts.length}</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Accounts</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <span className="text-lg font-bold text-slate-900">{transactions.length}</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Transactions</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <span className="text-lg font-bold text-slate-900">{categories.length}</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Categories</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
              <span className="text-lg font-bold text-slate-900">{budgets.length}</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Budgets</p>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 text-xs text-slate-600 space-y-2">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200/50">
              <span className="font-semibold text-slate-700">Project Endpoint</span>
              <span className="font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/60 text-[11px]">
                {supabaseHost}
              </span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              <strong>Row Level Security (RLS) Policy:</strong> Every financial transaction is cryptographically tied to the user ID above.
              If you logged in with a different email or signed up for a new account yesterday, your data remains safely stored under that specific user ID.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleRefresh}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Force Sync / Refresh Database</span>
              </button>
              <button
                type="button"
                onClick={testConnection}
                disabled={testingConnection}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-850 rounded-lg text-xs font-semibold transition-colors shadow-xs"
              >
                <Database className="w-3.5 h-3.5 text-emerald-700" />
                <span>{testingConnection ? 'Testing...' : 'Test Connection'}</span>
              </button>
            </div>

            {healthStatus && (
              <div
                className={`mt-2 p-3 rounded-lg border text-xs font-medium animate-fadeIn ${
                  healthStatus.ok
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                <p className="font-bold">
                  {healthStatus.ok ? 'Connection Verified: Supabase is online and responding.' : 'Connection Failed:'}
                </p>
                {!healthStatus.ok && <p className="mt-1 text-[11px] leading-relaxed">{healthStatus.error}</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* General Configuration */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
        <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
          Currency & Localization
        </h3>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Currency Denomination</p>
            <p className="text-xs text-slate-500 mt-0.5">Primary currency for transaction logging</p>
          </div>
          <div className="px-3.5 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-800">
            INR (₹) - Indian Rupee
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div>
            <p className="text-sm font-semibold text-slate-900">Number Formatting Style</p>
            <p className="text-xs text-slate-500 mt-0.5">Indian Lakhs and Crores grouping (en-IN)</p>
          </div>
          <div className="px-3.5 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-800">
            1,00,000.00
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div>
            <p className="text-sm font-semibold text-slate-900">Supported Rails</p>
            <p className="text-xs text-slate-500 mt-0.5">Active payment instruments</p>
          </div>
          <div className="text-xs text-slate-600 font-medium">
            Cash, UPI, Debit / Credit Cards, Net Banking / IMPS
          </div>
        </div>
      </div>

      {/* Progressive Web App (PWA) Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
          <span>Mobile App (PWA)</span>
          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Installable
          </span>
        </h3>

        <p className="text-xs text-slate-600 leading-relaxed">
          SpendWise can be installed directly onto your Android phone as a standalone home-screen app.
        </p>

        <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-xl space-y-2 text-xs text-emerald-900">
          <p className="font-semibold">How to install on Android:</p>
          <ol className="list-decimal list-inside space-y-1 text-slate-700">
            <li>In Google Chrome, tap the <strong>three dots (⋮)</strong> at the top right.</li>
            <li>Tap <strong>"Install app"</strong> (or <strong>"Add to Home screen"</strong>).</li>
            <li>Tap <strong>Install</strong> to add SpendWise directly to your app drawer.</li>
          </ol>
        </div>
      </div>
    </div>
  );
};
