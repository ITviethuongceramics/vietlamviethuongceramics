import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Pencil, Trash2, X, Eye, EyeOff,
  LogOut, ShieldCheck, MapPin, Upload, ImageIcon, Info, FileText
} from 'lucide-react';
import logo from '../assets/logo.jpg';
import './AdminUsersPage.scss';
import { Image } from 'lucide-react';
import ImagesManager from './ImagesManager';
import TestsManager from './TestsManager';

const API = import.meta.env.VITE_API_URL;

// ──────────────────────────────────────────────────────────────
//  Pagination Component
// ──────────────────────────────────────────────────────────────
function Pagination({ page, totalPages, total, pageSize, label, onChange }) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to   = Math.min(page * pageSize, total);

  function getPages() {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages = [];
    if (page <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (page >= totalPages - 3) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', page - 1, page, page + 1, '...', totalPages);
    }
    return pages;
  }

  const btnBase = {
    padding: '6px 12px', borderRadius: 8, border: '1.5px solid #e5e7eb',
    fontSize: 13, fontWeight: 500, cursor: 'pointer', minWidth: 36,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderTop: '1px solid #f3f4f6', flexWrap: 'wrap', gap: 10 }}>
      <span style={{ fontSize: 13, color: '#6b7280' }}>
        Hiển thị {from}–{to} / {total} {label}
      </span>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <button
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          style={{ ...btnBase, background: page === 1 ? '#f9fafb' : '#fff', color: page === 1 ? '#d1d5db' : '#374151', cursor: page === 1 ? 'default' : 'pointer' }}
        >←</button>

        {getPages().map((n, i) =>
          n === '...'
            ? <span key={`dot-${i}`} style={{ padding: '6px 4px', fontSize: 13, color: '#9ca3af', display: 'flex', alignItems: 'center' }}>…</span>
            : <button key={n} onClick={() => onChange(n)}
                style={{ ...btnBase, borderColor: n === page ? '#c0392b' : '#e5e7eb', background: n === page ? '#c0392b' : '#fff', color: n === page ? '#fff' : '#374151' }}
              >{n}</button>
        )}

        <button
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          style={{ ...btnBase, background: page === totalPages ? '#f9fafb' : '#fff', color: page === totalPages ? '#d1d5db' : '#374151', cursor: page === totalPages ? 'default' : 'pointer' }}
        >→</button>
      </div>
    </div>
  );
}

function F({ label, field, type = 'text', placeholder = '', value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(field, e.target.value)}
        onKeyDown={e => e.stopPropagation()}
        style={{
          width: '100%', padding: '10px 14px', fontSize: 14,
          border: '1.5px solid #e5e7eb', borderRadius: 8,
          outline: 'none', background: '#fff', boxSizing: 'border-box',
        }}
        onFocus={e => e.target.style.borderColor = '#c0392b'}
        onBlur={e  => e.target.style.borderColor = '#e5e7eb'}
      />
    </div>
  );
}

function ImageUploadField({ value, onChange }) {
  const inputRef = useRef();
  const [preview, setPreview] = useState(value || '');

  useEffect(() => { setPreview(value || ''); }, [value]);

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const name = file.name.toLowerCase();
    if (name.endsWith('.heic') || name.endsWith('.heif')) {
      alert('Định dạng HEIC/HEIF không được hỗ trợ.\nVui lòng chuyển ảnh sang JPG hoặc PNG trước khi upload.');
      e.target.value = '';
      return;
    }
    onChange(file);
    setPreview(URL.createObjectURL(file));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {preview ? (
        <img src={preview} alt="preview"
          style={{ width: '100%', height: 250, objectFit: 'contain', borderRadius: 10, border: '1.5px solid #e5e7eb' }} />
      ) : (
        <div style={{
          width: '100%', height: 150, background: '#f9fafb', borderRadius: 10,
          border: '2px dashed #e5e7eb', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 8, color: '#9ca3af',
        }}>
          <ImageIcon size={30} />
          <span style={{ fontSize: 13 }}>Chưa có ảnh</span>
        </div>
      )}
      <button type="button" onClick={() => inputRef.current.click()}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '9px 16px', border: '1.5px solid #e5e7eb', borderRadius: 8,
          background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#374151',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#c0392b'; e.currentTarget.style.color = '#c0392b'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#374151'; }}
      >
        <Upload size={14} /> Chọn ảnh từ máy
      </button>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
//  Modal styles (dùng chung)
// ──────────────────────────────────────────────────────────────
const backdropStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1000, padding: 16,
};
const modalBase = {
  background: '#fff', borderRadius: 16,
  boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
  display: 'flex', flexDirection: 'column',
  maxHeight: '92vh', overflow: 'hidden',
};
const modalHeader = {
  padding: '22px 28px 18px', borderBottom: '1px solid #f3f4f6',
  display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
};
const modalFooter = {
  padding: '16px 28px', borderTop: '1px solid #f3f4f6',
  display: 'flex', justifyContent: 'flex-end', gap: 10,
};
const closeBtn = {
  background: '#f3f4f6', border: 'none', borderRadius: 8,
  width: 36, height: 36, cursor: 'pointer', flexShrink: 0,
  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280',
};

