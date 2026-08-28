# 📌 TÓM TẮT CHỨC NĂNG DỰ ÁN & HƯỚNG DẪN TÙY CHỈNH DỰ ÁN CÁ NHÂN

Tài liệu tóm tắt ngắn gọn mục đích sản phẩm, luồng xử lý chi tiết của tính năng Nộp hồ sơ ứng tuyển, vai trò của các biến môi trường (`.env`), vị trí lưu trữ file CV và hướng dẫn tùy biến thành dự án cá nhân.

---

## 1. 💡 Chức Năng Cốt Lõi Của Dự Án

Dự án này là **Hệ Thống Tuyển Dụng & Đánh Giá Năng Lực Ứng Viên Tự Động Bằng AI (Recruitment & AI Assessment System)**.

Hệ thống giải quyết **3 nhóm chức năng lớn**:

1. **Trang Cổng Thông Tin Tuyển Dụng (Dành Cho Ứng Viên)**:
   - Hiển thị thông tin doanh nghiệp & danh sách các vị trí công việc đang tuyển dụng.
   - Cho phép ứng viên nộp hồ sơ CV trực tuyến. File CV tự động lưu lên đám mây Cloudinary và đồng bộ dữ liệu ra Google Sheets/Drive.

2. **Hệ Thống Làm Bài Test & AI Chấm Bài Tự Động**:
   - Ứng viên nhận email chứa tài khoản ➔ Đăng nhập portal làm bài test (`/candidate`) trực tuyến (Trắc nghiệm, Tự luận, Đánh máy tốc độ).
   - **Tự động chấm bài bằng AI (Groq / Gemini AI)**: Trí tuệ nhân tạo tự động đọc câu trả lời tự luận của ứng viên, phân tích ưu/nhược điểm, cho điểm và đưa ra nhận xét chi tiết.

3. **Trang Quản Trị Tuyển Dụng (Dành Cho HR / Admin)**:
   - Đăng và quản lý tin tuyển dụng, xem danh sách CV đã nộp, xem điểm bài test & lời nhận xét của AI.
   - Phê duyệt / Từ chối ứng viên ➔ Hệ thống tự động gửi email thông báo kết quả cho ứng viên.

---

## 2. 🔍 LUỒNG XỬ LÝ CHI TIẾT TÍNH NĂNG NỘP HỒ SƠ ỨNG TUYỂN

Khi ứng viên nhấn nút **"Gửi hồ sơ ứng tuyển"**, dữ liệu sẽ đi qua quy trình xử lý đa tầng như sau:

```mermaid
sequenceDiagram
    autonumber
    actor Candidate as Ứng viên (Browser)
    participant FE as Frontend (CareerApplyPage.jsx)
    participant BE as Backend (routes/careers.js)
    participant Multer as Bộ nhớ tạm (/uploads/cv)
    participant DB as MySQL (viet_huong_recruitment)
    participant Cloudinary as Cloudinary Cloud Storage
    participant Sheet as Google Sheets API
    participant Brevo as Brevo SMTP Email API

    Candidate->>FE: Điền thông tin + Đính kèm CV -> Click "Gửi hồ sơ"
    FE->>BE: POST FormData đến VITE_API_URL/careers/apply
    BE->>Multer: Lưu tạm file CV vào thư mục Backend/uploads/cv
    BE->>DB: INSERT thông tin ứng viên vào bảng applications
    BE-->>FE: Trả về { success: true } -> Hiện màn hình thành công
    
    par Tiến trình ngầm (Async Background Task)
        BE->>Cloudinary: uploadCV(file.path) -> Đẩy file CV lên đám mây
        Cloudinary-->>BE: Trả về secure_url (Link file https)
        BE->>DB: UPDATE applications SET cv_link = secure_url
        BE->>Sheet: appendToSheet() -> Ghi 1 dòng thông tin vào Google Sheet
        BE->>Brevo: sendMailToCandidate() & sendMailToHR() kèm file đính kèm
        BE->>Multer: fs.unlinkSync() -> Xóa file tạm trong server
    end

---

### A. Đoạn Mã Phía Frontend ([Frontend/src/pages/CareerApplyPage.jsx](file:///Users/an/Downloads/BE+FE%20Viet%20huong/Frontend/src/pages/CareerApplyPage.jsx))

Khi ứng viên submit form, hàm `handleSubmit` đóng gói thông tin và gửi qua API:

```javascript
// Dòng 205 - 213 trong CareerApplyPage.jsx
const formData = new FormData();
Object.entries(form).forEach(([k, v]) => formData.append(k, v));
if (cvFile) formData.append('cv', cvFile);

