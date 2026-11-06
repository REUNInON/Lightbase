import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { apiService } from '../services/apiService';
import { Invoice, CurrentAccount, Product, InvoiceType, Currency, InvoiceItem } from '../types';
import { DataTable, ColumnDef } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { SearchableSelect, SearchableOption } from '../components/SearchableSelect';
import { InvoicePrintModal } from '../components/InvoicePrintModal';
import {
  timestampToDateInput,
  dateInputToTimestamp,
  formatDate,
} from '../utils/dateUtils';
import { Sparkles, RefreshCw, Plus, Trash2, ChevronDown, ChevronRight, Package, Printer } from 'lucide-react';

const TYPE_PREFIX_MAP: Record<InvoiceType, string> = {
  SATIS: 'S',
  ALIS: 'A',
  SATIS_IADE: 'IS',
  ALIS_IADE: 'IA',
};

interface FormItemState {
  productId: string;
  quantitySqft: string;
  unitPrice: string;
}

export const InvoicesPage: React.FC = () => {
  const { t, culture, refreshTrigger, triggerRefresh, showNotification } = useApp();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [currentAccounts, setCurrentAccounts] = useState<CurrentAccount[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [cancellingInvoice, setCancellingInvoice] = useState<Invoice | null>(null);
  const [printingInvoice, setPrintingInvoice] = useState<Invoice | null>(null);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<number | null>(null);

  // Form State
  const [formCode, setFormCode] = useState<string>('');
  const [formType, setFormType] = useState<InvoiceType>('SATIS');
  const [formCurrency, setFormCurrency] = useState<Currency>('USD');
  const [formCurrentAccountId, setFormCurrentAccountId] = useState<string>('');
  const [formDate, setFormDate] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formItems, setFormItems] = useState<FormItemState[]>([
    { productId: '', quantitySqft: '', unitPrice: '' },
  ]);
  const [formError, setFormError] = useState<string | null>(null);
  const [isAutoCodeLoading, setIsAutoCodeLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const [invList, accList, prodList] = await Promise.all([
          apiService.getInvoices(),
          apiService.getCurrentAccounts(),
          apiService.getProducts(),
        ]);
        if (isMounted) {
          setInvoices(invList);
          setCurrentAccounts(accList);
          setProducts(prodList);
        }
      } catch (err) {
        console.error('Error fetching invoices/accounts/products:', err);
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

  const updateAutoInvoiceCode = useCallback(
    async (type: InvoiceType, dateStr: string) => {
      const year = get2DigitYearFromInput(dateStr);
      const prefix = TYPE_PREFIX_MAP[type] || 'S';

      setFormCode((prev) => {
        const parts = prev.split('-');
        if (parts.length === 3 && !isNaN(Number(parts[2]))) {
          return `${prefix}-${year}-${parts[2]}`;
        }
        return `${prefix}-${year}-0001`;
      });

      try {
        setIsAutoCodeLoading(true);
        const res = await apiService.getNextInvoiceCode(type, year);
        if (res && res.nextCode) {
          setFormCode(res.nextCode);
        }
      } catch (err) {
        console.warn('Could not verify next invoice code with backend:', err);
      } finally {
        setIsAutoCodeLoading(false);
      }
    },
    []
  );

  // Computed Grand Total from items: sum(quantity * unit_price)
  const computedGrandTotal = useMemo(() => {
    return formItems.reduce((sum, it) => {
      const q = parseFloat(it.quantitySqft) || 0;
      const p = parseFloat(it.unitPrice) || 0;
      return sum + q * p;
    }, 0);
  }, [formItems]);

  const accountOptions = useMemo<SearchableOption[]>(() => {
    return currentAccounts.map((a) => ({
      value: a.id,
      label: a.description || `Hesap #${a.id}`,
      code: a.code || undefined,
      subLabel: `Bakiye: $${(a.balance ?? 0).toLocaleString()}`,
    }));
  }, [currentAccounts]);

  const productOptions = useMemo<SearchableOption[]>(() => {
    return products.map((p) => ({
      value: p.id,
      label: p.description || p.code,
      code: p.code,
      subLabel: `Stok: ${(p.stock ?? 0).toLocaleString()} ft²${p.origin ? ` · ${p.origin}` : ''}`,
    }));
  }, [products]);

  const selectedAccount = useMemo(() => {
    if (!formCurrentAccountId) return null;
    return currentAccounts.find((a) => String(a.id) === formCurrentAccountId) ?? null;
  }, [currentAccounts, formCurrentAccountId]);

  const balanceImpact = useMemo(() => {
    if (!selectedAccount) return null;
    const cur = selectedAccount.balance ?? 0;
    const isAdding = formType === 'SATIS' || formType === 'ALIS_IADE';
    const delta = isAdding ? computedGrandTotal : -computedGrandTotal;
    return {
      current: cur,
      delta,
      next: cur + delta,
    };
  }, [selectedAccount, formType, computedGrandTotal]);

  const resetForm = async () => {
    const todayStr = timestampToDateInput(Date.now());
    setFormType('SATIS');
    setFormCurrency('USD');
    setFormCurrentAccountId('');
    setFormDate(todayStr);
    setFormDescription('');
    setFormItems([{ productId: '', quantitySqft: '', unitPrice: '' }]);
    setFormError(null);
    await updateAutoInvoiceCode('SATIS', todayStr);
  };

  const handleOpenAdd = async () => {
    setIsAddOpen(true);
    await resetForm();
  };

  const handleOpenEdit = (inv: Invoice) => {
    if (inv.status === 'CANCELLED') {
      showNotification(
        'info',
        culture === 'tr-TR' ? 'İptal edilmiş faturalar düzenlenemez' : 'Cancelled invoices cannot be edited'
      );
      return;
    }
    setFormCode(inv.code || '');
    setFormType(inv.type || 'SATIS');
    setFormCurrency('USD');
    setFormCurrentAccountId(inv.currentAccountId ? String(inv.currentAccountId) : '');
    setFormDate(timestampToDateInput(inv.date || Date.now()));
    setFormDescription(inv.description || '');
    setFormError(null);

    // Map existing items
    if (inv.items && inv.items.length > 0) {
      setFormItems(
        inv.items.map((it) => ({
          productId: it.productId ? String(it.productId) : '',
          quantitySqft: String(it.quantitySqft ?? ''),
          unitPrice: String(it.unitPrice ?? ''),
        }))
      );
    } else {
      setFormItems([{ productId: inv.productId ? String(inv.productId) : '', quantitySqft: '', unitPrice: '' }]);
    }

    setEditingInvoice(inv);
  };

  const handleTypeChange = (newType: InvoiceType) => {
    setFormType(newType);
    if (!editingInvoice) {
      updateAutoInvoiceCode(newType, formDate);
    }
  };

  const handleDateChange = (newDate: string) => {
    setFormDate(newDate);
    if (!editingInvoice) {
      updateAutoInvoiceCode(formType, newDate);
    }
  };

  // Line Item Handlers
  const handleAddItem = () => {
    setFormItems((prev) => [...prev, { productId: '', quantitySqft: '', unitPrice: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    if (formItems.length <= 1) {
      setFormItems([{ productId: '', quantitySqft: '', unitPrice: '' }]);
      return;
    }
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof FormItemState, value: string) => {
    setFormItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCode.trim()) {
      setFormError(t.common.codeRequired);
      return;
    }

    const payloadItems = formItems.map((it) => {
      const q = parseFloat(it.quantitySqft) || 0;
      const p = parseFloat(it.unitPrice) || 0;
      return {
        productId: it.productId ? Number(it.productId) : null,
        quantitySqft: q,
        unitPrice: p,
        totalPrice: q * p,
      };
    });

    try {
      await apiService.createInvoice({
        code: formCode.trim(),
        type: formType,
        currency: formCurrency,
        productId: payloadItems.length > 0 ? payloadItems[0].productId : null,
        currentAccountId: formCurrentAccountId ? Number(formCurrentAccountId) : null,
        date: dateInputToTimestamp(formDate) ?? Date.now(),
        amount: computedGrandTotal,
        description: formDescription.trim() || null,
        items: payloadItems,
      });
      setIsAddOpen(false);
      triggerRefresh();
      showNotification(
        'success',
        culture === 'tr-TR' ? 'Fatura başarıyla kaydedildi' : 'Invoice saved successfully'
      );
    } catch {
      setFormError(t.common.cannotSave);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;
    if (!formCode.trim()) {
      setFormError(t.common.codeRequired);
      return;
    }

    const payloadItems = formItems.map((it) => {
      const q = parseFloat(it.quantitySqft) || 0;
      const p = parseFloat(it.unitPrice) || 0;
      return {
        productId: it.productId ? Number(it.productId) : null,
        quantitySqft: q,
        unitPrice: p,
        totalPrice: q * p,
      };
    });

    try {
      await apiService.updateInvoice(editingInvoice.id, {
        code: formCode.trim(),
        type: formType,
        currency: formCurrency,
        productId: payloadItems.length > 0 ? payloadItems[0].productId : null,
        currentAccountId: formCurrentAccountId ? Number(formCurrentAccountId) : null,
        date: dateInputToTimestamp(formDate) ?? Date.now(),
        amount: computedGrandTotal,
        description: formDescription.trim() || null,
        items: payloadItems,
      });
      setEditingInvoice(null);
      triggerRefresh();
      showNotification(
        'success',
        culture === 'tr-TR' ? 'Fatura başarıyla güncellendi' : 'Invoice updated successfully'
      );
    } catch {
      setFormError(t.common.cannotSave);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancellingInvoice) return;
    try {
      await apiService.cancelInvoice(cancellingInvoice.id);
      setCancellingInvoice(null);
      triggerRefresh();
      showNotification(
        'success',
        culture === 'tr-TR'
          ? 'Fatura iptal edildi, cari bakiye ve stoklar otomatik düzeltildi'
          : 'Invoice cancelled, balance and stocks restored'
      );
    } catch (err: any) {
      showNotification('error', err.message || t.common.error);
    }
  };

  const getTypeBadge = (type: InvoiceType) => {
    const label = t.invoiceTypes[type] || type;
    switch (type) {
      case 'SATIS':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            {label}
          </span>
        );
      case 'ALIS':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
            {label}
          </span>
        );
      case 'SATIS_IADE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            {label}
          </span>
        );
      case 'ALIS_IADE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
            {label}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-200">
            {label}
          </span>
        );
    }
  };

  const getCurrencySymbol = (_curr?: Currency) => {
    return '$';
  };

  const handleExportExcel = () => {
    const exportData = invoices.map((inv) => {
      const itemsSummary = inv.items && inv.items.length > 0
        ? inv.items.map((it) => `${it.product?.code || 'Ürün'}: ${it.quantitySqft} ft² x ${it.unitPrice}`).join(' | ')
        : (inv.product?.code || '');

      return {
        Id: inv.id,
        [t.common.code]: inv.code,
        [t.common.type]: t.invoiceTypes[inv.type] || inv.type,
        [t.common.currency]: 'USD',
        [t.common.currentAccount]: inv.currentAccount?.description ?? '',
        [t.common.product]: itemsSummary,
        [t.common.amount]: `${inv.amount ?? 0} $`,
        [t.common.date]: formatDate(inv.date, culture),
        [t.common.description]: inv.description ?? '',
      };
    });
    apiService.exportToExcel(exportData, 'Invoices');
  };

  const handleExportCSV = () => {
    const exportData = invoices.map((inv) => {
      const itemsSummary = inv.items && inv.items.length > 0
        ? inv.items.map((it) => `${it.product?.code || 'Ürün'}: ${it.quantitySqft} ft²`).join('; ')
        : (inv.product?.code || '');

      return {
        Id: inv.id,
        [t.common.code]: inv.code,
        [t.common.type]: t.invoiceTypes[inv.type] || inv.type,
        [t.common.currency]: 'USD',
        [t.common.currentAccount]: inv.currentAccount?.description ?? '',
        [t.common.product]: itemsSummary,
        [t.common.amount]: `${inv.amount ?? 0} $`,
        [t.common.date]: formatDate(inv.date, culture),
        [t.common.description]: inv.description ?? '',
      };
    });
    apiService.exportToCSV(exportData, 'Invoices');
  };

  const columns: ColumnDef<Invoice>[] = [
    {
      key: 'code',
      title: t.common.code,
      render: (inv) => (
        <div className="flex items-center gap-1.5 font-mono">
          {inv.items && inv.items.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setExpandedInvoiceId(expandedInvoiceId === inv.id ? null : inv.id);
              }}
              className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200 transition-colors"
              title="Kalemleri Göster / Gizle"
            >
              {expandedInvoiceId === inv.id ? (
                <ChevronDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          <span className="font-mono font-bold tracking-tight text-gray-900 dark:text-zinc-100">
            {inv.code}
          </span>
        </div>
      ),
    },
    {
      key: 'type',
      title: t.common.type,
      render: (inv) => getTypeBadge(inv.type),
    },
    {
      key: 'currentAccount.description',
      title: t.common.currentAccount,
      render: (inv) => inv.currentAccount?.description || '-',
    },
    {
      key: 'items',
      title: t.common.product,
      render: (inv) => {
        if (inv.items && inv.items.length > 1) {
          return (
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-xs text-gray-900 dark:text-zinc-100">
                {inv.items.length} {culture === 'tr-TR' ? 'Ürün' : 'Products'}
              </span>
              <span className="text-[11px] text-gray-500 dark:text-zinc-400 truncate max-w-xs">
                {inv.items.map((it) => it.product?.code || 'Ürün').join(', ')}
              </span>
            </div>
          );
        }
        if (inv.items && inv.items.length === 1) {
          const code = inv.items[0].product?.code || inv.product?.code || '-';
          return (
            <span className="font-mono font-semibold text-gray-900 dark:text-zinc-100">
              {code}
            </span>
          );
        }
        return inv.product?.code ? (
          <span className="font-mono font-semibold text-gray-900 dark:text-zinc-100">{inv.product.code}</span>
        ) : (
          '-'
        );
      },
    },
    {
      key: 'date',
      title: t.common.date,
      render: (inv) => (
        <span className="font-mono tabular-nums text-xs text-gray-600 dark:text-zinc-400">
          {formatDate(inv.date, culture)}
        </span>
      ),
    },
    {
      key: 'amount',
      title: t.common.amount,
      render: (inv) => {
        const symbol = getCurrencySymbol(inv.currency);
        const isCancelled = inv.status === 'CANCELLED';
        return (
          <span className={`font-mono font-bold tabular-nums ${isCancelled ? 'line-through text-gray-400 dark:text-zinc-500' : 'text-gray-900 dark:text-zinc-100'}`}>
            {inv.amount !== null && inv.amount !== undefined
              ? `${inv.amount.toLocaleString(culture, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} ${symbol}`
              : '-'}
          </span>
        );
      },
    },
    {
      key: 'status',
      title: t.common.status,
      render: (inv) => {
        const isCancelled = inv.status === 'CANCELLED';
        return isCancelled ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            {t.common.cancelled}
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            {t.common.active}
          </span>
        );
      },
    },
    {
      key: 'print',
      title: culture === 'tr-TR' ? 'Yazdır' : 'Print',
      width: '80px',
      render: (inv) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setPrintingInvoice(inv);
          }}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-700 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-2xs"
          title={culture === 'tr-TR' ? 'Faturayı Yazdır' : 'Print Invoice'}
        >
          <Printer className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>{culture === 'tr-TR' ? 'Yazdır' : 'Print'}</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable<Invoice>
        title={t.nav.invoices}
        data={invoices}
        columns={columns}
        isLoading={loading}
        onAdd={handleOpenAdd}
        onEdit={handleOpenEdit}
        onDelete={(inv) => {
          if (inv.status === 'CANCELLED') {
            showNotification(
              'info',
              culture === 'tr-TR' ? 'Bu fatura zaten iptal edilmiştir' : 'This invoice is already cancelled'
            );
            return;
          }
          setCancellingInvoice(inv);
        }}
        onExportExcel={handleExportExcel}
        onExportCSV={handleExportCSV}
        getRowId={(inv) => inv.id}
      />

      {/* Expanded Line Items Viewer Modal or Drawer */}
      {expandedInvoiceId !== null && (
        <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 space-y-3">
          {(() => {
            const currentExpInv = invoices.find((i) => i.id === expandedInvoiceId);
            if (!currentExpInv) return null;
            const symbol = getCurrencySymbol(currentExpInv.currency);
            return (
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-semibold text-gray-900 dark:text-zinc-100 font-mono">
                      {currentExpInv.code} - {culture === 'tr-TR' ? 'Fatura Kalemleri' : 'Invoice Items'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExpandedInvoiceId(null)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {t.actions.close}
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-white/80 dark:bg-zinc-800/80 text-gray-500 uppercase">
                      <tr>
                        <th className="px-3 py-2">{t.common.code}</th>
                        <th className="px-3 py-2">{t.common.description}</th>
                        <th className="px-3 py-2">{t.common.quantitySqft}</th>
                        <th className="px-3 py-2">{t.common.unitPrice}</th>
                        <th className="px-3 py-2 text-right">{t.common.totalPrice}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                      {(currentExpInv.items || []).map((it, idx) => (
                        <tr key={idx} className="hover:bg-white/40 dark:hover:bg-zinc-800/40">
                          <td className="px-3 py-2 font-mono font-medium">{it.product?.code || '-'}</td>
                          <td className="px-3 py-2 text-gray-600 dark:text-zinc-300">{it.product?.description || '-'}</td>
                          <td className="px-3 py-2 font-mono tabular-nums">{it.quantitySqft} ft²</td>
                          <td className="px-3 py-2 font-mono tabular-nums">{it.unitPrice} {symbol}</td>
                          <td className="px-3 py-2 font-mono font-bold tabular-nums text-right">
                            {it.totalPrice.toLocaleString(culture, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {symbol}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Add Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={culture === 'tr-TR' ? 'Yeni Fatura Kes' : 'Create New Invoice'}
        maxWidth="lg"
      >
        <form onSubmit={handleSaveAdd} className="space-y-4">
          {formError && (
            <div className="p-3 text-sm rounded bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900">
              {formError}
            </div>
          )}

          {/* Row 1: Invoice Type & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                {t.common.type} *
              </label>
              <select
                value={formType}
                onChange={(e) => handleTypeChange(e.target.value as InvoiceType)}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
              >
                <option value="SATIS">{t.invoiceTypes.SATIS} (S)</option>
                <option value="ALIS">{t.invoiceTypes.ALIS} (A)</option>
                <option value="SATIS_IADE">{t.invoiceTypes.SATIS_IADE} (IS)</option>
                <option value="ALIS_IADE">{t.invoiceTypes.ALIS_IADE} (IA)</option>
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

          {/* Row 2: Automatic Realtime Invoice Code */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300 flex items-center gap-1.5">
                <span>{t.common.code} *</span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-normal">
                  ({culture === 'tr-TR' ? 'Tür ve yıla göre otomatik üretilir' : 'Auto-generated by type & year'})
                </span>
              </label>
              <button
                type="button"
                onClick={() => updateAutoInvoiceCode(formType, formDate)}
                className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                title="Yeniden Hesapla"
              >
                <RefreshCw className={`w-3 h-3 ${isAutoCodeLoading ? 'animate-spin' : ''}`} />
                <span>{culture === 'tr-TR' ? 'Kodu Yenile' : 'Refresh Code'}</span>
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                required
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
                placeholder="Örn: S-26-0001"
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono font-bold tracking-wider"
              />
              <div className="absolute right-3 top-2.5 text-xs text-gray-400 pointer-events-none">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </div>
            </div>
          </div>

          {/* Row 3: Current Account */}
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

          {/* Row 4: Multiple Invoice Line Items Section */}
          <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-900 dark:text-zinc-100 uppercase tracking-wide">
                {culture === 'tr-TR' ? 'Fatura Ürün Kalemleri' : 'Invoice Product Items'}
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{culture === 'tr-TR' ? 'Ürün Ekle' : 'Add Item'}</span>
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {formItems.map((item, idx) => {
                const lineTotal = (parseFloat(item.quantitySqft) || 0) * (parseFloat(item.unitPrice) || 0);
                const currSymbol = getCurrencySymbol(formCurrency);

                return (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50/60 dark:bg-zinc-800/40 space-y-2"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      {/* Product select */}
                      <div className="sm:col-span-5">
                        <label className="text-[11px] font-medium text-gray-600 dark:text-zinc-400 block mb-0.5">
                          {t.common.product}
                        </label>
                        <SearchableSelect
                          options={productOptions}
                          value={item.productId}
                          onChange={(val) => handleItemChange(idx, 'productId', val)}
                          placeholder={culture === 'tr-TR' ? 'Ürün kodu veya adı ile arayın...' : 'Search product...'}
                        />
                      </div>

                      {/* Quantity in ft^2 */}
                      <div className="sm:col-span-3">
                        <label className="text-[11px] font-medium text-gray-600 dark:text-zinc-400 block mb-0.5">
                          {t.common.quantitySqft}
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={item.quantitySqft}
                          onChange={(e) => handleItemChange(idx, 'quantitySqft', e.target.value)}
                          placeholder="0.00"
                          className="w-full px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 font-mono"
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-medium text-gray-600 dark:text-zinc-400 block mb-0.5">
                          {t.common.unitPrice} ({currSymbol})
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                          placeholder="0.00"
                          className="w-full px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 font-mono"
                        />
                      </div>

                      {/* Line Total & Remove */}
                      <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 pt-4 sm:pt-4">
                        <span className="font-mono text-xs font-bold tabular-nums text-gray-900 dark:text-zinc-100">
                          {lineTotal.toLocaleString(culture, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currSymbol}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                          title="Satırı Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Row 5: Total Amount (DISABLED/READONLY) */}
          <div className="p-3 rounded-lg border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/40 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                {t.common.grandTotal} (Miktar × Birim Fiyat)
              </span>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                {culture === 'tr-TR'
                  ? 'Girdi kapalıdır; ürün kalemlerinden otomatik hesaplanır.'
                  : 'Input is locked; auto-calculated from line items.'}
              </p>
            </div>
            <div className="text-right">
              <span className="font-mono text-xl sm:text-2xl font-extrabold text-emerald-900 dark:text-emerald-200 tabular-nums">
                {computedGrandTotal.toLocaleString(culture, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                {getCurrencySymbol(formCurrency)}
              </span>
            </div>
          </div>

          {/* Real-time Balance Preview */}
          {balanceImpact && selectedAccount && (
            <div className="p-3 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-blue-900 dark:text-blue-200">
                  {culture === 'tr-TR' ? 'Cari Bakiye Önizlemesi:' : 'Account Balance Preview:'}
                </span>
                <span className="text-gray-700 dark:text-zinc-300 font-medium">
                  {selectedAccount.description}
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono">
                <div>
                  <span className="text-gray-500 text-[10px] block">{culture === 'tr-TR' ? 'Mevcut' : 'Current'}</span>
                  <span className="font-bold text-gray-800 dark:text-zinc-200">
                    ${balanceImpact.current.toLocaleString(culture, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <span className="text-gray-400">→</span>
                <div>
                  <span className="text-gray-500 text-[10px] block">{culture === 'tr-TR' ? 'Fatura Sonrası' : 'After Invoice'}</span>
                  <span className={`font-bold ${balanceImpact.next >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    ${balanceImpact.next.toLocaleString(culture, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className={`px-2 py-0.5 rounded text-[11px] font-bold ${balanceImpact.delta >= 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                  {balanceImpact.delta >= 0 ? '+' : ''}${balanceImpact.delta.toLocaleString(culture, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          )}

          {/* Row 6: Description / Note */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
              {culture === 'tr-TR' ? 'Açıklama / Not' : 'Description / Note'}
            </label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder={culture === 'tr-TR' ? 'Fatura notu / açıklama' : 'Invoice note / description'}
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
        isOpen={Boolean(editingInvoice)}
        onClose={() => setEditingInvoice(null)}
        title={culture === 'tr-TR' ? 'Fatura Düzenle' : 'Edit Invoice'}
        maxWidth="lg"
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
                onChange={(e) => setFormType(e.target.value as InvoiceType)}
                className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold"
              >
                <option value="SATIS">{t.invoiceTypes.SATIS} (S)</option>
                <option value="ALIS">{t.invoiceTypes.ALIS} (A)</option>
                <option value="SATIS_IADE">{t.invoiceTypes.SATIS_IADE} (IS)</option>
                <option value="ALIS_IADE">{t.invoiceTypes.ALIS_IADE} (IA)</option>
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
              {t.common.code} *
            </label>
            <input
              type="text"
              required
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

          {/* Line Items in Edit */}
          <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-gray-900 dark:text-zinc-100 uppercase tracking-wide">
                {culture === 'tr-TR' ? 'Fatura Ürün Kalemleri' : 'Invoice Product Items'}
              </label>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{culture === 'tr-TR' ? 'Ürün Ekle' : 'Add Item'}</span>
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {formItems.map((item, idx) => {
                const lineTotal = (parseFloat(item.quantitySqft) || 0) * (parseFloat(item.unitPrice) || 0);
                const currSymbol = getCurrencySymbol(formCurrency);

                return (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-gray-200 dark:border-zinc-800 bg-gray-50/60 dark:bg-zinc-800/40 space-y-2"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                      <div className="sm:col-span-5">
                        <label className="text-[11px] font-medium text-gray-600 dark:text-zinc-400 block mb-0.5">
                          {t.common.product}
                        </label>
                        <SearchableSelect
                          options={productOptions}
                          value={item.productId}
                          onChange={(val) => handleItemChange(idx, 'productId', val)}
                          placeholder={culture === 'tr-TR' ? 'Ürün kodu veya adı ile arayın...' : 'Search product...'}
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="text-[11px] font-medium text-gray-600 dark:text-zinc-400 block mb-0.5">
                          {t.common.quantitySqft}
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={item.quantitySqft}
                          onChange={(e) => handleItemChange(idx, 'quantitySqft', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 font-mono"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[11px] font-medium text-gray-600 dark:text-zinc-400 block mb-0.5">
                          {t.common.unitPrice} ({currSymbol})
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 font-mono"
                        />
                      </div>

                      <div className="sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 pt-4 sm:pt-4">
                        <span className="font-mono text-xs font-bold tabular-nums text-gray-900 dark:text-zinc-100">
                          {lineTotal.toLocaleString(culture, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currSymbol}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                          title="Satırı Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grand Total banner in Edit */}
          <div className="p-3 rounded-lg border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/70 dark:bg-emerald-950/40 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
              {t.common.grandTotal}
            </span>
            <span className="font-mono text-xl sm:text-2xl font-extrabold text-emerald-900 dark:text-emerald-200 tabular-nums">
              {computedGrandTotal.toLocaleString(culture, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              {getCurrencySymbol(formCurrency)}
            </span>
          </div>

          {/* Real-time Balance Preview */}
          {balanceImpact && selectedAccount && (
            <div className="p-3 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-blue-900 dark:text-blue-200">
                  {culture === 'tr-TR' ? 'Cari Bakiye Önizlemesi:' : 'Account Balance Preview:'}
                </span>
                <span className="text-gray-700 dark:text-zinc-300 font-medium">
                  {selectedAccount.description}
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono">
                <div>
                  <span className="text-gray-500 text-[10px] block">{culture === 'tr-TR' ? 'Mevcut' : 'Current'}</span>
                  <span className="font-bold text-gray-800 dark:text-zinc-200">
                    ${balanceImpact.current.toLocaleString(culture, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <span className="text-gray-400">→</span>
                <div>
                  <span className="text-gray-500 text-[10px] block">{culture === 'tr-TR' ? 'Fatura Sonrası' : 'After Invoice'}</span>
                  <span className={`font-bold ${balanceImpact.next >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    ${balanceImpact.next.toLocaleString(culture, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className={`px-2 py-0.5 rounded text-[11px] font-bold ${balanceImpact.delta >= 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'}`}>
                  {balanceImpact.delta >= 0 ? '+' : ''}${balanceImpact.delta.toLocaleString(culture, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
              {culture === 'tr-TR' ? 'Açıklama / Not' : 'Description / Note'}
            </label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder={culture === 'tr-TR' ? 'Fatura notu / açıklama' : 'Invoice note / description'}
              className="w-full px-3 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setEditingInvoice(null)}
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

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={Boolean(cancellingInvoice)}
        onClose={() => setCancellingInvoice(null)}
        title={t.actions.cancelInvoice}
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700 dark:text-zinc-200">
            {t.common.confirmCancelInvoice}
          </p>
          {cancellingInvoice && (
            <div className="text-xs font-mono bg-gray-100 dark:bg-zinc-800 p-3 rounded-lg border border-gray-200 dark:border-zinc-700 space-y-1">
              <div>
                <span className="font-semibold text-gray-500">Kod:</span> {cancellingInvoice.code}
              </div>
              <div>
                <span className="font-semibold text-gray-500">Tür:</span> {t.invoiceTypes[cancellingInvoice.type]}
              </div>
              <div>
                <span className="font-semibold text-gray-500">Tutar:</span> ${cancellingInvoice.amount?.toLocaleString()}
              </div>
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCancellingInvoice(null)}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-700/60"
            >
              {t.actions.cancel}
            </button>
            <button
              type="button"
              onClick={handleConfirmCancel}
              className="px-3 py-1.5 text-xs font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 transition-colors"
            >
              {t.actions.cancelInvoice}
            </button>
          </div>
        </div>
      </Modal>

      {/* Invoice Printable View Modal */}
      <InvoicePrintModal
        invoice={(() => {
          if (!printingInvoice) return null;
          const matchedAcc = currentAccounts.find(
            (a) => a.id === printingInvoice.currentAccountId || a.id === printingInvoice.currentAccount?.id
          );
          const currentAccount: CurrentAccount | null = printingInvoice.currentAccount
            ? {
                ...printingInvoice.currentAccount,
                code: printingInvoice.currentAccount.code || matchedAcc?.code || null,
                description: printingInvoice.currentAccount.description || matchedAcc?.description || null,
                balance: printingInvoice.currentAccount.balance ?? matchedAcc?.balance ?? null,
                updatedOn: printingInvoice.currentAccount.updatedOn ?? matchedAcc?.updatedOn ?? null,
              }
            : matchedAcc || null;

          return {
            ...printingInvoice,
            currentAccount,
          };
        })()}
        onClose={() => setPrintingInvoice(null)}
      />
    </div>
  );
};
