import { useState, useEffect, useRef, useCallback } from 'react';
import { Calendar, Tag, ChevronRight, ArrowRight, Newspaper } from 'lucide-react';
import './NewsPage.scss';

const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:5000').replace(/\/api$/, '');

const FEEDS = [

  { label: 'Tin tức',          slug: 'tin-tuc'      },

];

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function useReveal(dep) {
  const ref = useRef(null);
  useEffect(() => {
    if (!dep) return;
    const timer = setTimeout(() => {
      const obs = new IntersectionObserver(
        entries => entries.forEach(e => {
          if (e.isIntersecting) e.target.classList.add('is-visible');
        }),
        { threshold: 0.08 }
      );
      ref.current?.querySelectorAll('[data-reveal]').forEach(el => obs.observe(el));
      ref.current._obs = obs;
    }, 50);
    return () => { clearTimeout(timer); ref.current?._obs?.disconnect(); };
  }, [dep]);
  return ref;
}

export default function NewsPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [cache,     setCache]     = useState({});   // { slug: items[] }
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(false);

  const currentSlug = FEEDS[activeTab].slug;
  const news        = cache[currentSlug] ?? [];
  const pageRef     = useReveal(news.length);

  const fetchNews = useCallback(async (slug, force = false) => {
    // Đã có cache → hiện ngay, không fetch lại
    if (!force && cache[slug]) return;

    setLoading(true);
    setError(false);
    try {
      const res  = await fetch(`${API_BASE}/api/rss?feed=${slug}&count=20`);
      const data = await res.json();
      if (data.status === 'ok') {
        setCache(prev => ({ ...prev, [slug]: data.items }));
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    }
    setLoading(false);
  }, [cache]);

  // Fetch tab hiện tại
  useEffect(() => {
    fetchNews(currentSlug);
  }, [currentSlug]);

  // Prefetch các tab còn lại sau 1.5s (chạy nền, không block UI)
  useEffect(() => {
    const timer = setTimeout(() => {
      FEEDS.forEach(f => {
        if (f.slug !== currentSlug && !cache[f.slug]) {
          fetch(`${API_BASE}/api/rss?feed=${f.slug}&count=20`)
            .then(r => r.json())
            .then(data => {
              if (data.status === 'ok') {
                setCache(prev => ({ ...prev, [f.slug]: data.items }));
              }
            })
            .catch(() => {});
        }
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, []); // chỉ chạy 1 lần lúc mount

  const featured = news[0];
  const rest      = news.slice(1);

  return (
    <div className="news-page" ref={pageRef}>

      {/* ── HERO ── */}
      <div className="news-hero">
        <div className="news-hero__overlay" />
        <div className="news-hero__content">
          <span className="news-hero__eyebrow">Tin tức &amp; Sự kiện</span>
          <h1 className="news-hero__title">Cập Nhật Mới Nhất</h1>
          <p className="news-hero__sub">Theo dõi hành trình phát triển của Viet Huong Ceramics</p>
        </div>
        <div className="news-hero__wave">
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none">
            <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="#f7f4f2" />
          </svg>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="news-tabs" data-reveal>
        {FEEDS.map((f, i) => (
          <button
            key={i}
            className={`news-tab ${activeTab === i ? 'news-tab--active' : ''}`}
            onClick={() => setActiveTab(i)}
          >
            {f.label}
            {/* Chấm xanh nhỏ báo đã prefetch xong */}
            {cache[f.slug] && i !== activeTab && (
              <span style={{
                display: 'inline-block', width: 6, height: 6,
                borderRadius: '50%', background: '#22c55e',
                marginLeft: 6, verticalAlign: 'middle',
              }} />
            )}
          </button>
        ))}
      </div>

      {/* ── BODY ── */}
      <div className="news-body">

        {loading && news.length === 0 && (
          <div className="news-loading">
            <div className="news-spinner" />
            <span>Đang tải tin tức...</span>
          </div>
        )}

        {error && (
          <div className="news-error">
            <Newspaper size={48} />
            <p>Không thể tải tin tức lúc này</p>
            <button onClick={() => fetchNews(currentSlug, true)}>Thử lại</button>
          </div>
        )}

        {news.length > 0 && (
          <>
            {featured && (
              <a
                href={featured.link}
                target="_blank"
                rel="noreferrer"
                className="news-featured"
                data-reveal
              >
                <div className="news-featured__img">
                  {featured.thumbnail
                    ? <img src={featured.thumbnail} alt={featured.title} />
                    : <div className="news-featured__img-placeholder"><Newspaper size={48} /></div>
                  }
                  <div className="news-featured__img-overlay" />
                  <div className="news-featured__label">Tin nổi bật</div>
                </div>
                <div className="news-featured__content">
                  <div className="news-featured__meta">
                    {featured.categories.slice(0, 2).map((c, i) => (
                      <span className="news-cat" key={i}><Tag size={10} />{c}</span>
                    ))}
                    <span className="news-date"><Calendar size={12} />{formatDate(featured.date)}</span>
                  </div>
                  <h2 className="news-featured__title">{featured.title}</h2>
                  <p className="news-featured__desc">{featured.description?.slice(0, 180)}...</p>
                  <span className="news-featured__cta">Đọc bài viết <ArrowRight size={16} /></span>
                </div>
              </a>
            )}

            <div className="news-grid">
              {rest.map((item, i) => (
                <a
                  key={i}
                  href={item.link}
                  target="_blank"
                  rel="noreferrer"
                  className="news-card"
                  data-reveal
                  style={{ '--delay': `${(i % 3) * 0.1}s` }}
                >
                  <div className="news-card__img">
                    {item.thumbnail
                      ? <img src={item.thumbnail} alt={item.title} loading="lazy" />
                      : <div className="news-card__img-placeholder"><Newspaper size={32} /></div>
                    }
                    <div className="news-card__img-overlay" />
                  </div>
                  <div className="news-card__body">
                    <div className="news-card__meta">
                      {item.categories.slice(0, 1).map((c, j) => (
                        <span className="news-cat news-cat--sm" key={j}>{c}</span>
                      ))}
                      <span className="news-date news-date--sm">
                        <Calendar size={11} />{formatDate(item.date)}
                      </span>
                    </div>
                    <h3 className="news-card__title">{item.title}</h3>
                    <p className="news-card__desc">{item.description?.slice(0, 100)}...</p>
                    <span className="news-card__cta">Xem thêm <ChevronRight size={14} /></span>
                  </div>
                  <div className="news-card__line" />
                </a>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}