const express = require('express');
const router = express.Router();
const NodeCache = require('node-cache');
const nodeFetch = require('node-fetch'); // ← thêm
const https = require('https');          // ← thêm
const rssCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

const agent = new https.Agent({ rejectUnauthorized: false }); // ← thêm

const FEEDS = {
  'tat-ca':       'https://viethuongceramics.com/feed/?posts_per_rss=50',
  'tin-tuc':      'https://viethuongceramics.com/tin-tuc/feed/?posts_per_rss=50',
  'noi-bo':       'https://viethuongceramics.com/feed/?cat=121&posts_per_rss=50',
  'tin-san-pham': 'https://viethuongceramics.com/category/tin-san-pham/feed/?posts_per_rss=50',
};

function isJunkImage(url = '') {
  if (!url) return true;
  const lower = url.toLowerCase();
  return (
    lower.includes('watermark') ||
    lower.includes('nirogranite') ||
    lower.includes('logo') ||
    lower.includes('avatar') ||
    lower.includes('gravatar') ||
    lower.includes('1x1')
  );
}

function extractImage(str = '') {
  const srcset = str.match(/srcset=["']([^"']+)["']/);
  if (srcset) {
    const firstUrl = srcset[1].split(',')[0].trim().split(' ')[0];
    if (firstUrl?.startsWith('https') && !isJunkImage(firstUrl)) return firstUrl;
  }
  const m = str.match(/<img[^>]+src=["']([^"']+)["']/);
  if (m && m[1]) {
    const url = m[1].replace(/^http:\/\//, 'https://');
    if (!isJunkImage(url)) return url;
  }
  return null;
}

function stripHtml(str = '') {
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#8211;/g, '–')
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8230;/g, '…')
    .replace(/\[…\]/g, '')
    .trim();
}

function parseXML(xml) {
  const items = [];
  const itemBlocks = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
  for (const block of itemBlocks) {
    const getCDATA = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`));
      return m ? m[1].trim() : '';
    };
    const getPlain = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`));
      return m ? m[1].trim() : '';
    };
    const link = block.match(/<link>([^<]+)<\/link>/)?.[1]?.trim() ||
                 block.match(/<guid[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/guid>/)?.[1]?.trim() ||
                 getPlain('guid');
    const title      = getCDATA('title') || getPlain('title');
    const date       = getPlain('pubDate');
    const descRaw    = getCDATA('description');
    const contentRaw = block.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/)?.[1] ?? '';
    const categories = [...block.matchAll(/<category><!\[CDATA\[([\s\S]*?)\]\]><\/category>/g)].map(m => m[1].trim());
    const mediaSrc   = block.match(/<media:content[^>]+url=["']([^"']+)["']/)?.[1];
    const enclosure  = block.match(/<enclosure[^>]+url=["']([^"']+)["']/)?.[1];
    const extracted  = extractImage(contentRaw) || extractImage(descRaw);
    const thumbnail  = (!isJunkImage(mediaSrc) ? mediaSrc : null) ||
                       (!isJunkImage(enclosure) ? enclosure : null) ||
                       extracted || null;
    items.push({ title, link, date, categories, description: stripHtml(descRaw), thumbnail });
  }
  return items;
}

async function fetchOgImages(items) {
  await Promise.all(
    items.map(async (item) => {
      if (item.thumbnail && !isJunkImage(item.thumbnail)) return;
      if (!item.link) return;
      try {
        const pageRes = await nodeFetch(item.link, {
          agent,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          timeout: 4000,
        });
        const html = await pageRes.text();
        const ogM = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i) ||
                    html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:image["']/i);
        if (ogM && ogM[1] && !isJunkImage(ogM[1])) {
          item.thumbnail = ogM[1];
        } else if (isJunkImage(item.thumbnail)) {
          item.thumbnail = null;
        }
      } catch (err) {
        if (isJunkImage(item.thumbnail)) item.thumbnail = null;
      }
    })
  );
  return items;
}

// ── ROUTE /wordpress ─────────────────────────────────────────
router.get('/wordpress', async (req, res) => {
  const categoryId = req.query.category || '121';
  const count = Math.min(parseInt(req.query.count ?? '20', 10), 50);
  const cacheKey = `wp_rest_${categoryId}_${count}`;

  const cached = rssCache.get(cacheKey);
  if (cached) return res.json({ status: 'ok', count: cached.length, items: cached, cached: true });

  try {
    const feedUrl = `https://viethuongceramics.com/feed/?cat=${categoryId}`;
    const response = await nodeFetch(feedUrl, {
      agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 8000,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const xml = await response.text();
    const items = parseXML(xml).slice(0, count);
    await fetchOgImages(items);
    rssCache.set(cacheKey, items);
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    res.json({ status: 'ok', count: items.length, items, cached: false });
  } catch (err) {
    console.error('[WordPress RSS Error]', err.message);
    const staleCache = rssCache.get(cacheKey);
    if (staleCache) return res.json({ status: 'ok', count: staleCache.length, items: staleCache, cached: true, stale: true });
    res.status(502).json({ error: 'Không thể tải tin tức', detail: err.message });
  }
});

// ── ROUTE / ──────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const slug  = req.query.feed ?? 'tat-ca';
  const count = Math.min(parseInt(req.query.count ?? '20', 10), 50);
  const feedUrl = FEEDS[slug];
  if (!feedUrl) {
    return res.status(400).json({ error: 'Feed không tồn tại', validFeeds: Object.keys(FEEDS) });
  }

  const cacheKey = `rss_${slug}_${count}`;
  const cached = rssCache.get(cacheKey);
  if (cached) return res.json({ status: 'ok', feed: slug, count: cached.length, items: cached, cached: true });

  try {
    const response = await nodeFetch(feedUrl, {
      agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 8000,
    });
    if (!response.ok) throw new Error(`Feed trả về HTTP ${response.status}`);
    const xml = await response.text();
    const items = parseXML(xml).slice(0, count);
    await fetchOgImages(items);
    rssCache.set(cacheKey, items);
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    res.json({ status: 'ok', feed: slug, count: items.length, items, cached: false });
  } catch (err) {
    console.error('[RSS Proxy]', err.message);
    const staleCache = rssCache.get(cacheKey);
    if (staleCache) return res.json({ status: 'ok', feed: slug, count: staleCache.length, items: staleCache, cached: true, stale: true });
    res.status(502).json({ error: 'Không lấy được feed', detail: err.message });
  }
});

module.exports = router;