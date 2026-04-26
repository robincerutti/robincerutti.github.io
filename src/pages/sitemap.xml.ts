import { readFileSync } from 'fs';

function sectionToSlug(s: any): string | null {
  if (s.hidden) return null;
  if (!s.group) return s.id.toLowerCase().replace(/\s+/g, '-');
  const g = s.group.toLowerCase();
  const sub = s.id.slice(g.length + 1);
  return g + '/' + sub.toLowerCase().replace(/\s+/g, '-');
}

export function GET() {
  const root = process.cwd();
  const manifest = JSON.parse(readFileSync(root + '/public/manifest.json', 'utf-8'));
  const baseUrl = 'https://robincerutti.com';
  const today = new Date().toISOString().split('T')[0];

  const urls: string[] = [
    `  <url>\n    <loc>${baseUrl}/portraits/</loc>\n    <changefreq>weekly</changefreq>\n    <priority>1.0</priority>\n    <lastmod>${today}</lastmod>\n  </url>`
  ];

  for (const s of manifest.sections) {
    const slug = sectionToSlug(s);
    if (!slug) continue;
    if (slug === 'portraits') continue; // already added
    urls.push(`  <url>\n    <loc>${baseUrl}/${slug}/</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n    <lastmod>${today}</lastmod>\n  </url>`);
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml' }
  });
}
