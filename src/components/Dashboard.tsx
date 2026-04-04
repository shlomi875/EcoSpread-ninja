import React from 'react';
import { Sparkles, TrendingUp, Package, Users, ArrowUpRight, ShoppingBag, Globe, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { translations, Language } from '../i18n';
import { Product } from '../types';

interface DashboardProps {
  language: Language;
  products: Product[];
  onViewProducts: () => void;
}

export function Dashboard({ language, products, onViewProducts }: DashboardProps) {
  const t = translations[language];

  const stats = [
    { label: t.products, value: products.length, icon: Package, color: 'blue' },
    { label: 'Market Reach', value: '12.4k', icon: Globe, color: 'indigo' },
    { label: 'AI Generations', value: '458', icon: Zap, color: 'amber' },
    { label: 'Active Campaigns', value: '12', icon: ShoppingBag, color: 'green' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col gap-2">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 text-blue-600 font-bold tracking-widest text-xs uppercase"
        >
          <Sparkles className="w-4 h-4" />
          THE BEST AI SERVICE FOR BUSINESS 2026
        </motion.div>
        <h1 className="text-4xl font-black tracking-tight text-gray-900">
          {language === 'he' ? 'ברוכים הבאים למרכז השליטה' : 'Welcome to the Command Center'}
        </h1>
        <p className="text-lg text-gray-500 max-w-2xl leading-relaxed">
          {language === 'he' 
            ? 'נהל את כל פעילות האיקומרס שלך במקום אחד - ממחקר שוק ועד יצירת תוכן שיווקי חכם.' 
            : 'Manage your entire e-commerce operation in one place - from market research to smart creative generation.'}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 group-hover:scale-110 transition-transform`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3" />
                +12%
              </span>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">{stat.label}</p>
            <p className="text-3xl font-black text-gray-900">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-10 text-white shadow-xl shadow-blue-200 relative overflow-hidden group"
        >
          <div className="relative z-10">
            <h3 className="text-2xl font-bold mb-4">
              {language === 'he' ? 'מוכן להגדיל את המכירות?' : 'Ready to scale your sales?'}
            </h3>
            <p className="text-blue-100 mb-8 max-w-md leading-relaxed">
              {language === 'he'
                ? 'השתמש בכלי ה-AI שלנו כדי לייצר פוסטים ויראליים, תיאורי מוצר מנצחים ובאנרים מעוצבים תוך שניות.'
                : 'Use our AI tools to generate viral posts, winning product descriptions, and designed banners in seconds.'}
            </p>
            <button 
              onClick={onViewProducts}
              className="bg-white text-blue-600 px-8 py-4 rounded-2xl font-bold hover:bg-blue-50 transition-all active:scale-95 flex items-center gap-2"
            >
              {language === 'he' ? 'התחל עכשיו' : 'Get Started'}
              <ArrowUpRight className="w-5 h-5" />
            </button>
          </div>
          <Sparkles className="absolute top-10 right-10 w-32 h-32 text-white/10 group-hover:rotate-12 transition-transform duration-700" />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-bold text-gray-900">
              {language === 'he' ? 'פעילות אחרונה' : 'Recent Activity'}
            </h3>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-6">
            {products.slice(0, 3).map((product, idx) => (
              <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                  {product.images[0] ? (
                    <img src={product.images[0]} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Package className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{product.name}</p>
                  <p className="text-xs text-gray-500">
                    {language === 'he' ? 'עודכן לפני 5 דקות' : 'Updated 5m ago'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-blue-600">{product.price}</p>
                  <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">{product.status}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
