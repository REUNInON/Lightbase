import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/apiService';
import { Catransaction, CurrentAccount, CATransactionType } from '../types';
import { DataTable, ColumnDef } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { SearchableSelect, SearchableOption } from '../components/SearchableSelect';
import {
  timestampToDateInput,
  dateInputToTimestamp,
  formatDate,
} from '../utils/dateUtils';
import { Sparkles, RefreshCw } from 'lucide-react';

export const CatransactionsPage: React.FC = () => {
  const { t, culture, refreshTrigger, triggerRefresh, showNotification } = useApp();

  const [catransactions, setCatransactions] = useState<Catransaction[]>([]);
  const [currentAccounts, setCurrentAccounts] = useState<CurrentAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Catransaction | null>(null);
  const [deletingTx, setDeletingTx] = useState<Catransaction | null>(null);

  // Form State
  const [formCode, setFormCode] = useState<string>('');
  const [formType, setFormType] = useState<CATransactionType>('NT');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formCurrentAccountId, setFormCurrentAccountId] = useState<string>('');
  const [formDate, setFormDate] = useState<string>('');
  const [formNote, setFormNote] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isAutoCodeLoading, setIsAutoCodeLoading] = useState(false);

  const accountOptions = useMemo<SearchableOption[]>(() => {
    return currentAccounts.map((a) => ({
      value: a.id,
      label: a.description || `Hesap #${a.id}`,
      code: a.code || undefined,
      subLabel: `Bakiye: $${(a.balance ?? 0).toLocaleString()}`,
    }));
  }, [currentAccounts]);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const [txs, accs] = await Promise.all([
          apiService.getCatransactions(),
          apiService.getCurrentAccounts(),
        ]);
        if (isMounted) {
          setCatransactions(txs);
          setCurrentAccounts(accs);
        }
      } catch (err) {
        console.error('Error fetching transactions:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  const get2DigitYearFromInput = (dateStr: string): string => {
    if (!dateStr) return String(new Date().getFullYear()).slice(-2);
    const parts = dateStr.split('-');
    if (parts.length >= 1 && parts[0].length >= 2) {
      return parts[0].slice(-2);
    }
    return String(new Date().getFullYear()).slice(-2);
  };

  const updateAutoCACode = useCallback(
    async (type: CATransactionType, dateStr: string) => {
      const year = get2DigitYearFromInput(dateStr);
      const prefix = type || 'NT';

      // Instant preview
      setFormCode((prev) => {
        const parts = prev.split('-');
        if (parts.length === 3 && !isNaN(Number(parts[2]))) {
          return `${prefix}-${year}-${parts[2]}`;
        }
        return `${prefix}-${year}-0001`;
      });

      // Verified counter from backend
      try {
        setIsAutoCodeLoading(true);
        const res = await apiService.getNextCATransactionCode(type, year);
        if (res && res.nextCode) {
          setFormCode(res.nextCode);
        }
      } catch (err) {
        console.warn('Could not verify next CA code with backend:', err);
      } finally {
        setIsAutoCodeLoading(false);
      }
    },
    []
  );

  const resetForm = async () => {
    const todayStr = timestampToDateInput(Date.now());
    setFormType('NT');
    setFormAmount('');
    setFormCurrentAccountId('');
    setFormDate(todayStr);
    setFormNote('');
    setFormError(null);
    await updateAutoCACode('NT', todayStr);
  };

  const handleOpenAdd = async () => {
    setIsAddOpen(true);
    await resetForm();
  };

  const handleOpenEdit = (tx: Catransaction) => {
    setFormCode(tx.code !== null && tx.code !== undefined ? String(tx.code) : '');
    const validTypes: CATransactionType[] = ['AD', 'BD', 'NT', 'NP'];
    const matchedType = validTypes.includes(tx.type as any) ? (tx.type as CATransactionType) : 'NT';
    setFormType(matchedType);
    setFormAmount(tx.amount !== null && tx.amount !== undefined ? String(tx.amount) : '');
    setFormCurrentAccountId(tx.currentAccountId ? String(tx.currentAccountId) : '');
    setFormDate(timestampToDateInput(tx.date || Date.now()));
    setFormNote(tx.note || '');
    setFormError(null);
    setEditingTx(tx);
  };

  const handleTypeChange = (newType: CATransactionType) => {
    setFormType(newType);
    if (!editingTx) {
      updateAutoCACode(newType, formDate);
    }
  };

  const handleDateChange = (newDate: string) => {
    setFormDate(newDate);
    if (!editingTx) {
      updateAutoCACode(formType, newDate);
    }
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.createCatransaction({
        code: formCode.trim() || null,
        type: formType,
        amount: formAmount ? Number(formAmount) : null,
        currentAccountId: formCurrentAccountId ? Number(formCurrentAccountId) : null,
        date: dateInputToTimestamp(formDate) ?? Date.now(),
        note: formNote.trim().slice(0, 250) || null,
      });
      setIsAddOpen(false);
      triggerRefresh();
      showNotification('success', culture === 'tr-TR' ? 'Cari hareket kaydedildi' : 'Transaction saved successfully');
    } catch {
      setFormError(t.common.cannotSave);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    try {
      await apiService.updateCatransaction(editingTx.id, {
        code: formCode.trim() || null,
        type: formType,
        amount: formAmount ? Number(formAmount) : null,
        currentAccountId: formCurrentAccountId ? Number(formCurrentAccountId) : null,
        date: dateInputToTimestamp(formDate) ?? Date.now(),
        note: formNote.trim().slice(0, 250) || null,
      });
      setEditingTx(null);
      triggerRefresh();
      showNotification('success', culture === 'tr-TR' ? 'Cari hareket güncellendi' : 'Transaction updated successfully');
    } catch {
      setFormError(t.common.cannotSave);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTx) return;
    try {
      await apiService.deleteCatransaction(deletingTx.id);
      setDeletingTx(null);
      triggerRefresh();
      showNotification('success', culture === 'tr-TR' ? 'Cari hareket silindi' : 'Transaction deleted');
    } catch {
      showNotification('error', t.common.unableToDelete);
    }
  };

  const getTypeLabel = (type: string | null) => {
    if (!type) return '-';
    return (t.caTypes as any)[type] || type;
  };

  const getTypeBadge = (type: string | null) => {
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

  const handleExportExcel = () => {
    const exportData = catransactions.map((tx) => ({
      Id: tx.id,
      [t.common.code]: tx.code ?? '',
      [t.common.type]: getTypeLabel(tx.type),
      [t.common.amount]: tx.amount ?? '',
      [t.common.currentAccount]: tx.currentAccount?.description ?? '',
      [t.common.date]: formatDate(tx.date, culture),
    }));
    apiService.exportToExcel(exportData, 'AccountTransactions');
  };

  const handleExportCSV = () => {
    const exportData = catransactions.map((tx) => ({
      Id: tx.id,
      [t.common.code]: tx.code ?? '',
      [t.common.type]: getTypeLabel(tx.type),
      [t.common.amount]: tx.amount ?? '',
      [t.common.currentAccount]: tx.currentAccount?.description ?? '',
      [t.common.date]: formatDate(tx.date, culture),
    }));
    apiService.exportToCSV(exportData, 'AccountTransactions');
  };

  const columns: ColumnDef<Catransaction>[] = [
    {
      key: 'code',
      title: t.common.code,
      render: (tx) => (
        <span className="font-mono font-bold tracking-tight text-blue-700 dark:text-blue-300">
          {tx.code || '-'}
        </span>
      ),
    },
    {
      key: 'type',
      title: t.common.type,
      render: (tx) => getTypeBadge(tx.type),
    },
    {
      key: 'currentAccount.description',
      title: t.common.currentAccount,
      render: (tx) => tx.currentAccount?.description || '-',
    },
    {
      key: 'date',
      title: t.common.date,
      render: (tx) => (
        <span className="font-mono tabular-nums text-xs text-gray-600 dark:text-zinc-400">
          {formatDate(tx.date, culture)}
        </span>
      ),
    },
    {
      key: 'amount',
      title: t.common.amount,
      render: (tx) => (
        <span className="font-mono font-semibold tabular-nums text-gray-900 dark:text-zinc-100">
          {tx.amount !== null && tx.amount !== undefined ? `${tx.amount.toLocaleString(culture, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $` : '-'}
        </span>
      ),
    },
    {
      key: 'note',
      title: t.common.notes,
      render: (tx) => (
        <span
          className="text-xs text-gray-600 dark:text-zinc-400 max-w-[200px] truncate block"
          title={tx.note || ''}
        >
          {tx.note || '-'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <DataTable<Catransaction>
        title={t.nav.catransactions}
        data={catransactions}
        columns={columns}
        isLoading={loading}
        onAdd={handleOpenAdd}
        onEdit={handleOpenEdit}
        onDelete={(tx) => setDeletingTx(tx)}
        onExportExcel={handleExportExcel}
        onExportCSV={handleExportCSV}
        getRowId={(tx) => tx.id}
      />

      {/* Add Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={culture === 'tr-TR' ? 'Yeni Cari Hareket Ekle' : 'Add Account Transaction'}
      >
        <form onSubmit={handleSaveAdd} className="space-y-4">
          {formError && (
            <div className="p-3 text-sm rounded bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900">
              {formError}
            </div>
          )}

          {/* Row 1: Transaction Type (4 limited options) & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                {t.common.type} *
              </label>
              <select
                value={formType}
                onChange={(e) => handleTypeChange(e.target.value as CATransactionType)}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
              >
                <option value="NT">{t.caTypes.NT}</option>
                <option value="NP">{t.caTypes.NP}</option>
                <option value="AD">{t.caTypes.AD}</option>
                <option value="BD">{t.caTypes.BD}</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                {t.common.date}
              </label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          {/* Row 2: Automatic Realtime Code - OPEN for editing */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300 flex items-center gap-1.5">
                <span>{t.common.code}</span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">
                  ({culture === 'tr-TR' ? 'Otomatik üretilir, düzenlenebilir' : 'Auto-generated, editable'})
                </span>
              </label>
              <button
                type="button"
                onClick={() => updateAutoCACode(formType, formDate)}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                title="Kodu Yenile"
              >
                <RefreshCw className={`w-3 h-3 ${isAutoCodeLoading ? 'animate-spin' : ''}`} />
                <span>{culture === 'tr-TR' ? 'Kodu Yenile' : 'Refresh Code'}</span>
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="Örn: NT-26-0001"
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono font-bold tracking-wider"
              />
              <div className="absolute right-3 top-2.5 text-xs text-gray-400 pointer-events-none">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
              {t.common.currentAccount}
            </label>
            <SearchableSelect
              options={accountOptions}
              value={formCurrentAccountId}
              onChange={(val) => setFormCurrentAccountId(val)}
              placeholder={culture === 'tr-TR' ? 'Cari hesap adı veya kodu ile arayın...' : 'Search current account...'}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
              {t.common.amount} ($)
            </label>
            <input
              type="number"
              step="any"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* Notlar (Notes) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                {t.common.notes}
              </label>
              <span className="text-[10px] text-gray-400">
                {formNote.length}/250
              </span>
            </div>
            <textarea
              rows={2}
              maxLength={250}
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              placeholder={t.common.notesPlaceholder}
              className="w-full px-3 py-2 text-xs rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none shadow-2xs"
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
        isOpen={Boolean(editingTx)}
        onClose={() => setEditingTx(null)}
        title={culture === 'tr-TR' ? 'Cari Hareket Düzenle' : 'Edit Account Transaction'}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          {formError && (
            <div className="p-3 text-sm rounded bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                {t.common.type} *
              </label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as CATransactionType)}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
              >
                <option value="NT">{t.caTypes.NT}</option>
                <option value="NP">{t.caTypes.NP}</option>
                <option value="AD">{t.caTypes.AD}</option>
                <option value="BD">{t.caTypes.BD}</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                {t.common.date}
              </label>
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
              {t.common.code}
            </label>
            <input
              type="text"
              value={formCode}
              onChange={(e) => setFormCode(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
              {t.common.currentAccount}
            </label>
            <SearchableSelect
              options={accountOptions}
              value={formCurrentAccountId}
              onChange={(val) => setFormCurrentAccountId(val)}
              placeholder={culture === 'tr-TR' ? 'Cari hesap adı veya kodu ile arayın...' : 'Search current account...'}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
              {t.common.amount} ($)
            </label>
            <input
              type="number"
              step="any"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>

          {/* Notlar (Notes) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                {t.common.notes}
              </label>
              <span className="text-[10px] text-gray-400">
                {formNote.length}/250
              </span>
            </div>
            <textarea
              rows={2}
              maxLength={250}
              value={formNote}
              onChange={(e) => setFormNote(e.target.value)}
              placeholder={t.common.notesPlaceholder}
              className="w-full px-3 py-2 text-xs rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none shadow-2xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setEditingTx(null)}
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
        isOpen={Boolean(deletingTx)}
        onClose={() => setDeletingTx(null)}
        title={t.common.confirmDelete}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-zinc-300">
            {t.common.confirmDelete}
          </p>
          {deletingTx && (
            <p className="text-xs font-mono bg-gray-100 dark:bg-zinc-800 p-2 rounded">
              {t.common.code}: <span className="font-bold text-blue-600 dark:text-blue-400">{deletingTx.code ?? '-'}</span> ({getTypeLabel(deletingTx.type)})
            </p>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDeletingTx(null)}
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
