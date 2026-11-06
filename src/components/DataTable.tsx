import React, { useState, useMemo } from 'react';
import {
  Download,
  PlusCircle,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet,
  FileText,
  ChevronDown,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export interface ColumnDef<T> {
  key: string;
  title: string;
  sortable?: boolean;
  width?: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  title: string;
  data: T[];
  columns: ColumnDef<T>[];
  isLoading?: boolean;
  onAdd?: () => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onExportExcel: () => void;
  onExportCSV: () => void;
  searchPlaceholder?: string;
  getRowId: (item: T) => string | number;
}

export function DataTable<T>({
  title,
  data,
  columns,
  isLoading = false,
  onAdd,
  onEdit,
  onDelete,
  onExportExcel,
  onExportCSV,
  searchPlaceholder,
  getRowId,
}: DataTableProps<T>): React.ReactElement {
  const { t } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [exportOpen, setExportOpen] = useState(false);

  // Search filtering
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const term = searchTerm.toLowerCase();
    return data.filter((item) =>
      Object.values(item as Record<string, unknown>).some((val) => {
        if (val === null || val === undefined) return false;
        if (typeof val === 'object') {
          return Object.values(val as Record<string, unknown>).some((nestedVal) =>
            String(nestedVal ?? '').toLowerCase().includes(term)
          );
        }
        return String(val).toLowerCase().includes(term);
      })
    );
  }, [data, searchTerm]);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;
    return [...filteredData].sort((a, b) => {
      const getVal = (obj: any, path: string) => {
        return path.split('.').reduce((acc, part) => acc?.[part], obj);
      };
      const valA = getVal(a, sortKey);
      const valB = getVal(b, sortKey);

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }
      return sortDir === 'asc'
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
  }, [filteredData, sortKey, sortDir]);

  // Pagination
  const totalItems = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedData = useMemo(() => {
    const start = (safeCurrentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, safeCurrentPage, pageSize]);

  const handleSort = (key: string, sortable = true) => {
    if (!sortable) return;
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else {
        setSortKey(null);
        setSortDir('asc');
      }
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-zinc-100">
            {title}
          </h1>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
            {t.common.doubleClickHint}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Split Export Button */}
          <div className="relative">
            <div className="inline-flex rounded-md shadow-xs">
              <button
                type="button"
                onClick={onExportExcel}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-l-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>{t.actions.export}</span>
              </button>
              <button
                type="button"
                onClick={() => setExportOpen((prev) => !prev)}
                className="px-2 py-2 text-sm font-medium rounded-r-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-t border-b border-r border-blue-200 dark:border-blue-900 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                aria-label="Export options"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {exportOpen && (
              <>
                <div
                  className="fixed inset-0 z-20"
                  onClick={() => setExportOpen(false)}
                />
                <div className="absolute right-0 mt-1.5 w-36 rounded-md shadow-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 py-1 z-30">
                  <button
                    type="button"
                    onClick={() => {
                      setExportOpen(false);
                      onExportExcel();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-700/50 flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>{t.common.exportExcel} (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setExportOpen(false);
                      onExportCSV();
                    }}
                    className="w-full text-left px-3 py-2 text-xs text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-700/50 flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4 text-sky-600" />
                    <span>{t.common.exportCSV} (.csv)</span>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Add Button */}
          {onAdd && (
            <button
              type="button"
              onClick={onAdd}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md bg-[#1b6ec2] text-white hover:bg-[#155a9e] shadow-xs transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{t.actions.add}</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          placeholder={searchPlaceholder || t.actions.search}
          className="w-full pl-10 pr-4 py-2 text-sm rounded-md border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
        />
      </div>

      {/* Data Table */}
      <div className="border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/80 dark:bg-zinc-800/60 border-b border-gray-200 dark:border-zinc-800 text-xs font-semibold text-gray-600 dark:text-zinc-300 uppercase tracking-wider">
              <tr>
                {columns.map((col) => {
                  const isSorted = sortKey === col.key;
                  return (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key, col.sortable ?? true)}
                      style={{ width: col.width }}
                      className={`px-4 py-3 select-none ${
                        (col.sortable ?? true) ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors' : ''
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <span>{col.title}</span>
                        {(col.sortable ?? true) && (
                          <span className="text-gray-400">
                            {isSorted ? (
                              sortDir === 'asc' ? (
                                <ArrowUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                              ) : (
                                <ArrowDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-40" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
                {onDelete && <th className="px-3 py-3 w-16 text-center">{t.common.actions}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={columns.length + (onDelete ? 1 : 0)}
                    className="px-4 py-12 text-center text-gray-500 dark:text-zinc-400 text-sm"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <span>{t.common.loading || 'Veriler yükleniyor...'}</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + (onDelete ? 1 : 0)}
                    className="px-4 py-10 text-center text-gray-500 dark:text-zinc-400 text-sm"
                  >
                    {t.common.noRecords}
                  </td>
                </tr>
              ) : (
                paginatedData.map((item) => (
                  <tr
                    key={getRowId(item)}
                    onDoubleClick={() => onEdit?.(item)}
                    className={`hover:bg-blue-50/50 dark:hover:bg-zinc-800/40 transition-colors ${
                      onEdit ? 'cursor-pointer' : ''
                    }`}
                  >
                    {columns.map((col) => {
                      const val = (item as any)[col.key];
                      return (
                        <td key={col.key} className="px-4 py-3 text-gray-700 dark:text-zinc-300">
                          {col.render ? col.render(item) : (val !== null && val !== undefined ? String(val) : '-')}
                        </td>
                      );
                    })}
                    {onDelete && (
                      <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => onDelete(item)}
                          title={t.actions.delete}
                          className="inline-flex items-center justify-center p-1.5 rounded-md text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/60 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 text-xs text-gray-500 dark:text-zinc-400">
          <div>
            <span>
              {t.common.page} {safeCurrentPage} {t.common.of} {totalPages} ({totalItems} {t.common.items})
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span>{t.common.rowsPerPage}:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-2 py-1 rounded border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 focus:outline-none"
              >
                {[5, 10, 20, 30].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage(1)}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 py-0.5 font-medium text-gray-700 dark:text-zinc-200">
                {safeCurrentPage}
              </span>
              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
