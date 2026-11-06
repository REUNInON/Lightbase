import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/apiService';
import { ChequeNote, CurrentAccount, ChequeDocumentType, ChequePortfolioType } from '../types';
import { DataTable, ColumnDef } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { SearchableSelect, SearchableOption } from '../components/SearchableSelect';
import {
  timestampToDateInput,
  dateInputToTimestamp,
  formatDate,
} from '../utils/dateUtils';
import { CreditCard, Info } from 'lucide-react';

export const ChequesPage: React.FC = () => {
  const { t, culture, refreshTrigger, triggerRefresh, showNotification } = useApp();

  const [cheques, setCheques] = useState<ChequeNote[]>([]);
  const [currentAccounts, setCurrentAccounts] = useState<CurrentAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ChequeNote | null>(null);
  const [deletingItem, setDeletingItem] = useState<ChequeNote | null>(null);

  // Form State
  const [formDocType, setFormDocType] = useState<ChequeDocumentType>('CEK');
  const [formPortfolioType, setFormPortfolioType] = useState<ChequePortfolioType>('ALINAN');
  const [formDocNumber, setFormDocNumber] = useState<string>('');
  const [formDueDate, setFormDueDate] = useState<string>('');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formCurrentAccountId, setFormCurrentAccountId] = useState<string>('');
  const [formStatus, setFormStatus] = useState<string>('PORTFOYDE');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);

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
        const [chqList, accList] = await Promise.all([
          apiService.getCheques(),
          apiService.getCurrentAccounts(),
        ]);
        if (isMounted) {
          setCheques(chqList);
          setCurrentAccounts(accList);
        }
      } catch (err) {
        console.error('Error fetching cheques & notes:', err);
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
    setFormDocType('CEK');
    setFormPortfolioType('ALINAN');
    setFormDocNumber(`CK-${Math.floor(10000 + Math.random() * 90000)}`);
    // Default due date: +30 days from now
    setFormDueDate(timestampToDateInput(Date.now() + 30 * 24 * 60 * 60 * 1000));
    setFormAmount('');
    setFormCurrentAccountId('');
    setFormStatus('PORTFOYDE');
    setFormDescription('');
    setFormError(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const handleOpenEdit = (item: ChequeNote) => {
    resetForm();
    setFormDocType(item.documentType || 'CEK');
    setFormPortfolioType(item.portfolioType || 'ALINAN');
    setFormDocNumber(item.documentNumber || '');
    setFormDueDate(timestampToDateInput(item.dueDate || Date.now()));
    setFormAmount(item.amount !== null && item.amount !== undefined ? String(item.amount) : '');
    setFormCurrentAccountId(item.currentAccountId ? String(item.currentAccountId) : '');
    setFormStatus(item.status || 'PORTFOYDE');
    setFormDescription(item.description || '');
    setEditingItem(item);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiService.createCheque({
        documentType: formDocType,
        portfolioType: formPortfolioType,
        documentNumber: formDocNumber.trim() || null,
        dueDate: dateInputToTimestamp(formDueDate) ?? Date.now(),
        amount: formAmount ? Number(formAmount) : null,
        currentAccountId: formCurrentAccountId ? Number(formCurrentAccountId) : null,
        status: formStatus,
        description: formDescription.trim() || null,
        updatedOn: Date.now(),
      });
      setIsAddOpen(false);
      resetForm();
      triggerRefresh();
      showNotification('success', culture === 'tr-TR' ? 'Evrak başarıyla kaydedildi' : 'Document saved successfully');
    } catch {
      setFormError(t.common.cannotSave);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      await apiService.updateCheque(editingItem.id, {
        documentType: formDocType,
        portfolioType: formPortfolioType,
        documentNumber: formDocNumber.trim() || null,
        dueDate: dateInputToTimestamp(formDueDate) ?? Date.now(),
        amount: formAmount ? Number(formAmount) : null,
        currentAccountId: formCurrentAccountId ? Number(formCurrentAccountId) : null,
        status: formStatus,
        description: formDescription.trim() || null,
        updatedOn: Date.now(),
      });
      setEditingItem(null);
      resetForm();
      triggerRefresh();
      showNotification('success', culture === 'tr-TR' ? 'Evrak başarıyla güncellendi' : 'Document updated successfully');
    } catch {
      setFormError(t.common.cannotSave);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    try {
      await apiService.deleteCheque(deletingItem.id);
      setDeletingItem(null);
      triggerRefresh();
      showNotification('success', culture === 'tr-TR' ? 'Evrak silindi' : 'Document deleted');
    } catch {
      showNotification('error', t.common.unableToDelete);
    }
  };

  const handleExportExcel = () => {
    const exportData = cheques.map((chq) => ({
      Id: chq.id,
      [t.common.type]: t.chequeTypes[chq.documentType] || chq.documentType,
      [t.chequeTypes.ALINAN]: t.chequeTypes[chq.portfolioType] || chq.portfolioType,
      [t.common.documentNumber]: chq.documentNumber ?? '',
      [t.common.dueDate]: formatDate(chq.dueDate, culture),
      [t.common.amount]: chq.amount ?? '',
      [t.common.currentAccount]: chq.currentAccount?.description ?? '',
      [t.common.status]: (t.chequeTypes as any)[chq.status || ''] || chq.status || '',
      [t.common.description]: chq.description ?? '',
    }));
    apiService.exportToExcel(exportData, 'ChequesAndNotes');
  };

  const handleExportCSV = () => {
    const exportData = cheques.map((chq) => ({
      Id: chq.id,
      [t.common.type]: t.chequeTypes[chq.documentType] || chq.documentType,
      [t.chequeTypes.ALINAN]: t.chequeTypes[chq.portfolioType] || chq.portfolioType,
      [t.common.documentNumber]: chq.documentNumber ?? '',
      [t.common.dueDate]: formatDate(chq.dueDate, culture),
      [t.common.amount]: chq.amount ?? '',
      [t.common.currentAccount]: chq.currentAccount?.description ?? '',
      [t.common.status]: (t.chequeTypes as any)[chq.status || ''] || chq.status || '',
      [t.common.description]: chq.description ?? '',
    }));
    apiService.exportToCSV(exportData, 'ChequesAndNotes');
  };

  const columns: ColumnDef<ChequeNote>[] = [
    {
      key: 'documentType',
      title: t.common.type,
      render: (c) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
            c.documentType === 'CEK'
              ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
          }`}
        >
          {t.chequeTypes[c.documentType] || c.documentType}
        </span>
      ),
    },
    {
      key: 'portfolioType',
      title: culture === 'tr-TR' ? 'Yön' : 'Direction',
      render: (c) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            c.portfolioType === 'ALINAN'
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
          }`}
        >
          {t.chequeTypes[c.portfolioType] || c.portfolioType}
        </span>
      ),
    },
    {
      key: 'documentNumber',
      title: t.common.documentNumber,
      render: (c) => <span className="font-mono font-medium">{c.documentNumber || '-'}</span>,
    },
    {
      key: 'dueDate',
      title: t.common.dueDate,
      render: (c) => (
        <span className="font-mono tabular-nums text-xs text-gray-700 dark:text-zinc-300">
          {formatDate(c.dueDate, culture)}
        </span>
      ),
    },
    {
      key: 'amount',
      title: t.common.amount,
      render: (c) => (
        <span className="font-mono font-medium tabular-nums">
          {c.amount !== null && c.amount !== undefined ? `$${c.amount.toLocaleString(culture, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
        </span>
      ),
    },
    {
      key: 'currentAccount.description',
      title: t.common.currentAccount,
      render: (c) => c.currentAccount?.description || '-',
    },
    {
      key: 'status',
      title: t.common.status,
      render: (c) => {
        const label = (t.chequeTypes as any)[c.status || ''] || c.status || '-';
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-zinc-300">
            {label}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      {/* Draft notice banner */}
      <div className="flex items-center gap-2.5 p-3.5 rounded-lg border border-purple-200 dark:border-purple-900/60 bg-purple-50/60 dark:bg-purple-950/30 text-xs text-purple-900 dark:text-purple-300">
        <Info className="w-4 h-4 shrink-0 text-purple-600 dark:text-purple-400" />
        <div>
          <span className="font-semibold">{culture === 'tr-TR' ? 'Taslak Çek & Senet Modülü:' : 'Draft Cheques & Notes Module:'}</span>{' '}
          {culture === 'tr-TR'
            ? 'Alınan ve verilen müşteri çekleri/senetleri bu ekrandan takip edilebilir. Banka tahsilat bordroları ve ciro fonksiyonları onayınızla geliştirilecektir.'
            : 'Track received/issued customer cheques and promissory notes here. Collection slips and endorsements will be added in upcoming phases.'}
        </div>
      </div>

      <DataTable<ChequeNote>
        title={t.nav.cheques}
        data={cheques}
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
        title={culture === 'tr-TR' ? 'Yeni Çek / Senet Girişi (Taslak)' : 'Add Cheque / Note (Draft)'}
      >
        <form onSubmit={handleSaveAdd} className="space-y-4">
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
                value={formDocType}
                onChange={(e) => setFormDocType(e.target.value as ChequeDocumentType)}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value="CEK">{t.chequeTypes.CEK}</option>
                <option value="SENET">{t.chequeTypes.SENET}</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                {culture === 'tr-TR' ? 'Yön / Portföy' : 'Direction'} *
              </label>
              <select
                value={formPortfolioType}
                onChange={(e) => setFormPortfolioType(e.target.value as ChequePortfolioType)}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value="ALINAN">{t.chequeTypes.ALINAN}</option>
                <option value="VERILEN">{t.chequeTypes.VERILEN}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                {t.common.documentNumber}
              </label>
              <input
                type="text"
                value={formDocNumber}
                onChange={(e) => setFormDocNumber(e.target.value)}
                placeholder="e.g. CK-12345"
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                {t.common.dueDate}
              </label>
              <input
                type="date"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                {t.common.status}
              </label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="PORTFOYDE">{t.chequeTypes.PORTFOYDE}</option>
                <option value="TAHSIL_EDILDI">{t.chequeTypes.TAHSIL_EDILDI}</option>
                <option value="ODENDI">{t.chequeTypes.ODENDI}</option>
              </select>
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
              {t.common.description}
            </label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="e.g. Banka adı, şube, keşideci"
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
        title={culture === 'tr-TR' ? 'Çek / Senet Düzenle' : 'Edit Cheque / Note'}
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
                value={formDocType}
                onChange={(e) => setFormDocType(e.target.value as ChequeDocumentType)}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value="CEK">{t.chequeTypes.CEK}</option>
                <option value="SENET">{t.chequeTypes.SENET}</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                {culture === 'tr-TR' ? 'Yön / Portföy' : 'Direction'} *
              </label>
              <select
                value={formPortfolioType}
                onChange={(e) => setFormPortfolioType(e.target.value as ChequePortfolioType)}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
              >
                <option value="ALINAN">{t.chequeTypes.ALINAN}</option>
                <option value="VERILEN">{t.chequeTypes.VERILEN}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                {t.common.documentNumber}
              </label>
              <input
                type="text"
                value={formDocNumber}
                onChange={(e) => setFormDocNumber(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                {t.common.dueDate}
              </label>
              <input
                type="date"
                value={formDueDate}
                onChange={(e) => setFormDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                {t.common.status}
              </label>
              <select
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="PORTFOYDE">{t.chequeTypes.PORTFOYDE}</option>
                <option value="TAHSIL_EDILDI">{t.chequeTypes.TAHSIL_EDILDI}</option>
                <option value="ODENDI">{t.chequeTypes.ODENDI}</option>
              </select>
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
              {t.common.description}
            </label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              ID: {deletingItem.id} - {t.chequeTypes[deletingItem.documentType]} ({deletingItem.documentNumber || '-'})
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
