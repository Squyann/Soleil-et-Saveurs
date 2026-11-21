import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/gestion', '/document', '/compte', '/api/', '/reset-password'] },
    sitemap: 'https://soleiletsaveurs.fr/sitemap.xml',
  };
}
