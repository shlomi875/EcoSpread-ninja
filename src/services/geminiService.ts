import { GoogleGenAI, Type } from "@google/genai";
import { Product, CompanySettings } from "../types";
import { Language } from "../i18n";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function searchProductData(
  query: string, 
  lang: Language = 'he',
  settings?: CompanySettings
): Promise<Partial<Product>> {
  const brandConfigs = settings?.brands || [];
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Research the watch "${query}" and provide structured data for an e-commerce store. 
    
    STRICT FORMATTING RULES:
    1. TITLE: Must be "שעון יד לגבר / לאישה, [Brand English] ([Brand Hebrew] if short) [Model Number]".
    2. SKU (מק"ט): Identical to model number. Remove dots (.), keep hyphens (-).
    3. PAYMENTS: Always "10 תשלומים ללא ריבית".
    4. DELIVERY: Always "3 ימי עסקים".
    5. ZAP: Search for the product on Zap.co.il. Provide the link and the lowest price.
    6. TARGET PRICE: Calculate as (Zap Lowest Price - ${settings?.targetPriceOffset || 5}).
    7. CATEGORIES: 
       - Parent: "מותגי שעונים" -> Sub: "[Brand Name]".
       - Additional: "שעונים לגבר / לאישה / לילדים" -> Sub: "[Brand Name]".
    8. DESCRIPTION: Provide a short, high-converting marketing description. 
       CRITICAL: DO NOT include technical specs (diameter, movement, etc.) in the description to avoid duplication with filters.
    9. SEO KEYWORDS: Provide a list of 5-10 relevant keywords for this product.
    10. FILTERS: Extract Movement, Diameter (e.g. "42 מ״מ"), Material, Gender, Water Resistance, Glass.
    
    BRAND CONTEXT:
    ${brandConfigs.map(b => `- ${b.brandName}: Warranty: ${b.warranty}, Min Price: ${b.minPrice}`).join('\n')}
    
    Provide the response in ${lang === 'he' ? 'Hebrew' : 'English'}.`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          sku: { type: Type.STRING },
          modelNumber: { type: Type.STRING },
          category: { type: Type.STRING },
          subCategory: { type: Type.STRING },
          gender: { type: Type.STRING, enum: ['men', 'women', 'unisex', 'kids'] },
          price: { type: Type.STRING },
          zapPrice: { type: Type.STRING },
          zapLink: { type: Type.STRING },
          targetPrice: { type: Type.STRING },
          description: { type: Type.STRING },
          shortDescription: { type: Type.STRING },
          manufacturer: { type: Type.STRING },
          warranty: { type: Type.STRING },
          deliveryTime: { type: Type.STRING },
          payments: { type: Type.STRING },
          movement: { type: Type.STRING },
          diameter: { type: Type.STRING },
          material: { type: Type.STRING },
          waterResistance: { type: Type.STRING },
          glass: { type: Type.STRING },
          filters: { 
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          seoKeywords: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["name", "sku", "modelNumber", "category", "price", "description", "warranty", "deliveryTime", "payments"]
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    return {};
  }
}

export async function generateProductContent(
  product: Partial<Product>, 
  lang: Language = 'he',
  settings?: CompanySettings
): Promise<string> {
  const companyContext = settings ? `
  Company Context:
  - Name: ${settings.name}
  - Phone: ${settings.phone}
  - Email: ${settings.email}
  - About: ${settings.about}
  ` : '';

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Write a professional, high-converting product page content in ${lang === 'he' ? 'Hebrew' : 'English'} for:
    Name: ${product.name}
    Category: ${product.category}
    Price: ${product.price}
    Keywords: ${product.seoKeywords?.join(", ")}
    
    ${companyContext}
    
    Include a catchy headline, benefits, and technical specifications. Use the company information where appropriate.`,
  });

  return response.text;
}

export async function generateCreativeContent(
  product: Product,
  platform: 'facebook' | 'instagram' | 'twitter' | 'telegram' | 'whatsapp' | 'custom',
  lang: Language = 'he',
  settings?: CompanySettings,
  customPrompt?: string
): Promise<string> {
  const companyContext = settings ? `
  Company Context:
  - Name: ${settings.name}
  - Phone: ${settings.phone}
  - Email: ${settings.email}
  - About: ${settings.about}
  ` : '';

  const platformPrompts = {
    facebook: "Write a high-engaging Facebook post with emojis, a catchy headline, benefits, and a clear call to action.",
    instagram: "Write a visually-descriptive Instagram caption with relevant hashtags and an inviting tone.",
    twitter: "Write a concise, punchy Twitter thread (up to 3 tweets) about this product.",
    telegram: "Write a professional update for a Telegram channel, highlighting key features and price.",
    whatsapp: "Write a friendly, personal-sounding WhatsApp message to send to customers or groups.",
    custom: customPrompt || "Write a creative marketing text for this product."
  };

  const prompt = `
    Product Data:
    - Name: ${product.name}
    - SKU: ${product.sku}
    - Price: ${product.price}
    - Category: ${product.category}
    - Description: ${product.description}
    - Technical Specs: ${product.movement ? `Movement: ${product.movement}, ` : ''}${product.diameter ? `Diameter: ${product.diameter}, ` : ''}${product.material ? `Material: ${product.material}` : ''}
    
    ${companyContext}
    
    Task: ${platformPrompts[platform]}
    
    Language: ${lang === 'he' ? 'Hebrew' : 'English'}
    
    Output: Provide ONLY the generated text, ready to be copied and pasted.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
  });

  return response.text;
}
