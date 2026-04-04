import { useState, useEffect, useRef } from 'react';
import './CareerApplyPage.scss';

import viethuong1 from '../assets/viethuong1.jpg';
import viethuong2 from '../assets/viethuong2.jpg';
import viethuong3 from '../assets/viethuong3.jpg';
import viethuong4 from '../assets/viethuong4.jpg';
import viethuong5 from '../assets/viethuong5.jpg';
import viethuong6 from '../assets/viethuong6.jpg';
import viethuong7 from '../assets/viethuong7.jpg';
import viethuong8 from '../assets/viethuong8.jpg';
import logo from '../assets/logo.jpg';

const POSITIONS = [
  'Nhân viên kinh doanh',
  'Nhân viên thiết kế',
  'Nhân viên sản xuất / thợ gốm',
  'Nhân viên kho - vận chuyển',
  'Kế toán',
  'Nhân viên marketing',
  'Thực tập sinh',
  'Vị trí khác',
];

const EXPERIENCES = [
  { value: 'Chưa có', label: 'Chưa có kinh nghiệm' },
  { value: '1-2 năm', label: '1–2 năm' },
  { value: '3+ năm', label: '3+ năm' },
];

// ── Facebook-style top progress bar ──────────────────────────
function TopLoader({ active }) {
  return (
    <div className={`top-loader ${active ? 'active' : ''}`}>
      <div className="top-loader-bar" />
    </div>
  );
}

// ── Floating label input ──────────────────────────────────────
function FloatInput({ label, name, value, onChange, type = 'text', required }) {
  return (
    <div className={`float-group ${value ? 'has-value' : ''}`}>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder=" "
        autoComplete="off"
      />
      <label>{label}{required && <span className="req">*</span>}</label>
      <div className="float-line" />
    </div>
  );
}

