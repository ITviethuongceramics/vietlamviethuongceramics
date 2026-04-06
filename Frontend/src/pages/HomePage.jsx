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
const slides = [banner1, banner2, banner3, banner4];

export default function HomePage() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex(prev => (prev + 1) % slides.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

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
          <button>Ứng tuyển ngay</button>
        </div>
      </div>

      <div className="features">
        <div className="feature-row red">
          <img src={f1} alt="" />
          <div className="feature-text">
            <h3>
              <Briefcase className="icon" />
              Môi trường làm việc chuyên nghiệp
            </h3>
            <p>
              Chúng tôi xây dựng một môi trường làm việc hiện đại, năng động và sáng tạo,
              nơi mỗi cá nhân đều được tôn trọng, khuyến khích phát triển và phát huy tối đa năng lực của mình.
            </p>
          </div>
        </div>

        <div className="feature-row blue">
          <img src={f2} alt="" />
          <div className="feature-text">
            <h3>
              <TrendingUp className="icon" />
              Cơ hội phát triển bền vững
            </h3>

            <p>
              Với hệ thống đào tạo bài bản cùng lộ trình thăng tiến rõ ràng,
              chúng tôi đồng hành cùng bạn trên hành trình phát triển sự nghiệp lâu dài.
            </p>
          </div>
        </div>

        <div className="feature-row yellow">
          <img src={f3} alt="" />
          <div className="feature-text">
            <h3>
              <DollarSign className="icon" />
              Chính sách đãi ngộ hấp dẫn
            </h3>
            <p>
              Mức thu nhập cạnh tranh cùng các chế độ thưởng minh bạch,
              đảm bảo ghi nhận xứng đáng cho mọi đóng góp của bạn.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 