import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, MapPin, Briefcase, Clock,
  DollarSign, Calendar, ChevronRight,
  Building2, Flame, AlertCircle
} from 'lucide-react';
import './JobListPage.scss';

function daysLeft(deadline) {
  const diff = new Date(deadline) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('is-visible');
      }),
      { threshold: 0.08 }
    );
    ref.current?.querySelectorAll('[data-reveal]').forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);
  return ref;
}

export default function JobListPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState('');
  const pageRef = useReveal();

  useEffect(() => {
    fetchJobs();
  }, [search, location, type]);

async function fetchJobs() {
  setLoading(true);
  try {
    const url = `${import.meta.env.VITE_API_URL}/jobs`;
    console.log('Fetching:', url);          // ← URL có đúng không?
    const res = await fetch(url);
    console.log('Status:', res.status);     // ← 200 hay lỗi?
    const data = await res.json();
    console.log('Data:', data);             // ← data có phải array không?
    setJobs(data);
  } catch (err) {
    console.error('Fetch error:', err);
  }
  setLoading(false);
}

  const days = (job) => job.deadline ? daysLeft(job.deadline) : null;

  return (
    <div className="job-list-page" ref={pageRef}>

      {/* ── HERO HEADER ── */}
      <div className="jlp-hero">
        <div className="jlp-hero__overlay" />
        <div className="jlp-hero__content">
          <span className="jlp-hero__eyebrow">CÔNG TY CỔ PHẦN XÂY DỰNG GỐM SỨ VIỆT HƯƠNG</span>
          <h1 className="jlp-hero__title">Cơ Hội Việc Làm</h1>
          <p className="jlp-hero__sub">Khám phá các vị trí tuyển dụng và cùng chúng tôi xây dựng tương lai</p>
        </div>
        <div className="jlp-hero__wave">
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none">
            <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="#f7f4f2" />
          </svg>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="jlp-body">

        {/* ── FILTER BAR ── */}
        <div className="jlp-filter" data-reveal>
          <div className="jlp-filter__input-wrap">
            <Search size={16} className="jlp-filter__icon" />
            <input
              className="jlp-filter__input"
              placeholder="Tìm kiếm vị trí..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="jlp-filter__clear" onClick={() => setSearch('')}>×</button>
            )}
          </div>

          <div className="jlp-filter__select-wrap">
            <MapPin size={14} className="jlp-filter__select-icon" />
            <select
              className="jlp-filter__select"
              value={location}
              onChange={e => setLocation(e.target.value)}
            >
              <option value="">Tất cả địa điểm</option>
              <option value="Đà Nẵng">Đà Nẵng</option>
              <option value="Hải Phòng">Hải Phòng</option>
              <option value="Hồ Chí Minh">Hồ Chí Minh</option>
            </select>
          </div>

          <div className="jlp-filter__select-wrap">
            <Briefcase size={14} className="jlp-filter__select-icon" />
            <select
              className="jlp-filter__select"
              value={type}
              onChange={e => setType(e.target.value)}
            >
              <option value="">Loại công việc</option>
              <option value="Toàn thời gian">Toàn thời gian</option>
              <option value="Bán thời gian">Bán thời gian</option>
              <option value="Thực tập">Thực tập</option>
            </select>
          </div>
        </div>

        {/* ── COUNT ── */}
        {!loading && (
          <p className="jlp-count" data-reveal>
            Tìm thấy <strong>{jobs.length}</strong> vị trí tuyển dụng
          </p>
        )}

        {/* ── LIST ── */}
        {loading ? (
          <div className="jlp-loading">
            <div className="jlp-loading__spinner" />
            <p>Đang tải danh sách việc làm...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="jlp-empty" data-reveal>
            <AlertCircle size={48} />
            <p>Không tìm thấy việc làm phù hợp</p>
            <span>Thử thay đổi bộ lọc hoặc tìm kiếm với từ khóa khác</span>
          </div>
        ) : (
          <div className="jlp-grid">
            {jobs.map((job, i) => {
              const left = days(job);
              const urgent = left !== null && left <= 7;
              return (
                <div
                  className={`jlp-card ${urgent ? 'jlp-card--urgent' : ''}`}
                  key={job.id}
               
                  style={{ '--delay': `${i * 0.07}s` }}
                >
                  {/* left accent */}
                  <div className="jlp-card__accent" />

                  {/* badges */}
                  <div className="jlp-card__badges">
                    {job.hot && (
                      <span className="jlp-badge jlp-badge--hot">
                        <Flame size={11} /> Hot
                      </span>
                    )}
                    {job.type && (
                      <span className="jlp-badge jlp-badge--type">{job.type}</span>
                    )}
                    {urgent && (
                      <span className="jlp-badge jlp-badge--urgent">Sắp hết hạn</span>
                    )}
                  </div>

                  {/* main info */}
                  <div className="jlp-card__body">
                    <div className="jlp-card__info">
                      <h3 className="jlp-card__title">{job.title}</h3>

                      <div className="jlp-card__meta">
                        <span className="jlp-meta-item">
                          <Building2 size={13} />
                          CÔNG TY CỔ PHẦN XÂY DỰNG GỐM SỨ VIỆT HƯƠNG
                        </span>
                        <span className="jlp-meta-item">
                          <MapPin size={13} />
                          {job.location}
                        </span>
                        <span className="jlp-meta-item">
                          <Clock size={13} />
                          {job.experience}
                        </span>
                        <span className="jlp-meta-item jlp-meta-item--salary">
                          <DollarSign size={13} />
                          {job.salary || 'Thương lượng'}
                        </span>
                      </div>

                      {job.deadline && (
                        <div className="jlp-card__deadline">
                          <Calendar size={12} />
                          <span>
                            Ngày đăng: {new Date(job.posted || Date.now()).toLocaleDateString('vi-VN')}
                          </span>
                          <span className="jlp-card__deadline-sep">·</span>
                          <span className={urgent ? 'urgent-text' : ''}>
                            Hết hạn trong: {left} ngày
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="jlp-card__action">
                      <Link to={`/tuyen-dung/${job.id}`} className="jlp-btn">
                        Xem chi tiết
                        <ChevronRight size={15} />
                      </Link>
                    </div>
                  </div>

                  {/* hover line */}
                  <div className="jlp-card__line" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}