const express = require('express');
const router = express.Router();
const NodeCache = require('node-cache');
const rssCache = new NodeCache({ stdTTL: 300, checkperiod: 60 }); // 5 phút


const FEEDS = {
  'tat-ca':       'https://viethuongceramics.com/feed/',
  'tin-tuc':      'https://viethuongceramics.com/tin-tuc/feed/',
  'noi-bo':       'https://viethuongceramics.com/category/noi-bo-su-kien/feed/',
  'tin-san-pham': 'https://viethuongceramics.com/category/tin-san-pham/feed/',
};

// Helper lấy ảnh từ HTML
function extractImage(str = '') {
  const srcset = str.match(/srcset=["']([^"']+)["']/);
  if (srcset) {
    const firstUrl = srcset[1].split(',')[0].trim().split(' ')[0];
    if (firstUrl?.startsWith('https')) return firstUrl;
  }
  const m = str.match(/<img[^>]+src=["']([^"']+)["']/);
  return m ? m[1].replace(/^http:\/\//, 'https://') : null;
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
    const title   = getCDATA('title')   || getPlain('title');
    const date    = getPlain('pubDate');
    const descRaw = getCDATA('description');
    const contentRaw = block.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/)?.[1] ?? '';
    const categories = [...block.matchAll(/<category><!\[CDATA\[([\s\S]*?)\]\]><\/category>/g)].map(m => m[1].trim());
    const mediaSrc  = block.match(/<media:content[^>]+url=["']([^"']+)["']/)?.[1];
    const enclosure = block.match(/<enclosure[^>]+url=["']([^"']+)["']/)?.[1];
    const thumbnail = mediaSrc || enclosure || extractImage(contentRaw) || extractImage(descRaw) || null;
    items.push({ title, link, date, categories, description: stripHtml(descRaw), thumbnail });
  }
  return items;
}

// ==================== ROUTE /wordpress (dùng REST API, có cache) ====================
router.get('/wordpress', async (req, res) => {
  const categoryId = req.query.category || '121';
  const count = Math.min(parseInt(req.query.count ?? '20', 10), 50);
  const cacheKey = `wp_rest_${categoryId}_${count}`;

  // Kiểm tra cache
  const cached = rssCache.get(cacheKey);
  if (cached) {
    // Trả về cache, đồng thời ghi log (tùy chọn)
    return res.json({ status: 'ok', count: cached.length, items: cached, cached: true });
  }

  try {
    const url = `https://viethuongceramics.com/wp-json/wp/v2/posts?categories=${categoryId}&per_page=${count}&_embed`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'VietHuongCeramics-NewsProxy/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const posts = await response.json();

    const items = posts.map(p => ({
      title: p.title?.rendered || '',
      link: p.link,
      date: p.date,
      description: p.excerpt?.rendered?.replace(/<[^>]*>/g, '').trim() || '',
      thumbnail: p._embedded?.['wp:featuredmedia']?.[0]?.source_url || null,
    }));

    // Lưu cache
    rssCache.set(cacheKey, items);
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    res.json({ status: 'ok', count: items.length, items, cached: false });
  } catch (err) {
    if (!['fetch failed', 'ENOTFOUND', 'ECONNREFUSED'].some(e => err.message.includes(e))) {
      console.error('[WordPress API Error]', err.message);}
    // Nếu có cache cũ (dù hết hạn) vẫn trả về để fallback
    const staleCache = rssCache.get(cacheKey);
    if (staleCache) {
      return res.json({ status: 'ok', count: staleCache.length, items: staleCache, cached: true, stale: true });
    }
    res.status(502).json({ error: 'Không thể tải tin tức', detail: err.message });
  }
});

// ==================== ROUTE / (RSS feed cũ, giữ nguyên nhưng thêm cache) ====================
router.get('/', async (req, res) => {
  const slug  = req.query.feed ?? 'tat-ca';
  const count = Math.min(parseInt(req.query.count ?? '20', 10), 50);
  const feedUrl = FEEDS[slug];
  if (!feedUrl) {
    return res.status(400).json({ error: 'Feed không tồn tại', validFeeds: Object.keys(FEEDS) });
  }

  const cacheKey = `rss_${slug}_${count}`;
  const cached = rssCache.get(cacheKey);
  if (cached) {
    return res.json({ status: 'ok', feed: slug, count: cached.length, items: cached, cached: true });
  }

  try {
    const response = await fetch(feedUrl, {
      headers: { 'User-Agent': 'VietHuongCeramics-NewsProxy/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`Feed trả về HTTP ${response.status}`);
    const xml = await response.text();
    const items = parseXML(xml).slice(0, count);
    rssCache.set(cacheKey, items);
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    res.json({ status: 'ok', feed: slug, count: items.length, items, cached: false });
  }    catch (err) {
    if (!['fetch failed', 'ENOTFOUND', 'ECONNREFUSED'].some(e => err.message.includes(e))) {
      console.error('[RSS Proxy]', err.message);
    }
    const staleCache = rssCache.get(cacheKey);
    if (staleCache) {
      return res.json({ status: 'ok', feed: slug, count: staleCache.length, items: staleCache, cached: true, stale: true });
    }
    res.status(502).json({ error: 'Không lấy được feed', detail: err.message });
  }
});

module.exports = router;