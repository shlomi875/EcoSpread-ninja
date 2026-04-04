import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Spreadsheet } from './components/Spreadsheet';
import { ProductModal } from './components/ProductModal';
import { SearchModal } from './components/SearchModal';
import { SettingsModal } from './components/SettingsModal';
import { SEO } from './components/SEO';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { CreativeGenerator } from './components/CreativeGenerator';
import { AssetsManager } from './components/AssetsManager';
import { Product, CompanySettings, AppView } from './types';
import { translations, Language } from './i18n';
import { searchProductData } from './services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from './lib/utils';

const INITIAL_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'שעון יד לגבר, Tissot (טיסו) T127.407.11.041.00',
    sku: 'T1274071104100',
    modelNumber: 'T127.407.11.041.00',
    category: 'מותגי שעונים',
    subCategory: 'Tissot',
    gender: 'men',
    price: '₪3,290',
    zapPrice: '₪3,150',
    targetPrice: '₪3,145',
    description: 'שעון טיסו אוטומטי יוקרתי מסדרת Gentleman, מנגנון Powermatic 80 עם עמידות לשדות מגנטיים.',
    shortDescription: 'שעון יד יוקרתי לגבר מבית Tissot, עיצוב קלאסי ועל-זמני.',
    manufacturer: 'Tissot',
    warranty: 'שנתיים אחריות יבואן רשמי',
    deliveryTime: '3 ימי עסקים',
    payments: '10 תשלומים ללא ריבית',
    movement: 'אוטומטי',
    diameter: '40 מ״מ',
    material: 'פלדת אל-חלד',
    waterResistance: '100 מטר',
    glass: 'ספיר קריסטל',
    filters: ['אוטומטי', '40 מ״מ', 'פלדת אל-חלד'],
    seoKeywords: ['שעון טיסו', 'Tissot Gentleman', 'שעון יד לגבר'],
    images: ['https://picsum.photos/seed/watch/400/400'],
    status: 'ready',
    lastUpdated: new Date().toISOString(),
  }
];

const INITIAL_SETTINGS: CompanySettings = {
  name: 'EcoSpread Watches',
  phone: '+972-50-1234567',
  email: 'info@ecospread-watches.co.il',
  about: 'מומחים לשעוני יוקרה ומותגים מובילים.',
  targetPriceOffset: -5,
  brands: [
    { brandName: 'Tissot', warranty: 'שנתיים אחריות יבואן רשמי', minPrice: '₪1,500' },
    { brandName: 'Casio', warranty: 'שנה אחריות יבואן רשמי', minPrice: '₪200' }
  ]
};