const res = await fetch(`${import.meta.env.VITE_API_URL}/careers/apply`, {
  method: 'POST',
  body: formData,
});
```

* **Liên kết với file `.env`**: 
  - `import.meta.env.VITE_API_URL` được lấy từ [Frontend/.env](file:///Users/an/Downloads/BE+FE%20Viet%20huong/Frontend/.env):
    ```env
    VITE_API_URL=http://localhost:5001/api
    ```

---

### B. Đoạn Mã Phía Backend ([Backend/routes/careers.js](file:///Users/an/Downloads/BE+FE%20Viet%20huong/Backend/routes/careers.js))

1. **Tiếp nhận Form & Lưu tạm file CV**:
   ```javascript
   // Dòng 61 - 71 trong careers.js
   const storage = multer.diskStorage({
     destination: (req, file, cb) => {
       const dir = path.join(__dirname, '..', 'uploads', 'cv');
       cb(null, dir); // Lưu tạm vào thư mục Backend/uploads/cv
     },
     filename: (req, file, cb) => {
       cb(null, Date.now() + '-' + path.extname(file.originalname));
     }
   });
   ```

2. **Lưu thông tin ứng viên vào MySQL**:
   ```javascript
   // Dòng 124 - 129 trong careers.js
   await pool.query(
     `INSERT INTO applications 
       (id, full_name, email, phone, position, experience, address, cover_letter, cv_link, email_sent, received_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, null, 0, NOW())`,
     [id, _fullName, _email, _phone, _position, _experience, _address, _coverLetter]
   );
   ```
   * **Liên kết với file `.env`**:
     Kết nối CSDL sử dụng các cấu hình trong [Backend/.env](file:///Users/an/Downloads/BE+FE%20Viet%20huong/Backend/.env):
     ```env
     DB_HOST=localhost
     DB_PORT=3306
     DB_USER=root
     DB_PASSWORD=123456
     DB_NAME=viet_huong_recruitment
     ```

---

### C. Vị Trí Lưu File CV & Các Dịch Vụ Liên Kết ([Backend/services/google.js](file:///Users/an/Downloads/BE+FE%20Viet%20huong/Backend/services/google.js))

#### ❓ File CV Được Lưu Ở Đâu?
* **Ban đầu**: File CV được lưu tạm thời trên ổ đĩa máy chủ tại thư mục `Backend/uploads/cv`.
* **Sau đó**: File CV được đẩy vĩnh viễn lên **Đám Mây Cloudinary** tại thư mục `cv-viet-huong`. Sau khi đẩy thành công, đường dẫn URL (`https://res.cloudinary.com/...`) sẽ được lưu vào cột `cv_link` trong bảng `applications` của MySQL, và file tạm trên ổ đĩa máy chủ sẽ bị **tự động xóa** (`fs.unlinkSync`) để tránh đầy ổ cứng.

```javascript
// Dòng 23 - 31 trong google.js
async function uploadCV(filePath, fileName) {
  const result = await cloudinary.uploader.upload(filePath, {
    resource_type: 'auto',        // Hỗ trợ cả PDF, Word, Ảnh
    folder: 'cv-viet-huong',      // Thư mục lưu trữ trên Cloudinary
    use_filename: true,
    unique_filename: true,
  });
  return result.secure_url;       // Trả về đường dẫn link HTTPS
}
```

