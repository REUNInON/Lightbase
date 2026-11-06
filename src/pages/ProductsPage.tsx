import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/apiService';
import { Product } from '../types';
import { DataTable, ColumnDef } from '../components/DataTable';
import { Modal } from '../components/Modal';
import {
  timestampToDateInput,
  dateInputToTimestamp,
  formatDate,
} from '../utils/dateUtils';

export const ProductsPage: React.FC = () => {
  const { t, culture, refreshTrigger, triggerRefresh, showNotification } = useApp();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);

  // Form State
  const [formCode, setFormCode] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formOrigin, setFormOrigin] = useState('');
  const [formStock, setFormStock] = useState<string>('');
  const [formCategory, setFormCategory] = useState('');
  const [formAddedOnDate, setFormAddedOnDate] = useState<string>('');
  const [formUpdatedOnDate, setFormUpdatedOnDate] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadProducts() {
      try {
        setLoading(true);
        const data = await apiService.getProducts();
        if (isMounted) setProducts(data);
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadProducts();
    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  const resetForm = () => {
    setFormCode('');
    setFormDescription('');
    setFormOrigin('');
    setFormStock('');
    setFormCategory('');
    setFormAddedOnDate(timestampToDateInput(Date.now()));
    setFormUpdatedOnDate(timestampToDateInput(Date.now()));
    setFormError(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const handleOpenEdit = (prod: Product) => {
    resetForm();
    setFormCode(prod.code || '');
    setFormDescription(prod.description || '');
    setFormOrigin(prod.origin || '');
    setFormStock(prod.stock !== null && prod.stock !== undefined ? String(prod.stock) : '');
    setFormCategory(prod.category || '');
    setFormAddedOnDate(timestampToDateInput(prod.addedOn));
    setFormUpdatedOnDate(timestampToDateInput(prod.updatedOn || Date.now()));
    setEditingProduct(prod);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim()) {
      setFormError(t.common.codeRequired);
      return;
    }
    try {
      await apiService.createProduct({
        code: formCode.trim(),
        description: formDescription.trim() || null,
        origin: formOrigin.trim() || null,
        stock: formStock ? Number(formStock) : null,
        category: formCategory.trim() || null,
        addedOn: dateInputToTimestamp(formAddedOnDate) ?? Date.now(),
        updatedOn: dateInputToTimestamp(formUpdatedOnDate) ?? Date.now(),
      });
      setIsAddOpen(false);
      resetForm();
      triggerRefresh();
      showNotification('success', culture === 'tr-TR' ? 'Ürün başarıyla kaydedildi' : 'Product saved successfully');
    } catch {
      setFormError(t.common.cannotSave);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    if (!formCode.trim()) {
      setFormError(t.common.codeRequired);
      return;
    }
    try {
      await apiService.updateProduct(editingProduct.id, {
        code: formCode.trim(),
        description: formDescription.trim() || null,
        origin: formOrigin.trim() || null,
        stock: formStock ? Number(formStock) : null,
        category: formCategory.trim() || null,
        addedOn: dateInputToTimestamp(formAddedOnDate),
        updatedOn: dateInputToTimestamp(formUpdatedOnDate) ?? Date.now(),
      });
      setEditingProduct(null);
      resetForm();
      triggerRefresh();
      showNotification('success', culture === 'tr-TR' ? 'Ürün başarıyla güncellendi' : 'Product updated successfully');
    } catch {
      setFormError(t.common.cannotSave);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingProduct) return;
    try {
      await apiService.deleteProduct(deletingProduct.id);
      setDeletingProduct(null);
      triggerRefresh();
      showNotification('success', culture === 'tr-TR' ? 'Ürün silindi' : 'Product deleted');
    } catch {
      showNotification('error', t.common.unableToDelete);
    }
  };

  const handleExportExcel = () => {
    const exportData = products.map((p) => ({
      Id: p.id,
      [t.common.code]: p.code,
      [t.common.description]: p.description ?? '',
      [t.common.origin]: p.origin ?? '',
      [t.common.stock]: p.stock ?? '',
      [t.common.category]: p.category ?? '',
      [t.common.addedOn]: formatDate(p.addedOn, culture),
      [t.common.updatedOn]: formatDate(p.updatedOn, culture),
    }));
    apiService.exportToExcel(exportData, 'Products');
  };

  const handleExportCSV = () => {
    const exportData = products.map((p) => ({
      Id: p.id,
      [t.common.code]: p.code,
      [t.common.description]: p.description ?? '',
      [t.common.origin]: p.origin ?? '',
      [t.common.stock]: p.stock ?? '',
      [t.common.category]: p.category ?? '',
      [t.common.addedOn]: formatDate(p.addedOn, culture),
      [t.common.updatedOn]: formatDate(p.updatedOn, culture),
    }));
    apiService.exportToCSV(exportData, 'Products');
  };

  const columns: ColumnDef<Product>[] = [
    {
      key: 'code',
      title: t.common.code,
      render: (p) => (
        <span className="font-mono font-bold tracking-tight text-blue-700 dark:text-blue-300">
          {p.code}
        </span>
      ),
    },
    { key: 'description', title: t.common.description },
    { key: 'origin', title: t.common.origin },
    {
      key: 'stock',
      title: t.common.stockSqft,
      render: (p) => (
        <span className="font-mono tabular-nums font-semibold text-gray-900 dark:text-zinc-100">
          {p.stock !== null && p.stock !== undefined
            ? `${p.stock.toLocaleString(culture, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ft²`
            : '-'}
        </span>
      ),
    },
    { key: 'category', title: t.common.category },
    {
      key: 'addedOn',
      title: t.common.addedOn,
      render: (p) => (
        <span className="font-mono tabular-nums text-xs text-gray-600 dark:text-zinc-400">
          {formatDate(p.addedOn, culture)}
        </span>
      ),
    },
    {
      key: 'updatedOn',
      title: t.common.updatedOn,
      render: (p) => (
        <span className="font-mono tabular-nums text-xs text-gray-600 dark:text-zinc-400">
          {formatDate(p.updatedOn, culture)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <DataTable<Product>
        title={t.nav.products}
        data={products}
        columns={columns}
        isLoading={loading}
        onAdd={handleOpenAdd}
        onEdit={handleOpenEdit}
        onDelete={(p) => setDeletingProduct(p)}
        onExportExcel={handleExportExcel}
        onExportCSV={handleExportCSV}
        getRowId={(p) => p.id}
      />

      {/* Add Product Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={culture === 'tr-TR' ? 'Ürün Ekle' : 'Add Product'}
      >
        <form onSubmit={handleSaveAdd} className="space-y-4">
          {formError && (
            <div className="p-3 text-sm rounded bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900">
              {formError}
            </div>
          )}

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                {t.common.code} <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                {t.common.productCodeHint}
              </span>
            </div>
            <input
              type="text"
              required
              value={formCode}
              onChange={(e) => setFormCode(e.target.value)}
              placeholder="Z.2.26.486"
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
              {t.common.description}
            </label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
              {t.common.origin}
            </label>
            <input
              type="text"
              value={formOrigin}
              onChange={(e) => setFormOrigin(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                {t.common.initialStock}
              </label>
              <input
                type="number"
                step="any"
                value={formStock}
                onChange={(e) => setFormStock(e.target.value)}
                placeholder="0 (ft²)"
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                {t.common.category}
              </label>
              <input
                type="text"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Real Calendar Date Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                {t.common.addedOn}
              </label>
              <input
                type="date"
                value={formAddedOnDate}
                onChange={(e) => setFormAddedOnDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                {t.common.updatedOn}
              </label>
              <input
                type="date"
                value={formUpdatedOnDate}
                onChange={(e) => setFormUpdatedOnDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700/60"
            >
              {t.actions.cancel}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium rounded-md bg-[#1b6ec2] text-white hover:bg-[#155a9e]"
            >
              {t.actions.save}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal
        isOpen={Boolean(editingProduct)}
        onClose={() => setEditingProduct(null)}
        title={culture === 'tr-TR' ? 'Ürün Düzenle' : 'Edit Product'}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          {formError && (
            <div className="p-3 text-sm rounded bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900">
              {formError}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
              {t.common.code} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formCode}
              onChange={(e) => setFormCode(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
              {t.common.description}
            </label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
              {t.common.origin}
            </label>
            <input
              type="text"
              value={formOrigin}
              onChange={(e) => setFormOrigin(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                {t.common.stockSqft}
              </label>
              <input
                type="number"
                step="any"
                value={formStock}
                onChange={(e) => setFormStock(e.target.value)}
                placeholder="0 (ft²)"
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                {t.common.category}
              </label>
              <input
                type="text"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Real Calendar Date Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                {t.common.addedOn}
              </label>
              <input
                type="date"
                value={formAddedOnDate}
                onChange={(e) => setFormAddedOnDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                {t.common.updatedOn}
              </label>
              <input
                type="date"
                value={formUpdatedOnDate}
                onChange={(e) => setFormUpdatedOnDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setEditingProduct(null)}
              className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700/60"
            >
              {t.actions.cancel}
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium rounded-md bg-[#1b6ec2] text-white hover:bg-[#155a9e]"
            >
              {t.actions.save}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deletingProduct)}
        onClose={() => setDeletingProduct(null)}
        title={t.common.confirmDelete}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-zinc-300">
            {t.common.confirmDelete}
          </p>
          {deletingProduct && (
            <p className="text-xs font-mono bg-gray-100 dark:bg-zinc-800 p-2 rounded">
              {deletingProduct.code} - {deletingProduct.description || '-'}
            </p>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDeletingProduct(null)}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700/60"
            >
              {t.actions.cancel}
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700"
            >
              {t.actions.delete}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