export default function App() {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [language, setLanguage] = useState<Language>('he');
  const [settings, setSettings] = useState<CompanySettings>(INITIAL_SETTINGS);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<AppView>('dashboard');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      }
    } catch (err) {
      console.error('Auth check failed');
    } finally {
      setIsAuthChecking(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    setUser(null);
  };

  const t = translations[language];

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddProduct = () => {
    const newProduct: Product = {
      id: Math.random().toString(36).substr(2, 9),
      name: 'New Product',
      sku: '',
      modelNumber: '',
      category: 'Uncategorized',
      gender: 'unisex',
      price: '₪0',
      description: '',
      shortDescription: '',
      manufacturer: '',
      warranty: '',
      deliveryTime: '',
      payments: '',
      filters: [],
      seoKeywords: [],
      images: [],
      status: 'draft',
      lastUpdated: new Date().toISOString(),
    };
    setSelectedProduct(newProduct);
    setIsModalOpen(true);
  };

  const handleSearchWeb = () => {
    setIsSearchModalOpen(true);
  };

  const executeSearch = async (query: string) => {
    setIsSearching(true);
    try {
      const data = await searchProductData(query, language, settings);
      const newProduct: Product = {
        id: Math.random().toString(36).substr(2, 9),
        name: data.name || query,
        sku: data.sku || '',
        modelNumber: data.modelNumber || '',
        category: data.category || 'Uncategorized',
        gender: data.gender || 'unisex',
        price: data.price || '₪0',
        zapPrice: data.zapPrice,
        targetPrice: data.targetPrice,
        description: data.description || '',
        shortDescription: data.shortDescription || '',
        manufacturer: data.manufacturer || '',
        warranty: data.warranty || '',
        deliveryTime: data.deliveryTime || '',
        payments: data.payments || '',
        movement: data.movement,
        diameter: data.diameter,
        material: data.material,
        waterResistance: data.waterResistance,
        glass: data.glass,
        filters: data.filters || [],
        seoKeywords: data.seoKeywords || [],
        images: [],
        status: 'ready',
        lastUpdated: new Date().toISOString(),
      };
      setProducts(prev => [newProduct, ...prev]);
      showNotification('success', t.successResearch.replace('{query}', query));
      setIsSearchModalOpen(false);
    } catch (error) {
      console.error(error);
      showNotification('error', t.errorResearch);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveProduct = (updatedProduct: Product) => {
    setProducts(prev => {
      const exists = prev.find(p => p.id === updatedProduct.id);
      if (exists) {
        return prev.map(p => p.id === updatedProduct.id ? { ...updatedProduct, lastUpdated: new Date().toISOString() } : p);
      }
      return [updatedProduct, ...prev];
    });
    setIsModalOpen(false);
    showNotification('success', t.successSave);
  };

  const handleDeleteProduct = (id: string) => {
    if (window.confirm(t.confirmDelete)) {
      setProducts(prev => prev.filter(p => p.id !== id));
      showNotification('success', t.productDeleted);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.modelNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSaveSettings = (newSettings: CompanySettings) => {
    setSettings(newSettings);
    setIsSettingsModalOpen(false);
    showNotification('success', t.settingsSaved);
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={setUser} language={language} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden" dir={language === 'he' ? 'rtl' : 'ltr'}>
      <SEO 
        title={selectedProduct ? selectedProduct.name : undefined}
        description={selectedProduct ? selectedProduct.description : undefined}
        keywords={selectedProduct ? selectedProduct.seoKeywords : undefined}
        image={selectedProduct && selectedProduct.images[0] ? selectedProduct.images[0] : undefined}
      />
      <Sidebar 
        onAddProduct={handleAddProduct} 
        onSearchWeb={handleSearchWeb}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        isSearching={isSearching}
        language={language}
        onLanguageChange={setLanguage}
        user={user}
        onLogout={handleLogout}
        activeView={activeView}
        onViewChange={setActiveView}
      />
      
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {activeView === 'dashboard' && (
          <div className="p-10">
            <Dashboard 
              language={language} 
              products={products} 
              onViewProducts={() => setActiveView('products')} 
            />
          </div>
        )}

        {activeView === 'products' && (
          <>
            <header className="h-20 bg-white border-b px-10 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">{t.inventory}</h2>
                <p className="text-sm text-gray-500">{t.inventorySub}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-bold border border-green-100">
                  <Sparkles className="w-3.5 h-3.5" />
                  {t.aiActive}
                </div>
              </div>
            </header>

            <div className="flex-1 p-10 overflow-hidden">
              <Spreadsheet 
                data={filteredProducts} 
                language={language}
                role={user.role}
                onEdit={(p) => {
                  setSelectedProduct(p);
                  setIsModalOpen(true);
                }}
                onDelete={handleDeleteProduct}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </div>
          </>
        )}

        {activeView === 'creative' && (
          <div className="p-10">
            <CreativeGenerator 
              language={language} 
              products={products}
              settings={settings}
            />
          </div>
        )}

        {activeView === 'assets' && (
          <div className="p-10">
            <AssetsManager 
              language={language} 
              brands={settings.brands.map(b => b.brandName)}
            />
          </div>
        )}
      </main>

      <ProductModal 
        isOpen={isModalOpen}
        product={selectedProduct}
        language={language}
        settings={settings}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveProduct}
      />

      <SearchModal
        isOpen={isSearchModalOpen}
        language={language}
        onClose={() => setIsSearchModalOpen(false)}
        onSearch={executeSearch}
        isSearching={isSearching}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        settings={settings}
        onSave={handleSaveSettings}
        language={language}
      />

      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className={cn(
              "fixed bottom-8 left-1/2 z-[100] px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 border",
              notification.type === 'success' ? "bg-white border-green-100 text-green-800" : "bg-white border-red-100 text-red-800"
            )}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-500" />
            )}
            <span className="font-semibold text-sm">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
