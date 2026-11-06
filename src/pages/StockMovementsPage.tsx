import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/apiService';
import { StockMovement, StockMovementType, Product } from '../types';
import { DataTable, ColumnDef } from '../components/DataTable';
import { SearchableSelect, SearchableOption } from '../components/SearchableSelect';
import { ArrowLeftRight, X, Calendar, Layers, Check } from 'lucide-react';

export const StockMovementsPage: React.FC = () => {
  const { t, culture, refreshTrigger, triggerRefresh, showNotification } = useApp();

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form State
  const [selectedProductId, setSelectedProductId] = useState<number | ''>('');
  const [selectedType, setSelectedType] = useState<StockMovementType>('G');
  const [quantitySqft, setQuantitySqft] = useState<string>('');
  // Editable date defaults to today
  const [dateInput, setDateInput] = useState<string>(new Date().toISOString().slice(0, 10));

  const productOptions = useMemo<SearchableOption[]>(() => {
    return products.map((p) => ({
      value: p.id,
      label: p.description || p.code,
      code: p.code,
      subLabel: `Stok: ${(p.stock ?? 0).toLocaleString()} ft²${p.origin ? ` · ${p.origin}` : ''}`,
    }));
  }, [products]);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const [movData, prodData] = await Promise.all([
          apiService.getStockMovements(),
          apiService.getProducts(),
        ]);
        if (isMounted) {
          setMovements(movData);
          setProducts(prodData);
        }
      } catch (err) {
        console.error('Failed to load stock movements:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  const openAddModal = () => {
    setSelectedProductId(products.length > 0 ? products[0].id : '');
    setSelectedType('G');
    setQuantitySqft('');
    setDateInput(new Date().toISOString().slice(0, 10));
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      showNotification('error', culture === 'tr-TR' ? 'Lütfen bir ürün seçin' : 'Please select a product');
      return;
    }
    const qty = parseFloat(quantitySqft);
    if (isNaN(qty) || qty <= 0) {
      showNotification('error', culture === 'tr-TR' ? 'Lütfen geçerli bir miktar (ft²) girin' : 'Please enter a valid quantity (sqft)');
      return;
    }

    // Convert dateInput to timestamp
    let parsedDate = Date.now();
    if (dateInput) {
      const parts = dateInput.split('-');
      if (parts.length === 3) {
        parsedDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0).getTime();
      }
    }

    try {
      await apiService.createStockMovement({
        productId: Number(selectedProductId),
        type: selectedType,
        quantitySqft: qty,
        date: parsedDate,
      });

      showNotification('success', culture === 'tr-TR' ? 'Stok hareketi başarıyla eklendi' : 'Stock movement added successfully');
      closeModal();
      triggerRefresh();
    } catch (err: any) {
      showNotification('error', err.message || (culture === 'tr-TR' ? 'Hata oluştu' : 'An error occurred'));
    }
  };

  const handleDelete = async (movement: StockMovement) => {
    if (!window.confirm(t.common.confirmDelete)) return;
    try {
      await apiService.deleteStockMovement(movement.id);
      showNotification('success', culture === 'tr-TR' ? 'Stok hareketi silindi' : 'Stock movement deleted');
      triggerRefresh();
    } catch (err: any) {
      showNotification('error', err.message || (culture === 'tr-TR' ? 'Silme başarısız' : 'Failed to delete'));
    }
  };

  const handleExportExcel = () => {
    const exportData = movements.map((m) => ({
      [t.common.product]: `${m.productCode || m.product?.code || ''} - ${m.productDescription || m.product?.description || ''}`,
      [t.common.type]: t.stockMovementTypes[m.type] || m.type,
      [t.common.quantitySqft]: `${m.quantitySqft} ft²`,
      [t.common.date]: m.date ? new Date(m.date).toLocaleDateString(culture) : '',
    }));
    apiService.exportToExcel(exportData, 'StockMovements');
  };

  const handleExportCSV = () => {
    const exportData = movements.map((m) => ({
      [t.common.product]: `${m.productCode || m.product?.code || ''} - ${m.productDescription || m.product?.description || ''}`,
      [t.common.type]: t.stockMovementTypes[m.type] || m.type,
      [t.common.quantitySqft]: `${m.quantitySqft} ft²`,
      [t.common.date]: m.date ? new Date(m.date).toLocaleDateString(culture) : '',
    }));
    apiService.exportToCSV(exportData, 'StockMovements');
  };

  // 1. Stok hareketlerinde ilk olarak ürünün kodunu göster: [Ürün Kodu][Ürün][Tür][Miktar][Tarih]
  const columns: ColumnDef<StockMovement>[] = [
    {
      key: 'productCode',
      title: culture === 'tr-TR' ? 'Ürün Kodu' : 'Product Code',
      render: (m) => (
        <span className="font-mono font-bold text-blue-700 dark:text-blue-300">
          {m.productCode || m.product?.code || '-'}
        </span>
      ),
    },
    {
      key: 'productDescription',
      title: t.common.product,
      render: (m) => (
        <span className="text-gray-900 dark:text-zinc-100 font-medium">
          {m.productDescription || m.product?.description || `Ürün #${m.productId}`}
        </span>
      ),
    },
    {
      key: 'type',
      title: t.common.type,
      render: (m) => {
        let badgeColor = 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
        if (m.type === 'G') {
          badgeColor = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
        } else if (m.type === 'F') {
          badgeColor = 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800';
        }

        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeColor}`}>
            {t.stockMovementTypes[m.type] || m.type}
          </span>
        );
      },
    },
    {
      key: 'quantitySqft',
      title: t.common.quantitySqft,
      render: (m) => {
        const isDeduct = m.type === 'F';
        return (
          <span
            className={`font-mono font-bold tabular-nums ${
              isDeduct ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'
            }`}
          >
            {isDeduct ? '-' : '+'}
            {m.quantitySqft.toLocaleString(culture, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 2,
            })}{' '}
            ft²
          </span>
        );
      },
    },
    {
      key: 'date',
      title: t.common.date,
      render: (m) => (
        <span className="text-gray-700 dark:text-zinc-300 text-xs">
          {m.date ? new Date(m.date).toLocaleDateString(culture) : '-'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Informative Header / Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <ArrowLeftRight className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">
              {t.nav.stockMovements}
            </h2>
            <p className="text-xs text-gray-500 dark:text-zinc-400">
              {culture === 'tr-TR'
                ? 'Devir fişleri, üretimden girişler ve fire çıkışları (ft² cinsinden)'
                : 'Turnover, production in and waste / scrap entries in sqft'}
            </p>
          </div>
        </div>
      </div>

      <DataTable<StockMovement>
        title={t.nav.stockMovements}
        data={movements}
        columns={columns}
        isLoading={loading}
        onAdd={openAddModal}
        onDelete={handleDelete}
        onExportExcel={handleExportExcel}
        onExportCSV={handleExportCSV}
        getRowId={(m) => m.id}
      />

      {/* Add Stock Movement Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-xl overflow-hidden animate-in zoom-in-95">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between bg-gray-50 dark:bg-zinc-800/50">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                  {culture === 'tr-TR' ? 'Yeni Stok Hareketi Ekle' : 'Add Stock Movement'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Tür Seçimi */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                  {t.common.type}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['D', 'G', 'F'] as StockMovementType[]).map((type) => {
                    const isSelected = selectedType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setSelectedType(type)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium border text-center transition-all flex flex-col items-center justify-center gap-0.5 ${
                          isSelected
                            ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-950/60 dark:border-blue-500 dark:text-blue-300 font-semibold shadow-2xs'
                            : 'border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700/50'
                        }`}
                      >
                        <span>{t.stockMovementTypes[type]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ürün Seçimi Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                  {t.common.product} <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={productOptions}
                  value={selectedProductId ? String(selectedProductId) : ''}
                  onChange={(val) => setSelectedProductId(val ? Number(val) : '')}
                  placeholder={culture === 'tr-TR' ? 'Ürün adı veya kodu ile arayın...' : 'Search product...'}
                />
              </div>

              {/* Miktar in ft^2 */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                  {t.common.quantitySqft} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={quantitySqft}
                    onChange={(e) => setQuantitySqft(e.target.value)}
                    required
                    placeholder="0.00"
                    className="w-full pl-3 pr-12 py-2 text-sm rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 font-mono font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-semibold text-gray-400">
                    ft²
                  </span>
                </div>
              </div>

              {/* Otomatik entry ekleme gününe ayarlanan ama editable Güncelleme Tarihi */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                  {t.common.movementDate}
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                    className="w-full pl-3 pr-3 py-2 text-xs rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
                  />
                </div>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-1">
                  {culture === 'tr-TR'
                    ? 'Bugünün tarihine otomatik ayarlanmıştır, gerekirse değiştirebilirsiniz.'
                    : 'Automatically set to today, can be edited if needed.'}
                </p>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-medium rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-700/60 transition-colors"
                >
                  {t.actions.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium rounded-lg bg-[#1b6ec2] text-white hover:bg-[#155a9e] shadow-2xs transition-colors cursor-pointer"
                >
                  {t.actions.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
