# START-HERE — Claude Code Build Instructions
## EcoSpread-ninja: הוספת PostgreSQL + Deployment

> פתח Claude Code בתיקיית הפרויקט: `C:\Users\Lenovo\MASTER\EcoSpread-ninja`
> הדבק את הפרומפטים לפי הסדר. כל פרומפט = שלב אחד עצמאי.

---

## ✅ Prerequisites (בצע ידנית לפני שמתחיל)

1. **צור Dev DB ב-Coolify** לפי ה-DEV-ENV.md
2. **צור `.env` בשורש הפרויקט:**
   ```
   NODE_ENV=development
   PORT=3000
   DATABASE_URL=postgresql://ecospread_user:PASSWORD@77.42.72.207:5433/ecospread
   JWT_SECRET=ecospread_local_dev_secret_32chars_min
   GEMINI_API_KEY=YOUR_KEY_HERE
   ```
3. **וודא שהרפו קיים ב-GitHub**: https://github.com/shlomi875/EcoSpread-ninja

---

## PROMPT 1 — Install Dependencies + Database Setup

```
I'm working on EcoSpread-ninja, a React+Vite+Express TypeScript project.
The project currently has NO database — all data is in React state and is lost on page refresh.
I need to add PostgreSQL persistence using Drizzle ORM.

TASK: Install all required packages and create the database schema.

Step 1 — Install packages:
Run this command:
npm install drizzle-orm pg @types/pg drizzle-kit multer @types/multer uuid @types/uuid

Step 2 — Create src/db/schema.ts with this EXACT content:

```typescript
import { pgTable, text, uuid, timestamptz, jsonb, integer, numeric } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('viewer'),
  createdAt: timestamptz('created_at').defaultNow(),
});

export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  sku: text('sku'),
  modelNumber: text('model_number'),
  category: text('category'),
  subCategory: text('sub_category'),
  gender: text('gender').default('unisex'),
  price: text('price'),
  zapPrice: text('zap_price'),
  zapLink: text('zap_link'),
  targetPrice: text('target_price'),
  minPrice: text('min_price'),
  description: text('description'),
  shortDescription: text('short_description'),
  manufacturer: text('manufacturer'),
  warranty: text('warranty'),
  deliveryTime: text('delivery_time'),
  payments: text('payments'),
  movement: text('movement'),
  diameter: text('diameter'),
  material: text('material'),
  waterResistance: text('water_resistance'),
  glass: text('glass'),
  filters: text('filters').array().default([]),
  seoKeywords: text('seo_keywords').array().default([]),
  images: text('images').array().default([]),
  status: text('status').default('draft'),
  lastUpdated: timestamptz('last_updated').defaultNow(),
  createdAt: timestamptz('created_at').defaultNow(),
});

export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  category: text('category').notNull(),
  brand: text('brand'),
  model: text('model'),
  size: text('size'),
  date: text('date'),
  url: text('url').notNull(),
  createdAt: timestamptz('created_at').defaultNow(),
});

export const companySettings = pgTable('company_settings', {
  id: integer('id').primaryKey().default(1),
  name: text('name'),
  phone: text('phone'),
  email: text('email'),
  about: text('about'),
  targetPriceOffset: numeric('target_price_offset').default('-5'),
  brands: jsonb('brands').default([]),
});
```

Step 3 — Create src/db/client.ts with this EXACT content:

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool, { schema });
export { pool };
```

Step 4 — Create drizzle.config.ts in the project root with this content:

```typescript
import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

Step 5 — Add these scripts to package.json (merge with existing scripts):
```json
"db:generate": "drizzle-kit generate",
"db:migrate": "drizzle-kit migrate",
"db:push": "drizzle-kit push",
"db:studio": "drizzle-kit studio",
"seed": "tsx src/db/seed.ts",
"build:server": "esbuild server.ts --bundle --platform=node --target=node20 --outfile=dist-server/server.js --external:pg-native"
```

Step 6 — Create src/db/seed.ts with this EXACT content:

```typescript
import { db } from './client';
import { users, companySettings } from './schema';
import bcrypt from 'bcryptjs';

