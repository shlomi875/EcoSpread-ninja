import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Building2, Phone, Mail, Info, Calculator, Plus, Trash2 } from 'lucide-react';
import { CompanySettings, BrandConfig } from '../types';
import { translations, Language } from '../i18n';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: CompanySettings;
  onSave: (settings: CompanySettings) => void;
  language: Language;
}

export function SettingsModal({ isOpen, onClose, settings, onSave, language }: SettingsModalProps) {
  const [formData, setFormData] = useState<CompanySettings>(settings);
  const t = translations[language];

  useEffect(() => {
    if (isOpen) setFormData(settings);
  }, [isOpen, settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const addBrand = () => {
    const newBrand: BrandConfig = { brandName: '', warranty: '', minPrice: '' };
    setFormData({ ...formData, brands: [...(formData.brands || []), newBrand] });
  };

  const removeBrand = (index: number) => {
    const newBrands = [...(formData.brands || [])];
    newBrands.splice(index, 1);
    setFormData({ ...formData, brands: newBrands });
  };

  const updateBrand = (index: number, field: keyof BrandConfig, value: string) => {
    const newBrands = [...(formData.brands || [])];
    newBrands[index] = { ...newBrands[index], [field]: value };
    setFormData({ ...formData, brands: newBrands });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="px-8 py-6 border-b flex items-center justify-between bg-gray-50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{t.companySettings}</h2>
                <p className="text-sm text-gray-500">Configure your business context and brand rules</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    {t.companyName}
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-blue-600" />
                    {t.priceOffset}
                  </label>
                  <input
                    type="number"
                    value={formData.targetPriceOffset}
                    onChange={(e) => setFormData({ ...formData, targetPriceOffset: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-blue-600" />
                    {t.phone || 'טלפון'}
                  </label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-600" />
                    {t.email || 'אימייל'}
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">{t.brandSettings}</h3>
                  <button
                    type="button"
                    onClick={addBrand}
                    className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700 font-bold"
                  >
                    <Plus className="w-3 h-3" />
                    {t.addBrand}
                  </button>
                </div>
                
                <div className="space-y-3">
                  {(formData.brands || []).map((brand, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 relative group">
                      <input
                        placeholder="Brand Name"
                        value={brand.brandName}
                        onChange={(e) => updateBrand(idx, 'brandName', e.target.value)}
                        className="px-3 py-2 bg-white border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        placeholder="Warranty (e.g. 2 Years)"
                        value={brand.warranty}
                        onChange={(e) => updateBrand(idx, 'warranty', e.target.value)}
                        className="px-3 py-2 bg-white border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        placeholder="Min Price"
                        value={brand.minPrice}
                        onChange={(e) => updateBrand(idx, 'minPrice', e.target.value)}
                        className="px-3 py-2 bg-white border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeBrand(idx)}
                        className="absolute -top-2 -right-2 p-1.5 bg-white border shadow-sm text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  {t.companyAbout}
                </label>
                <textarea
                  value={formData.about}
                  onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none text-sm"
                />
              </div>
            </form>

            <div className="px-8 py-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition-all"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleSubmit}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {t.save}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
