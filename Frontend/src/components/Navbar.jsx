import { Link, useLocation } from 'react-router-dom';
import { User, Briefcase, Menu } from 'lucide-react';
import { useState } from 'react';
import logo from '../assets/logo.jpg';
import './Navbar.scss';

export default function Navbar() {
  const location = useLocation();
  if (location.pathname.startsWith('/admin')) {
    return null;
  }
  const [open, setOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { path: '/', label: '' },
    { path: '/gioi-thieu', label: 'Giới thiệu' },
    { path: '/tuyen-dung', label: 'Tuyển dụng' },
    { path: '/tin-tuc', label: 'Tin tức' },
    { path: '/lien-he', label: 'Liên hệ' },
  ];

  return (
    <nav className="navbar">
      <div className="nav-container">

        {/* LOGO */}
        <Link to="/" className="logo">
          <img src={logo} alt="logo" />
        </Link>

        {/* MENU */}
        <div className={`nav-links ${open ? 'open' : ''}`}>
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={isActive(item.path) ? 'active' : ''}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* RIGHT */}
        <div className="nav-actions">

          <Link to="/admin" className="btn-outline">
            <User size={16} /> Đăng nhập
          </Link>

          <Link to="/tuyen-dung/1/ung-tuyen" className="btn-primary">
            <Briefcase size={16} /> Ứng tuyển
          </Link>

          <button className="menu-btn" onClick={() => setOpen(!open)}>
            <Menu size={20} />
          </button>
        </div>
      </div>
    </nav>
  );
}