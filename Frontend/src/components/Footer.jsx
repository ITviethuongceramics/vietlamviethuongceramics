import './Footer.scss';
import chuTich from '../assets/chu-tich.jpg';
import logo from '../assets/logo.jpg';
import { MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="footer">

  
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
            <p className="chairman-award">
              Chủ tịch HĐQT Viet Huong Ceramics vừa được vinh danh TOP 30 Giải thưởng
              Sao Đỏ – Doanh nhân trẻ Việt Nam tiêu biểu 2025.
            </p>
            <p className="chairman-quote">
              “Khi đội ngũ trưởng thành, doanh nghiệp sẽ tự lớn. 
              Tôi đầu tư cho con người, cho văn hóa doanh nghiệp và môi trường làm việc, 
              khi đội ngũ trưởng thành, doanh nghiệp sẽ tự lớn. 
              Tôi không chạy theo lợi nhuận ngắn hạn, mà mọi quyết định đều được cân nhắc 
              ở góc nhìn 5 - 10 năm, gắn với trách nhiệm xã hội và môi trường. 
              Chính những giá trị đó giúp tôi đứng vững trong giai đoạn khó khăn và cũng 
              là nền tảng để doanh nghiệp tiếp tục phát triển trong chặng đường phía trước. 
              Đầu tư vào con người, công nghệ và quản trị để doanh nghiệp vận hành minh bạch, hiệu quả hơn.”
            </p>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="footer-bottom__inner">

          {/* Cột 1: Logo + địa chỉ */}
          <div className="footer-col footer-col--logo">
            <img src={logo} alt="logo" />
            <ul className="address-list">
              {[
                "133 Trung Lương 14, Phường Hòa Xuân, Thành Phố Đà Nẵng",
                "Showroom VLXD 246 Nguyễn Hữu Thọ, Phường Hòa Cường, TP. Đà Nẵng",
                "Showroom VLXD 999 Nguyễn Hữu Thọ, Phường Cẩm Lệ, TP. Đà Nẵng",
                "Showroom VLXD Đường Đ1, Thôn Đông Yên, Xã Duy Xuyên, TP. Đà Nẵng",
                "Showroom 246 Nguyễn Duy Trinh, P. Bình Trưng, TP. Hồ Chí Minh",
                "Showroom Số 298 Phạm Văn Đồng, Phường Hưng Đạo, TP Hải Phòng",
                "Tổng Kho VLXD Việt Hương – Đường ĐH 25.DX, Xã Duy Xuyên, TP. Đà Nẵng",
                "Kho VLXD Việt Hương - 307-315 Liên Phường, Phường Long Trường, TP. Hồ Chí Minh",
                "Kho VLXD Việt Hương - 298 Phạm Văn Đồng, Phường Hưng Đạo, TP Hải Phòng",
                "Nhà máy VLXD Việt Hương – Cụm KCN Tây An, Xã Duy Xuyên, TP. Đà Nẵng",
              ].map((addr, i) => (
                <li key={i}>
                  <MapPin size={13} />
                  <span>{addr}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="footer-col">
            <h4>VIET HUONG CERAMICS</h4>
            <ul>
              <li><span>Về chúng tôi</span></li>
              <li><span>Dự án</span></li>
              <li><span>Sản phẩm</span></li>
              <li><span>Tin tức</span></li>
              <li><span>Liên hệ</span></li>
            </ul>
            <h4>SẢN PHẨM</h4>
            <ul>
              <li><span>Gạch lát nền</span></li>
              <li><span>Gạch ốp tường</span></li>
              <li><span>Gạch Mosaic</span></li>
              <li><span>Gạch Trang Trí</span></li>
              <li><span>Thiết bị vệ sinh</span></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>DỊCH VỤ HỖ TRỢ</h4>
            <ul>
              <li><span>Thiết kế - Phối cảnh</span></li>
              <li><span>Câu hỏi thường gặp</span></li>
            </ul>
            <h4>CHÍNH SÁCH - ĐIỀU KHOẢN</h4>
            <ul>
              <li><span>Chính sách giao hàng</span></li>
              <li><span>Chính sách thanh toán</span></li>
              <li><span>Chính sách bảo mật</span></li>
              <li><span>Chính sách bảo hành</span></li>
            </ul>
            <h4>HOTLINE HỖ TRỢ</h4>
            <ul>
              <li><a href="tel:0905895499">Phòng Mua Hàng - 0905 895 499</a></li>
              <li><a href="tel:0898194329">Nhà máy - 0898 194 329</a></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}