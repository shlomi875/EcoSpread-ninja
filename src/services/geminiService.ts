import { Product, CompanySettings } from '../types';
import { Language } from '../i18n';

export async function searchProductData(
  query: string,
  lang: Language = 'he',
  settings?: CompanySettings
): Promise<Partial<Product>> {
  const r = await fetch('/api/ai/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, language: lang, settings }),
  });
  if (!r.ok) throw new Error('AI search failed');
  return r.json();
}

export async function generateProductContent(
  product: Partial<Product>,
  lang: Language = 'he',
  settings?: CompanySettings
): Promise<string> {
  const r = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product, language: lang, settings }),
  });
  if (!r.ok) throw new Error('AI generate failed');
  const data = await r.json();
  return data.content;
}

export async function generateCreativeContent(
  product: Product,
  platform: 'facebook' | 'instagram' | 'twitter' | 'telegram' | 'whatsapp' | 'custom',
  lang: Language = 'he',
  settings?: CompanySettings,
  customPrompt?: string
): Promise<string> {
  const r = await fetch('/api/ai/creative', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product, platform, language: lang, settings, customPrompt }),
  });
  if (!r.ok) throw new Error('AI creative failed');
  const data = await r.json();
  return data.content;
}
