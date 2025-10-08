import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import './MainPartners.css';
import PartnerDashboard from './PartnerDashboard';
import FitnessManagement from './FitnessManagement';
import EquipmentManagement from './EquipmentManagement';
import MemberManagement from './MemberManagement';
import BookingManagement from './BookingManagement';
import PricingManagement from './PricingManagement';
import ActivityManagement from './ActivityManagement';
import PaymentManagement from './PaymentManagement';
import RevenueReports from './RevenueReports';
import MarketingTools from './MarketingTools';
import QRGenerator from './QRGenerator';

const MainPartners = () => {
  const navigate = useNavigate();
  const [currentMenu, setCurrentMenu] = useState('overview');
  const [ownerData, setOwnerData] = useState(null);
  const [loading, setLoading] = useState(true);

  // ตรวจสอบ authentication และโหลดข้อมูล partner
  useEffect(() => {
    const loadPartnerData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate('/login');
          return;
        }

        // โหลดข้อมูล owner
        const { data: owner, error } = await supabase
          .from('tbl_owner')
          .select('*')
          .eq('auth_user_id', user.id)
          .single();

        if (error || !owner) {
          console.error('Error loading owner data:', error);
          navigate('/');
          return;
        }

        setOwnerData({
          id: owner.owner_uid,
          full_name: owner.owner_name,
          email: owner.owner_email,
          role: 'partner',
          ...owner
        });
      } catch (error) {
        console.error('Error in loadPartnerData:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    loadPartnerData();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Callback functions for components
  const handleFitnessUpdate = (data) => {
    console.log('Fitness updated:', data);
  };
  const handleEquipmentUpdate = (data) => {
    console.log('Equipment updated:', data);
  };

  if (loading) {
    return (
      <div className="partner-container">
        <div className="loading">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  if (!ownerData) {
    return (
      <div className="partner-container">
        <div className="error">ไม่พบข้อมูลผู้ใช้พาร์ทเนอร์</div>
      </div>
    );
  }

  const renderContent = () => {
    switch (currentMenu) {
      case 'overview':
        return <PartnerDashboard ownerData={ownerData} />;
      case 'fitness-info':
        return (
          <FitnessManagement 
            ownerData={ownerData}
            onUpdate={handleFitnessUpdate}
          />
        );
      case 'equipment':
        return (
          <EquipmentManagement 
            ownerData={ownerData}
            onUpdate={handleEquipmentUpdate}
          />
        );
      case 'members':
        return (
          <MemberManagement 
            ownerData={ownerData}
            onUpdate={handleFitnessUpdate}
          />
        );
      case 'bookings':
        return (
          <BookingManagement 
            ownerData={ownerData}
            onUpdate={handleFitnessUpdate}
          />
        );
      case 'pricing':
        return (
          <PricingManagement 
            ownerData={ownerData}
            onUpdate={handleFitnessUpdate}
          />
        );
      case 'activities':
        return (
          <ActivityManagement 
            ownerData={ownerData}
            onUpdate={handleFitnessUpdate}
          />
        );
      case 'payments':
        return (
          <PaymentManagement 
            ownerData={ownerData}
            onUpdate={handleFitnessUpdate}
          />
        );
      case 'reports':
        return (
          <RevenueReports 
            ownerData={ownerData}
            onUpdate={handleFitnessUpdate}
          />
        );
      case 'marketing':
        return (
          <MarketingTools 
            ownerData={ownerData}
            onUpdate={handleFitnessUpdate}
          />
        );
      
    }
  };

  return (
    <div className="partner-container">
      {/* Top Navigation Bar */}
      <nav className="top-navbar">
        <div className="navbar-left">
          <button 
            onClick={() => navigate('/')} 
            className="home-btn"
            title="กลับสู่หน้าหลัก"
          >
            🏠 หน้าหลัก
          </button>
          <span className="separator">|</span>
          <span className="current-page">ระบบพาร์ทเนอร์</span>
        </div>
        <div className="navbar-right">
          <button onClick={handleLogout} className="logout-btn">
            🚪 ออกจากระบบ
          </button>
        </div>
      </nav>

      <div className="partner-header">
        <h1>ระบบจัดการฟิตเนส</h1>
        <div className="owner-info">
          <span>ID : {ownerData.owner_name} / {ownerData.owner_email}</span>
        </div>
      </div>

      <div className="partner-nav">
        <button 
          className={currentMenu === 'overview' ? 'active' : ''}
          onClick={() => setCurrentMenu('overview')}
        >
          📊 จัดการบัญชีธนาคาร
        </button>
        <button 
          className={currentMenu === 'fitness-info' ? 'active' : ''}
          onClick={() => setCurrentMenu('fitness-info')}
        >
          🏋️ จัดการฟิตเนส
        </button>
        <button 
          className={currentMenu === 'equipment' ? 'active' : ''}
          onClick={() => setCurrentMenu('equipment')}
        >
          🏃 จัดการอุปกรณ์
        </button>
        <button 
          className={currentMenu === 'members' ? 'active' : ''}
          onClick={() => setCurrentMenu('members')}
        >
          👥 สมาชิก
        </button>
        <button 
          className={currentMenu === 'bookings' ? 'active' : ''}
          onClick={() => setCurrentMenu('bookings')}
        >
          📅 การจอง
        </button>
        <button 
          className={currentMenu === 'pricing' ? 'active' : ''}
          onClick={() => setCurrentMenu('pricing')}
        >
          💰 โปรโมชั่น
        </button>
        <button 
          className={currentMenu === 'activities' ? 'active' : ''}
          onClick={() => setCurrentMenu('activities')}
        >
          🎯 จัดการคลาส
        </button>
       
        
        <button 
          className={currentMenu === 'marketing' ? 'active' : ''}
          onClick={() => setCurrentMenu('marketing')}
        >
          📢 การตลาด
        </button>
        
      </div>

      <div className="partner-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default MainPartners;