// ─── e-shops.co.il REST API client (server-side only) ────────────────────────
// Maps our internal EshopProduct / Product shapes onto the ExpandProduct
// schema documented at https://restapi.e-shops.co.il/swagger/docs/v1
// and exposes push/upsert helpers used by /api/eshop/* routes.

import {
  MECHANISMS, GENDERS, WATER_RESISTANCES, GLASS_TYPES,
  WATCH_STYLES, STRAP_MATERIALS, CASE_MATERIALS, COLORS,
} from '../constants/taxonomy';

// ─── Types that mirror the swagger definitions ───────────────────────────────
export interface EshopGeneral {
  SKU: string;
  ERPid?: string;
  Name: string;
  ShortDescription?: string;
  Description?: string;
  PaymentsNoIntrest?: number;
  DeliveryTime?: number;
  Warranty?: number;
  Manufacturer?: string;
  Model?: string;
  Condition?: number;
  Inventory?: number;
  Weight?: number;
  Status?: number;
  ZapProductURL?: string;
  Langcode?: string;
  WarrantyText?: string;
  MaxPayments?: number;
  SupplierName?: string;
  ImportSource?: string;
  Barcode?: string;
  itemcost?: string;
}
export interface EshopCategory {
  CategoryName: string;
  SubcategoryName: string;
  Parent: boolean;
}
export interface EshopPrice {
  CurrencyId: number;
  DealerName?: string;
  SalePrice?: number;
  RegularPrice?: number;
  DeliveryPrice?: number;
}
export interface EshopImage {
  URL: string;
  Type: string;
  Alt?: string;
  ID?: number;
}
export interface EshopMiscField {
  Name: string;
  DataTypeValue?: string;
  Mandatory?: boolean;
  Value: string;
  CategoryName?: string;
  SubcategoryName?: string;
}
export interface EshopSEO {
  Title?: string;
  Description?: string;
  Keywords?: string;
  Source?: string;
}
export interface ExpandProduct {
  General: EshopGeneral[];
  categories: EshopCategory[];
  Prices: EshopPrice[];
  Images: EshopImage[];
  Attributes?: any[];
  Filters: EshopMiscField[];
  SEO: EshopSEO[];
  RelatedItems?: any[];
}

export interface PushResult {
  itemId: string;
  status: 'added' | 'updated' | 'skipped' | 'error';
  message?: string;
}

// Minimal shape we consume from our pipeline — a loose subset of EshopProduct.
// Kept here to avoid pulling React-only types into the server bundle.
export interface PushableProduct {
  itemId: string;
  name: string;
  brand?: string;
  manufacturer?: string;
  modelNumber?: string;
  description?: string;
  shortDescription?: string;
  category?: string;
  subCategory?: string;
  // Pricing (strings in our pipeline — we parse them)
  regularPrice?: string;
  salePrice?: string;
  deliveryPrice?: string;
  // Logistics
  deliveryTime?: string;
  maxPayments?: string;
  warranty?: string;
  warrantyText?: string;
  supplierName?: string;
  // SEO
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  // Media
  images?: string;
  zapUrl?: string;
  // Taxonomy (internal keys)
  movement?: string;
  diameter?: string;
  material?: string;
  gender?: string;
  waterResistance?: string;
  glass?: string;
  watchStyle?: string;
  strapMaterial?: string;
  caseMaterial?: string;
  colors?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
/** Coolify / Docker often inject quoted values — e-shops expects a bare GUID or SQL fails (HTTP 500). */
export function normalizedEshopApiKey(): string {
  let k = process.env.ESHOP_API_KEY ?? '';
  k = k.replace(/^\uFEFF/, '').trim();
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1).trim();
  }
  return k;
}

const BASE_URL = (process.env.ESHOP_API_BASE || 'https://restapi.e-shops.co.il').trim().replace(/\/$/, '');

export function isConfigured(): boolean {
  return normalizedEshopApiKey().length > 0;
}

/** API returns `{ Departments: [...] }` — count Category + SubCategory nodes for health metrics. */
export function countEshopCategoryResponse(data: any): number {
  if (!data || typeof data !== 'object') return 0;
  const walk = (node: any): number => {
    if (!node || typeof node !== 'object') return 0;
    let n = node.Type === 'Category' || node.Type === 'SubCategory' ? 1 : 0;
    const ch = node.Children;
    if (Array.isArray(ch)) n += ch.reduce((s: number, c: any) => s + walk(c), 0);
    return n;
  };
  const depts = data.Departments;
  if (Array.isArray(depts)) return depts.reduce((s: number, d: any) => s + walk(d), 0);
  if (Array.isArray(data)) return data.reduce((s: number, x: any) => s + walk(x), 0);
  if (Array.isArray(data.Categories)) return data.Categories.length;
  if (Array.isArray(data.categories)) return data.categories.length;
  return 0;
}

export class EshopNotConfiguredError extends Error {
  constructor() { super('eShop API not configured (ESHOP_API_KEY missing)'); }
}

