import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  X, Upload, Image as ImageIcon, Sparkles, Link, Copy, Check, Loader2,
  Download, ChevronLeft, ChevronRight, Lock, ZoomIn,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, CompanySettings } from '../types';
import { cn } from '../lib/utils';
import { generateProductContent } from '../services/geminiService';
import { translations, Language } from '../i18n';
import {
  MECHANISMS, GENDERS, WATER_RESISTANCES, GLASS_TYPES,
  WATCH_STYLES, STRAP_MATERIALS, CASE_MATERIALS, COLORS,
} from '../constants/taxonomy';

interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Product) => void;
  language: Language;
  settings: CompanySettings;
  readOnly?: boolean;
  role?: string;
}

export function ProductModal({ product, isOpen, onClose, onSave, language, settings, readOnly = false, role }: ProductModalProps) {
  const t = translations[language];
  const [editedProduct, setEditedProduct] = React.useState<Product | null>(null);
  const [copiedType, setCopiedType] = React.useState<'clean' | 'formatted' | null>(null);
  const [uploadingCount, setUploadingCount] = React.useState(0);
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [lightboxIdx, setLightboxIdx] = React.useState(0);

  React.useEffect(() => {
    if (product) setEditedProduct({ ...product });
  }, [product]);

  // Close lightbox on Escape key
  React.useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false);
      if (e.key === 'ArrowLeft') setLightboxIdx(i => (i - 1 + (editedProduct?.images.length || 1)) % (editedProduct?.images.length || 1));
      if (e.key === 'ArrowRight') setLightboxIdx(i => (i + 1) % (editedProduct?.images.length || 1));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxOpen, editedProduct]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setUploadingCount(c => c + acceptedFiles.length);
    acceptedFiles.forEach(async (file) => {
      try {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert('שגיאה בהעלאת תמונה: ' + (err.error || res.statusText));
          return;
        }
        const { url } = await res.json();
        setEditedProduct((prev) => {
          if (!prev) return null;
          return { ...prev, images: [...prev.images, url] };
        });
      } finally {
        setUploadingCount(c => c - 1);
      }
    });
  }, []);

  // @ts-expect-error - react-dropzone type mismatch
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [], 'image/gif': [], 'image/avif': [] },
    multiple: true,
    maxSize: 20 * 1024 * 1024,
    disabled: readOnly,
  });

  const validatePrice = (price: string) => {
    if (!price) return true;
    const hasNumber = /\d/.test(price);
    const onlyAllowedChars = /^[₪$\d,.\s]+$/.test(price);
    return hasNumber && onlyAllowedChars;
  };

  const handleSave = () => {
    const fieldsToValidate = [
      { name: t.price, value: editedProduct.price },
      { name: t.zapPrice, value: editedProduct.zapPrice || '' },
      { name: t.targetPrice, value: editedProduct.targetPrice || '' },
      { name: t.minPrice, value: editedProduct.minPrice || '' },
    ];
    const invalidFields = fieldsToValidate.filter(f => f.value && !validatePrice(f.value));
    if (invalidFields.length > 0) {
      const fieldNames = invalidFields.map(f => f.name).join(', ');
      alert(language === 'he'
        ? `פורמט מחיר לא תקין בשדות: ${fieldNames}. יש להשתמש במספרים (ניתן להוסיף ₪/$).`
        : `Invalid price format in: ${fieldNames}. Use numbers (optionally with ₪/$).`);
      return;
    }
    onSave(editedProduct);
  };

  const handleCopy = (type: 'clean' | 'formatted') => {
    if (!editedProduct) return;
    let text = editedProduct.description || '';
    if (type === 'clean') text = text.replace(/[*#_~`>]/g, '').replace(/\n+/g, '\n').trim();
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const copyField = (value: string) => {
    navigator.clipboard.writeText(value || '');
  };

  const openLightbox = (idx: number) => {
    setLightboxIdx(idx);
    setLightboxOpen(true);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLightboxIdx(i => (i - 1 + (editedProduct?.images.length || 1)) % (editedProduct?.images.length || 1));
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLightboxIdx(i => (i + 1) % (editedProduct?.images.length || 1));
  };

  if (!editedProduct) return null;

  // Shared input class depending on readOnly
  const inputClass = cn(
    "w-full px-4 py-2 border rounded-lg outline-none transition-all text-sm",
    readOnly
      ? "bg-gray-50 text-gray-700 cursor-default select-text focus:ring-0 border-gray-200"
      : "focus:ring-2 focus:ring-blue-500"
  );
  const smallInputClass = cn(
    "w-full px-3 py-1.5 border rounded-lg text-sm outline-none transition-all",
    readOnly
      ? "bg-gray-50 text-gray-700 cursor-default select-text focus:ring-0 border-gray-200"
      : "focus:ring-2 focus:ring-blue-500"
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          dir={language === 'he' ? 'rtl' : 'ltr'}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className={cn(
              "p-6 border-b flex justify-between items-center",
              readOnly ? "bg-purple-50/60" : "bg-gray-50"
            )}>
              <div className="flex items-center gap-3">
                {readOnly && <Lock className="w-4 h-4 text-purple-500" />}
                <h2 className="text-xl font-semibold text-gray-900">{t.editProduct}</h2>
                {readOnly && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-purple-100 text-purple-700 rounded-full">
                    {(t as any).viewOnly}
                  </span>
                )}
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  {/* General Info */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-2">{t.editProduct}</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t.productName}</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={editedProduct.name}
                          onChange={(e) => !readOnly && setEditedProduct({ ...editedProduct, name: e.target.value })}
                          readOnly={readOnly}
                          className={inputClass}
                        />
                        {readOnly && (
                          <button onClick={() => copyField(editedProduct.name)} className="absolute top-1/2 -translate-y-1/2 end-2 p-1 text-gray-400 hover:text-blue-600 transition-colors" title={(t as any).copyText}>
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.sku}</label>
                        <input
                          type="text"
                          value={editedProduct.sku}
                          onChange={(e) => !readOnly && setEditedProduct({ ...editedProduct, sku: e.target.value })}
                          readOnly={readOnly}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.modelNumber}</label>
                        <input
                          type="text"
                          value={editedProduct.modelNumber}
                          onChange={(e) => !readOnly && setEditedProduct({ ...editedProduct, modelNumber: e.target.value })}
                          readOnly={readOnly}
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.category}</label>
                        <input
                          type="text"
                          value={editedProduct.category}
                          onChange={(e) => !readOnly && setEditedProduct({ ...editedProduct, category: e.target.value })}
                          readOnly={readOnly}
                          className={inputClass}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{(t as any).status}</label>
                        {readOnly ? (
                          <div className={inputClass}>{t[editedProduct.status as keyof typeof t] || editedProduct.status}</div>
                        ) : (
                          <select
                            value={editedProduct.status}
                            onChange={(e) => setEditedProduct({ ...editedProduct, status: e.target.value as any })}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                          >
                            <option value="draft">{t.draft}</option>
                            <option value="ready">{t.ready}</option>
                            <option value="published">{t.published}</option>
                          </select>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-2">{t.price}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.price}</label>
                        <input type="text" value={editedProduct.price}
                          onChange={(e) => !readOnly && setEditedProduct({ ...editedProduct, price: e.target.value })}
                          readOnly={readOnly} className={inputClass} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.minPrice}</label>
                        <input type="text" value={editedProduct.minPrice || ''}
                          onChange={(e) => !readOnly && setEditedProduct({ ...editedProduct, minPrice: e.target.value })}
                          readOnly={readOnly} className={inputClass} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.zapPrice}</label>
                        <input type="text" value={editedProduct.zapPrice || ''}
                          onChange={(e) => !readOnly && setEditedProduct({ ...editedProduct, zapPrice: e.target.value })}
                          readOnly={readOnly}
                          className={cn(inputClass, !readOnly && "border-orange-200 bg-orange-50/30 focus:ring-orange-500")} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.targetPrice}</label>
                        <input type="text" value={editedProduct.targetPrice || ''}
                          onChange={(e) => !readOnly && setEditedProduct({ ...editedProduct, targetPrice: e.target.value })}
                          readOnly={readOnly}
                          className={cn(inputClass, !readOnly && "border-green-200 bg-green-50/30 focus:ring-green-500 font-bold")} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <Link className="w-3.5 h-3.5 text-blue-600" />
                        {t.zapLink}
                      </label>
                      {readOnly && editedProduct.zapLink ? (
                        <a href={editedProduct.zapLink} target="_blank" rel="noopener noreferrer"
                          className="block w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg text-xs text-blue-600 hover:underline truncate">
                          {editedProduct.zapLink}
                        </a>
                      ) : (
                        <input type="text" value={editedProduct.zapLink || ''}
                          onChange={(e) => !readOnly && setEditedProduct({ ...editedProduct, zapLink: e.target.value })}
                          readOnly={readOnly}
                          placeholder="https://www.zap.co.il/model.aspx?modelid=..."
                          className={cn(inputClass, "text-xs")} />
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Technical Specs */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-2">{t.filters}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Movement */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.movement}</label>
                        {readOnly ? (
                          <div className={smallInputClass}>{MECHANISMS.find(m => m.key === editedProduct.movement)?.name || editedProduct.movement || '—'}</div>
                        ) : (
                          <select value={editedProduct.movement || ''} onChange={e => setEditedProduct({ ...editedProduct, movement: e.target.value })} className={smallInputClass}>
                            <option value="">{language === 'he' ? 'בחר מנגנון' : 'Select movement'}</option>
                            {MECHANISMS.map(m => <option key={m.key} value={m.key}>{m.name}</option>)}
                          </select>
                        )}
                      </div>
                      {/* Diameter — free text (measurement) */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.diameter}</label>
                        <input type="text" value={editedProduct.diameter || ''}
                          onChange={e => !readOnly && setEditedProduct({ ...editedProduct, diameter: e.target.value })}
                          readOnly={readOnly} className={smallInputClass} placeholder={'42 מ"מ'} />
                      </div>
                      {/* Water Resistance */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.waterResistance}</label>
                        {readOnly ? (
                          <div className={smallInputClass}>{WATER_RESISTANCES.find(w => w.key === editedProduct.waterResistance)?.name || editedProduct.waterResistance || '—'}</div>
                        ) : (
                          <select value={editedProduct.waterResistance || ''} onChange={e => setEditedProduct({ ...editedProduct, waterResistance: e.target.value })} className={smallInputClass}>
                            <option value="">{language === 'he' ? 'בחר עמידות' : 'Select resistance'}</option>
                            {WATER_RESISTANCES.map(w => <option key={w.key} value={w.key}>{w.name}</option>)}
                          </select>
                        )}
                      </div>
                      {/* Glass */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.glass}</label>
                        {readOnly ? (
                          <div className={smallInputClass}>{GLASS_TYPES.find(g => g.key === editedProduct.glass)?.name || editedProduct.glass || '—'}</div>
                        ) : (
                          <select value={editedProduct.glass || ''} onChange={e => setEditedProduct({ ...editedProduct, glass: e.target.value })} className={smallInputClass}>
                            <option value="">{language === 'he' ? 'בחר זכוכית' : 'Select glass'}</option>
                            {GLASS_TYPES.map(g => <option key={g.key} value={g.key}>{g.name}</option>)}
                          </select>
                        )}
                      </div>
                      {/* Gender */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.gender}</label>
                        {readOnly ? (
                          <div className={smallInputClass}>{GENDERS.find(g => g.key === editedProduct.gender)?.name || editedProduct.gender || '—'}</div>
                        ) : (
                          <select value={editedProduct.gender || ''} onChange={e => setEditedProduct({ ...editedProduct, gender: e.target.value as any })} className={smallInputClass}>
                            <option value="">{language === 'he' ? 'בחר מגדר' : 'Select gender'}</option>
                            {GENDERS.map(g => <option key={g.key} value={g.key}>{g.name}</option>)}
                          </select>
                        )}
                      </div>
                      {/* Watch Style */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{(t as any).watchStyle}</label>
                        {readOnly ? (
                          <div className={smallInputClass}>{WATCH_STYLES.find(s => s.key === editedProduct.watchStyle)?.name || editedProduct.watchStyle || '—'}</div>
                        ) : (
                          <select value={editedProduct.watchStyle || ''} onChange={e => setEditedProduct({ ...editedProduct, watchStyle: e.target.value })} className={smallInputClass}>
                            <option value="">{language === 'he' ? 'בחר סגנון' : 'Select style'}</option>
                            {WATCH_STYLES.map(s => <option key={s.key} value={s.key}>{s.name}</option>)}
                          </select>
                        )}
                      </div>
                      {/* Strap Material */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{(t as any).strapMaterial}</label>
                        {readOnly ? (
                          <div className={smallInputClass}>{STRAP_MATERIALS.find(m => m.key === editedProduct.strapMaterial)?.name || editedProduct.strapMaterial || '—'}</div>
                        ) : (
                          <select value={editedProduct.strapMaterial || ''} onChange={e => setEditedProduct({ ...editedProduct, strapMaterial: e.target.value })} className={smallInputClass}>
                            <option value="">{language === 'he' ? 'בחר חומר רצועה' : 'Select strap material'}</option>
                            {STRAP_MATERIALS.map(m => <option key={m.key} value={m.key}>{m.name}</option>)}
                          </select>
                        )}
                      </div>
                      {/* Case Material */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{(t as any).caseMaterial}</label>
                        {readOnly ? (
                          <div className={smallInputClass}>{CASE_MATERIALS.find(m => m.key === editedProduct.caseMaterial)?.name || editedProduct.caseMaterial || '—'}</div>
                        ) : (
                          <select value={editedProduct.caseMaterial || ''} onChange={e => setEditedProduct({ ...editedProduct, caseMaterial: e.target.value })} className={smallInputClass}>
                            <option value="">{language === 'he' ? 'בחר חומר קייס' : 'Select case material'}</option>
                            {CASE_MATERIALS.map(m => <option key={m.key} value={m.key}>{m.name}</option>)}
                          </select>
                        )}
                      </div>
                    </div>
                    {/* Colors — multi-select pills */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{(t as any).colors}</label>
                      <div className="flex flex-wrap gap-2">
                        {COLORS.map(color => {
                          const selected = (editedProduct.colors || []).includes(color.key);
                          return (
                            <button
                              key={color.key}
                              type="button"
                              disabled={readOnly}
                              onClick={() => {
                                if (readOnly) return;
                                const current = editedProduct.colors || [];
                                const next = selected
                                  ? current.filter(k => k !== color.key)
                                  : [...current, color.key];
                                setEditedProduct({ ...editedProduct, colors: next });
                              }}
                              className={cn(
                                "flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium transition-all",
                                selected
                                  ? "border-blue-500 bg-blue-50 text-blue-700"
                                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-400",
                                readOnly && "cursor-default opacity-75"
                              )}
                              title={color.name}
                            >
                              <span
                                className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0"
                                style={{ backgroundColor: color.hex }}
                              />
                              {color.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Logistics */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-2">Logistics</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.warranty}</label>
                        <input type="text" value={editedProduct.warranty}
                          onChange={(e) => !readOnly && setEditedProduct({ ...editedProduct, warranty: e.target.value })}
                          readOnly={readOnly} className={smallInputClass} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.deliveryTime}</label>
                        <input type="text" value={editedProduct.deliveryTime}
                          onChange={(e) => !readOnly && setEditedProduct({ ...editedProduct, deliveryTime: e.target.value })}
                          readOnly={readOnly} className={smallInputClass} />
                      </div>
                    </div>
                  </div>

                  {/* Images */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-2">{t.images}</h3>

                    {/* Upload zone — hidden in readOnly */}
                    {!readOnly && (
                      <div
                        {...getRootProps()}
                        className={cn(
                          "border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all",
                          isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
                        )}
                      >
                        <input {...getInputProps()} />
                        {uploadingCount > 0 ? (
                          <>
                            <Loader2 className="w-6 h-6 text-blue-500 mx-auto mb-2 animate-spin" />
                            <p className="text-xs text-blue-600 font-medium">מעלה {uploadingCount} תמונות...</p>
                          </>
                        ) : (
                          <>
                            <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                            <p className="text-xs text-gray-600 font-medium">{t.dropImages}</p>
                          </>
                        )}
                      </div>
                    )}

                    {/* Image gallery */}
                    {editedProduct.images.length > 0 ? (
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {editedProduct.images.map((img, idx) => (
                          <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border bg-gray-100">
                            <img src={img} alt="" className="w-full h-full object-cover" />

                            {/* Overlay on hover */}
                            <div
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 cursor-pointer"
                              onClick={() => openLightbox(idx)}
                            >
                              <ZoomIn className="w-5 h-5 text-white drop-shadow" />
                            </div>

                            {/* Admin delete — only in edit mode and only for admin */}
                            {!readOnly && role === 'admin' && (
                              <button
                                onClick={() => {
                                  const newImages = [...editedProduct.images];
                                  newImages.splice(idx, 1);
                                  setEditedProduct({ ...editedProduct, images: newImages });
                                }}
                                className="absolute top-1 end-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                              >
                                <X className="w-2 h-2" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-gray-300 border-2 border-dashed rounded-xl">
                        <ImageIcon className="w-8 h-8 mb-2" />
                        <p className="text-xs">{t.noImages}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Descriptions & SEO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.shortDescription}</label>
                    <textarea
                      rows={4}
                      value={editedProduct.shortDescription}
                      onChange={(e) => !readOnly && setEditedProduct({ ...editedProduct, shortDescription: e.target.value })}
                      readOnly={readOnly}
                      className={cn(inputClass, "resize-none")}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.seoKeywords}</label>
                    <input
                      type="text"
                      value={editedProduct.seoKeywords.join(', ')}
                      onChange={(e) => !readOnly && setEditedProduct({
                        ...editedProduct,
                        seoKeywords: e.target.value.split(',').map(s => s.trim()).filter(s => s !== '')
                      })}
                      readOnly={readOnly}
                      className={inputClass}
                      placeholder="e.g. luxury watch, swiss made, automatic"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-sm font-medium text-gray-700">{t.description}</label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy('formatted')}
                        className="text-[10px] flex items-center gap-1 text-gray-500 hover:text-blue-600 transition-colors"
                      >
                        {copiedType === 'formatted' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        {(t as any).copyFormatted}
                      </button>
                      <button
                        onClick={() => handleCopy('clean')}
                        className="text-[10px] flex items-center gap-1 text-gray-500 hover:text-blue-600 transition-colors"
                      >
                        {copiedType === 'clean' ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                        {(t as any).copyClean}
                      </button>
                      {!readOnly && (
                        <button
                          onClick={async () => {
                            const content = await generateProductContent(editedProduct, language, settings);
                            setEditedProduct({ ...editedProduct, description: content });
                          }}
                          className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold ml-2"
                        >
                          <Sparkles className="w-3 h-3" />
                          {t.aiGenerate}
                        </button>
                      )}
                    </div>
                  </div>
                  <textarea
                    rows={7}
                    value={editedProduct.description}
                    onChange={(e) => !readOnly && setEditedProduct({ ...editedProduct, description: e.target.value })}
                    readOnly={readOnly}
                    className={cn(inputClass, "resize-none")}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              {readOnly ? (
                <button
                  onClick={onClose}
                  className="px-6 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                >
                  {t.cancel}
                </button>
              ) : (
                <>
                  <button
                    onClick={onClose}
                    className="px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    {t.cancel}
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all"
                  >
                    {t.save}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && editedProduct.images.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center"
            onClick={closeLightbox}
          >
            {/* Close */}
            <button
              onClick={closeLightbox}
              className="absolute top-5 end-5 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
            >
              <X className="w-7 h-7" />
            </button>

            {/* Counter */}
            <div className="absolute top-5 start-1/2 -translate-x-1/2 text-white/70 text-sm font-medium select-none">
              {lightboxIdx + 1} / {editedProduct.images.length}
            </div>

            {/* Download */}
            <a
              href={editedProduct.images[lightboxIdx]}
              download
              onClick={e => e.stopPropagation()}
              className="absolute top-5 start-5 flex items-center gap-2 px-3 py-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-sm"
            >
              <Download className="w-5 h-5" />
              {(t as any).downloadImage}
            </a>

            {/* Image */}
            <motion.img
              key={lightboxIdx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              src={editedProduct.images[lightboxIdx]}
              alt=""
              className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl"
              onClick={e => e.stopPropagation()}
            />

            {/* Thumbnail strip */}
            {editedProduct.images.length > 1 && (
              <div
                className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2"
                onClick={e => e.stopPropagation()}
              >
                {editedProduct.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setLightboxIdx(i)}
                    className={cn(
                      "w-10 h-10 rounded-lg overflow-hidden border-2 transition-all",
                      i === lightboxIdx ? "border-white scale-110" : "border-white/30 opacity-60 hover:opacity-100"
                    )}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Prev / Next arrows */}
            {editedProduct.images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute start-5 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/25 rounded-full text-white transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute end-5 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/25 rounded-full text-white transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );

  function closeLightbox() {
    setLightboxOpen(false);
  }
}
