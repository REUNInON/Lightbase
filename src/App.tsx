import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { ProductsPage } from './pages/ProductsPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { CurrentAccountsPage } from './pages/CurrentAccountsPage';
import { CatransactionsPage } from './pages/CatransactionsPage';
import { CashRegistersPage } from './pages/CashRegistersPage';
import { ChequesPage } from './pages/ChequesPage';
import { StocksPage } from './pages/StocksPage';
import { StockMovementsPage } from './pages/StockMovementsPage';

const AppContent: React.FC = () => {
  const { activeTab } = useApp();

  return (
    <Layout>
      {activeTab === 'home' && <HomePage />}
      {activeTab === 'products' && <ProductsPage />}
      {activeTab === 'stocks' && <StocksPage />}
      {activeTab === 'stock-movements' && <StockMovementsPage />}
      {activeTab === 'invoices' && <InvoicesPage />}
      {activeTab === 'current-accounts' && <CurrentAccountsPage />}
      {activeTab === 'catransactions' && <CatransactionsPage />}
      {activeTab === 'cash-registers' && <CashRegistersPage />}
      {activeTab === 'cheques' && <ChequesPage />}
    </Layout>
  );
};

export const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
