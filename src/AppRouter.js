import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './components/ProfilePage';
import MainPartners from './components/MainPartners';
import FitnessDetailPage from './pages/FitnessDetailPage';
import AdminPage from './components/adminpage';
import PaymentPage from './components/PaymentPage';

const AppRouter = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/partner" element={<MainPartners />} />
        <Route path="/fitness/:id" element={<FitnessDetailPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/payment" element={<PaymentPage />} />
        {/* Catch all route */}
        <Route path="*" element={<HomePage />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;