import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/he/internal', '/en/internal', '/he/change-order', '/en/change-order', '/api/'],
    },
    sitemap: 'https://binyaneitan.com/sitemap.xml',
  }
}
