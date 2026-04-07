import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, LayoutList, Users } from 'lucide-react';
import './AdminDashboard.scss';
import logo from '../assets/logo.jpg';
import JobsManager from './JobsManager';
import ApplicationsManager from './ApplicationsManager';

export default function AdminDashboard() {
  const [tab, setTab] = useState('jobs');
  const navigate = useNavigate();
  const token = localStorage.getItem('admin_token');

  useEffect(() => {
    if (!token) {
      navigate('/admin');
    }
  }, [token, navigate]);

  // Các hàm fetch dùng chung có thể truyền xuống nếu cần,
  // nhưng JobsManager và ApplicationsManager sẽ tự gọi API riêng
  // để tránh truyền quá nhiều props.

  return (
    <div className="adm">
      <aside className="adm-sidebar">
        <div className="adm-sidebar__logo">
          <img src={logo} alt="Viet Huong Ceramics" className="adm-sidebar__logo-img" />
        </div>
        <nav className="adm-sidebar__nav">
          <button
            className={`adm-nav-item ${tab === 'jobs' ? 'adm-nav-item--active' : ''}`}
            onClick={() => setTab('jobs')}
          >
            <LayoutList size={18} /><span>Tin tuyển dụng</span>
          </button>
          <button
            className={`adm-nav-item ${tab === 'applications' ? 'adm-nav-item--active' : ''}`}
            onClick={() => setTab('applications')}
          >
            <Users size={18} /><span>Ứng viên</span>
          </button>
        </nav>
        <button
          className="adm-sidebar__logout"
          onClick={() => { localStorage.removeItem('admin_token'); navigate('/admin'); }}
        >
          <LogOut size={16} /><span>Đăng xuất</span>
        </button>
      </aside>

      <main className="adm-main">
        <header className="adm-topbar">
          <div className="adm-topbar__title">
            {tab === 'jobs' ? 'Tin tuyển dụng' : 'Quản lý ứng viên'}
          </div>
        </header>
        <div className="adm-content">
          {tab === 'jobs' && <JobsManager token={token} />}
          {tab === 'applications' && <ApplicationsManager token={token} />}
        </div>
      </main>
    </div>
  );
}