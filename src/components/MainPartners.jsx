import React, { useState } from 'react';
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

const MainPartners = (props) => {
  const [currentMenu, setCurrentMenu] = useState('overview');
  // รับ ownerData จาก props (App.js)
  const ownerData = props.ownerData || null;
  
  console.log('🔍 MainPartners - ownerData received:', ownerData);
  console.log('🔍 MainPartners - ownerData keys:', ownerData ? Object.keys(ownerData) : 'null');

  // Callback functions for components
  const handleFitnessUpdate = (data) => {
    console.log('Fitness updated:', data);
  };
  const handleEquipmentUpdate = (data) => {
    console.log('Equipment updated:', data);
  };

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
      case 'qr-scanner':
        return (
          <QRGenerator 
            ownerData={ownerData}
            onUpdate={handleFitnessUpdate}
          />
        );
      default:
        return <PartnerDashboard ownerData={ownerData} />;
    }
  };

  return (
    <div className="partner-container">
      <div className="partner-header">
        <h1>ระบบจัดการฟิตเนส - {ownerData.owner_name}</h1>
        <div className="owner-info">
          <span>อีเมล: {ownerData.owner_email}</span>
        </div>
      </div>

      <div className="partner-nav">
        <button 
          className={currentMenu === 'overview' ? 'active' : ''}
          onClick={() => setCurrentMenu('overview')}
        >
          📊 ภาพรวม
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
          🎯 กิจกรรม
        </button>
        <button 
          className={currentMenu === 'payments' ? 'active' : ''}
          onClick={() => setCurrentMenu('payments')}
        >
          💳 การชำระเงิน
        </button>
        <button 
          className={currentMenu === 'reports' ? 'active' : ''}
          onClick={() => setCurrentMenu('reports')}
        >
          📈 รายงาน
        </button>
        <button 
          className={currentMenu === 'marketing' ? 'active' : ''}
          onClick={() => setCurrentMenu('marketing')}
        >
          📢 การตลาด
        </button>
        <button 
          className={currentMenu === 'qr-scanner' ? 'active' : ''}
          onClick={() => setCurrentMenu('qr-scanner')}
        >
          📱 QR Generator
        </button>
      </div>

      <div className="partner-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default MainPartners;