async function seed() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const passwordHash = await bcrypt.hash('EcoAdmin2026!', 10);
  await db.insert(users).values({
    email: 'admin@ecospread.co.il',
    passwordHash,
    name: 'Admin EcoSpread',
    role: 'admin',
  }).onConflictDoNothing();

  // Create default company settings
  await db.insert(companySettings).values({
    id: 1,
    name: 'EcoSpread Watches',
    phone: '+972-50-1234567',
    email: 'info@ecospread-watches.co.il',
    about: 'מומחים לשעוני יוקרה ומותגים מובילים.',
    targetPriceOffset: '-5',
    brands: [
      { brandName: 'Tissot', warranty: 'שנתיים אחריות יבואן רשמי', minPrice: '₪1,500' },
      { brandName: 'Casio', warranty: 'שנה אחריות יבואן רשמי', minPrice: '₪200' },
    ],
  }).onConflictDoNothing();

  console.log('✅ Seed complete!');
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
```

After creating all files, run:
npm run db:push

This will create all tables in the dev database.
Then run:
npm run seed

Confirm: all files created, tables exist in DB, seed ran successfully.
```

---

## PROMPT 2 — Replace server.ts with Full PostgreSQL API

```
The EcoSpread-ninja project now has Drizzle ORM + PostgreSQL set up.

TASK: Replace the entire content of server.ts with a complete Express server
that has REAL database-backed API routes.

Replace server.ts with this complete content:

```typescript
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';
import { db } from './src/db/client';
import { users, products, assets, companySettings } from './src/db/schema';
import { eq } from 'drizzle-orm';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production';
const UPLOADS_DIR = process.env.NODE_ENV === 'production'
  ? '/app/uploads'
  : path.join(__dirname, 'public', 'uploads');

// Ensure uploads directory exists
if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// Auth middleware
function authenticate(req: any, res: any, next: any) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function requireRole(...roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(cookieParser());

  // Serve uploaded files
  app.use('/uploads', express.static(UPLOADS_DIR));

  // ─── Health ────────────────────────────────────────────────────────
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ─── Auth ──────────────────────────────────────────────────────────
  app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
    res.json({ id: user.id, email: user.email, role: user.role, name: user.name });
  });

  app.post('/api/logout', (_req, res) => {
    res.clearCookie('token');
    res.json({ success: true });
  });

  app.get('/api/me', authenticate, (req: any, res) => {
    res.json(req.user);
  });

  // ─── Products ──────────────────────────────────────────────────────
  app.get('/api/products', authenticate, async (_req, res) => {
    const rows = await db.select().from(products).orderBy(products.createdAt);
    res.json(rows);
  });

  app.post('/api/products', authenticate, requireRole('admin', 'editor'), async (req, res) => {
    const [row] = await db.insert(products).values({
      ...req.body,
      lastUpdated: new Date(),
    }).returning();
    res.json(row);
  });

  app.put('/api/products/:id', authenticate, requireRole('admin', 'editor'), async (req, res) => {
    const [row] = await db.update(products)
      .set({ ...req.body, lastUpdated: new Date() })
      .where(eq(products.id, req.params.id))
      .returning();
    res.json(row);
  });

  app.delete('/api/products/:id', authenticate, requireRole('admin'), async (req, res) => {
    await db.delete(products).where(eq(products.id, req.params.id));
    res.json({ success: true });
  });

  // ─── Assets ────────────────────────────────────────────────────────
  app.get('/api/assets', authenticate, async (_req, res) => {
    const rows = await db.select().from(assets).orderBy(assets.createdAt);
    res.json(rows);
  });

  app.post('/api/assets', authenticate, requireRole('admin', 'editor'), async (req, res) => {
    const [row] = await db.insert(assets).values(req.body).returning();
    res.json(row);
  });

  app.delete('/api/assets/:id', authenticate, requireRole('admin'), async (req, res) => {
    await db.delete(assets).where(eq(assets.id, req.params.id));
    res.json({ success: true });
  });

  // ─── Settings ──────────────────────────────────────────────────────
  app.get('/api/settings', authenticate, async (_req, res) => {
    const [row] = await db.select().from(companySettings).where(eq(companySettings.id, 1)).limit(1);
    res.json(row || {});
  });

  app.put('/api/settings', authenticate, requireRole('admin'), async (req, res) => {
    const existing = await db.select().from(companySettings).where(eq(companySettings.id, 1)).limit(1);
    let row;
    if (existing.length > 0) {
      [row] = await db.update(companySettings).set(req.body).where(eq(companySettings.id, 1)).returning();
    } else {
      [row] = await db.insert(companySettings).values({ id: 1, ...req.body }).returning();
    }
    res.json(row);
  });

  // ─── Users (Admin) ─────────────────────────────────────────────────
  app.get('/api/users', authenticate, requireRole('admin'), async (_req, res) => {
    const rows = await db.select({
      id: users.id, email: users.email, name: users.name, role: users.role, createdAt: users.createdAt
    }).from(users);
    res.json(rows);
  });

  app.post('/api/users', authenticate, requireRole('admin'), async (req, res) => {
    const { email, password, name, role } = req.body;
    const passwordHash = bcrypt.hashSync(password, 10);
    const [row] = await db.insert(users).values({ email, passwordHash, name, role }).returning({
      id: users.id, email: users.email, name: users.name, role: users.role
    });
    res.json(row);
  });

  app.put('/api/users/:id', authenticate, requireRole('admin'), async (req, res) => {
    const { email, name, role, password } = req.body;
    const updates: any = { email, name, role };
    if (password) updates.passwordHash = bcrypt.hashSync(password, 10);
    const [row] = await db.update(users).set(updates).where(eq(users.id, req.params.id)).returning({
      id: users.id, email: users.email, name: users.name, role: users.role
    });
    res.json(row);
  });

  app.delete('/api/users/:id', authenticate, requireRole('admin'), async (req, res) => {
    await db.delete(users).where(eq(users.id, req.params.id));
    res.json({ success: true });
  });

  // ─── File Upload ───────────────────────────────────────────────────
  app.post('/api/upload', authenticate, upload.single('file'), (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const url = `/uploads/${req.file.filename}`;
    res.json({ url, filename: req.file.filename, size: req.file.size });
  });

  // ─── Vite / Static ─────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 EcoSpread running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
