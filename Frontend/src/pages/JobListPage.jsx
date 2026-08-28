import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, MapPin, Briefcase,
  DollarSign, Calendar,
  AlertCircle, SlidersHorizontal,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import './JobListPage.scss';
import { Helmet } from 'react-helmet-async';
const DEPARTMENTS = [
  'Kinh doanh', 'Marketing', 'Kế toán - Tài chính',
  'Nhân sự', 'Kỹ thuật - Sản xuất', 'Logistics',
  'IT', 'Hành chính', 'Ban Giám Đốc',
];

const JOBS_PER_PAGE = 10;

function daysLeft(deadline) {
  const diff = new Date(deadline) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function JobListPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState('');
  const [department, setDepartment] = useState('');
  const [deptSearch, setDeptSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (location) params.set('location', location);
      if (type) params.set('type', type);
      if (department) params.set('department', department);

      const res = await fetch(`${import.meta.env.VITE_API_URL}/jobs?${params}`);
      const data = await res.json();
      setJobs(data);
      setCurrentPage(1); // reset về trang 1 khi filter thay đổi
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [search, location, type, department]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const filteredDepts = DEPARTMENTS.filter(d =>
    d.toLowerCase().includes(deptSearch.toLowerCase())
  );

  const days = (job) => job.deadline ? daysLeft(job.deadline) : null;

  // Tính toán phân trang
  const totalPages = Math.ceil(jobs.length / JOBS_PER_PAGE);
  const paginatedJobs = jobs.slice(
    (currentPage - 1) * JOBS_PER_PAGE,
    currentPage * JOBS_PER_PAGE
  );

  const goToPage = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Tạo danh sách số trang hiển thị (có dấu ...)
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
    <>
<Helmet>
  <title>Việc Làm & Tuyển Dụng Gốm Sứ Việt Hương 2026 | Đà Nẵng - Hải Phòng - HCM</title>
  <meta name="description" content="Tuyển dụng Viet Huong Ceramics - Kinh doanh, Kế toán, Logistics, Kỹ thuật sản xuất gốm sứ tại Đà Nẵng, Hải Phòng, Hồ Chí Minh 2026. Lương hấp dẫn, môi trường chuyên nghiệp." />
  <meta name="keywords" content="tuyển dụng gốm sứ, việc làm Đà Nẵng, Viet Huong Ceramics, tuyển dụng 2026" />
</Helmet>
      <div className="jlp">

        {/* HERO */}
        <div className="jlp-hero">
          <div className="jlp-hero__overlay" />
          <div className="jlp-hero__content">
            <p className="jlp-hero__eyebrow">CÔNG TY CỔ PHẦN XÂY DỰNG GỐM SỨ VIỆT HƯƠNG</p>
            <h1 className="jlp-hero__title">Cơ Hội Việc Làm</h1>
            <p className="jlp-hero__sub">Khám phá các vị trí tuyển dụng và cùng chúng tôi xây dựng tương lai</p>
          </div>
          <div className="jlp-hero__wave">
            <svg viewBox="0 0 1440 80" preserveAspectRatio="none">
              <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="#fff" />
            </svg>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="jlp-searchbar">
          <div className="jlp-searchbar__inner">
            <div className="jlp-searchbar__input-wrap">
              <Search size={18} />
              <input
                placeholder="Nhập từ khóa..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchJobs()}
              />
            </div>
            <button className="jlp-sidebar__search" onClick={fetchJobs}>
              Tìm kiếm
            </button>
          </div>
        </div>

        {/* LAYOUT */}
        <div className="jlp-layout">

          {/* SIDEBAR */}
          <aside className={`jlp-sidebar ${sidebarOpen ? 'jlp-sidebar--open' : ''}`}>

            <button className="jlp-sidebar__apply" onClick={fetchJobs}>
              Áp dụng bộ lọc
            </button>

            {/* Phòng ban */}
            <div className="jlp-sidebar__section">
              <h5>Phòng ban</h5>
              <div className="jlp-sidebar__dept-search">
                <input
                  placeholder="Lọc phòng ban..."
                  value={deptSearch}
                  onChange={e => setDeptSearch(e.target.value)}
                />
                <Search size={14} />
              </div>
              <label className="jlp-sidebar__check">
                <input
                  type="checkbox"
                  checked={department === ''}
                  onChange={() => setDepartment('')}
                />
                <span>Tất cả</span>
              </label>
              {filteredDepts.map(d => (
                <label key={d} className="jlp-sidebar__check">
                  <input
                    type="checkbox"
                    checked={department === d}
                    onChange={() => setDepartment(prev => prev === d ? '' : d)}
                  />
                  <span>{d}</span>
                </label>
              ))}
            </div>

            {/* Địa điểm */}
            <div className="jlp-sidebar__section">
              <h5>Địa điểm</h5>
              {['Tất cả', 'Đà Nẵng', 'Hải Phòng', 'Hồ Chí Minh'].map(loc => (
                <label key={loc} className="jlp-sidebar__check">
                  <input
                    type="radio"
                    name="location"
                    checked={location === (loc === 'Tất cả' ? '' : loc)}
                    onChange={() => setLocation(loc === 'Tất cả' ? '' : loc)}
                  />
                  <span>{loc}</span>
                </label>
              ))}
            </div>

            {/* Loại công việc */}
            <div className="jlp-sidebar__section">
              <h5>Loại công việc</h5>
              {['Tất cả', 'Toàn thời gian', 'Bán thời gian', 'Thực tập'].map(t => (
                <label key={t} className="jlp-sidebar__check">
                  <input
                    type="radio"
                    name="type"
                    checked={type === (t === 'Tất cả' ? '' : t)}
                    onChange={() => setType(t === 'Tất cả' ? '' : t)}
                  />
                  <span>{t}</span>
                </label>
              ))}
            </div>

          </aside>

          {/* MAIN */}
          <main className="jlp-main">

            <button className="jlp-filter-toggle" onClick={() => setSidebarOpen(o => !o)}>
              <SlidersHorizontal size={16} /> Bộ lọc
            </button>

            {!loading && (
              <p className="jlp-count">
                Tìm thấy <strong>{jobs.length}</strong> vị trí tuyển dụng
                {department && <span className="jlp-count__tag">{department}<button onClick={() => setDepartment('')}>✕</button></span>}
                {location && <span className="jlp-count__tag">{location}<button onClick={() => setLocation('')}>✕</button></span>}
                {type && <span className="jlp-count__tag">{type}<button onClick={() => setType('')}>✕</button></span>}
              </p>
            )}

            {loading ? (
              <div className="jlp-loading">
                <div className="jlp-loading__spinner" />
                <p>Đang tải danh sách việc làm...</p>
              </div>
            ) : jobs.length === 0 ? (
              <div className="jlp-empty">
                <AlertCircle size={48} />
                <p>Không tìm thấy việc làm phù hợp</p>
              </div>
            ) : (
              <>
                <div className="jlp-list">
                  {paginatedJobs.map((job) => {
                    const left = days(job);
                    const urgent = left !== null && left <= 7;
                    return (
                      <div className={`jlp-row ${urgent ? 'jlp-row--urgent' : ''}`} key={job.id}>
                        <div className="jlp-row__main">
                          <div className="jlp-row__title-wrap">
                            <Link to={`/tuyen-dung/${job.id}`} className="jlp-row__title">
                              {job.title}
                            </Link>
                            {job.hot && <span className="jlp-badge jlp-badge--hot">HOT</span>}
                            {urgent && <span className="jlp-badge jlp-badge--urgent">Sắp hết hạn</span>}
                          </div>
                          <div className="jlp-row__meta">
                            <span><DollarSign size={13} /> Lương: <strong>{job.salary || 'Thương lượng'}</strong></span>
                            {job.location && <span><MapPin size={13} /> {job.location}</span>}
                            {job.type && <span><Briefcase size={13} /> {job.type}</span>}
                            {job.department && <span><Briefcase size={13} /> {job.department}</span>}
                          </div>
                          {job.deadline && (
                            <div className="jlp-row__deadline">
                              <Calendar size={12} />
                              Hạn nộp: <strong>{new Date(job.deadline).toLocaleDateString('vi-VN')}</strong>
                              {left !== null && (
                                <span className={`jlp-row__days ${urgent ? 'urgent' : ''}`}>
                                  · Còn {left} ngày
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="jlp-row__action">
                          <Link to={`/tuyen-dung/${job.id}`} className="jlp-row__btn">
                            Ứng tuyển ngay
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* PAGINATION */}
                {totalPages > 1 && (
                  <div className="jlp-pagination">
                    <button
                      className="jlp-pagination__btn jlp-pagination__btn--nav"
                      onClick={() => goToPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft size={16} />
                    </button>

                    {getPageNumbers().map((page, idx) =>
                      page === '...'
                        ? <span key={`ellipsis-${idx}`} className="jlp-pagination__ellipsis">...</span>
                        : <button
                          key={page}
                          className={`jlp-pagination__btn ${currentPage === page ? 'jlp-pagination__btn--active' : ''}`}
                          onClick={() => goToPage(page)}
                        >
                          {page}
                        </button>
                    )}

                    <button
                      className="jlp-pagination__btn jlp-pagination__btn--nav"
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </>
  );
}