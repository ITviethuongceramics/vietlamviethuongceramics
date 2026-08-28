import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import logo from '../assets/logo.jpg';
import './AdminLoginPage.scss';

/** Kiểm tra chuỗi có dạng email không */
function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function AdminLoginPage() {
  const [identifier, setIdentifier] = useState(''); // username hoặc email
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);

  const navigate = useNavigate();

  // Tự detect loại tài khoản dựa theo input
  const detectedType = isEmail(identifier) ? 'candidate' : 'admin';

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (detectedType === 'admin') {
        // ── HR / Admin ────────────────────────────────────
        const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: identifier.trim(), password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        localStorage.setItem('admin_token', data.token);
        localStorage.setItem('admin_role', data.role);

        navigate(data.role === 'superadmin' ? '/admin/users' : '/admin/dashboard');

      } else {
        // ── Ứng viên ──────────────────────────────────────
        const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/candidate/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: identifier.trim().toLowerCase(), password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        localStorage.setItem('candidate_token', data.token);
        localStorage.setItem('candidate_name', data.full_name);
        localStorage.setItem('candidate_email', data.email);

        navigate('/candidate/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại');
    }

    setLoading(false);
  }

  return (
    <div className="login-page">
      <div className="login-bg"></div>

      <div className="login-card modern">

        {/* Back */}
        <button className="back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={18} /> Trang chủ
        </button>

        {/* Header */}
        <div className="login-header">
          <img src={logo} alt="logo" style={{ width: 150 }} />
          <h1>Quản lý tuyển dụng</h1>
          <p>Đăng nhập để tiếp tục</p>
        </div>

        {/* FORM */}
        <form className="login-form" onSubmit={handleLogin}>

          {/* Identifier */}
          <div className="input-modern">
            <User size={18} className="icon" />
            <input
              type="text"
              placeholder="Tài khoản hoặc Email"
              value={identifier}
              onChange={(e) => { setIdentifier(e.target.value); setError(''); }}
              required
              autoComplete="username"
            />
          </div>

          {/* Badge tự detect — chỉ hiện khi đã gõ */}
         

          {/* Password */}
          <div className="input-modern">
            <Lock size={18} className="icon" />
            <input
              type={showPass ? 'text' : 'password'}
              placeholder={
                detectedType === 'candidate' && identifier.length > 0
                  ? 'Mật khẩu (mặc định: email của bạn)'
                  : 'Mật khẩu'
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <span className="toggle-pass" onClick={() => setShowPass(!showPass)}>
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </span>
          </div>

          {/* Error */}
          {error && <div className="global-error">{error}</div>}

          {/* Submit */}
          <button
            className={`submit-btn ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading && <span className="btn-spinner"></span>}
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>

        </form>
      </div>
    </div>
  );
}