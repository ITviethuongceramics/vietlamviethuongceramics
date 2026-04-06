import './Footer.scss';
import chuTich from '../assets/chu-tich.jpg';
import logo from '../assets/logo.jpg';
import { MapPin } from 'lucide-react';

export default function Footer() {
  const branches = [
    "133 Trung Lương 14, Phường Hòa Xuân, TP. Đà Nẵng",
    "Showroom VLXD 246 Nguyễn Hữu Thọ, Phường Hòa Cường, TP. Đà Nẵng",
    "Showroom VLXD 999 Nguyễn Hữu Thọ, Phường Cẩm Lệ, TP. Đà Nẵng",
    "Showroom VLXD Đường Đ1, Thôn Đông Yên, Xã Duy Xuyên, TP. Đà Nẵng",
    "Showroom 246 Nguyễn Duy Trinh, P. Bình Trưng, TP. Hồ Chí Minh",
    "Showroom 298 Phạm Văn Đồng, Phường Hưng Đạo, TP Hải Phòng",
    "Tổng Kho VLXD Việt Hương – Đường ĐH 25.DX, Xã Duy Xuyên, TP. Đà Nẵng",
    "Kho VLXD Việt Hương - 307-315 Liên Phường, Phường Long Trường, TP. Hồ Chí Minh",
    "Kho VLXD Việt Hương - 298 Phạm Văn Đồng, Phường Hưng Đạo, TP Hải Phòng",
    "Nhà máy VLXD Việt Hương – Cụm KCN Tây An, Xã Duy Xuyên, TP. Đà Nẵng"
  ];

  return (
    <footer className="footer">

      {/* 🔴 TOP */}
      <div className="footer-top">
        <h2>CON NGƯỜI VIET HUONG CERAMICS</h2>
        <p>
          Chúng tôi xây dựng môi trường nơi mỗi cá nhân được phát triển toàn diện,
          được ghi nhận xứng đáng và đồng hành cùng sự phát triển bền vững của doanh nghiệp.
        </p>

        <div className="chairman">
          <div className="chairman-img">
            <img src={chuTich} alt="Nguyễn Trung Trực" />
          </div>

          <div className="chairman-content">
            <h2>CHỦ TỊCH NGUYỄN TRUNG TRỰC</h2>

            <p>
              Chủ tịch HĐQT Viet Huong Ceramics vừa được vinh danh TOP 30 Giải thưởng
              Sao Đỏ – Doanh nhân trẻ Việt Nam tiêu biểu 2025.
            </p>

            <p>
              Dưới sự dẫn dắt của ông, Viet Huong Ceramics không ngừng phát triển,
              khẳng định vị thế trong lĩnh vực vật liệu xây dựng và logistics.
            </p>

            <ul>
              <li>Tăng trưởng ổn định và bền vững</li>
              <li>Tiên phong vật liệu xây dựng xanh</li>
              <li>Chuẩn hóa sản xuất theo ISO – EN</li>
              <li>Mở rộng hệ thống phân phối toàn quốc</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ⚪ DANH SÁCH CƠ SỞ */}
      <div className="branches-section">
        <h2>HỆ THỐNG CƠ SỞ</h2>

        <div className="branches-list">
          {branches.map((item, index) => (
            <div className="branch-card" key={index}>
              <div className="info">
                <MapPin size={18} />
                <span>{item}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 🔳 BOTTOM */}
      <div className="footer-bottom">
        <div className="company">
          <img src={logo} alt="logo" />

          <div className="company-info">
            <p>CÔNG TY CP XÂY DỰNG GỐM SỨ VIỆT HƯƠNG</p>
            <p>MST: 0401756026</p>
            <p>©2026 viethuongceramics</p>
          </div>
        </div>
      </div>

    </footer>
  );
}