import { useEffect, useState } from 'react';
import './HomePage.scss';
import { Briefcase, TrendingUp, DollarSign } from 'lucide-react';
import banner1 from '../assets/banner1.jpg';
import banner2 from '../assets/banner2.png';
import banner3 from '../assets/banner3.jpg';
import banner4 from '../assets/banner4.jpg';
import f1 from '../assets/f1.jpg';
import f2 from '../assets/f2.jpg';
import f3 from '../assets/f3.jpg';
import { useNavigate } from 'react-router-dom';
const API = import.meta.env.VITE_API_URL;

const DEFAULT_SLIDES = [banner1, banner2, banner3, banner4];
const DEFAULT_FEATURES = [f1, f2, f3];

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

const ICONS = [Briefcase, TrendingUp, DollarSign];
const COLORS = ['red', 'blue', 'yellow'];

export default function HomePage() {
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();
  const [slides, setSlides] = useState(DEFAULT_SLIDES);
  const [featuresImg, setFeaturesImg] = useState(DEFAULT_FEATURES);
  const [featureContent, setFeatureContent] = useState(DEFAULT_CONTENT);

  // Load ảnh từ server + text từ localStorage
  useEffect(() => {
    fetch(`${API}/images/homepage`)
      .then(r => r.json())
      .then(data => {
        const bKeys = ['banner1', 'banner2', 'banner3', 'banner4'];
        setSlides(bKeys.map((k, i) => data[k] || DEFAULT_SLIDES[i]));

        const fKeys = ['feature1', 'feature2', 'feature3'];
        setFeaturesImg(fKeys.map((k, i) => data[k] || DEFAULT_FEATURES[i]));
      })
      .catch(() => { }); // lỗi → giữ ảnh mặc định

    try {
      const saved = localStorage.getItem('feature_content');
      if (saved) setFeatureContent(JSON.parse(saved));
    } catch { }
  }, []);

  // Reset index về 0 khi slides thay đổi
  useEffect(() => {
    setIndex(0);
  }, [slides]);

  // Slideshow tự động
  useEffect(() => {
    if (slides.length === 0) return;
    const interval = setInterval(() => {
      setIndex(prev => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [slides.length]);

  return (
    <div className="home">
      <div className="hero">
        {slides.map((img, i) => (
          <div
            key={i}
            className={`slide ${i === index ? 'active' : ''}`}
            style={{ backgroundImage: `url(${img})` }}
          />
        ))}
        <div className="hero-content" key={index}>
          <h1>VIET HUONG CERAMICS</h1>
          <p>Chào mừng đến với trang tuyển dụng</p>
          <button onClick={() => navigate('/tuyen-dung/1/ung-tuyen')}>Ứng tuyển ngay</button>
        </div>
      </div>

      <div className="features">
        {featureContent.map((f, i) => {
          const Icon = ICONS[i];
          return (
            <div className={`feature-row ${COLORS[i]}`} key={i}>
              <img src={featuresImg[i]} alt="" />
              <div className="feature-text">
                <h3><Icon className="icon" />{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}