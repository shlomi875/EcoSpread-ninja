import React, { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload, ChevronRight, CheckCircle2, XCircle, Circle, Loader2,
  AlertCircle, Download, Sparkles, Image as ImageIcon,
  Play, Pause, SkipForward, Filter, X, RefreshCw,
  FileText, Zap, Package, ArrowRightLeft,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { translations, Language } from '../i18n';
import { CompanySettings, EshopProduct, EshopProductStatus } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────
type PipelineStep = 'import' | 'enrich' | 'images' | 'export';

interface EnrichProgress {
  current: number;
  total: number;
  currentName: string;
}

interface EshopPipelineProps {
  language: Language;
  settings: CompanySettings;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const needsEnrichment = (p: EshopProduct) =>
  !p.description || !p.seoTitle || !p.seoKeywords ||
  !p.movement || !p.diameter || !p.material ||
  !p.gender || !p.waterResistance || !p.glass;

const countMissing = (p: EshopProduct) => {
  let n = 0;
  if (!p.description) n++;
  if (!p.shortDescription) n++;
  if (!p.movement) n++;
  if (!p.diameter) n++;
  if (!p.material) n++;
  if (!p.gender) n++;
  if (!p.waterResistance) n++;
  if (!p.glass) n++;
  if (!p.seoTitle) n++;
  if (!p.seoDescription) n++;
  if (!p.seoKeywords) n++;
  return n;
};

// Column mapping: internal field → eShop CSV column header
const FIELD_TO_COL: Record<string, string> = {
  brand: '{GlobalMiscField}מותג',
  movement: '{GlobalMiscField}מנגנון',
  diameter: '{GlobalMiscField}קוטר',
  warrantyMisc: '{GlobalMiscField}אחריות',
  material: '{GlobalMiscField}חומר',
  gender: '{GlobalMiscField}מגדר',
  waterResistance: '{GlobalMiscField}עמידות למים',
  glass: '{GlobalMiscField}זכוכית',
  name: 'Name',
  description: 'Description',
  shortDescription: 'ShortDescription',
  seoTitle: 'SeoTitle',
  seoDescription: 'SeoDescription',
  seoKeywords: 'SeoKeywords',
  searchWords: 'SearchWords',
  images: 'images',
};

function escapeCSV(val: unknown): string {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function generateEshopCSV(products: EshopProduct[], baseUrl: string): string {
  if (!products.length) return '';
  const headers = Object.keys(products[0]._raw).filter(h => h);
  const rows = products.map(p => {
    const row = { ...p._raw };
    for (const [field, col] of Object.entries(FIELD_TO_COL)) {
      const val = (p as Record<string, any>)[field];
      if (val) {
        // For images: prepend baseUrl if relative path
        if (field === 'images') {
          const parts = val.split(';').map((u: string) =>
            u.trim() && u.startsWith('/') ? `${baseUrl}${u}` : u.trim()
          ).filter(Boolean);
          row[col] = parts.join(';') + (parts.length ? ';' : '');
        } else {
          row[col] = val;
        }
      }
    }
    return row;
  });
  const bom = '\uFEFF';
  const header = headers.map(escapeCSV).join(',');
  const body = rows.map(r => headers.map(h => escapeCSV(r[h])).join(',')).join('\n');
  return bom + header + '\n' + body;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: EshopProductStatus }) {
  if (status === 'done') return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold"><CheckCircle2 className="w-3 h-3" />done</span>;
  if (status === 'enriching') return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold"><Loader2 className="w-3 h-3 animate-spin" />...</span>;
  if (status === 'error') return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold"><XCircle className="w-3 h-3" />err</span>;
  if (status === 'skipped') return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-[10px] font-bold">skip</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded-full text-[10px] font-bold"><Circle className="w-3 h-3" />wait</span>;
}

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepIndicator({ current, language }: { current: PipelineStep; language: Language }) {
  const t = translations[language] as any;
  const steps: { key: PipelineStep; label: string }[] = [
    { key: 'import', label: t.stepImport },
    { key: 'enrich', label: t.stepEnrich },
    { key: 'images', label: t.stepImages },
    { key: 'export', label: t.stepExport },
  ];
  const idx = steps.findIndex(s => s.key === current);

  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => (
        <React.Fragment key={s.key}>
          <div className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
            i === idx ? 'bg-blue-600 text-white shadow-md shadow-blue-200' :
            i < idx ? 'bg-green-100 text-green-700' :
            'bg-gray-100 text-gray-400'
          )}>
            {i < idx ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center text-[9px] font-bold">{i + 1}</span>}
            {s.label}
          </div>
          {i < steps.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Field cell (colored if missing) ─────────────────────────────────────────
function FieldCell({ value, label }: { value: string; label?: string }) {
  const has = Boolean(value?.trim());
  return (
    <span className={cn(
      'px-1.5 py-0.5 rounded text-[10px] font-medium',
      has ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-500'
    )}>
      {has ? (label || value.substring(0, 12) + (value.length > 12 ? '…' : '')) : `✗ ${label || '?'}`}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function EshopPipeline({ language, settings }: EshopPipelineProps) {
  const t = translations[language] as any;
  const isRTL = language === 'he';

  const [step, setStep] = useState<PipelineStep>('import');
  const [products, setProducts] = useState<EshopProduct[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState<EnrichProgress>({ current: 0, total: 0, currentName: '' });
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [imageProgress, setImageProgress] = useState({ current: 0, total: 0 });
  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  const [imageModel, setImageModel] = useState('gemini-flash-image-generation');
  const [writingStyle, setWritingStyle] = useState('marketing');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;
  const runningRef = useRef(false);

  // ── Brands ────────────────────────────────────────────────────────
  const brands = React.useMemo(
    () => Array.from(new Set(products.map(p => p.brand).filter(Boolean))).sort(),
    [products]
  );

  const filteredProducts = React.useMemo(
    () => brandFilter ? products.filter(p => p.brand === brandFilter) : products,
    [products, brandFilter]
  );

  const toEnrich = React.useMemo(
    () => filteredProducts.filter(p => needsEnrichment(p) && p._status !== 'done' && p._status !== 'skipped'),
    [filteredProducts]
  );

  const noImages = React.useMemo(
    () => filteredProducts.filter(p => !p.images?.trim()),
    [filteredProducts]
  );

  // Stats
  const doneCount = filteredProducts.filter(p => p._status === 'done').length;
  const skippedCount = filteredProducts.filter(p => p._status === 'skipped').length;
  const errorCount = filteredProducts.filter(p => p._status === 'error').length;
  const imagesGeneratedCount = filteredProducts.filter(p => p._status === 'done' && p.images && !p._raw['images']).length;

  // ── Step 1: File upload ───────────────────────────────────────────
  const onDrop = useCallback(async (files: File[]) => {
    if (!files[0]) return;
    setIsParsing(true);
    setParseError('');
    try {
      const fd = new FormData();
      fd.append('file', files[0]);
      const r = await fetch('/api/eshop/parse', { method: 'POST', body: fd });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error || `HTTP ${r.status}`);
      }
      const parsed: EshopProduct[] = await r.json();
      setProducts(parsed);
      setPage(0);
      setBrandFilter('');
    } catch (err: any) {
      setParseError(err.message || 'Parse failed');
    } finally {
      setIsParsing(false);
    }
  }, []);

  // @ts-expect-error react-dropzone type mismatch
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/vnd.ms-excel': ['.xls'] },
    multiple: false,
    disabled: isParsing,
  });

  // ── Step 2: Enrichment ────────────────────────────────────────────
  const startEnrichment = async () => {
    runningRef.current = true;
    setIsEnriching(true);
    const queue = filteredProducts.filter(p => needsEnrichment(p) && p._status !== 'done' && p._status !== 'skipped' && p._status !== 'enriching');
    setEnrichProgress({ current: 0, total: queue.length, currentName: '' });

    for (let i = 0; i < queue.length; i++) {
      if (!runningRef.current) break;
      const product = queue[i];
      setEnrichProgress({ current: i + 1, total: queue.length, currentName: product.name });
      setProducts(prev => prev.map(p => p._idx === product._idx ? { ...p, _status: 'enriching' } : p));

      try {
        const r = await fetch('/api/eshop/enrich-product', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product, language, settings, model: selectedModel, writingStyle }),
        });
        const enriched: EshopProduct = await r.json();
        setProducts(prev => prev.map(p => p._idx === product._idx ? enriched : p));
      } catch {
        setProducts(prev => prev.map(p => p._idx === product._idx ? { ...p, _status: 'error', _error: 'Network error' } : p));
      }
      // small delay — be kind to API
      await new Promise(res => setTimeout(res, 400));
    }

    runningRef.current = false;
    setIsEnriching(false);
  };

  const pauseEnrichment = () => { runningRef.current = false; };

  // ── Step 3: Image Generation ──────────────────────────────────────
  const generateImageForProduct = async (product: EshopProduct) => {
    setProducts(prev => prev.map(p => p._idx === product._idx ? { ...p, _status: 'enriching' } : p));
    try {
      const r = await fetch('/api/eshop/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product, model: imageModel }),
      });
      if (!r.ok) throw new Error('Failed');
      const { url } = await r.json();
      setProducts(prev => prev.map(p =>
        p._idx === product._idx
          ? { ...p, images: p.images ? p.images + url + ';' : url + ';', _status: p._status === 'enriching' ? 'done' : p._status }
          : p
      ));
    } catch {
      setProducts(prev => prev.map(p => p._idx === product._idx ? { ...p, _status: 'error' } : p));
    }
  };

  const generateAllImages = async () => {
    runningRef.current = true;
    setIsGeneratingImages(true);
    const queue = noImages;
    setImageProgress({ current: 0, total: queue.length });
    for (let i = 0; i < queue.length; i++) {
      if (!runningRef.current) break;
      setImageProgress({ current: i + 1, total: queue.length });
      await generateImageForProduct(queue[i]);
      await new Promise(res => setTimeout(res, 500));
    }
    runningRef.current = false;
    setIsGeneratingImages(false);
  };

  // ── Export ────────────────────────────────────────────────────────
  const handleDownloadCSV = () => {
    const baseUrl = window.location.origin;
    const csv = generateEshopCSV(filteredProducts, baseUrl);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `eshop-enriched-${brandFilter || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetPipeline = () => {
    setProducts([]);
    setStep('import');
    setPage(0);
    setBrandFilter('');
    setEnrichProgress({ current: 0, total: 0, currentName: '' });
  };

  // ── Paginated list ────────────────────────────────────────────────
  const pageProducts = filteredProducts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(filteredProducts.length / PAGE_SIZE);

  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-full flex flex-col gap-6" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <ArrowRightLeft className="w-5 h-5 text-white" />
            </div>
            {t.eshopPipeline}
          </h2>
          <p className="text-sm text-gray-500 mt-1 ms-13">{t.eshopPipelineSub}</p>
        </div>
        <StepIndicator current={step} language={language} />
      </div>

      {/* ── STEP 1: IMPORT ── */}
      {step === 'import' && (
        <div className="flex flex-col gap-6">
          {/* Drop zone */}
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all',
              isDragActive ? 'border-blue-500 bg-blue-50 scale-[1.01]' : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/30',
              isParsing && 'pointer-events-none opacity-60'
            )}
          >
            <input {...getInputProps()} />
            {isParsing ? (
              <>
                <Loader2 className="w-12 h-12 text-indigo-500 mx-auto mb-4 animate-spin" />
                <p className="text-lg font-semibold text-indigo-700">{t.parsing}</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-8 h-8 text-indigo-600" />
                </div>
                <p className="text-lg font-semibold text-gray-700">{t.dropCsvHere}</p>
                <p className="text-sm text-gray-400 mt-2">{t.dropCsvSub}</p>
              </>
            )}
          </div>

          {parseError && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{parseError}</span>
            </div>
          )}

          {/* Products preview */}
          {products.length > 0 && (
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              {/* Stats bar */}
              <div className="p-5 border-b bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-black text-indigo-700">{filteredProducts.length}</p>
                    <p className="text-xs text-gray-500 font-medium">{t.productsLoaded}</p>
                  </div>
                  <div className="h-10 w-px bg-indigo-200" />
                  <div className="text-center">
                    <p className="text-2xl font-black text-orange-600">{filteredProducts.filter(p => needsEnrichment(p)).length}</p>
                    <p className="text-xs text-gray-500 font-medium">{t.needsEnrichment}</p>
                  </div>
                  <div className="h-10 w-px bg-indigo-200" />
                  <div className="text-center">
                    <p className="text-2xl font-black text-green-600">{filteredProducts.filter(p => !needsEnrichment(p)).length}</p>
                    <p className="text-xs text-gray-500 font-medium">{t.allGood}</p>
                  </div>
                </div>

                {/* Brand filter */}
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <select
                    value={brandFilter}
                    onChange={e => { setBrandFilter(e.target.value); setPage(0); }}
                    className="px-3 py-1.5 text-sm border rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="">{t.allBrands} ({products.length})</option>
                    {brands.map(b => (
                      <option key={b} value={b}>{b} ({products.filter(p => p.brand === b).length})</option>
                    ))}
                  </select>
                  {brandFilter && (
                    <button onClick={() => setBrandFilter('')} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-auto max-h-72">
                <table className="w-full text-xs" dir={isRTL ? 'rtl' : 'ltr'}>
                  <thead className="sticky top-0 bg-gray-50 border-b">
                    <tr>
                      <th className={cn('px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider', isRTL ? 'text-right' : 'text-left')}>SKU</th>
                      <th className={cn('px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider', isRTL ? 'text-right' : 'text-left')}>{t.productName}</th>
                      <th className={cn('px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider', isRTL ? 'text-right' : 'text-left')}>{t.brand}</th>
                      <th className={cn('px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider', isRTL ? 'text-right' : 'text-left')}>{t.description}</th>
                      <th className={cn('px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider', isRTL ? 'text-right' : 'text-left')}>SEO</th>
                      <th className={cn('px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider', isRTL ? 'text-right' : 'text-left')}>{t.filters}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pageProducts.map(p => (
                      <tr key={p._idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-gray-500">{p.itemId}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-800 max-w-[180px] truncate">{p.name}</td>
                        <td className="px-4 py-2.5 text-indigo-600 font-semibold">{p.brand}</td>
                        <td className="px-4 py-2.5"><FieldCell value={p.description} label={t.description} /></td>
                        <td className="px-4 py-2.5"><FieldCell value={p.seoTitle} label="Title" /></td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1 flex-wrap">
                            <FieldCell value={p.movement} label={t.movement} />
                            <FieldCell value={p.material} label={t.material} />
                            <FieldCell value={p.gender} label={t.gender} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-3 border-t bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                  <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                    className="px-3 py-1.5 border rounded-lg hover:bg-white disabled:opacity-40 transition-colors">‹ Prev</button>
                  <span>{page + 1} / {totalPages}</span>
                  <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1.5 border rounded-lg hover:bg-white disabled:opacity-40 transition-colors">Next ›</button>
                </div>
              )}

              {/* CTA */}
              <div className="p-5 border-t flex justify-end">
                <button
                  onClick={() => setStep('enrich')}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  {t.proceedToEnrich}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: ENRICH ── */}
      {step === 'enrich' && (
        <div className="flex flex-col gap-6">
          {/* Config */}
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-5 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              {t.enrichSettings}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Brand filter */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t.filterByBrandLabel}</label>
                <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">{t.allBrands}</option>
                  {brands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              {/* AI model */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t.aiModel}</label>
                <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-2.0-flash-thinking-exp">Gemini 2.0 Thinking</option>
                </select>
              </div>
              {/* Writing style */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t.writingStyle}</label>
                <select value={writingStyle} onChange={e => setWritingStyle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="marketing">{t.styleMarketing}</option>
                  <option value="formal">{t.styleFormal}</option>
                  <option value="casual">{t.styleCasual}</option>
                  <option value="technical">{t.styleTechnical}</option>
                </select>
              </div>
              {/* Stats */}
              <div className="flex flex-col justify-center bg-indigo-50 rounded-xl px-4 py-3 text-center">
                <p className="text-2xl font-black text-indigo-700">{toEnrich.length}</p>
                <p className="text-xs text-indigo-500 font-medium">{t.needsEnrichment}</p>
              </div>
            </div>
          </div>

          {/* Progress */}
          {(isEnriching || enrichProgress.current > 0) && (
            <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-700">
                  {enrichProgress.current} / {enrichProgress.total}
                </span>
                {isEnriching && (
                  <span className="text-xs text-indigo-600 font-medium flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {t.currentlyProcessing}: {enrichProgress.currentName.substring(0, 40)}...
                  </span>
                )}
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${enrichProgress.total ? (enrichProgress.current / enrichProgress.total) * 100 : 0}%` }}
                />
              </div>
              {!isEnriching && enrichProgress.current === enrichProgress.total && enrichProgress.total > 0 && (
                <p className="text-sm text-green-600 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> {t.enrichDone}
                </p>
              )}
            </div>
          )}

          {/* Product list */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="overflow-auto max-h-80">
              <table className="w-full text-xs" dir={isRTL ? 'rtl' : 'ltr'}>
                <thead className="sticky top-0 bg-gray-50 border-b">
                  <tr>
                    <th className={cn('px-4 py-3 font-semibold text-gray-500 uppercase', isRTL ? 'text-right' : 'text-left')}>Status</th>
                    <th className={cn('px-4 py-3 font-semibold text-gray-500 uppercase', isRTL ? 'text-right' : 'text-left')}>SKU</th>
                    <th className={cn('px-4 py-3 font-semibold text-gray-500 uppercase', isRTL ? 'text-right' : 'text-left')}>{t.productName}</th>
                    <th className={cn('px-4 py-3 font-semibold text-gray-500 uppercase', isRTL ? 'text-right' : 'text-left')}>Missing</th>
                    <th className={cn('px-4 py-3 font-semibold text-gray-500 uppercase', isRTL ? 'text-right' : 'text-left')}>Desc Preview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pageProducts.map(p => (
                    <tr key={p._idx} className={cn(
                      'transition-colors',
                      p._status === 'enriching' && 'bg-blue-50',
                      p._status === 'done' && 'bg-green-50/50',
                      p._status === 'error' && 'bg-red-50/50',
                    )}>
                      <td className="px-4 py-2.5"><StatusBadge status={p._status} /></td>
                      <td className="px-4 py-2.5 font-mono text-gray-400">{p.itemId}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-800 max-w-[200px] truncate">{p.name}</td>
                      <td className="px-4 py-2.5">
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-[10px] font-bold',
                          countMissing(p) === 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                        )}>
                          {countMissing(p) === 0 ? '✓ all' : `${countMissing(p)} fields`}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-400 max-w-[200px] truncate">
                        {p.description ? p.description.substring(0, 60) + '…' : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="p-3 border-t bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 border rounded-lg hover:bg-white disabled:opacity-40 transition-colors">‹ Prev</button>
                <span>{page + 1} / {totalPages}</span>
                <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 border rounded-lg hover:bg-white disabled:opacity-40 transition-colors">Next ›</button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <button onClick={() => setStep('import')} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
              ← Back
            </button>
            <div className="flex items-center gap-3">
              {isEnriching ? (
                <button onClick={pauseEnrichment}
                  className="flex items-center gap-2 px-5 py-2.5 bg-yellow-500 text-white rounded-xl font-semibold hover:bg-yellow-600 transition-all active:scale-95">
                  <Pause className="w-4 h-4" /> {t.pauseEnrichment}
                </button>
              ) : (
                <button onClick={startEnrichment} disabled={toEnrich.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed">
                  <Play className="w-4 h-4" />
                  {enrichProgress.current > 0 && enrichProgress.current < enrichProgress.total ? t.resumeEnrichment : t.startEnrichment}
                  {toEnrich.length > 0 && <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">{toEnrich.length}</span>}
                </button>
              )}
              <button onClick={() => setStep('images')}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-indigo-600 text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition-all active:scale-95">
                {t.proceedToImages}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: IMAGES ── */}
      {step === 'images' && (
        <div className="flex flex-col gap-6">
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-5 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-purple-500" />
              {t.generateImages}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-purple-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-black text-purple-700">{noImages.length}</p>
                <p className="text-xs text-purple-500 font-medium">{t.noImageProducts}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t.aiModel}</label>
                <select value={imageModel} onChange={e => setImageModel(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:ring-2 focus:ring-purple-500 outline-none">
                  <option value="gemini-flash-image-generation">Gemini Flash Image Gen</option>
                  <option value="gemini-3.1-flash-image-preview">Gemini 3.1 Flash Image</option>
                  <option value="imagen-3.0-generate-002">Imagen 3.0</option>
                </select>
              </div>
              {isGeneratingImages && (
                <div className="flex flex-col justify-center">
                  <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                      style={{ width: `${imageProgress.total ? (imageProgress.current / imageProgress.total) * 100 : 0}%` }} />
                  </div>
                  <p className="text-xs text-center text-purple-600 font-medium">{imageProgress.current} / {imageProgress.total}</p>
                </div>
              )}
            </div>

            {/* Per-product image grid */}
            {noImages.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-5 max-h-64 overflow-auto">
                {noImages.slice(0, 48).map(p => (
                  <div key={p._idx} className="group relative">
                    <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden border flex items-center justify-center">
                      {p.images ? (
                        <img src={p.images.split(';')[0]} alt="" className="w-full h-full object-cover" />
                      ) : p._status === 'enriching' ? (
                        <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-gray-300" />
                      )}
                    </div>
                    <p className="text-[9px] text-gray-400 mt-1 text-center truncate">{p.itemId}</p>
                    {!p.images && p._status !== 'enriching' && (
                      <button
                        onClick={() => generateImageForProduct(p)}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Sparkles className="w-5 h-5 text-white" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <button onClick={() => setStep('enrich')} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
              ← Back
            </button>
            <div className="flex items-center gap-3">
              {isGeneratingImages ? (
                <button onClick={() => { runningRef.current = false; }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-yellow-500 text-white rounded-xl font-semibold hover:bg-yellow-600 transition-all">
                  <Pause className="w-4 h-4" /> {t.pauseEnrichment}
                </button>
              ) : (
                noImages.length > 0 && (
                  <button onClick={generateAllImages}
                    className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl font-semibold shadow-md shadow-purple-200 hover:bg-purple-700 transition-all active:scale-95">
                    <Sparkles className="w-4 h-4" /> {t.generateAll}
                    <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">{noImages.length}</span>
                  </button>
                )
              )}
              <button onClick={() => setStep('export')}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all active:scale-95">
                <SkipForward className="w-4 h-4" /> {t.skipImages}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 4: EXPORT ── */}
      {step === 'export' && (
        <div className="flex flex-col gap-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: t.productsLoaded, value: filteredProducts.length, color: 'blue' },
              { label: t.enrichedCount, value: doneCount, color: 'green' },
              { label: t.skippedCount, value: skippedCount, color: 'gray' },
              { label: t.errorCount, value: errorCount, color: 'red' },
            ].map(({ label, value, color }) => (
              <div key={label} className={cn(
                'rounded-2xl p-5 text-center border',
                color === 'blue' && 'bg-blue-50 border-blue-100',
                color === 'green' && 'bg-green-50 border-green-100',
                color === 'gray' && 'bg-gray-50 border-gray-100',
                color === 'red' && 'bg-red-50 border-red-100',
              )}>
                <p className={cn(
                  'text-3xl font-black',
                  color === 'blue' && 'text-blue-700',
                  color === 'green' && 'text-green-700',
                  color === 'gray' && 'text-gray-600',
                  color === 'red' && 'text-red-600',
                )}>{value}</p>
                <p className="text-xs font-medium text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Preview table */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">{t.exportReady}</p>
              <p className="text-xs text-gray-400">{t.stepExport} preview</p>
            </div>
            <div className="overflow-auto max-h-72">
              <table className="w-full text-xs" dir={isRTL ? 'rtl' : 'ltr'}>
                <thead className="sticky top-0 bg-gray-50 border-b">
                  <tr>
                    <th className={cn('px-4 py-3 font-semibold text-gray-500 uppercase', isRTL ? 'text-right' : 'text-left')}>SKU</th>
                    <th className={cn('px-4 py-3 font-semibold text-gray-500 uppercase', isRTL ? 'text-right' : 'text-left')}>{t.productName}</th>
                    <th className={cn('px-4 py-3 font-semibold text-gray-500 uppercase', isRTL ? 'text-right' : 'text-left')}>Status</th>
                    <th className={cn('px-4 py-3 font-semibold text-gray-500 uppercase', isRTL ? 'text-right' : 'text-left')}>Desc</th>
                    <th className={cn('px-4 py-3 font-semibold text-gray-500 uppercase', isRTL ? 'text-right' : 'text-left')}>SEO Title</th>
                    <th className={cn('px-4 py-3 font-semibold text-gray-500 uppercase', isRTL ? 'text-right' : 'text-left')}>Movement</th>
                    <th className={cn('px-4 py-3 font-semibold text-gray-500 uppercase', isRTL ? 'text-right' : 'text-left')}>Images</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pageProducts.map(p => (
                    <tr key={p._idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-gray-400">{p.itemId}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-800 max-w-[160px] truncate">{p.name}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={p._status} /></td>
                      <td className="px-4 py-2.5 max-w-[200px] truncate text-gray-500">{p.description ? p.description.substring(0, 50) + '…' : '—'}</td>
                      <td className="px-4 py-2.5 max-w-[150px] truncate text-gray-500">{p.seoTitle || '—'}</td>
                      <td className="px-4 py-2.5 text-gray-500">{p.movement || '—'}</td>
                      <td className="px-4 py-2.5">
                        {p.images
                          ? <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold">✓ {p.images.split(';').filter(Boolean).length}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="p-3 border-t bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 border rounded-lg hover:bg-white disabled:opacity-40 transition-colors">‹ Prev</button>
                <span>{page + 1} / {totalPages}</span>
                <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 border rounded-lg hover:bg-white disabled:opacity-40 transition-colors">Next ›</button>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <button onClick={resetPipeline}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
              <RefreshCw className="w-4 h-4" /> {t.backToImport}
            </button>
            <button onClick={handleDownloadCSV}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:shadow-xl transition-all active:scale-95 text-sm">
              <Download className="w-5 h-5" />
              {t.downloadEshopCsv}
              <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">{filteredProducts.length}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
