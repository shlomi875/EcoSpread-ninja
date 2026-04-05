import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle, CheckCircle2, ChevronRight, TrendingUp, Zap, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types';
import { translations, Language } from '../i18n';
import { seoAudit } from '../services/geminiService';
import { cn } from '../lib/utils';

interface SEOMasterModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProducts: Product[];
  language: Language;
  onApplyChanges: (updates: { id: string, name?: string, description?: string, seoKeywords?: string[] }[]) => void;
}

interface AuditResult {
  id: string;
  score: number;
  suggestions: string;
  upgradedName: string;
  upgradedDescription: string;
  upgradedKeywords: string[];
}

export function SEOMasterModal({ isOpen, onClose, selectedProducts, language, onApplyChanges }: SEOMasterModalProps) {
  const t = translations[language] as any;
  const [isAuditing, setIsAuditing] = useState(false);
  const [results, setResults] = useState<AuditResult[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && selectedProducts.length > 0 && results.length === 0) {
      handleAudit();
    }
  }, [isOpen, selectedProducts]);

  const handleAudit = async () => {
    setIsAuditing(true);
    try {
      const data = await seoAudit(selectedProducts, language);
      setResults(data);
      if (data.length > 0) setActiveId(data[0].id);
    } catch (error) {
      console.error(error);
    } finally {
      setIsAuditing(false);
    }
  };

  const handleApply = () => {
    onApplyChanges(results.map(r => ({
      id: r.id,
      name: r.upgradedName,
      description: r.upgradedDescription,
      seoKeywords: r.upgradedKeywords
    })));
    onClose();
  };

  const activeResult = results.find(r => r.id === activeId);
  const activeProduct = selectedProducts.find(p => p.id === activeId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" dir={language === 'he' ? 'rtl' : 'ltr'}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col border border-white/20"
      >
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{t.masterSeo}</h2>
              <p className="text-xs text-blue-100 opacity-80">AI-Powered SEO, AEO & GEO Optimization Hub</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Product List */}
          <div className="w-1/3 border-r bg-gray-50/50 overflow-y-auto p-4 space-y-2">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-4">Selected Products</h3>
            {selectedProducts.map(p => {
              const result = results.find(r => r.id === p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => setActiveId(p.id)}
                  className={cn(
                    "w-full text-left p-4 rounded-2xl transition-all border flex flex-col gap-1",
                    activeId === p.id 
                      ? "bg-white border-blue-200 shadow-md ring-1 ring-blue-500/10" 
                      : "bg-transparent border-transparent hover:bg-white hover:border-gray-200"
                  )}
                  dir={language === 'he' ? 'rtl' : 'ltr'}
                >
                  <span className="text-sm font-bold text-gray-900 truncate block w-full">{p.name}</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-gray-500 font-mono uppercase">{p.sku || p.modelNumber || 'No SKU'}</span>
                    {result ? (
                      <div className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold",
                        result.score > 80 ? "bg-green-100 text-green-700" : result.score > 60 ? "bg-orange-100 text-orange-700" : "bg-red-100 text-red-700"
                      )}>
                        Score: {result.score}
                      </div>
                    ) : (
                      <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        {isAuditing && activeId === p.id && <motion.div animate={{ x: ['-100%', '100%'] }} transition={{ repeat: Infinity, duration: 1 }} className="w-full h-full bg-blue-500" />}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Main Content - Results */}
          <div className="flex-1 overflow-y-auto bg-white p-8">
            <AnimatePresence mode="wait">
              {isAuditing ? (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center space-y-4"
                >
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                    <Sparkles className="w-6 h-6 text-blue-600 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">{t.researching}</p>
                    <p className="text-sm text-gray-500">Analyzing content patterns, keyword density, and search intent...</p>
                  </div>
                </motion.div>
              ) : activeResult ? (
                <motion.div 
                  key={activeId}
                  initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  className="space-y-8"
                >
                  {/* Score & Insights */}
                  <div className="grid grid-cols-3 gap-6">
                    <div className="col-span-1 p-6 rounded-3xl bg-blue-50 border border-blue-100 flex flex-col items-center justify-center text-center">
                      <div className="relative mb-3">
                        <svg className="w-24 h-24 transform -rotate-90">
                          <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-blue-100" />
                          <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" 
                            strokeDasharray={2 * Math.PI * 40}
                            strokeDashoffset={2 * Math.PI * 40 * (1 - activeResult.score / 100)}
                            className="text-blue-600"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-2xl font-black text-blue-900">{activeResult.score}</span>
                      </div>
                      <span className="text-sm font-bold text-blue-900">{t.seoScore}</span>
                    </div>
                    
                    <div className="col-span-2 p-6 rounded-3xl bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="w-4 h-4 text-indigo-600" />
                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">{t.seoSuggestions}</h4>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed italic">"{activeResult.suggestions}"</p>
                    </div>
                  </div>

                  {/* Comparisons */}
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t.productName}</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-sm text-gray-500 line-through opacity-60">{activeProduct?.name}</div>
                        <div className="p-4 rounded-2xl bg-green-50 border border-green-200 text-sm font-bold text-green-900 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                          {activeResult.upgradedName}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t.description}</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-[11px] text-gray-500 h-48 overflow-y-auto whitespace-pre-wrap">{activeProduct?.description}</div>
                        <div className="p-4 rounded-2xl bg-green-50 border border-green-200 text-[11px] font-medium text-green-900 h-48 overflow-y-auto whitespace-pre-wrap shadow-inner">
                          {activeResult.upgradedDescription}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest">{t.seoKeywords}</h4>
                      <div className="flex flex-wrap gap-2">
                        {activeResult.upgradedKeywords.map((k, i) => (
                          <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[10px] font-bold border border-indigo-100">
                            #{k}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-400 italic">
                  Select a product from the sidebar to view audit details
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50/80 backdrop-blur-sm flex justify-between items-center">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-orange-500" /> AEO Optimized</div>
            <div className="flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-blue-500" /> GEO Ready</div>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-8 py-3 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-2xl transition-all">
              {t.cancel}
            </button>
            <button 
              onClick={handleApply}
              disabled={results.length === 0}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {t.applyChanges}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
