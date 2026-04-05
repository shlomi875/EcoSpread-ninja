import React from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getFilteredRowModel,
} from '@tanstack/react-table';
import { Product } from '../types';
import { Edit2, ExternalLink, Eye, Image as ImageIcon, Search, Trash2, CheckSquare, Square, Sparkles, Filter, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { translations, Language } from '../i18n';

interface SpreadsheetProps {
  data: Product[];
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onView: (product: Product) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  language: Language;
  role: string;
  onAudit: (products: Product[]) => void;
}

const columnHelper = createColumnHelper<Product>();

export function Spreadsheet({ data, onEdit, onDelete, onView, searchQuery, onSearchChange, language, role, onAudit }: SpreadsheetProps) {
  const t = translations[language];
  const [rowSelection, setRowSelection] = React.useState({});
  const [filterCategory, setFilterCategory] = React.useState('');
  const [filterStatus, setFilterStatus] = React.useState('');
  const [filterGender, setFilterGender] = React.useState('');

  const categories = React.useMemo(
    () => Array.from(new Set(data.map(p => p.category).filter(Boolean))).sort(),
    [data]
  );

  const activeFilterCount = [filterCategory, filterStatus, filterGender].filter(Boolean).length;

  const filteredData = React.useMemo(() =>
    data.filter(p =>
      (!filterCategory || p.category === filterCategory) &&
      (!filterStatus || p.status === filterStatus) &&
      (!filterGender || p.gender === filterGender)
    ),
    [data, filterCategory, filterStatus, filterGender]
  );

  const clearFilters = () => {
    setFilterCategory('');
    setFilterStatus('');
    setFilterGender('');
  };

  const columns = [
    columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <button
          onClick={table.getToggleAllRowsSelectedHandler()}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
        >
          {table.getIsAllRowsSelected() ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-gray-300" />}
        </button>
      ),
      cell: ({ row }) => (
        <button
          onClick={row.getToggleSelectedHandler()}
          className="p-1 hover:bg-gray-200 rounded transition-colors"
        >
          {row.getIsSelected() ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4 text-gray-300" />}
        </button>
      ),
    }),
    columnHelper.accessor('images', {
      header: t.preview,
      cell: (info) => (
        <div className="flex items-center justify-center w-12 h-12 bg-gray-50 rounded-lg border overflow-hidden">
          {info.getValue()[0] ? (
            <img src={info.getValue()[0]} alt="" className="w-full h-full object-cover" />
          ) : (
            <ImageIcon className="w-5 h-5 text-gray-300" />
          )}
        </div>
      ),
    }),
    columnHelper.accessor('name', {
      header: t.productName,
      cell: (info) => <span className="font-medium text-gray-900">{info.getValue()}</span>,
    }),
    columnHelper.accessor('sku', {
      header: t.sku,
      cell: (info) => <span className="text-gray-500 font-mono text-xs">{info.getValue()}</span>,
    }),
    columnHelper.accessor('modelNumber', {
      header: t.modelNumber,
      cell: (info) => <span className="text-gray-500 font-mono text-xs">{info.getValue()}</span>,
    }),
    columnHelper.accessor('category', {
      header: t.category,
      cell: (info) => (
        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium uppercase tracking-wider">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('price', {
      header: t.price,
      cell: (info) => <span className="text-blue-600 font-semibold">{info.getValue()}</span>,
    }),
    columnHelper.accessor('zapPrice', {
      header: t.zapPrice,
      cell: (info) => <span className="text-orange-600 font-medium">{info.getValue() || '-'}</span>,
    }),
    columnHelper.accessor('targetPrice', {
      header: t.targetPrice,
      cell: (info) => <span className="text-green-600 font-bold">{info.getValue() || '-'}</span>,
    }),
    columnHelper.accessor('zapLink', {
      header: t.zapLink,
      cell: (info) => (
        info.getValue() ? (
          <a
            href={info.getValue()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        ) : <span className="text-gray-300">-</span>
      ),
    }),
    columnHelper.accessor('status', {
      header: t.status,
      cell: (info) => (
        <span className={cn(
          "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
          info.getValue() === 'published' ? "bg-green-100 text-green-700" :
          info.getValue() === 'ready' ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"
        )}>
          {t[info.getValue() as keyof typeof t] || info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('lastUpdated', {
      header: t.lastUpdated,
      cell: (info) => <span className="text-gray-400 text-xs">{new Date(info.getValue()).toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US')}</span>,
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: (info) => {
        const tableRole = (info.table.options.meta as any)?.role;
        const canEdit = tableRole !== 'viewer';
        const isAdmin = tableRole === 'admin';
        return (
          <div className={cn("flex gap-1", language === 'he' ? "justify-start" : "justify-end")}>
            {/* View (read-only) button — always visible */}
            <button
              onClick={() => onView(info.row.original)}
              className="p-2 hover:bg-purple-50 text-purple-500 rounded-lg transition-colors"
              title={(t as any).viewProduct}
            >
              <Eye className="w-4 h-4" />
            </button>
            {/* Edit button — hidden for viewer */}
            {canEdit && (
              <button
                onClick={() => onEdit(info.row.original)}
                className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                title="Edit Product"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {/* Delete — admin only */}
            {isAdmin && (
              <button
                onClick={() => onDelete(info.row.original.id)}
                className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                title="Delete Product"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      },
    }),
  ];

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    meta: { role },
  });

  const selectedProducts = table.getSelectedRowModel().rows.map(r => r.original);

  const selectClass = cn(
    "px-3 py-1.5 text-xs border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none text-gray-700 cursor-pointer hover:border-blue-400 transition-colors",
    language === 'he' ? "text-right" : "text-left"
  );

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-xl shadow-sm border overflow-hidden">
      {/* Top bar: search + count */}
      <div className="p-4 border-b bg-gray-50/50 flex items-center justify-between gap-4 flex-wrap">
        <div className="relative w-64">
          <Search className={cn("absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400", language === 'he' ? "right-3" : "left-3")} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t.searchPlaceholder}
            className={cn(
              "w-full py-2 bg-white border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all",
              language === 'he' ? "pr-10 pl-4" : "pl-10 pr-4"
            )}
          />
        </div>
        <div className="flex items-center gap-4 text-xs">
          {selectedProducts.length > 0 ? (
            <button
              onClick={() => onAudit(selectedProducts)}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg font-bold shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {(t as any).masterSeo}
            </button>
          ) : (
            <div className="flex items-center gap-4 text-gray-500">
              <span>{filteredData.length}{activeFilterCount > 0 ? ` / ${data.length}` : ''} {t.products}</span>
              <div className="h-4 w-[1px] bg-gray-200" />
              <span>{t.autoSave}</span>
            </div>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className={cn(
        "px-4 py-2.5 border-b bg-white flex items-center gap-2 flex-wrap",
        language === 'he' ? "flex-row-reverse justify-end" : ""
      )}>
        <Filter className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />

        {/* Category */}
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className={selectClass}
        >
          <option value="">{(t as any).filterCategory}</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Status */}
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className={selectClass}
        >
          <option value="">{(t as any).filterStatus}</option>
          <option value="draft">{t.draft}</option>
          <option value="ready">{t.ready}</option>
          <option value="published">{t.published}</option>
        </select>

        {/* Gender */}
        <select
          value={filterGender}
          onChange={e => setFilterGender(e.target.value)}
          className={selectClass}
        >
          <option value="">{(t as any).filterGender}</option>
          <option value="men">{t.genderMen}</option>
          <option value="women">{t.genderWomen}</option>
          <option value="unisex">{t.genderUnisex}</option>
          <option value="kids">{t.genderKids}</option>
        </select>

        {/* Clear filters */}
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
          >
            <X className="w-3 h-3" />
            {(t as any).clearFilters}
            <span className="bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">{activeFilterCount}</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse" dir={language === 'he' ? 'rtl' : 'ltr'}>
          <thead className="sticky top-0 bg-gray-50 z-10 border-b">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className={cn(
                    "px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider",
                    language === 'he' ? "text-right" : "text-left"
                  )}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-100">
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="hover:bg-blue-50/30 transition-colors group">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className={cn(
                    "px-6 py-4 text-sm align-middle",
                    language === 'he' ? "text-right" : "text-left"
                  )}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {filteredData.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Search className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-lg font-medium">{t.noProducts}</p>
            <p className="text-sm">{t.noProductsSub}</p>
          </div>
        )}
      </div>
    </div>
  );
}
