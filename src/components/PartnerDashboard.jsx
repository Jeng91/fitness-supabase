import React from 'react';

const PartnerDashboard = ({ 
  partnerData, 
  fitnessData, 
  equipmentList 
}) => {
  const dashboardStats = {
    hasProfile: !!partnerData,
    hasFitness: !!fitnessData?.id,
    equipmentCount: equipmentList?.length || 0,
    profileComplete: partnerData ? 
      (partnerData.owner_name && partnerData.owner_email && partnerData.owner_phone ? 100 : 
       (partnerData.owner_name || partnerData.owner_email || partnerData.owner_phone ? 60 : 30)) : 0,
    fitnessComplete: fitnessData ? 
      (fitnessData.fit_name && fitnessData.fit_address && fitnessData.fit_phone ? 100 :
       (fitnessData.fit_name || fitnessData.fit_address || fitnessData.fit_phone ? 60 : 30)) : 0
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
      <h2>🏢 Partner Dashboard</h2>
      
      {/* Overview Cards */}
      <div className="dashboard-overview">
        <div className="overview-cards">
          <div className="overview-card profile-card">
            <div className="card-header">
              <h3>👤 ข้อมูลส่วนตัว</h3>
              <span className="status-icon">{getStatusIcon(dashboardStats.hasProfile)}</span>
            </div>
            <div className="card-content">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ 
                    width: `${dashboardStats.profileComplete}%`,
                    backgroundColor: getCompletionColor(dashboardStats.profileComplete)
                  }}
                ></div>
              </div>
              <p>{dashboardStats.profileComplete}% เสร็จสมบูรณ์</p>
              {partnerData && (
                <div className="card-details">
                  <p>📧 {partnerData.owner_email || 'ยังไม่ได้กรอก'}</p>
                  <p>📱 {partnerData.owner_phone || 'ยังไม่ได้กรอก'}</p>
                </div>
              )}
            </div>
          </div>

          <div className="overview-card fitness-card">
            <div className="card-header">
              <h3>🏋️ ข้อมูลฟิตเนส</h3>
              <span className="status-icon">{getStatusIcon(dashboardStats.hasFitness)}</span>
            </div>
            <div className="card-content">
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ 
                    width: `${dashboardStats.fitnessComplete}%`,
                    backgroundColor: getCompletionColor(dashboardStats.fitnessComplete)
                  }}
                ></div>
              </div>
              <p>{dashboardStats.fitnessComplete}% เสร็จสมบูรณ์</p>
              {fitnessData && (
                <div className="card-details">
                  <p>🏢 {fitnessData.fit_name || 'ยังไม่ได้ตั้งชื่อ'}</p>
                  <p>💰 {fitnessData.fit_price || 0} บาท/วัน</p>
                </div>
              )}
            </div>
          </div>

          <div className="overview-card equipment-card">
            <div className="card-header">
              <h3>🔧 อุปกรณ์</h3>
              <span className="status-icon">{getStatusIcon(dashboardStats.equipmentCount > 0)}</span>
            </div>
            <div className="card-content">
              <div className="equipment-count">
                <span className="count-number">{dashboardStats.equipmentCount}</span>
                <span className="count-label">รายการ</span>
              </div>
              {dashboardStats.equipmentCount > 0 ? (
                <p>มีอุปกรณ์ทั้งหมด {dashboardStats.equipmentCount} รายการ</p>
              ) : (
                <p>ยังไม่มีอุปกรณ์</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>⚡ การดำเนินการด่วน</h3>
        <div className="action-cards">
          {!dashboardStats.hasProfile && (
            <div className="action-card urgent">
              <h4>👤 เพิ่มข้อมูลส่วนตัว</h4>
              <p>กรุณาเพิ่มข้อมูลส่วนตัวให้ครบถ้วน</p>
              <span className="priority-badge high">ความสำคัญสูง</span>
            </div>
          )}

          {!dashboardStats.hasFitness && (
            <div className="action-card urgent">
              <h4>🏋️ สร้างข้อมูลฟิตเนส</h4>
              <p>เริ่มสร้างฟิตเนสของคุณ</p>
              <span className="priority-badge high">ความสำคัญสูง</span>
            </div>
          )}

          {dashboardStats.hasFitness && dashboardStats.equipmentCount === 0 && (
            <div className="action-card normal">
              <h4>🔧 เพิ่มอุปกรณ์</h4>
              <p>เพิ่มอุปกรณ์ให้กับฟิตเนสของคุณ</p>
              <span className="priority-badge medium">ควรทำ</span>
            </div>
          )}

          {dashboardStats.fitnessComplete < 100 && dashboardStats.hasFitness && (
            <div className="action-card normal">
              <h4>📝 เพิ่มรายละเอียดฟิตเนส</h4>
              <p>เพิ่มข้อมูลฟิตเนสให้ครบถ้วน</p>
              <span className="priority-badge medium">ควรทำ</span>
            </div>
          )}
        </div>
      </div>

      {/* System Status */}
      <div className="system-status">
        <h3>📊 สถานะระบบ</h3>
        <div className="status-grid">
          <div className="status-item">
            <span className="status-label">👤 ข้อมูลส่วนตัว:</span>
            <span className={`status-value ${dashboardStats.hasProfile ? 'complete' : 'incomplete'}`}>
              {dashboardStats.hasProfile ? 'เสร็จสิ้น' : 'ยังไม่เสร็จ'}
            </span>
          </div>

          <div className="status-item">
            <span className="status-label">🏋️ ข้อมูลฟิตเนส:</span>
            <span className={`status-value ${dashboardStats.hasFitness ? 'complete' : 'incomplete'}`}>
              {dashboardStats.hasFitness ? 'เสร็จสิ้น' : 'ยังไม่เสร็จ'}
            </span>
          </div>

          <div className="status-item">
            <span className="status-label">🔧 อุปกรณ์:</span>
            <span className={`status-value ${dashboardStats.equipmentCount > 0 ? 'complete' : 'incomplete'}`}>
              {dashboardStats.equipmentCount > 0 ? `${dashboardStats.equipmentCount} รายการ` : 'ยังไม่มี'}
            </span>
          </div>

          <div className="status-item">
            <span className="status-label">🌟 ความสมบูรณ์รวม:</span>
            <span className="status-value">
              {Math.round((dashboardStats.profileComplete + dashboardStats.fitnessComplete + (dashboardStats.equipmentCount > 0 ? 100 : 0)) / 3)}%
            </span>
          </div>
        </div>
      </div>

      {/* Tips & Recommendations */}
      <div className="tips-section">
        <h3>💡 เคล็ดลับและคำแนะนำ</h3>
        <div className="tips-list">
          {dashboardStats.profileComplete < 100 && (
            <div className="tip-item">
              <span className="tip-icon">👤</span>
              <p>เพิ่มข้อมูลส่วนตัวให้ครบถ้วนเพื่อสร้างความน่าเชื่อถือ</p>
            </div>
          )}

          {dashboardStats.hasFitness && !fitnessData?.fit_image && (
            <div className="tip-item">
              <span className="tip-icon">📸</span>
              <p>เพิ่มรูปภาพฟิตเนสเพื่อดึงดูดลูกค้า</p>
            </div>
          )}

          {dashboardStats.equipmentCount < 5 && dashboardStats.hasFitness && (
            <div className="tip-item">
              <span className="tip-icon">🔧</span>
              <p>เพิ่มอุปกรณ์อย่างน้อย 5 รายการเพื่อเพิ่มความน่าสนใจ</p>
            </div>
          )}

          {dashboardStats.hasFitness && !fitnessData?.fit_location && (
            <div className="tip-item">
              <span className="tip-icon">📍</span>
              <p>เพิ่มตำแหน่งพิกัดเพื่อให้ลูกค้าหาฟิตเนสได้ง่าย</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      {(fitnessData || equipmentList?.length > 0) && (
        <div className="recent-activity">
          <h3>📋 กิจกรรมล่าสุด</h3>
          <div className="activity-list">
            {fitnessData && (
              <div className="activity-item">
                <span className="activity-icon">🏋️</span>
                <div className="activity-content">
                  <p>ฟิตเนส "{fitnessData.fit_name}" - อัปเดตล่าสุด</p>
                  <small>{fitnessData.updated_at ? new Date(fitnessData.updated_at).toLocaleDateString('th-TH') : 'ไม่ทราบวันที่'}</small>
                </div>
              </div>
            )}

            {equipmentList?.slice(0, 3).map((equipment) => (
              <div key={equipment.em_id} className="activity-item">
                <span className="activity-icon">🔧</span>
                <div className="activity-content">
                  <p>เพิ่มอุปกรณ์ "{equipment.em_name}"</p>
                  <small>{new Date(equipment.created_at).toLocaleDateString('th-TH')}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerDashboard;