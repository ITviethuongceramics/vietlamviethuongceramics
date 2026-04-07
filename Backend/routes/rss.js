const express = require('express');
const router  = express.Router();

// Map slug → RSS feed URL của viethuongceramics.com
const FEEDS = {
  'tat-ca':       'https://viethuongceramics.com/feed/',
  'tin-tuc':      'https://viethuongceramics.com/tin-tuc/feed/',
  'noi-bo':       'https://viethuongceramics.com/category/noi-bo-su-kien/feed/',
  'tin-san-pham': 'https://viethuongceramics.com/category/tin-san-pham/feed/',
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function extractImage(str = '') {
  // Ưu tiên lấy từ srcset (https)
  const srcset = str.match(/srcset=["']([^"']+)["']/);
  if (srcset) {
    const firstUrl = srcset[1].split(',')[0].trim().split(' ')[0];
    if (firstUrl.startsWith('https')) return firstUrl;
  }
  // Fallback: src thường, đổi http → https
  const m = str.match(/<img[^>]+src=["']([^"']+)["']/);
  return m ? m[1].replace(/^http:\/\//, 'https://') : null;
}

function stripHtml(str = '') {
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g,  '&')
    .replace(/&#8211;/g, '–')
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8230;/g, '…')
    .replace(/\[…\]/g,   '')
    .trim();
}

function parseXML(xml) {
  const items = [];
  const itemBlocks = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];

  for (const block of itemBlocks) {

    // Lấy tag đơn giản, KHÔNG dùng namespace regex chung
    const getCDATA = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`));
      return m ? m[1].trim() : '';
    };
    const getPlain = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`));
      return m ? m[1].trim() : '';
    };

    // Link: chỉ lấy <link> thuần (không namespace), fallback guid
    const link =
      block.match(/<link>([^<]+)<\/link>/)?.[1]?.trim() ||
      block.match(/<guid[^>]*><!\[CDATA\[([\s\S]*?)\]\]><\/guid>/)?.[1]?.trim() ||
      getPlain('guid');

    // Title, pubDate
    const title   = getCDATA('title')   || getPlain('title');
    const date    = getPlain('pubDate');

    // Description và content:encoded — tách rõ ràng
    const descRaw    = getCDATA('description');
    const contentRaw = block.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/)?.[1] ?? '';

    // Categories
    const categories = [...block.matchAll(/<category><!\[CDATA\[([\s\S]*?)\]\]><\/category>/g)]
      .map(m => m[1].trim());

    // Thumbnail
    const mediaSrc  = block.match(/<media:content[^>]+url=["']([^"']+)["']/)?.[1];
    const enclosure = block.match(/<enclosure[^>]+url=["']([^"']+)["']/)?.[1];
    const thumbnail = mediaSrc || enclosure || extractImage(contentRaw) || extractImage(descRaw) || null;

    items.push({
      title,
      link,
      date,
      categories,
      description: stripHtml(descRaw),
      thumbnail,
    });
  }

  return items;
}

router.get('/', async (req, res) => {
  const slug  = req.query.feed  ?? 'tat-ca';
  const count = Math.min(parseInt(req.query.count ?? '20', 10), 50);

  const feedUrl = FEEDS[slug];
  if (!feedUrl) {
    return res.status(400).json({ error: 'Feed không tồn tại', validFeeds: Object.keys(FEEDS) });
  }

  try {
    // Node 18+ có fetch built-in; nếu Node < 18 cần cài node-fetch
    const response = await fetch(feedUrl, {
      headers: { 'User-Agent': 'VietHuongCeramics-NewsProxy/1.0' },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      throw new Error(`Feed trả về HTTP ${response.status}`);
    }

    const xml   = await response.text();
    const items = parseXML(xml).slice(0, count);

    // Cache 5 phút ở CDN/browser, stale-while-revalidate 1 phút
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    res.json({ status: 'ok', feed: slug, count: items.length, items });

  } catch (err) {
    console.error('[RSS Proxy]', err.message);
    res.status(502).json({ error: 'Không lấy được feed', detail: err.message });
  }
});

module.exports = router;