```

After creating the file, test it:
npm run dev

Open http://localhost:3000 — should load the app.
Login with admin@ecospread.co.il / EcoAdmin2026!
Confirm the API works: http://localhost:3000/api/health
```

---

## PROMPT 3 — Refactor Frontend: Products + Settings API Integration

```
EcoSpread-ninja now has full database-backed API routes.

TASK: Refactor src/App.tsx to load products and settings from the API,
and persist all changes to the database.

Replace the entire content of src/App.tsx with this updated version.
The key changes are:
1. Remove INITIAL_PRODUCTS and INITIAL_SETTINGS constants
2. Add useEffect to load products from GET /api/products on mount
3. Add useEffect to load settings from GET /api/settings on mount
4. handleAddProduct → POST /api/products
5. handleSaveProduct → PUT /api/products/:id (if exists) or POST /api/products
6. handleDeleteProduct → DELETE /api/products/:id
7. handleSaveSettings → PUT /api/settings
8. executeSearch (Gemini result) → POST /api/products to persist

Here is the complete updated App.tsx:

```typescript
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
      if (!r.ok) throw new Error('Save failed');
      const saved = await r.json();
      setProducts(prev => isNew ? [saved, ...prev] : prev.map(p => p.id === saved.id ? saved : p));
      setIsModalOpen(false);
      showNotification('success', t.successSave);
    } catch {
      showNotification('error', 'שמירה נכשלה. נסה שוב.');
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

  const executeSearch = async (query: string) => {
    setIsSearching(true);
    try {
      const data = await searchProductData(query, language, settings);
      const newProduct: Product = {
        id: '', name: data.name || query, sku: data.sku || '', modelNumber: data.modelNumber || '',
        category: data.category || 'Uncategorized', gender: data.gender || 'unisex',
        price: data.price || '₪0', zapPrice: data.zapPrice, targetPrice: data.targetPrice,
        description: data.description || '', shortDescription: data.shortDescription || '',
        manufacturer: data.manufacturer || '', warranty: data.warranty || '',
        deliveryTime: data.deliveryTime || '', payments: data.payments || '',
        movement: data.movement, diameter: data.diameter, material: data.material,
        waterResistance: data.waterResistance, glass: data.glass,
        filters: data.filters || [], seoKeywords: data.seoKeywords || [], images: [], status: 'ready',
        lastUpdated: new Date().toISOString(),
      };
      // Save to DB immediately
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
      <SEO />
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
                onEdit={(p) => { setSelectedProduct(p); setIsModalOpen(true); }}
                onDelete={handleDeleteProduct}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
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
      </main>

      <ProductModal
        isOpen={isModalOpen} product={selectedProduct} language={language} settings={settings}
        onClose={() => setIsModalOpen(false)} onSave={handleSaveProduct}
      />
      <SearchModal
        isOpen={isSearchModalOpen} language={language}
        onClose={() => setIsSearchModalOpen(false)} onSearch={executeSearch} isSearching={isSearching}
      />
      <SettingsModal
        isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)}
        settings={settings} onSave={handleSaveSettings} language={language}
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
```

Test: npm run dev → login → add a product → refresh the page → product should still be there.
```

---

## PROMPT 4 — Refactor AssetsManager to Use API

```
TASK: Refactor src/components/AssetsManager.tsx to load assets from the API
and persist all changes.

Replace the AssetsManager component's state management to use API calls:

1. Replace INITIAL_ASSETS constant with empty array useState([])
2. Add useEffect to load assets from GET /api/assets on mount
3. handleUpload (after modal confirm) → POST /api/assets with the asset data
4. Add handleDelete function → DELETE /api/assets/:id

Find the line:
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);

Replace with:
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);

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

Also remove the INITIAL_ASSETS const at the top of the file (the hardcoded mock data).

After updating, test: npm run dev → go to Assets view → should load from DB → add new asset → refresh → should persist.
```

---

## PROMPT 5 — Add File Upload to UploadAssetModal

```
TASK: Update src/components/UploadAssetModal.tsx to use the real /api/upload endpoint
for uploading files to the server.

Find the file upload/submit handler in UploadAssetModal.tsx.
When a file is selected and the user submits:

1. Create FormData and append the file
2. POST to /api/upload
3. Use the returned URL as the asset's url field
4. Then call onUpload with the complete Asset object

The key code pattern to add:

```typescript
const handleSubmit = async () => {
  if (!file) return;

  // Upload file first
  const formData = new FormData();
  formData.append('file', file);

  const uploadRes = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!uploadRes.ok) {
    alert('Upload failed');
    return;
  }

  const { url } = await uploadRes.json();

  const newAsset: Asset = {
    id: '',  // will be assigned by DB
    name: file.name,
    type: getFileType(file),  // 'image' | 'video' | 'vector' | 'other'
    category: selectedCategory,
    brand: selectedBrand,
    model: modelInput,
    size: formatFileSize(file.size),
    date: new Date().toISOString().split('T')[0],
    url,
  };

  onUpload(newAsset);
  onClose();
};
```

Implement this in the existing modal component.
Test: upload a real image file → it should appear in the assets list with a real URL.
```

