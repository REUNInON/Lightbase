import React, { useEffect } from 'react';
import { Printer, X, ArrowLeft } from 'lucide-react';
import { Invoice } from '../types';
import { formatDate } from '../utils/dateUtils';
import { useApp } from '../context/AppContext';

interface InvoicePrintModalProps {
  invoice: Invoice | null;
  onClose: () => void;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({ invoice, onClose }) => {
  const { culture } = useApp();

  // Close with ESC key
  useEffect(() => {
    if (!invoice) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [invoice, onClose]);

  if (!invoice) return null;

  const handlePrint = () => {
    window.print();
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'SATIS':
        return 'SATIŞ FATURASI';
      case 'ALIS':
        return 'ALIŞ FATURASI';
      case 'SATIS_IADE':
        return 'SATIŞ İADE FATURASI';
      case 'ALIS_IADE':
        return 'ALIŞ İADE FATURASI';
      default:
        return 'FATURA';
    }
  };

  // Determine branch based on Current Account code (Z. = ZEYTİNBURNU, B. = BEYAZIT)
  const getBranchName = (): 'ZEYTİNBURNU' | 'BEYAZIT' | null => {
    const code = (invoice.currentAccount?.code || '').trim().toUpperCase();
    if (code.startsWith('Z.') || code.startsWith('Z-') || code.startsWith('Z')) {
      return 'ZEYTİNBURNU';
    }
    if (code.startsWith('B.') || code.startsWith('B-') || code.startsWith('B')) {
      return 'BEYAZIT';
    }
    return null;
  };

  const branchName = getBranchName();
  const isCancelled = invoice.status === 'CANCELLED';

  // Defensive item resolution:
  // If invoice has items, use them.
  // If items array is empty but product exists (e.g. created prior to multi-item upgrade), fallback cleanly.
  const displayItems =
    invoice.items && invoice.items.length > 0
      ? invoice.items
      : invoice.product || invoice.productId
      ? [
          {
            id: -1,
            invoiceId: invoice.id,
            productId: invoice.productId,
            quantitySqft: 100,
            unitPrice:
              invoice.amount !== null && invoice.amount !== undefined
                ? Number(invoice.amount) / 100
                : 0,
            totalPrice: invoice.amount ?? 0,
            product: invoice.product,
          },
        ]
      : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white text-gray-900 rounded-xl shadow-2xl border border-gray-200 overflow-hidden my-8 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar (Hidden during print) */}
        <div className="print:hidden px-5 py-3.5 bg-gray-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-semibold">
              Fatura Yazdırma Önizleme ({invoice.code})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Yazdır / PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded transition-colors cursor-pointer"
              title="Kapat (ESC)"
            >
              <X className="w-4 h-4" />
              <span>Kapat (Esc)</span>
            </button>
          </div>
        </div>