function parseNumber(v: unknown): number | undefined {
  if (v === undefined || v === null || v === '') return undefined;
  const s = String(v).replace(/[^\d.\-]/g, '');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : undefined;
}

function parseInt32(v: unknown): number | undefined {
  const n = parseNumber(v);
  return n === undefined ? undefined : Math.trunc(n);
}

function nameFromKey<T extends { key: string; name: string }>(list: T[], key: string): string {
  const found = list.find(x => x.key.toLowerCase() === key.toLowerCase() || x.name === key);
  return found ? found.name : key;
}

function splitImages(raw: string | undefined, origin?: string): string[] {
  if (!raw) return [];
  return raw.split(';').map(s => s.trim()).filter(Boolean).map(u => {
    if (u.startsWith('/') && origin) return origin.replace(/\/$/, '') + u;
    return u;
  });
}

// ─── Mapper: internal → ExpandProduct ────────────────────────────────────────
export function buildExpandProduct(p: PushableProduct, origin?: string): ExpandProduct {
  const general: EshopGeneral = {
    SKU: p.itemId,
    Name: p.name,
    ShortDescription: p.shortDescription || '',
    Description: p.description || '',
    Manufacturer: p.manufacturer || p.brand || '',
    Model: p.modelNumber || '',
    Warranty: parseInt32(p.warranty) ?? 12,
    WarrantyText: p.warrantyText || '',
    DeliveryTime: parseInt32(p.deliveryTime) ?? 0,
    MaxPayments: parseInt32(p.maxPayments) ?? 0,
    SupplierName: p.supplierName || '',
    Inventory: 1,
    Status: 1,
    Langcode: 'he',
    ZapProductURL: p.zapUrl || '',
  };

  const categories: EshopCategory[] = p.category
    ? [{
        CategoryName: p.category,
        SubcategoryName: p.subCategory || p.category,
        Parent: false,
      }]
    : [];

  const regularPrice = parseNumber(p.regularPrice);
  const salePrice = parseNumber(p.salePrice);
  const deliveryPrice = parseNumber(p.deliveryPrice);
  const prices: EshopPrice[] = (regularPrice !== undefined || salePrice !== undefined || deliveryPrice !== undefined)
    ? [{
        CurrencyId: 0,
        RegularPrice: regularPrice ?? 0,
        SalePrice: salePrice ?? 0,
        DeliveryPrice: deliveryPrice ?? 0,
      }]
    : [];

  const imageUrls = splitImages(p.images, origin);
  const images: EshopImage[] = imageUrls.map((url, i) => ({
    URL: url,
    Type: 'image',
    Alt: p.name || `image-${i + 1}`,
  }));

  // Filters — map internal taxonomy keys to their Hebrew display names which
  // match the e-shops GlobalMiscField filter names used across the CSV.
  const filters: EshopMiscField[] = [];
  const addFilter = (name: string, value: string | undefined, dataType = 'ComboBox') => {
    if (!value) return;
    filters.push({ Name: name, DataTypeValue: dataType, Value: value });
  };

  if (p.brand) addFilter('מותג', p.brand, 'Text');
  if (p.movement) addFilter('מנגנון', nameFromKey(MECHANISMS, p.movement));
  if (p.diameter) addFilter('קוטר', p.diameter, 'Text');
  if (p.material) addFilter('חומר', p.material, 'Text');
  if (p.gender) addFilter('מגדר', nameFromKey(GENDERS, p.gender));
  if (p.waterResistance) addFilter('עמידות למים', nameFromKey(WATER_RESISTANCES, p.waterResistance));
  if (p.glass) addFilter('זכוכית', nameFromKey(GLASS_TYPES, p.glass));
  if (p.watchStyle) addFilter('סגנון שעון', nameFromKey(WATCH_STYLES, p.watchStyle));
  if (p.strapMaterial) addFilter('חומר רצועה', nameFromKey(STRAP_MATERIALS, p.strapMaterial));
  if (p.caseMaterial) addFilter('חומר קייס', nameFromKey(CASE_MATERIALS, p.caseMaterial));
  if (p.colors) {
    const colorKeys = p.colors.split(',').map(s => s.trim()).filter(Boolean);
    const colorNames = colorKeys.map(k => nameFromKey(COLORS, k));
    if (colorNames.length) addFilter('צבע', colorNames.join(', '), 'ComboBox with Multiple Selection');
  }

  const seo: EshopSEO[] = (p.seoTitle || p.seoDescription || p.seoKeywords)
    ? [{
        Title: p.seoTitle || '',
        Description: p.seoDescription || '',
        Keywords: p.seoKeywords || '',
      }]
    : [];

  return { General: [general], categories, Prices: prices, Images: images, Filters: filters, SEO: seo };
}

