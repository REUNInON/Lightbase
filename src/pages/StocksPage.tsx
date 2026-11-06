import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/apiService';
import { Stock } from '../types';
import { DataTable, ColumnDef } from '../components/DataTable';
import { Layers, Info } from 'lucide-react';

export const StocksPage: React.FC = () => {
  const { t, culture, refreshTrigger } = useApp();

  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadStocks() {
      try {
        setLoading(true);
        const data = await apiService.getStocks();
        if (isMounted) setStocks(data);
      } catch (err) {
        console.error('Error fetching stocks:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadStocks();
    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  const handleExportExcel = () => {
    const exportData = stocks.map((s) => ({
      [t.common.code]: s.productCode ?? s.product?.code ?? '',
      [t.common.description]: s.productDescription ?? s.product?.description ?? '',
      [t.common.origin]: s.productOrigin ?? s.product?.origin ?? '',
      [t.common.stockSqft]: `${s.quantitySqft ?? 0} ft²`,
    }));
    apiService.exportToExcel(exportData, 'Stocks');
  };

  const handleExportCSV = () => {
    const exportData = stocks.map((s) => ({
      [t.common.code]: s.productCode ?? s.product?.code ?? '',
      [t.common.description]: s.productDescription ?? s.product?.description ?? '',
      [t.common.origin]: s.productOrigin ?? s.product?.origin ?? '',
      [t.common.stockSqft]: `${s.quantitySqft ?? 0} ft²`,
    }));
    apiService.exportToCSV(exportData, 'Stocks');
  };

  // Requested columns: Ürün.Kod, Ürün.Açıklama, Ürün.Menşei, ft^2 cinsinden Stok
  const columns: ColumnDef<Stock>[] = [
    {
      key: 'productCode',
      title: t.common.code,
      render: (s) => (
        <span className="font-mono font-bold text-gray-900 dark:text-zinc-100">
          {s.productCode ?? s.product?.code ?? '-'}
        </span>
      ),
    },
    {
      key: 'productDescription',
      title: t.common.description,
      render: (s) => (
        <span className="font-medium text-gray-800 dark:text-zinc-200">
          {s.productDescription ?? s.product?.description ?? '-'}
        </span>
      ),
    },
    {
      key: 'productOrigin',
      title: t.common.origin,
      render: (s) => (
        <span className="text-gray-600 dark:text-zinc-400">
          {s.productOrigin ?? s.product?.origin ?? '-'}
        </span>
      ),
    },
    {
      key: 'quantitySqft',
      title: t.common.stockSqft,
      render: (s) => (
        <span className="font-mono font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
          {s.quantitySqft !== null && s.quantitySqft !== undefined
            ? `${s.quantitySqft.toLocaleString(culture, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              })} ft²`
            : '0 ft²'}
        </span>
      ),
    },
  ];

  const totalSqft = stocks.reduce((sum, s) => sum + (s.quantitySqft ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Informative Header / Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">
              {culture === 'tr-TR' ? 'Stok Envanteri' : 'Stock Inventory'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              {culture === 'tr-TR'
                ? 'Ürün bazlı toplam mevcut deri stokları (ft² cinsinden)'
                : 'Current available leather stocks per product in sqft'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center px-3.5 py-1.5 rounded-lg bg-gray-50 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 text-xs">
          <span className="text-gray-500 dark:text-zinc-400">
            {culture === 'tr-TR' ? 'Genel Envanter:' : 'Total Inventory:'}
          </span>
          <span className="font-mono font-bold text-gray-900 dark:text-zinc-100">
            {totalSqft.toLocaleString(culture, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ft²
          </span>
        </div>
      </div>

      <DataTable<Stock>
        title={t.nav.stocks}
        data={stocks}
        columns={columns}
        isLoading={loading}
        onExportExcel={handleExportExcel}
        onExportCSV={handleExportCSV}
        getRowId={(s) => s.id}
      />
    </div>
  );
};
