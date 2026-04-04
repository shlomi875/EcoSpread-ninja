import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Upload, Image as ImageIcon, Sparkles, Link, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, CompanySettings } from '../types';
import { cn } from '../lib/utils';
import { generateProductContent } from '../services/geminiService';
import { translations, Language } from '../i18n';

interface ProductModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Product) => void;
  language: Language;
  settings: CompanySettings;
}

export function ProductModal({ product, isOpen, onClose, onSave, language, settings }: ProductModalProps) {
  const t = translations[language];
  const [editedProduct, setEditedProduct] = React.useState<Product | null>(null);

  React.useEffect(() => {
    if (product) {
      setEditedProduct({ ...product });
    }
  }, [product]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setEditedProduct((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            images: [...prev.images, base64],
          };
        });
      };
      reader.readAsDataURL(file);
    });
  }, []);

  // @ts-expect-error - react-dropzone type mismatch
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 'image/jpeg': [], 'image/png': [], 'image/webp': [] },
    multiple: true
  });

  const validatePrice = (price: string) => {
    if (!price) return true;
    // More flexible validation: must contain at least one digit and only allowed characters (digits, symbols, separators)
    const hasNumber = /\d/.test(price);
    const onlyAllowedChars = /^[₪$\d,.\s]+$/.test(price);
    return hasNumber && onlyAllowedChars;
  };

  const handleSave = () => {
    const fieldsToValidate = [
      { name: t.price, value: editedProduct.price },
      { name: t.zapPrice, value: editedProduct.zapPrice || '' },
      { name: t.targetPrice, value: editedProduct.targetPrice || '' },
      { name: t.minPrice, value: editedProduct.minPrice || '' }
    ];

    const invalidFields = fieldsToValidate.filter(f => f.value && !validatePrice(f.value));
    
    if (invalidFields.length > 0) {
      const fieldNames = invalidFields.map(f => f.name).join(', ');
      alert(language === 'he' ? `פורמט מחיר לא תקין בשדות: ${fieldNames}. יש להשתמש במספרים (ניתן להוסיף ₪/$).` : `Invalid price format in: ${fieldNames}. Use numbers (optionally with ₪/$).`);
      return;
    }

    onSave(editedProduct);
  };

  if (!editedProduct) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir={language === 'he' ? 'rtl' : 'ltr'}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-semibold text-gray-900">{t.editProduct}</h2>
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
                      <input
                        type="text"
                        value={editedProduct.name}
                        onChange={(e) => setEditedProduct({ ...editedProduct, name: e.target.value })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.sku}</label>
                        <input
                          type="text"
                          value={editedProduct.sku}
                          onChange={(e) => setEditedProduct({ ...editedProduct, sku: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.modelNumber}</label>
                        <input
                          type="text"
                          value={editedProduct.modelNumber}
                          onChange={(e) => setEditedProduct({ ...editedProduct, modelNumber: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.category}</label>
                        <input
                          type="text"
                          value={editedProduct.category}
                          onChange={(e) => setEditedProduct({ ...editedProduct, category: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.gender}</label>
                        <select
                          value={editedProduct.gender}
                          onChange={(e) => setEditedProduct({ ...editedProduct, gender: e.target.value as any })}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        >
                          <option value="men">Men</option>
                          <option value="women">Women</option>
                          <option value="unisex">Unisex</option>
                          <option value="kids">Kids</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-2">{t.price}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.price}</label>
                        <input
                          type="text"
                          value={editedProduct.price}
                          onChange={(e) => setEditedProduct({ ...editedProduct, price: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.minPrice}</label>
                        <input
                          type="text"
                          value={editedProduct.minPrice || ''}
                          onChange={(e) => setEditedProduct({ ...editedProduct, minPrice: e.target.value })}
                          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.zapPrice}</label>
                        <input
                          type="text"
                          value={editedProduct.zapPrice || ''}
                          onChange={(e) => setEditedProduct({ ...editedProduct, zapPrice: e.target.value })}
                          className="w-full px-4 py-2 border border-orange-200 bg-orange-50/30 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.targetPrice}</label>
                        <input
                          type="text"
                          value={editedProduct.targetPrice || ''}
                          onChange={(e) => setEditedProduct({ ...editedProduct, targetPrice: e.target.value })}
                          className="w-full px-4 py-2 border border-green-200 bg-green-50/30 rounded-lg focus:ring-2 focus:ring-green-500 outline-none transition-all font-bold"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                        <Link className="w-3.5 h-3.5 text-blue-600" />
                        {t.zapLink}
                      </label>
                      <input
                        type="text"
                        value={editedProduct.zapLink || ''}
                        onChange={(e) => setEditedProduct({ ...editedProduct, zapLink: e.target.value })}
                        placeholder="https://www.zap.co.il/model.aspx?modelid=..."
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Technical Specs */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-2">{t.filters}</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.movement}</label>
                        <input
                          type="text"
                          value={editedProduct.movement || ''}
                          onChange={(e) => setEditedProduct({ ...editedProduct, movement: e.target.value })}
                          className="w-full px-3 py-1.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.diameter}</label>
                        <input
                          type="text"
                          value={editedProduct.diameter || ''}
                          onChange={(e) => setEditedProduct({ ...editedProduct, diameter: e.target.value })}
                          className="w-full px-3 py-1.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.material}</label>
                        <input
                          type="text"
                          value={editedProduct.material || ''}
                          onChange={(e) => setEditedProduct({ ...editedProduct, material: e.target.value })}
                          className="w-full px-3 py-1.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.waterResistance}</label>
                        <input
                          type="text"
                          value={editedProduct.waterResistance || ''}
                          onChange={(e) => setEditedProduct({ ...editedProduct, waterResistance: e.target.value })}
                          className="w-full px-3 py-1.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Logistics */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-2">Logistics</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.warranty}</label>
                        <input
                          type="text"
                          value={editedProduct.warranty}
                          onChange={(e) => setEditedProduct({ ...editedProduct, warranty: e.target.value })}
                          className="w-full px-3 py-1.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t.deliveryTime}</label>
                        <input
                          type="text"
                          value={editedProduct.deliveryTime}
                          onChange={(e) => setEditedProduct({ ...editedProduct, deliveryTime: e.target.value })}
                          className="w-full px-3 py-1.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Images */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b pb-2">{t.images}</h3>
                    <div
                      {...getRootProps()}
                      className={cn(
                        "border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all",
                        isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
                      )}
                    >
                      <input {...getInputProps()} />
                      <Upload className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs text-gray-600 font-medium">{t.dropImages}</p>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {editedProduct.images.map((img, idx) => (
                        <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border bg-gray-100">
                          <img src={img} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={() => {
                              const newImages = [...editedProduct.images];
                              newImages.splice(idx, 1);
                              setEditedProduct({ ...editedProduct, images: newImages });
                            }}
                            className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-2 h-2" />
                          </button>
                        </div>
                      ))}
                    </div>
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
                      onChange={(e) => setEditedProduct({ ...editedProduct, shortDescription: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t.seoKeywords}</label>
                    <input
                      type="text"
                      value={editedProduct.seoKeywords.join(', ')}
                      onChange={(e) => setEditedProduct({ 
                        ...editedProduct, 
                        seoKeywords: e.target.value.split(',').map(s => s.trim()).filter(s => s !== '') 
                      })}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                      placeholder="e.g. luxury watch, swiss made, automatic"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">{t.description}</label>
                    <button
                      onClick={async () => {
                        const content = await generateProductContent(editedProduct, language, settings);
                        setEditedProduct({ ...editedProduct, description: content });
                      }}
                      className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-700 font-semibold"
                    >
                      <Sparkles className="w-3 h-3" />
                      {t.aiGenerate}
                    </button>
                  </div>
                  <textarea
                    rows={7}
                    value={editedProduct.description}
                    onChange={(e) => setEditedProduct({ ...editedProduct, description: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
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
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
