import { useState, useEffect } from 'react';
import {
  Search, ChevronDown, X, FileText, Phone, Mail, Briefcase,
  Clock, MapPin, Eye, CheckCircle, XCircle, AlertCircle,
  ChevronLeft, ChevronRight, Save
} from 'lucide-react';

const APPS_PER_PAGE = 10;

export default function ApplicationsManager({ token }) {
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [appPage, setAppPage] = useState(1);
  const [appFilter, setAppFilter] = useState({
    status: '', search: '', department: '', experience: '', location: '', dateRange: ''
  });

  useEffect(() => {
    fetchApplications();
  }, []);

  async function fetchApplications() {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/applications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        console.error('Lỗi API:', res.status);
        setApplications([]);
        return;
      }
      const data = await res.json();
      setApplications(Array.isArray(data) ? data : []);
      setAppPage(1);
    } catch (err) {
      console.error('fetchApplications lỗi:', err);
      setApplications([]);
    }
  }

  async function updateApplication(id, status, note) {
    await fetch(`${import.meta.env.VITE_API_URL}/applications/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status, note }),
    });
    fetchApplications();
    setSelectedApp(null);
  }

  const appStatusInfo = (status) => ({
    pending: { label: 'Chờ xét', cls: 'badge--pending', Icon: AlertCircle },
    passed: { label: 'Đạt', cls: 'badge--passed', Icon: CheckCircle },
    failed: { label: 'Không đạt', cls: 'badge--failed', Icon: XCircle },
  }[status] || { label: status, cls: '', Icon: AlertCircle });

  const filteredApps = applications.filter(app => {
    if (appFilter.search) {
      const q = appFilter.search.toLowerCase();
      if (!app.full_name?.toLowerCase().includes(q) && !app.email?.toLowerCase().includes(q)) return false;
    }
    if (appFilter.status && app.status !== appFilter.status) return false;
    if (appFilter.department && app.department !== appFilter.department) return false;
    if (appFilter.location && app.job_location !== appFilter.location) return false;
    if (appFilter.experience && app.job_experience !== appFilter.experience) return false;
    if (appFilter.dateRange) {
      const submitted = new Date(app.created_at);
      const now = new Date();
      const diffDays = (now - submitted) / (1000 * 60 * 60 * 24);
      if (appFilter.dateRange === '1d' && diffDays > 1) return false;
      if (appFilter.dateRange === '1w' && diffDays > 7) return false;
      if (appFilter.dateRange === '1m' && diffDays > 30) return false;
    }
    return true;
  });

  // Pagination helpers
  const paginate = (data, page, perPage) => data.slice((page - 1) * perPage, page * perPage);
  const getTotalPages = (data, perPage) => Math.max(1, Math.ceil(data.length / perPage));
  const getPageNumbers = (current, total) => {
    const pages = [];
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push('...');
      for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
      if (current < total - 2) pages.push('...');
      pages.push(total);
    }
    return pages;
  };

  const Pagination = ({ page, total, onChange }) => {
    if (total <= 1) return null;
    return (
      <div className="adm-pagination">
        <button className="adm-pagination__btn adm-pagination__btn--nav" onClick={() => onChange(page - 1)} disabled={page === 1}>
          <ChevronLeft size={15} />
        </button>
        {getPageNumbers(page, total).map((p, idx) =>
          p === '...' ? <span key={`e${idx}`} className="adm-pagination__ellipsis">...</span>
          : <button key={p} className={`adm-pagination__btn ${page === p ? 'adm-pagination__btn--active' : ''}`} onClick={() => onChange(p)}>{p}</button>
        )}
        <button className="adm-pagination__btn adm-pagination__btn--nav" onClick={() => onChange(page + 1)} disabled={page === total}>
          <ChevronRight size={15} />
        </button>
      </div>
    );
  };

  const pagedApps = paginate(filteredApps, appPage, APPS_PER_PAGE);
  const appTotalPages = getTotalPages(filteredApps, APPS_PER_PAGE);

  return (
    <>
      <div className="adm-filter-bar adm-filter-bar--wrap">
        <div className="adm-filter-bar__input">
          <Search size={14} />
          <input placeholder="Tìm tên, email..." value={appFilter.search} onChange={e => setAppFilter({ ...appFilter, search: e.target.value })} />
        </div>
        <div className="adm-select-wrap adm-select-wrap--sm">
          <select value={appFilter.status} onChange={e => setAppFilter({ ...appFilter, status: e.target.value })}>
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ xét duyệt</option>
            <option value="passed">Đạt</option>
            <option value="failed">Không đạt</option>
          </select>
          <ChevronDown size={14} />
        </div>
        <div className="adm-select-wrap adm-select-wrap--sm">
          <select value={appFilter.department} onChange={e => setAppFilter({ ...appFilter, department: e.target.value })}>
            <option value="">Tất cả phòng ban</option>
            <option>Kinh doanh</option><option>Marketing</option><option>Kế toán - Tài chính</option>
            <option>Nhân sự</option><option>Kỹ thuật - Sản xuất</option><option>Logistics</option>
            <option>IT</option><option>Hành chính</option><option>Ban Giám Đốc</option>
          </select>
          <ChevronDown size={14} />
        </div>
        <div className="adm-select-wrap adm-select-wrap--sm">
          <select value={appFilter.experience} onChange={e => setAppFilter({ ...appFilter, experience: e.target.value })}>
            <option value="">Tất cả kinh nghiệm</option>
            <option>Không yêu cầu</option><option>Dưới 1 năm</option><option>1-2 năm</option><option>3+ năm</option>
          </select>
          <ChevronDown size={14} />
        </div>
        <div className="adm-select-wrap adm-select-wrap--sm">
          <select value={appFilter.location} onChange={e => setAppFilter({ ...appFilter, location: e.target.value })}>
            <option value="">Tất cả địa điểm</option>
            <option>Đà Nẵng</option><option>Hải Phòng</option><option>Hồ Chí Minh</option>
          </select>
          <ChevronDown size={14} />
        </div>
        <div className="adm-select-wrap adm-select-wrap--sm">
          <select value={appFilter.dateRange} onChange={e => setAppFilter({ ...appFilter, dateRange: e.target.value })}>
            <option value="">Tất cả thời gian</option>
            <option value="1d">Trong 1 ngày</option>
            <option value="1w">Trong 1 tuần</option>
            <option value="1m">Trong 1 tháng</option>
          </select>
          <ChevronDown size={14} />
        </div>
        <button className="adm-btn adm-btn--ghost adm-btn--sm" onClick={() => {
          setAppFilter({ status: '', search: '', department: '', experience: '', location: '', dateRange: '' });
          setAppPage(1);
        }}>
          <X size={14} /> Xóa lọc
        </button>
      </div>

      <p className="adm-filter-result">
        Tìm thấy <strong>{filteredApps.length}</strong> ứng viên
        {filteredApps.length !== applications.length && ` (trong tổng số ${applications.length})`}
      </p>

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Họ tên</th><th>Email</th><th>Số điện thoại</th>
              <th>Vị trí</th><th>Phòng ban</th><th>Trạng thái</th><th>CV</th><th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {pagedApps.length === 0 ? (
              <tr><td colSpan={8} className="adm-table__empty">Không tìm thấy ứng viên phù hợp</td></tr>
            ) : pagedApps.map(app => {
              const s = appStatusInfo(app.status);
              return (
                <tr key={app.id}>
                  <td className="adm-table__title">{app.full_name}</td>
                  <td><span className="adm-meta"><Mail size={12} />{app.email}</span></td>
                  <td><span className="adm-meta"><Phone size={12} />{app.phone}</span></td>
                  <td>{app.position}</td>
                  <td>{app.department || '—'}</td>
                  <td><span className={`adm-badge ${s.cls}`}><s.Icon size={11} /> {s.label}</span></td>
                  <td>{app.cv_link ? <a href={app.cv_link} target="_blank" rel="noreferrer" className="adm-link"><FileText size={13} /> Xem CV</a> : <span className="adm-muted">Không có</span>}</td>
                  <td><button className="adm-icon-btn adm-icon-btn--blue" onClick={() => setSelectedApp(app)} title="Chi tiết"><Eye size={14} /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="adm-table-footer">
        <span className="adm-table-footer__count">
          Hiển thị {filteredApps.length === 0 ? 0 : Math.min((appPage - 1) * APPS_PER_PAGE + 1, filteredApps.length)}–{Math.min(appPage * APPS_PER_PAGE, filteredApps.length)} / {filteredApps.length} ứng viên
        </span>
        <Pagination page={appPage} total={appTotalPages} onChange={p => { setAppPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
      </div>

      {/* Modal chi tiết ứng viên */}
      {selectedApp && (
        <div className="adm-modal-backdrop" onClick={() => setSelectedApp(null)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal__header">
              <h2>Thông tin ứng viên</h2>
              <button className="adm-icon-btn" onClick={() => setSelectedApp(null)}><X size={18} /></button>
            </div>
            <div className="adm-modal__body">
              <div className="adm-modal__info-grid">
                {[
                  ['Họ tên', selectedApp.full_name, null],
                  ['Email', selectedApp.email, <Mail size={13} />],
                  ['Số điện thoại', selectedApp.phone, <Phone size={13} />],
                  ['Vị trí', selectedApp.position, <Briefcase size={13} />],
                  ['Phòng ban', selectedApp.department, null],
                  ['Kinh nghiệm', selectedApp.experience, <Clock size={13} />],
                  ['Địa chỉ', selectedApp.address, <MapPin size={13} />],
                ].map(([label, value, icon]) => (
                  <div className="adm-modal__info-row" key={label}>
                    <span className="adm-modal__info-label">{label}</span>
                    <span className="adm-modal__info-value">{icon && icon} {value || '—'}</span>
                  </div>
                ))}
              </div>
              {selectedApp.cv_link && (
                <a href={selectedApp.cv_link} target="_blank" rel="noreferrer" className="adm-btn adm-btn--blue adm-btn--sm" style={{ display: 'inline-flex', marginBottom: 20 }}>
                  <FileText size={14} /> Xem CV
                </a>
              )}
              <div className="adm-field">
                <label>Trạng thái</label>
                <div className="adm-select-wrap">
                  <select value={selectedApp.status} onChange={e => setSelectedApp({ ...selectedApp, status: e.target.value })}>
                    <option value="pending">Chờ xét duyệt</option>
                    <option value="passed">Đạt</option>
                    <option value="failed">Không đạt</option>
                  </select>
                  <ChevronDown size={14} />
                </div>
              </div>
              <div className="adm-field">
                <label>Ghi chú</label>
                <textarea rows={4} value={selectedApp.note || ''} onChange={e => setSelectedApp({ ...selectedApp, note: e.target.value })} placeholder="Nhập ghi chú..." />
              </div>
            </div>
            <div className="adm-modal__footer">
              <button className="adm-btn adm-btn--ghost" onClick={() => setSelectedApp(null)}><X size={15} /> Đóng</button>
              <button className="adm-btn adm-btn--primary" onClick={() => updateApplication(selectedApp.id, selectedApp.status, selectedApp.note)}>
                <Save size={15} /> Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}