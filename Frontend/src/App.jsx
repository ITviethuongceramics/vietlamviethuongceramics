import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
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
import AdminUsersPage from './pages/AdminUsersPage';
import './App.css';
import TestsManager from './pages/TestsManager';
import CandidateTestPage, { CandidateTestListPage, CandidateResultPage } from './pages/CandidateTestPage';
import { HelmetProvider } from 'react-helmet-async';
function FloatingContact() {
  return (
    <a href="tel:0905386888" className="floating-contact">
      <Phone size={20} />
      <span>0905386888</span>
    </a>
  );
}

function AppContent() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const hideLayout =
    location.pathname.startsWith('/admin') ||
    location.pathname.startsWith('/candidate') ||
    location.pathname.includes('/ung-tuyen');

  return (
    <>
      {!hideLayout && <Navbar />}

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/gioi-thieu" element={<AboutPage />} />
        <Route path="/tuyen-dung" element={<JobListPage />} />
        <Route path="/tuyen-dung/:id" element={<JobDetailPage />} />
        <Route path="/tuyen-dung/:id/ung-tuyen" element={<CareerApplyPage />} />
        <Route path="/tin-tuc" element={<NewsPage />} />
        <Route path="/lien-he" element={<ContactPage />} />
        <Route path="/admin" element={<AdminLoginPage />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/ung-tuyen" element={<CareerApplyPage />} />
        <Route path="/admin/tests" element={<TestsManager />} />

        {/* Candidate routes */}
        <Route path="/candidate" element={<AdminLoginPage />} />
        <Route path="/candidate/dashboard" element={<CandidateTestListPage />} />
        <Route path="/candidate/tests" element={<CandidateTestListPage />} />
        <Route path="/candidate/tests/:assignment_id" element={<CandidateTestPage />} />
        <Route path="/candidate/tests/:assignment_id/result" element={<CandidateResultPage />} />
      </Routes>

      {!hideLayout && <Footer />}
      {!hideLayout && <FloatingContact />}
    </>
  );
}

export default function App() {
  return (
    <HelmetProvider>
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
    </HelmetProvider>
  );
}