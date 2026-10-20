import { SITE_URL } from '@/lib/server';

export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/dashboard', '/login', '/register', '/forgot-password', '/reset-password'] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
