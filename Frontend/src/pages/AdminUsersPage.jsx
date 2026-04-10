import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, X, Eye, EyeOff, LogOut, ShieldCheck } from 'lucide-react';
import logo from '../assets/logo.jpg';
import './AdminDashboard.scss';

const API = import.meta.env.VITE_API_URL;

export default function AdminUsersPage() {
  const navigate  = useNavigate();
  const token     = localStorage.getItem('admin_token');
  const role      = localStorage.getItem('admin_role');

  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm]         = useState({ username: '', password: '', role: 'admin' });
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (!token || role !== 'superadmin') {
      navigate('/admin');
    } else {
      fetchUsers();
    }
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setUsers(data);
    } catch { setUsers([]); }
    setLoading(false);
  }

  function openAdd() {
    setForm({ username: '', password: '', role: 'admin' });
    setError(''); setShowPass(false); setModal('add');
  }

  function openEdit(user) {
    setSelected(user);
    setForm({ username: user.username, password: '', role: user.role });
    setError(''); setShowPass(false); setModal('edit');
  }

  function openDelete(user) {
    setSelected(user); setModal('delete');
  }

  function closeModal() {
    setModal(null); setSelected(null); setError('');
  }

  async function handleAdd() {
    if (!form.username.trim()) return setError('Vui lòng nhập tên tài khoản.');
    if (!form.password.trim()) return setError('Vui lòng nhập mật khẩu.');
    setSaving(true);
    try {
      const res = await fetch(`${API}/auth/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      await fetchUsers(); closeModal();
    } catch (err) { setError(err.message); }
    setSaving(false);
  }

  async function handleEdit() {
    if (!form.password.trim()) return setError('Vui lòng nhập mật khẩu mới.');
    setSaving(true);
    try {
      const res = await fetch(`${API}/auth/users/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      await fetchUsers(); closeModal();
    } catch (err) { setError(err.message); }
    setSaving(false);
  }

  async function handleDelete() {
    setSaving(true);
    try {
      const res = await fetch(`${API}/auth/users/${selected.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      await fetchUsers(); closeModal();
    } catch (err) { setError(err.message); }
    setSaving(false);
  }

  function formatDate(str) {
    if (!str) return '—';
    return new Date(str).toLocaleDateString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <div className="adm">
      {/* Sidebar */}
      <aside className="adm-sidebar">
        <div className="adm-sidebar__logo">
          <img src={logo} alt="Viet Huong Ceramics" className="adm-sidebar__logo-img" />
        </div>
        <nav className="adm-sidebar__nav">
          <button className="adm-nav-item adm-nav-item--active">
            <ShieldCheck size={18} /><span>Tài khoản admin</span>
          </button>
        </nav>
        <button
          className="adm-sidebar__logout"
          onClick={() => {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_role');
            navigate('/admin');
          }}
        >
          <LogOut size={16} /><span>Đăng xuất</span>
        </button>
      </aside>

      {/* Main */}
      <main className="adm-main">
        <header className="adm-topbar">
          <div className="adm-topbar__title">Quản lý tài khoản admin</div>
        </header>

        <div className="adm-content">
          {/* Toolbar */}
          <div className="adm-filter-bar">
            <div style={{ flex: 1 }} />
            <button className="adm-btn adm-btn--primary" onClick={openAdd}>
              <Plus size={16} /> Thêm tài khoản
            </button>
          </div>

          {/* Table */}
          <div className="adm-table-wrap">
            {loading ? (
              <div className="adm-loading"><div className="adm-spinner" /> Đang tải...</div>
            ) : (
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Tài khoản</th>
                    <th>Vai trò</th>
                    <th>Ngày tạo</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={5} className="adm-table__empty">Chưa có tài khoản nào</td></tr>
                  ) : users.map((u, i) => (
                    <tr key={u.id}>
                      <td style={{ color: '#aaa', fontSize: 13 }}>{i + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: '50%',
                            background: u.role === 'superadmin' ? '#2980b9' : '#c0392b',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: 700, fontSize: 15, flexShrink: 0,
                          }}>
                            {u.username[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>{u.username}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`adm-badge ${u.role === 'superadmin' ? 'adm-badge--passed' : 'adm-badge--pending'}`}>
                          {u.role === 'superadmin' ? 'Super Admin' : 'Admin'}
                        </span>
                      </td>
                      <td style={{ color: '#6b7280', fontSize: 13 }}>{formatDate(u.created_at)}</td>
                      <td>
                        <div className="adm-table__actions">
                          <button className="adm-icon-btn adm-icon-btn--blue" title="Đổi mật khẩu" onClick={() => openEdit(u)}>
                            <Pencil size={15} />
                          </button>
                          <button className="adm-icon-btn adm-icon-btn--red" title="Xóa" onClick={() => openDelete(u)}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Modal Thêm */}
      {modal === 'add' && (
        <div className="adm-modal-backdrop">
          <div className="adm-modal">
            <div className="adm-modal__header">
              <h2>Thêm tài khoản</h2>
              <button className="adm-icon-btn" onClick={closeModal}><X size={18} /></button>
            </div>
            <div className="adm-modal__body">
              <div className="adm-field">
                <label>Tên tài khoản <span>*</span></label>
                <input type="text" placeholder="Nhập username..."
                  value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
              </div>
              <div className="adm-field">
                <label>Mật khẩu <span>*</span></label>
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} placeholder="Nhập mật khẩu..."
                    value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    style={{ paddingRight: 40 }} />
                  <button type="button" onClick={() => setShowPass(s => !s)} style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#aaa',
                  }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="adm-field">
                <label>Vai trò</label>
                <div className="adm-select-wrap">
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
              </div>
              {error && <div style={{ color: '#c0392b', fontSize: 13 }}>{error}</div>}
            </div>
            <div className="adm-modal__footer">
              <button className="adm-btn adm-btn--ghost" onClick={closeModal}>Hủy</button>
              <button className="adm-btn adm-btn--primary" onClick={handleAdd} disabled={saving}>
                {saving ? 'Đang lưu...' : 'Tạo tài khoản'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Đổi mật khẩu */}
      {modal === 'edit' && (
        <div className="adm-modal-backdrop">
          <div className="adm-modal">
            <div className="adm-modal__header">
              <h2>Đổi mật khẩu</h2>
              <button className="adm-icon-btn" onClick={closeModal}><X size={18} /></button>
            </div>
            <div className="adm-modal__body">
              <div style={{
                background: '#f3f4f6', borderRadius: 10, padding: '12px 16px',
                marginBottom: 16, fontSize: 14, color: '#374151',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <ShieldCheck size={16} style={{ color: '#c0392b' }} />
                Tài khoản: <strong>{selected?.username}</strong>
              </div>
              <div className="adm-field">
                <label>Mật khẩu mới <span>*</span></label>
                <div style={{ position: 'relative' }}>
                  <input type={showPass ? 'text' : 'password'} placeholder="Nhập mật khẩu mới..."
                    value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    style={{ paddingRight: 40 }} />
                  <button type="button" onClick={() => setShowPass(s => !s)} style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#aaa',
                  }}>
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              {error && <div style={{ color: '#c0392b', fontSize: 13 }}>{error}</div>}
            </div>
            <div className="adm-modal__footer">
              <button className="adm-btn adm-btn--ghost" onClick={closeModal}>Hủy</button>
              <button className="adm-btn adm-btn--primary" onClick={handleEdit} disabled={saving}>
                {saving ? 'Đang lưu...' : 'Cập nhật'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xóa */}
      {modal === 'delete' && (
        <div className="adm-modal-backdrop">
          <div className="adm-modal">
            <div className="adm-modal__header">
              <h2>Xóa tài khoản</h2>
              <button className="adm-icon-btn" onClick={closeModal}><X size={18} /></button>
            </div>
            <div className="adm-modal__body">
              <p style={{ fontSize: 15, color: '#374151', margin: 0 }}>
                Bạn có chắc muốn xóa tài khoản <strong>"{selected?.username}"</strong>?
                Hành động này không thể hoàn tác.
              </p>
              {error && <div style={{ color: '#c0392b', fontSize: 13, marginTop: 12 }}>{error}</div>}
            </div>
            <div className="adm-modal__footer">
              <button className="adm-btn adm-btn--ghost" onClick={closeModal}>Hủy</button>
              <button className="adm-btn adm-btn--primary" onClick={handleDelete} disabled={saving}>
                {saving ? 'Đang xóa...' : 'Xóa tài khoản'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}