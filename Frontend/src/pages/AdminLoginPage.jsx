import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import logo from '../assets/logo.jpg';
import './AdminLoginPage.scss';

export default function AdminLoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      localStorage.setItem('admin_token', data.token);
      navigate('/admin/dashboard');

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
          <p>Đăng nhập để quản lý hệ thống</p>
        </div>

        {/* FORM */}
        <form className="login-form" onSubmit={handleLogin}>

          {/* Username */}
          <div className="input-modern">
            <User size={18} className="icon" />
            <input
              type="text"
              placeholder="Tài khoản"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          {/* Password */}
          <div className="input-modern">
            <Lock size={18} className="icon" />

            <input
              type={showPass ? 'text' : 'password'}
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <span
              className="toggle-pass"
              onClick={() => setShowPass(!showPass)}
            >
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </span>
          </div>

          {/* Error */}
          {error && <div className="global-error">{error}</div>}

          {/* Button */}
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
