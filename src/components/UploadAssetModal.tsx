import React, { useState } from 'react';
import { X, Upload, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translations, Language } from '../i18n';
import { Asset } from '../types';
import { useDropzone } from 'react-dropzone';
import { cn } from '../lib/utils';

interface UploadAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (asset: Asset) => void;
  language: Language;
  brands: string[];
}

export function UploadAssetModal({ isOpen, onClose, onUpload, language, brands }: UploadAssetModalProps) {
  const t = translations[language];
  const [formData, setFormData] = useState<Partial<Asset>>({
    name: '',
    category: 'product',
    type: 'image',
    brand: '',
    model: '',
  });
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif', '.avif'],
      'video/*': ['.mp4', '.mov'],
    },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024,
    onDropRejected: (rejectedFiles: any[]) => {
      const err = rejectedFiles[0]?.errors[0];
      if (err?.code === 'file-too-large') alert('הקובץ גדול מדי (מקסימום 20MB)');
      else if (err?.code === 'file-invalid-type') alert('סוג קובץ לא נתמך');
      else alert('הקובץ נדחה: ' + err?.message);
    },
    onDrop: (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
        setSelectedFile(file);
        setFormData(prev => ({
          ...prev,
          name: file.name,
          type: file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : 'other',
          size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        }));
      }
    },
  } as any);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}));
        alert('Upload failed: ' + (errData.error || uploadRes.statusText));
        return;
      }
      const { url } = await uploadRes.json();
      const newAsset: Asset = {
        id: '',
        name: formData.name || selectedFile.name,
        type: formData.type || 'image',
        category: formData.category || 'product',
        brand: formData.brand,
        model: formData.model,
        size: formData.size || '0 MB',
        date: new Date().toISOString().split('T')[0],
        url,
      };
      onUpload(newAsset);
      onClose();
      setFormData({ name: '', category: 'product', type: 'image', brand: '', model: '' });
      setSelectedFile(null);
    } catch (e) {
      console.error(e);
      alert('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
          >
            <div className="p-8 border-b flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-gray-900">{t.uploadAsset}</h2>
                <p className="text-sm text-gray-500">Add metadata to your digital assets</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div 
                {...getRootProps()} 
                className={cn(
                  "border-2 border-dashed rounded-[2rem] p-10 flex flex-col items-center justify-center text-center transition-all cursor-pointer",
                  isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-100 hover:border-blue-200 hover:bg-gray-50"
                )}
              >
                <input {...getInputProps()} />
                <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-blue-600 mb-4">
                  <Upload className="w-8 h-8" />
                </div>
                {formData.name ? (
                  <div className="flex items-center gap-2 text-green-600 font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                    {formData.name}
                  </div>
                ) : (
                  <>
                    <p className="font-bold text-gray-900">{t.dropImages}</p>
                    <p className="text-sm text-gray-500">{t.dropImagesSub}</p>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 px-1">{t.assetCategory}</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  >
                    <option value="banner">{t.banner}</option>
                    <option value="product">{t.product}</option>
                    <option value="social">{t.social}</option>
                    <option value="logo">{t.logo}</option>
                    <option value="other">{t.other}</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 px-1">{t.brand}</label>
                  <select
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  >
                    <option value="">Select Brand</option>
                    {brands.map(brand => (
                      <option key={brand} value={brand}>{brand}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 px-1">{t.model}</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    placeholder="e.g. T127.407.11.041.00"
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 px-1">{t.assetName}</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-all"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !formData.name}
                  className="flex-1 bg-blue-600 text-white px-6 py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
                >
                  {isUploading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                  {isUploading ? 'Uploading...' : t.uploadAsset}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