// ──────────────────────────────────────────────────────────────
//  TAB 1: QUẢN LÝ CHI NHÁNH
// ──────────────────────────────────────────────────────────────
const BRANCH_PAGE_SIZE = 10;

function BranchesTab({ token }) {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [page, setPage]         = useState(1);

  const totalPages    = Math.ceil(branches.length / BRANCH_PAGE_SIZE);
  const pagedBranches = branches.slice((page - 1) * BRANCH_PAGE_SIZE, page * BRANCH_PAGE_SIZE);

  const emptyForm = { name: '', address: '', email: '', phone: '', lat: '', lng: '', sort_order: 0 };
  const [form, setForm]           = useState(emptyForm);
  const [imageFile, setImageFile] = useState(null);
  const [imageUrl, setImageUrl]   = useState('');

  useEffect(() => { fetchBranches(); }, []);

  async function fetchBranches() {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/branches`);
      const data = await res.json();
      setBranches(data);
      setPage(1);
    } catch { setBranches([]); }
    setLoading(false);
  }

  function openAdd() { setForm(emptyForm); setImageFile(null); setImageUrl(''); setError(''); setModal('add'); }
  function openEdit(b) {
    setSelected(b);
    setForm({ name: b.name, address: b.address, email: b.email,
              phone: b.phone, lat: b.lat, lng: b.lng, sort_order: b.sort_order ?? 0 });
    setImageFile(null); setImageUrl(b.image_url || ''); setError(''); setModal('edit');
  }
  function openDelete(b) { setSelected(b); setError(''); setModal('delete'); }
  function closeModal()  { setModal(null); setSelected(null); setError(''); }
  function handleFieldChange(field, value) { setForm(f => ({ ...f, [field]: value })); }

  function buildFormData() {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (imageFile)     fd.append('image', imageFile);
    else if (imageUrl) fd.append('image_url', imageUrl);
    return fd;
  }

  async function handleAdd() {
    if (!form.name.trim()) return setError('Vui lòng nhập tên chi nhánh.');
    setSaving(true);
    try {
      const res  = await fetch(`${API}/branches`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: buildFormData() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      await fetchBranches(); closeModal();
    } catch (err) { setError(err.message); }
    setSaving(false);
  }

  async function handleEdit() {
    if (!form.name.trim()) return setError('Vui lòng nhập tên chi nhánh.');
    setSaving(true);
    try {
      const res  = await fetch(`${API}/branches/${selected.id}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: buildFormData() });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      await fetchBranches(); closeModal();
    } catch (err) { setError(err.message); }
    setSaving(false);
  }

  async function handleDelete() {
    setSaving(true);
    try {
      const res  = await fetch(`${API}/branches/${selected.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      await fetchBranches(); closeModal();
    } catch (err) { setError(err.message); }
    setSaving(false);
  }

  return (
    <>
      <div className="adm-filter-bar">
        <div style={{ flex: 1 }} />
        <button type="button" className="adm-btn adm-btn--primary" onClick={openAdd}>
          <Plus size={16} /> Thêm chi nhánh
        </button>
      </div>

      <div className="adm-table-wrap">
        {loading ? (
          <div className="adm-loading"><div className="adm-spinner" /> Đang tải...</div>
        ) : (
          <>
            <table className="adm-table">
              <thead>
                <tr><th>#</th><th>Ảnh</th><th>Chi nhánh</th><th>Địa chỉ</th><th>Điện thoại</th><th>Thao tác</th></tr>
              </thead>
              <tbody>
                {branches.length === 0 ? (
                  <tr><td colSpan={6} className="adm-table__empty">Chưa có chi nhánh nào</td></tr>
                ) : pagedBranches.map((b, i) => (
                  <tr key={b.id}>
                    <td style={{ color: '#aaa', fontSize: 13 }}>{(page - 1) * BRANCH_PAGE_SIZE + i + 1}</td>
                    <td>
                      {b.image_url
                        ? <img src={b.image_url} alt={b.name} style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 8 }} />
                        : <div style={{ width: 64, height: 48, background: '#f3f4f6', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ImageIcon size={18} color="#bbb" /></div>
                      }
                    </td>
                    <td><div style={{ fontWeight: 600 }}>{b.name}</div></td>
                    <td style={{ fontSize: 13, color: '#555', maxWidth: 200 }}>{b.address}</td>
                    <td style={{ fontSize: 13 }}>{b.phone}</td>
                    <td>
                      <div className="adm-table__actions">
                        <button type="button" className="adm-icon-btn adm-icon-btn--blue" title="Sửa" onClick={() => openEdit(b)}><Pencil size={15} /></button>
                        <button type="button" className="adm-icon-btn adm-icon-btn--red"  title="Xóa" onClick={() => openDelete(b)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={page} totalPages={totalPages} total={branches.length}
              pageSize={BRANCH_PAGE_SIZE} label="chi nhánh" onChange={setPage}
            />
          </>
        )}
      </div>

      {/* Modal Thêm / Sửa */}
      {(modal === 'add' || modal === 'edit') && (
        <div style={backdropStyle} onClick={closeModal}>
          <div style={{ ...modalBase, width: 'min(880px, 96vw)' }} onClick={e => e.stopPropagation()}>
            <div style={modalHeader}>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#111' }}>
                  {modal === 'add' ? 'Thêm chi nhánh mới' : 'Chỉnh sửa chi nhánh'}
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9ca3af' }}>Điền đầy đủ thông tin bên dưới</p>
              </div>
              <button type="button" style={closeBtn} onClick={closeModal}><X size={18} /></button>
            </div>
            <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px 28px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#c0392b', textTransform: 'uppercase', letterSpacing: '0.08em', paddingBottom: 8, borderBottom: '2px solid #fef2f2' }}>
                    Thông tin liên hệ
                  </div>
                  <F label="Tên chi nhánh *" field="name"    placeholder="Chi nhánh Đà Nẵng"       value={form.name}    onChange={handleFieldChange} />
                  <F label="Địa chỉ"         field="address" placeholder="Số nhà, đường, phường..."  value={form.address} onChange={handleFieldChange} />
                  <F label="Email / Facebook" field="email"   placeholder="facebook.com/..."         value={form.email}   onChange={handleFieldChange} />
                  <F label="Điện thoại"       field="phone"   placeholder="0905.386.888"              value={form.phone}   onChange={handleFieldChange} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#c0392b', textTransform: 'uppercase', letterSpacing: '0.08em', paddingBottom: 8, borderBottom: '2px solid #fef2f2' }}>
                    Tọa độ bản đồ
                  </div>
                  <F label="Vĩ độ (Lat)"    field="lat"        placeholder="VD: 16.0378"  value={String(form.lat)}        onChange={handleFieldChange} />
                  <F label="Kinh độ (Lng)"   field="lng"        placeholder="VD: 108.2105" value={String(form.lng)}        onChange={handleFieldChange} />
                  <F label="Thứ tự hiển thị" field="sort_order" type="number" placeholder="0" value={String(form.sort_order)} onChange={handleFieldChange} />
                  <div style={{ background: '#f0f9ff', borderRadius: 10, padding: '12px 14px', fontSize: 12, color: '#0369a1', lineHeight: 1.6 }}>
                    💡 <strong>Cách lấy tọa độ:</strong><br />
                    Mở Google Maps → chuột phải vào vị trí → copy số đầu tiên (lat), số thứ hai (lng)
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#c0392b', textTransform: 'uppercase', letterSpacing: '0.08em', paddingBottom: 8, borderBottom: '2px solid #fef2f2' }}>
                    Ảnh chi nhánh
                  </div>
                  <ImageUploadField value={imageUrl} onChange={(file) => setImageFile(file)} />
                </div>
              </div>
              {error && (
                <div style={{ marginTop: 18, padding: '11px 16px', background: '#fef2f2', borderRadius: 8, color: '#c0392b', fontSize: 13, border: '1px solid #fecaca', display: 'flex', alignItems: 'center', gap: 8 }}>
                  ⚠️ {error}
                </div>
              )}
            </div>
            <div style={modalFooter}>
              <button type="button" className="adm-btn adm-btn--ghost" onClick={closeModal}>Hủy</button>
              <button type="button" className="adm-btn adm-btn--primary"
                onClick={modal === 'add' ? handleAdd : handleEdit} disabled={saving}>
                {saving ? 'Đang lưu...' : modal === 'add' ? 'Tạo chi nhánh' : 'Cập nhật'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xóa */}
      {modal === 'delete' && selected && (
        <div style={backdropStyle} onClick={closeModal}>
          <div style={{ ...modalBase, width: 'min(440px, 96vw)' }} onClick={e => e.stopPropagation()}>
            <div style={modalHeader}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Xóa chi nhánh</h2>
              <button type="button" style={closeBtn} onClick={closeModal}><X size={18} /></button>
            </div>
            <div style={{ padding: '20px 28px' }}>
              <p style={{ fontSize: 15, color: '#374151', margin: 0, lineHeight: 1.6 }}>
                Bạn có chắc muốn xóa <strong style={{ color: '#c0392b' }}>"{selected?.name}"</strong>?<br />
                <span style={{ fontSize: 13, color: '#9ca3af' }}>Hành động này không thể hoàn tác.</span>
              </p>
              {error && <div style={{ marginTop: 12, color: '#c0392b', fontSize: 13 }}>{error}</div>}
            </div>
            <div style={modalFooter}>
              <button type="button" className="adm-btn adm-btn--ghost" onClick={closeModal}>Hủy</button>
              <button type="button" className="adm-btn adm-btn--primary" onClick={handleDelete} disabled={saving}>
                {saving ? 'Đang xóa...' : 'Xóa chi nhánh'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ──────────────────────────────────────────────────────────────
//  TAB 2: GIỚI THIỆU
// ──────────────────────────────────────────────────────────────
function AboutTab({ token }) {
  const [loading, setLoading]               = useState(true);
  const [saving, setSaving]                 = useState(false);
  const [error, setError]                   = useState('');
  const [success, setSuccess]               = useState('');
  const [introImageFile, setIntroImageFile]     = useState(null);
  const [missionImageFile, setMissionImageFile] = useState(null);
  const [visionImageFile, setVisionImageFile]   = useState(null);

  const [content, setContent] = useState({
    stats: [
      { value: '10+', label: 'Năm kinh nghiệm' },
      { value: '500+', label: 'Đối tác tin cậy' },
      { value: '5K+', label: 'Dự án hoàn thành' },
      { value: '10+', label: 'Quốc gia xuất khẩu' },
    ],
    intro_eyebrow:      'Giới thiệu',
    intro_heading:      'GIỚI THIỆU VIET HUONG CERAMICS',
    intro_heading_span: 'DOANH NGHIỆP "SAO VÀNG ĐẤT VIỆT" 2024',
    intro_text1:        '',
    intro_text2:        '',
    intro_text3:        '',
    intro_pill:         'Tiên phong · Minh bạch · Bền vững',
    intro_image_url:    '',
    vision_title:       'Tầm Nhìn',
    vision_points:      [],
    mission_title:      'Sứ Mệnh',
    mission_text:       '',
    mission_image_url:  '',
    vision_image_url:   '',
  });

  useEffect(() => {
    fetch(`${API}/about`)
      .then(res => res.json())
      .then(data => {
        if (data && Object.keys(data).length) {
          setContent(prev => ({
            ...prev, ...data,
            stats:         Array.isArray(data.stats)         ? data.stats         : prev.stats,
            vision_points: Array.isArray(data.vision_points) ? data.vision_points : prev.vision_points,
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function updateStat(idx, field, value) {
    const newStats = [...content.stats];
    newStats[idx] = { ...newStats[idx], [field]: value };
    setContent(c => ({ ...c, stats: newStats }));
  }

  function updateVisionPoints(text) {
    setContent(c => ({ ...c, vision_points: text.split('\n') }));
  }

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess('');
    try {
      const formData = new FormData();
      formData.append('stats',              JSON.stringify(content.stats));
      formData.append('vision_points',      JSON.stringify(content.vision_points.filter(p => p.trim() !== '')));
      formData.append('intro_eyebrow',      content.intro_eyebrow      ?? '');
      formData.append('intro_heading',      content.intro_heading      ?? '');
      formData.append('intro_heading_span', content.intro_heading_span ?? '');
      formData.append('intro_text1',        content.intro_text1        ?? '');
      formData.append('intro_text2',        content.intro_text2        ?? '');
      formData.append('intro_text3',        content.intro_text3        ?? '');
      formData.append('intro_pill',         content.intro_pill         ?? '');
      formData.append('vision_title',       content.vision_title       ?? '');
      formData.append('mission_title',      content.mission_title      ?? '');
      formData.append('mission_text',       content.mission_text       ?? '');

      if (introImageFile)         formData.append('intro_image',       introImageFile);
      else if (content.intro_image_url)   formData.append('intro_image_url',   content.intro_image_url);
      if (missionImageFile)       formData.append('mission_image',     missionImageFile);
      else if (content.mission_image_url) formData.append('mission_image_url', content.mission_image_url);
      if (visionImageFile)        formData.append('vision_image',      visionImageFile);
      else if (content.vision_image_url)  formData.append('vision_image_url',  content.vision_image_url);

      const res  = await fetch(`${API}/about`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Cập nhật thất bại');

      setSuccess('Cập nhật thành công!');
      setTimeout(() => setSuccess(''), 3000);
      setIntroImageFile(null); setMissionImageFile(null); setVisionImageFile(null);

      const reload = await fetch(`${API}/about`);
      const fresh  = await reload.json();
      if (fresh && Object.keys(fresh).length) {
        setContent(prev => ({
          ...prev, ...fresh,
          stats:         Array.isArray(fresh.stats)         ? fresh.stats         : prev.stats,
          vision_points: Array.isArray(fresh.vision_points) ? fresh.vision_points : prev.vision_points,
        }));
      }
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="adm-loading"><div className="adm-spinner" /> Đang tải...</div>;

  return (
    <div style={{ padding: '0 0 20px' }}>
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 6px' }}>Nội dung trang Giới thiệu</h3>
        <p style={{ color: '#6b7280', margin: 0 }}>Các trường dưới đây sẽ hiển thị trên trang /gioi-thieu.</p>
      </div>

      {/* Stats */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, borderLeft: '4px solid #c0392b', paddingLeft: 12 }}>Số liệu thống kê</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
          {content.stats.map((stat, idx) => (
            <div key={idx} style={{ background: '#f9fafb', padding: 12, borderRadius: 10, display: 'flex', gap: 12 }}>
              <F label={`Giá trị ${idx + 1}`} field="value" value={stat.value} onChange={(_, val) => updateStat(idx, 'value', val)} />
              <F label={`Nhãn ${idx + 1}`}    field="label" value={stat.label} onChange={(_, val) => updateStat(idx, 'label', val)} />
            </div>
          ))}
        </div>
      </div>

      {/* Giới thiệu */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, borderLeft: '4px solid #c0392b', paddingLeft: 12 }}>Phần giới thiệu</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <F label="Eyebrow (dòng nhỏ)" field="intro_eyebrow"      value={content.intro_eyebrow}      onChange={(_, val) => setContent(c => ({ ...c, intro_eyebrow: val }))} />
          <F label="Tiêu đề chính"      field="intro_heading"      value={content.intro_heading}      onChange={(_, val) => setContent(c => ({ ...c, intro_heading: val }))} />
          <F label="Tiêu đề phụ"        field="intro_heading_span" value={content.intro_heading_span} onChange={(_, val) => setContent(c => ({ ...c, intro_heading_span: val }))} />
          {['intro_text1', 'intro_text2', 'intro_text3'].map((field, i) => (
            <div key={field}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Đoạn văn {i + 1}{field === 'intro_text3' ? ' (hỗ trợ HTML)' : ''}
              </label>
              <textarea rows={4} value={content[field]}
                onChange={e => setContent(c => ({ ...c, [field]: e.target.value }))}
                style={{ width: '100%', marginTop: 6, padding: '10px 14px', fontSize: 14, border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
                onFocus={e => e.target.style.borderColor = '#c0392b'}
                onBlur={e  => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
          ))}
          <F label="Badge / Pill" field="intro_pill" value={content.intro_pill} onChange={(_, val) => setContent(c => ({ ...c, intro_pill: val }))} />
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ảnh giới thiệu</label>
            <div style={{ marginTop: 6 }}>
              <ImageUploadField value={content.intro_image_url} onChange={file => setIntroImageFile(file)} />
            </div>
          </div>
        </div>
      </div>

      {/* Tầm nhìn */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, borderLeft: '4px solid #c0392b', paddingLeft: 12 }}>Tầm nhìn</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <F label="Tiêu đề" field="vision_title" value={content.vision_title} onChange={(_, val) => setContent(c => ({ ...c, vision_title: val }))} />
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Các điểm (mỗi dòng một điểm)</label>
            <textarea rows={5}
              value={Array.isArray(content.vision_points) ? content.vision_points.join('\n') : ''}
              onChange={e => updateVisionPoints(e.target.value)}
              style={{ width: '100%', marginTop: 6, padding: '10px 14px', fontSize: 14, border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
              onFocus={e => e.target.style.borderColor = '#c0392b'}
              onBlur={e  => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ảnh tầm nhìn</label>
            <div style={{ marginTop: 6 }}>
              <ImageUploadField
                value={content.vision_image_url}
                onChange={file => { setVisionImageFile(file); setContent(c => ({ ...c, vision_image_url: URL.createObjectURL(file) })); }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sứ mệnh */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, borderLeft: '4px solid #c0392b', paddingLeft: 12 }}>Sứ mệnh</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <F label="Tiêu đề" field="mission_title" value={content.mission_title} onChange={(_, val) => setContent(c => ({ ...c, mission_title: val }))} />
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nội dung</label>
            <textarea rows={4} value={content.mission_text}
              onChange={e => setContent(c => ({ ...c, mission_text: e.target.value }))}
              style={{ width: '100%', marginTop: 6, padding: '10px 14px', fontSize: 14, border: '1.5px solid #e5e7eb', borderRadius: 8, outline: 'none', boxSizing: 'border-box', resize: 'vertical' }}
              onFocus={e => e.target.style.borderColor = '#c0392b'}
              onBlur={e  => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ảnh sứ mệnh</label>
            <div style={{ marginTop: 6 }}>
              <ImageUploadField value={content.mission_image_url} onChange={file => setMissionImageFile(file)} />
            </div>
          </div>
        </div>
      </div>

      {error   && <div style={{ margin: '16px 0', padding: 12, background: '#fef2f2', borderRadius: 8, color: '#c0392b', fontSize: 14, border: '1px solid #fecaca' }}>{error}</div>}
      {success && <div style={{ margin: '16px 0', padding: 12, background: '#f0fdf4', borderRadius: 8, color: '#166534', fontSize: 14, border: '1px solid #bbf7d0' }}>{success}</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
        <button type="button" className="adm-btn adm-btn--primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
//  TAB 3: QUẢN LÝ TÀI KHOẢN ADMIN
// ──────────────────────────────────────────────────────────────
const USER_PAGE_SIZE = 10;

function UsersTab({ token }) {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm]         = useState({ username: '', password: '', role: 'admin' });
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [page, setPage]         = useState(1);

  const totalPages = Math.ceil(users.length / USER_PAGE_SIZE);
  const pagedUsers = users.slice((page - 1) * USER_PAGE_SIZE, page * USER_PAGE_SIZE);

  useEffect(() => { fetchUsers(); }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/users`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      const admins = res.ok && Array.isArray(data) ? data.map(u => ({ ...u, type: 'admin' })) : [];

      const res2  = await fetch(`${API}/applications`, { headers: { Authorization: `Bearer ${token}` } });
      const data2 = await res2.json();
      const candidates = res2.ok && Array.isArray(data2)
        ? data2.map(u => ({ id: u.id, username: u.full_name, role: 'candidate', email: u.email, created_at: u.received_at, type: 'candidate' }))
        : [];

      setUsers([...admins, ...candidates]);
      setPage(1);
    } catch { setUsers([]); }
    setLoading(false);
  }

  function openAdd()     { setForm({ username: '', password: '', role: 'admin' }); setError(''); setShowPass(false); setModal('add'); }
  function openEdit(u)   { setSelected(u); setForm({ username: u.username, password: '', role: u.role }); setError(''); setShowPass(false); setModal('edit'); }
  function openDelete(u) { setSelected(u); setError(''); setModal('delete'); }
  function closeModal()  { setModal(null); setSelected(null); setError(''); }

  async function handleAdd() {
    if (!form.username.trim()) return setError('Vui lòng nhập tên tài khoản.');
    if (!form.password.trim()) return setError('Vui lòng nhập mật khẩu.');
    setSaving(true);
    try {
      const res  = await fetch(`${API}/auth/users`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      await fetchUsers(); closeModal();
    } catch (err) { setError(err.message); }
    setSaving(false);
  }

  async function handleEdit() {
    setSaving(true);
    try {
      const body = {};
      if (form.password.trim()) body.password = form.password;
      const res  = await fetch(`${API}/auth/users/${selected.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      await fetchUsers(); closeModal();
    } catch (err) { setError(err.message); }
    setSaving(false);
  }

  async function handleDelete() {
    setSaving(true);
    try {
      const url = selected.type === 'candidate'
        ? `${API}/applications/${selected.id}`
        : `${API}/auth/users/${selected.id}`;
      const res  = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      await fetchUsers(); closeModal();
    } catch (err) { setError(err.message); }
    setSaving(false);
  }

  function formatDate(str) {
    if (!str) return '—';
    return new Date(str).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <>
      <div className="adm-filter-bar">
        <div style={{ flex: 1 }} />
        <button type="button" className="adm-btn adm-btn--primary" onClick={openAdd}>
          <Plus size={16} /> Thêm tài khoản
        </button>
      </div>

      <div className="adm-table-wrap">
        {loading ? (
          <div className="adm-loading"><div className="adm-spinner" /> Đang tải...</div>
        ) : (
          <>
            <table className="adm-table">
              <thead>
                <tr><th>#</th><th>Tài khoản</th><th>Email</th><th>Vai trò</th><th>Ngày tạo</th><th>Thao tác</th></tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={6} className="adm-table__empty">Chưa có tài khoản nào</td></tr>
                ) : pagedUsers.map((u, i) => (
                  <tr key={`${u.type}-${u.id}`}>
                    <td style={{ color: '#aaa', fontSize: 13 }}>{(page - 1) * USER_PAGE_SIZE + i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: '50%',
                          background: u.role === 'superadmin' ? '#2980b9' : u.role === 'candidate' ? '#16a34a' : '#c0392b',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontWeight: 700, fontSize: 15,
                        }}>
                          {u.username[0].toUpperCase()}
                        </div>
                        <div style={{ fontWeight: 600 }}>{u.username}</div>
                      </div>
                    </td>
                    <td style={{ fontSize: 13, color: '#555' }}>{u.email || '—'}</td>
                    <td>
                      <span className={`adm-badge ${
                        u.role === 'superadmin' ? 'adm-badge--passed' :
                        u.role === 'candidate'  ? 'adm-badge--interviewing' :
                        'adm-badge--pending'
                      }`}>
                        {u.role === 'superadmin' ? 'Super Admin' : u.role === 'candidate' ? 'Ứng viên' : 'Admin'}
                      </span>
                    </td>
                    <td style={{ color: '#6b7280', fontSize: 13 }}>{formatDate(u.created_at)}</td>
                    <td>
                      <div className="adm-table__actions">
                        {u.type === 'admin' && (
                          <button type="button" className="adm-icon-btn adm-icon-btn--blue" onClick={() => openEdit(u)}>
                            <Pencil size={15} />
                          </button>
                        )}
                        <button type="button" className="adm-icon-btn adm-icon-btn--red" onClick={() => openDelete(u)}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={page} totalPages={totalPages} total={users.length}
              pageSize={USER_PAGE_SIZE} label="tài khoản" onChange={setPage}
            />
          </>
        )}
      </div>

      {/* Modal Thêm */}
      {modal === 'add' && (
        <div style={backdropStyle} onClick={closeModal}>
          <div style={{ ...modalBase, width: 'min(460px, 96vw)' }} onClick={e => e.stopPropagation()}>
            <div style={modalHeader}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Thêm tài khoản</h2>
              <button type="button" style={closeBtn} onClick={closeModal}><X size={18} /></button>
            </div>
            <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="adm-field"><label>Tên tài khoản <span>*</span></label>
                <input type="text" placeholder="Nhập username..." value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  onKeyDown={e => e.stopPropagation()} />
              </div>
              <div className="adm-field"><label>Mật khẩu <span>*</span></label>
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} placeholder="Nhập mật khẩu..."
                    value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    onKeyDown={e => e.stopPropagation()} style={{ paddingRight: 40 }} />
                  <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa' }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="adm-field"><label>Vai trò</label>
                <div className="adm-select-wrap">
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
              </div>
              {error && <div style={{ color: '#c0392b', fontSize: 13 }}>{error}</div>}
            </div>
            <div style={modalFooter}>
              <button type="button" className="adm-btn adm-btn--ghost" onClick={closeModal}>Hủy</button>
              <button type="button" className="adm-btn adm-btn--primary" onClick={handleAdd} disabled={saving}>
                {saving ? 'Đang lưu...' : 'Tạo tài khoản'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Đổi mật khẩu */}
      {modal === 'edit' && (
        <div style={backdropStyle} onClick={closeModal}>
          <div style={{ ...modalBase, width: 'min(460px, 96vw)' }} onClick={e => e.stopPropagation()}>
            <div style={modalHeader}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Đổi mật khẩu</h2>
              <button type="button" style={closeBtn} onClick={closeModal}><X size={18} /></button>
            </div>
            <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#f3f4f6', borderRadius: 10, padding: '12px 16px', fontSize: 14, color: '#374151', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={16} style={{ color: '#c0392b' }} /> Tài khoản: <strong>{selected?.username}</strong>
              </div>
              <div className="adm-field"><label>Mật khẩu mới <span>*</span></label>
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} placeholder="Nhập mật khẩu mới..."
                    value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    onKeyDown={e => e.stopPropagation()} style={{ paddingRight: 40 }} />
                  <button type="button" onClick={() => setShowPass(s => !s)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa' }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {error && <div style={{ color: '#c0392b', fontSize: 13 }}>{error}</div>}
            </div>
            <div style={modalFooter}>
              <button type="button" className="adm-btn adm-btn--ghost" onClick={closeModal}>Hủy</button>
              <button type="button" className="adm-btn adm-btn--primary" onClick={handleEdit} disabled={saving}>
                {saving ? 'Đang lưu...' : 'Cập nhật'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xóa */}
      {modal === 'delete' && selected && (
        <div style={backdropStyle} onClick={closeModal}>
          <div style={{ ...modalBase, width: 'min(440px, 96vw)' }} onClick={e => e.stopPropagation()}>
            <div style={modalHeader}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Xóa tài khoản</h2>
              <button type="button" style={closeBtn} onClick={closeModal}><X size={18} /></button>
            </div>
            <div style={{ padding: '20px 28px' }}>
              <p style={{ fontSize: 15, color: '#374151', margin: 0, lineHeight: 1.6 }}>
                Bạn có chắc muốn xóa tài khoản <strong style={{ color: '#c0392b' }}>"{selected.username}"</strong>?<br />
                <span style={{ fontSize: 13, color: '#9ca3af' }}>Hành động này không thể hoàn tác.</span>
              </p>
              {error && <div style={{ marginTop: 12, color: '#c0392b', fontSize: 13 }}>{error}</div>}
            </div>
            <div style={modalFooter}>
              <button type="button" className="adm-btn adm-btn--ghost" onClick={closeModal}>Hủy</button>
              <button type="button" className="adm-btn adm-btn--primary" onClick={handleDelete} disabled={saving}>
                {saving ? 'Đang xóa...' : 'Xóa tài khoản'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ──────────────────────────────────────────────────────────────
//  MAIN DASHBOARD
// ──────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate();
  const token    = localStorage.getItem('admin_token');
  const role     = localStorage.getItem('admin_role');
  const [tab, setTab] = useState(role === 'superadmin' ? 'users' : 'branches');

  useEffect(() => { if (!token) navigate('/admin'); }, []);

  return (
    <div className="adm">
      <aside className="adm-sidebar">
        <div className="adm-sidebar__logo">
          <img src={logo} alt="Viet Huong Ceramics" className="adm-sidebar__logo-img" />
        </div>
        <nav className="adm-sidebar__nav">
          {role === 'superadmin' && (
            <button className={`adm-nav-item ${tab === 'users' ? 'adm-nav-item--active' : ''}`} onClick={() => setTab('users')}>
              <ShieldCheck size={18} /><span>Tài khoản admin</span>
            </button>
          )}
          <button className={`adm-nav-item ${tab === 'branches' ? 'adm-nav-item--active' : ''}`} onClick={() => setTab('branches')}>
            <MapPin size={18} /><span>Chi nhánh</span>
          </button>
          {role === 'superadmin' && (
            <>
              <button className={`adm-nav-item ${tab === 'images' ? 'adm-nav-item--active' : ''}`} onClick={() => setTab('images')}>
                <Image size={18} /><span>Trang chủ</span>
              </button>
              <button className={`adm-nav-item ${tab === 'about' ? 'adm-nav-item--active' : ''}`} onClick={() => setTab('about')}>
                <Info size={18} /><span>Giới thiệu</span>
              </button>
              <button className={`adm-nav-item ${tab === 'tests' ? 'adm-nav-item--active' : ''}`} onClick={() => setTab('tests')}>
                <FileText size={18} /><span>Bài test</span>
              </button>
            </>
          )}
        </nav>
        <button className="adm-sidebar__logout" onClick={() => { localStorage.removeItem('admin_token'); localStorage.removeItem('admin_role'); navigate('/admin'); }}>
          <LogOut size={16} /><span>Đăng xuất</span>
        </button>
      </aside>
      <main className="adm-main">
        <header className="adm-topbar">
          <div className="adm-topbar__title">
            {tab === 'users'    && 'Quản lý tài khoản admin'}
            {tab === 'branches' && 'Quản lý chi nhánh'}
            {tab === 'about'    && 'Quản lý nội dung giới thiệu'}
            {tab === 'images'   && 'Quản lý hình ảnh'}
            {tab === 'tests'    && 'Quản lý bài test'}
          </div>
        </header>
        <div className="adm-content">
          {tab === 'users'    && <UsersTab token={token} />}
          {tab === 'branches' && <BranchesTab token={token} />}
          {tab === 'about'    && <AboutTab token={token} />}
          {tab === 'images'   && <ImagesManager />}
          {tab === 'tests'    && <TestsManager />}
        </div>
      </main>
    </div>
  );
}