import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { GoogleGenAI, Type } from '@google/genai';
import { db } from './src/db/client';
import { users, products, assets, companySettings } from './src/db/schema';
import { eq } from 'drizzle-orm';
import 'dotenv/config';

const __dirname = process.cwd();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

  // ─── AI / Gemini ───────────────────────────────────────────────────
  app.post('/api/ai/search', authenticate, async (req, res) => {
    const { query, language, settings } = req.body;
    const brandConfigs = settings?.brands || [];
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Research the watch "${query}" and provide structured data for an e-commerce store.
STRICT FORMATTING RULES:
1. TITLE: Must be "שעון יד לגבר / לאישה, [Brand English] ([Brand Hebrew] if short) [Model Number]".
2. SKU: Identical to model number. Remove dots (.), keep hyphens (-).
3. PAYMENTS: Always "10 תשלומים ללא ריבית".
4. DELIVERY: Always "3 ימי עסקים".
5. ZAP: Search for the product on Zap.co.il. Provide the link and the lowest price.
6. TARGET PRICE: Calculate as (Zap Lowest Price - ${settings?.targetPriceOffset || 5}).
7. CATEGORIES: Parent: "מותגי שעונים" -> Sub: "[Brand Name]".
8. DESCRIPTION: Short, high-converting marketing description (no technical specs).
9. SEO KEYWORDS: 5-10 relevant keywords.
10. FILTERS: Movement, Diameter, Material, Gender, Water Resistance, Glass.
BRAND CONTEXT:
${brandConfigs.map((b: any) => `- ${b.brandName}: Warranty: ${b.warranty}, Min Price: ${b.minPrice}`).join('\n')}
Provide the response in ${language === 'he' ? 'Hebrew' : 'English'}.`,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING }, sku: { type: Type.STRING }, modelNumber: { type: Type.STRING },
              category: { type: Type.STRING }, subCategory: { type: Type.STRING },
              gender: { type: Type.STRING }, price: { type: Type.STRING },
              zapPrice: { type: Type.STRING }, zapLink: { type: Type.STRING },
              targetPrice: { type: Type.STRING }, description: { type: Type.STRING },
              shortDescription: { type: Type.STRING }, manufacturer: { type: Type.STRING },
              warranty: { type: Type.STRING }, deliveryTime: { type: Type.STRING },
              payments: { type: Type.STRING }, movement: { type: Type.STRING },
              diameter: { type: Type.STRING }, material: { type: Type.STRING },
              waterResistance: { type: Type.STRING }, glass: { type: Type.STRING },
              filters: { type: Type.ARRAY, items: { type: Type.STRING } },
              seoKeywords: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['name', 'sku', 'modelNumber', 'category', 'price', 'description', 'warranty', 'deliveryTime', 'payments'],
          },
        },
      });
      res.json(JSON.parse(response.text));
    } catch (e: any) {
      console.error('Gemini search error:', e.message);
      res.status(500).json({ error: 'AI search failed' });
    }
  });

  app.post('/api/ai/generate', authenticate, async (req, res) => {
    const { product, language, settings } = req.body;
    const companyContext = settings ? `Company: ${settings.name}, Phone: ${settings.phone}, Email: ${settings.email}, About: ${settings.about}` : '';
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Write a professional, high-converting product page content in ${language === 'he' ? 'Hebrew' : 'English'} for:
Name: ${product.name}, Category: ${product.category}, Price: ${product.price}, Keywords: ${product.seoKeywords?.join(', ')}
${companyContext}
Include a catchy headline, benefits, and technical specifications.`,
      });
      res.json({ content: response.text });
    } catch (e: any) {
      console.error('Gemini generate error:', e.message);
      res.status(500).json({ error: 'AI generate failed' });
    }
  });

  app.post('/api/ai/creative', authenticate, async (req, res) => {
    const { product, platform, language, settings, customPrompt } = req.body;
    const companyContext = settings ? `Company: ${settings.name}, Phone: ${settings.phone}, About: ${settings.about}` : '';
    const platformPrompts: Record<string, string> = {
      facebook: 'Write a high-engaging Facebook post with emojis, a catchy headline, benefits, and a clear call to action.',
      instagram: 'Write a visually-descriptive Instagram caption with relevant hashtags and an inviting tone.',
      twitter: 'Write a concise, punchy Twitter thread (up to 3 tweets) about this product.',
      telegram: 'Write a professional update for a Telegram channel, highlighting key features and price.',
      whatsapp: 'Write a friendly, personal-sounding WhatsApp message to send to customers or groups.',
      custom: customPrompt || 'Write a creative marketing text for this product.',
    };
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `Product: ${product.name}, Price: ${product.price}, Description: ${product.description}
${companyContext}
Task: ${platformPrompts[platform] || platformPrompts.custom}
Language: ${language === 'he' ? 'Hebrew' : 'English'}
Output: Provide ONLY the generated text, ready to copy and paste.`,
      });
      res.json({ content: response.text });
    } catch (e: any) {
      console.error('Gemini creative error:', e.message);
      res.status(500).json({ error: 'AI creative failed' });
    }
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
