import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
}

export function SEO({ 
  title = "EcoSpread: E-commerce Intelligence Hub", 
  description = "A professional tool for e-commerce data collection, content generation, and product management with a high-fidelity spreadsheet interface.", 
  keywords = ["e-commerce", "AI product research", "inventory management", "SEO tool", "Gemini AI"],
  image = "https://picsum.photos/seed/ecospread/1200/630",
  url = window.location.href 
}: SEOProps) {
  const fullTitle = title.includes("EcoSpread") ? title : `${title} | EcoSpread`;
  const keywordString = keywords.join(", ");

  return (
    <Helmet>
      {/* Standard Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywordString} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={url} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />

      {/* Additional SEO Best Practices */}
      <link rel="canonical" href={url} />
      <meta name="robots" content="index, follow" />
    </Helmet>
  );
}
