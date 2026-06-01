import { useState, useEffect } from 'react';
import {
  Search, ChevronDown, X, FileText, Phone, Mail, Briefcase,
  Clock, MapPin, Eye, CheckCircle, XCircle, AlertCircle,
  ChevronLeft, ChevronRight, Save, Plus, User, Loader, Send, Trash2, Calendar, Bookmark, Edit2, UploadCloud
} from 'lucide-react';
import './toast.scss';
import { createPortal } from 'react-dom';

const APPS_PER_PAGE = 10;

export default function ApplicationsManager({ token }) {
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);
  const [editMode, setEditMode] = useState(false);         
  const [editData, setEditData] = useState({});                
  const [editCvFile, setEditCvFile] = useState(null);          
  const [showAddModal, setShowAddModal] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [appPage, setAppPage] = useState(1);
  const [startDateParts, setStartDateParts] = useState({ day: '', month: '', year: '', time: '' });
  const [appFilter, setAppFilter] = useState({
    status: '', search: '', department: '', experience: '', location: '', dateRange: ''
  });
  const [newApp, setNewApp] = useState({
    full_name: '', email: '', phone: '', position: '',
    experience: '', address: '', cover_letter: '', cvFile: null
  });
  const formatCurrency = (value) => {
    if (!value && value !== 0) return '';
    return Number(value).toLocaleString('vi-VN');
  };
  const parseCurrency = (str) => str.replace(/\./g, '').replace(/[^0-9]/g, '');

  const [offerData, setOfferData] = useState({
    position: '',
    start_date: '',
    work_location: '133 Trung Lương 14 – Phường Hòa Xuân – Thành phố Đà Nẵng',
    probation_period: '2',
    salary: '',
    probation_salary_percent: '85',
    work_schedule: 'Từ thứ hai đến thứ bảy, 8h00 đến 17h00 (nghỉ trưa 12h00 - 13h00)'
  });

  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [saving, setSaving] = useState(false);                   // ← NEW: for edit save
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '', visible: false });
  const [confirmModal, setConfirmModal] = useState({ visible: false, message: '', onConfirm: null });
  const [salaryDisplay, setSalaryDisplay] = useState(formatCurrency(offerData.salary));

  const showToast = (message, type = 'success') => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
  };
  const showConfirm = (message, onConfirm) => setConfirmModal({ visible: true, message, onConfirm });
  const hideConfirm = () => setConfirmModal({ visible: false, message: '', onConfirm: null });

  useEffect(() => { fetchApplications(); }, []);

  async function fetchApplications() {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/applications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) { setApplications([]); showToast('Không thể tải danh sách hồ sơ', 'error'); return; }
      const data = await res.json();
      setApplications(Array.isArray(data) ? data : []);
      setAppPage(1);
    } catch {
      setApplications([]);
      showToast('Lỗi kết nối khi tải dữ liệu', 'error');
    } finally {
      setLoading(false);
    }
  }

  function deleteApplication(id) {
    showConfirm('Bạn có chắc muốn xóa hồ sơ này không?', async () => {
      hideConfirm();
      setDeleting(true);
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/applications/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Xóa thất bại');
        showToast('Đã xóa hồ sơ thành công', 'success');
        fetchApplications();
      } catch (err) {
        showToast(err.message || 'Lỗi khi xóa hồ sơ', 'error');
      } finally {
        setDeleting(false);
      }
    });
  }
  function updateStartDate(parts) {
    const next = { ...startDateParts, ...parts };
    setStartDateParts(next);
    const { day, month, year, time } = next;
    if (day && month && year) {
      const d = String(day).padStart(2, '0');
      const m = String(month).padStart(2, '0');
      const t = time || '08:00';
      setOfferData(prev => ({ ...prev, start_date: `${year}-${m}-${d}T${t}` }));
    }
  }
  async function addApplication() {
    if (!newApp.full_name || !newApp.email || !newApp.phone || !newApp.position) {
      showToast('Vui lòng điền đầy đủ các trường bắt buộc (*)', 'error');
      return;
    }
    setAdding(true);
    try {
      const formData = new FormData();
      formData.append('full_name', newApp.full_name);
      formData.append('email', newApp.email);
      formData.append('phone', newApp.phone);
      formData.append('position', newApp.position);
      formData.append('experience', newApp.experience || '');
      formData.append('address', newApp.address || '');
      formData.append('cover_letter', newApp.cover_letter || '');
      if (newApp.cvFile) formData.append('cv', newApp.cvFile);

      setShowAddModal(false);
      setNewApp({ full_name: '', email: '', phone: '', position: '', experience: '', address: '', cover_letter: '', cvFile: null });
      showToast('Thêm hồ sơ thành công!', 'success');
      fetchApplications();

      fetch(`${import.meta.env.VITE_API_URL}/applications/manual`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }).catch(err => console.error('[ADD ERROR]', err.message));
    } finally {
      setAdding(false);
    }
  }

  // ── NEW: Enter edit mode ─────────────────────────────────────
  function enterEditModeFor(app) {
    setEditData({
      full_name: app.full_name || '',
      email: app.email || '',
      phone: app.phone || '',
      position: app.position || '',
      experience: app.experience || '',
      address: app.address || '',
      cover_letter: app.cover_letter || '',
    });
    setEditCvFile(null);
    setEditMode(true);
  }

  function enterEditMode() {
    enterEditModeFor(selectedApp);
  }

  function cancelEdit() {
    setEditMode(false);
    setEditCvFile(null);
    setEditData({});
  }

  // ── NEW: Save edited info (PUT with multipart) ───────────────
  async function saveEditedInfo() {
    if (!editData.full_name || !editData.email || !editData.phone || !editData.position) {
      showToast('Vui lòng điền đầy đủ các trường bắt buộc (*)', 'error');
      return;
    }
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('full_name', editData.full_name);
      formData.append('email', editData.email);
      formData.append('phone', editData.phone);
      formData.append('position', editData.position);
      formData.append('experience', editData.experience || '');
      formData.append('address', editData.address || '');
      formData.append('cover_letter', editData.cover_letter || '');
      // Status & note preserved from selectedApp
      formData.append('status', selectedApp.status);
      formData.append('note', selectedApp.note || '');
      if (editCvFile) formData.append('cv', editCvFile);

      const res = await fetch(`${import.meta.env.VITE_API_URL}/applications/${selectedApp.id}/info`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Cập nhật thất bại');
      }
      const updated = await res.json();
      // Sync selectedApp with latest data
      setSelectedApp(prev => ({
        ...prev,
        ...editData,
        cv_link: updated.cv_link ?? prev.cv_link,
      }));
      showToast('Cập nhật thông tin thành công', 'success');
      setEditMode(false);
      setEditCvFile(null);
      fetchApplications();
    } catch (err) {
      showToast(err.message || 'Lỗi khi cập nhật thông tin', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function updateApplication(id, status, note) {
    if (status === 'passed') {
      setStartDateParts({ day: '', month: '', year: '', time: '' }); // ← thêm dòng này
      setOfferData(prev => ({ ...prev, position: selectedApp.position || '', start_date: '', salary: '' }));
      setShowOfferModal(true);
      return;
    }
    if (status === 'failed') {
      const appToReject = selectedApp;
      setSelectedApp(null);
      showConfirm('Gửi email thông báo không đạt cho ứng viên?', async () => {
        hideConfirm();
        sendRejectionEmail(appToReject).catch(err => console.error('Lỗi gửi email từ chối:', err));
        await doUpdate(id, status, note);
      });
      return;
    }
    await doUpdate(id, status, note);
  }

  async function doUpdate(id, status, note) {
    setUpdating(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, note }),
      });
      if (!res.ok) throw new Error('Cập nhật thất bại');
      showToast('Cập nhật hồ sơ thành công', 'success');
      fetchApplications();
      setSelectedApp(null);
    } catch (err) {
      showToast(err.message || 'Lỗi khi cập nhật', 'error');
    } finally {
      setUpdating(false);
    }
  }

  async function sendOfferLetter() {
    if (!offerData.start_date || !offerData.salary) {
      showToast('Vui lòng điền đầy đủ thông tin bắt buộc', 'error');
      return;
    }
    setSending(true);
    showToast('⏳ Đang gửi thư mời nhận việc...', 'info');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/applications/send-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ application_id: selectedApp.id, ...offerData }),
      });
      if (!res.ok) {
        const error = await res.json();
        showToast(error.message || 'Không thể gửi email', 'error');
        return;
      }
      showToast('Đã gửi thư mời nhận việc thành công!', 'success');
      setShowOfferModal(false);
      await fetch(`${import.meta.env.VITE_API_URL}/applications/${selectedApp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'passed', note: selectedApp.note }),
      });
      fetchApplications();
      setSelectedApp(null);
    } catch {
      showToast('❌ Có lỗi xảy ra khi gửi email', 'error');
    } finally {
      setSending(false);
    }
  }

  async function sendRejectionEmail(app) {
    setSending(true);
    showToast('⏳ Đang gửi email thông báo kết quả...', 'info');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/applications/send-rejection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ application_id: app.id }),
      });
      if (!res.ok) {
        const error = await res.json();
        showToast(error.message || 'Không thể gửi email từ chối', 'error');
        return;
      }
      showToast('Đã gửi email thông báo kết quả', 'success');
    } catch {
      showToast('❌ Có lỗi xảy ra khi gửi email', 'error');
    } finally {
      setSending(false);
    }
  }

  const STATUS_MAP = {
    pending: { label: 'Chờ xét', cls: 'adm-badge--pending', Icon: AlertCircle },
    interviewing: { label: 'Chờ phỏng vấn', cls: 'adm-badge--interviewing', Icon: Calendar },
    passed: { label: 'Đạt', cls: 'adm-badge--passed', Icon: CheckCircle },
    failed: { label: 'Không đạt', cls: 'adm-badge--failed', Icon: XCircle },
    reserve: { label: 'Dự phòng', cls: 'adm-badge--reserve', Icon: Bookmark },
  };
  const appStatusInfo = (status) => STATUS_MAP[status] || { label: status, cls: '', Icon: AlertCircle };

  const filteredApps = applications.filter(app => {
    if (appFilter.search) {
      const q = appFilter.search.toLowerCase();
      if (!app.full_name?.toLowerCase().includes(q) && !app.email?.toLowerCase().includes(q)) return false;
    }
    if (appFilter.status && app.status !== appFilter.status) return false;
    if (appFilter.department && app.department !== appFilter.department) return false;
    if (appFilter.location && !app.address?.includes(appFilter.location)) return false;
    if (appFilter.experience && app.experience !== appFilter.experience) return false;
    if (appFilter.dateRange) {
      const diffDays = (new Date() - new Date(app.created_at)) / (1000 * 60 * 60 * 24);
      if (appFilter.dateRange === '1d' && diffDays > 1) return false;
      if (appFilter.dateRange === '1w' && diffDays > 7) return false;
      if (appFilter.dateRange === '1m' && diffDays > 30) return false;
    }
    return true;
  });

  const paginate = (data, page, perPage) => data.slice((page - 1) * perPage, page * perPage);
  const getTotalPages = (data, perPage) => Math.max(1, Math.ceil(data.length / perPage));
  const getPageNumbers = (current, total) => {
    const pages = [];
    if (total <= 7) { for (let i = 1; i <= total; i++) pages.push(i); }
    else {
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
          p === '...'
            ? <span key={`e${idx}`} className="adm-pagination__ellipsis">...</span>
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
      {toast.visible && createPortal(
        <div className={`adm-toast adm-toast--${toast.type}`}><span>{toast.message}</span></div>,
        document.body
      )}

      {/* CONFIRM MODAL */}
      {confirmModal.visible && (
        <div className="adm-modal-backdrop" onClick={hideConfirm}>
          <div className="adm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="adm-modal__header">
              <h2><AlertCircle size={20} /> Xác nhận</h2>
              <button className="adm-icon-btn" onClick={hideConfirm}><X size={18} /></button>
            </div>
            <div className="adm-modal__body">
              <p style={{ fontSize: 15, color: 'var(--color-text)', margin: 0, lineHeight: 1.6 }}>{confirmModal.message}</p>
            </div>
            <div className="adm-modal__footer">
              <button className="adm-btn adm-btn--ghost" onClick={hideConfirm}><X size={15} /> Hủy</button>
              <button className="adm-btn adm-btn--primary" onClick={confirmModal.onConfirm}><CheckCircle size={15} /> Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {/* FILTER BAR */}
      <div className="adm-filter-bar adm-filter-bar--wrap">
        <div className="adm-filter-bar__input">
          <Search size={14} />
          <input placeholder="Tìm tên, email..." value={appFilter.search} onChange={e => setAppFilter({ ...appFilter, search: e.target.value })} />
        </div>
        <div className="adm-select-wrap adm-select-wrap--sm">
          <select value={appFilter.status} onChange={e => setAppFilter({ ...appFilter, status: e.target.value })}>
            <option value="">Tất cả trạng thái</option>
            <option value="pending">Chờ xét</option>
            <option value="interviewing">Chờ phỏng vấn</option>
            <option value="passed">Đạt</option>
            <option value="failed">Không đạt</option>
            <option value="reserve">Dự phòng</option>
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

      {/* RESULT BAR */}
      <div className="adm-filter-result" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>
          {loading ? 'Đang tải...' : (
            <>Tìm thấy <strong>{filteredApps.length}</strong> ứng viên
              {filteredApps.length !== applications.length && ` (trong tổng số ${applications.length})`}
            </>
          )}
        </span>
        <button className="adm-btn adm-btn--primary adm-btn--sm" style={{ padding: '5px 10px', fontSize: '15px' }}
          onClick={() => setShowAddModal(true)} disabled={loading}>
          <Plus size={12} /> Thêm hồ sơ
        </button>
      </div>

      {/* TABLE */}
      <div className="adm-table-wrap" style={{ overflowX: 'auto' }}>
        <table className="adm-table" style={{ minWidth: 900 }}>
          <thead>
            <tr>
              <th>Họ tên</th><th>Email</th><th>Số điện thoại</th>
              <th>Vị trí</th><th>Trạng thái</th><th style={{ minWidth: 90, whiteSpace: 'nowrap' }}>CV</th>
              <th style={{ minWidth: 120, whiteSpace: 'nowrap' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="adm-table__empty" style={{ textAlign: 'center' }}>
                <Loader size={24} className="adm-spinner" /> Đang tải dữ liệu...
              </td></tr>
            ) : pagedApps.length === 0 ? (
              <tr><td colSpan={7} className="adm-table__empty">Không tìm thấy ứng viên phù hợp</td></tr>
            ) : pagedApps.map(app => {
              const s = appStatusInfo(app.status);
              return (
                <tr key={app.id}>
                  <td className="adm-table__title">{app.full_name}</td>
                  <td><span className="adm-meta"><Mail size={12} />{app.email}</span></td>
                  <td><span className="adm-meta"><Phone size={12} />{app.phone}</span></td>
                  <td>{app.position}</td>
                  <td><span className={`adm-badge ${s.cls}`}><s.Icon size={11} /> {s.label}</span></td>
                  <td style={{ whiteSpace: 'nowrap', minWidth: 90 }}>
                    {app.cv_link
                      ? <a href={app.cv_link} target="_blank" rel="noreferrer" className="adm-link" style={{ whiteSpace: 'nowrap' }}><FileText size={13} /> Xem CV</a>
                      : <span className="adm-muted">Không có</span>}
                  </td>
                  <td style={{ whiteSpace: 'nowrap', minWidth: 120 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button className="adm-icon-btn adm-icon-btn--blue" onClick={() => { setSelectedApp(app); setEditMode(false); }} title="Chi tiết">
                        <Eye size={14} />
                      </button>
                      <button className="adm-icon-btn adm-icon-btn--orange" onClick={() => { setSelectedApp(app); enterEditModeFor(app); }} title="Chỉnh sửa">
                        <Edit2 size={14} />
                      </button>
                      <button className="adm-icon-btn adm-icon-btn--red" onClick={() => deleteApplication(app.id)} title="Xóa" disabled={deleting}>
                        {deleting ? <span className="adm-spinner" style={{ width: 14, height: 14 }} /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="adm-table-footer">
        <span className="adm-table-footer__count">
          {!loading && `Hiển thị ${filteredApps.length === 0 ? 0 : Math.min((appPage - 1) * APPS_PER_PAGE + 1, filteredApps.length)}–${Math.min(appPage * APPS_PER_PAGE, filteredApps.length)} / ${filteredApps.length} ứng viên`}
        </span>
        <Pagination page={appPage} total={appTotalPages} onChange={p => { setAppPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
      </div>

      {/* ADD MODAL */}
      {showAddModal && (
        <div className="adm-modal-backdrop" onClick={() => setShowAddModal(false)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal__header">
              <h2><User size={20} /> Thêm hồ sơ ứng viên</h2>
              <button className="adm-icon-btn" onClick={() => setShowAddModal(false)}><X size={18} /></button>
            </div>
            <div className="adm-modal__body">
              <div className="adm-field">
                <label>Họ và tên <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input type="text" placeholder="Nhập họ tên đầy đủ" value={newApp.full_name} onChange={e => setNewApp({ ...newApp, full_name: e.target.value })} />
              </div>
              <div className="adm-field">
                <label>Email <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input type="email" placeholder="Nhập email cá nhân của ứng viên" value={newApp.email} onChange={e => setNewApp({ ...newApp, email: e.target.value })} />
              </div>
              <div className="adm-field">
                <label>Số điện thoại <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input type="tel" placeholder="Số điện thoại ứng viên" value={newApp.phone} onChange={e => setNewApp({ ...newApp, phone: e.target.value })} />
              </div>
              <div className="adm-field">
                <label>Vị trí ứng tuyển <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input type="text" placeholder="VD: Nhân viên kinh doanh" value={newApp.position} onChange={e => setNewApp({ ...newApp, position: e.target.value })} />
              </div>
              <div className="adm-field">
                <label>Kinh nghiệm</label>
                <div className="adm-select-wrap">
                  <select value={newApp.experience} onChange={e => setNewApp({ ...newApp, experience: e.target.value })}>
                    <option value="">Chọn kinh nghiệm</option>
                    <option>Không yêu cầu</option><option>Dưới 1 năm</option><option>1-2 năm</option><option>3+ năm</option>
                  </select>
                  <ChevronDown size={14} />
                </div>
              </div>
              <div className="adm-field">
                <label>Địa chỉ</label>
                <input type="text" placeholder="Nhập địa chỉ" value={newApp.address} onChange={e => setNewApp({ ...newApp, address: e.target.value })} />
              </div>
              <div className="adm-field">
                <label>CV / Hồ sơ</label>
                <input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={e => setNewApp({ ...newApp, cvFile: e.target.files[0] || null })} />
                {newApp.cvFile && (
                  <span style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 4, display: 'block' }}>
                    📎 {newApp.cvFile.name} ({(newApp.cvFile.size / 1024).toFixed(0)} KB)
                  </span>
                )}
              </div>
              <div className="adm-field">
                <label>Thư xin việc</label>
                <textarea rows={4} placeholder="Nhập thư xin việc của ứng viên..." value={newApp.cover_letter} onChange={e => setNewApp({ ...newApp, cover_letter: e.target.value })} />
              </div>
            </div>
            <div className="adm-modal__footer">
              <button className="adm-btn adm-btn--ghost" onClick={() => setShowAddModal(false)} disabled={adding}><X size={15} /> Hủy</button>
              <button className="adm-btn adm-btn--primary" onClick={addApplication}
                disabled={!newApp.full_name || !newApp.email || !newApp.phone || !newApp.position || adding}>
                {adding ? <><span className="adm-spinner" /> Đang thêm...</> : <><Plus size={15} /> Thêm hồ sơ</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OFFER MODAL */}
      {showOfferModal && (
        <div className="adm-modal-backdrop" onClick={() => setShowOfferModal(false)}>
          <div className="adm-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="adm-modal__header">
              <h2><Send size={20} /> Thư mời nhận việc</h2>
              <button className="adm-icon-btn" onClick={() => setShowOfferModal(false)}><X size={18} /></button>
            </div>
            <div className="adm-modal__body">
              <p style={{ marginBottom: 20, color: 'var(--color-muted)' }}>
                Gửi thư mời nhận việc cho: <strong>{selectedApp?.full_name}</strong> ({selectedApp?.email})
              </p>
              <div className="adm-field">
                <label>Vị trí <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input type="text" value={offerData.position} onChange={e => setOfferData({ ...offerData, position: e.target.value })} placeholder="VD: Nhân viên công nghệ" />
              </div>
              <div className="adm-field">
                <label>Thời gian nhận việc <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="number" placeholder="Ngày" min="1" max="31" style={{ width: 70 }}
                    value={startDateParts.day}
                    onChange={e => updateStartDate({ day: e.target.value })}
                  />
                  <span>/</span>
                  <input
                    type="number" placeholder="Tháng" min="1" max="12" style={{ width: 80 }}
                    value={startDateParts.month}
                    onChange={e => updateStartDate({ month: e.target.value })}
                  />
                  <span>/</span>
                  <input
                    type="number" placeholder="Năm" min="2024" max="2030" style={{ width: 90 }}
                    value={startDateParts.year}
                    onChange={e => updateStartDate({ year: e.target.value })}
                  />
                  <span>lúc</span>
                  <input
                    type="time" style={{ width: 125 }}
                    value={startDateParts.time}
                    onChange={e => updateStartDate({ time: e.target.value })}
                  />
                </div>
                {offerData.start_date && (
                  <span style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 4, display: 'block' }}>
                    {new Date(offerData.start_date).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
              <div className="adm-field">
                <label>Địa điểm làm thủ tục nhận việc</label>
                <input type="text" value={offerData.work_location} onChange={e => setOfferData({ ...offerData, work_location: e.target.value })} />
              </div>
              <div className="adm-field">
                <label>Thời gian thử việc (tháng)</label>
                <input type="number" value={offerData.probation_period} onChange={e => setOfferData({ ...offerData, probation_period: e.target.value })} min="0" max="12" />
              </div>
              <div className="adm-field">
                <label>Mức lương Gross chính thức (VNĐ) <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                <input type="text" value={salaryDisplay}
                  onChange={e => { const raw = parseCurrency(e.target.value); setSalaryDisplay(formatCurrency(raw)); setOfferData({ ...offerData, salary: raw }); }}
                  onBlur={e => { const raw = parseCurrency(e.target.value); setSalaryDisplay(formatCurrency(raw)); }}
                  placeholder="VD: 9.000.000" inputMode="numeric" />
              </div>
              <div className="adm-field">
                <label>% Lương thử việc</label>
                <input type="number" value={offerData.probation_salary_percent} onChange={e => setOfferData({ ...offerData, probation_salary_percent: e.target.value })} min="0" max="100" />
              </div>
              <div className="adm-field">
                <label>Thời gian làm việc</label>
                <input type="text" value={offerData.work_schedule} onChange={e => setOfferData({ ...offerData, work_schedule: e.target.value })} />
              </div>
            </div>
            <div className="adm-modal__footer">
              <button className="adm-btn adm-btn--ghost" onClick={() => setShowOfferModal(false)} disabled={sending}><X size={15} /> Hủy</button>
              <button className="adm-btn adm-btn--primary" onClick={sendOfferLetter}
                disabled={!offerData.start_date || !offerData.salary || sending}>
                {sending ? <><span className="adm-spinner" /> Đang gửi...</> : <><Send size={15} /> Gửi thư mời</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DETAIL / EDIT MODAL ─────────────────────────────────── */}
      {selectedApp && !showOfferModal && (
        <div className="adm-modal-backdrop" onClick={() => { setSelectedApp(null); setEditMode(false); }}>
          <div className="adm-modal" onClick={e => e.stopPropagation()}>
            <div className="adm-modal__header">
              <h2>{editMode ? <><Edit2 size={18} /> Chỉnh sửa thông tin</> : 'Thông tin ứng viên'}</h2>
              <div style={{ display: 'flex', gap: 6 }}>
                {/* Toggle Edit / View */}
                {!editMode && (
                  <button className="adm-btn adm-btn--ghost adm-btn--sm" onClick={enterEditMode} title="Chỉnh sửa thông tin">
                    <Edit2 size={14} /> Chỉnh sửa
                  </button>
                )}
                <button className="adm-icon-btn" onClick={() => { setSelectedApp(null); setEditMode(false); }}><X size={18} /></button>
              </div>
            </div>

            <div className="adm-modal__body">
              {editMode ? (
                /* ── EDIT FORM ─────────────────────────────── */
                <>
                  <div className="adm-field">
                    <label>Họ và tên <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                    <input type="text" value={editData.full_name} onChange={e => setEditData({ ...editData, full_name: e.target.value })} />
                  </div>
                  <div className="adm-field">
                    <label>Email <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                    <input type="email" value={editData.email} onChange={e => setEditData({ ...editData, email: e.target.value })} />
                  </div>
                  <div className="adm-field">
                    <label>Số điện thoại <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                    <input type="tel" value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} />
                  </div>
                  <div className="adm-field">
                    <label>Vị trí ứng tuyển <span style={{ color: 'var(--color-danger)' }}>*</span></label>
                    <input type="text" value={editData.position} onChange={e => setEditData({ ...editData, position: e.target.value })} />
                  </div>
                  <div className="adm-field">
                    <label>Kinh nghiệm</label>
                    <div className="adm-select-wrap">
                      <select value={editData.experience} onChange={e => setEditData({ ...editData, experience: e.target.value })}>
                        <option value="">Chọn kinh nghiệm</option>
                        <option>Không yêu cầu</option><option>Dưới 1 năm</option><option>1-2 năm</option><option>3+ năm</option>
                      </select>
                      <ChevronDown size={14} />
                    </div>
                  </div>
                  <div className="adm-field">
                    <label>Địa chỉ</label>
                    <input type="text" value={editData.address} onChange={e => setEditData({ ...editData, address: e.target.value })} />
                  </div>

                  {/* CV upload in edit mode */}
                  <div className="adm-field">
                    <label>CV / Hồ sơ</label>
                    {selectedApp.cv_link && !editCvFile && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <a href={selectedApp.cv_link} target="_blank" rel="noreferrer" className="adm-link" style={{ fontSize: 13 }}>
                          <FileText size={13} /> CV hiện tại
                        </a>
                        <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>(upload mới sẽ thay thế)</span>
                      </div>
                    )}
                    <label
                      htmlFor="edit-cv-upload"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                        border: '1.5px dashed var(--color-border)', borderRadius: 7, padding: '10px 14px',
                        fontSize: 13, color: 'var(--color-muted)', background: 'var(--color-surface)',
                        transition: 'border-color 0.2s',
                      }}
                    >
                      <UploadCloud size={16} />
                      {editCvFile ? `📎 ${editCvFile.name} (${(editCvFile.size / 1024).toFixed(0)} KB)` : 'Chọn CV mới (PDF, Word, ảnh — tối đa 10MB)'}
                    </label>
                    <input
                      id="edit-cv-upload"
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      style={{ display: 'none' }}
                      onChange={e => setEditCvFile(e.target.files[0] || null)}
                    />
                    {editCvFile && (
                      <button
                        className="adm-btn adm-btn--ghost adm-btn--sm"
                        style={{ marginTop: 6 }}
                        onClick={() => setEditCvFile(null)}
                      >
                        <X size={12} /> Bỏ chọn
                      </button>
                    )}
                  </div>

                  <div className="adm-field">
                    <label>Thư xin việc</label>
                    <textarea rows={4} value={editData.cover_letter} onChange={e => setEditData({ ...editData, cover_letter: e.target.value })} placeholder="Thư xin việc..." />
                  </div>
                </>
              ) : (
                /* ── VIEW MODE ─────────────────────────────── */
                <>
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
                        <span className="adm-modal__info-value">{icon && icon} {value || '—'}</span>
                      </div>
                    ))}
                  </div>
                  {selectedApp.cv_link && (
                    <a href={selectedApp.cv_link} target="_blank" rel="noreferrer"
                      className="adm-btn adm-btn--blue adm-btn--sm" style={{ display: 'inline-flex', marginBottom: 20 }}>
                      <FileText size={14} /> Xem CV
                    </a>
                  )}
                  <div className="adm-field">
                    <label>Trạng thái</label>
                    <div className="adm-select-wrap">
                      <select value={selectedApp.status} onChange={e => setSelectedApp({ ...selectedApp, status: e.target.value })}>
                        <option value="pending">Chờ xét</option>
                        <option value="interviewing">Chờ phỏng vấn</option>
                        <option value="passed">Đạt</option>
                        <option value="failed">Không đạt</option>
                        <option value="reserve">Dự phòng</option>
                      </select>
                      <ChevronDown size={14} />
                    </div>
                  </div>
                  <div className="adm-field">
                    <label>Ghi chú</label>
                    <textarea rows={4} value={selectedApp.note || ''} onChange={e => setSelectedApp({ ...selectedApp, note: e.target.value })} placeholder="Nhập ghi chú..." />
                  </div>
                </>
              )}
            </div>

            <div className="adm-modal__footer">
              {editMode ? (
                <>
                  <button className="adm-btn adm-btn--ghost" onClick={cancelEdit} disabled={saving}>
                    <X size={15} /> Hủy
                  </button>
                  <button className="adm-btn adm-btn--primary" onClick={saveEditedInfo} disabled={saving}>
                    {saving ? <><span className="adm-spinner" /> Đang lưu...</> : <><Save size={15} /> Lưu thông tin</>}
                  </button>
                </>
              ) : (
                <>
                  <button className="adm-btn adm-btn--ghost" onClick={() => setSelectedApp(null)} disabled={updating}>
                    <X size={15} /> Đóng
                  </button>
                  <button className="adm-btn adm-btn--primary"
                    onClick={() => updateApplication(selectedApp.id, selectedApp.status, selectedApp.note)}
                    disabled={updating}>
                    {updating ? <><span className="adm-spinner" /> Đang lưu...</> : <><Save size={15} /> Lưu trạng thái</>}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}