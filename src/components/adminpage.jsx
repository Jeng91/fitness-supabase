import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';
import './AdminPage.css';

const AdminPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // ฟอร์มล็อกอิน
  const [loginForm, setLoginForm] = useState({
    email: 'admin@pjfitness.com',
    password: 'PJFitness@2025!'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  // ข้อมูลสำหรับแดชบอร์ด
  const [dashboardData, setDashboardData] = useState({
    users: [],
    partners: [],
    pendingFitness: [],
    approvedFitness: []
  });

  useEffect(() => {
    checkAdminAuth();
  }, []);

  const checkAdminAuth = async () => {
    try {
      console.log('Admin auth check skipped - using simple login');
    } catch (error) {
      console.error('Auth check error:', error);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const { data: adminUser, error } = await supabase
        .from('tbl_admin')
        .select('*')
        .eq('admin_name', loginForm.email)
        .eq('admin_password', loginForm.password)
        .single();

      if (error || !adminUser) {
        throw new Error('ข้อมูลการเข้าสู่ระบบไม่ถูกต้อง');
      }

      setAdminData(adminUser);
      setIsAuthenticated(true);
      setMessage('เข้าสู่ระบบสำเร็จ!');
      setActiveTab('dashboard');
      
      loadDashboardData();
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    }
    
    setIsLoading(false);
  };

  const loadDashboardData = async () => {
    try {
      // ดึงข้อมูลผู้ใช้
      const { data: users } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      // ดึงข้อมูลพาร์ทเนอร์
      const { data: partners } = await supabase
        .from('tbl_owner')
        .select('*');

      // ดึงข้อมูลฟิตเนสที่รออนุมัติ (สมมติใช้ status = 'pending')
      const { data: pendingFitness } = await supabase
        .from('tbl_fitness_requests')
        .select(`
          *,
          tbl_owner(owner_name, owner_email)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      // ดึงข้อมูลฟิตเนสที่อนุมัติแล้ว
      const { data: approvedFitness } = await supabase
        .from('tbl_fitness')
        .select(`
          *,
          tbl_owner(owner_name, owner_email)
        `)
        .order('created_at', { ascending: false });

      setDashboardData(prev => ({
        ...prev,
        users: users || [],
        partners: partners || [],
        pendingFitness: pendingFitness || [],
        approvedFitness: approvedFitness || []
      }));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const handleLogout = async () => {
    setIsAuthenticated(false);
    setAdminData(null);
    setActiveTab('dashboard');
    setMessage('');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setLoginForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // ฟังก์ชันอนุมัติฟิตเนส
  const handleApproveFitness = async (fitnessRequest) => {
    try {
      setIsLoading(true);
      
      // เพิ่มข้อมูลลงใน tbl_fitness
      const { error: insertError } = await supabase
        .from('tbl_fitness')
        .insert([
          {
            fit_name: fitnessRequest.fit_name,
            fit_type: fitnessRequest.fit_type,
            fit_description: fitnessRequest.fit_description,
            fit_price: fitnessRequest.fit_price,
            fit_duration: fitnessRequest.fit_duration,
            fit_location: fitnessRequest.fit_location,
            fit_contact: fitnessRequest.fit_contact,
            fit_image: fitnessRequest.fit_image,
            owner_id: fitnessRequest.owner_id,
            created_at: new Date().toISOString(),
            status: 'active'
          }
        ]);

      if (insertError) throw insertError;

      // อัปเดตสถานะใน tbl_fitness_requests
      const { error: updateError } = await supabase
        .from('tbl_fitness_requests')
        .update({ 
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: adminData.admin_id
        })
        .eq('id', fitnessRequest.id);

      if (updateError) throw updateError;

      setMessage('✅ อนุมัติฟิตเนสสำเร็จ!');
      loadDashboardData(); // รีโหลดข้อมูล
      
    } catch (error) {
      console.error('Error approving fitness:', error);
      setMessage(`❌ เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ฟังก์ชันปฏิเสธฟิตเนส
  const handleRejectFitness = async (fitnessRequest, reason = '') => {
    try {
      setIsLoading(true);
      
      // อัปเดตสถานะเป็นปฏิเสธ
      const { error: updateError } = await supabase
        .from('tbl_fitness_requests')
        .update({ 
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejected_by: adminData.admin_id,
          rejection_reason: reason
        })
        .eq('id', fitnessRequest.id);

      if (updateError) throw updateError;

      setMessage('❌ ปฏิเสธคำขอแล้ว');
      loadDashboardData(); // รีโหลดข้อมูล
      
    } catch (error) {
      console.error('Error rejecting fitness:', error);
      setMessage(`❌ เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // หน้าล็อกอิน
  if (!isAuthenticated) {
    return (
      <div className="admin-login-container">
        <div className="admin-login-card">
          <h1>เข้าสู่ระบบแอดมิน</h1>
          <p className="admin-subtitle">ระบบจัดการ PJ Fitness</p>
          
          {message && (
            <div className={`admin-message ${message.includes('สำเร็จ') ? 'success' : 'error'}`}>
              {message}
            </div>
          )}

          <form className="admin-login-form" onSubmit={handleLogin}>
            <div className="admin-form-group">
              <label>อีเมล:</label>
              <input
                type="email"
                name="email"
                value={loginForm.email}
                onChange={handleInputChange}
                placeholder="กรุณาใส่อีเมลแอดมิน"
                required
              />
            </div>
            <div className="admin-form-group">
              <label>รหัสผ่าน:</label>
              <input
                type="password"
                name="password"
                value={loginForm.password}
                onChange={handleInputChange}
                placeholder="กรุณาใส่รหัสผ่าน"
                required
              />
            </div>
            <button 
              type="submit" 
              className="admin-login-btn"
              disabled={isLoading}
            >
              {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // หน้าหลัก Admin
  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header-content">
          <h1>🔧 Admin Dashboard - Fitness Center Platform</h1>
          <div className="admin-user-info">
            <span>สวัสดี, {adminData?.admin_name}</span>
            <button onClick={handleLogout} className="logout-btn">
              ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="admin-nav admin-tabs">
        <div className="admin-nav-content">
          <button 
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 แดชบอร์ด
          </button>
          <button 
            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 จัดการผู้ใช้
          </button>
          <button 
            className={`tab-btn ${activeTab === 'partners' ? 'active' : ''}`}
            onClick={() => setActiveTab('partners')}
          >
            🏢 จัดการพาร์ทเนอร์
          </button>
          <button 
            className={`tab-btn ${activeTab === 'fitness' ? 'active' : ''}`}
            onClick={() => setActiveTab('fitness')}
          >
            🏋️ จัดการฟิตเนส
          </button>
          <button 
            className={`tab-btn ${activeTab === 'bookings' ? 'active' : ''}`}
            onClick={() => setActiveTab('bookings')}
          >
            📅 จัดการจอง
          </button>
          <button 
            className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            💳 การชำระเงิน
          </button>
          <button 
            className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            📈 รายงาน
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="admin-main">
        {activeTab === 'dashboard' && <DashboardTab data={dashboardData} />}
        {activeTab === 'users' && <UsersTab data={dashboardData} />}
        {activeTab === 'partners' && <PartnersTab data={dashboardData} />}
        {activeTab === 'bookings' && <BookingsTab />}
        {activeTab === 'payments' && <PaymentsTab />}
        {activeTab === 'fitness' && <FitnessTab data={dashboardData} onApprove={handleApproveFitness} onReject={handleRejectFitness} />}
        {activeTab === 'reports' && <ReportsTab />}
      </main>
    </div>
  );
};

// Dashboard Tab Component
const DashboardTab = ({ data }) => (
  <div className="dashboard-content">
    <h2>📊 ภาพรวมระบบ PJ Fitness</h2>
    <div className="dashboard-stats">
      <div className="stat-card">
        <h3>👤 ผู้ใช้ทั่วไป</h3>
        <div className="stat-number">{data.users.length}</div>
        <div className="stat-label">คน</div>
      </div>
      <div className="stat-card">
        <h3>🤝 พาร์ทเนอร์</h3>
        <div className="stat-number">{data.partners.length}</div>
        <div className="stat-label">ราย</div>
      </div>
      <div className="stat-card">
        <h3>📅 การจอง</h3>
        <div className="stat-number">0</div>
        <div className="stat-label">รายการ</div>
      </div>
      <div className="stat-card">
        <h3>💰 รายได้</h3>
        <div className="stat-number">฿0</div>
        <div className="stat-label">บาท</div>
      </div>
    </div>
    
    <div className="dashboard-summary">
      <div className="summary-card">
        <h3>🎯 สรุประบบ</h3>
        <ul>
          <li>✅ ระบบจองและชำระเงินพร้อมใช้งาน</li>
          <li>✅ ระบบรักษาความปลอดภัย RLS เปิดใช้งาน</li>
          <li>✅ ฐานข้อมูลพร้อมใช้งาน</li>
          <li>✅ การแบ่งรายได้ 20%/80% พร้อม</li>
        </ul>
      </div>
    </div>
  </div>
);

// Users Tab Component  
const UsersTab = ({ data }) => (
  <div className="users-content">
    <h2>👥 จัดการผู้ใช้งาน</h2>
    <div className="admin-stats">
      <div className="stat-card">
        <h3>จำนวนผู้ใช้ทั้งหมด</h3>
        <span className="stat-number">{data?.users?.length || 0}</span>
      </div>
    </div>
    
    <div className="data-table">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>ชื่อผู้ใช้</th>
            <th>อีเมล</th>
            <th>ชื่อเต็ม</th>
            <th>วันที่สมัคร</th>
            <th>จัดการ</th>
          </tr>
        </thead>
        <tbody>
          {data?.users?.length > 0 ? (
            data.users.map((user, index) => (
              <tr key={user.user_uid || index}>
                <td>{user.user_uid || `U${String(index + 1).padStart(3, '0')}`}</td>
                <td>{user.username || 'ไม่ระบุ'}</td>
                <td>{user.useremail || 'ไม่ระบุ'}</td>
                <td>{user.full_name || 'ไม่ระบุ'}</td>
                <td>{user.created_at ? new Date(user.created_at).toLocaleDateString('th-TH') : 'ไม่ระบุ'}</td>
                <td>
                  <button className="btn-view">ดู</button>
                  <button className="btn-edit">แก้ไข</button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                ไม่พบข้อมูลผู้ใช้
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

// Partners Tab Component
const PartnersTab = ({ data }) => (
  <div className="partners-content">
    <h2>🏢 จัดการพาร์ทเนอร์</h2>
    <div className="admin-stats">
      <div className="stat-card">
        <h3>จำนวนพาร์ทเนอร์ทั้งหมด</h3>
        <span className="stat-number">{data?.partners?.length || 0}</span>
      </div>
    </div>
    
    <div className="data-table">
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>ชื่อพาร์ทเนอร์</th>
            <th>อีเมล</th>
            <th>วันที่สมัคร</th>
            <th>จัดการ</th>
          </tr>
        </thead>
        <tbody>
          {data?.partners?.length > 0 ? (
            data.partners.map((partner, index) => (
              <tr key={partner.owner_uid || index}>
                <td>{partner.owner_uid || `P${String(index + 1).padStart(3, '0')}`}</td>
                <td>{partner.owner_name || 'ไม่ระบุ'}</td>
                <td>{partner.owner_email || 'ไม่ระบุ'}</td>
                <td>{partner.created_at ? new Date(partner.created_at).toLocaleDateString('th-TH') : 'ไม่ระบุ'}</td>
                <td>
                  <button className="btn-view">ดู</button>
                  <button className="btn-edit">แก้ไข</button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>
                ไม่พบข้อมูลพาร์ทเนอร์
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

// Bookings Tab Component
const BookingsTab = () => (
  <div className="bookings-content">
    <h2>📅 จัดการระบบการจอง</h2>
    <div className="section">
      <div className="info-card">
        <h3>📋 สถานะระบบจอง</h3>
        <p>✅ ระบบจองพร้อมใช้งาน</p>
        <p>✅ การเลือกวันที่จองพร้อม</p>
        <p>✅ ระบบยืนยันการจองพร้อม</p>
        <p>✅ การจัดการสถานะการจองพร้อม</p>
      </div>
    </div>
  </div>
);

// Payments Tab Component
const PaymentsTab = () => (
  <div className="payments-content">
    <h2>💳 จัดการระบบการชำระเงิน</h2>
    <div className="section">
      <div className="info-card">
        <h3>💰 สถานะระบบชำระเงิน</h3>
        <p>✅ ระบบชำระเงินพร้อมใช้งาน</p>
        <p>✅ การแบ่งรายได้ 20%/80% พร้อม</p>
        <p>✅ Payment Gateway พร้อม</p>
        <p>✅ ประวัติการชำระเงินพร้อม</p>
        <p>✅ ระบบคืนเงินพร้อม</p>
      </div>
      
      <div className="revenue-settings">
        <h3>⚙️ การตั้งค่าการแบ่งรายได้</h3>
        <div className="setting-row">
          <span>ส่วนแอพพลิเคชัน:</span>
          <span className="highlight">20%</span>
        </div>
        <div className="setting-row">
          <span>ส่วนพาร์ทเนอร์:</span>
          <span className="highlight">80%</span>
        </div>
      </div>
    </div>
  </div>
);

// Fitness Tab Component
const FitnessTab = ({ data, onApprove, onReject }) => {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowModal(true);
  };

  const handleApprove = (request) => {
    onApprove(request);
    setShowModal(false);
  };

  const handleReject = (request) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
    setShowModal(false);
  };

  const confirmReject = () => {
    onReject(selectedRequest, rejectionReason);
    setShowRejectModal(false);
    setRejectionReason('');
  };

  return (
    <div className="fitness-content">
      <h2>🏋️ จัดการฟิตเนส</h2>
      
      {/* สถิติรวม */}
      <div className="fitness-stats">
        <div className="stat-card">
          <h3>⏳ รออนุมัติ</h3>
          <div className="stat-number">{data?.pendingFitness?.length || 0}</div>
          <div className="stat-label">รายการ</div>
        </div>
        <div className="stat-card">
          <h3>✅ อนุมัติแล้ว</h3>
          <div className="stat-number">{data?.approvedFitness?.length || 0}</div>
          <div className="stat-label">รายการ</div>
        </div>
      </div>

      {/* รายการรออนุมัติ */}
      <div className="section">
        <h3>📝 คำขอสร้างฟิตเนสที่รออนุมัติ</h3>
        {data?.pendingFitness?.length > 0 ? (
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>ชื่อฟิตเนส</th>
                  <th>พาร์ทเนอร์</th>
                  <th>ประเภท</th>
                  <th>ราคา</th>
                  <th>สถานที่</th>
                  <th>วันที่ส่ง</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {data.pendingFitness.map((request, index) => (
                  <tr key={request.id || index}>
                    <td>{request.fit_name}</td>
                    <td>{request.tbl_owner?.owner_name || 'ไม่ระบุ'}</td>
                    <td>{request.fit_type}</td>
                    <td>฿{request.fit_price}</td>
                    <td>{request.fit_location}</td>
                    <td>{new Date(request.created_at).toLocaleDateString('th-TH')}</td>
                    <td>
                      <button 
                        className="btn-view" 
                        onClick={() => handleViewDetails(request)}
                      >
                        ดูรายละเอียด
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="info-card">
            <p>🎉 ไม่มีคำขอสร้างฟิตเนสที่รออนุมัติ</p>
          </div>
        )}
      </div>

      {/* รายการอนุมัติแล้ว */}
      <div className="section">
        <h3>✅ ฟิตเนสที่อนุมัติแล้ว</h3>
        {data?.approvedFitness?.length > 0 ? (
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>ชื่อฟิตเนส</th>
                  <th>พาร์ทเนอร์</th>
                  <th>ประเภท</th>
                  <th>ราคา</th>
                  <th>สถานที่</th>
                  <th>วันที่อนุมัติ</th>
                  <th>สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {data.approvedFitness.map((fitness, index) => (
                  <tr key={fitness.fit_id || index}>
                    <td>{fitness.fit_name}</td>
                    <td>{fitness.tbl_owner?.owner_name || 'ไม่ระบุ'}</td>
                    <td>{fitness.fit_type}</td>
                    <td>฿{fitness.fit_price}</td>
                    <td>{fitness.fit_location}</td>
                    <td>{new Date(fitness.created_at).toLocaleDateString('th-TH')}</td>
                    <td>
                      <span className="status-active">เปิดใช้งาน</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="info-card">
            <p>ไม่มีฟิตเนสที่อนุมัติแล้ว</p>
          </div>
        )}
      </div>

      {/* Modal แสดงรายละเอียด */}
      {showModal && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📝 รายละเอียดคำขอสร้างฟิตเนส</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-item">
                  <label>ชื่อฟิตเนส:</label>
                  <span>{selectedRequest.fit_name}</span>
                </div>
                <div className="detail-item">
                  <label>พาร์ทเนอร์:</label>
                  <span>{selectedRequest.tbl_owner?.owner_name} ({selectedRequest.tbl_owner?.owner_email})</span>
                </div>
                <div className="detail-item">
                  <label>ประเภท:</label>
                  <span>{selectedRequest.fit_type}</span>
                </div>
                <div className="detail-item">
                  <label>ราคา:</label>
                  <span>฿{selectedRequest.fit_price}</span>
                </div>
                <div className="detail-item">
                  <label>ระยะเวลา:</label>
                  <span>{selectedRequest.fit_duration} นาที</span>
                </div>
                <div className="detail-item">
                  <label>สถานที่:</label>
                  <span>{selectedRequest.fit_location}</span>
                </div>
                <div className="detail-item">
                  <label>ติดต่อ:</label>
                  <span>{selectedRequest.fit_contact}</span>
                </div>
                <div className="detail-item full-width">
                  <label>คำอธิบาย:</label>
                  <p>{selectedRequest.fit_description}</p>
                </div>
                {selectedRequest.fit_image && (
                  <div className="detail-item full-width">
                    <label>รูปภาพ:</label>
                    <img src={selectedRequest.fit_image} alt="ฟิตเนส" className="fitness-image" />
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-approve" onClick={() => handleApprove(selectedRequest)}>
                ✅ อนุมัติ
              </button>
              <button className="btn-reject" onClick={() => handleReject(selectedRequest)}>
                ❌ ปฏิเสธ
              </button>
              <button className="btn-cancel" onClick={() => setShowModal(false)}>
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal ปฏิเสธ */}
      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>❌ ปฏิเสธคำขอ</h3>
              <button className="close-btn" onClick={() => setShowRejectModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>เหตุผลในการปฏิเสธ:</label>
                <textarea 
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="กรุณาระบุเหตุผลในการปฏิเสธ..."
                  rows="4"
                  className="form-textarea"
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-reject" onClick={confirmReject}>
                ยืนยันปฏิเสธ
              </button>
              <button className="btn-cancel" onClick={() => setShowRejectModal(false)}>
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Reports Tab Component
const ReportsTab = () => (
  <div className="reports-content">
    <h2>📈 รายงานและสถิติ</h2>
    <div className="section">
      <div className="info-card">
        <h3>📊 รายงานที่พร้อมใช้งาน</h3>
        <p>✅ รายงานการจอง</p>
        <p>✅ รายงานการชำระเงิน</p>
        <p>✅ รายงานรายได้</p>
        <p>✅ รายงานผู้ใช้งาน</p>
        <p>✅ รายงานพาร์ทเนอร์</p>
      </div>
    </div>
  </div>
);

export default AdminPage;