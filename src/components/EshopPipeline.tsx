import React, { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  ChevronRight, CheckCircle2, XCircle, Circle, Loader2,
  AlertCircle, Download, Sparkles, Image as ImageIcon,
  Play, Pause, SkipForward, Filter, X, RefreshCw,
  FileText, ArrowRightLeft, Pencil, Search, Layers,
  Save, ChevronDown, ChevronUp, Wand2, Eye, Copy,
  ZoomIn, RotateCcw, CloudUpload,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { translations, Language } from '../i18n';
import { CompanySettings, EshopProduct, Product } from '../types';
import {
  MECHANISMS, GENDERS, WATER_RESISTANCES, GLASS_TYPES,
  WATCH_STYLES, STRAP_MATERIALS, CASE_MATERIALS, COLORS,
} from '../constants/taxonomy';

// ─── Types ────────────────────────────────────────────────────────────────────
type PipelineStep = 'import' | 'enrich' | 'images' | 'export';
type ImageMode = 'generate' | 'analyze' | 'edit' | 'variations' | 'upload';
type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';

interface EnrichProgress { current: number; total: number; currentName: string; }
interface EshopPipelineProps { 
  language: Language; 
  settings: CompanySettings; 
  onSaveToInventory?: (products: Product[]) => Promise<void>; 
}

type PushStatus = 'added' | 'updated' | 'skipped' | 'error';
interface PushResultRow { itemId: string; status: PushStatus; message?: string }
interface PushSummary { total: number; added: number; updated: number; errors: number }

// ─── Model Config ─────────────────────────────────────────────────────────────
const ENRICH_MODELS = [
  { value: 'gemini-2.5-flash',            label: 'Gemini 2.5 Flash',              badge: 'FAST' },
  { value: 'gemini-2.5-flash-lite',       label: 'Gemini 2.5 Flash Lite',         badge: 'LITE' },
  { value: 'gemini-2.5-pro',              label: 'Gemini 2.5 Pro',                badge: 'PRO'  },
  { value: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite',       badge: 'NEW'  },
  { value: 'gemini-3-flash-preview',      label: 'Gemini 3 Flash',                badge: 'NEW'  },
  { value: 'gemini-3.1-pro-preview',      label: 'Gemini 3.1 Pro',                badge: 'NEW'  },
];

const IMAGE_MODELS = [
  { value: 'gemini-3.1-flash-image-preview', label: 'Gemini 3.1 Flash Image',     badge: 'FAST', color: 'yellow' },
  { value: 'gemini-flash-image-generation',  label: 'Gemini Flash Image Gen',      badge: 'FAST', color: 'yellow' },
  { value: 'imagen-3.0-generate-002',        label: 'Imagen 3.0',                  badge: 'PRO',  color: 'blue'   },
];

// ─── Prompt Builder Tag Groups ─────────────────────────────────────────────────
const PROMPT_TAGS = {
  shotType: ['Studio Shot', 'Lifestyle', 'Close-up Detail', 'On Wrist', '3D Angle', 'Flat Lay'],
  style:    ['Photorealistic', 'Luxury', 'Minimalist', 'Editorial', 'Commercial', 'Cinematic'],
  mood:     ['Professional', 'Elegant', 'Bold', 'Clean', 'Warm', 'Dramatic'],
  background: ['Pure White', 'Light Grey', 'Black', 'Marble', 'Wood Texture', 'Gradient'],
  lighting: ['Studio Light', 'Natural Light', 'Soft Box', 'Dramatic', 'Ring Light'],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const needsEnrichment = (p: EshopProduct) =>
  !p.description || !p.seoTitle || !p.seoKeywords ||
  !p.movement || !p.diameter || !p.material ||
  !p.gender || !p.waterResistance || !p.glass;

const countMissing = (p: EshopProduct) => {
  const fields = ['description', 'shortDescription', 'movement', 'diameter', 'material',
    'gender', 'waterResistance', 'glass', 'seoTitle', 'seoDescription', 'seoKeywords'] as const;
  return fields.filter(f => !p[f]?.trim()).length;
};

const FIELD_TO_COL: Record<string, string> = {
  brand: '{GlobalMiscField}מותג', movement: '{GlobalMiscField}מנגנון',
  diameter: '{GlobalMiscField}קוטר', warrantyMisc: '{GlobalMiscField}אחריות',
  material: '{GlobalMiscField}חומר', gender: '{GlobalMiscField}מגדר',
  waterResistance: '{GlobalMiscField}עמידות למים', glass: '{GlobalMiscField}זכוכית',
  name: 'Name', description: 'Description', shortDescription: 'ShortDescription',
  seoTitle: 'SeoTitle', seoDescription: 'SeoDescription', seoKeywords: 'SeoKeywords',
  searchWords: 'SearchWords', images: 'images',
};

function escapeCSV(val: unknown): string {
  const s = String(val ?? '');
  return (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r'))
    ? `"${s.replace(/"/g, '""')}"` : s;
}

function generateEshopCSV(products: EshopProduct[], baseUrl: string): string {
  if (!products.length) return '';
  const headers = Object.keys(products[0]._raw).filter(h => h);
  const rows = products.map(p => {
    const row = { ...p._raw };
    for (const [field, col] of Object.entries(FIELD_TO_COL)) {
      const val = (p as any)[field];
      if (val) {
        if (field === 'images') {
          const parts = val.split(';').map((u: string) =>
            u.trim() && u.startsWith('/') ? `${baseUrl}${u}` : u.trim()
          ).filter(Boolean);
          row[col] = parts.join(';') + (parts.length ? ';' : '');
        } else { row[col] = val; }
      }
    }
    return row;
  });
  return '\uFEFF' + headers.map(escapeCSV).join(',') + '\n' +
    rows.map(r => headers.map(h => escapeCSV(r[h])).join(',')).join('\n');
}

function buildImagePrompt(product: EshopProduct, custom: string, tags: Record<string, string[]>): string {
  const allTags = Object.values(tags).flat();
  const tagStr = allTags.length ? allTags.join(', ') : '';
  const base = `Professional product photography of watch: ${product.name}. Brand: ${product.brand}.`
    + (product.material ? ` Material: ${product.material}.` : '')
    + (product.diameter ? ` Size: ${product.diameter}.` : '');
  const style = tagStr ? ` Style: ${tagStr}.` : '';
  const extra = custom ? ` ${custom}` : '';
  return `${base}${style}${extra} High-resolution e-commerce product photo, no watermarks, no text.`;
}

function mapEshopToProduct(p: EshopProduct): Product {
  return {
    id: '', 
    name: p.name || 'New Product',
    sku: p.itemId || '',
    modelNumber: p.modelNumber || '',
    category: p.category || 'Uncategorized',
    subCategory: p.subCategory,
    gender: (p.gender === 'Men' || p.gender === 'גברים') ? 'men' : 
            (p.gender === 'Women' || p.gender === 'נשים') ? 'women' : 'unisex',
    price: p.regularPrice || p.salePrice || '₪0',
    salePrice: p.salePrice || undefined,
    zapPrice: p.zapMinPrice,
    zapLink: p.zapUrl,
    description: p.description || '',
    shortDescription: p.shortDescription || '',
    manufacturer: p.manufacturer || p.brand || '',
    warranty: p.warranty || '',
    deliveryTime: p.deliveryTime || '',
    payments: p.maxPayments || '',
    movement: p.movement,
    diameter: p.diameter,
    material: p.material,
    waterResistance: p.waterResistance,
    glass: p.glass,
    watchStyle: p.watchStyle,
    strapMaterial: p.strapMaterial,
    caseMaterial: p.caseMaterial,
    colors: p.colors ? p.colors.split(',').map(s => s.trim()).filter(Boolean) : [],
    filters: [],
    seoKeywords: p.seoKeywords ? p.seoKeywords.split(',').map(s => s.trim()) : [],
    images: p.images ? p.images.split(';').filter(Boolean) : [],
    status: 'ready',
    lastUpdated: new Date().toISOString(),
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === 'done')      return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold"><CheckCircle2 className="w-3 h-3" />done</span>;
  if (status === 'enriching') return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold"><Loader2 className="w-3 h-3 animate-spin" />...</span>;
  if (status === 'error')     return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold"><XCircle className="w-3 h-3" />err</span>;
  if (status === 'skipped')   return <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-[10px] font-bold">skip</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded-full text-[10px] font-bold"><Circle className="w-3 h-3" />wait</span>;
}

function StepIndicator({ current, language }: { current: PipelineStep; language: Language }) {
  const t = translations[language] as any;
  const steps: { key: PipelineStep; label: string }[] = [
    { key: 'import', label: t.stepImport }, { key: 'enrich', label: t.stepEnrich },
    { key: 'images', label: t.stepImages }, { key: 'export', label: t.stepExport },
  ];
  const idx = steps.findIndex(s => s.key === current);
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {steps.map((s, i) => (
        <React.Fragment key={s.key}>
          <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
            i === idx ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' :
            i < idx   ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400')}>
            {i < idx ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center text-[9px] font-black">{i + 1}</span>}
            {s.label}
          </div>
          {i < steps.length - 1 && <ChevronRight className="w-3 h-3 text-gray-300 flex-shrink-0" />}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Product Detail Panel (Enrich step) ──────────────────────────────────────
function ProductDetailPanel({ product, onSave, onClose, language }: {
  product: EshopProduct; onSave: (p: EshopProduct) => void; onClose: () => void; language: Language;
}) {
  const t = translations[language] as any;
  const [draft, setDraft] = useState<EshopProduct>({ ...product });
  const field = (k: keyof EshopProduct) => String(draft[k] || '');
  const set = (k: keyof EshopProduct, v: string) => setDraft(prev => ({ ...prev, [k]: v }));

  const inputCls = "w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all";

  return (
    <div className="flex flex-col h-full bg-white border-s">
      {/* Header */}
      <div className="p-4 border-b bg-indigo-50 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{t.editProduct}</p>
          <p className="text-sm font-semibold text-gray-900 truncate">{draft.name}</p>
          <p className="text-xs text-gray-400 font-mono">{draft.itemId}</p>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors flex-shrink-0">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Sale Price */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">{t.salePrice || 'מחיר מכירה'}</label>
          <input
            type="text"
            value={field('salePrice')}
            onChange={e => set('salePrice', e.target.value)}
            placeholder="₪0"
            className={cn(inputCls, "border-orange-200 bg-orange-50/30 focus:ring-orange-400")}
          />
        </div>
        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">{t.description}</label>
          <textarea rows={5} value={field('description')} onChange={e => set('description', e.target.value)}
            className={cn(inputCls, "resize-none")} />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1 uppercase">{t.shortDescription}</label>
          <textarea rows={2} value={field('shortDescription')} onChange={e => set('shortDescription', e.target.value)}
            className={cn(inputCls, "resize-none")} />
        </div>
        {/* Specs grid */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">{t.filters}</label>
          <div className="grid grid-cols-2 gap-2">
            {/* Movement */}
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">{t.movement}</label>
              <select value={field('movement')} onChange={e => set('movement', e.target.value)}
                className="w-full px-2 py-1.5 border rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="">{language === 'he' ? 'בחר' : 'Select'}</option>
                {MECHANISMS.map(m => <option key={m.key} value={m.key}>{m.name}</option>)}
              </select>
            </div>
            {/* Diameter — free text */}
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">{t.diameter}</label>
              <input value={field('diameter')} onChange={e => set('diameter', e.target.value)}
                placeholder={'42 מ"מ'}
                className="w-full px-2 py-1.5 border rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            {/* Material — free text (legacy field) */}
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">{t.material}</label>
              <input value={field('material')} onChange={e => set('material', e.target.value)}
                className="w-full px-2 py-1.5 border rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            {/* Gender */}
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">{t.gender}</label>
              <select value={field('gender')} onChange={e => set('gender', e.target.value)}
                className="w-full px-2 py-1.5 border rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="">{language === 'he' ? 'בחר' : 'Select'}</option>
                {GENDERS.map(g => <option key={g.key} value={g.key}>{g.name}</option>)}
              </select>
            </div>
            {/* Water Resistance */}
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">{t.waterResistance}</label>
              <select value={field('waterResistance')} onChange={e => set('waterResistance', e.target.value)}
                className="w-full px-2 py-1.5 border rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="">{language === 'he' ? 'בחר' : 'Select'}</option>
                {WATER_RESISTANCES.map(w => <option key={w.key} value={w.key}>{w.name}</option>)}
              </select>
            </div>
            {/* Glass */}
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">{t.glass}</label>
              <select value={field('glass')} onChange={e => set('glass', e.target.value)}
                className="w-full px-2 py-1.5 border rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="">{language === 'he' ? 'בחר' : 'Select'}</option>
                {GLASS_TYPES.map(g => <option key={g.key} value={g.key}>{g.name}</option>)}
              </select>
            </div>
            {/* Watch Style */}
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">{t.watchStyle || 'סגנון שעון'}</label>
              <select value={field('watchStyle')} onChange={e => set('watchStyle', e.target.value)}
                className="w-full px-2 py-1.5 border rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="">{language === 'he' ? 'בחר' : 'Select'}</option>
                {WATCH_STYLES.map(s => <option key={s.key} value={s.key}>{s.name}</option>)}
              </select>
            </div>
            {/* Strap Material */}
            <div>
              <label className="block text-[10px] text-gray-500 mb-0.5">{t.strapMaterial || 'חומר רצועה'}</label>
              <select value={field('strapMaterial')} onChange={e => set('strapMaterial', e.target.value)}
                className="w-full px-2 py-1.5 border rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="">{language === 'he' ? 'בחר' : 'Select'}</option>
                {STRAP_MATERIALS.map(m => <option key={m.key} value={m.key}>{m.name}</option>)}
              </select>
            </div>
            {/* Case Material */}
            <div className="col-span-2">
              <label className="block text-[10px] text-gray-500 mb-0.5">{t.caseMaterial || 'חומר קייס'}</label>
              <select value={field('caseMaterial')} onChange={e => set('caseMaterial', e.target.value)}
                className="w-full px-2 py-1.5 border rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="">{language === 'he' ? 'בחר' : 'Select'}</option>
                {CASE_MATERIALS.map(m => <option key={m.key} value={m.key}>{m.name}</option>)}
              </select>
            </div>
          </div>
          {/* Colors — multi-select pills */}
          <div className="mt-3">
            <label className="block text-[10px] text-gray-500 mb-1.5">{t.colors || 'צבעים'}</label>
            <div className="flex flex-wrap gap-1.5">
              {COLORS.map(color => {
                const currentColors = (draft.colors || '').split(',').map(s => s.trim()).filter(Boolean);
                const selected = currentColors.includes(color.key);
                return (
                  <button
                    key={color.key}
                    type="button"
                    onClick={() => {
                      const next = selected
                        ? currentColors.filter(k => k !== color.key)
                        : [...currentColors, color.key];
                      set('colors', next.join(', '));
                    }}
                    className={cn(
                      "flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-medium transition-all",
                      selected ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
                    )}
                    title={color.name}
                  >
                    <span className="w-2.5 h-2.5 rounded-full border border-gray-300 flex-shrink-0" style={{ backgroundColor: color.hex }} />
                    {color.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {/* SEO */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">SEO</label>
          <div className="space-y-2">
            {([['seoTitle', 'Title'], ['seoDescription', 'Description'], ['seoKeywords', 'Keywords']] as [keyof EshopProduct, string][]).map(([k, label]) => (
              <div key={k}>
                <label className="block text-[10px] text-gray-500 mb-0.5">{label}</label>
                <input value={field(k)} onChange={e => set(k, e.target.value)}
                  className="w-full px-2 py-1.5 border rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="p-4 border-t bg-gray-50">
        <button onClick={() => { onSave(draft); onClose(); }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-all">
          <Save className="w-4 h-4" /> {t.save}
        </button>
      </div>
    </div>
  );
}

// ─── Image Studio ─────────────────────────────────────────────────────────────
function ImageStudio({ product, onImageSaved, language }: {
  product: EshopProduct; onImageSaved: (url: string) => void; language: Language;
}) {
  const t = translations[language] as any;
  const [mode, setMode] = useState<ImageMode>('generate');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [imageModel, setImageModel] = useState('gemini-3.1-flash-image-preview');
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedTags, setSelectedTags] = useState<Record<string, string[]>>({ shotType: [], style: [], mood: [], background: [], lighting: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [analysisText, setAnalysisText] = useState('');
  const [editInstruction, setEditInstruction] = useState('');
  const [copied, setCopied] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // @ts-expect-error react-dropzone type mismatch
  const { getRootProps: getDropProps, getInputProps: getDropInputProps, isDragActive: isDropActive } = useDropzone({
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    multiple: false,
    onDrop: async (accepted) => {
      const file = accepted[0];
      if (!file) return;
      setIsUploading(true);
      try {
        const fd = new FormData();
        fd.append('file', file);
        const r = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!r.ok) throw new Error('Upload failed');
        const { url } = await r.json();
        
        onImageSaved(url);
        setResult(url);
      } catch (err: any) {
        setAnalysisText('Upload error: ' + err.message);
      } finally {
        setIsUploading(false);
      }
    }
  });

  const existingImages = product.images?.split(';').filter(Boolean) ?? [];
  const fullPrompt = buildImagePrompt(product, customPrompt, selectedTags);

  const toggleTag = (group: string, tag: string) => {
    setSelectedTags(prev => ({
      ...prev,
      [group]: prev[group].includes(tag) ? prev[group].filter(t => t !== tag) : [...prev[group], tag],
    }));
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setResult(null);
    setAnalysisText('');
    try {
      if (mode === 'generate' || mode === 'variations') {
        const r = await fetch('/api/eshop/generate-image', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product, model: imageModel, customPrompt: fullPrompt }),
        });
        const d = await r.json();
        if (d.url) setResult(d.url);
        else throw new Error(d.error || 'Failed');
      } else if (mode === 'analyze') {
        const src = existingImages[0] || '';
        if (!src) { setAnalysisText('No existing image to analyze.'); return; }
        const r = await fetch('/api/eshop/analyze-image', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: src, product }),
        });
        const d = await r.json();
        setAnalysisText(d.analysis || 'No analysis returned');
      } else if (mode === 'edit') {
        const src = existingImages[0] || '';
        if (!src) { setAnalysisText('No existing image to edit.'); return; }
        const r = await fetch('/api/eshop/edit-image', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: src, instruction: editInstruction || 'Clean white background, professional product photo', product, model: imageModel }),
        });
        const d = await r.json();
        if (d.url) setResult(d.url);
        else throw new Error(d.error || 'Failed');
      }
    } catch (err: any) {
      setAnalysisText('Error: ' + err.message);
    } finally { setIsLoading(false); }
  };

  const MODES: { key: ImageMode; label: string; icon: React.FC<any> }[] = [
    { key: 'generate',   label: language === 'he' ? 'יצירה'     : 'Generate',   icon: Sparkles },
    { key: 'analyze',    label: language === 'he' ? 'ניתוח'     : 'Analyze',    icon: Search   },
    { key: 'edit',       label: language === 'he' ? 'עריכה'     : 'Edit',       icon: Pencil   },
    { key: 'variations', label: language === 'he' ? 'וריאציות'  : 'Variations', icon: Layers   },
    { key: 'upload',     label: language === 'he' ? 'העלאה'     : 'Upload',     icon: Download }, // Download icon pointing down for upload
  ];

  const RATIOS: AspectRatio[] = ['1:1', '16:9', '9:16', '4:3', '3:4'];

  const TAG_LABELS: Record<string, string> = {
    shotType: language === 'he' ? 'סוג צילום' : 'Shot Type',
    style:    language === 'he' ? 'סגנון'     : 'Style',
    mood:     language === 'he' ? 'מצב רוח'  : 'Mood',
    background: language === 'he' ? 'רקע'    : 'Background',
    lighting: language === 'he' ? 'תאורה'    : 'Lighting',
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-purple-600" />
            <span className="font-bold text-gray-900 text-sm">Image Studio</span>
          </div>
          {/* Model Selector */}
          <div className="flex items-center gap-2">
            {IMAGE_MODELS.map(m => (
              <button key={m.value} onClick={() => setImageModel(m.value)}
                className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all',
                  imageModel === m.value
                    ? m.color === 'yellow' ? 'border-yellow-400 bg-yellow-50 text-yellow-700' : 'border-blue-400 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-400 hover:border-gray-300')}>
                <span className={cn('w-2 h-2 rounded-full', imageModel === m.value
                  ? m.color === 'yellow' ? 'bg-yellow-400' : 'bg-blue-400'
                  : 'bg-gray-300')} />
                {m.label}
                <span className={cn('text-[9px] font-black px-1 rounded',
                  m.badge === 'FAST' ? 'text-yellow-600' : 'text-blue-600')}>{m.badge}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {MODES.map(m => (
            <button key={m.key} onClick={() => setMode(m.key)}
              className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all',
                mode === m.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
              <m.icon className="w-3.5 h-3.5" />
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Body: Left settings + Right preview */}
      <div className="flex flex-1 overflow-hidden">
        {/* Settings panel */}
        <div className="w-[55%] border-e overflow-y-auto p-4 space-y-4">
          {/* Product info chip */}
          <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 rounded-xl">
            <div className="w-1 h-8 bg-indigo-400 rounded-full" />
            <div>
              <p className="text-xs font-semibold text-indigo-800 truncate">{product.name}</p>
              <p className="text-[10px] text-indigo-500">{product.brand} · {product.itemId}</p>
            </div>
          </div>

          {/* Aspect Ratio */}
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Aspect Ratio</p>
            <div className="flex gap-1.5 flex-wrap">
              {RATIOS.map(r => (
                <button key={r} onClick={() => setAspectRatio(r)}
                  className={cn('px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all',
                    aspectRatio === r ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300')}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Mode-specific inputs */}
          {mode === 'edit' && (
            <div>
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Edit Instruction</p>
              <textarea rows={3} value={editInstruction} onChange={e => setEditInstruction(e.target.value)}
                placeholder={language === 'he' ? 'תאר את השינוי הרצוי...' : 'Describe the edit (e.g. white background, remove shadows)...'}
                className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none" />
            </div>
          )}

          {(mode === 'generate' || mode === 'variations') && (
            <>
              {/* Custom prompt */}
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">Prompt(s)</p>
                <textarea rows={3} value={customPrompt} onChange={e => setCustomPrompt(e.target.value)}
                  placeholder={language === 'he' ? 'הוסף תיאור נוסף (אופציונלי)...' : 'Add extra description (optional)...'}
                  className="w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-purple-500 outline-none resize-none" />
                {/* Prompt preview chip */}
                {fullPrompt && (
                  <div className="mt-1 flex items-start gap-1">
                    <p className="text-[10px] text-gray-400 flex-1 line-clamp-2">{fullPrompt}</p>
                    <button onClick={() => { navigator.clipboard.writeText(fullPrompt); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                      className="flex-shrink-0 p-1 text-gray-300 hover:text-indigo-500 transition-colors">
                      {copied ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                )}
              </div>

              {/* Prompt Builder */}
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Prompt Builder</p>
                <div className="space-y-3">
                  {Object.entries(PROMPT_TAGS).map(([group, tags]) => (
                    <div key={group}>
                      <p className="text-[10px] text-gray-500 font-semibold mb-1.5">{TAG_LABELS[group]}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map(tag => {
                          const active = selectedTags[group]?.includes(tag);
                          return (
                            <button key={tag} onClick={() => toggleTag(group, tag)}
                              className={cn('px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all',
                                active ? 'bg-purple-100 border-purple-300 text-purple-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700')}>
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {mode === 'analyze' && (
            <div className="p-4 bg-blue-50 rounded-xl text-sm text-blue-700 font-medium">
              {language === 'he'
                ? 'ניתוח התמונה הקיימת של המוצר באמצעות Gemini Vision — קבל מידע על השעון, הסגנון, החומרים ועוד.'
                : 'Analyze the existing product image using Gemini Vision — get watch details, style, materials, and more.'}
            </div>
          )}
          
          {mode === 'upload' && (
            <div className="p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 text-center">
              <p className="text-sm text-gray-500 font-medium">
                {language === 'he' ? 'במצב העלאה, פשוט גרור תמונה לאזור התצוגה משמאל, או לחץ עליו כדי לבחור קובץ להעלאה ידנית.' : 'In Upload mode, simply drag an image to the preview area on the right, or click it to select a file for manual upload.'}
              </p>
            </div>
          )}
        </div>

        {/* Preview panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Preview area */}
          <div {...(mode === 'upload' || mode === 'variations' ? getDropProps() : {})} className={cn("flex-1 flex items-center justify-center bg-gray-50 p-4 transition-all relative", (mode === 'upload' || mode === 'variations') && "cursor-pointer hover:bg-gray-100", isDropActive && "bg-indigo-50 border-2 border-indigo-400 border-dashed")}>
            {(mode === 'upload' || mode === 'variations') && <input {...getDropInputProps()} />}
            {isUploading ? (
              <div className="text-center absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10">
                <Loader2 className="w-12 h-12 text-indigo-500 mx-auto mb-3 animate-spin" />
                <p className="text-sm font-semibold text-indigo-600">{language === 'he' ? 'מעלה תמונה...' : 'Uploading...'}</p>
              </div>
            ) : isLoading ? (
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-purple-500 mx-auto mb-3 animate-spin" />
                <p className="text-sm text-gray-500 font-medium animate-pulse">
                  {mode === 'analyze' ? (language === 'he' ? 'מנתח תמונה...' : 'Analyzing image...') :
                   mode === 'edit'    ? (language === 'he' ? 'עורך תמונה...' : 'Editing image...') :
                                        (language === 'he' ? 'מייצר תמונה...' : 'Generating image...')}
                </p>
              </div>
            ) : result ? (
              <div className="relative group w-full h-full flex items-center justify-center">
                <img src={result} alt="Generated" className={cn(
                  'rounded-xl shadow-xl object-contain',
                  aspectRatio === '1:1'  ? 'max-w-full max-h-full aspect-square' :
                  aspectRatio === '16:9' ? 'w-full' : 'h-full'
                )} />
                <div className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-xl">
                  <button onClick={() => window.open(result, '_blank')}
                    className="p-2.5 bg-white/90 rounded-full shadow-lg hover:bg-white transition-colors" title="View full size">
                    <ZoomIn className="w-5 h-5 text-gray-700" />
                  </button>
                  <button onClick={() => onImageSaved(result)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-full font-semibold text-sm shadow-lg hover:bg-indigo-700 transition-all">
                    <Save className="w-4 h-4" />
                    {language === 'he' ? 'שמור למוצר' : 'Save to Product'}
                  </button>
                  <button onClick={() => { setResult(null); handleGenerate(); }}
                    className="p-2.5 bg-white/90 rounded-full shadow-lg hover:bg-white transition-colors" title="Regenerate">
                    <RotateCcw className="w-5 h-5 text-gray-700" />
                  </button>
                </div>
              </div>
            ) : analysisText ? (
              <div className="w-full h-full overflow-y-auto p-4">
                <div className="bg-white rounded-xl p-4 shadow-sm border text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {analysisText}
                </div>
              </div>
            ) : existingImages[0] && mode !== 'generate' ? (
              <div className="relative group w-full h-full flex items-center justify-center">
                <img src={existingImages[0]} alt="Existing" className="max-w-full max-h-full rounded-xl shadow-lg object-contain" />
                <div className="absolute inset-0 bg-black/30 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-sm font-semibold bg-black/40 px-4 py-2 rounded-full">
                    {language === 'he' ? 'תמונה קיימת' : 'Existing Image'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-300 pointer-events-none">
                <ImageIcon className="w-16 h-16 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">
                  {mode === 'upload' || mode === 'variations' 
                    ? (language === 'he' ? 'גרור תמונה לכאן או לחץ להעלאה' : 'Drag image here or click to upload')
                    : (language === 'he' ? 'מוכן ליצירה' : 'Ready to Create')}
                </p>
                {mode !== 'upload' && mode !== 'variations' && (
                  <p className="text-xs text-gray-400 mt-1">
                    {language === 'he' ? 'בחר הגדרות ולחץ ייצור' : 'Select settings and click Generate'}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Generate button */}
          {mode !== 'upload' && (
            <div className="p-4 border-t bg-white relative z-20">
              <button onClick={handleGenerate} disabled={isLoading || isUploading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-purple-200 hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
                {isLoading ? (language === 'he' ? 'מעבד...' : 'Processing...') :
                 mode === 'analyze' ? (language === 'he' ? 'נתח תמונה' : 'Analyze Image') :
                 mode === 'edit'    ? (language === 'he' ? 'ערוך תמונה' : 'Edit Image') :
                 mode === 'variations' ? (language === 'he' ? 'יצור וריאציה' : 'Generate Variation') :
                 (language === 'he' ? 'יצור תמונה' : 'Generate Image')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function EshopPipeline({ language, settings, onSaveToInventory }: EshopPipelineProps) {
  const t = translations[language] as any;
  const isRTL = language === 'he';

  const [step, setStep] = useState<PipelineStep>('import');
  const [products, setProducts] = useState<EshopProduct[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [isEnriching, setIsEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState<EnrichProgress>({ current: 0, total: 0, currentName: '' });
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<EshopProduct | null>(null);  // detail panel
  const [selectedForImage, setSelectedForImage] = useState<EshopProduct | null>(null); // image studio
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
  const [writingStyle, setWritingStyle] = useState('marketing');
  const [page, setPage] = useState(0);
  const [selectedExportIds, setSelectedExportIds] = useState<Set<number>>(new Set());
  const [selectedEnrichIds, setSelectedEnrichIds] = useState<Set<number>>(new Set());
  const [isPushing, setIsPushing] = useState(false);
  const [pushResults, setPushResults] = useState<Record<string, PushResultRow>>({});
  const [pushSummary, setPushSummary] = useState<PushSummary | null>(null);
  const PAGE_SIZE = 20;
  const runningRef = useRef(false);

  const brands = React.useMemo(() => Array.from(new Set(products.map(p => p.brand).filter(Boolean))).sort(), [products]);
  const filteredProducts = React.useMemo(() => brandFilter ? products.filter(p => p.brand === brandFilter) : products, [products, brandFilter]);
  const toEnrich = React.useMemo(() => filteredProducts.filter(p => needsEnrichment(p) && p._status !== 'done' && p._status !== 'skipped'), [filteredProducts]);
  const noImages = React.useMemo(() => filteredProducts.filter(p => !p.images?.trim()), [filteredProducts]);
  const doneCount    = filteredProducts.filter(p => p._status === 'done').length;
  const skippedCount = filteredProducts.filter(p => p._status === 'skipped').length;
  const errorCount   = filteredProducts.filter(p => p._status === 'error').length;
  const pageProducts = filteredProducts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages   = Math.ceil(filteredProducts.length / PAGE_SIZE);

  // ── File import ──────────────────────────────────────────────────────────────
  const onDrop = useCallback(async (files: File[]) => {
    if (!files[0]) return;
    setIsParsing(true); setParseError('');
    try {
      const fd = new FormData(); fd.append('file', files[0]);
      const r = await fetch('/api/eshop/parse', { method: 'POST', body: fd });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || `HTTP ${r.status}`); }
      const parsed: EshopProduct[] = await r.json();
      setProducts(parsed); setPage(0); setBrandFilter('');
    } catch (err: any) { setParseError(err.message || 'Parse failed'); }
    finally { setIsParsing(false); }
  }, []);

  // @ts-expect-error react-dropzone type mismatch
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    multiple: false, disabled: isParsing,
  });

  // ── Duplicate check before moving to enrich step ────────────────────────────
  const proceedToEnrich = async () => {
    setIsCheckingDuplicates(true);
    setDuplicateCount(0);
    try {
      const itemIds = products.map(p => p.itemId).filter(Boolean);
      const r = await fetch('/api/eshop/check-existing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds }),
      });
      if (r.ok) {
        const { existing }: { existing: string[] } = await r.json();
        if (existing.length > 0) {
          const existingSet = new Set(existing);
          setProducts(prev => prev.map(p =>
            existingSet.has(p.itemId) ? { ...p, _status: 'skipped' } : p
          ));
          setDuplicateCount(existing.length);
        }
      }
    } catch {
      // silently continue — duplicate check is best-effort
    } finally {
      setIsCheckingDuplicates(false);
      setStep('enrich');
    }
  };

  // ── Enrichment ───────────────────────────────────────────────────────────────
  const startEnrichment = async () => {
    runningRef.current = true; setIsEnriching(true);
    let queue = filteredProducts.filter(p => p._status !== 'done' && p._status !== 'skipped');
    if (selectedEnrichIds.size > 0) {
      queue = queue.filter(p => selectedEnrichIds.has(p._idx));
    } else {
      queue = queue.filter(p => needsEnrichment(p));
    }
    setEnrichProgress({ current: 0, total: queue.length, currentName: '' });
    for (let i = 0; i < queue.length; i++) {
      if (!runningRef.current) break;
      const product = queue[i];
      setEnrichProgress({ current: i + 1, total: queue.length, currentName: product.name });
      setProducts(prev => prev.map(p => p._idx === product._idx ? { ...p, _status: 'enriching' } : p));
      try {
        const r = await fetch('/api/eshop/enrich-product', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product, language, settings, model: selectedModel, writingStyle }),
        });
        const enriched: EshopProduct = await r.json();
        setProducts(prev => prev.map(p => p._idx === product._idx ? enriched : p));
      } catch {
        setProducts(prev => prev.map(p => p._idx === product._idx ? { ...p, _status: 'error', _error: 'Network error' } : p));
      }
      await new Promise(res => setTimeout(res, 400));
    }
    runningRef.current = false; setIsEnriching(false);
  };

  const updateProduct = (updated: EshopProduct) =>
    setProducts(prev => prev.map(p => p._idx === updated._idx ? updated : p));

  const handleImageSaved = (product: EshopProduct, url: string) => {
    const updated = { ...product, images: product.images ? product.images + url + ';' : url + ';' };
    setProducts(prev => prev.map(p => p._idx === product._idx ? updated : p));
    setSelectedForImage(updated);
  };

  const handleDownloadCSV = () => {
    const csv = generateEshopCSV(filteredProducts, window.location.origin);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `eshop-enriched-${brandFilter || 'all'}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ── Push to e-shops.co.il (upsert via REST API) ─────────────────────────────
  const toPushableProduct = (p: EshopProduct) => {
    // Absolutize relative image URLs the same way the CSV export does.
    const origin = window.location.origin;
    const absImages = (p.images || '')
      .split(';')
      .map(s => s.trim())
      .filter(Boolean)
      .map(u => u.startsWith('/') ? `${origin}${u}` : u)
      .join(';');
    return {
      itemId: p.itemId,
      name: p.name,
      brand: p.brand,
      manufacturer: p.manufacturer,
      modelNumber: p.modelNumber,
      description: p.description,
      shortDescription: p.shortDescription,
      category: p.category,
      subCategory: p.subCategory,
      regularPrice: p.regularPrice,
      salePrice: p.salePrice,
      deliveryPrice: p.deliveryPrice,
      deliveryTime: p.deliveryTime,
      maxPayments: p.maxPayments,
      warranty: p.warranty,
      warrantyText: p.warrantyText,
      supplierName: p.supplierName,
      seoTitle: p.seoTitle,
      seoDescription: p.seoDescription,
      seoKeywords: p.seoKeywords,
      images: absImages,
      zapUrl: p.zapUrl,
      movement: p.movement,
      diameter: p.diameter,
      material: p.material,
      gender: p.gender,
      waterResistance: p.waterResistance,
      glass: p.glass,
      watchStyle: p.watchStyle,
      strapMaterial: p.strapMaterial,
      caseMaterial: p.caseMaterial,
      colors: p.colors,
    };
  };

  const handlePushToEshop = async (onlySelected = false) => {
    const source = onlySelected && selectedExportIds.size > 0
      ? filteredProducts.filter(p => selectedExportIds.has(p._idx))
      : filteredProducts;
    const payload = source.filter(p => p.itemId && p.name).map(toPushableProduct);
    if (!payload.length) return;

    setIsPushing(true);
    setPushSummary(null);
    try {
      const r = await fetch('/api/eshop/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: payload }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${r.status}`);
      }
      const data: { summary: PushSummary; results: PushResultRow[] } = await r.json();
      const next: Record<string, PushResultRow> = { ...pushResults };
      data.results.forEach(x => { if (x.itemId) next[x.itemId] = x; });
      setPushResults(next);
      setPushSummary(data.summary);
    } catch (err: any) {
      setPushSummary({ total: payload.length, added: 0, updated: 0, errors: payload.length });
      const next: Record<string, PushResultRow> = { ...pushResults };
      payload.forEach(p => { next[p.itemId] = { itemId: p.itemId, status: 'error', message: err.message }; });
      setPushResults(next);
    } finally {
      setIsPushing(false);
    }
  };

  const handleSaveSelectedToInventory = async () => {
    if (!onSaveToInventory) return;
    const selectedProductsArr = filteredProducts.filter(p => selectedExportIds.has(p._idx));
    if (selectedProductsArr.length === 0) return;
    const items = selectedProductsArr.map(mapEshopToProduct);
    await onSaveToInventory(items);
    setSelectedExportIds(new Set()); // clear after save
  };

  const toggleExportSelection = (idx: number) => {
    setSelectedExportIds(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleAllExportSelection = () => {
    if (selectedExportIds.size === pageProducts.length) {
      setSelectedExportIds(new Set());
    } else {
      setSelectedExportIds(new Set(pageProducts.map(p => p._idx)));
    }
  };

  const resetPipeline = () => { setProducts([]); setStep('import'); setPage(0); setBrandFilter(''); setSelectedProduct(null); setSelectedForImage(null); setEnrichProgress({ current: 0, total: 0, currentName: '' }); setSelectedExportIds(new Set()); };

  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="w-full h-full flex flex-col gap-5" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <ArrowRightLeft className="w-5 h-5 text-white" />
            </div>
            {t.eshopPipeline}
          </h2>
          <p className="text-sm text-gray-500 mt-1">{t.eshopPipelineSub}</p>
        </div>
        <StepIndicator current={step} language={language} />
      </div>

      {/* ── STEP 1: IMPORT ─────────────────────────────────────────────────────── */}
      {step === 'import' && (
        <div className="flex flex-col gap-5">
          <div {...getRootProps()} className={cn(
            'border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all',
            isDragActive ? 'border-indigo-500 bg-indigo-50 scale-[1.01]' : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/30',
            isParsing && 'pointer-events-none opacity-60'
          )}>
            <input {...getInputProps()} />
            {isParsing ? (
              <><Loader2 className="w-12 h-12 text-indigo-500 mx-auto mb-4 animate-spin" /><p className="text-lg font-semibold text-indigo-700">{t.parsing}</p></>
            ) : (
              <><div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><FileText className="w-8 h-8 text-indigo-600" /></div>
              <p className="text-lg font-semibold text-gray-700">{t.dropCsvHere}</p>
              <p className="text-sm text-gray-400 mt-2">{t.dropCsvSub}</p></>
            )}
          </div>

          {parseError && <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700"><AlertCircle className="w-5 h-5 flex-shrink-0" /><span className="text-sm font-medium">{parseError}</span></div>}

          {products.length > 0 && (
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <div className="p-5 border-b bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-6">
                  {[
                    { val: filteredProducts.length, label: t.productsLoaded, color: 'indigo' },
                    { val: filteredProducts.filter(p => needsEnrichment(p) && p._status !== 'skipped').length, label: t.needsEnrichment, color: 'orange' },
                    { val: filteredProducts.filter(p => !needsEnrichment(p)).length, label: t.allGood, color: 'green' },
                    ...(duplicateCount > 0 ? [{ val: duplicateCount, label: language === 'he' ? 'קיים במלאי' : 'Already in DB', color: 'gray' }] : []),
                  ].map(({ val, label, color }) => (
                    <div key={label} className="text-center">
                      <p className={cn('text-2xl font-black', color === 'indigo' ? 'text-indigo-700' : color === 'orange' ? 'text-orange-600' : color === 'gray' ? 'text-gray-500' : 'text-green-600')}>{val}</p>
                      <p className="text-xs text-gray-500 font-medium">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <select value={brandFilter} onChange={e => { setBrandFilter(e.target.value); setPage(0); }}
                    className="px-3 py-1.5 text-sm border rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="">{t.allBrands} ({products.length})</option>
                    {brands.map(b => <option key={b} value={b}>{b} ({products.filter(p => p.brand === b).length})</option>)}
                  </select>
                  {brandFilter && <button onClick={() => setBrandFilter('')} className="p-1 text-gray-400 hover:text-red-500 transition-colors"><X className="w-4 h-4" /></button>}
                </div>
              </div>
              <div className="overflow-auto max-h-64">
                <table className="w-full text-xs" dir={isRTL ? 'rtl' : 'ltr'}>
                  <thead className="sticky top-0 bg-gray-50 border-b">
                    <tr>{['SKU', t.productName, t.brand, t.description, 'SEO', t.filters].map(h => (
                      <th key={h} className={cn('px-4 py-3 font-semibold text-gray-500 uppercase tracking-wider', isRTL ? 'text-right' : 'text-left')}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pageProducts.map(p => (
                      <tr key={p._idx} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-gray-400">{p.itemId}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-800 max-w-[160px] truncate">{p.name}</td>
                        <td className="px-4 py-2.5 text-indigo-600 font-semibold">{p.brand}</td>
                        <td className="px-4 py-2.5"><span className={cn('px-2 py-0.5 rounded text-[10px] font-medium', p.description ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-500')}>{p.description ? '✓' : '✗ ' + t.description}</span></td>
                        <td className="px-4 py-2.5"><span className={cn('px-2 py-0.5 rounded text-[10px] font-medium', p.seoTitle ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-500')}>{p.seoTitle ? '✓ SEO' : '✗ SEO'}</span></td>
                        <td className="px-4 py-2.5">
                          <div className="flex gap-1">{[p.movement, p.material, p.gender].map((v, i) => (
                            <span key={i} className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', v ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-400')}>
                              {v ? v.substring(0, 8) : '✗'}
                            </span>
                          ))}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="p-3 border-t bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                  <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border rounded-lg hover:bg-white disabled:opacity-40">‹ Prev</button>
                  <span>{page + 1} / {totalPages}</span>
                  <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border rounded-lg hover:bg-white disabled:opacity-40">Next ›</button>
                </div>
              )}
              <div className="p-5 border-t flex items-center justify-between gap-4">
                {duplicateCount > 0 && (
                  <span className="text-xs text-gray-500 flex items-center gap-1.5">
                    <SkipForward className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-semibold text-gray-700">{duplicateCount}</span>
                    {language === 'he' ? 'מוצרים קיימים יסומנו כ-Skip אוטומטית' : 'existing products will be skipped automatically'}
                  </span>
                )}
                <button
                  onClick={proceedToEnrich}
                  disabled={isCheckingDuplicates}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-md shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ms-auto"
                >
                  {isCheckingDuplicates ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> {language === 'he' ? 'בודק כפילויות...' : 'Checking duplicates...'}</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> {t.proceedToEnrich}</>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: ENRICH ─────────────────────────────────────────────────────── */}
      {step === 'enrich' && (
        <div className="flex flex-col gap-5">
          {/* Config row */}
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4 text-indigo-500" />{t.enrichSettings}</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t.filterByBrandLabel}</label>
                <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">{t.allBrands}</option>
                  {brands.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t.aiModel}</label>
                <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                  {ENRICH_MODELS.map(m => <option key={m.value} value={m.value}>[{m.badge}] {m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t.writingStyle}</label>
                <select value={writingStyle} onChange={e => setWritingStyle(e.target.value)} className="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="marketing">{t.styleMarketing}</option>
                  <option value="formal">{t.styleFormal}</option>
                  <option value="casual">{t.styleCasual}</option>
                  <option value="technical">{t.styleTechnical}</option>
                </select>
              </div>
              <div className="flex flex-col justify-center bg-indigo-50 rounded-xl px-4 py-3 text-center">
                <p className="text-2xl font-black text-indigo-700">{selectedEnrichIds.size > 0 ? selectedEnrichIds.size : toEnrich.length}</p>
                <p className="text-xs text-indigo-500 font-medium">{selectedEnrichIds.size > 0 ? (language === 'he' ? 'נבחרו להעשרה' : 'Selected') : t.needsEnrichment}</p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          {enrichProgress.total > 0 && (
            <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-700">{enrichProgress.current} / {enrichProgress.total}</span>
                {isEnriching && <span className="text-xs text-indigo-600 font-medium flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />{t.currentlyProcessing}: {enrichProgress.currentName.substring(0, 40)}...</span>}
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${enrichProgress.total ? (enrichProgress.current / enrichProgress.total) * 100 : 0}%` }} />
              </div>
              {!isEnriching && enrichProgress.current === enrichProgress.total && (
                <p className="text-sm text-green-600 font-semibold flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{t.enrichDone}</p>
              )}
            </div>
          )}

          {/* Products table + detail panel */}
          <div className={cn('flex gap-0 bg-white rounded-2xl border shadow-sm overflow-hidden', selectedProduct ? 'h-[480px]' : '')}>
            {/* Table */}
            <div className={cn('flex flex-col', selectedProduct ? 'w-[55%]' : 'w-full')}>
              <div className="overflow-auto flex-1">
                <table className="w-full text-xs" dir={isRTL ? 'rtl' : 'ltr'}>
                  <thead className="sticky top-0 bg-gray-50 border-b z-10">
                    <tr>
                      <th className="px-4 py-3"><input type="checkbox" checked={selectedEnrichIds.size > 0 && selectedEnrichIds.size === pageProducts.length} onChange={() => {
                        if (selectedEnrichIds.size === pageProducts.length) setSelectedEnrichIds(new Set());
                        else setSelectedEnrichIds(new Set(pageProducts.map(p => p._idx)));
                      }} className="rounded border-gray-300" /></th>
                      {['Status', 'SKU', t.productName, 'Missing', t.description].map(h => (
                      <th key={h} className={cn('px-4 py-3 font-semibold text-gray-500 uppercase', isRTL ? 'text-right' : 'text-left')}>{h}</th>
                    ))}<th className="px-4 py-3" /></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pageProducts.map(p => (
                      <tr key={p._idx} onClick={() => setSelectedProduct(prev => prev?._idx === p._idx ? null : p)}
                        className={cn('transition-colors cursor-pointer',
                          selectedProduct?._idx === p._idx ? 'bg-indigo-50 border-s-2 border-indigo-500' : 'hover:bg-gray-50',
                          p._status === 'enriching' && 'bg-blue-50', p._status === 'done' && 'bg-green-50/30', p._status === 'error' && 'bg-red-50/30')}>
                        <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedEnrichIds.has(p._idx)} onChange={() => {
                            setSelectedEnrichIds(prev => {
                              const next = new Set(prev);
                              if (next.has(p._idx)) next.delete(p._idx);
                              else next.add(p._idx);
                              return next;
                            });
                          }} className="rounded border-gray-300" />
                        </td>
                        <td className="px-4 py-2.5"><StatusBadge status={p._status} /></td>
                        <td className="px-4 py-2.5 font-mono text-gray-400">{p.itemId}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-800 max-w-[160px] truncate">{p.name}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold', countMissing(p) === 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700')}>
                            {countMissing(p) === 0 ? '✓ all' : `${countMissing(p)} fields`}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-400 max-w-[180px] truncate">{p.description ? p.description.substring(0, 55) + '…' : '—'}</td>
                        <td className="px-4 py-2.5">
                          <button onClick={e => { e.stopPropagation(); setSelectedProduct(prev => prev?._idx === p._idx ? null : p); }}
                            className="p-1.5 text-gray-300 hover:text-indigo-500 transition-colors rounded-lg hover:bg-indigo-50">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="p-3 border-t bg-gray-50 flex items-center justify-between text-xs text-gray-500 flex-shrink-0">
                  <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border rounded-lg hover:bg-white disabled:opacity-40">‹ Prev</button>
                  <span>{page + 1} / {totalPages}</span>
                  <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border rounded-lg hover:bg-white disabled:opacity-40">Next ›</button>
                </div>
              )}
            </div>

            {/* Detail panel (slides in) */}
            {selectedProduct && (
              <div className="flex-1 overflow-hidden">
                <ProductDetailPanel
                  product={selectedProduct}
                  language={language}
                  onSave={updated => { updateProduct(updated); setSelectedProduct(null); }}
                  onClose={() => setSelectedProduct(null)}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <button onClick={() => setStep('import')} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">← Back</button>
            <div className="flex items-center gap-3">
              {isEnriching ? (
                <button onClick={() => { runningRef.current = false; }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-yellow-500 text-white rounded-xl font-semibold hover:bg-yellow-600 transition-all active:scale-95">
                  <Pause className="w-4 h-4" />{t.pauseEnrichment}
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

      {/* ── STEP 3: IMAGE STUDIO ────────────────────────────────────────────────── */}
      {step === 'images' && (
        <div className="flex flex-col gap-5">
          {/* Stats row */}
          <div className="flex items-center justify-between bg-purple-50 rounded-xl px-5 py-3 border border-purple-100">
            <div className="flex items-center gap-6">
              <div className="text-center"><p className="text-xl font-black text-purple-700">{filteredProducts.length}</p><p className="text-xs text-purple-500">{t.productsLoaded}</p></div>
              <div className="text-center"><p className="text-xl font-black text-orange-600">{noImages.length}</p><p className="text-xs text-orange-500">{t.noImageProducts}</p></div>
              <div className="text-center"><p className="text-xl font-black text-green-600">{filteredProducts.length - noImages.length}</p><p className="text-xs text-green-500">{language === 'he' ? 'יש תמונות' : 'Has Images'}</p></div>
            </div>
            <div className="flex items-center gap-3">
              <select value={brandFilter} onChange={e => setBrandFilter(e.target.value)} className="px-3 py-1.5 text-sm border rounded-lg bg-white focus:ring-2 focus:ring-purple-500 outline-none">
                <option value="">{t.allBrands}</option>
                {brands.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          {/* Split layout: product list + Image Studio */}
          <div className="flex gap-4 h-[620px]">
            {/* Product list */}
            <div className="w-64 flex-shrink-0 bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col">
              <div className="p-3 border-b bg-gray-50">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider">{t.productsLoaded}</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {filteredProducts.map(p => {
                  const imgs = p.images?.split(';').filter(Boolean) ?? [];
                  const isSelected = selectedForImage?._idx === p._idx;
                  return (
                    <button key={p._idx} onClick={() => setSelectedForImage(p)}
                      className={cn('w-full flex items-center gap-3 p-3 border-b hover:bg-purple-50 transition-colors text-left',
                        isSelected && 'bg-purple-50 border-s-2 border-purple-500')}>
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {imgs[0] ? <img src={imgs[0]} alt="" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-gray-300 m-auto mt-2.5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-800 truncate">{p.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{p.itemId}</p>
                        <p className="text-[10px] text-indigo-500 font-semibold">{p.brand}</p>
                      </div>
                      {imgs.length > 0
                        ? <span className="flex-shrink-0 w-5 h-5 bg-green-100 rounded-full flex items-center justify-center text-green-600"><CheckCircle2 className="w-3 h-3" /></span>
                        : <span className="flex-shrink-0 w-5 h-5 bg-orange-100 rounded-full flex items-center justify-center text-orange-500"><ImageIcon className="w-3 h-3" /></span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Image Studio */}
            <div className="flex-1 overflow-hidden">
              {selectedForImage ? (
                <ImageStudio
                  product={selectedForImage}
                  language={language}
                  onImageSaved={(url) => handleImageSaved(selectedForImage, url)}
                />
              ) : (
                <div className="h-full flex items-center justify-center bg-white rounded-2xl border shadow-sm text-gray-300">
                  <div className="text-center">
                    <ImageIcon className="w-20 h-20 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-semibold text-gray-400">{language === 'he' ? 'בחר מוצר מהרשימה' : 'Select a product from the list'}</p>
                    <p className="text-sm text-gray-300 mt-1">{language === 'he' ? 'כדי לפתוח את Image Studio' : 'to open Image Studio'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <button onClick={() => setStep('enrich')} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">← Back</button>
            <button onClick={() => setStep('export')}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-md shadow-indigo-200 hover:shadow-lg transition-all active:scale-95">
              <SkipForward className="w-4 h-4" />{language === 'he' ? 'המשך לייצוא ←' : 'Proceed to Export →'}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: EXPORT ─────────────────────────────────────────────────────── */}
      {step === 'export' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: t.productsLoaded, value: filteredProducts.length, color: 'blue' },
              { label: t.enrichedCount, value: doneCount, color: 'green' },
              { label: t.skippedCount, value: skippedCount, color: 'gray' },
              { label: t.errorCount, value: errorCount, color: 'red' },
            ].map(({ label, value, color }) => (
              <div key={label} className={cn('rounded-2xl p-5 text-center border',
                color === 'blue' ? 'bg-blue-50 border-blue-100' : color === 'green' ? 'bg-green-50 border-green-100' : color === 'gray' ? 'bg-gray-50 border-gray-100' : 'bg-red-50 border-red-100')}>
                <p className={cn('text-3xl font-black',
                  color === 'blue' ? 'text-blue-700' : color === 'green' ? 'text-green-700' : color === 'gray' ? 'text-gray-600' : 'text-red-600')}>{value}</p>
                <p className="text-xs font-medium text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Push summary banner */}
          {pushSummary && (
            <div className={cn(
              "rounded-2xl border p-4 flex items-center justify-between flex-wrap gap-2",
              pushSummary.errors === 0 ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"
            )}>
              <div className="flex items-center gap-2 text-sm">
                {pushSummary.errors === 0
                  ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                  : <AlertCircle className="w-5 h-5 text-orange-600" />}
                <span className="font-semibold text-gray-800">
                  {t.pushSummary
                    .replace('{added}', String(pushSummary.added))
                    .replace('{updated}', String(pushSummary.updated))
                    .replace('{errors}', String(pushSummary.errors))}
                </span>
              </div>
              <button onClick={() => { setPushSummary(null); }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700">{t.exportReady}</p>
              <div className="flex items-center gap-3">
                {selectedExportIds.size > 0 && onSaveToInventory && (
                  <button onClick={handleSaveSelectedToInventory}
                    className="flex items-center gap-2 px-4 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-200 transition-colors">
                    <Save className="w-3.5 h-3.5" />
                    {language === 'he' ? 'שמור נבחרים למלאי' : 'Save Selected to Inventory'} ({selectedExportIds.size})
                  </button>
                )}
                {selectedExportIds.size > 0 && (
                  <button onClick={() => handlePushToEshop(true)} disabled={isPushing}
                    className="flex items-center gap-2 px-4 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {isPushing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CloudUpload className="w-3.5 h-3.5" />}
                    {t.pushSelected} ({selectedExportIds.size})
                  </button>
                )}
                <p className="text-xs text-gray-400">{filteredProducts.length} products → eShop CSV</p>
              </div>
            </div>
            <div className="overflow-auto max-h-64">
              <table className="w-full text-xs" dir={isRTL ? 'rtl' : 'ltr'}>
                <thead className="sticky top-0 bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3"><input type="checkbox" checked={selectedExportIds.size > 0 && selectedExportIds.size === pageProducts.length} onChange={toggleAllExportSelection} className="rounded border-gray-300" /></th>
                    {['SKU', t.productName, 'Status', t.description, 'SEO Title', t.movement, 'Images', 'eShop'].map(h => (
                      <th key={h} className={cn('px-4 py-3 font-semibold text-gray-500 uppercase', isRTL ? 'text-right' : 'text-left')}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pageProducts.map(p => {
                    const pr = pushResults[p.itemId];
                    return (
                    <tr key={p._idx} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => toggleExportSelection(p._idx)}>
                      <td className="px-4 py-2.5">
                        <input type="checkbox" checked={selectedExportIds.has(p._idx)} onChange={() => toggleExportSelection(p._idx)} onClick={e => e.stopPropagation()} className="rounded border-gray-300" />
                      </td>
                      <td className="px-4 py-2.5 font-mono text-gray-400">{p.itemId}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-800 max-w-[160px] truncate">{p.name}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={p._status} /></td>
                      <td className="px-4 py-2.5 max-w-[200px] truncate text-gray-500">{p.description ? p.description.substring(0, 50) + '…' : '—'}</td>
                      <td className="px-4 py-2.5 max-w-[150px] truncate text-gray-500">{p.seoTitle || '—'}</td>
                      <td className="px-4 py-2.5 text-gray-500">{p.movement || '—'}</td>
                      <td className="px-4 py-2.5">
                        {p.images ? <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold">✓ {p.images.split(';').filter(Boolean).length}</span> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        {!pr ? (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-400 rounded-full text-[10px] font-bold">{t.eshopStatusNone}</span>
                        ) : pr.status === 'added' ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-bold">+ {t.eshopStatusAdded}</span>
                        ) : pr.status === 'updated' ? (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold">↻ {t.eshopStatusUpdated}</span>
                        ) : (
                          <span title={pr.message || ''} className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold">✗ {t.eshopStatusError}</span>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="p-3 border-t bg-gray-50 flex items-center justify-between text-xs text-gray-500">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border rounded-lg hover:bg-white disabled:opacity-40">‹ Prev</button>
                <span>{page + 1} / {totalPages}</span>
                <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border rounded-lg hover:bg-white disabled:opacity-40">Next ›</button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <button onClick={resetPipeline} className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
              <RefreshCw className="w-4 h-4" />{t.backToImport}
            </button>
            <div className="flex items-center gap-3 flex-wrap">
              <button onClick={handleDownloadCSV}
                className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-indigo-200 text-indigo-700 rounded-xl font-bold hover:bg-indigo-50 transition-all active:scale-95 text-sm">
                <Download className="w-5 h-5" />{t.downloadEshopCsv}
                <span className="px-2 py-0.5 bg-indigo-100 rounded-full text-xs">{filteredProducts.length}</span>
              </button>
              <button onClick={() => handlePushToEshop(false)} disabled={isPushing || filteredProducts.length === 0}
                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-purple-200 hover:shadow-xl transition-all active:scale-95 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                {isPushing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CloudUpload className="w-5 h-5" />}
                {isPushing ? t.pushing : t.pushToEshop}
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {selectedExportIds.size > 0 ? selectedExportIds.size : filteredProducts.length}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
