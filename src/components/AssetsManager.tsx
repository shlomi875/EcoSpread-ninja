import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Plus, Search, Filter, MoreVertical, Layout, Grid, List, Download, Share2, Trash2, Tag, Package } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translations, Language } from '../i18n';
import { Asset } from '../types';
import { UploadAssetModal } from './UploadAssetModal';
import { cn } from '../lib/utils';

interface AssetsManagerProps {
  language: Language;
  brands: string[];
}

export function AssetsManager({ language, brands }: AssetsManagerProps) {
  const t = translations[language];
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  useEffect(() => {
    setIsLoadingAssets(true);
    fetch('/api/assets')
      .then(r => r.ok ? r.json() : [])
      .then(setAssets)
      .catch(() => {})
      .finally(() => setIsLoadingAssets(false));
  }, []);

  const handleUpload = async (newAsset: Asset) => {
    try {
      const r = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAsset),
      });
      if (r.ok) {
        const saved = await r.json();
        setAssets(prev => [saved, ...prev]);
      }
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('למחוק נכס זה?')) return;
    const r = await fetch(`/api/assets/${id}`, { method: 'DELETE' });
    if (r.ok) setAssets(prev => prev.filter(a => a.id !== id));
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (asset.model && asset.model.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesBrand = !selectedBrand || asset.brand === selectedBrand;
    const matchesCategory = !selectedCategory || asset.category === selectedCategory;
    return matchesSearch && matchesBrand && matchesCategory;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3 text-blue-600 font-bold tracking-widest text-xs uppercase">
          <ImageIcon className="w-4 h-4" />
          {t.assets}
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-black tracking-tight text-gray-900">
            {language === 'he' ? 'נכסים דיגיטליים' : 'Digital Assets'}
          </h1>
          <button 
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-blue-100"
          >
            <Plus className="w-5 h-5" />
            {t.uploadAsset}
          </button>
        </div>
        <p className="text-lg text-gray-500 max-w-2xl leading-relaxed">
          {language === 'he' 
            ? 'נהל את כל התמונות, הבאנרים והסרטונים שלך במקום אחד. קשר אותם למותגים ודגמים.' 
            : 'Manage all your images, banners, and videos in one place. Link them to brands and models.'}
        </p>
      </header>

      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'he' ? 'חפש נכסים או דגמים...' : 'Search assets or models...'}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
          <div className="flex bg-gray-50 p-1 rounded-2xl">
            <button className="p-2 bg-white rounded-xl shadow-sm text-blue-600">
              <Grid className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
            <Tag className="w-4 h-4 text-gray-400" />
            <select 
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0 p-0"
            >
              <option value="">{t.filterByBrand}</option>
              {brands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
            <Filter className="w-4 h-4 text-gray-400" />
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent border-none text-sm font-bold text-gray-700 focus:ring-0 p-0"
            >
              <option value="">{t.filterByCategory}</option>
              <option value="banner">{t.banner}</option>
              <option value="product">{t.product}</option>
              <option value="social">{t.social}</option>
              <option value="logo">{t.logo}</option>
              <option value="other">{t.other}</option>
            </select>
          </div>

          {(selectedBrand || selectedCategory || searchQuery) && (
            <button 
              onClick={() => { setSelectedBrand(''); setSelectedCategory(''); setSearchQuery(''); }}
              className="text-xs font-bold text-blue-600 hover:underline px-2"
            >
              {language === 'he' ? 'נקה הכל' : 'Clear All'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        <AnimatePresence mode="popLayout">
          {filteredAssets.map((asset, idx) => (
            <motion.div
              key={asset.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="group bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all overflow-hidden"
            >
              <div className="aspect-square relative overflow-hidden bg-gray-50">
                <img 
                  src={asset.url} 
                  alt={asset.name} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  <span className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-[10px] font-black uppercase tracking-wider text-blue-600 shadow-sm">
                    {t[asset.category as keyof typeof t] || asset.category}
                  </span>
                  {asset.brand && (
                    <span className="px-3 py-1 bg-blue-600/90 backdrop-blur-sm rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
                      {asset.brand}
                    </span>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button className="p-3 bg-white rounded-xl text-gray-900 hover:bg-blue-50 hover:text-blue-600 transition-all">
                    <Download className="w-5 h-5" />
                  </button>
                  <button className="p-3 bg-white rounded-xl text-gray-900 hover:bg-blue-50 hover:text-blue-600 transition-all">
                    <Share2 className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleDelete(asset.id)} className="p-3 bg-white rounded-xl text-red-500 hover:bg-red-50 transition-all">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">{asset.name}</p>
                    {asset.model && (
                      <p className="text-xs font-medium text-blue-600 flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        {asset.model}
                      </p>
                    )}
                  </div>
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3 text-xs font-medium text-gray-400">
                  <span className="uppercase">{asset.type}</span>
                  <span className="w-1 h-1 rounded-full bg-gray-200" />
                  <span>{asset.size}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredAssets.length === 0 && (
        <div className="py-20 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center text-gray-300 mx-auto mb-4">
            <ImageIcon className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No assets found</h3>
          <p className="text-gray-500">Try adjusting your search or filters</p>
        </div>
      )}

      <UploadAssetModal 
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUpload={handleUpload}
        language={language}
        brands={brands}
      />
    </div>
  );
}
