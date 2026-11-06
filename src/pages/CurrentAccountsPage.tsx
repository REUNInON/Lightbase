import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/apiService';
import { CurrentAccount } from '../types';
import { DataTable, ColumnDef } from '../components/DataTable';
import { Modal } from '../components/Modal';
import {
  timestampToDateInput,
  dateInputToTimestamp,
  formatDate,
} from '../utils/dateUtils';
import { Lock, Sparkles, Building2 } from 'lucide-react';

export const CurrentAccountsPage: React.FC = () => {
  const { t, culture, refreshTrigger, triggerRefresh, showNotification } = useApp();

  const [accounts, setAccounts] = useState<CurrentAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<CurrentAccount | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<CurrentAccount | null>(null);

  // Form State
  const [formBranch, setFormBranch] = useState<'Z' | 'B'>('Z');
  const [formCode, setFormCode] = useState<string>('');
  const [formDescription, setFormDescription] = useState('');
  const [formBalance, setFormBalance] = useState<string>('');
  const [formUpdatedOnDate, setFormUpdatedOnDate] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isCodeLoading, setIsCodeLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadAccounts() {
      try {
        setLoading(true);
        const data = await apiService.getCurrentAccounts();
        if (isMounted) setAccounts(data);
      } catch (err) {
        console.error('Error fetching current accounts:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadAccounts();
    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  const fetchNextCode = useCallback(async (branch: 'Z' | 'B') => {
    try {
      setIsCodeLoading(true);
      const res = await apiService.getNextCurrentAccountCode(branch);
      if (res && res.nextCode) {
        setFormCode(res.nextCode);
      }
    } catch (err) {
      console.warn('Could not fetch next account code:', err);
      setFormCode(`${branch}.0001`);
    } finally {
      setIsCodeLoading(false);
    }
  }, []);

  const handleBranchToggle = (branch: 'Z' | 'B') => {
    setFormBranch(branch);
    fetchNextCode(branch);
  };

  const resetForm = async () => {
    setFormBranch('Z');
    setFormDescription('');
    setFormBalance('');
    setFormUpdatedOnDate(timestampToDateInput(Date.now()));
    setFormError(null);
    await fetchNextCode('Z');
  };

  const handleOpenAdd = async () => {
    setIsAddOpen(true);
    await resetForm();
  };

  const handleOpenEdit = (acc: CurrentAccount) => {
    const existingCode = acc.code || '';
    const initialBranch: 'Z' | 'B' = existingCode.startsWith('B.') ? 'B' : 'Z';
    setFormBranch(initialBranch);
    setFormCode(existingCode);
    setFormDescription(acc.description || '');
    setFormBalance(acc.balance !== null && acc.balance !== undefined ? String(acc.balance) : '');
    setFormUpdatedOnDate(timestampToDateInput(acc.updatedOn || Date.now()));
    setFormError(null);
    setEditingAccount(acc);
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDescription.trim()) {
      setFormError(culture === 'tr-TR' ? 'Cari hesap adı zorunludur' : 'Account name is required');
      return;
    }

    try {
      await apiService.createCurrentAccount({
        code: formCode || null,
        description: formDescription.trim(),
        balance: formBalance ? Number(formBalance) : null,
        updatedOn: dateInputToTimestamp(formUpdatedOnDate) ?? Date.now(),
      });
      setIsAddOpen(false);
      triggerRefresh();
      showNotification('success', culture === 'tr-TR' ? 'Cari hesap kaydedildi' : 'Current account saved successfully');
    } catch {
      setFormError(t.common.cannotSave);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    if (!formDescription.trim()) {
      setFormError(culture === 'tr-TR' ? 'Cari hesap adı zorunludur' : 'Account name is required');
      return;
    }

    try {
      await apiService.updateCurrentAccount(editingAccount.id, {
        code: formCode || null,
        description: formDescription.trim(),
        balance: formBalance ? Number(formBalance) : null,
        updatedOn: dateInputToTimestamp(formUpdatedOnDate) ?? Date.now(),
      });
      setEditingAccount(null);
      triggerRefresh();
      showNotification('success', culture === 'tr-TR' ? 'Cari hesap güncellendi' : 'Current account updated successfully');
    } catch {
      setFormError(t.common.cannotSave);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingAccount) return;
    try {
      await apiService.deleteCurrentAccount(deletingAccount.id);
      setDeletingAccount(null);
      triggerRefresh();
      showNotification('success', culture === 'tr-TR' ? 'Cari hesap silindi' : 'Current account deleted');
    } catch {
      showNotification('error', t.common.unableToDelete);
    }
  };

  const handleExportExcel = () => {
    const exportData = accounts.map((a) => ({
      [t.common.code]: a.code ?? '',
      [t.common.currentAccount]: a.description ?? '',
      [t.common.balance]: a.balance !== null && a.balance !== undefined ? `${a.balance} $` : '',
      [t.common.updatedOn]: formatDate(a.updatedOn, culture),
    }));
    apiService.exportToExcel(exportData, 'CurrentAccounts');
  };

  const handleExportCSV = () => {
    const exportData = accounts.map((a) => ({
      [t.common.code]: a.code ?? '',
      [t.common.currentAccount]: a.description ?? '',
      [t.common.balance]: a.balance !== null && a.balance !== undefined ? `${a.balance} $` : '',
      [t.common.updatedOn]: formatDate(a.updatedOn, culture),
    }));
    apiService.exportToCSV(exportData, 'CurrentAccounts');
  };

  // 4.1 & 4.3 & 4.4: ID is hidden from view; Kod is to the left of Cari Hesap; "Açıklama" replaced with "Cari Hesap"
  const columns: ColumnDef<CurrentAccount>[] = [
    {
      key: 'code',
      title: t.common.code,
      render: (a) => (
        <span className="font-mono font-bold tracking-tight text-gray-900 dark:text-zinc-100">
          {a.code || '-'}
        </span>
      ),
    },
    {
      key: 'description',
      title: t.common.currentAccount, // "Cari Hesap"
      render: (a) => (
        <span className="font-medium text-gray-900 dark:text-zinc-100">
          {a.description || '-'}
        </span>
      ),
    },
    {
      key: 'balance',
      title: t.common.balance,
      render: (a) => (
        <span className="font-mono tabular-nums font-semibold text-gray-900 dark:text-zinc-100">
          {a.balance !== null && a.balance !== undefined
            ? `${a.balance.toLocaleString(culture, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`
            : '-'}
        </span>
      ),
    },
    {
      key: 'updatedOn',
      title: t.common.updatedOn,
      render: (a) => (
        <span className="font-mono tabular-nums text-xs text-gray-600 dark:text-zinc-400">
          {formatDate(a.updatedOn, culture)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <DataTable<CurrentAccount>
        title={t.nav.currentAccounts}
        data={accounts}
        columns={columns}
        isLoading={loading}
        onAdd={handleOpenAdd}
        onEdit={handleOpenEdit}
        onDelete={(a) => setDeletingAccount(a)}
        onExportExcel={handleExportExcel}
        onExportCSV={handleExportCSV}
        getRowId={(a) => a.id}
      />

      {/* Add Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={culture === 'tr-TR' ? 'Yeni Cari Hesap Tanımla' : 'Add Current Account'}
      >
        <form onSubmit={handleSaveAdd} className="space-y-4">
          {formError && (
            <div className="p-3 text-sm rounded bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900">
              {formError}
            </div>
          )}

          {/* 4.2: [Z / B] Toggle & Read-only Cari Hesap Kodu */}
          <div className="space-y-2 p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>{t.common.branch} ({t.common.currentAccountCode})</span>
              </label>

              {/* Segmented [ Z / B ] Toggle */}
              <div className="inline-flex rounded-lg border border-gray-300 dark:border-zinc-700 p-0.5 bg-gray-100 dark:bg-zinc-800 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleBranchToggle('Z')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    formBranch === 'Z'
                      ? 'bg-[#1b6ec2] text-white shadow-xs'
                      : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200'
                  }`}
                  title={t.common.branchZ}
                >
                  Z
                </button>
                <button
                  type="button"
                  onClick={() => handleBranchToggle('B')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    formBranch === 'B'
                      ? 'bg-[#1b6ec2] text-white shadow-xs'
                      : 'text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200'
                  }`}
                  title={t.common.branchB}
                >
                  B
                </button>
              </div>
            </div>

            {/* Read-Only Cari Hesap Kodu */}
            <div className="relative">
              <input
                type="text"
                readOnly
                value={formCode}
                placeholder="Z.0001"
                className="w-full pl-3 pr-20 py-2 text-sm rounded-lg border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/80 text-blue-700 dark:text-blue-400 font-mono font-bold tracking-wider cursor-not-allowed select-all"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[11px] font-semibold text-gray-400">
                <Lock className="w-3 h-3" />
                <span>{culture === 'tr-TR' ? 'Otomatik' : 'Auto'}</span>
              </div>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-zinc-400">
              {formBranch === 'Z'
                ? 'Zeytinburnu şubesi için otomatik üretilen cari hesap kodu (Örn: Z.0001)'
                : 'Beyazıt şubesi için otomatik üretilen cari hesap kodu (Örn: B.0001)'}
            </p>
          </div>

          {/* 4.3: Cari Hesap (Açıklama yerine simply "Cari Hesap") */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
              {t.common.currentAccount} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder={culture === 'tr-TR' ? 'Örn: Seçim Çanta' : 'e.g. Acme Corp'}
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
            />
          </div>

          {/* Bakiye ($) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
              {t.common.balance} ($)
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                value={formBalance}
                onChange={(e) => setFormBalance(e.target.value)}
                placeholder="0.00"
                className="w-full pl-3 pr-10 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono shadow-2xs"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-gray-400">
                $
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
              {t.common.updatedOn}
            </label>
            <input
              type="date"
              value={formUpdatedOnDate}
              onChange={(e) => setFormUpdatedOnDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono shadow-2xs"
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
        isOpen={Boolean(editingAccount)}
        onClose={() => setEditingAccount(null)}
        title={culture === 'tr-TR' ? 'Cari Hesap Düzenle' : 'Edit Current Account'}
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          {formError && (
            <div className="p-3 text-sm rounded bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900">
              {formError}
            </div>
          )}

          {/* Read-only Cari Hesap Kodu */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300 flex items-center justify-between">
              <span>{t.common.currentAccountCode}</span>
              <span className="text-[11px] text-gray-400 flex items-center gap-1 font-normal">
                <Lock className="w-3 h-3" />
                {culture === 'tr-TR' ? 'Salt Okunur' : 'Read Only'}
              </span>
            </label>
            <input
              type="text"
              readOnly
              value={formCode}
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800/80 text-blue-700 dark:text-blue-400 font-mono font-bold cursor-not-allowed select-all"
            />
          </div>

          {/* Cari Hesap (Açıklama) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
              {t.common.currentAccount} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-2xs"
            />
          </div>

          {/* Bakiye ($) */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
              {t.common.balance} ($)
            </label>
            <div className="relative">
              <input
                type="number"
                step="any"
                value={formBalance}
                onChange={(e) => setFormBalance(e.target.value)}
                className="w-full pl-3 pr-10 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono shadow-2xs"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-gray-400">
                $
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
              {t.common.updatedOn}
            </label>
            <input
              type="date"
              value={formUpdatedOnDate}
              onChange={(e) => setFormUpdatedOnDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono shadow-2xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setEditingAccount(null)}
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
        isOpen={Boolean(deletingAccount)}
        onClose={() => setDeletingAccount(null)}
        title={t.actions.delete}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-zinc-300">
            {t.common.confirmDelete}
          </p>
          {deletingAccount && (
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 font-mono text-xs">
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {deletingAccount.code ? `${deletingAccount.code} - ` : ''}
              </span>
              <span>{deletingAccount.description}</span>
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setDeletingAccount(null)}
              className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700/60"
            >
              {t.actions.cancel}
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              className="px-4 py-2 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700"
            >
              {t.actions.delete}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
