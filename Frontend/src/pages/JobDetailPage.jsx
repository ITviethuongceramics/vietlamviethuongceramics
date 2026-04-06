import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Briefcase, Clock, DollarSign,
  Calendar, ChevronRight, Building2, FileText,
  Star, Shield, Lightbulb
} from 'lucide-react';
import './JobDetailPage.scss';

// ❌ XÓA hook useReveal cũ đi

// ✅ Thay bằng hook này
function useReveal(dep) {
  const ref = useRef(null);
  useEffect(() => {
    if (!dep) return; // chờ data xong mới chạy

    // Dùng setTimeout để chờ DOM render xong sau khi state update
    const timer = setTimeout(() => {
      const obs = new IntersectionObserver(
        entries => entries.forEach(e => {
          if (e.isIntersecting) e.target.classList.add('is-visible');
        }),
        { threshold: 0.08 }
      );
      ref.current?.querySelectorAll('[data-reveal]').forEach(el => obs.observe(el));

      // cleanup fn lưu lại để disconnect
      ref.current._obs = obs;
    }, 50); // 50ms đủ để React flush DOM

    return () => {
      clearTimeout(timer);
      ref.current?._obs?.disconnect();
    };
  }, [dep]); // ← re-run khi dep thay đổi (tức là khi job load xong)

  return ref;
}