// ─── HTTP helpers ────────────────────────────────────────────────────────────
function buildUrl(pathname: string, query: Record<string, string | number | undefined> = {}) {
  if (!isConfigured()) throw new EshopNotConfiguredError();
  const qs = new URLSearchParams();
  qs.set('key', normalizedEshopApiKey());
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
  }
  return `${BASE_URL.replace(/\/$/, '')}${pathname}?${qs.toString()}`;
}

async function jsonOrText(r: Response): Promise<any> {
  const text = await r.text();
  try { return JSON.parse(text); } catch { return text; }
}

/** Cloudflare often challenges datacenter IPs; Node fetch cannot run the JS challenge. */
function isCloudflareChallengePage(status: number, bodyStr: string): boolean {
  if (status !== 403 && status !== 503) return false;
  return (
    bodyStr.includes('Just a moment') ||
    bodyStr.includes('cf-chl') ||
    bodyStr.includes('challenge-platform') ||
    bodyStr.includes('Enable JavaScript and cookies') ||
    bodyStr.includes('_cf_chl_opt')
  );
}

function eshopHttpErrorMessage(method: string, pathname: string, r: Response, data: any): string {
  const bodyStr = typeof data === 'string' ? data : JSON.stringify(data);
  const cfRay = r.headers.get('cf-ray');
  if (isCloudflareChallengePage(r.status, bodyStr)) {
    return [
      'Cloudflare חסם את הבקשה (אתגר דפדפן / Bot protection).',
      'Cloudflare blocked this request — EcoSpread runs on the server and cannot pass the JS challenge.',
      cfRay ? `cf-ray: ${cfRay}` : '',
      'Fix: ask e-shops hosting to allowlist your server\'s public outbound IP for restapi.e-shops.co.il,',
      'or add a WAF rule to skip challenges for /api/* from that IP.',
    ].filter(Boolean).join(' ');
  }
  const short =
    typeof data === 'string'
      ? bodyStr.length > 480
        ? bodyStr.slice(0, 480) + '…'
        : bodyStr
      : bodyStr.length > 480
        ? bodyStr.slice(0, 480) + '…'
        : bodyStr;
  return `${method} ${pathname} HTTP ${r.status}: ${short}`;
}

/** Some Cloudflare configs are less strict when the request looks like a normal browser. */
const ESHOP_FETCH_HEADERS: Record<string, string> = {
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
};

export async function eshopGet(pathname: string, query: Record<string, any> = {}): Promise<any> {
  const r = await fetch(buildUrl(pathname, query), { method: 'GET', headers: { ...ESHOP_FETCH_HEADERS } });
  const data = await jsonOrText(r);
  if (!r.ok) throw new Error(eshopHttpErrorMessage('GET', pathname, r, data));
  return data;
}

export async function eshopPost(pathname: string, body: unknown, query: Record<string, any> = {}): Promise<any> {
  const r = await fetch(buildUrl(pathname, query), {
    method: 'POST',
    headers: { ...ESHOP_FETCH_HEADERS, 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  const data = await jsonOrText(r);
  if (!r.ok) throw new Error(eshopHttpErrorMessage('POST', pathname, r, data));
  return data;
}

// ─── Public API ──────────────────────────────────────────────────────────────
export async function getCategories(lang: string = 'he'): Promise<any> {
  return eshopGet('/api/getcategories', { language: lang });
}

export async function getProduct(itemId: string, lang: string = 'he'): Promise<any | null> {
  try {
    const data = await eshopGet('/api/getproduct', { itemid: itemId, language: lang });
    // Heuristic — the API returns an error payload when not found.
    if (!data || (typeof data === 'object' && (data.error || data.Error || data.message === 'Item not found'))) return null;
    if (typeof data === 'string' && /not\s*found/i.test(data)) return null;
    return data;
  } catch (err: any) {
    if (/404|not\s*found/i.test(String(err?.message || ''))) return null;
    throw err;
  }
}

export async function addProductFull(product: ExpandProduct): Promise<any> {
  return eshopPost('/api/addproductobjectfull', product);
}

export async function updateProductObject(sku: string, product: ExpandProduct, lang = 'he'): Promise<any> {
  return eshopPost('/api/updateproductobject', product, { Sku: sku, Language: lang });
}

/**
 * Upsert a single product: check existence via getproduct, then add or update.
 * Always resolves to a PushResult — errors are captured, not thrown.
 */
export async function pushProduct(p: PushableProduct, origin?: string): Promise<PushResult> {
  if (!p.itemId) return { itemId: '', status: 'error', message: 'Missing itemId / SKU' };
  if (!p.name)   return { itemId: p.itemId, status: 'error', message: 'Missing name' };

  const payload = buildExpandProduct(p, origin);
  try {
    const existing = await getProduct(p.itemId);
    if (existing) {
      await updateProductObject(p.itemId, payload);
      return { itemId: p.itemId, status: 'updated' };
    }
    await addProductFull(payload);
    return { itemId: p.itemId, status: 'added' };
  } catch (err: any) {
    return { itemId: p.itemId, status: 'error', message: String(err?.message || err) };
  }
}
