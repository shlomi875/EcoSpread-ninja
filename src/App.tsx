import React, { useState, useEffect, useCallback } from 'react';
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
import { UsersManager } from './components/UsersManager';
import { EshopPipeline } from './components/EshopPipeline';
import { SEOMasterModal } from './components/SEOMasterModal';
import { Product, CompanySettings, AppView } from './types';
import { translations, Language } from './i18n';
import { searchProductData } from './services/geminiService';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from './lib/utils';

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<CompanySettings>({
    name: '', phone: '', email: '', about: '', targetPriceOffset: -5, brands: []
  });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [language, setLanguage] = useState<Language>('he');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [selectedAuditProducts, setSelectedAuditProducts] = useState<Product[]>([]);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);

  const t = translations[language];

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // ── Auth ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setUser(data); })
      .catch(() => {})
      .finally(() => setIsAuthChecking(false));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    setUser(null);
  };

  // ── Load Data ─────────────────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const r = await fetch('/api/products');
      if (r.ok) setProducts(await r.json());
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const r = await fetch('/api/settings');
      if (r.ok) {
        const data = await r.json();
        if (data && data.name) setSettings({ ...data, targetPriceOffset: Number(data.targetPriceOffset) || -5 });
      }
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    if (user) { loadProducts(); loadSettings(); }
  }, [user, loadProducts, loadSettings]);

  // ── Products CRUD ─────────────────────────────────────────────────
  const handleAddProduct = () => {
    const newProduct: Product = {
      id: '', name: 'New Product', sku: '', modelNumber: '', category: 'Uncategorized',
      gender: 'unisex', price: '₪0', description: '', shortDescription: '', manufacturer: '',
      warranty: '', deliveryTime: '', payments: '', filters: [], seoKeywords: [], images: [], status: 'draft',
      lastUpdated: new Date().toISOString(),
    };
    setSelectedProduct(newProduct);
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (updatedProduct: Product) => {
    try {
      const isNew = !updatedProduct.id;
      const r = await fetch(
        isNew ? '/api/products' : `/api/products/${updatedProduct.id}`,
        { method: isNew ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updatedProduct) }
      );
      if (!r.ok) {
        const errBody = await r.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${r.status}`);
      }
      const saved = await r.json();
      setProducts(prev => isNew ? [saved, ...prev] : prev.map(p => p.id === saved.id ? saved : p));
      setIsModalOpen(false);
      showNotification('success', t.successSave);
    } catch (err: any) {
      showNotification('error', 'שמירה נכשלה: ' + (err?.message || 'נסה שוב'));
    }
  };

  const handleSyncProductsToDB = async (productsToSync: Product[]) => {
    setIsLoading(true);
    let successCount = 0;
    try {
      for (const p of productsToSync) {
        const isNew = !p.id;
        const r = await fetch(isNew ? '/api/products' : `/api/products/${p.id}`, {
          method: isNew ? 'POST' : 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(p)
        });
        if (r.ok) successCount++;
      }
      await loadProducts();
      showNotification('success', language === 'he' ? `${successCount} מוצרים נשמרו במלאי בהצלחה` : `${successCount} products saved successfully`);
    } catch (err) {
      showNotification('error', language === 'he' ? 'שגיאה בסנכרון חלק מהמוצרים' : 'Error syncing some products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm(t.confirmDelete)) return;
    try {
      const r = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error();
      setProducts(prev => prev.filter(p => p.id !== id));
      showNotification('success', t.productDeleted);
    } catch {
      showNotification('error', 'מחיקה נכשלה.');
    }
  };

  // ── AI Research ───────────────────────────────────────────────────
  const handleSearchWeb = () => setIsSearchModalOpen(true);

  const executeSearch = async (query: string, model?: string, writingStyle?: string, negativePrompts?: string, gender = 'unisex', image?: string) => {
    setIsSearching(true);
    try {
      const data = await searchProductData(query, language, settings, model, writingStyle, negativePrompts, gender, image);
      const newProduct: Product = {
        id: '', name: data.name || query, sku: data.sku || '', modelNumber: data.modelNumber || '',
        category: data.category || 'Uncategorized', gender: (data.gender as any) || gender || 'unisex',
        price: data.price || '₪0', zapPrice: data.zapPrice, targetPrice: data.targetPrice,
        description: data.description || '', shortDescription: data.shortDescription || '',
        manufacturer: data.manufacturer || '', warranty: data.warranty || '',
        deliveryTime: data.deliveryTime || '', payments: data.payments || '',
        movement: data.movement, diameter: data.diameter, material: data.material,
        waterResistance: data.waterResistance, glass: data.glass,
        filters: data.filters || [], seoKeywords: data.seoKeywords || [], images: [], status: 'ready',
        lastUpdated: new Date().toISOString(),
      };
      const r = await fetch('/api/products', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newProduct)
      });
      if (r.ok) {
        const saved = await r.json();
        setProducts(prev => [saved, ...prev]);
        showNotification('success', t.successResearch.replace('{query}', query));
        setIsSearchModalOpen(false);
      }
    } catch (error) {
      console.error(error);
      showNotification('error', t.errorResearch);
    } finally {
      setIsSearching(false);
    }
  };

  // ── Settings ──────────────────────────────────────────────────────
  const handleSaveSettings = async (newSettings: CompanySettings) => {
    try {
      const r = await fetch('/api/settings', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newSettings)
      });
      if (r.ok) {
        setSettings(newSettings);
        setIsSettingsModalOpen(false);
        showNotification('success', t.settingsSaved);
      }
    } catch { showNotification('error', 'שמירת הגדרות נכשלה.'); }
  };

  const handleApplyAudit = (updates: { id: string, name?: string, description?: string, seoKeywords?: string[] }[]) => {
    setProducts(prev => prev.map(p => {
      const up = updates.find(u => u.id === p.id);
      if (up) {
        return {
          ...p,
          name: up.name || p.name,
          description: up.description || p.description,
          seoKeywords: up.seoKeywords || p.seoKeywords,
          lastUpdated: new Date().toISOString()
        };
      }
      return p;
    }));
    showNotification('success', 'תוכן משודרג עודכן בהצלחה!');
  };

  // ── Filter Products ───────────────────────────────────────────────
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.sku || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.modelNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Render ────────────────────────────────────────────────────────
  if (isAuthChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Login onLogin={setUser} language={language} />;

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
            <Dashboard language={language} products={products} onViewProducts={() => setActiveView('products')} />
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
                {isLoading && <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />}
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
                onEdit={(p) => { setSelectedProduct(p); setIsViewMode(false); setIsModalOpen(true); }}
                onView={(p) => { setSelectedProduct(p); setIsViewMode(true); setIsModalOpen(true); }}
                onDelete={handleDeleteProduct}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onAudit={(selected) => {
                  setSelectedAuditProducts(selected);
                  setIsAuditModalOpen(true);
                }}
              />
            </div>
          </>
        )}

        {activeView === 'creative' && (
          <div className="p-10">
            <CreativeGenerator language={language} products={products} settings={settings} />
          </div>
        )}

        {activeView === 'assets' && (
          <div className="p-10">
            <AssetsManager language={language} brands={settings.brands?.map(b => b.brandName) || []} />
          </div>
        )}

        {activeView === 'users' && user?.role === 'admin' && (
          <div className="p-10">
            <UsersManager language={language} />
          </div>
        )}

        {activeView === 'eshop' && (user?.role === 'admin' || user?.role === 'editor') && (
          <>
            <header className="h-20 bg-white border-b px-10 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">{(t as any).eshopPipeline}</h2>
                <p className="text-sm text-gray-500">{(t as any).eshopPipelineSub}</p>
              </div>
            </header>
            <div className="flex-1 p-10 overflow-y-auto">
              <EshopPipeline language={language} settings={settings} onSaveToInventory={handleSyncProductsToDB} />
            </div>
          </>
        )}
      </main>

      <ProductModal
        isOpen={isModalOpen} product={selectedProduct} language={language} settings={settings}
        onClose={() => { setIsModalOpen(false); setIsViewMode(false); }} onSave={handleSaveProduct}
        readOnly={isViewMode} role={user?.role}
      />
      <SearchModal
        isOpen={isSearchModalOpen} language={language}
        onClose={() => setIsSearchModalOpen(false)} onSearch={executeSearch} isSearching={isSearching}
      />
      <SettingsModal
        isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)}
        settings={settings} onSave={handleSaveSettings} language={language}
      />
      <SEOMasterModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        selectedProducts={selectedAuditProducts}
        language={language}
        onApplyChanges={handleApplyAudit}
      />

      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className={cn(
              'fixed bottom-8 left-1/2 z-[100] px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 border',
              notification.type === 'success' ? 'bg-white border-green-100 text-green-800' : 'bg-white border-red-100 text-red-800'
            )}
          >
            {notification.type === 'success'
              ? <CheckCircle2 className="w-5 h-5 text-green-500" />
              : <AlertCircle className="w-5 h-5 text-red-500" />}
            <span className="font-semibold text-sm">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