---

## PROMPT 6 — Create Dockerfile

```
TASK: Create a production Dockerfile for the EcoSpread-ninja project.
This is a Vite + React frontend + Express backend TypeScript project.
The build produces: dist/ (Vite frontend) + dist-server/server.js (bundled Express).

Create Dockerfile in the project root with this EXACT content:

```dockerfile
# ── Stage 1: Build Frontend + Server ──────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Build Vite frontend
RUN npm run build

# Bundle Express server with esbuild
RUN npx esbuild server.ts \
    --bundle \
    --platform=node \
    --target=node20 \
    --outfile=dist-server/server.js \
    --external:pg-native \
    --external:vite \
    --external:@vitejs/plugin-react \
    --external:@tailwindcss/vite

# ── Stage 2: Production Runner ─────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat wget
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 ecospread

# Copy production node_modules (only prod deps)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built files
COPY --from=builder --chown=ecospread:nodejs /app/dist ./dist
COPY --from=builder --chown=ecospread:nodejs /app/dist-server ./dist-server
COPY --from=builder --chown=ecospread:nodejs /app/migrations ./migrations
COPY --from=builder --chown=ecospread:nodejs /app/src/db ./src/db

# Uploads volume mount point
RUN mkdir -p /app/uploads && chown ecospread:nodejs /app/uploads

