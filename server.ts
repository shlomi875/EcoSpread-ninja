import express from 'express';
import { createServer as createViteServer } from 'vite';
import { randomUUID } from 'crypto';
import path from 'path';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { GoogleGenAI } from '@google/genai';
import { db } from './src/db/client';
import { users, products, assets, companySettings } from './src/db/schema';
import { eq, inArray, or } from 'drizzle-orm';
import 'dotenv/config';
import {
  isConfigured as eshopConfigured,
  getCategories as eshopGetCategories,
  pushProduct as eshopPushProduct,
  countEshopCategoryResponse,
  PushableProduct,
  PushResult,
} from './src/services/eshopApi';

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

  app.use(express.json({ limit: '50mb' })); // temporary: allows old base64 products to be saved while migrating to URL-based images
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
    const { id, createdAt, lastUpdated, ...rest } = req.body;
    const [row] = await db.insert(products).values({
      id: id || randomUUID(),
      ...rest,
      lastUpdated: new Date(),
    }).returning();
    res.json(row);
  });

  // Converts base64 image strings to uploaded files, returns URL array
  function migrateBase64Images(images: string[]): string[] {
    return images.map((img) => {
      if (!img.startsWith('data:image/')) return img; // already a URL
      try {
        const match = img.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!match) return img;
        const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
        const filename = `${randomUUID()}.${ext}`;
        const filepath = path.join(UPLOADS_DIR, filename);
        writeFileSync(filepath, Buffer.from(match[2], 'base64'));
        return `/uploads/${filename}`;
      } catch {
        return img; // keep as-is on error
      }
    });
  }

  app.put('/api/products/:id', authenticate, requireRole('admin', 'editor'), async (req, res) => {
    try {
      const { id, createdAt, lastUpdated, ...rest } = req.body;
      if (Array.isArray(rest.images)) {
        rest.images = migrateBase64Images(rest.images);
      }
      const [row] = await db.update(products)
        .set({ ...rest, lastUpdated: new Date() })
        .where(eq(products.id, req.params.id))
        .returning();
      if (!row) return res.status(404).json({ error: 'Product not found' });
      res.json(row);
    } catch (err: any) {
      console.error('PUT /api/products error:', err);
      res.status(500).json({ error: err?.message || 'Internal server error' });
    }
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
    const { id, createdAt, ...rest } = req.body;
    const [row] = await db.insert(assets).values(rest).returning();
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
    let row: typeof companySettings.$inferSelect;
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
    const { query, language, settings, model, writingStyle = 'marketing', negativePrompts = '', gender = 'unisex', image } = req.body;
    const brandConfigs = settings?.brands || [];
    const styleGuide: Record<string, string> = {
      marketing: 'high-converting marketing copy — focus on emotional benefits, urgency, and aspirational language',
      formal: 'formal and professional tone — precise, authoritative, no slang or emojis',
      casual: 'casual and friendly tone — conversational, approachable, like talking to a friend',
      technical: 'technical and spec-focused — emphasize accuracy, measurements, and product details',
    };
    try {
      let prompt = `Research the product "${query}" and provide structured data for an e-commerce store.
STRICT FORMATTING RULES:
1. TITLE: Must be "שעון יד ${language === 'he' ? (gender === 'women' ? 'לאישה' : 'לגבר') : (gender === 'women' ? 'for Women' : 'for Men')}, [Brand English] ([Brand Hebrew] if short) [Model Number]".
2. SKU: Identical to model number. Remove dots (.), keep hyphens (-).
3. PAYMENTS: Always "10 תשלומים ללא ריבית".
4. DELIVERY: Always "3 ימי עסקים".
5. ZAP: Search for the product on Zap.co.il. Provide the link and the lowest price.
6. TARGET PRICE: Calculate as (Zap Lowest Price - ${settings?.targetPriceOffset || 5}%).
7. CATEGORIES: Parent: "מותגי שעונים" -> Sub: "[Brand Name]".
8. DESCRIPTION: ${styleGuide[writingStyle] || styleGuide.marketing} (no technical specs in description).
9. SEO KEYWORDS: 5-10 relevant keywords.
10. FILTERS: Movement, Diameter, Material, Gender, Water Resistance, Glass.
${negativePrompts ? `STRICTLY AVOID mentioning any of the following in the description: ${negativePrompts}.` : ''}
BRAND CONTEXT:
${brandConfigs.map((b: any) => `- ${b.brandName}: Warranty: ${b.warranty}, Min Price: ${b.minPrice}`).join('\n')}

GENDER CONTEXT: This product is strictly for ${gender}. Ensure all descriptions and titles reflect this.

Provide the response in ${language === 'he' ? 'Hebrew' : 'English'}.

IMPORTANT: Return ONLY a valid JSON object with these fields (no markdown, no code blocks, no "Sure", start with {):
{"name":"","sku":"","modelNumber":"","category":"","subCategory":"","gender":"${gender}","price":"","zapPrice":"","zapLink":"","targetPrice":"","description":"","shortDescription":"","manufacturer":"","warranty":"","deliveryTime":"","payments":"","movement":"","diameter":"","material":"","waterResistance":"","glass":"","filters":[],"seoKeywords":[]}`;

      let result;
      if (image) {
        // ── Step 1: Vision — identify the product from the image ──────
        const [mimeTypePart, base64Data] = image.split(',');
        const mimeTypeMatch = mimeTypePart.match(/:(.*?);/);
        const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
        const visionResult = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [
            { inlineData: { data: base64Data, mimeType } },
            { text: 'Identify this watch. Return ONLY: {"brand":"","model":"","fullName":""}. No markdown.' },
          ]}]
        });
        const visionText = visionResult.text?.trim() ?? '';
        const visionMatch = visionText.match(/\{[\s\S]*?\}/);
        const identified = visionMatch ? JSON.parse(visionMatch[0]) : {};
        // Use identified name as the search query, fallback to user-provided query
        const resolvedQuery = identified.fullName || identified.brand && identified.model
          ? `${identified.brand} ${identified.model}`.trim()
          : (query || 'unknown watch');

        // ── Step 2: Web search with the identified product name ───────
        result = await ai.models.generateContent({
          model: model || 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: prompt.replace(`"${query}"`, `"${resolvedQuery}"`) }] }],
          config: { tools: [{ googleSearch: {} }] },
        });
      } else {
        // Standard text search with Google Search grounding
        result = await ai.models.generateContent({
          model: model || 'gemini-2.5-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: { tools: [{ googleSearch: {} }] },
        });
      }

      const text = result.text?.trim() ?? '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON found in response');
      res.json(JSON.parse(match[0]));
    } catch (e: any) {
      console.error('Gemini search error:', e.message);
      res.status(500).json({ error: 'AI search failed', detail: e.message });
    }
  });

  app.post('/api/ai/generate', authenticate, async (req, res) => {
    const { product, language, settings, model = 'gemini-2.0-flash' } = req.body;
    const companyContext = settings ? `Company: ${settings.name}, Phone: ${settings.phone}, Email: ${settings.email}, About: ${settings.about}` : '';
    try {
      const response = await ai.models.generateContent({
        model,
        contents: `Write a professional, high-converting product page content in ${language === 'he' ? 'Hebrew' : 'English'} for:
Name: ${product.name}, Category: ${product.category}, Price: ${product.price}, Keywords: ${product.seoKeywords?.join(', ')}
${companyContext}
Include a catchy headline, benefits, and technical specifications.

STRICT RULE: Return ONLY the generated text. Do NOT include any introduction, "Sure", "Here is your content", or markdown code blocks. Just the content itself.`,
      });
      res.json({ content: response.text });
    } catch (e: any) {
      console.error('Gemini generate error:', e.message);
      res.status(500).json({ error: 'AI generate failed' });
    }
  });

  app.post('/api/ai/creative', authenticate, async (req, res) => {
    const { product, platform, language, settings, customPrompt, model = 'gemini-2.0-flash' } = req.body;
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
        model,
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

  // ── Helper: resolve an image URL/path to base64 ──────────────────────────
  async function resolveImageToBase64(imageUrl: string): Promise<{ data: string; mimeType: string } | null> {
    try {
      let imageData: string;
      let mimeType = 'image/jpeg';
      if (imageUrl.startsWith('/uploads/')) {
        const filePath = path.join(UPLOADS_DIR, path.basename(imageUrl));
        if (!existsSync(filePath)) return null;
        const { readFileSync } = await import('fs');
        const ext = path.extname(imageUrl).toLowerCase().replace('.', '');
        mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
        imageData = readFileSync(filePath).toString('base64');
      } else if (imageUrl.startsWith('data:image/')) {
        // Already base64
        const [meta, b64] = imageUrl.split(',');
        const m = meta.match(/:(.*?);/);
        mimeType = m ? m[1] : 'image/jpeg';
        imageData = b64;
      } else {
        // External URL
        const { default: https } = await import('https');
        const { default: http } = await import('http');
        const protocol = imageUrl.startsWith('https') ? https : http;
        imageData = await new Promise((resolve, reject) => {
          protocol.get(imageUrl, (response) => {
            const chunks: Buffer[] = [];
            response.on('data', (chunk: Buffer) => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
            response.on('error', reject);
          }).on('error', reject);
        });
        if (imageUrl.toLowerCase().endsWith('.png')) mimeType = 'image/png';
      }
      return { data: imageData, mimeType };
    } catch {
      return null;
    }
  }

  app.post('/api/ai/seo-audit', authenticate, async (req, res) => {
    const { products: auditProducts, language, model = 'gemini-2.0-flash' } = req.body;
    try {
      // ── Step 1: Vision pre-pass — extract VISUAL GROUND TRUTH from product images ──
      const visionData: Record<string, any> = {};
      for (const p of auditProducts) {
        const firstImage = Array.isArray(p.images) ? p.images[0] : (p.images || '');
        if (!firstImage) continue;
        try {
          const resolved = await resolveImageToBase64(firstImage);
          if (!resolved) continue;
          const visionResult = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: [
              { inlineData: { data: resolved.data, mimeType: resolved.mimeType } },
              { text: `Analyze this watch product image. Extract ONLY what you can VISUALLY CONFIRM with certainty.
Return ONLY valid JSON (no markdown, start with {):
{
  "colors": ["e.g. black, silver — only clearly visible colors"],
  "strapMaterial": "silicone|leather|stainless-steel|rubber|fabric-nato|ceramic|titanium — or empty string if unsure",
  "caseMaterial": "stainless-steel|gold|titanium|ceramic|pvd|dlc — or empty string if unsure",
  "watchStyle": "luxury|minimalist|chronograph|classic|dress|sport|dive|fashion|military-watch — or empty string",
  "dialColor": "main dial/face color description",
  "visualDescription": "1-2 precise sentences describing what you visually see: strap type, case shape, dial color, any visible features"
}
Be conservative — return empty string for anything not clearly visible.` }
            ]}]
          });
          const vt = visionResult.text?.trim() ?? '';
          const vm = vt.match(/\{[\s\S]*?\}/);
          if (vm) visionData[p.id] = JSON.parse(vm[0]);
        } catch (vErr: any) {
          console.warn(`Vision pass skipped for product ${p.id}:`, vErr.message);
        }
      }

      // ── Step 2: SEO audit with vision-corrected context ───────────────────────
      const prompt = `Analyze the following e-commerce watch products for SEO, AEO (Answer Engine Optimization), and GEO (Generative Engine Optimization).
For each product, provide:
1. A Score (0-100).
2. Key improvements for Title, Description, and Keywords.
3. An "Upgraded Content" version optimized for conversion and search engines.

CRITICAL RULE: Each product may have a "VISUAL GROUND TRUTH" section extracted directly from the product image.
These visual facts are 100% accurate and MUST override any conflicting text data.
If the visual data says "silicone strap" but the name says "metal strap" — use silicone in the upgraded content.
If visual data says colors include "black" — reflect that accurately in the upgraded name and description.

Products to analyze:
${auditProducts.map((p: any) => {
  const vision = visionData[p.id];
  return `
ID: ${p.id}
Name: ${p.name}
Description: ${p.description}
Keywords: ${p.seoKeywords?.join(', ')}
Existing Specs: movement=${p.movement || '?'}, diameter=${p.diameter || '?'}, material=${p.material || '?'}, strapMaterial=${p.strapMaterial || '?'}, caseMaterial=${p.caseMaterial || '?'}, colors=${Array.isArray(p.colors) ? p.colors.join(', ') : p.colors || '?'}
${vision ? `⚡ VISUAL GROUND TRUTH (from image — use these as facts):
  - Strap Material: ${vision.strapMaterial || 'not detected'}
  - Case Material: ${vision.caseMaterial || 'not detected'}
  - Colors: ${vision.colors?.join(', ') || 'not detected'}
  - Watch Style: ${vision.watchStyle || 'not detected'}
  - Dial Color: ${vision.dialColor || 'not detected'}
  - Visual Description: ${vision.visualDescription || 'n/a'}` : '(no image available for visual analysis)'}`;
}).join('\n---\n')}

Language: ${language === 'he' ? 'Hebrew' : 'English'}

STRICT FORMATTING: Return ONLY a valid JSON array (one object per product, no markdown):
[{"id": "", "score": 85, "suggestions": "...", "upgradedName": "...", "upgradedDescription": "...", "upgradedKeywords": []}]`;

      const response = await ai.models.generateContent({ model, contents: prompt });
      const text = response.text || '';
      const match = text.match(/\[[\s\S]*\]/);
      if (!match) throw new Error('No JSON found in response');
      res.json(JSON.parse(match[0]));
    } catch (e: any) {
      console.error('SEO Audit error:', e.message);
      res.status(500).json({ error: 'SEO Audit failed' });
    }
  });

  // ─── eShop Pipeline ────────────────────────────────────────────────
  const uploadMemory = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

  // Parse eShop CSV / XLSX → return JSON array of products
  app.post('/api/eshop/parse', authenticate, uploadMemory.single('file'), async (req: any, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws, { raw: false, defval: '' });

      const products = rows.map((row, idx) => ({
        _idx: idx,
        _raw: row,
        _status: 'pending',
        // Identity
        itemIdent: String(row['ItemIdent'] || ''),
        itemId: String(row['ItemId'] || '').trim(),
        brand: String(row['{GlobalMiscField}מותג'] || '').trim(),
        // Watch specs (GlobalMiscFields)
        movement: String(row['{GlobalMiscField}מנגנון'] || ''),
        diameter: String(row['{GlobalMiscField}קוטר'] || ''),
        warrantyMisc: String(row['{GlobalMiscField}אחריות'] || ''),
        material: String(row['{GlobalMiscField}חומר'] || ''),
        gender: String(row['{GlobalMiscField}מגדר'] || ''),
        waterResistance: String(row['{GlobalMiscField}עמידות למים'] || ''),
        glass: String(row['{GlobalMiscField}זכוכית'] || ''),
        // Core product
        category: String(row['category'] || ''),
        subCategory: String(row['SubCategory'] || ''),
        name: String(row['Name'] || '').trim(),
        description: String(row['Description'] || ''),
        shortDescription: String(row['ShortDescription'] || ''),
        modelNumber: String(row['ItemModel'] || ''),
        // Pricing
        salePrice: String(row['SalePrice'] || ''),
        costPrice: String(row['CostPrice'] || ''),
        regularPrice: String(row['RegularPrice'] || ''),
        // Logistics
        deliveryTime: String(row['DeliveryTime'] || ''),
        deliveryPrice: String(row['DeliveryPrice'] || ''),
        maxPayments: String(row['maxpayments'] || ''),
        warranty: String(row['Warranty'] || ''),
        warrantyText: String(row['WarrantyText'] || ''),
        // SEO
        seoTitle: String(row['SeoTitle'] || ''),
        seoDescription: String(row['SeoDescription'] || ''),
        seoKeywords: String(row['SeoKeywords'] || ''),
        searchWords: String(row['SearchWords'] || ''),
        // Supplier
        manufacturer: String(row['ManufactName'] || ''),
        supplierName: String(row['SupplierName'] || ''),
        // Media
        images: String(row['images'] || ''),
        zapUrl: String(row['zap_url'] || ''),
        zapMinPrice: String(row['ZapMinimumPrice'] || ''),
        friendlyUrl: String(row['friendlyurl'] || ''),
        itemStatus: String(row['ItemStatus'] || ''),
      }));

      res.json(products);
    } catch (err: any) {
      console.error('eShop parse error:', err.message);
      res.status(500).json({ error: 'Failed to parse file', detail: err.message });
    }
  });

  // AI-enrich a single product (fill missing fields)
  app.post('/api/eshop/enrich-product', authenticate, async (req, res) => {
    const { product, language = 'he', settings: cfg, model = 'gemini-2.0-flash', writingStyle = 'marketing' } = req.body;

    const styles: Record<string, string> = {
      marketing: 'high-converting marketing copy — emotional benefits, urgency, aspirational language',
      formal: 'formal and professional — precise, authoritative, no slang',
      casual: 'casual and friendly — conversational, approachable',
      technical: 'technical and spec-focused — accuracy, measurements, product details',
    };

    const FIELDS = ['description', 'shortDescription', 'movement', 'diameter', 'material', 'gender', 'waterResistance', 'glass', 'watchStyle', 'strapMaterial', 'caseMaterial', 'colors', 'seoTitle', 'seoDescription', 'seoKeywords'] as const;
    const missing: string[] = FIELDS.filter(f => !product[f]?.trim());
    if (!missing.includes('name')) missing.push('name'); // Always rewrite name

    if (!missing.length) return res.json({ ...product, _status: 'skipped' });

    const brandConfigs = cfg?.brands || [];
    const brandConfig = brandConfigs.find((b: any) => b.brandName?.toLowerCase() === product.brand?.toLowerCase());

    // Split missing fields into two buckets:
    // - CONTENT fields: AI always generates these (descriptions, SEO, name)
    // - SPEC fields: AI ONLY fills if it has verified knowledge of this exact model
    const CONTENT_FIELDS = new Set(['name', 'description', 'shortDescription', 'seoTitle', 'seoDescription', 'seoKeywords']);
    const SPEC_FIELDS = new Set(['movement', 'diameter', 'material', 'gender', 'waterResistance', 'glass', 'watchStyle', 'strapMaterial', 'caseMaterial', 'colors']);

    const missingContent = missing.filter(f => CONTENT_FIELDS.has(f));
    const missingSpecs   = missing.filter(f => SPEC_FIELDS.has(f));

    const prompt = `You are an expert Hebrew e-commerce content writer specializing in watches.
Your task: fill in ONLY the missing fields listed below for this product.

Product info:
- Name: ${product.name}
- Brand: ${product.brand}
- Category: ${product.category}
- Sale Price: ₪${product.salePrice}
- Model / SKU: ${product.itemId}
- Warranty: ${product.warrantyText || (product.warranty + ' חודשים')}
${product.movement      ? `- Movement (existing): ${product.movement}`           : ''}
${product.diameter      ? `- Diameter (existing): ${product.diameter}`           : ''}
${product.material      ? `- Material (existing): ${product.material}`           : ''}
${product.gender        ? `- Gender (existing): ${product.gender}`               : ''}
${product.waterResistance ? `- Water Resistance (existing): ${product.waterResistance}` : ''}
${product.glass         ? `- Glass (existing): ${product.glass}`                 : ''}
${product.watchStyle    ? `- Watch Style (existing): ${product.watchStyle}`      : ''}
${product.strapMaterial ? `- Strap Material (existing): ${product.strapMaterial}` : ''}
${product.caseMaterial  ? `- Case Material (existing): ${product.caseMaterial}` : ''}
${brandConfig ? `Brand Config: Warranty=${brandConfig.warranty}, MinPrice=₪${brandConfig.minPrice}` : ''}

Missing CONTENT fields to generate: ${missingContent.join(', ') || '(none)'}
Missing SPEC fields to fill: ${missingSpecs.join(', ') || '(none)'}

Style guide for descriptions: ${styles[writingStyle] || styles.marketing}

═══ RULES FOR CONTENT FIELDS (description, shortDescription, seoTitle, seoDescription, seoKeywords, name) ═══
1. All text MUST be in Hebrew
2. description: 150-200 words, compelling marketing copy based on EXISTING specs only, no bullet points
3. shortDescription: 2 concise sentences
4. seoTitle: max 60 chars — format "שעון יד [מותג] [דגם] | [benefit]"
5. seoDescription: 150-160 chars max
6. seoKeywords: comma-separated string, 5-8 Hebrew keywords
7. name: clean title with brand + model + gender context, max 60 chars
8. NEVER invent or mention specs in the description that are not listed in the existing product data above

═══ RULES FOR SPEC FIELDS (movement, glass, waterResistance, strapMaterial, caseMaterial, material, diameter, gender, watchStyle, colors) ═══
⚠️  ACCURACY IS CRITICAL — retailers display this data to customers. A wrong spec is WORSE than an empty field.
9.  ONLY fill a spec field if you have VERIFIED, HIGH-CONFIDENCE knowledge of this EXACT model number (${product.itemId}) or the product name clearly states the spec.
10. If you are not certain → return "" (empty string). DO NOT GUESS. DO NOT ASSUME based on brand, price or category alone.
11. If the product name/SKU explicitly encodes a spec (e.g. name contains "Automatic", "Sapphire", "Leather", "Steel", "100M") → use it.
12. If you know this specific model from your training data and are confident → fill it in.
13. If you are even slightly unsure → return "".

═══ ALLOWED VALUES FOR SPEC FIELDS ═══
- gender: men | women | unisex
- waterResistance: splash-resistant | up-to-30m | up-to-50m | up-to-100m | up-to-200m | diver-200m-plus
- glass: sapphire-crystal | mineral-glass | acrylic | mineral-crystal
- movement: quartz | automatic | mechanical-manual | solar | kinetic | smartwatch | automatic-in-house
- diameter: free text e.g. "42 מ\"מ" (only if explicitly known)
- material: free text e.g. "נירוסטה" (legacy field, only if certain)
- watchStyle: luxury | minimalist | chronograph | classic | dress | fashion | military-watch | modern-design | sport | tactical | dive
- strapMaterial: stainless-steel | titanium | gold | ceramic | pvd | dlc | leather | rubber | silicone | fabric-nato
- caseMaterial: stainless-steel | titanium | gold | ceramic | dlc | CARBONOX | bronze | pvd | metal-alloy | silver-plated | silver-plated-metal | rose-gold-plated-metal | gold-plated-metal
- colors: comma-separated 1-3 keys from: black | white | gray | cream | silver | gold | rose-gold | titanium | bronze | blue | navy-blue | green | olive-green | red | burgundy | brown | yellow | champagne | Rose Gold

Return ONLY valid JSON (no markdown, no \`\`\`, no intro text, start with {):
{"name":"","description":"","shortDescription":"","movement":"","diameter":"","material":"","gender":"","waterResistance":"","glass":"","watchStyle":"","strapMaterial":"","caseMaterial":"","colors":"","seoTitle":"","seoDescription":"","seoKeywords":""}`;

    try {
      const result = await ai.models.generateContent({ model, contents: prompt });
      const text = result.text?.trim() ?? '';
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error('No JSON in AI response');
      const enriched = JSON.parse(match[0]);

      // Merge: only fill in genuinely missing fields
      const merged: any = { ...product, _status: 'done' };
      for (const f of missing) {
        if (enriched[f]?.trim()) merged[f] = enriched[f].trim();
      }
      res.json(merged);
    } catch (err: any) {
      console.error('eShop enrich error:', err.message);
      res.status(500).json({ ...product, _status: 'error', _error: err.message });
    }
  });

  // Generate AI product image via Gemini
  app.post('/api/eshop/generate-image', authenticate, async (req, res) => {
    const { product, model = 'gemini-flash-image-generation' } = req.body;

    const genderStyle = product.gender === 'women' ? 'Elegant feminine style.' : product.gender === 'men' ? 'Classic masculine style.' : '';
    const prompt = `Professional luxury watch product photography for e-commerce.
Watch: ${product.name}
Brand: ${product.brand}
Pure white background, studio lighting, sharp focus on the watch face and all details.
${product.strapMaterial ? 'Strap material: ' + product.strapMaterial + '.' : product.material ? 'Material: ' + product.material + '.' : ''}
${product.caseMaterial  ? 'Case material: '  + product.caseMaterial  + '.' : ''}
${product.diameter      ? 'Watch size: '      + product.diameter      + '.' : ''}
${genderStyle}
High-resolution commercial product photo. No watermarks, no text, no props, no reflections.`;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseModalities: ['IMAGE'] as any },
      });

      const parts = (response.candidates?.[0]?.content?.parts ?? []) as any[];
      const imgPart = parts.find((p: any) => p.inlineData);
      if (!imgPart?.inlineData) throw new Error('No image data in response');

      const { data, mimeType } = imgPart.inlineData;
      const ext = (mimeType || 'image/png').split('/')[1]?.replace('jpeg', 'jpg') || 'png';
      const filename = `ai-${randomUUID()}.${ext}`;
      writeFileSync(path.join(UPLOADS_DIR, filename), Buffer.from(data, 'base64'));

      res.json({ url: `/uploads/${filename}` });
    } catch (err: any) {
      console.error('eShop image gen error:', err.message);
      res.status(500).json({ error: 'Image generation failed', detail: err.message });
    }
  });

  // Analyze an existing product image via Gemini Vision
  app.post('/api/eshop/analyze-image', authenticate, async (req, res) => {
    const { imageUrl, product } = req.body;
    if (!imageUrl) return res.status(400).json({ error: 'imageUrl required' });

    try {
      // Resolve local /uploads/ URLs to absolute file paths
      let imageData: string;
      let mimeType = 'image/jpeg';

      if (imageUrl.startsWith('/uploads/')) {
        const filePath = path.join(UPLOADS_DIR, path.basename(imageUrl));
        if (!existsSync(filePath)) return res.status(404).json({ error: 'Image file not found' });
        const { readFileSync } = await import('fs');
        const ext = path.extname(imageUrl).toLowerCase().replace('.', '');
        mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
        imageData = readFileSync(filePath).toString('base64');
      } else {
        // External URL — fetch and convert to base64
        const { default: https } = await import('https');
        const { default: http } = await import('http');
        const protocol = imageUrl.startsWith('https') ? https : http;
        imageData = await new Promise((resolve, reject) => {
          protocol.get(imageUrl, (response) => {
            const chunks: Buffer[] = [];
            response.on('data', (chunk: Buffer) => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
            response.on('error', reject);
          }).on('error', reject);
        });
        if (imageUrl.endsWith('.png')) mimeType = 'image/png';
      }

      const analysisPrompt = `You are an expert e-commerce product image analyst. Analyze this watch product image and provide a detailed assessment.
Product: ${product?.name || 'Watch'}, Brand: ${product?.brand || 'Unknown'}

Provide your analysis in the following JSON format:
{
  "quality": "excellent|good|fair|poor",
  "qualityScore": 85,
  "background": "description of background",
  "lighting": "description of lighting",
  "focus": "sharp|blurry|partial",
  "composition": "centered|off-center|angled",
  "issues": ["list of issues if any"],
  "suggestions": ["list of improvement suggestions"],
  "ecommerceReady": true,
  "summary": "2-3 sentence summary of the image quality and suitability for e-commerce"
}
Return ONLY the JSON, no markdown.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { data: imageData, mimeType } },
              { text: analysisPrompt },
            ],
          },
        ],
      });

      const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      try {
        const analysis = JSON.parse(cleaned);
        res.json({ analysis });
      } catch {
        res.json({ analysis: { summary: rawText, ecommerceReady: false } });
      }
    } catch (err: any) {
      console.error('eShop analyze-image error:', err.message);
      res.status(500).json({ error: 'Image analysis failed', detail: err.message });
    }
  });

  // Edit / transform an existing product image via Gemini
  app.post('/api/eshop/edit-image', authenticate, async (req, res) => {
    const { imageUrl, instruction, product, model = 'gemini-3.1-flash-image-preview' } = req.body;
    if (!imageUrl || !instruction) return res.status(400).json({ error: 'imageUrl and instruction required' });

    try {
      // Resolve image to base64
      let imageData: string;
      let mimeType = 'image/jpeg';

      if (imageUrl.startsWith('/uploads/')) {
        const filePath = path.join(UPLOADS_DIR, path.basename(imageUrl));
        if (!existsSync(filePath)) return res.status(404).json({ error: 'Image file not found' });
        const { readFileSync } = await import('fs');
        const ext = path.extname(imageUrl).toLowerCase().replace('.', '');
        mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
        imageData = readFileSync(filePath).toString('base64');
      } else {
        const { default: https } = await import('https');
        const { default: http } = await import('http');
        const protocol = imageUrl.startsWith('https') ? https : http;
        imageData = await new Promise((resolve, reject) => {
          protocol.get(imageUrl, (response) => {
            const chunks: Buffer[] = [];
            response.on('data', (chunk: Buffer) => chunks.push(chunk));
            response.on('end', () => resolve(Buffer.concat(chunks).toString('base64')));
            response.on('error', reject);
          }).on('error', reject);
        });
        if (imageUrl.endsWith('.png')) mimeType = 'image/png';
      }

      const editPrompt = `You are a professional product photo editor for e-commerce.
Product: ${product?.name || 'Watch'}, Brand: ${product?.brand || 'Unknown'}

Edit instruction: ${instruction}

Apply the requested changes while maintaining professional e-commerce product photo quality.
Keep the watch as the main subject. Preserve all watch details and branding.`;

      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { data: imageData, mimeType } },
              { text: editPrompt },
            ],
          },
        ],
        config: { responseModalities: ['IMAGE'] as any },
      });

      const parts = (response.candidates?.[0]?.content?.parts ?? []) as any[];
      const imgPart = parts.find((p: any) => p.inlineData);
      if (!imgPart?.inlineData) throw new Error('No image data in response');

      const { data, mimeType: outMime } = imgPart.inlineData;
      const ext = (outMime || 'image/png').split('/')[1]?.replace('jpeg', 'jpg') || 'png';
      const filename = `ai-edit-${randomUUID()}.${ext}`;
      writeFileSync(path.join(UPLOADS_DIR, filename), Buffer.from(data, 'base64'));

      res.json({ url: `/uploads/${filename}` });
    } catch (err: any) {
      console.error('eShop edit-image error:', err.message);
      res.status(500).json({ error: 'Image editing failed', detail: err.message });
    }
  });

  // ─── eShop: Check which products already exist in the DB ────────────
  // Receives { itemIds: string[] } (CSV itemId / SKU values)
  // Returns { existing: string[] } — the subset that is already in the DB
  app.post('/api/eshop/check-existing', authenticate, async (req, res) => {
    const { itemIds = [] } = req.body as { itemIds: string[] };
    if (!itemIds.length) return res.json({ existing: [] });
    try {
      // Filter empty strings
      const ids = itemIds.map(String).filter(Boolean);
      if (!ids.length) return res.json({ existing: [] });

      // Match on sku OR modelNumber — either column can hold the itemId
      const rows = await db
        .select({ sku: products.sku, modelNumber: products.modelNumber })
        .from(products)
        .where(or(inArray(products.sku, ids), inArray(products.modelNumber, ids)));

      // Build a set of all matched identifiers
      const existingSet = new Set<string>();
      rows.forEach(r => {
        if (r.sku)         existingSet.add(r.sku);
        if (r.modelNumber) existingSet.add(r.modelNumber);
      });

      res.json({ existing: [...existingSet] });
    } catch (e: any) {
      console.error('check-existing error:', e.message);
      res.status(500).json({ error: 'Failed to check existing products', detail: e.message });
    }
  });

  // ─── eShop REST API (restapi.e-shops.co.il) ────────────────────────
  // Lightweight in-memory cache for categories (15 minutes)
  let categoriesCache: { at: number; data: any } | null = null;
  const CATEGORIES_TTL = 15 * 60 * 1000;

  // Health / connection status for the eShop integration
  app.get('/api/eshop/health', authenticate, async (_req, res) => {
    if (!eshopConfigured()) {
      return res.json({ configured: false, ok: false });
    }
    try {
      const data = await eshopGetCategories('he');
      const count = countEshopCategoryResponse(data);
      res.json({ configured: true, ok: true, categoriesCount: count });
    } catch (e: any) {
      console.error('[api/eshop/health] eShop request failed:', e?.message || e);
      res.json({
        configured: true,
        ok: false,
        error: e?.message || 'eShop request failed',
      });
    }
  });

  // Categories pass-through (cached)
  app.get('/api/eshop/categories', authenticate, async (_req, res) => {
    if (!eshopConfigured()) return res.status(503).json({ error: 'eShop API not configured' });
    const now = Date.now();
    if (categoriesCache && now - categoriesCache.at < CATEGORIES_TTL) {
      return res.json(categoriesCache.data);
    }
    try {
      const data = await eshopGetCategories('he');
      categoriesCache = { at: now, data };
      res.json(data);
    } catch (e: any) {
      res.status(502).json({ error: 'eShop categories fetch failed', detail: e?.message });
    }
  });

  // Push products to e-shops.co.il (upsert). Body: { products: PushableProduct[] }
  app.post('/api/eshop/push', authenticate, requireRole('admin', 'editor'), async (req: any, res) => {
    if (!eshopConfigured()) return res.status(503).json({ error: 'eShop API not configured' });

    const list: PushableProduct[] = Array.isArray(req.body?.products) ? req.body.products : [];
    if (!list.length) return res.status(400).json({ error: 'No products provided' });

    const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const origin = host ? `${proto}://${host}` : undefined;

    const results: PushResult[] = [];
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      try {
        const r = await eshopPushProduct(p, origin);
        results.push(r);
      } catch (err: any) {
        results.push({ itemId: p?.itemId || '', status: 'error', message: err?.message || 'unknown error' });
      }
      // Small delay between calls to stay polite with the remote API.
      if (i < list.length - 1) await new Promise(r => setTimeout(r, 400));
    }

    const summary = {
      total: results.length,
      added: results.filter(r => r.status === 'added').length,
      updated: results.filter(r => r.status === 'updated').length,
      errors: results.filter(r => r.status === 'error').length,
    };
    res.json({ summary, results });
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
    const appUrl = process.env.APP_URL?.replace(/\/$/, '') || `http://localhost:${PORT}`;
    console.log(`🚀 EcoSpread running on ${appUrl} (port ${PORT})`);
  });
}

startServer().catch(console.error);
