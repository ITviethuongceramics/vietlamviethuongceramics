import { useEffect, useRef, useState } from 'react';
import { Eye, TrendingUp, Handshake, ShieldCheck, Lightbulb } from 'lucide-react';
import './AboutPage.scss';

// ========== DỮ LIỆU TĨNH GỐC (GIỮ NGUYÊN) ==========
const coreValues = [
  {
    icon: <Eye size={36} strokeWidth={1.4} />,
    title: 'Minh Bạch Để Trường Tồn',
    desc: 'Xây dựng niềm tin bằng sự trung thực và minh bạch trong mọi hoạt động sản xuất – kinh doanh',
  },
  {
    icon: <TrendingUp size={36} strokeWidth={1.4} />,
    title: 'Kiên Định Để Phát Triển',
    desc: 'Luôn bám sát định hướng phát triển kinh tế – xã hội, đóng góp vào sự tiến bộ chung của ngành xây dựng Việt Nam trong kỷ nguyên mới.',
  },
  {
    icon: <Handshake size={36} strokeWidth={1.4} />,
    title: 'Cùng Đối Tác Phát Triển',
    desc: 'Gắn kết và đồng hành vươn xa với đối tác trên tinh thần hợp tác lâu dài, phát triển bền vững',
  },
  {
    icon: <ShieldCheck size={36} strokeWidth={1.4} />,
    title: 'Chất Lượng Vì Khách Hàng',
    desc: 'Lấy chất lượng sản phẩm làm trung tâm, đặt sự hài lòng của khách hàng là kim chỉ nam.',
  },
  {
    icon: <Lightbulb size={36} strokeWidth={1.4} />,
    title: 'Tiên Phong Sáng Tạo',
    desc: 'Luôn đi đầu trong ứng dụng công nghệ và xu hướng thiết kế mới, kiến tạo giá trị khác biệt trên thị trường.',
  },
];

const staticStats = [
  { value: '10+', label: 'Năm kinh nghiệm' },
  { value: '500+', label: 'Đối tác tin cậy' },
  { value: '5K+', label: 'Dự án hoàn thành' },
  { value: '10+', label: 'Quốc gia xuất khẩu' },
];

// Nội dung tĩnh cho Intro, Vision, Mission (dùng làm fallback)
const staticIntro = {
  eyebrow: 'Giới thiệu',
  heading: 'GIỚI THIỆU VIET HUONG CERAMICS',
  headingSpan: 'DOANH NGHIỆP "SAO VÀNG ĐẤT VIỆT" 2024',
  text1: 'Trong hành trình phát triển của ngành vật liệu xây dựng Việt Nam, Công ty Cổ phần Xây dựng Gốm Sứ Việt Hương (Viet Huong Ceramics) từng bước khẳng định vai trò là một doanh nghiệp tiên phong trong lĩnh vực sản xuất, kinh doanh và xuất nhập khẩu vật liệu xây dựng, gốm sứ – gạch ốp lát, đồng thời mở rộng hoạt động trong logistics và dịch vụ thương mại quốc tế.',
  text2: 'Doanh nghiệp kiên định theo đuổi mục tiêu xây dựng một hệ sinh thái doanh nghiệp hiện đại, minh bạch và có năng lực cạnh tranh trên thị trường toàn cầu, thông qua việc liên tục đầu tư công nghệ, nâng cao năng lực sản xuất và hoàn thiện chất lượng sản phẩm.',
  text3: 'Lấy triết lý <strong>"Chất lượng – Uy tín – Phát triển bền vững"</strong> làm kim chỉ nam cho mọi hoạt động, Viet Huong Ceramics không chỉ tập trung cung cấp các sản phẩm vật liệu xây dựng chất lượng cao mà còn phát triển mạnh các dịch vụ hỗ trợ thương mại, logistics và xuất nhập khẩu.',
  pill: 'Tiên phong · Minh bạch · Bền vững',
  imageUrl: 'https://viethuongceramics.com/wp-content/smush-webp/2023/10/KPEBM157003-3.jpg.webp',
};

const staticVision = {
  title: 'Tầm Nhìn',
  points: [
    'Là doanh nghiệp dẫn đầu Việt Nam về nhập khẩu và xuất khẩu Vật liệu xây dựng, cung cấp sản phẩm chất lượng cao đáp ứng nhu cầu của khách hàng và người tiêu dùng.',
    'Xây dựng mối quan hệ chiến lược với các công ty xây dựng và kiến trúc, nhà thầu hàng đầu Việt Nam',
    'Cung cấp các giải pháp vật liệu xây dựng tiên tiến và sản phẩm xanh bảo vệ môi trường.'
  ]
};

