export type AppView = 'dashboard' | 'products' | 'creative' | 'assets';

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
