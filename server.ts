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