function daysLeft(deadline) {
  const diff = new Date(deadline) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function Section({ icon: Icon, title, content, color = '#c0392b' }) {
  if (!content) return null;
  const lines = content.split('\n').filter(l => l.trim());
  return (
    <div className="jdp-section" data-reveal>
      <div className="jdp-section__header">
        <div className="jdp-section__icon" style={{ background: `${color}14`, color }}>
          <Icon size={18} />
        </div>
        <h2 className="jdp-section__title" style={{ color }}>{title}</h2>
      </div>
      <ul className="jdp-section__list">
        {lines.map((line, i) => (
          <li key={i}>{line.replace(/^[-•*]\s*/, '')}</li>
        ))}
      </ul>
    </div>
  );
}

export default function JobDetailPage() {
  const { id } = useParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  const pageRef = useReveal(job);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/jobs/${id}`)
      .then(r => r.json())
      .then(data => { setJob(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="jdp-state">
      <div className="jdp-spinner" />
      <span>Đang tải thông tin việc làm...</span>
    </div>
  );

  if (!job) return (
    <div className="jdp-state jdp-state--empty">
      <FileText size={48} />
      <p>Không tìm thấy việc làm</p>
      <Link to="/tuyen-dung" className="jdp-back-btn">
        <ArrowLeft size={15} /> Quay lại danh sách
      </Link>
    </div>
  );

  const left = job.deadline ? daysLeft(job.deadline) : null;
  const urgent = left !== null && left <= 7;

  return (
    <div className="jdp" ref={pageRef}>

      {/* ── HERO ── */}
      <div className="jdp-hero">
        <div className="jdp-hero__overlay" />
        <div className="jdp-hero__content">
          <Link to="/tuyen-dung" className="jdp-hero__back">
            <ArrowLeft size={15} /> Quay lại danh sách
          </Link>
          <div className="jdp-hero__company">
            <Building2 size={13} />
            CÔNG TY CỔ PHẦN XÂY DỰNG GỐM SỨ VIỆT HƯƠNG
          </div>
          <h1 className="jdp-hero__title">{job.title}</h1>
          <div className="jdp-hero__tags">
            {job.location && (
              <span className="jdp-tag">
                <MapPin size={12} /> {job.location}
              </span>
            )}
            {job.type && (
              <span className="jdp-tag">
                <Briefcase size={12} /> {job.type}
              </span>
            )}
            {job.experience && (
              <span className="jdp-tag">
                <Clock size={12} /> {job.experience}
              </span>
            )}
            {job.salary && (
              <span className="jdp-tag jdp-tag--green">
                <DollarSign size={12} /> {job.salary}
              </span>
            )}
          </div>
        </div>
        <div className="jdp-hero__wave">
          <svg viewBox="0 0 1440 80" preserveAspectRatio="none">
            <path d="M0,40 C360,80 1080,0 1440,40 L1440,80 L0,80 Z" fill="#f7f4f2" />
          </svg>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="jdp-body">
        <div className="jdp-layout">

          {/* ── LEFT: MAIN CONTENT ── */}
          <div className="jdp-main">

            <Section
              icon={FileText}
              title="Mô tả công việc"
              content={job.description}
              color="#c0392b"
            />
            <Section
              icon={Star}
              title="Yêu cầu / Kỹ năng"
              content={job.requirements}
              color="#2980b9"
            />
            <Section
              icon={Shield}
              title="Quyền lợi"
              content={job.benefits}
              color="#27ae60"
            />

            <div className="jdp-apply" data-reveal>
              <Link to={`/tuyen-dung/${job.id}/ung-tuyen`} className="jdp-apply__btn">
                Ứng tuyển ngay
                <ChevronRight size={18} />
              </Link>
              {left !== null && (
                <span className={`jdp-apply__deadline ${urgent ? 'urgent' : ''}`}>
                  <Calendar size={13} />
                  Hạn nộp: {new Date(job.deadline).toLocaleDateString('vi-VN')}
                  &nbsp;·&nbsp;
                  <strong>{left} ngày còn lại</strong>
                </span>
              )}
            </div>
          </div>

          {/* ── RIGHT: SIDEBAR INFO ── */}
          <aside className="jdp-sidebar" data-reveal>

            <div className="jdp-info-card">
              <h3 className="jdp-info-card__title">Thông tin chung</h3>
              <div className="jdp-info-list">
                {[
                  { icon: Briefcase,  label: 'Loại công việc', value: job.type },
                  { icon: MapPin,     label: 'Địa điểm',       value: job.location },
                  { icon: Clock,      label: 'Kinh nghiệm',    value: job.experience },
                  { icon: DollarSign, label: 'Mức lương',      value: job.salary || 'Thương lượng' },
                  { icon: Calendar,   label: 'Hạn nộp',        value: job.deadline ? new Date(job.deadline).toLocaleDateString('vi-VN') : '—' },
                ].map(({ icon: Icon, label, value }) => value && (
                  <div className="jdp-info-row" key={label}>
                    <div className="jdp-info-row__icon"><Icon size={14} /></div>
                    <div>
                      <span className="jdp-info-row__label">{label}</span>
                      <span className="jdp-info-row__value">{value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* detail card */}
            {(job.level || job.education || job.gender || job.age || job.department) && (
              <div className="jdp-info-card jdp-info-card--detail">
                <h3 className="jdp-info-card__title">Chi tiết vị trí</h3>
                <div className="jdp-info-list">
                  {[
                    { label: 'Cấp bậc',    value: job.level },
                    { label: 'Học vấn',    value: job.education },
                    { label: 'Giới tính',  value: job.gender },
                    { label: 'Độ tuổi',    value: job.age },
                    { label: 'Ngành nghề', value: job.department },
                  ].map(({ label, value }) => value && (
                    <div className="jdp-detail-row" key={label}>
                      <span className="jdp-detail-row__label">{label}</span>
                      <span className="jdp-detail-row__value">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="jdp-company-card">
              <Building2 size={20} className="jdp-company-card__icon" />
              <h4>Viet Huong Ceramics</h4>
              <p>Công ty Cổ phần Xây dựng Gốm Sứ Việt Hương — tiên phong trong lĩnh vực vật liệu xây dựng, gốm sứ và xuất nhập khẩu.</p>
              <Link to="/gioi-thieu" className="jdp-company-card__link">
                Về công ty <ChevronRight size={13} />
              </Link>
            </div>

          </aside>
        </div>
      </div>
    </div>
  );
}