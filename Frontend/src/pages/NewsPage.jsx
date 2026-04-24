import { useState, useEffect, useRef, useCallback } from 'react';
import { Calendar, Tag, ChevronRight, ArrowRight, Newspaper, ChevronLeft } from 'lucide-react';
import './NewsPage.scss';

const API_BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:5000').replace(/\/api$/, '');

const FEEDS = [
  { label: 'Nội bộ & Sự kiện', slug: 'noi-bo', categoryId: 121 },
];

const ITEMS_PER_PAGE = 10;

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}


function useReveal(dep) { 
  const ref = useRef(null);
  useEffect(() => {
    if (!dep) return;
    ref.current?.querySelectorAll('[data-reveal]').forEach(el => {
      el.classList.remove('is-visible');
    });

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

    return () => {
      clearTimeout(timer);
      ref.current?._obs?.disconnect();
    };
  }, [dep]);
  return ref;
}

export default function NewsPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [cache, setCache] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const currentSlug = FEEDS[activeTab].slug;
  const news = cache[currentSlug] ?? [];
  const pageRef = useReveal(`${news.length}-${currentPage}`);

  const totalPages = news.length === 0 ? 1 : Math.ceil((news.length - 1) / ITEMS_PER_PAGE);
  const featured = currentPage === 1 ? news[0] : null;
  const cardItems = currentPage === 1
    ? news.slice(1, ITEMS_PER_PAGE)
    : news.slice(1 + (currentPage - 1) * ITEMS_PER_PAGE, 1 + currentPage * ITEMS_PER_PAGE);

  const fetchNews = useCallback(async (slug, force = false) => {
    if (!force && cache[slug]) return;
    setLoading(true);
    setError(false);
    try {
      const feed = FEEDS.find(f => f.slug === slug);
const res = await fetch(`${API_BASE}/api/rss/wordpress?category=${feed.categoryId}&count=50`);
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

  useEffect(() => {
    fetchNews(currentSlug);
    setCurrentPage(1);
  }, [currentSlug]);

  useEffect(() => {
    const timer = setTimeout(() => {
      FEEDS.forEach(f => {
        if (f.slug !== currentSlug && !cache[f.slug]) {
          fetch(`${API_BASE}/api/rss?feed=${f.slug}&count=50`)
            .then(r => r.json())
            .then(data => {
              if (data.status === 'ok')
                setCache(prev => ({ ...prev, [f.slug]: data.items }));
            })
            .catch(() => { });
        }
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const goToPage = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="news-page" ref={pageRef}>

      <div className="news-hero">
        <div className="news-hero__overlay" />
        <div className="news-hero__content">
          <span className="news-hero__eyebrow">Công ty cổ phần xây dựng gốm sứ Việt Hương</span>
          <h1 className="news-hero__title">Cập Nhật Mới Nhất</h1>
          <p className="news-hero__sub">Theo dõi hành trình phát triển của Viet Huong Ceramics</p>
        </div>
        <div className="news-hero__wave">
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none">
            <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="#f7f4f2" />
          </svg>
        </div>
      </div>

      <div className="news-tabs" data-reveal>
        {FEEDS.map((f, i) => (
          <button
            key={i}
            className={`news-tab ${activeTab === i ? 'news-tab--active' : ''}`}
            onClick={() => setActiveTab(i)}
          >
            {f.label}
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
              <a key={`featured-${currentPage}`}
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
                  {(featured.categories || []).slice(0, 2).map((c, i) => (
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

            <div className="news-grid" key={currentPage}>
              {cardItems.map((item, i) => (
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
                      {(item.categories || []).slice(0, 1).map((c, j) => (
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

            {/* PAGINATION */}
            {totalPages > 1 && (
              <div className="news-pagination">
                <button
                  className="news-pagination__btn news-pagination__btn--nav"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} />
                </button>

                {getPageNumbers().map((page, idx) =>
                  page === '...'
                    ? <span key={`ellipsis-${idx}`} className="news-pagination__ellipsis">...</span>
                    : <button
                      key={page}
                      className={`news-pagination__btn ${currentPage === page ? 'news-pagination__btn--active' : ''}`}
                      onClick={() => goToPage(page)}
                    >
                      {page}
                    </button>
                )}

                <button
                  className="news-pagination__btn news-pagination__btn--nav"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div >
  );
}