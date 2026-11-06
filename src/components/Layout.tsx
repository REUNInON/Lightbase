import React, { useState, useEffect } from 'react';
import {
  Menu,
  Sun,
  Moon,
  Home,
  ArrowRightLeft,
  Users,
  Package,
  Layers,
  FileText,
  Wallet,
  CreditCard,
  Download,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/apiService';
import { CulturePicker } from './CulturePicker';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const {
    t,
    culture,
    theme,
    toggleTheme,
    activeTab,
    setActiveTab,
    sidebarExpanded,
    setSidebarExpanded,
    notification,
    clearNotification,
    showNotification,
  } = useApp();

  const [productsSubmenuOpen, setProductsSubmenuOpen] = useState(true);

  // Auto-expand products submenu if activeTab is products, stocks, or stock-movements
  useEffect(() => {
    if (activeTab === 'products' || activeTab === 'stocks' || activeTab === 'stock-movements') {
      setProductsSubmenuOpen(true);
    }
  }, [activeTab]);

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
        culture === 'tr-TR'
          ? 'Yedek indirme başarısız oldu'
          : 'Failed to download database backup'
      );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 font-sans transition-colors">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-md shadow-lg border text-sm font-medium animate-in fade-in slide-in-from-top-2 bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              notification.type === 'error'
                ? 'bg-red-500'
                : notification.type === 'success'
                ? 'bg-emerald-500'
                : 'bg-blue-500'
            }`}
          />
          <span className="text-gray-800 dark:text-zinc-200">{notification.message}</span>
          <button
            type="button"
            onClick={clearNotification}
            className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <header className="h-14 border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarExpanded((prev) => !prev)}
            className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-300 transition-colors"
            title="Toggle Sidebar"
            aria-label="Toggle Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-lg text-gray-900 dark:text-zinc-100">
            Lightbase
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* SQLite DB Backup Download Button */}
          <button
            type="button"
            onClick={handleBackupDownload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 shadow-2xs transition-colors"
            title={t.actions.downloadBackup}
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.actions.backupDb}</span>
            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-emerald-200/60 dark:bg-emerald-900/80">.db</span>
          </button>

          <CulturePicker />
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-700/60 shadow-2xs transition-colors"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle Appearance"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-gray-600" />
            )}
          </button>
        </div>
      </header>

      {/* Main Body Area: Sidebar + Content */}
      <div className="flex flex-1 relative overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarExpanded ? 'w-64' : 'w-0 -translate-x-full md:w-16 md:translate-x-0'
          } border-r border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition-all duration-200 ease-in-out flex flex-col shrink-0 z-20 overflow-hidden`}
        >
          {/* Brand Subtitle Header */}
          {sidebarExpanded && (
            <div className="p-3 border-b border-gray-200 dark:border-zinc-800 text-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                Ticari Yönetim
              </span>
            </div>
          )}

          {/* Nav Items */}
          <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
            {/* Home */}
            <button
              type="button"
              onClick={() => setActiveTab('home')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'home'
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 font-semibold'
                  : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800/60'
              }`}
              title={t.nav.home}
            >
              <Home className="w-4 h-4 shrink-0" />
              {sidebarExpanded && <span className="truncate">{t.nav.home}</span>}
            </button>

            {/* Products with Sub-tab: Ürünler / Stok / Stok Hareketleri */}
            {sidebarExpanded ? (
              <div className="space-y-0.5">
                <div
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'products' || activeTab === 'stocks' || activeTab === 'stock-movements'
                      ? 'bg-blue-50/70 text-blue-800 dark:bg-blue-950/30 dark:text-blue-300 font-semibold'
                      : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('products');
                      setProductsSubmenuOpen(true);
                    }}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <Package className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400" />
                    <span className="truncate">{t.nav.products}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setProductsSubmenuOpen((prev) => !prev);
                    }}
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-400 dark:text-zinc-400"
                    title={productsSubmenuOpen ? 'Collapse' : 'Expand'}
                  >
                    {productsSubmenuOpen ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {productsSubmenuOpen && (
                  <div className="pl-6 space-y-0.5 pt-0.5 border-l-2 border-blue-200 dark:border-blue-900/50 ml-4">
                    {/* Sub-item: Ürün Listesi */}
                    <button
                      type="button"
                      onClick={() => setActiveTab('products')}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        activeTab === 'products'
                          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold'
                          : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      <Package className="w-3.5 h-3.5 shrink-0 opacity-70" />
                      <span className="truncate">
                        {culture === 'tr-TR' ? 'Ürün Listesi' : 'Product List'}
                      </span>
                    </button>

                    {/* Sub-item: Stok */}
                    <button
                      type="button"
                      onClick={() => setActiveTab('stocks')}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        activeTab === 'stocks'
                          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold'
                          : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span className="truncate">{t.nav.stocks}</span>
                    </button>

                    {/* Sub-item: Stok Hareketleri */}
                    <button
                      type="button"
                      onClick={() => setActiveTab('stock-movements')}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        activeTab === 'stock-movements'
                          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold'
                          : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800/60'
                      }`}
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5 shrink-0 text-indigo-600 dark:text-indigo-400" />
                      <span className="truncate">{t.nav.stockMovements}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab('products')}
                  className={`w-full flex items-center justify-center p-2.5 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'products'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                      : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800/60'
                  }`}
                  title={t.nav.products}
                >
                  <Package className="w-4 h-4 shrink-0" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('stocks')}
                  className={`w-full flex items-center justify-center p-2.5 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'stocks'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                      : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800/60'
                  }`}
                  title={t.nav.stocks}
                >
                  <Layers className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('stock-movements')}
                  className={`w-full flex items-center justify-center p-2.5 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'stock-movements'
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                      : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800/60'
                  }`}
                  title={t.nav.stockMovements}
                >
                  <ArrowRightLeft className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                </button>
              </>
            )}

            {/* Other Nav Items */}
            {[
              { id: 'invoices', label: t.nav.invoices, icon: FileText },
              { id: 'current-accounts', label: t.nav.currentAccounts, icon: Users },
              { id: 'catransactions', label: t.nav.catransactions, icon: ArrowRightLeft },
              { id: 'cash-registers', label: t.nav.cashRegisters, icon: Wallet },
              { id: 'cheques', label: t.nav.cheques, icon: CreditCard },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 font-semibold'
                      : 'text-gray-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800/60'
                  }`}
                  title={item.label}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {sidebarExpanded && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          {sidebarExpanded && (
            <div className="p-4 border-t border-gray-200 dark:border-zinc-800 text-center text-xs text-gray-500 dark:text-zinc-500 space-y-0.5">
              <p>{t.version}</p>
              <p>{t.copyright}</p>
            </div>
          )}
        </aside>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-[1440px] mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};
