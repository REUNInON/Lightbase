import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/apiService';
import { CashRegister } from '../types';
import { DataTable, ColumnDef } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { formatDate } from '../utils/dateUtils';
import { Wallet, Info } from 'lucide-react';

export const CashRegistersPage: React.FC = () => {
  const { t, culture, refreshTrigger, triggerRefresh, showNotification } = useApp();

  const [cashRegisters, setCashRegisters] = useState<CashRegister[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CashRegister | null>(null);
  const [deletingItem, setDeletingItem] = useState<CashRegister | null>(null);

  // Form State
  const [formCode, setFormCode] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formBalance, setFormBalance] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const data = await apiService.getCashRegisters();
        if (isMounted) setCashRegisters(data);
      } catch (err) {
        console.error('Error fetching cash registers:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  const resetForm = () => {
    setFormCode(`KASA-0${cashRegisters.length + 1}`);
    setFormDescription('');
    setFormBalance('0');
    setFormError(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const handleOpenEdit = (item: CashRegister) => {
    resetForm();
    setFormCode(item.code || '');
    setFormDescription(item.description || '');
    setFormBalance(item.balance !== null && item.balance !== undefined ? String(item.balance) : '0');
    setEditingItem(item);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDescription.trim()) {
      setFormError(culture === 'tr-TR' ? 'Açıklama alanı zorunludur' : 'Description is required');
      return;
    }
    try {
      await apiService.createCashRegister({
        code: formCode.trim() || null,
        description: formDescription.trim(),
        balance: formBalance ? Number(formBalance) : 0,
        updatedOn: Date.now(),
      });
      setIsAddOpen(false);
      resetForm();
      triggerRefresh();
      showNotification('success', culture === 'tr-TR' ? 'Kasa başarıyla kaydedildi' : 'Cash register saved');
    } catch {
      setFormError(t.common.cannotSave);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!formDescription.trim()) {
      setFormError(culture === 'tr-TR' ? 'Açıklama alanı zorunludur' : 'Description is required');
      return;
    }
    try {
      await apiService.updateCashRegister(editingItem.id, {
        code: formCode.trim() || null,
        description: formDescription.trim(),
        balance: formBalance ? Number(formBalance) : 0,
        updatedOn: Date.now(),
      });
      setEditingItem(null);
      resetForm();
      triggerRefresh();
      showNotification('success', culture === 'tr-TR' ? 'Kasa başarıyla güncellendi' : 'Cash register updated');
    } catch {
      setFormError(t.common.cannotSave);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    try {
      await apiService.deleteCashRegister(deletingItem.id);
      setDeletingItem(null);
      triggerRefresh();
      showNotification('success', culture === 'tr-TR' ? 'Kasa silindi' : 'Cash register deleted');
    } catch {
      showNotification('error', t.common.unableToDelete);
    }
  };

  const handleExportExcel = () => {
    const exportData = cashRegisters.map((c) => ({
      Id: c.id,
      [t.common.code]: c.code ?? '',
      [t.common.description]: c.description,
      [t.common.balance]: c.balance ?? 0,
      [t.common.updatedOn]: formatDate(c.updatedOn, culture),
    }));
    apiService.exportToExcel(exportData, 'CashRegisters');
  };

  const handleExportCSV = () => {
    const exportData = cashRegisters.map((c) => ({
      Id: c.id,
      [t.common.code]: c.code ?? '',
      [t.common.description]: c.description,
      [t.common.balance]: c.balance ?? 0,
      [t.common.updatedOn]: formatDate(c.updatedOn, culture),
    }));
    apiService.exportToCSV(exportData, 'CashRegisters');
  };

  const columns: ColumnDef<CashRegister>[] = [
    {
      key: 'code',
      title: t.common.code,
      render: (c) => <span className="font-mono font-bold text-blue-700 dark:text-blue-300">{c.code || '-'}</span>,
    },
    {
      key: 'description',
      title: t.common.description,
      render: (c) => <span className="font-medium">{c.description}</span>,
    },
    {
      key: 'balance',
      title: t.common.balance,
      render: (c) => {
        const bal = c.balance ?? 0;
        const isPositive = bal >= 0;
        return (
          <span
            className={`font-mono font-semibold tabular-nums ${
              isPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {bal.toLocaleString(culture, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $
          </span>
        );
      },
    },
    {
      key: 'updatedOn',
      title: t.common.updatedOn,
      render: (c) => (
        <span className="font-mono tabular-nums text-xs text-gray-600 dark:text-zinc-400">
          {formatDate(c.updatedOn, culture)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Kasa Bilgi Banner */}
      <div className="flex items-center gap-2.5 p-3.5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/30 text-xs text-emerald-900 dark:text-emerald-300">
        <Info className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <div>
          <span className="font-semibold">{culture === 'tr-TR' ? 'Şirket Ana Kasası (Işıksan Deri):' : 'Main Cash Register (Işıksan Deri):'}</span>{' '}
          {culture === 'tr-TR'
            ? 'Cari hareketlerde girilen Nakit Tahsilat (NT) ve Alacak Dekontu (AD) kasayı artırır (+); Nakit Ödeme (NP) ve Borç Dekontu (BD) kasayı azaltır (-).'
            : 'Cash Collections (NT) and Credit Notes (AD) increase cash (+); Cash Payments (NP) and Debit Notes (BD) decrease cash (-).'}
        </div>
      </div>

      <DataTable<CashRegister>
        title={t.nav.cashRegisters}
        data={cashRegisters}
        columns={columns}
        isLoading={loading}
        onAdd={handleOpenAdd}
        onEdit={handleOpenEdit}
        onDelete={(item) => setDeletingItem(item)}
        onExportExcel={handleExportExcel}
        onExportCSV={handleExportCSV}
        getRowId={(item) => item.id}
      />

      {/* Add Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={culture === 'tr-TR' ? 'Yeni Kasa Ekle (Taslak)' : 'Add Cash Register (Draft)'}
      >
        <form onSubmit={handleSaveAdd} className="space-y-4">
          {formError && (
            <div className="p-3 text-sm rounded bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900">
              {formError}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
              {t.common.code}
            </label>
            <input
              type="text"
              value={formCode}
              onChange={(e) => setFormCode(e.target.value)}
              placeholder="e.g. KASA-01"
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
              {t.common.description} *
            </label>
            <input
              type="text"
              required
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="e.g. Işıksan Deri Kasası"
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
              {t.common.balance} ($)
            </label>
            <input
              type="number"
              step="any"
              value={formBalance}
              onChange={(e) => setFormBalance(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
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

      {/* Edit Modal */}
      <Modal
        isOpen={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        title={culture === 'tr-TR' ? 'Kasa Düzenle' : 'Edit Cash Register'}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          {formError && (
            <div className="p-3 text-sm rounded bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900">
              {formError}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
              {t.common.code}
            </label>
            <input
              type="text"
              value={formCode}
              onChange={(e) => setFormCode(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
              {t.common.description} *
            </label>
            <input
              type="text"
              required
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
              {t.common.balance} ($)
            </label>
            <input
              type="number"
              step="any"
              value={formBalance}
              onChange={(e) => setFormBalance(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setEditingItem(null)}
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
        isOpen={Boolean(deletingItem)}
        onClose={() => setDeletingItem(null)}
        title={t.common.confirmDelete}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-zinc-300">
            {t.common.confirmDelete}
          </p>
          {deletingItem && (
            <p className="text-xs font-mono bg-gray-100 dark:bg-zinc-800 p-2 rounded">
              {deletingItem.code ? `${deletingItem.code} - ` : ''}{deletingItem.description} (${(deletingItem.balance ?? 0).toLocaleString(culture, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $)
            </p>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDeletingItem(null)}
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
