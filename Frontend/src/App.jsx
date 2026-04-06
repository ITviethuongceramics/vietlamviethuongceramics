import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import JobListPage from './pages/JobListPage';
import JobDetailPage from './pages/JobDetailPage';
import NewsPage from './pages/NewsPage';
import ContactPage from './pages/ContactPage';
import CareerApplyPage from './pages/CareerApplyPage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboard from './pages/AdminDashboard';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { Phone } from "lucide-react";
import './App.css';

function FloatingContact() {
  return (
    <a href="tel:0905386888" className="floating-contact">
      <Phone size={20} />
      <span>0905386888</span>
    </a>
  );
}

// 👉 Tách ra component để dùng useLocation
function AppContent() {
  const location = useLocation();

  // ❌ Những route cần ẩn layout
  const hideLayout =
    location.pathname.startsWith('/admin') ||
    location.pathname.includes('/ung-tuyen');

  return (
    <>
      {/* Navbar */}
      {!hideLayout && <Navbar />}

      {/* Routes */}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/gioi-thieu" element={<AboutPage />} />
        <Route path="/tuyen-dung" element={<JobListPage />} />
        <Route path="/tuyen-dung/:id" element={<JobDetailPage />} />
        <Route path="/tuyen-dung/:id/ung-tuyen" element={<CareerApplyPage />} />
        <Route path="/tin-tuc" element={<NewsPage />} />
        <Route path="/lien-he" element={<ContactPage />} />
        <Route path="/admin" element={<AdminLoginPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/ung-tuyen" element={<CareerApplyPage />} />
      </Routes>

      {/* Footer + Contact */}
      {!hideLayout && <Footer />}
      {!hideLayout && <FloatingContact />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}