* **Liên kết với file `.env`**:
  - **Cloudinary Storage**:
    ```env
    CLOUDINARY_CLOUD_NAME=dq8cmcln9
    CLOUDINARY_API_KEY=413844692796891
    CLOUDINARY_API_SECRET=MYGisD-wbzIu1nwnbKwhETrgM7I
    ```
  - **Đồng bộ Google Sheets** ([google.js](file:///Users/an/Downloads/BE+FE%20Viet%20huong/Backend/services/google.js#L56-L80)):
    ```env
    GOOGLE_SHEET_ID=1Vb3xhA4KUkBb3LI-5QkQl3nYjsiDevdxKjMXM8ooEa4
    GOOGLE_CREDENTIALS={"type":"service_account", ...}
    ```
  - **Gửi Email tự động qua Brevo SMTP** ([careers.js](file:///Users/an/Downloads/BE+FE%20Viet%20huong/Backend/routes/careers.js#L41-L52)):
    ```env
    BREVO_API_KEY=xkeysib-6a1ab1e85020c110...
    BREVO_FROM=hothanh081203@gmail.com
    HR_MAIL=hothanh081203@gmail.com
    ```

---

## 3. 🛠️ Cần Thay Đổi Những Gì Để Thành Dự Án Của Bạn?

Nếu bạn muốn chỉnh sửa dự án này thành sản phẩm/thương hiệu của riêng công ty bạn, bạn cần thay đổi **5 nhóm thông tin sau**:

### 1. Thương Hiệu & Giao Diện (Branding & Logo)
- **Logo & Icon**: Thay file ảnh logo tại [Frontend/src/assets/logo.jpg](file:///Users/an/Downloads/BE+FE%20Viet%20huong/Frontend/src/assets/logo.jpg) và logo trong các file giao diện [Navbar.jsx](file:///Users/an/Downloads/BE+FE%20Viet%20huong/Frontend/src/components/Navbar.jsx), [Footer.jsx](file:///Users/an/Downloads/BE+FE%20Viet%20huong/Frontend/src/components/Footer.jsx).
- **Tên dự án & Tiêu đề**: Đổi tên hiển thị trong [Frontend/index.html](file:///Users/an/Downloads/BE+FE%20Viet%20huong/Frontend/index.html) (thẻ `<title>`) và các thông điệp tại [Frontend/src/App.jsx](file:///Users/an/Downloads/BE+FE%20Viet%20huong/Frontend/src/App.jsx).
- **Nội dung công ty**: Sửa nội dung giới thiệu tại [Frontend/src/pages/AboutPage.jsx](file:///Users/an/Downloads/BE+FE%20Viet%20huong/Frontend/src/pages/AboutPage.jsx) và thông tin chi nhánh trong CSDL bảng `branches`.

### 2. Biến Môi Trường ([Backend/.env](file:///Users/an/Downloads/BE+FE%20Viet%20huong/Backend/.env))
- **Tài khoản Email gửi đi**: Thay `GMAIL_USER`, `GMAIL_PASS`, `BREVO_USER`, `BREVO_PASS`, `HR_MAIL` thành tài khoản Email công ty của bạn.
- **Kho lưu trữ CV Cloudinary**: Thay `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` bằng tài khoản Cloudinary riêng.
- **Khóa AI Chấm Điểm**: Thay `GROQ_API_KEY` hoặc Gemini API Key riêng.
- **Google Sheet/Drive**: Thay `GOOGLE_SHEET_ID` và `GOOGLE_DRIVE_FOLDER_ID` để lưu file CV về Drive cá nhân.

### 3. Cơ Sở Dữ Liệu & Mật Khẩu Admin
- **Tên CSDL**: Đổi `DB_NAME=viet_huong_recruitment` thành tên CSDL riêng của bạn trong [Backend/.env](file:///Users/an/Downloads/BE+FE%20Viet%20huong/Backend/.env).
- **Tài khoản Admin**: Đăng nhập `/admin` bằng `admin`/`admin123` ➔ Vào trang Quản lý tài khoản (`/admin/users`) để đổi mật khẩu tài khoản superadmin thành mật khẩu an toàn của bạn.

### 4. Tên Miền (Domain) Khi Đưa Lên Server Thật
- Đổi tên miền mặc định trong [Backend/server.js](file:///Users/an/Downloads/BE+FE%20Viet%20huong/Backend/server.js) (`base = 'https://domain-cua-ban.com'`) và [Frontend/scripts/generate-sitemap.js](file:///Users/an/Downloads/BE+FE%20Viet%20huong/Frontend/scripts/generate-sitemap.js) thành domain thực tế.

### 5. Tiêu Chí AI Chấm Bài (Tùy chọn)
- Trong [Backend/routes/grading.js](file:///Users/an/Downloads/BE+FE%20Viet%20huong/Backend/routes/grading.js): Tùy chỉnh câu lệnh Prompt gửi tới AI Groq/Gemini để AI chấm bài tự luận theo bộ tiêu chí năng lực riêng của công ty bạn (ưu tiên tư duy, thái độ, kỹ năng giao tiếp,...).
