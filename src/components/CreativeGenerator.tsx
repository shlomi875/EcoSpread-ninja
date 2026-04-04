import React, { useState } from 'react';
import { PenTool, Sparkles, MessageSquare, Facebook, Instagram, Twitter, Send, Wand2, Package, Search, Copy, Check, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translations, Language } from '../i18n';
import { Product, CompanySettings } from '../types';
import { generateCreativeContent } from '../services/geminiService';
import { cn } from '../lib/utils';

interface CreativeGeneratorProps {
  language: Language;
  products: Product[];
  settings?: CompanySettings;
}

type Platform = 'facebook' | 'instagram' | 'twitter' | 'telegram' | 'whatsapp' | 'custom';

export function CreativeGenerator({ language, products, settings }: CreativeGeneratorProps) {
  const t = translations[language];
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [activePlatform, setActivePlatform] = useState<Platform>('facebook');
  const [copied, setCopied] = useState(false);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.modelNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleGenerate = async (platform: Platform) => {
    if (!selectedProduct) return;
    
    setActivePlatform(platform);
    setIsGenerating(true);
    setGeneratedContent('');
    
    try {
      const content = await generateCreativeContent(selectedProduct, platform, language, settings);
      setGeneratedContent(content);
    } catch (error) {
      console.error(error);
      setGeneratedContent('Failed to generate content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const platforms = [
    { id: 'facebook' as Platform, icon: Facebook, label: 'Facebook Post', color: 'blue' },
    { id: 'instagram' as Platform, icon: Instagram, label: 'Instagram Caption', color: 'pink' },
    { id: 'twitter' as Platform, icon: Twitter, label: 'Twitter Thread', color: 'sky' },
    { id: 'telegram' as Platform, icon: Send, label: 'Telegram Update', color: 'indigo' },
    { id: 'whatsapp' as Platform, icon: MessageSquare, label: 'WhatsApp Message', color: 'green' },
    { id: 'custom' as Platform, icon: Wand2, label: 'Custom Prompt', color: 'purple' },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-3 text-blue-600 font-bold tracking-widest text-xs uppercase">
          <PenTool className="w-4 h-4" />
          {t.creative}
        </div>
        <h1 className="text-4xl font-black tracking-tight text-gray-900">
          {language === 'he' ? 'מחולל קריאייטיב AI' : 'Creative AI Generator'}
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl leading-relaxed">
          {language === 'he' 
            ? 'צור פוסטים שיווקיים, תיאורי מוצר ואסטרטגיית תוכן בשניות על בסיס נתוני המוצרים שלך.' 
            : 'Generate marketing posts, product descriptions, and content strategy in seconds based on your product data.'}
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Product Selection Column */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              {language === 'he' ? 'בחר מוצר' : 'Select Product'}
            </h3>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlaceholder}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredProducts.map(product => (
                <button
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className={cn(
                    "w-full text-left p-3 rounded-xl transition-all border flex items-center gap-3",
                    selectedProduct?.id === product.id 
                      ? "bg-blue-50 border-blue-200 shadow-sm" 
                      : "bg-white border-transparent hover:bg-gray-50"
                  )}
                >
                  <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                    {product.images[0] ? (
                      <img src={product.images[0]} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <Package className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{product.name}</p>
                    <p className="text-[10px] text-gray-500">{product.sku || product.modelNumber}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedProduct && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-blue-600 rounded-[2rem] p-6 text-white shadow-lg shadow-blue-100"
            >
              <h4 className="font-bold mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                {language === 'he' ? 'מוצר נבחר' : 'Selected Product'}
              </h4>
              <p className="text-sm text-blue-100 mb-4 line-clamp-2">{selectedProduct.name}</p>
              <div className="flex items-center justify-between text-xs font-bold bg-white/10 p-3 rounded-xl">
                <span>{selectedProduct.price}</span>
                <span className="uppercase opacity-60">{selectedProduct.category}</span>
              </div>
            </motion.div>
          )}
        </div>

        {/* Generation Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {platforms.map((item) => (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleGenerate(item.id)}
                disabled={!selectedProduct || isGenerating}
                className={cn(
                  "p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 group",
                  activePlatform === item.id && generatedContent
                    ? `bg-${item.color}-50 border-${item.color}-200 shadow-sm`
                    : "bg-white border-gray-100 hover:shadow-md",
                  (!selectedProduct || isGenerating) && "opacity-50 cursor-not-allowed grayscale"
                )}
              >
                <div className={cn(
                  "p-3 rounded-xl transition-transform group-hover:scale-110",
                  activePlatform === item.id && generatedContent
                    ? `bg-${item.color}-100 text-${item.color}-600`
                    : `bg-${item.color}-50 text-${item.color}-600`
                )}>
                  <item.icon className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-gray-900">{item.label}</span>
              </motion.button>
            ))}
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm min-h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {isGenerating ? (language === 'he' ? 'מייצר תוכן...' : 'Generating...') : (language === 'he' ? 'תוכן שנוצר' : 'Generated Content')}
                </h3>
              </div>
              {generatedContent && !isGenerating && (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleGenerate(activePlatform)}
                    className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-all"
                    title="Regenerate"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={handleCopy}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                      copied ? "bg-green-50 text-green-600" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? (language === 'he' ? 'הועתק' : 'Copied') : (language === 'he' ? 'העתק' : 'Copy')}
                  </button>
                </div>
              )}
            </div>
            
            <div className="flex-1 relative">
              <AnimatePresence mode="wait">
                {isGenerating ? (
                  <motion.div 
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center text-center gap-4"
                  >
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-500 font-medium animate-pulse">
                      {language === 'he' ? 'ה-AI שלנו כותב עבורך...' : 'Our AI is writing for you...'}
                    </p>
                  </motion.div>
                ) : generatedContent ? (
                  <motion.div 
                    key="content"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="whitespace-pre-wrap text-gray-700 leading-relaxed font-medium"
                  >
                    {generatedContent}
                  </motion.div>
                ) : (
                  <motion.div 
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex flex-col items-center justify-center text-center gap-4 text-gray-400"
                  >
                    <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center">
                      <PenTool className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 mb-1">
                        {!selectedProduct 
                          ? (language === 'he' ? 'בחר מוצר כדי להתחיל' : 'Select a product to start')
                          : (language === 'he' ? 'בחר פלטפורמה ליצירה' : 'Select a platform to generate')}
                      </p>
                      <p className="text-sm">
                        {language === 'he' 
                          ? 'ה-AI ישתמש בנתוני המוצר כדי לייצר תוכן מותאם אישית' 
                          : 'AI will use product data to generate personalized content'}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