const staticMission = {
  title: 'Sứ Mệnh',
  text: 'Việt Hương không ngừng sáng tạo nghiên cứu để mang lại những sản phẩm chất lượng tốt nhất trên thế giới đến với người tiêu dùng Việt Nam',
  imageUrl: 'https://viethuongceramics.com/wp-content/smush-webp/2023/11/NV-VIET-HUONG-CERAMICS-2-1920.png.webp',
};

// ========== CUSTOM HOOKS (GIỮ NGUYÊN) ==========
function useReveal(threshold = 0.15) {
  const ref = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold }
    );
    const els = ref.current?.querySelectorAll('[data-reveal]');
    els?.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return ref;
}

function useCounter(target, duration = 1800, start = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!start) return;
    const num = parseInt(target.replace(/\D/g, ''));
    const suffix = target.replace(/[0-9]/g, '');
    let startTime = null;
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * num) + suffix);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [start, target, duration]);
  return count || '0';
}

function StatCard({ value, label }) {
  const ref = useRef(null);
  const [started, setStarted] = useState(false);
  const count = useCounter(value, 1600, started);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="about-stats__card" ref={ref} data-reveal>
      <span className="about-stats__value">{count}</span>
      <span className="about-stats__label">{label}</span>
    </div>
  );
}

// ========== COMPONENT CHÍNH ==========
export default function AboutPage() {
  const pageRef = useReveal(0.12);
  
  // State cho các phần động, khởi tạo bằng dữ liệu tĩnh
  const [stats, setStats] = useState(staticStats);
  const [intro, setIntro] = useState(staticIntro);
  const [vision, setVision] = useState(staticVision);
  const [mission, setMission] = useState(staticMission);
  const [loading, setLoading] = useState(true);

  // Fetch dữ liệu động từ backend (nếu có)
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/about`)
      .then(res => res.json())
      .then(data => {
        if (data && Object.keys(data).length > 0) {
          // Ghi đè stats nếu có
          if (data.stats && Array.isArray(data.stats)) setStats(data.stats);
          // Ghi đè intro
          if (data.intro_heading) {
            setIntro({
              eyebrow: data.intro_eyebrow || staticIntro.eyebrow,
              heading: data.intro_heading || staticIntro.heading,
              headingSpan: data.intro_heading_span || staticIntro.headingSpan,
              text1: data.intro_text1 || staticIntro.text1,
              text2: data.intro_text2 || staticIntro.text2,
              text3: data.intro_text3 || staticIntro.text3,
              pill: data.intro_pill || staticIntro.pill,
              imageUrl: data.intro_image_url || staticIntro.imageUrl,
            });
          }
          // Ghi đè vision
          if (data.vision_title) {
            setVision({
              title: data.vision_title || staticVision.title,
              points: data.vision_points || staticVision.points,
            });
          }
          // Ghi đè mission
          if (data.mission_title) {
            setMission({
              title: data.mission_title || staticMission.title,
              text: data.mission_text || staticMission.text,
              imageUrl: data.mission_image_url || staticMission.imageUrl,
            });
          }
        }
        setLoading(false);
      })
      .catch(err => {
        console.warn('Không thể tải nội dung động, giữ nguyên tĩnh', err);
        setLoading(false);
      });
  }, []);

  // Parallax hero
  useEffect(() => {
    const handleScroll = () => {
      const hero = document.querySelector('.about-hero__bg');
      if (hero) hero.style.transform = `translateY(${window.scrollY * 0.3}px)`;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading) return <div className="loading">Đang tải...</div>;

  return (
    <div className="about-page" ref={pageRef}>
      {/* HERO BANNER - giữ nguyên tĩnh */}
      <section className="about-hero">
        <div className="about-hero__bg" />
        <div className="about-hero__overlay" />
        <div className="about-hero__content">
          <p className="about-hero__sub" data-reveal>Doanh nghiệp Sao Vàng Đất Việt 2024</p>
          <h1 className="about-hero__title" data-reveal>
            Viet Huong<br /><span>Ceramics</span>
          </h1>
          <p className="about-hero__tagline" data-reveal>
            Chất lượng – Uy tín – Phát triển bền vững
          </p>
        </div>
        <div className="about-hero__wave">
          <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
            <path d="M0,60 C360,120 1080,0 1440,60 L1440,120 L0,120 Z" fill="#ffffff" />
          </svg>
        </div>
      </section>

      {/* STATS BAR - dùng state stats (động hoặc tĩnh) */}
      <section className="about-stats">
        {stats.map((s, i) => (
          <StatCard key={i} value={s.value} label={s.label} />
        ))}
      </section>

      {/* INTRO - dùng state intro */}
      <section className="about-intro">
        <div className="about-intro__text" data-reveal>
          <span className="section-eyebrow">{intro.eyebrow}</span>
          <h2 className="about-intro__heading">
            {intro.heading}<br /><span>{intro.headingSpan}</span>
          </h2>
          <p>{intro.text1}</p>
          <p>{intro.text2}</p>
          <p dangerouslySetInnerHTML={{ __html: intro.text3 }} />
          <div className="about-intro__pill"><span>{intro.pill}</span></div>
        </div>
        <div className="about-intro__image" data-reveal>
          <div className="about-intro__image-frame">
            <img src={intro.imageUrl} alt="Viet Huong Ceramics showroom" />
            <div className="about-intro__image-accent" />
          </div>
          <div className="about-intro__badge">Viet Huong Ceramics</div>
        </div>
      </section>

      {/* WAVE DIVIDER - giữ nguyên */}
      <div className="wave-divider wave-divider--down">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none">
          <path d="M0,40 C480,80 960,0 1440,40 L1440,80 L0,80 Z" fill="#f8f4f2" />
        </svg>
      </div>

      {/* TẦM NHÌN – SỨ MỆNH - dùng state vision và mission */}
      <section className="about-vision">
        <div className="about-vision__image" data-reveal>
          <div className="about-vision__image-wrapper">
            <img src={mission.imageUrl} alt="Đội ngũ Việt Hương" />
            <div className="about-vision__badge">Tầm Nhìn · Sứ Mệnh</div>
          </div>
        </div>
        <div className="about-vision__content" data-reveal>
          <div className="about-vision__block">
            <span className="section-eyebrow">Vision</span>
            <h2 className="about-vision__label">{vision.title}</h2>
            <ul>
              {vision.points.map((point, idx) => <li key={idx}>{point}</li>)}
            </ul>
          </div>
          <div className="about-vision__block about-vision__block--mission">
            <span className="section-eyebrow section-eyebrow--right">Mission</span>
            <h2 className="about-vision__label about-vision__label--right">{mission.title}</h2>
            <p>{mission.text}</p>
            <div className="about-vision__mission-image">
              <img src={mission.imageUrl} alt="Sứ mệnh Việt Hương" />
              <div className="about-vision__mission-image-overlay" />
            </div>
          </div>
        </div>
      </section>

      {/* WAVE DIVIDER - giữ nguyên */}
      <div className="wave-divider wave-divider--up">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none">
          <path d="M0,40 C480,0 960,80 1440,40 L1440,0 L0,0 Z" fill="#f8f4f2" />
        </svg>
      </div>

      {/* GIÁ TRỊ CỐT LÕI - giữ nguyên tĩnh */}
      <section className="about-values">
        <div className="about-values__bg-overlay" />
        <div className="about-values__inner">
          <div className="about-values__header" data-reveal>
            <div className="about-values__title-bar" />
            <h2 className="about-values__title">
              GIÁ<br />TRỊ<br />CỐT<br />LÕI
            </h2>
          </div>
          <div className="about-values__grid">
            <div className="about-values__row">
              {coreValues.slice(0, 3).map((v, i) => (
                <div className="about-values__card" data-reveal key={i} style={{ '--delay': `${i * 0.12}s` }}>
                  <div className="about-values__icon">{v.icon}</div>
                  <h3>{v.title}</h3>
                  <p>{v.desc}</p>
                  <div className="about-values__card-line" />
                </div>
              ))}
            </div>
            <div className="about-values__row about-values__row--center">
              {coreValues.slice(3).map((v, i) => (
                <div className="about-values__card" data-reveal key={i} style={{ '--delay': `${(i + 3) * 0.12}s` }}>
                  <div className="about-values__icon">{v.icon}</div>
                  <h3>{v.title}</h3>
                  <p>{v.desc}</p>
                  <div className="about-values__card-line" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* BOTTOM WAVE - giữ nguyên */}
      <div className="wave-divider wave-divider--bottom">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none">
          <path d="M0,0 C360,80 1080,0 1440,60 L1440,80 L0,80 Z" fill="#ffffff" />
        </svg>
      </div>
    </div>
  );
}