import { Product, CompanySettings } from '../types';
import { Language } from '../i18n';
import { DEFAULT_AI_MODEL } from '../lib/aiModels';

export async function searchProductData(
  query: string,
  lang: Language = 'he',
  settings?: CompanySettings,
  model = DEFAULT_AI_MODEL,
  writingStyle = 'marketing',
  negativePrompts = '',
  gender = 'unisex',
  image?: string
): Promise<Partial<Product>> {
  const r = await fetch('/api/ai/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, language: lang, settings, model, writingStyle, negativePrompts, gender, image }),
  });
  if (!r.ok) throw new Error('AI search failed');
  return r.json();
}

export async function generateProductContent(
  product: Partial<Product>,
  lang: Language = 'he',
  settings?: CompanySettings,
  model = DEFAULT_AI_MODEL
): Promise<string> {
  const r = await fetch('/api/ai/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product, language: lang, settings, model }),
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
  customPrompt?: string,
  model = DEFAULT_AI_MODEL
): Promise<string> {
  const r = await fetch('/api/ai/creative', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product, platform, language: lang, settings, customPrompt, model }),
  });
  if (!r.ok) throw new Error('AI creative failed');
  const data = await r.json();
  return data.content;
}

export async function seoAudit(
  products: Partial<Product>[],
  lang: Language = 'he',
  model = DEFAULT_AI_MODEL
): Promise<any[]> {
  const r = await fetch('/api/ai/seo-audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ products, language: lang, model }),
  });
  if (!r.ok) throw new Error('SEO audit failed');
  return r.json();
}
