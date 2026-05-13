import { readFileSync } from 'fs';

function sectionToSlug(s: any): string | null {
  if (s.hidden) return null;
  if (!s.group) return s.id.toLowerCase().replace(/\s+/g, '-');
  const g = s.group.toLowerCase();
  const sub = s.id.slice(g.length + 1);
  return g + '/' + sub.toLowerCase().replace(/\s+/g, '-');
}

function esc(s: string): string {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function getPhotos(s: any): { url: string; caption: string }[] {
  const photos: { url: string; caption: string }[] = [];
  const add = (p: any) => {
    const url = p.url.startsWith('/') ? p.url : '/' + p.url;
    photos.push({ url, caption: p.caption || s.label });
  };
  if (s.photos) s.photos.forEach(add);
  if (s.blocks) s.blocks.forEach((b: any) => { if (b.type === 'gallery') b.photos.forEach(add); });
  return photos;
}

export function GET() {
  const root = process.cwd();
  const manifest = JSON.parse(readFileSync(root + '/public/manifest.json', 'utf-8'));
  const baseUrl = 'https://robincerutti.com';
  const today = new Date().toISOString().split('T')[0];

  const urls: string[] = [];

  for (const s of manifest.sections) {
    const slug = sectionToSlug(s);
    if (!slug) continue;

    const priority = slug === 'portraits' ? '1.0' : '0.8';
    const changefreq = slug === 'portraits' ? 'weekly' : 'monthly';
    const photos = getPhotos(s);

    const imageBlocks = photos.slice(0, 50).map(p =>
      `    <image:image>\n      <image:loc>${baseUrl}${esc(p.url)}</image:loc>\n      <image:title>${esc(p.caption)}</image:title>\n    </image:image>`
    ).join('\n');

    urls.push(
      `  <url>\n    <loc>${baseUrl}/${slug}/</loc>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n    <lastmod>${today}</lastmod>\n${imageBlocks}\n  </url>`
    );
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join('\n')}\n</urlset>\n`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml' }
  });
}
