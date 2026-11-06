import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/apiService';
import { Product, CurrentAccount, Catransaction, Invoice, CashRegister, ChequeNote } from '../types';
import { formatDate } from '../utils/dateUtils';
import {
  Package,
  Users,
  ArrowRightLeft,
  FileText,
  Wallet,
  CreditCard,
  ArrowUpRight,
  Download,
  Layers,
} from 'lucide-react';

export const HomePage: React.FC = () => {
  const { t, culture, setActiveTab, refreshTrigger, showNotification } = useApp();

  const [products, setProducts] = useState<Product[]>([]);
  const [currentAccounts, setCurrentAccounts] = useState<CurrentAccount[]>([]);
  const [catransactions, setCatransactions] = useState<Catransaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [cheques, setCheques] = useState<ChequeNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const [prods, accs, caTxs, invList, cashList, chqList] = await Promise.all([
          apiService.getProducts(),
          apiService.getCurrentAccounts(),
          apiService.getCatransactions(),
          apiService.getInvoices().catch(() => []),
          apiService.getCashRegisters().catch(() => []),
          apiService.getCheques().catch(() => []),
        ]);
        if (isMounted) {
          setProducts(prods);
          setCurrentAccounts(accs);
          setCatransactions(caTxs);
          setInvoices(invList);
          setCashRegisters(cashList);
          setCheques(chqList);
        }
      } catch (err) {
        console.error('Failed to load dashboard data from SQLite:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  const totalStock = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const totalBalance = currentAccounts.reduce((acc, a) => acc + (a.balance || 0), 0);
  const totalCashBalance = cashRegisters.reduce((acc, c) => acc + (c.balance || 0), 0);

  const handleBackupDownload = async () => {
    try {
      showNotification(
        'info',
        culture === 'tr-TR'
          ? 'SQLite veritabanı yedeği hazırlanıyor...'
          : 'Preparing SQLite database backup...'
      );
      await apiService.downloadDatabaseBackup();
      showNotification(
        'success',
        culture === 'tr-TR'
          ? 'Veritabanı yedeği başarıyla indirildi (lightbase.db)'
          : 'SQLite database backup downloaded successfully (lightbase.db)'
      );
    } catch (err: any) {
      console.error('Backup error:', err);
      showNotification(
        'error',
        culture === 'tr-TR' ? 'Yedek indirme başarısız oldu' : 'Backup download failed'
      );
    }
  };

  const getCaTypeBadge = (type: string | null) => {
    if (!type) return '-';
    switch (type) {
      case 'AD':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            {t.caTypes.AD}
          </span>
        );
      case 'BD':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            {t.caTypes.BD}
          </span>
        );
      case 'NT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
            {t.caTypes.NT}
          </span>
        );
      case 'NP':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            {t.caTypes.NP}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-200">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Hero Section */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 sm:p-8 border border-gray-200 dark:border-zinc-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 dark:text-zinc-100 tracking-tight">
              {t.appName}
            </h1>
            <h2 className="text-xl sm:text-2xl font-medium text-blue-600 dark:text-blue-400 mt-2">
              {t.slogan}
            </h2>
            <p className="text-gray-600 dark:text-zinc-400 mt-1 max-w-2xl text-sm">
              {t.tagline}
            </p>
          </div>
          <button
            type="button"
            onClick={handleBackupDownload}
            className="self-start sm:self-center inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-semibold text-xs hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors shadow-2xs"
          >
            <Download className="w-4 h-4" />
            <span>{t.actions.backupDb} (lightbase.db)</span>
          </button>
        </div>

        {/* Quick action buttons */}
        <div className="flex flex-wrap items-center gap-2.5 mt-6 pt-6 border-t border-gray-100 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg bg-[#1b6ec2] text-white hover:bg-[#155a9e] transition-colors"
          >
            <Package className="w-4 h-4" />
            <span>{t.nav.products}</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stocks')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700/60 transition-colors"
          >
            <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{t.nav.stocks}</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('stock-movements')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700/60 transition-colors"
          >
            <ArrowRightLeft className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>{t.nav.stockMovements}</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700/60 transition-colors"
          >
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{t.nav.invoices}</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('current-accounts')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700/60 transition-colors"
          >
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{t.nav.currentAccounts}</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('catransactions')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700/60 transition-colors"
          >
            <ArrowRightLeft className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>{t.nav.catransactions}</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cash-registers')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700/60 transition-colors"
          >
            <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>{t.nav.cashRegisters}</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cheques')}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700/60 transition-colors"
          >
            <CreditCard className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>{t.nav.cheques}</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-70" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Products Card */}
        <div
          onClick={() => setActiveTab('products')}
          className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
              {t.dashboard.totalProducts}
            </span>
            <span className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
              <Package className="w-5 h-5" />
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mt-3 tabular-nums font-mono">
            {loading ? '...' : products.length}
          </p>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
            {t.dashboard.totalStock}:{' '}
            <span className="font-semibold tabular-nums font-mono">
              {totalStock.toLocaleString(culture, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ft²
            </span>
          </p>
        </div>

        {/* Current Accounts Card */}
        <div
          onClick={() => setActiveTab('current-accounts')}
          className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-xs hover:border-emerald-400 dark:hover:border-emerald-600 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
              {t.dashboard.totalAccounts}
            </span>
            <span className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mt-3 tabular-nums font-mono">
            {loading ? '...' : currentAccounts.length}
          </p>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
            {t.dashboard.totalBalance}:{' '}
            <span className="font-semibold tabular-nums font-mono">
              {totalBalance.toLocaleString(culture, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
            </span>
          </p>
        </div>

        {/* Invoices Card */}
        <div
          onClick={() => setActiveTab('invoices')}
          className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
              {t.dashboard.totalInvoices}
            </span>
            <span className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mt-3 tabular-nums font-mono">
            {loading ? '...' : invoices.length}
          </p>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {invoices.filter((i) => i.status !== 'CANCELLED').length}
            </span>{' '}
            {culture === 'tr-TR' ? 'aktif fatura' : 'active invoices'}
          </p>
        </div>

        {/* Cash Registers Card */}
        <div
          onClick={() => setActiveTab('cash-registers')}
          className="p-5 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 shadow-xs hover:border-emerald-400 dark:hover:border-emerald-600 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
              {t.nav.cashRegisters}
            </span>
            <span className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
              <Wallet className="w-5 h-5" />
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mt-3 tabular-nums font-mono">
            {loading ? '...' : totalCashBalance.toLocaleString(culture, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
          </p>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
            {cashRegisters.length} {t.common.items}
          </p>
        </div>
      </div>

      {/* Recent Activity Table Preview */}
      <div className="bg-white dark:bg-zinc-900 rounded-xl p-6 border border-gray-200 dark:border-zinc-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">
            {t.dashboard.recentTransactions}
          </h3>
          <button
            type="button"
            onClick={() => setActiveTab('catransactions')}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            {culture === 'tr-TR' ? 'Tümünü Gör →' : 'View All →'}
          </button>
        </div>

        {catransactions.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-zinc-400 py-4 text-center">
            {t.common.noRecords}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-zinc-800/60 text-xs text-gray-500 dark:text-zinc-400 uppercase">
                <tr>
                  <th className="px-4 py-2.5">{t.common.date}</th>
                  <th className="px-4 py-2.5">{t.common.code}</th>
                  <th className="px-4 py-2.5">{t.common.type}</th>
                  <th className="px-4 py-2.5">{t.common.amount}</th>
                  <th className="px-4 py-2.5">{t.common.currentAccount}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800">
                {catransactions.slice(0, 5).map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/40">
                    <td className="px-4 py-2.5 font-mono text-xs text-gray-500 dark:text-zinc-400 tabular-nums">
                      {formatDate(tx.date, culture)}
                    </td>
                    <td className="px-4 py-2.5 text-gray-900 dark:text-zinc-100 font-mono font-semibold tabular-nums">
                      {tx.code ?? '-'}
                    </td>
                    <td className="px-4 py-2.5">
                      {getCaTypeBadge(tx.type)}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-gray-900 dark:text-zinc-100 font-mono tabular-nums">
                      {tx.amount !== null && tx.amount !== undefined ? `${tx.amount.toLocaleString(culture, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $` : '-'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700 dark:text-zinc-300">
                      {tx.currentAccount?.description || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};


