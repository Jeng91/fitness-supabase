import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';
import PartnerBankManagement from './PartnerBankManagement';

const PartnerDashboard = ({ ownerData }) => {
  const [fitnessData, setFitnessData] = useState(null);
  const [equipmentList, setEquipmentList] = useState([]);
  const [loading, setLoading] = useState(true);

  // โหลดข้อมูลฟิตเนสของ partner นี้
  useEffect(() => {
    const loadPartnerData = async () => {
      if (!ownerData?.owner_uid) return;

      try {
        // ดึงข้อมูลฟิตเนสของ partner นี้
        const { data: fitness, error: fitnessError } = await supabase
          .from('tbl_fitness')
          .select('*')
          .eq('owner_uid', ownerData.owner_uid)
          .single();

        if (fitness && !fitnessError) {
          setFitnessData(fitness);
          
          // ดึงข้อมูลอุปกรณ์ของฟิตเนสนี้
          const { data: equipment, error: equipError } = await supabase
            .from('tbl_equipment')
            .select('*')
            .eq('fitness_id', fitness.fit_id);

          if (!equipError) {
            setEquipmentList(equipment || []);
          }
        }

        // ดึงสถิติการจอง (ถ้ามีระบบจอง)
        // TODO: เพิ่มการดึงข้อมูลการจองเมื่อมีตารางการจอง

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

  const dashboardStats = {
    hasProfile: !!ownerData,
    hasFitness: !!fitnessData?.fit_id,
    equipmentCount: equipmentList?.length || 0,
    profileComplete: ownerData ? 
      (ownerData.owner_name && ownerData.owner_email ? 100 : 
       (ownerData.owner_name || ownerData.owner_email ? 60 : 30)) : 0,
    fitnessComplete: fitnessData ? 
      (fitnessData.fit_name && fitnessData.fit_address ? 100 :
       (fitnessData.fit_name || fitnessData.fit_address ? 60 : 30)) : 0
  };

  const getCompletionColor = (percentage) => {
    if (percentage >= 80) return '#28a745'; // เขียว
    if (percentage >= 50) return '#ffc107'; // เหลือง
    return '#dc3545'; // แดง
  };

  const getStatusIcon = (completed) => {
    return completed ? '✅' : '❌';
  };

  return (
    <div className="partner-dashboard">
      <h2>📊 ภาพรวมข้อมูล</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <h3>👤 ข้อมูลส่วนตัว</h3>
            <span className="status-icon">{getStatusIcon(dashboardStats.hasProfile)}</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ 
                width: `${dashboardStats.profileComplete}%`,
                backgroundColor: getCompletionColor(dashboardStats.profileComplete)
              }}
            ></div>
          </div>
          <p>ความสมบูรณ์: {dashboardStats.profileComplete}%</p>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <h3>🏋️ ข้อมูลฟิตเนส</h3>
            <span className="status-icon">{getStatusIcon(dashboardStats.hasFitness)}</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ 
                width: `${dashboardStats.fitnessComplete}%`,
                backgroundColor: getCompletionColor(dashboardStats.fitnessComplete)
              }}
            ></div>
          </div>
          <p>ความสมบูรณ์: {dashboardStats.fitnessComplete}%</p>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <h3>🛠️ อุปกรณ์</h3>
            <span className="stat-number">{dashboardStats.equipmentCount}</span>
          </div>
          <p>จำนวนอุปกรณ์ทั้งหมด</p>
        </div>
      </div>

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