import React, { useState, useEffect } from 'react';
import PartnerBankManagement from './PartnerBankManagement';

const PartnerDashboard = ({ ownerData }) => {
  const [loading, setLoading] = useState(true);

  // โหลดข้อมูลฟิตเนสของ partner นี้
  useEffect(() => {
    const loadPartnerData = async () => {
      if (!ownerData?.owner_uid) return;

      try {
        // เมื่อจำเป็นจะโหลดข้อมูลเพิ่มเติม
      } catch (error) {
        console.error('Error loading partner dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPartnerData();
  }, [ownerData]);

  if (loading) {
    return <div className="dashboard-loading">กำลังโหลดข้อมูล...</div>;
  }

  return (
    <div className="partner-dashboard">
      <h2>📊 จัดการบัญชีธนาคาร</h2>
      
      

      {/* เพิ่ม Partner Bank Management Component */}
      <div className="bank-management-section">
        <PartnerBankManagement ownerData={ownerData} />
      </div>

      <style jsx>{`
        .partner-dashboard {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .partner-dashboard h2 {
          color: white;
          margin-bottom: 30px;
          font-size: 1.8rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
        }

        .stat-card {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 20px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .stat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .stat-header h3 {
          color: white;
          margin: 0;
          font-size: 1.2rem;
        }

        .status-icon {
          font-size: 1.5rem;
        }

        .stat-number {
          color: #4facfe;
          font-size: 2rem;
          font-weight: bold;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 10px;
        }

        .progress-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .stat-card p {
          color: rgba(255, 255, 255, 0.8);
          margin: 0;
          font-size: 0.9rem;
        }

        .dashboard-loading {
          text-align: center;
          padding: 40px;
          color: white;
          font-size: 18px;
        }
      `}</style>
    </div>
  );
};

export default PartnerDashboard;