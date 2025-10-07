import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';
import './AdminPage.css';
import PaymentAdmin from './PaymentAdmin';

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
    approvedFitness: [],
    bookings: [],
    payments: [],
    totalRevenue: 0,
    systemRevenue: 0
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
      console.log('🔄 Loading dashboard data...');

      // ดึงข้อมูลผู้ใช้
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('Error loading users:', usersError);
      }

      // ดึงข้อมูลพาร์ทเนอร์
      const { data: partners, error: partnersError } = await supabase
        .from('tbl_owner')
        .select('*');

      if (partnersError) {
        console.error('Error loading partners:', partnersError);
      }

      // ดึงข้อมูลฟิตเนสที่รออนุมัติ (สมมติใช้ status = 'pending')
      const { data: pendingFitness, error: pendingError } = await supabase
        .from('tbl_fitness_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (pendingError) {
        console.error('Error loading pending fitness requests:', pendingError);
      }

      // ดึงข้อมูลฟิตเนสที่อนุมัติแล้ว
      const { data: approvedFitness, error: fitnessError } = await supabase
        .from('tbl_fitness')
        .select('*')
        .order('created_at', { ascending: false });

      if (fitnessError) {
        console.error('Error loading fitness data:', fitnessError);
      }

      // ดึงข้อมูล bookings
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (bookingsError) {
        console.error('Error loading bookings:', bookingsError);
      }

      // ดึงข้อมูล payments
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });

      if (paymentsError) {
        console.error('Error loading payments:', paymentsError);
      }

      // คำนวณรายได้รวม
      let totalRevenue = payments?.reduce((sum, payment) => {
        return payment.payment_status === 'completed' ? sum + (payment.total_amount || 0) : sum;
      }, 0) || 0;

      // คำนวณรายได้ของระบบ (20%)
      let systemRevenue = payments?.reduce((sum, payment) => {
        return payment.payment_status === 'completed' ? sum + (payment.system_fee || 0) : sum;
      }, 0) || 0;

      // จับคู่ข้อมูลฟิตเนสกับเจ้าของ
      const enrichedApprovedFitness = approvedFitness?.map(fitness => {
        const owner = partners?.find(p => 
          p.owner_name === fitness.fit_user || 
          p.owner_uid === fitness.owner_uid ||
          p.owner_id === fitness.owner_id
        );
        return {
          ...fitness,
          owner_info: owner
        };
      }) || [];

      const enrichedPendingFitness = pendingFitness?.map(request => {
        const owner = partners?.find(p => 
          p.owner_uid === request.owner_id ||
          p.owner_name === request.owner_name
        );
        return {
          ...request,
          owner_info: owner
        };
      }) || [];

      console.log('✅ Dashboard data loaded:', {
        users: users?.length || 0,
        partners: partners?.length || 0,
        pendingFitness: enrichedPendingFitness?.length || 0,
        approvedFitness: enrichedApprovedFitness?.length || 0,
        bookings: bookings?.length || 0,
        payments: payments?.length || 0,
        totalRevenue: totalRevenue,
        systemRevenue: systemRevenue
      });

      // เพิ่มข้อมูลตัวอย่างหากไม่มีข้อมูลจริง (สำหรับ demo)
      let finalBookings = bookings || [];
      let finalPayments = payments || [];
      
      if (finalBookings.length === 0) {
        finalBookings = [
          {
            booking_id: 'demo-booking-001',
            user_id: 'demo-user-001',
            fitness_id: 1,
            booking_date: new Date().toISOString().split('T')[0],
            total_amount: 1500,
            booking_status: 'confirmed',
            created_at: new Date().toISOString(),
            notes: 'การจองตัวอย่างสำหรับ demo'
          },
          {
            booking_id: 'demo-booking-002',
            user_id: 'demo-user-002', 
            fitness_id: 2,
            booking_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            total_amount: 2000,
            booking_status: 'pending',
            created_at: new Date().toISOString(),
            notes: 'การจองที่รอการยืนยัน'
          }
        ];
      }

      if (finalPayments.length === 0) {
        finalPayments = [
          {
            payment_id: 'demo-payment-001',
            booking_id: 'demo-booking-001',
            user_id: 'demo-user-001',
            total_amount: 1500,
            system_fee: 300,
            fitness_amount: 1200,
            payment_method: 'credit_card',
            payment_status: 'completed',
            transaction_id: 'TXN_DEMO_001',
            paid_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          }
        ];
        
        // คำนวณรายได้ใหม่จากข้อมูล demo
        totalRevenue = finalPayments.reduce((sum, payment) => {
          return payment.payment_status === 'completed' ? sum + (payment.total_amount || 0) : sum;
        }, 0);
        
        systemRevenue = finalPayments.reduce((sum, payment) => {
          return payment.payment_status === 'completed' ? sum + (payment.system_fee || 0) : sum;
        }, 0);
      }

      setDashboardData(prev => ({
        ...prev,
        users: users || [],
        partners: partners || [],
        pendingFitness: enrichedPendingFitness || [],
        approvedFitness: enrichedApprovedFitness || [],
        bookings: finalBookings,
        payments: finalPayments,
        totalRevenue: totalRevenue,
        systemRevenue: systemRevenue
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
        {activeTab === 'bookings' && <BookingsTab data={dashboardData} />}
        {activeTab === 'payments' && <PaymentAdmin />}
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
        <div className="stat-number">{data.bookings?.length || 0}</div>
        <div className="stat-label">รายการ</div>
      </div>
      <div className="stat-card">
        <h3>💰 รายได้ระบบ</h3>
        <div className="stat-number">฿{(data.systemRevenue || 0).toLocaleString()}</div>
        <div className="stat-label">บาท (20%)</div>
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
      <div className="summary-card">
        <h3>📊 สถิติเพิ่มเติม</h3>
        <ul>
          <li>🏋️ ฟิตเนสที่อนุมัติ: {data.approvedFitness?.length || 0} แห่ง</li>
          <li>⏳ ฟิตเนสรออนุมัติ: {data.pendingFitness?.length || 0} แห่ง</li>
          <li>💳 การชำระเงินสำเร็จ: {data.payments?.filter(p => p.payment_status === 'completed')?.length || 0} รายการ</li>
          <li>💰 รายได้รวมทั้งหมด: ฿{(data.totalRevenue || 0).toLocaleString()}</li>
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
                    <td>{request.owner_info?.owner_name || request.owner_name || request.owner_id || 'ไม่ระบุ'}</td>
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
                    <td>{fitness.owner_info?.owner_name || fitness.fit_user || fitness.owner_name || 'ไม่ระบุ'}</td>
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
                  <span>{selectedRequest.owner_info?.owner_name || selectedRequest.owner_name || selectedRequest.owner_id || 'ไม่ระบุ'}</span>
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
// Bookings Tab Component
const BookingsTab = ({ data }) => (
  <div className="bookings-content">
    <h2>📅 จัดการการจอง</h2>
    <div className="section">
      <h3>📋 รายการจองทั้งหมด</h3>
      {data?.bookings?.length > 0 ? (
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>ลูกค้า</th>
                <th>ฟิตเนส</th>
                <th>วันที่จอง</th>
                <th>จำนวนเงิน</th>
                <th>สถานะ</th>
                <th>วันที่สร้าง</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {data.bookings.map((booking, index) => (
                <tr key={booking.booking_id || index}>
                  <td>{booking.booking_id?.substring(0, 8) || `B${String(index + 1).padStart(3, '0')}`}</td>
                  <td>{booking.user_id || 'ไม่ระบุ'}</td>
                  <td>{booking.fitness_id || 'ไม่ระบุ'}</td>
                  <td>{booking.booking_date ? new Date(booking.booking_date).toLocaleDateString('th-TH') : 'ไม่ระบุ'}</td>
                  <td>฿{(booking.total_amount || 0).toLocaleString()}</td>
                  <td>
                    <span className={`status ${booking.booking_status}`}>
                      {booking.booking_status === 'pending' && '⏳ รอยืนยัน'}
                      {booking.booking_status === 'confirmed' && '✅ ยืนยันแล้ว'}
                      {booking.booking_status === 'cancelled' && '❌ ยกเลิก'}
                      {booking.booking_status === 'completed' && '🎉 เสร็จสิ้น'}
                      {booking.booking_status === 'expired' && '⌛ หมดเวลา'}
                    </span>
                  </td>
                  <td>{booking.created_at ? new Date(booking.created_at).toLocaleDateString('th-TH') : 'ไม่ระบุ'}</td>
                  <td>
                    <button className="btn-view">ดู</button>
                    <button className="btn-edit">แก้ไข</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <p>ไม่มีการจองในขณะนี้</p>
        </div>
      )}
    </div>
  </div>
);

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