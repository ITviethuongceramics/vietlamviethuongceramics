import { useState, useEffect } from 'react';
import {
  Plus, Pencil, Trash2, X, Save, MapPin, Briefcase,
  Calendar, ChevronDown, ChevronLeft, ChevronRight
} from 'lucide-react';

const JOBS_PER_PAGE = 10;

export default function JobsManager({ token }) {
  const [jobs, setJobs] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editJob, setEditJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [jobPage, setJobPage] = useState(1);
  const [locationMode, setLocationMode] = useState('select');
  const [departmentMode, setDepartmentMode] = useState('select');

  const emptyForm = {
    title: '', department: '', location: '', type: '',
    experience: '', salary: '', description: '',
    requirements: '', benefits: '', deadline: '', status: 'active'
  };
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/jobs`);
      const data = await res.json();
      setJobs(data);
    } catch (err) {
      console.error('Lỗi fetch jobs:', err);
    } finally {
      setLoading(false);
    }
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
    setLocationMode('select');
    setDepartmentMode('select');
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
    
    // Check location mode
    const standardLocations = ['Đà Nẵng', 'Hải Phòng', 'Hồ Chí Minh'];
    if (job.location && !standardLocations.includes(job.location)) {
      setLocationMode('custom');
    } else {
      setLocationMode('select');
    }
    
    // Check department mode
    const standardDepartments = ['Kinh doanh', 'Marketing', 'Kế toán - Tài chính', 'Nhân sự', 'Kỹ thuật - Sản xuất', 'Logistics', 'IT', 'Hành chính', 'Ban Giám Đốc'];
    if (job.department && !standardDepartments.includes(job.department)) {
      setDepartmentMode('custom');
    } else {
      setDepartmentMode('select');
    }
    
    setShowForm(true);
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditJob(null);
    setForm(emptyForm);
    setLocationMode('select');
    setDepartmentMode('select');
  }

  function handleNewJob() {
    setShowForm(true);
    setEditJob(null);
    setForm(emptyForm);
    setLocationMode('select');
    setDepartmentMode('select');
  }

  const statusInfo = (status) => ({
    active: { label: 'Đang tuyển', cls: 'badge--active' },
    inactive: { label: 'Ngừng tuyển', cls: 'badge--inactive' },
  }[status] || { label: status, cls: '' });

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

  const pagedJobs = paginate(jobs, jobPage, JOBS_PER_PAGE);
  const jobTotalPages = getTotalPages(jobs, JOBS_PER_PAGE);

  return (
    <>
      <div className="adm-topbar" style={{ marginBottom: 20 }}>
        <div></div>
        <button className="adm-btn adm-btn--primary" onClick={handleNewJob}>
          <Plus size={16} /> Đăng tin mới
        </button>
      </div>

      {showForm && (
        <div className="adm-form-card">
          <div className="adm-form-card__header">
            <h2>{editJob ? 'Sửa tin tuyển dụng' : 'Đăng tin mới'}</h2>
            <button className="adm-icon-btn" onClick={handleCloseForm}>
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="adm-form">
            <div className="adm-form__grid">
              <div className="adm-field">
                <label>Vị trí tuyển dụng <span>*</span></label>
                <input 
                  value={form.title} 
                  onChange={e => setForm({ ...form, title: e.target.value })} 
                  required 
                  placeholder="VD: Nhân viên kinh doanh" 
                />
              </div>

              <div className="adm-field">
                <label>Phòng ban</label>
                <div className="adm-select-wrap">
                  <select 
                    value={departmentMode === 'custom' ? 'other' : form.department}
                    onChange={e => {
                      if (e.target.value === 'other') {
                        setDepartmentMode('custom');
                        setForm({ ...form, department: '' });
                      } else {
                        setDepartmentMode('select');
                        setForm({ ...form, department: e.target.value });
                      }
                    }}
                  >
                    <option value="">Chọn phòng ban</option>
                    <option>Kinh doanh</option>
                    <option>Marketing</option>
                    <option>Kế toán - Tài chính</option>
                    <option>Nhân sự</option>
                    <option>Kỹ thuật - Sản xuất</option>
                    <option>Logistics</option>
                    <option>IT</option>
                    <option>Hành chính</option>
                    <option>Ban Giám Đốc</option>
                    <option value="other">Khác (nhập tay)...</option>
                  </select>
                  <ChevronDown size={14} />
                </div>
                {departmentMode === 'custom' && (
                  <input 
                    style={{ marginTop: 8 }} 
                    value={form.department} 
                    onChange={e => setForm({ ...form, department: e.target.value })} 
                    placeholder="Nhập tên phòng ban..." 
                    autoFocus 
                  />
                )}
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
                <input 
                  value={form.salary} 
                  onChange={e => setForm({ ...form, salary: e.target.value })} 
                  placeholder="VD: 8-12 triệu" 
                />
              </div>

              <div className="adm-field">
                <label>Hạn nộp hồ sơ</label>
                <input 
                  type="date" 
                  value={form.deadline} 
                  onChange={e => setForm({ ...form, deadline: e.target.value })} 
                />
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
              <textarea 
                rows={5} 
                value={form.description} 
                onChange={e => setForm({ ...form, description: e.target.value })} 
                placeholder="Mô tả chi tiết công việc..." 
              />
            </div>

            <div className="adm-field adm-field--full">
              <label>Yêu cầu</label>
              <textarea 
                rows={5} 
                value={form.requirements} 
                onChange={e => setForm({ ...form, requirements: e.target.value })} 
                placeholder="Yêu cầu ứng viên..." 
              />
            </div>

            <div className="adm-field adm-field--full">
              <label>Quyền lợi</label>
              <textarea 
                rows={5} 
                value={form.benefits} 
                onChange={e => setForm({ ...form, benefits: e.target.value })} 
                placeholder="Quyền lợi được hưởng..." 
              />
            </div>

            <div className="adm-form__actions">
              <button 
                type="button" 
                className="adm-btn adm-btn--ghost" 
                onClick={handleCloseForm}
              >
                <X size={15} /> Hủy
              </button>
              <button type="submit" className="adm-btn adm-btn--primary">
                <Save size={15} /> {editJob ? 'Cập nhật' : 'Đăng tin'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="adm-loading">
          <div className="adm-spinner" />
          <span>Đang tải...</span>
        </div>
      ) : (
        <>
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
                {pagedJobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="adm-table__empty">
                      Chưa có tin tuyển dụng
                    </td>
                  </tr>
                ) : pagedJobs.map(job => {
                  const s = statusInfo(job.status);
                  return (
                    <tr key={job.id}>
                      <td className="adm-table__title">{job.title}</td>
                      <td>
                        <span className="adm-meta">
                          <MapPin size={12} />
                          {job.location}
                        </span>
                      </td>
                      <td>
                        <span className="adm-meta">
                          <Briefcase size={12} />
                          {job.type}
                        </span>
                      </td>
                      <td>
                        <span className="adm-meta">
                          <Calendar size={12} />
                          {job.deadline ? new Date(job.deadline).toLocaleDateString('vi-VN') : '—'}
                        </span>
                      </td>
                      <td>
                        <span className={`adm-badge ${s.cls}`}>
                          {s.label}
                        </span>
                      </td>
                      <td>
                        <div className="adm-table__actions">
                          <button 
                            className="adm-icon-btn adm-icon-btn--blue" 
                            onClick={() => handleEdit(job)} 
                            title="Sửa"
                          >
                            <Pencil size={14} />
                          </button>
                          <button 
                            className="adm-icon-btn adm-icon-btn--red" 
                            onClick={() => handleDelete(job.id)} 
                            title="Xóa"
                          >
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

          <div className="adm-table-footer">
            <span className="adm-table-footer__count">
              Hiển thị {jobs.length === 0 ? 0 : Math.min((jobPage - 1) * JOBS_PER_PAGE + 1, jobs.length)}–{Math.min(jobPage * JOBS_PER_PAGE, jobs.length)} / {jobs.length} tin
            </span>
            <Pagination 
              page={jobPage} 
              total={jobTotalPages} 
              onChange={p => { 
                setJobPage(p); 
                window.scrollTo({ top: 0, behavior: 'smooth' }); 
              }} 
            />
          </div>
        </>
      )}
    </>
  );
}