USER ecospread
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["node", "dist-server/server.js"]
```

Also create .dockerignore in project root:
```
node_modules
.env
.env.*
dist
dist-server
_ARCHITECT-BRAIN
*.log
.git
```

Test the Docker build locally:
docker build -t ecospread-test .
docker run -p 3001:3000 -e DATABASE_URL="..." -e JWT_SECRET="test" -e NODE_ENV=production ecospread-test

Check http://localhost:3001/api/health → should return { status: 'ok' }
```

---

## PROMPT 7 — Create GitHub Actions CI/CD

```
TASK: Create the GitHub Actions workflow for automatic build + deploy.

Create .github/workflows/deploy.yml with this EXACT content:

```yaml
name: Build & Deploy EcoSpread-ninja

on:
  push:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    name: Build Docker Image
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=sha-
            type=ref,event=branch
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Setup Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and Push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    name: Trigger Coolify Deploy
    runs-on: ubuntu-latest
    needs: build-and-push

    steps:
      - name: Deploy via Coolify Webhook
        run: |
          curl -fsSL \
            -H "Authorization: Bearer ${{ secrets.COOLIFY_WEBHOOK_TOKEN }}" \
            "${{ secrets.COOLIFY_WEBHOOK_URL }}"
```

Then update .gitignore to include:

```
node_modules/
.env
.env.local
.env.production
dist/
dist-server/
_ARCHITECT-BRAIN/
*.log
.DS_Store
uploads/
```

Make sure migrations/ is NOT in .gitignore — it must be committed.

Then run the first migration to generate migration files:
npm run db:generate

Commit everything:
git add .
git commit -m "feat: add PostgreSQL persistence, Dockerfile, CI/CD"
git push origin main

This will trigger the first GitHub Actions build.
Monitor: https://github.com/shlomi875/EcoSpread-ninja/actions
```

---

## PROMPT 8 — Production Database Migration Script

```
TASK: Add a migration runner that runs automatically when the Docker container starts.

Currently, Drizzle needs to run migrations on startup in production.
Add this to server.ts, at the TOP of the startServer() function (before app.listen):

```typescript
// Run migrations on startup
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import path from 'path';

// Inside startServer(), before app.listen:
try {
  console.log('Running DB migrations...');
  await migrate(db, {
    migrationsFolder: path.join(process.cwd(), 'migrations')
  });
  console.log('✅ Migrations complete');
} catch (e) {
  console.error('❌ Migration failed:', e);
  // Don't crash — tables may already exist
}
```

Also add this import at the top of server.ts:
import { migrate } from 'drizzle-orm/node-postgres/migrator';

This ensures every deployment auto-migrates the production DB.
Test locally: npm run dev → check console for "Migrations complete".
```

---

## FINAL VERIFICATION CHECKLIST

Run these checks before pushing:

```bash
# 1. TypeScript check
npx tsc --noEmit
# Expected: 0 errors

# 2. Dev server works
npm run dev
# Expected: loads at http://localhost:3000

# 3. API health check
curl http://localhost:3000/api/health
# Expected: {"status":"ok","timestamp":"..."}

# 4. Login works
# Go to http://localhost:3000 → login with admin@ecospread.co.il / EcoAdmin2026!

# 5. Add product → refresh → product persists ✅
# 6. Upload asset → refresh → asset persists ✅
# 7. Update settings → refresh → settings persist ✅

# 8. Docker build (optional local test)
docker build -t ecospread-ninja:test .
# Expected: builds successfully

# 9. Push to trigger CI/CD
git push origin main
# Monitor: https://github.com/shlomi875/EcoSpread-ninja/actions
```
