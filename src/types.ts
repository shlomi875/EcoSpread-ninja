export type AppView = 'dashboard' | 'products' | 'creative' | 'assets' | 'users' | 'eshop';

// ─── eShop Pipeline ────────────────────────────────────────────────
export type EshopProductStatus = 'pending' | 'enriching' | 'done' | 'error' | 'skipped';

export interface EshopProduct {
  _idx: number;
  _raw: Record<string, any>;
  _status: EshopProductStatus;
  _error?: string;
  // Identity
  itemIdent: string;
  itemId: string;
  brand: string;
  // GlobalMiscFields (watch specs)
  movement: string;
  diameter: string;
  warrantyMisc: string;
  material: string;
  gender: string;
  waterResistance: string;
  glass: string;
  // Core
  category: string;
  subCategory: string;
  name: string;
  description: string;
  shortDescription: string;
  modelNumber: string;
  // Pricing
  salePrice: string;
  costPrice: string;
  regularPrice: string;
  // Logistics
  deliveryTime: string;
  deliveryPrice: string;
  maxPayments: string;
  warranty: string;
  warrantyText: string;
  // SEO
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  searchWords: string;
  // Supplier
  manufacturer: string;
  supplierName: string;
  // Media & URLs
  images: string;
  zapUrl: string;
  zapMinPrice: string;
  friendlyUrl: string;
  itemStatus: string;
}

export interface AppUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'editor' | 'viewer';
  createdAt?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  modelNumber: string;
  category: string;
  subCategory?: string;
  gender: 'men' | 'women' | 'unisex' | 'kids';
  price: string;
  zapPrice?: string;
  zapLink?: string;
  targetPrice?: string;
  minPrice?: string;
  description: string;
  shortDescription: string;
  manufacturer: string;
  warranty: string;
  deliveryTime: string;
  payments: string;
  // Watch specific filters
  movement?: string;
  diameter?: string;
  material?: string;
  waterResistance?: string;
  glass?: string;
  
  filters: string[];
  seoKeywords: string[];
  images: string[];
  status: 'draft' | 'ready' | 'published';
  lastUpdated: string;
}

export interface BrandConfig {
  brandName: string;
  warranty: string;
  minPrice: string;
}

export interface CompanySettings {
  name: string;
  phone: string;
  email: string;
  about: string;
  targetPriceOffset: number;
  brands: BrandConfig[];
}

export type ProductField = keyof Product;

export interface Asset {
  id: string;
  name: string;
  type: 'image' | 'video' | 'vector' | 'other';
  category: 'banner' | 'product' | 'social' | 'logo' | 'other';
  brand?: string;
  model?: string;
  size: string;
  date: string;
  url: string;
}