        {/* Printable Paper Area */}
        <div id="printable-invoice" className="p-8 sm:p-10 space-y-6 bg-white text-black font-sans relative">
          {/* Watermark for Cancelled */}
          {isCancelled && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10">
              <div className="text-red-500/20 text-6xl sm:text-8xl font-black uppercase rotate-[-25deg] border-8 border-red-500/20 px-8 py-4 rounded-2xl tracking-widest">
                İPTAL EDİLDİ
              </div>
            </div>
          )}

          {/* Header Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-black pb-5">
            <div>
              <h1 className="text-2xl font-black tracking-tight uppercase">
                IŞIKSAN DERİ{branchName ? ` / ${branchName}` : ''}
              </h1>
              <p className="text-xs font-medium text-gray-600 uppercase tracking-widest mt-0.5">
                Deri Sanayi ve Ticaret
              </p>
              <p className="text-[11px] text-gray-500 mt-1 font-mono">
                İstanbul / Türkiye · Tel: +90 (212) 000 00 00
              </p>
            </div>

            <div className="text-right sm:text-right">
              <span
                className={`inline-block px-3 py-1 text-sm font-bold tracking-wider rounded ${
                  isCancelled ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-black'
                }`}
              >
                {getTypeName(invoice.type)}
              </span>
              <div className="mt-2 text-xs font-mono">
                <span className="text-gray-500">Fatura No: </span>
                <span className="font-bold text-sm">{invoice.code}</span>
              </div>
              <div className="text-xs font-mono text-gray-600">
                <span className="text-gray-500">Tarih: </span>
                <span>{formatDate(invoice.date, culture)}</span>
              </div>
            </div>
          </div>

          {/* Customer / Current Account Box with Cari Hesap Kodu */}
          <div className="p-4 rounded border border-gray-300 bg-gray-50/50">
            <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider block mb-1.5">
              Cari Hesap Bilgileri
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-500 text-[11px] block">Cari Hesap Kodu:</span>
                <span className="font-mono font-bold text-sm text-gray-900 bg-gray-200/90 px-2 py-0.5 rounded inline-block mt-0.5">
                  {invoice.currentAccount?.code || '-'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 text-[11px] block">Cari Hesap:</span>
                <span className="font-bold text-sm text-gray-900 block mt-0.5">
                  {invoice.currentAccount?.description || `Hesap #${invoice.currentAccountId || '-'}`}
                </span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-gray-300">
              <thead className="bg-gray-100 text-black border-b border-gray-300 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Ürün Kodu</th>
                  <th className="py-2.5 px-3">Ürün Açıklaması</th>
                  <th className="py-2.5 px-3 text-right">Miktar (ft²)</th>
                  <th className="py-2.5 px-3 text-right">Birim Fiyat</th>
                  <th className="py-2.5 px-3 text-right">Tutar ($)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-mono">
                {displayItems.length > 0 ? (
                  displayItems.map((it, idx) => (
                    <tr key={it.id || idx}>
                      <td className="py-2.5 px-3 text-center text-gray-500">{idx + 1}</td>
                      <td className="py-2.5 px-3 font-bold">{it.product?.code || '-'}</td>
                      <td className="py-2.5 px-3 font-sans">
                        {it.product?.description || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold">
                        {it.quantitySqft?.toLocaleString(culture, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}{' '}
                        ft²
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        $
                        {it.unitPrice?.toLocaleString(culture, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold">
                        $
                        {it.totalPrice?.toLocaleString(culture, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-4 px-3 text-center text-gray-400 font-sans">
                      Kalem bilgisi bulunamadı
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals & Notes Section */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div className="p-3 rounded border border-gray-200 bg-gray-50/50 text-xs">
              <span className="font-bold text-[10px] uppercase text-gray-500 block mb-1">
                Açıklama / Not:
              </span>
              <p className="text-gray-700 italic">
                {invoice.description?.trim() ? invoice.description : 'Belirtilmedi'}
              </p>
            </div>

            <div className="flex flex-col items-end justify-center p-3 rounded border-2 border-black bg-gray-50/80">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">
                GENEL TOPLAM
              </span>
              <span className="font-mono text-2xl font-black text-black">
                $
                {invoice.amount !== null && invoice.amount !== undefined
                  ? invoice.amount.toLocaleString(culture, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : '0.00'}
              </span>
            </div>
          </div>

          {/* Signatures footer */}
          <div className="pt-10 grid grid-cols-2 gap-8 text-center text-xs border-t border-gray-200">
            <div>
              <p className="font-bold uppercase tracking-wider mb-8">Teslim Eden (Işıksan Deri)</p>
              <div className="border-b border-gray-400 w-32 mx-auto"></div>
              <p className="text-[10px] text-gray-500 mt-1">İmza / Kaşe</p>
            </div>
            <div>
              <p className="font-bold uppercase tracking-wider mb-8">Teslim Alan (Alıcı / Müşteri)</p>
              <div className="border-b border-gray-400 w-32 mx-auto"></div>
              <p className="text-[10px] text-gray-500 mt-1">İmza / Kaşe</p>
            </div>
          </div>
        </div>

        {/* Modal Bottom Bar for Easy Exit (Hidden during print) */}
        <div className="print:hidden px-6 py-3 bg-gray-100 dark:bg-zinc-800 border-t border-gray-200 dark:border-zinc-700 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-gray-700 dark:text-zinc-200 hover:bg-gray-50 dark:hover:bg-zinc-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kapat / Geri Dön (Esc)</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md bg-[#1b6ec2] hover:bg-[#155a9e] text-white shadow-2xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Faturayı Yazdır / PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
