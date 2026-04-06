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
  const m = str.match(/<img[^>]+src=["']([^"']+)["']/);
  return m?.[1] ?? null;
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
    const get = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
      return m ? (m[1] ?? m[2] ?? '').trim() : '';
    };

    // Categories
    const catMatches = [...block.matchAll(/<category><!\[CDATA\[([\s\S]*?)\]\]><\/category>/g)];
    const categories = catMatches.map(m => m[1].trim());

    // Thumbnail: thử media:content trước, rồi enclosure, rồi đào trong content
    const mediaSrc  = (block.match(/<media:content[^>]+url=["']([^"']+)["']/) ?? [])[1];
    const enclosure = (block.match(/<enclosure[^>]+url=["']([^"']+)["']/)    ?? [])[1];
    const content   = get('content:encoded') || get('description');
    const thumbnail = mediaSrc || enclosure || extractImage(content) || null;

    items.push({
      title:       get('title'),
      link:        get('link') || get('guid'),
      date:        get('pubDate'),
      categories,
      description: stripHtml(get('description')),
      thumbnail,
    });
  }

  return items;
}

// ── Route: GET /api/rss?feed=tat-ca&count=20 ─────────────────────────────────
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