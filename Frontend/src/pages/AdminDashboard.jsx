import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, LogOut, LayoutList, Users, Pencil, Trash2,
  X, Save, FileText, Phone, Mail, MapPin, Briefcase,
  Clock, DollarSign, Calendar, ChevronDown, Search,
  Filter, CheckCircle, XCircle, AlertCircle, Eye
} from 'lucide-react';
import './AdminDashboard.scss';
import logo from '../assets/logo.jpg';

export default function AdminDashboard() {
  const [jobs, setJobs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editJob, setEditJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const token = localStorage.getItem('admin_token');

  const emptyForm = {
    title: '', department: '', location: '', type: '',
    experience: '', salary: '', description: '',
    requirements: '', benefits: '', deadline: '', status: 'active'
  };
  const [form, setForm] = useState(emptyForm);
  const [tab, setTab] = useState('jobs');
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [appFilter, setAppFilter] = useState({ status: '', search: '' });
  const [locationMode, setLocationMode] = useState('select'); 
  useEffect(() => {
    if (!token) { navigate('/admin'); return; }
    fetchJobs();
  }, []);

  async function fetchJobs() {
    setLoading(true);
    const res = await fetch(`${import.meta.env.VITE_API_URL}/jobs`);
    const data = await res.json();
    setJobs(data);
    setLoading(false);
  }

  async function fetchApplications() {
    const params = new URLSearchParams();
    if (appFilter.status) params.append('status', appFilter.status);
    if (appFilter.search) params.append('search', appFilter.search);
    const res = await fetch(`${import.meta.env.VITE_API_URL}/applications?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setApplications(data);
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

  async function handleSubmit(e) {
    e.preventDefault();
    const url = editJob
      ? `${import.meta.env.VITE_API_URL}/jobs/${editJob.id}`
      : `${import.meta.env.VITE_API_URL}/jobs`;
    await fetch(url, {
      method: editJob ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setEditJob(null);
    setForm(emptyForm);
    fetchJobs();
  }

  async function handleDelete(id) {
    if (!confirm('Xóa tin tuyển dụng này?')) return;
    await fetch(`${import.meta.env.VITE_API_URL}/jobs/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchJobs();
  }

  function handleEdit(job) {
    setEditJob(job);
    setForm({ ...job, deadline: job.deadline ? job.deadline.split('T')[0] : '' });
    setShowForm(true);
  }

  const statusInfo = (status) => ({
    active: { label: 'Đang tuyển', cls: 'badge--active' },
    inactive: { label: 'Ngừng tuyển', cls: 'badge--inactive' },
  }[status] || { label: status, cls: '' });

  const appStatusInfo = (status) => ({
    pending: { label: 'Chờ xét', cls: 'badge--pending', Icon: AlertCircle },
    passed: { label: 'Đạt', cls: 'badge--passed', Icon: CheckCircle },
    failed: { label: 'Không đạt', cls: 'badge--failed', Icon: XCircle },
  }[status] || { label: status, cls: '', Icon: AlertCircle });

  return (
    <div className="adm">

      {/* ── SIDEBAR ── */}
      <aside className="adm-sidebar">
        <div className="adm-sidebar__logo">
          <div className="adm-sidebar__logo">
            <img src={logo} alt="Viet Huong Ceramics" className="adm-sidebar__logo-img" />
          </div>

        </div>

        <nav className="adm-sidebar__nav">
          <button
            className={`adm-nav-item ${tab === 'jobs' ? 'adm-nav-item--active' : ''}`}
            onClick={() => setTab('jobs')}
          >
            <LayoutList size={18} />
            <span>Tin tuyển dụng</span>
          </button>
          <button
            className={`adm-nav-item ${tab === 'applications' ? 'adm-nav-item--active' : ''}`}
            onClick={() => { setTab('applications'); fetchApplications(); }}
          >
            <Users size={18} />
            <span>Ứng viên</span>
          </button>
        </nav>

        <button
          className="adm-sidebar__logout"
          onClick={() => { localStorage.removeItem('admin_token'); navigate('/admin'); }}
        >
          <LogOut size={16} />
          <span>Đăng xuất</span>
        </button>
      </aside>

      {/* ── MAIN ── */}
      <main className="adm-main">

        {/* ── TOPBAR ── */}
        <header className="adm-topbar">
          <div className="adm-topbar__title">
            {tab === 'jobs' ? 'Tin tuyển dụng' : 'Quản lý ứng viên'}
          </div>
          {tab === 'jobs' && (
            <button
              className="adm-btn adm-btn--primary"
              onClick={() => { setShowForm(true); setEditJob(null); setForm(emptyForm); }}
            >
              <Plus size={16} />
              Đăng tin mới
            </button>
          )}
        </header>

        <div className="adm-content">

          {/* ══ TAB: JOBS ══ */}
          {tab === 'jobs' && (
            <>
              {/* Form */}
              {showForm && (
                <div className="adm-form-card">
                  <div className="adm-form-card__header">
                    <h2>{editJob ? 'Sửa tin tuyển dụng' : 'Đăng tin mới'}</h2>
                    <button className="adm-icon-btn" onClick={() => { setShowForm(false); setEditJob(null); }}>
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="adm-form">
                    <div className="adm-form__grid">
                      <div className="adm-field">
                        <label>Vị trí tuyển dụng <span>*</span></label>
                        <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required placeholder="VD: Nhân viên kinh doanh" />
                      </div>
                      <div className="adm-field">
                        <label>Phòng ban</label>
                        <input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="VD: Kinh doanh" />
                      </div>
                     <div className="adm-field">
  <label>Địa điểm</label>
  <div className="adm-select-wrap">
    <select
      value={locationMode === 'custom' ? 'other' : form.location}
      onChange={e => {
        if (e.target.value === 'other') {
          setLocationMode('custom');
          setForm({ ...form, location: '' });
        } else {
          setLocationMode('select');
          setForm({ ...form, location: e.target.value });
        }
      }}
    >
      <option value="">Chọn địa điểm</option>
      <option>Đà Nẵng</option>
      <option>Hải Phòng</option>
      <option>Hồ Chí Minh</option>
      <option value="other">Khác...</option>
    </select>
    <ChevronDown size={14} />
  </div>
  {locationMode === 'custom' && (
    <input
      style={{ marginTop: 8 }}
      value={form.location}
      onChange={e => setForm({ ...form, location: e.target.value })}
      placeholder="Nhập địa điểm..."
      autoFocus
    />
  )}
</div>
                      <div className="adm-field">
                        <label>Loại công việc</label>
                        <div className="adm-select-wrap">
                          <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                            <option value="">Chọn loại</option>
                            <option>Toàn thời gian</option>
                            <option>Bán thời gian</option>
                            <option>Thực tập</option>
                          </select>
                          <ChevronDown size={14} />
                        </div>
                      </div>
                      <div className="adm-field">
                        <label>Kinh nghiệm</label>
                        <div className="adm-select-wrap">
                          <select value={form.experience} onChange={e => setForm({ ...form, experience: e.target.value })}>
                            <option value="">Chọn kinh nghiệm</option>
                            <option>Không yêu cầu</option>
                            <option>Dưới 1 năm</option>
                            <option>1-2 năm</option>
                            <option>3+ năm</option>
                          </select>
                          <ChevronDown size={14} />
                        </div>
                      </div>
                      <div className="adm-field">
                        <label>Mức lương</label>
                        <input value={form.salary} onChange={e => setForm({ ...form, salary: e.target.value })} placeholder="VD: 8-12 triệu" />
                      </div>
                      <div className="adm-field">
                        <label>Hạn nộp hồ sơ</label>
                        <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
                      </div>
                      <div className="adm-field">
                        <label>Trạng thái</label>
                        <div className="adm-select-wrap">
                          <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                            <option value="active">Đang tuyển</option>
                            <option value="inactive">Ngừng tuyển</option>
                          </select>
                          <ChevronDown size={14} />
                        </div>
                      </div>
                    </div>

                    <div className="adm-field adm-field--full">
                      <label>Mô tả công việc</label>
                      <textarea rows={5} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Mô tả chi tiết công việc..." />
                    </div>
                    <div className="adm-field adm-field--full">
                      <label>Yêu cầu</label>
                      <textarea rows={5} value={form.requirements} onChange={e => setForm({ ...form, requirements: e.target.value })} placeholder="Yêu cầu ứng viên..." />
                    </div>
                    <div className="adm-field adm-field--full">
                      <label>Quyền lợi</label>
                      <textarea rows={5} value={form.benefits} onChange={e => setForm({ ...form, benefits: e.target.value })} placeholder="Quyền lợi được hưởng..." />
                    </div>

                    <div className="adm-form__actions">
                      <button type="button" className="adm-btn adm-btn--ghost" onClick={() => { setShowForm(false); setEditJob(null); }}>
                        <X size={15} /> Hủy
                      </button>
                      <button type="submit" className="adm-btn adm-btn--primary">
                        <Save size={15} /> {editJob ? 'Cập nhật' : 'Đăng tin'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Table */}
              {loading ? (
                <div className="adm-loading"><div className="adm-spinner" /><span>Đang tải...</span></div>
              ) : (
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>Vị trí</th>
                        <th>Địa điểm</th>
                        <th>Loại</th>
                        <th>Hạn nộp</th>
                        <th>Trạng thái</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.length === 0 ? (
                        <tr><td colSpan={6} className="adm-table__empty">Chưa có tin tuyển dụng</td></tr>
                      ) : jobs.map(job => {
                        const s = statusInfo(job.status);
                        return (
                          <tr key={job.id}>
                            <td className="adm-table__title">{job.title}</td>
                            <td><span className="adm-meta"><MapPin size={12} />{job.location}</span></td>
                            <td><span className="adm-meta"><Briefcase size={12} />{job.type}</span></td>
                            <td><span className="adm-meta"><Calendar size={12} />{job.deadline ? new Date(job.deadline).toLocaleDateString('vi-VN') : '—'}</span></td>
                            <td><span className={`adm-badge ${s.cls}`}>{s.label}</span></td>
                            <td>
                              <div className="adm-table__actions">
                                <button className="adm-icon-btn adm-icon-btn--blue" onClick={() => handleEdit(job)} title="Sửa">
                                  <Pencil size={14} />
                                </button>
                                <button className="adm-icon-btn adm-icon-btn--red" onClick={() => handleDelete(job.id)} title="Xóa">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* ══ TAB: APPLICATIONS ══ */}
          {tab === 'applications' && (
            <>
              <div className="adm-filter-bar">
                <div className="adm-filter-bar__input">
                  <Search size={14} />
                  <input
                    placeholder="Tìm tên, email..."
                    value={appFilter.search}
                    onChange={e => setAppFilter({ ...appFilter, search: e.target.value })}
                  />
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
                <button className="adm-btn adm-btn--primary adm-btn--sm" onClick={fetchApplications}>
                  <Filter size={14} /> Lọc
                </button>
              </div>

              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Họ tên</th>
                      <th>Email</th>
                      <th>Số điện thoại</th>
                      <th>Vị trí</th>
                      <th>Trạng thái</th>
                      <th>CV</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.length === 0 ? (
                      <tr><td colSpan={7} className="adm-table__empty">Chưa có ứng viên</td></tr>
                    ) : applications.map(app => {
                      const s = appStatusInfo(app.status);
                      return (
                        <tr key={app.id}>
                          <td className="adm-table__title">{app.full_name}</td>
                          <td><span className="adm-meta"><Mail size={12} />{app.email}</span></td>
                          <td><span className="adm-meta"><Phone size={12} />{app.phone}</span></td>
                          <td>{app.position}</td>
                          <td>
                            <span className={`adm-badge ${s.cls}`}>
                              <s.Icon size={11} /> {s.label}
                            </span>
                          </td>
                          <td>
                            {app.cv_link
                              ? <a href={app.cv_link} target="_blank" rel="noreferrer" className="adm-link"><FileText size={13} /> Xem CV</a>
                              : <span className="adm-muted">Không có</span>}
                          </td>
                          <td>
                            <button className="adm-icon-btn adm-icon-btn--blue" onClick={() => setSelectedApp(app)} title="Chi tiết">
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Modal */}
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
                          ['Kinh nghiệm', selectedApp.experience, <Clock size={13} />],
                          ['Địa chỉ', selectedApp.address, <MapPin size={13} />],
                        ].map(([label, value, icon]) => (
                          <div className="adm-modal__info-row" key={label}>
                            <span className="adm-modal__info-label">{label}</span>
                            <span className="adm-modal__info-value">
                              {icon && icon} {value || '—'}
                            </span>
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
                          <select defaultValue={selectedApp.status} onChange={e => setSelectedApp({ ...selectedApp, status: e.target.value })}>
                            <option value="pending">Chờ xét duyệt</option>
                            <option value="passed">Đạt</option>
                            <option value="failed">Không đạt</option>
                          </select>
                          <ChevronDown size={14} />
                        </div>
                      </div>

                      <div className="adm-field">
                        <label>Ghi chú</label>
                        <textarea rows={4} defaultValue={selectedApp.note || ''} onChange={e => setSelectedApp({ ...selectedApp, note: e.target.value })} placeholder="Nhập ghi chú..." />
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
          )}

        </div>
      </main>
    </div>
  );
}