// ── Custom Dropdown ───────────────────────────────────────────
function CustomSelect({ label, name, value, onChange, options, required, placeholder = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selectedLabel = options.find(o =>
    (typeof o === 'string' ? o : o.value) === value
  );
  const displayLabel = selectedLabel
    ? (typeof selectedLabel === 'string' ? selectedLabel : selectedLabel.label)
    : '';

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (val) => {
    onChange({ target: { name, value: val } });
    setOpen(false);
  };

  return (
    <div className={`float-group custom-select-wrap ${value ? 'has-value' : ''} ${open ? 'is-open' : ''}`} ref={ref}>
      <div className="custom-select-trigger" onClick={() => setOpen(o => !o)} tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setOpen(o => !o); }}>
        <span className="custom-select-value">{displayLabel}</span>
        <svg className={`select-chevron ${open ? 'up' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      <label className="custom-select-label">
        {label}{required && <span className="req">*</span>}
      </label>
      <div className="float-line" />

      {open && (
        <div className="custom-dropdown">
          {options.map((opt) => {
            const val = typeof opt === 'string' ? opt : opt.value;
            const lbl = typeof opt === 'string' ? opt : opt.label;
            const isSelected = val === value;
            return (
              <div
                key={val}
                className={`custom-option ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelect(val)}
              >
                {isSelected && (
                  <svg className="option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                <span>{lbl}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FloatTextarea({ label, name, value, onChange }) {
  return (
    <div className={`float-group float-textarea ${value ? 'has-value' : ''}`}>
      <textarea name={name} value={value} onChange={onChange} placeholder=" " rows={3} />
      <label>{label}</label>
      <div className="float-line" />
    </div>
  );
}

export default function CareerApplyPage() {
  const [form, setForm] = useState({
    fullName: '', email: '', phone: '',
    position: '', positionOther: '',
    experience: '', address: '', coverLetter: '',
  });
  const [cvFile, setCvFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const back = document.querySelector('.layer-back');
      const front = document.querySelector('.layer-front');
      if (back && front) {
        back.style.transform = `translateY(${scrollY * -0.03}px)`;
        front.style.transform = `translateY(${scrollY * 0.05}px)`;
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) setErrors(er => ({ ...er, [e.target.name]: '' }));
  };

  const handleFile = (file) => {
    if (!file) return;
    const allowed = ['application/pdf','application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg','image/png'];
    if (!allowed.includes(file.type)) {
      setErrors(e => ({ ...e, cv: 'Chỉ chấp nhận PDF, Word hoặc ảnh JPG/PNG.' }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors(e => ({ ...e, cv: 'File không vượt quá 5MB.' }));
      return;
    }
    setErrors(e => ({ ...e, cv: '' }));
    setCvFile(file);
  };

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = 'Vui lòng nhập họ và tên.';
    if (!form.email.trim()) e.email = 'Vui lòng nhập email.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email không hợp lệ.';
    if (!form.phone.trim()) e.phone = 'Vui lòng nhập số điện thoại.';
    else if (!/^[0-9+\-\s]{8,15}$/.test(form.phone)) e.phone = 'Số điện thoại không hợp lệ.';
    if (!form.position) e.position = 'Vui lòng chọn vị trí.';
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setErrors({});

    const formData = new FormData();
    Object.entries(form).forEach(([k, v]) => formData.append(k, v));
    if (cvFile) formData.append('cv', cvFile);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/careers/apply`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
      } else {
        setErrors(data.errors || { _global: data.message || 'Gửi đơn thất bại.' });
      }
    } catch {
      setErrors({ _global: 'Không thể kết nối server.' });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="login-page">
        <TopLoader active={false} />
        <BgLayers />
        <div className="login-card success-card">
          <div className="success-glow" />
          <div className="success-icon-wrap">
            <svg viewBox="0 0 52 52" className="checkmark">
              <circle className="checkmark-circle" cx="26" cy="26" r="25" fill="none" />
              <path className="checkmark-check" fill="none" d="M14 27l9 9 15-18" />
            </svg>
          </div>
          <h2>Hồ sơ đã gửi thành công!</h2>
          <p>Cảm ơn <strong>{form.fullName}</strong> đã ứng tuyển tại<br /><strong>Viet Huong Ceramics</strong></p>
          <p className="sub">Email xác nhận đã gửi đến<br /><strong>{form.email}</strong></p>
          <p className="note">Chúng tôi sẽ liên hệ trong <strong>3–5 ngày làm việc</strong></p>
          <button className="btn-back" onClick={() => {
            setSuccess(false);
            setForm({ fullName:'',email:'',phone:'',position:'',positionOther:'',experience:'',address:'',coverLetter:'' });
            setCvFile(null);
          }}>
            ← Gửi hồ sơ khác
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <TopLoader active={loading} />
      <BgLayers />

      <div className="login-card apply-card">
        <div className="login-header">
          <img src={logo} alt="logo" className="logo" />
          <h1>Ứng tuyển tại Viet Huong Ceramics</h1>
          <p>Điền thông tin để gửi hồ sơ của bạn</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form" noValidate>

          <div className="form-row">
            <div className="form-col">
              <FloatInput label="Họ và tên" name="fullName" value={form.fullName} onChange={handleChange} required />
              {errors.fullName && <span className="field-error">{errors.fullName}</span>}
            </div>
            <div className="form-col">
              <FloatInput label="Email" name="email" type="email" value={form.email} onChange={handleChange} required />
              {errors.email && <span className="field-error">{errors.email}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-col">
              <FloatInput label="Số điện thoại" name="phone" value={form.phone} onChange={handleChange} required />
              {errors.phone && <span className="field-error">{errors.phone}</span>}
            </div>
            <div className="form-col">
              <FloatInput label="Địa chỉ" name="address" value={form.address} onChange={handleChange} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-col">
              <CustomSelect
                label="Vị trí ứng tuyển"
                name="position"
                value={form.position}
                onChange={handleChange}
                options={POSITIONS}
                required
              />
              {errors.position && <span className="field-error">{errors.position}</span>}
            </div>
            <div className="form-col">
              <CustomSelect
                label="Kinh nghiệm"
                name="experience"
                value={form.experience}
                onChange={handleChange}
                options={EXPERIENCES}
              />
            </div>
          </div>

          {form.position === 'Vị trí khác' && (
            <FloatInput label="Vị trí mong muốn" name="positionOther" value={form.positionOther} onChange={handleChange} />
          )}

          <FloatTextarea label="Thư giới thiệu bản thân" name="coverLetter" value={form.coverLetter} onChange={handleChange} />

          <div className="upload-section">
            <div className="upload-label-text">CV / Hồ sơ <span className="optional">(tuỳ chọn)</span></div>
            <div
              className={`upload-box ${dragOver ? 'drag' : ''} ${cvFile ? 'has-file' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            >
              <input type="file" onChange={(e) => handleFile(e.target.files[0])} hidden id="cvUpload" />
              <label htmlFor="cvUpload" className="upload-inner">
                {cvFile ? (
                  <div className="file-info">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    <div>
                      <strong>{cvFile.name}</strong>
                      <em>{(cvFile.size / 1024).toFixed(0)} KB</em>
                    </div>
                    <button type="button" className="remove-file" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCvFile(null); }}>✕</button>
                  </div>
                ) : (
                  <div className="upload-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span>Kéo & thả hoặc <u>chọn file</u></span>
                    <em>PDF, Word, JPG/PNG · tối đa 5MB</em>
                  </div>
                )}
              </label>
            </div>
            {errors.cv && <span className="field-error">{errors.cv}</span>}
          </div>

          {errors._global && <div className="global-error">{errors._global}</div>}

          <button type="submit" className={`submit-btn ${loading ? 'loading' : ''}`} disabled={loading}>
            <span className="btn-text">{loading ? 'Đang gửi hồ sơ...' : 'Gửi đơn ứng tuyển'}</span>
            {loading && <span className="btn-spinner" />}
          </button>

        </form>
      </div>
    </div>
  );
}

function BgLayers() {
  return (
    <div className="login-bg">
      <div className="bg-layer layer-back">
        <div className="img-wrap tall"><img src={viethuong1} /></div>
        <div className="img-wrap normal"><img src={viethuong2} /></div>
        <div className="img-wrap normal"><img src={viethuong3} /></div>
        <div className="img-wrap tall"><img src={viethuong4} /></div>
      </div>
      <div className="bg-layer layer-front">
        <div className="img-wrap normal"><img src={viethuong5} /></div>
        <div className="img-wrap tall"><img src={viethuong6} /></div>
        <div className="img-wrap tall"><img src={viethuong7} /></div>
        <div className="img-wrap normal"><img src={viethuong8} /></div>
      </div>
    </div>
  );
}