import { useState, useEffect } from 'react';
import './ImagesManager.scss';

const API = import.meta.env.VITE_API_URL;

const SLOTS = [
  { key: 'banner1', label: 'Banner 1', group: 'banner' },
  { key: 'banner2', label: 'Banner 2', group: 'banner' },
  { key: 'banner3', label: 'Banner 3', group: 'banner' },
  { key: 'banner4', label: 'Banner 4', group: 'banner' },
  { key: 'feature1', label: 'Feature – Môi trường làm việc', group: 'feature' },
  { key: 'feature2', label: 'Feature – Cơ hội phát triển', group: 'feature' },
  { key: 'feature3', label: 'Feature – Chính sách đãi ngộ', group: 'feature' },
];

const DEFAULT_CONTENT = [
  {
    title: 'Môi trường làm việc chuyên nghiệp',
    desc: 'Chúng tôi xây dựng một môi trường làm việc hiện đại, năng động và sáng tạo, nơi mỗi cá nhân đều được tôn trọng, khuyến khích phát triển và phát huy tối đa năng lực của mình.',
  },
  {
    title: 'Cơ hội phát triển bền vững',
    desc: 'Với hệ thống đào tạo bài bản cùng lộ trình thăng tiến rõ ràng, chúng tôi đồng hành cùng bạn trên hành trình phát triển sự nghiệp lâu dài.',
  },
  {
    title: 'Chính sách đãi ngộ hấp dẫn',
    desc: 'Mức thu nhập cạnh tranh cùng các chế độ thưởng minh bạch, đảm bảo ghi nhận xứng đáng cho mọi đóng góp của bạn.',
  },
];

const FEATURE_LABELS = ['Feature 1 – Đỏ', 'Feature 2 – Xanh', 'Feature 3 – Vàng'];

export default function ImagesManager() {
  const [images, setImages]     = useState({});
  const [content, setContent]   = useState(DEFAULT_CONTENT);
  const [saved, setSaved]       = useState(false);
  const [uploading, setUploading] = useState({});
  const [loading, setLoading]   = useState(true);

  const token = localStorage.getItem('admin_token');

  // ── Load ảnh từ server + text từ localStorage ──────────────
  useEffect(() => {
    fetch(`${API}/images/homepage`)
      .then(r => r.json())
      .then(data => setImages(data || {}))
      .catch(() => {})
      .finally(() => setLoading(false));

    try {
      const raw = localStorage.getItem('feature_content');
      if (raw) setContent(JSON.parse(raw));
    } catch {}
  }, []);

  // ── Upload ảnh lên server ───────────────────────────────────
  const handleUpload = async (key, e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Kiểm tra HEIC
    const name = file.name.toLowerCase();
    if (name.endsWith('.heic') || name.endsWith('.heif')) {
      alert('Định dạng HEIC/HEIF không được hỗ trợ.\nVui lòng chuyển ảnh sang JPG hoặc PNG.');
      e.target.value = '';
      return;
    }

    setUploading(prev => ({ ...prev, [key]: true }));
    try {
      const fd = new FormData();
      fd.append('image', file);

      const res = await fetch(`${API}/images/homepage/${key}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Upload thất bại');

      // Thêm timestamp để tránh cache browser
      setImages(prev => ({ ...prev, [key]: data.url + '?t=' + Date.now() }));
    } catch (err) {
      alert('Upload thất bại: ' + err.message);
    } finally {
      setUploading(prev => ({ ...prev, [key]: false }));
      e.target.value = '';
    }
  };

  // ── Xóa ảnh (về mặc định) ──────────────────────────────────
  const handleReset = async (key) => {
    try {
      await fetch(`${API}/images/homepage/${key}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setImages(prev => {
        const n = { ...prev };
        delete n[key];
        return n;
      });
    } catch {
      alert('Xóa thất bại, thử lại.');
    }
  };

  // ── Text content ────────────────────────────────────────────
  const handleContentChange = (i, field, value) => {
    setContent(prev => prev.map((item, idx) =>
      idx === i ? { ...item, [field]: value } : item
    ));
  };

  const handleSaveContent = () => {
    localStorage.setItem('feature_content', JSON.stringify(content));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleResetContent = () => {
    localStorage.removeItem('feature_content');
    setContent(DEFAULT_CONTENT);
  };

  // ── Render nhóm ảnh ────────────────────────────────────────
  const renderGroup = (groupKey, title) => (
    <div className="img-group">
      <h3 className="img-group__title">{title}</h3>
      <div className="img-grid">
        {SLOTS.filter(s => s.group === groupKey).map(({ key, label }) => (
          <div className="img-card" key={key}>
            <div className="img-card__preview">
              {images[key]
                ? <img src={images[key]} alt={label} />
                : <div className="img-card__placeholder">Đang dùng ảnh mặc định</div>}
            </div>
            <div className="img-card__info">
              <span className="img-card__label">{label}</span>
              <span className={`badge ${images[key] ? 'badge--custom' : 'badge--default'}`}>
                {images[key] ? 'Tùy chỉnh' : 'Mặc định'}
              </span>
            </div>
            <div className="img-card__actions">
              <label className="btn-upload" style={{ opacity: uploading[key] ? 0.6 : 1, cursor: uploading[key] ? 'not-allowed' : 'pointer' }}>
                {uploading[key] ? 'Đang upload...' : images[key] ? 'Thay ảnh' : 'Chọn ảnh'}
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => handleUpload(key, e)}
                  hidden
                  disabled={!!uploading[key]}
                />
              </label>
              {images[key] && !uploading[key] && (
                <button className="btn-reset" onClick={() => handleReset(key)}>
                  Dùng mặc định
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) return <div style={{ padding: 32, color: '#6b7280' }}>Đang tải...</div>;

  return (
    <div className="images-manager">
      {renderGroup('banner', ' Ảnh Banner (Slideshow)')}
      {renderGroup('feature', ' Ảnh Feature')}

      {/* ── Nội dung text Feature ── */}
      <div className="img-group">
        <h3 className="img-group__title"> Nội dung Feature Cards</h3>
        <div className="text-cards">
          {content.map((item, i) => (
            <div className="text-card" key={i}>
              <div className="text-card__label">{FEATURE_LABELS[i]}</div>
              <div className="text-card__field">
                <label>Tiêu đề</label>
                <input
                  value={item.title}
                  onChange={e => handleContentChange(i, 'title', e.target.value)}
                  placeholder="Tiêu đề..."
                />
              </div>
              <div className="text-card__field">
                <label>Mô tả</label>
                <textarea
                  rows={4}
                  value={item.desc}
                  onChange={e => handleContentChange(i, 'desc', e.target.value)}
                  placeholder="Nội dung mô tả..."
                />
              </div>
            </div>
          ))}
        </div>
        <div className="text-actions">
          <button className="btn-reset" onClick={handleResetContent}>Đặt lại mặc định</button>
          <button className={`btn-save ${saved ? 'btn-save--saved' : ''}`} onClick={handleSaveContent}>
            {saved ? ' Đã lưu!' : 'Lưu nội dung'}
          </button>
        </div>
      </div>

      <p className="img-note">* Ảnh lưu trên server, không bị mất khi xóa cache trình duyệt.</p>
    </div>
  );
}