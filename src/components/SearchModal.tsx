import React, { useState } from 'react';
import { X, Search, Sparkles, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translations, Language } from '../i18n';
import { AI_MODELS, DEFAULT_AI_MODEL, BADGE_COLORS } from '../lib/aiModels';
import { cn } from '../lib/utils';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string, model: string) => void;
  isSearching: boolean;
  language: Language;
}

export function SearchModal({ isOpen, onClose, onSearch, isSearching, language }: SearchModalProps) {
  const t = translations[language];
  const [query, setQuery] = useState('');
  const [model, setModel] = useState(DEFAULT_AI_MODEL);
  const [showModels, setShowModels] = useState(false);

  const selectedModel = AI_MODELS.find(m => m.id === model) ?? AI_MODELS[0];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (query.trim()) onSearch(query, model);
  };


  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" dir={language === 'he' ? 'rtl' : 'ltr'}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 border-b flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Search className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">{t.researchTitle}</h2>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <p className="text-sm text-gray-500">{t.researchSub}</p>

              <div className="relative">
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.researchPlaceholder}
                  className="w-full pl-4 pr-4 py-3 border-2 border-gray-100 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-50/50 outline-none transition-all text-gray-900 font-medium"
                />
              </div>

              {/* Model selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowModels((v: boolean) => !v)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-500" />
                    <span>{selectedModel.label}</span>
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold border', BADGE_COLORS[selectedModel.badge])}>
                      {selectedModel.badge}
                    </span>
                  </div>
                  <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', showModels && 'rotate-180')} />
                </button>

                <AnimatePresence>
                  {showModels && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                      className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-100 rounded-xl shadow-lg z-10 overflow-hidden"
                    >
                      {AI_MODELS.map(m => (
                        <button
                          key={m.id} type="button"
                          onClick={() => { setModel(m.id); setShowModels(false); }}
                          className={cn(
                            'w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors hover:bg-gray-50',
                            model === m.id ? 'text-blue-600 bg-blue-50/50' : 'text-gray-700'
                          )}
                        >
                          <span>{m.label}</span>
                          <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold border', BADGE_COLORS[m.badge])}>
                            {m.badge}
                          </span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                type="submit"
                disabled={!query.trim() || isSearching}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg shadow-blue-100 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
              >
                {isSearching ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {t.researching}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    {t.startResearch}
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
