import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';
import './AdminPage.css';
import PaymentAdmin from './PaymentAdmin';
import PaymentApproval from './PaymentApproval';
import ApprovedPayments from './ApprovedPayments';
import { SYSTEM_BANK_ACCOUNTS } from '../utils/paymentConfig';

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
    pendingPayments: [], // เพิ่มข้อมูลการชำระเงินรอการอนุมัติ
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
      // Auth check implementation
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
        console.error('❌ Error loading partners:', partnersError);
      }

      // เชื่อมข้อมูลพาร์ทเนอร์กับข้อมูลฟิตเนส
      let enrichedPartners = [];
      if (partners && partners.length > 0) {
        for (const partner of partners) {
          // ดึงข้อมูลฟิตเนสของพาร์ทเนอร์
          const { data: fitnessData } = await supabase
            .from('tbl_fitness')
            .select('fit_phone, fit_address, fit_name')
            .eq('fit_user', partner.owner_name)
            .single();

          const enrichedPartner = {
            ...partner,
            fit_phone: fitnessData?.fit_phone || null,
            fit_address: fitnessData?.fit_address || null,
            fit_name: fitnessData?.fit_name || null
          };

          enrichedPartners.push(enrichedPartner);
        }
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

      // ดึงข้อมูลการชำระเงินรอการอนุมัติ
        // ดึง pending_payments และ profiles แยก แล้ว join ฝั่ง client
        const { data: pendingPayments, error: pendingPaymentsError } = await supabase
          .from('pending_payments')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false });

        if (pendingPaymentsError) {
          console.error('Error loading pending payments:', pendingPaymentsError);
        }

        // ดึง users/profiles ทั้งหมด (ใช้ users ที่ดึงมาก่อนหน้า)
        // Join ข้อมูล user/profiles กับ pending_payments ด้วย user_id
        let pendingPaymentsWithProfile = [];
        if (pendingPayments && users) {
          pendingPaymentsWithProfile = pendingPayments.map(payment => {
            const userProfile = users.find(u => u.user_uid === payment.user_id);
            return {
              ...payment,
              profile: userProfile || null
            };
          });
        } else {
          pendingPaymentsWithProfile = pendingPayments || [];
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
        const owner = enrichedPartners?.find(p => 
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
        const owner = enrichedPartners?.find(p => 
          p.owner_uid === request.owner_id ||
          p.owner_name === request.owner_name
        );
        return {
          ...request,
          owner_info: owner
        };
      }) || [];

      // เพิ่มข้อมูลตัวอย่างหากไม่มีข้อมูลจริง (สำหรับ demo)
      let finalPartners = (enrichedPartners || []).filter(p => !(p.owner_id?.includes('demo') || p.owner_uid?.includes('DEMO')));

      let finalBookings = bookings || [];
      let finalPayments = payments || [];
      // ใช้ข้อมูลจริงจาก Supabase เท่านั้น

      setDashboardData(prev => ({
        ...prev,
        users: users || [],
        partners: finalPartners || [],
        pendingFitness: enrichedPendingFitness || [],
        approvedFitness: enrichedApprovedFitness || [],
  pendingPayments: pendingPaymentsWithProfile || [], // เพิ่มข้อมูลการชำระเงินรอการอนุมัติ
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

      {/* Content Container with Sidebar */}
      <div className="admin-content-wrapper">
        {/* Sidebar Navigation */}
        <aside className="admin-sidebar">
          <div className="sidebar-header">
            <h3>เมนูผู้ดูแลระบบ</h3>
          </div>
          <nav className="sidebar-nav">
            <button 
              className={`sidebar-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <span className="sidebar-icon">📊</span>
              <span className="sidebar-text">แดชบอร์ด</span>
              <span className="sidebar-arrow">›</span>
            </button>
            <button 
              className={`sidebar-item ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <span className="sidebar-icon">👥</span>
              <span className="sidebar-text">จัดการผู้ใช้</span>
              <span className="sidebar-arrow">›</span>
            </button>
            <button 
              className={`sidebar-item ${activeTab === 'partners' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('partners');
                loadDashboardData();
              }}
            >
              <span className="sidebar-icon">🏢</span>
              <span className="sidebar-text">จัดการพาร์ทเนอร์</span>
              <span className="sidebar-arrow">›</span>
            </button>
            <button 
              className={`sidebar-item ${activeTab === 'fitness' ? 'active' : ''}`}
              onClick={() => setActiveTab('fitness')}
            >
              <span className="sidebar-icon">🏋️</span>
              <span className="sidebar-text">จัดการฟิตเนส</span>
              <span className="sidebar-arrow">›</span>
            </button>
            <button 
              className={`sidebar-item ${activeTab === 'bookings' ? 'active' : ''}`}
              onClick={() => setActiveTab('bookings')}
            >
              <span className="sidebar-icon">📅</span>
              <span className="sidebar-text">จัดการจอง</span>
              <span className="sidebar-arrow">›</span>
            </button>
            <button 
              className={`sidebar-item ${activeTab === 'approval' ? 'active' : ''}`}
              onClick={() => setActiveTab('approval')}
            >
              <span className="sidebar-icon">🔍</span>
              <span className="sidebar-text">อนุมัติการชำระเงิน</span>
              <span className="sidebar-arrow">›</span>
            </button>
            <button 
              className={`sidebar-item ${activeTab === 'approved' ? 'active' : ''}`}
              onClick={() => setActiveTab('approved')}
            >
              <span className="sidebar-icon">✅</span>
              <span className="sidebar-text">รายการที่อนุมัติแล้ว</span>
              <span className="sidebar-arrow">›</span>
            </button>
            <button 
              className={`sidebar-item ${activeTab === 'bank' ? 'active' : ''}`}
              onClick={() => setActiveTab('bank')}
            >
              <span className="sidebar-icon">🏦</span>
              <span className="sidebar-text">บัญชีระบบ</span>
              <span className="sidebar-arrow">›</span>
            </button>
            <button 
              className={`sidebar-item ${activeTab === 'partnerAccounts' ? 'active' : ''}`}
              onClick={() => setActiveTab('partnerAccounts')}
            >
              <span className="sidebar-icon">🤝</span>
              <span className="sidebar-text">บัญชีพาร์ทเนอร์</span>
              <span className="sidebar-arrow">›</span>
            </button>
            <button 
              className={`sidebar-item ${activeTab === 'reports' ? 'active' : ''}`}
              onClick={() => setActiveTab('reports')}
            >
              <span className="sidebar-icon">📈</span>
              <span className="sidebar-text">รายงาน</span>
              <span className="sidebar-arrow">›</span>
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="admin-main">
          {activeTab === 'dashboard' && <DashboardTab data={dashboardData} setActiveTab={setActiveTab} />}
          {activeTab === 'users' && <UsersTab data={dashboardData} />}
          {activeTab === 'partners' && <PartnersTab data={dashboardData} onRefresh={loadDashboardData} />}
          {activeTab === 'bookings' && <BookingsTab data={dashboardData} />}
          {activeTab === 'payments' && <PaymentAdmin />}
          {activeTab === 'approval' && <PaymentApproval />}
          {activeTab === 'approved' && <ApprovedPayments />}
          {activeTab === 'bank' && <BankAccountTab />}
          {activeTab === 'partnerAccounts' && <PartnerAccountsTab />}
          {activeTab === 'fitness' && <FitnessTab data={dashboardData} onApprove={handleApproveFitness} onReject={handleRejectFitness} />}
          {activeTab === 'reports' && <ReportsTab />}
        </main>
      </div>
    </div>
  );
};

// Dashboard Tab Component
const DashboardTab = ({ data, setActiveTab }) => (
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
        <h3>⏳ รอการอนุมัติ</h3>
        <div className="stat-number">{data.pendingPayments?.length || 0}</div>
        <div className="stat-label">รายการ</div>
      </div>
      <div className="stat-card">
        <h3>💰 รายได้ระบบ</h3>
        <div className="stat-number">฿{(data.systemRevenue || 0).toLocaleString()}</div>
        <div className="stat-label">บาท (20%)</div>
      </div>
    </div>
    
    {/* แสดงรายการชำระเงินรอการอนุมัติ */}
    <div className="dashboard-section">
      <h3>🔍 รายการชำระเงินรอการอนุมัติ</h3>
      {data.pendingPayments?.length > 0 ? (
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>ผู้ใช้</th>
                <th>จำนวนเงิน</th>
                <th>รายละเอียด</th>
                <th>วันที่ส่ง</th>
                <th>สถานะ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {data.pendingPayments.slice(0, 5).map((payment, index) => (
                <tr key={payment.id || index}>
                  <td>
                    <span className="transaction-id">{payment.transaction_id}</span>
                  </td>
                  <td>
                    <div className="user-info">
                      <div>{payment.profiles?.full_name || 'ไม่ระบุ'}</div>
                      <small>{payment.profiles?.useremail || ''}</small>
                    </div>
                  </td>
                  <td>
                    <span className="amount">฿{payment.amount?.toLocaleString()}</span>
                  </td>
                  <td>
                    <div className="description">{payment.description || 'ไม่ระบุ'}</div>
                  </td>
                  <td>
                    {new Date(payment.created_at).toLocaleDateString('th-TH')}
                  </td>
                  <td>
                    <span className="status pending">รอการอนุมัติ</span>
                  </td>
                  <td>
                    <button 
                      className="btn-view"
                      onClick={() => setActiveTab('approval')}
                      title="ไปหน้าอนุมัติการชำระเงิน"
                    >
                      อนุมัติ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.pendingPayments.length > 5 && (
            <div className="table-footer">
              <p>และอีก {data.pendingPayments.length - 5} รายการ...</p>
              <button 
                className="btn-view-all"
                onClick={() => setActiveTab('approval')}
              >
                ดูทั้งหมด
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="no-data">
          <div className="no-data-icon">✅</div>
          <h4>ไม่มีรายการชำระเงินรอการอนุมัติ</h4>
          <p>ทุกการชำระเงินได้รับการอนุมัติเรียบร้อยแล้ว</p>
        </div>
      )}
    </div>
    
    
  </div>
);

// Users Tab Component  
const UsersTab = ({ data }) => (
  <UsersTabWithModal data={data} />
);

// UsersTab with modal for view/edit
const UsersTabWithModal = ({ data }) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editForm, setEditForm] = useState({ username: '', useremail: '', full_name: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleView = (user) => {
    setSelectedUser(user);
    setShowDetailModal(true);
  };
  const handleEdit = (user) => {
    setSelectedUser(user);
    setEditForm({
      username: user.username || '',
      useremail: user.useremail || '',
      full_name: user.full_name || ''
    });
    setShowEditModal(true);
  };
  const handleDelete = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username: editForm.username,
          useremail: editForm.useremail,
          full_name: editForm.full_name,
          updated_at: new Date().toISOString()
        })
        .eq('user_uid', selectedUser.user_uid);
      if (error) throw error;
      alert('✅ บันทึกข้อมูลสำเร็จ!');
      setShowEditModal(false);
      setSelectedUser(null);
      window.location.reload();
    } catch (err) {
      alert('❌ เกิดข้อผิดพลาด: ' + err.message);
    }
    setIsSaving(false);
  };
  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_uid', selectedUser.user_uid);
      if (error) throw error;
      alert('✅ ลบข้อมูลผู้ใช้สำเร็จ!');
      setShowDeleteModal(false);
      setSelectedUser(null);
      window.location.reload();
    } catch (err) {
      alert('❌ เกิดข้อผิดพลาด: ' + err.message);
    }
    setIsDeleting(false);
  };
  return (
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
                  <td>{user.user_uid ? user.user_uid.substring(0,6) : `U${String(index + 1).padStart(3, '0')}`}</td>
                  <td>{user.username || 'ไม่ระบุ'}</td>
                  <td>{user.useremail || 'ไม่ระบุ'}</td>
                  <td>{user.full_name || 'ไม่ระบุ'}</td>
                  <td>{user.created_at ? new Date(user.created_at).toLocaleDateString('th-TH') : 'ไม่ระบุ'}</td>
                  <td>
                    <button className="btn-view" onClick={() => handleView(user)}>ดู</button>
                    <button className="btn-edit" onClick={() => handleEdit(user)}>แก้ไข</button>
                    <button className="btn-delete" style={{background:'#ffd700',color:'#333'}} onClick={() => handleDelete(user)}>ลบ</button>
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
      {/* Modal ดูข้อมูล */}
      {showDetailModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content user-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>👤 ข้อมูลผู้ใช้งาน</h3>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>ID:</label>
                <input type="text" value={selectedUser.user_uid} readOnly />
              </div>
              <div className="form-group">
                <label>ชื่อผู้ใช้:</label>
                <input type="text" value={selectedUser.username} readOnly />
              </div>
              <div className="form-group">
                <label>อีเมล:</label>
                <input type="text" value={selectedUser.useremail} readOnly />
              </div>
              <div className="form-group">
                <label>ชื่อเต็ม:</label>
                <input type="text" value={selectedUser.full_name} readOnly />
              </div>
              <div className="form-group">
                <label>วันที่สมัคร:</label>
                <input type="text" value={selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString('th-TH') : '-'} readOnly />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowDetailModal(false)}>ปิด</button>
            </div>
          </div>
        </div>
      )}
      {/* Modal แก้ไขข้อมูล */}
      {showEditModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content user-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ แก้ไขข้อมูลผู้ใช้งาน</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>ชื่อผู้ใช้:</label>
                  <input type="text" name="username" value={editForm.username} onChange={handleEditInputChange} required />
                </div>
                <div className="form-group">
                  <label>อีเมล:</label>
                  <input type="email" name="useremail" value={editForm.useremail} onChange={handleEditInputChange} required />
                </div>
                <div className="form-group">
                  <label>ชื่อเต็ม:</label>
                  <input type="text" name="full_name" value={editForm.full_name} onChange={handleEditInputChange} required />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-primary" type="submit" disabled={isSaving}>{isSaving ? 'กำลังบันทึก...' : 'บันทึก'}</button>
                <button className="btn-secondary" type="button" onClick={() => setShowEditModal(false)}>ยกเลิก</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal ลบข้อมูล */}
      {showDeleteModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content user-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ ลบข้อมูลผู้ใช้งาน</h3>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>คุณต้องการลบข้อมูลผู้ใช้ <b>{selectedUser.username}</b> นี้ใช่หรือไม่?</p>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" type="button" onClick={handleDeleteConfirm} disabled={isDeleting}>{isDeleting ? 'กำลังลบ...' : 'ลบข้อมูล'}</button>
              <button className="btn-secondary" type="button" onClick={() => setShowDeleteModal(false)}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// Partners Tab Component
const PartnersTab = ({ data, onRefresh }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editForm, setEditForm] = useState({
    owner_name: '',
    owner_email: '',
    owner_phone: '',
    owner_address: '',
    fit_phone: '',
    fit_address: '',
    fit_name: ''
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  const handleViewDetails = (partner) => {
    setSelectedPartner(partner);
    setShowDetailModal(true);
  };

  const handleEdit = (partner) => {
    setSelectedPartner(partner);
    setEditForm({
      owner_name: partner.owner_name || '',
      owner_email: partner.owner_email || '',
      owner_phone: partner.owner_phone || '',
      owner_address: partner.owner_address || '',
      fit_phone: partner.fit_phone || '',
      fit_address: partner.fit_address || '',
      fit_name: partner.fit_name || ''
    });
    setShowEditModal(true);
  };

  const handleDelete = (partner) => {
    setSelectedPartner(partner);
    setShowDeleteModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      // อัปเดตข้อมูลในฐานข้อมูล (ถ้าไม่ใช่ demo data)
      if (!selectedPartner.owner_id?.includes('demo')) {
        // อัปเดตข้อมูลเจ้าของใน tbl_owner
        const { error: ownerError } = await supabase
          .from('tbl_owner')
          .update({
            owner_name: editForm.owner_name,
            owner_email: editForm.owner_email,
            owner_phone: editForm.owner_phone,
            owner_address: editForm.owner_address,
            updated_at: new Date().toISOString()
          })
          .eq('owner_id', selectedPartner.owner_id);

        if (ownerError) throw ownerError;

        // อัปเดตข้อมูลฟิตเนสใน tbl_fitness
        const { error: fitnessError } = await supabase
          .from('tbl_fitness')
          .update({
            fit_name: editForm.fit_name,
            fit_phone: editForm.fit_phone,
            fit_address: editForm.fit_address,
            fit_user: editForm.owner_name, // อัปเดตชื่อเจ้าของด้วย
            updated_at: new Date().toISOString()
          })
          .eq('fit_user', selectedPartner.owner_name);

        if (fitnessError) {
          // Log error if needed for debugging
        }
      }

      alert('✅ อัปเดตข้อมูลสำเร็จ!');
      setShowEditModal(false);
      setSelectedPartner(null);
      await onRefresh();
    } catch (error) {
      console.error('Error updating partner:', error);
      alert(`❌ เกิดข้อผิดพลาด: ${error.message}`);
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      // ลบข้อมูลจากฐานข้อมูล (ถ้าไม่ใช่ demo data)
      if (!selectedPartner.owner_id?.includes('demo')) {
        const { error } = await supabase
          .from('tbl_owner')
          .delete()
          .eq('owner_id', selectedPartner.owner_id);

        if (error) throw error;
      }

      alert('✅ ลบพาร์ทเนอร์สำเร็จ!');
      setShowDeleteModal(false);
      setSelectedPartner(null);
      await onRefresh();
    } catch (error) {
      console.error('Error deleting partner:', error);
      alert(`❌ เกิดข้อผิดพลาด: ${error.message}`);
    }
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="partners-content">
      <div className="section-header">
        <h2>🏢 จัดการพาร์ทเนอร์</h2>
        <button 
          className="btn-refresh" 
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? '🔄 กำลังโหลด...' : '🔄 รีเฟรช'}
        </button>
      </div>
      
      <div className="admin-stats">
        <div className="stat-card">
          <h3>จำนวนพาร์ทเนอร์ทั้งหมด</h3>
          <span className="stat-number">{data?.partners?.length || 0}</span>
          <div className="stat-details">
            {data?.partners?.length > 0 && (
              <small>พบข้อมูลพาร์ทเนอร์ {data.partners.length} รายการ</small>
            )}
          </div>
        </div>
      </div>
      
      <div className="data-table">
        <h3>รายการพาร์ทเนอร์</h3>
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>ชื่อพาร์ทเนอร์</th>
              <th>อีเมล</th>
              <th>วันที่สมัคร</th>
              <th>สถานะ</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {data?.partners?.length > 0 ? (
              data.partners.map((partner, index) => (
                <tr key={partner.owner_uid || partner.owner_id || index}>
                  <td>{partner.owner_uid || partner.owner_id || `P${String(index + 1).padStart(3, '0')}`}</td>
                  <td>{partner.owner_name || 'ไม่ระบุ'}</td>
                  <td>{partner.owner_email || 'ไม่ระบุ'}</td>
                  <td>{partner.created_at ? new Date(partner.created_at).toLocaleDateString('th-TH') : 'ไม่ระบุ'}</td>
                  <td>
                    <span className="status-badge active">ใช้งาน</span>
                  </td>
                  <td>
                    <button 
                      className="btn-view"
                      onClick={() => handleViewDetails(partner)}
                    >
                      ดู
                    </button>
                    <button 
                      className="btn-edit"
                      onClick={() => handleEdit(partner)}
                    >
                      แก้ไข
                    </button>
                    <button 
                      className="btn-delete"
                      onClick={() => handleDelete(partner)}
                    >
                      ลบ
                    </button>
                    <button className="btn-fitness" title="ดูฟิตเนสของพาร์ทเนอร์">🏋️</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="empty-state">
                    <div className="empty-icon">📭</div>
                    <div className="empty-text">ไม่พบข้อมูลพาร์ทเนอร์</div>
                    <div className="empty-subtext">
                      อาจจะยังไม่มีพาร์ทเนอร์สมัครเข้าใช้งาน หรือข้อมูลยังไม่ถูกโหลด
                    </div>
                    <button className="btn-retry" onClick={handleRefresh}>
                      ลองโหลดใหม่
                    </button>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedPartner && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📋 รายละเอียดพาร์ทเนอร์</h3>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="partner-details">
                <div className="detail-row">
                  <label>🆔 ID:</label>
                  <span>{selectedPartner.owner_uid || selectedPartner.owner_id}</span>
                </div>
                <div className="detail-row">
                  <label>👤 ชื่อพาร์ทเนอร์:</label>
                  <span>{selectedPartner.owner_name}</span>
                </div>
                <div className="detail-row">
                  <label>📧 อีเมล:</label>
                  <span>{selectedPartner.owner_email}</span>
                </div>
                <div className="detail-row">
                  <label>📱 เบอร์โทรฟิตเนส:</label>
                  <span>{selectedPartner.fit_phone || 'ไม่ระบุ'}</span>
                </div>
                <div className="detail-row">
                  <label>☎️ เบอร์โทรเจ้าของ:</label>
                  <span>{selectedPartner.owner_phone || 'ไม่ระบุ'}</span>
                </div>
                <div className="detail-row">
                  <label>🏢 ชื่อฟิตเนส:</label>
                  <span>{selectedPartner.fit_name || 'ไม่ระบุ'}</span>
                </div>
                <div className="detail-row">
                  <label>📍 ที่อยู่ฟิตเนส:</label>
                  <span>{selectedPartner.fit_address || selectedPartner.owner_address || 'ไม่ระบุ'}</span>
                </div>
                <div className="detail-row">
                  <label>📅 วันที่สมัคร:</label>
                  <span>{selectedPartner.created_at ? new Date(selectedPartner.created_at).toLocaleString('th-TH') : 'ไม่ระบุ'}</span>
                </div>
                <div className="detail-row">
                  <label>🔄 อัปเดตล่าสุด:</label>
                  <span>{selectedPartner.updated_at ? new Date(selectedPartner.updated_at).toLocaleString('th-TH') : 'ไม่ระบุ'}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowDetailModal(false)}>
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedPartner && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>✏️ แก้ไขข้อมูลพาร์ทเนอร์</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>👤 ชื่อพาร์ทเนอร์:</label>
                  <input
                    type="text"
                    name="owner_name"
                    value={editForm.owner_name}
                    onChange={handleEditInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>📧 อีเมล:</label>
                  <input
                    type="email"
                    name="owner_email"
                    value={editForm.owner_email}
                    onChange={handleEditInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>📱 เบอร์โทรเจ้าของ:</label>
                  <input
                    type="tel"
                    name="owner_phone"
                    value={editForm.owner_phone}
                    onChange={handleEditInputChange}
                  />
                </div>
                <div className="form-group">
                  <label>📍 ที่อยู่เจ้าของ:</label>
                  <textarea
                    name="owner_address"
                    value={editForm.owner_address}
                    onChange={handleEditInputChange}
                    rows="2"
                    placeholder="กรุณาใส่ที่อยู่เจ้าของ..."
                  />
                </div>
                
                <h4 style={{margin: '1.5rem 0 1rem 0', color: '#667eea', borderBottom: '2px solid #667eea', paddingBottom: '0.5rem'}}>
                  🏢 ข้อมูลฟิตเนส
                </h4>
                
                <div className="form-group">
                  <label>🏢 ชื่อฟิตเนส:</label>
                  <input
                    type="text"
                    name="fit_name"
                    value={editForm.fit_name}
                    onChange={handleEditInputChange}
                    placeholder="กรุณาใส่ชื่อฟิตเนส..."
                  />
                </div>
                <div className="form-group">
                  <label>📞 เบอร์โทรฟิตเนส:</label>
                  <input
                    type="tel"
                    name="fit_phone"
                    value={editForm.fit_phone}
                    onChange={handleEditInputChange}
                    placeholder="กรุณาใส่เบอร์โทรฟิตเนส..."
                  />
                </div>
                <div className="form-group">
                  <label>📍 ที่อยู่ฟิตเนส:</label>
                  <textarea
                    name="fit_address"
                    value={editForm.fit_address}
                    onChange={handleEditInputChange}
                    rows="2"
                    placeholder="กรุณาใส่ที่อยู่ฟิตเนส..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn-primary">
                  💾 บันทึก
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>
                  ยกเลิก
                </button>
                
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedPartner && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content modal-danger" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🗑️ ยืนยันการลบ</h3>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="delete-warning">
                <div className="warning-icon">⚠️</div>
                <div className="warning-text">
                  <h4>คุณแน่ใจหรือไม่ที่จะลบพาร์ทเนอร์นี้?</h4>
                  <p><strong>ชื่อ:</strong> {selectedPartner.owner_name}</p>
                  <p><strong>อีเมล:</strong> {selectedPartner.owner_email}</p>
                  <p className="warning-note">
                    ⚠️ การลบนี้ไม่สามารถยกเลิกได้ และจะส่งผลต่อข้อมูลฟิตเนสที่เกี่ยวข้อง
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-danger" onClick={handleDeleteConfirm}>
                🗑️ ลบถาวร
              </button>
              <button className="btn-secondary" onClick={() => setShowDeleteModal(false)}>
                ยกเลิก
              </button>
              
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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

// Bank Account Tab Component
const BankAccountTab = () => {
  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text).then(() => {
      alert(`✅ คัดลอก${type}เรียบร้อยแล้ว: ${text}`);
    }).catch(() => {
      alert('❌ ไม่สามารถคัดลอกได้');
    });
  };

  return (
    <div className="bank-account-content">
      <h2>🏦 บัญชีธนาคารระบบ</h2>
      <div className="section">
        <div className="bank-info-grid">
          {Object.entries(SYSTEM_BANK_ACCOUNTS).map(([key, account]) => (
            <div key={key} className="bank-card">
              <div className="bank-header">
                <h3>💰 {account.purpose}</h3>
                <span className={`bank-type ${key}`}>บัญชีหลัก</span>
              </div>
              <div className="bank-details">
                <div className="detail-row">
                  <span className="label">🏦 ธนาคาร:</span>
                  <span className="value">{account.bankName}</span>
                </div>
                <div className="detail-row">
                  <span className="label">💳 เลขบัญชี:</span>
                  <span className="value account-number">{account.accountNumber}</span>
                </div>
                <div className="detail-row">
                  <span className="label">👤 ชื่อบัญชี:</span>
                  <span className="value">{account.accountName}</span>
                </div>
                <div className="detail-row">
                  <span className="label">📱 PromptPay:</span>
                  <span className="value promptpay">{account.promptpayId}</span>
                </div>
                <div className="detail-row">
                  <span className="label">📊 ประเภท:</span>
                  <span className="value">{account.accountType}</span>
                </div>
              </div>
              <div className="bank-actions">
                <button 
                  className="btn-copy-account"
                  onClick={() => copyToClipboard(account.accountNumber, 'เลขบัญชี')}
                >
                  📋 คัดลอกเลขบัญชี
                </button>
                <button 
                  className="btn-copy-promptpay"
                  onClick={() => copyToClipboard(account.promptpayId, 'PromptPay')}
                >
                  📱 คัดลอก PromptPay
                </button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="revenue-info">
          <h3>💡 ข้อมูลการแบ่งรายได้</h3>
          <div className="revenue-split-card">
            <div className="split-item">
              <span className="split-percentage">20%</span>
              <span className="split-description">ค่าธรรมเนียมระบบ</span>
              <span className="split-detail">โอนเข้าบัญชีระบบ</span>
            </div>
            <div className="split-arrow">→</div>
            <div className="split-item">
              <span className="split-percentage">80%</span>
              <span className="split-description">รายได้พาร์ทเนอร์</span>
              <span className="split-detail">โอนให้เจ้าของฟิตเนส</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Partner Accounts Tab Component
const PartnerAccountsTab = () => {
  const [partnerAccounts, setPartnerAccounts] = useState([]);
  const [partnerTransfers, setPartnerTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('accounts'); // 'accounts', 'transfers'

  useEffect(() => {
    loadPartnerAccountsData();
  }, []);

  const loadPartnerAccountsData = async () => {
    setLoading(true);
    try {
      // Import functions
      const { getAllPartnerBankAccounts, getPartnerTransfers } = await import('../utils/partnerAccountAPI');

      // โหลดข้อมูลบัญชีพาร์ทเนอร์
      const accountsResult = await getAllPartnerBankAccounts();
      if (accountsResult.success) {
        setPartnerAccounts(accountsResult.data);
      }

      // โหลดข้อมูลการโอนเงิน
      const transfersResult = await getPartnerTransfers();
      if (transfersResult.success) {
        setPartnerTransfers(transfersResult.data);
      }

    } catch (error) {
      console.error('Error loading partner accounts data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      alert(`📋 คัดลอก${label}แล้ว: ${text}`);
    });
  };

  const formatStatus = (status) => {
    const statusMap = {
      'pending': '⏳ รอดำเนินการ',
      'processing': '🔄 กำลังดำเนินการ',
      'completed': '✅ เสร็จสิ้น',
      'failed': '❌ ล้มเหลว',
      'cancelled': '🚫 ยกเลิก'
    };
    return statusMap[status] || status;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('th-TH');
  };

  if (loading) {
    return <div className="loading">กำลังโหลดข้อมูลบัญชีพาร์ทเนอร์...</div>;
  }

  return (
    <div className="partner-accounts-content">
      <h2>🤝 จัดการบัญชีพาร์ทเนอร์</h2>
      
      {/* Sub Tab Navigation */}
      <div className="sub-tab-navigation">
        <button 
          className={`sub-tab-btn ${activeSubTab === 'accounts' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('accounts')}
        >
          🏦 บัญชีพาร์ทเนอร์
        </button>
        <button 
          className={`sub-tab-btn ${activeSubTab === 'transfers' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('transfers')}
        >
          💸 การโอนเงิน
        </button>
        <button 
          className={`sub-tab-btn ${activeSubTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('analytics')}
        >
          📊 สถิติ
        </button>
      </div>

      {/* Partner Accounts Sub Tab */}
      {activeSubTab === 'accounts' && (
        <div className="partner-accounts-section">
          <div className="section-header">
            <h3>💳 บัญชีธนาคารพาร์ทเนอร์</h3>
            <span className="count-badge">{partnerAccounts.length} บัญชี</span>
          </div>
          
          {partnerAccounts.length > 0 ? (
            <div className="partner-accounts-grid">
              {partnerAccounts.map((account) => (
                <div key={account.fit_id} className="partner-account-card">
                  <div className="account-header">
                    <h4>🏋️ {account.fit_name}</h4>
                    <span className="partner-badge">พาร์ทเนอร์: {account.fit_user}</span>
                  </div>
                  
                  <div className="account-details">
                    <div className="detail-row">
                      <span className="label">ธนาคาร:</span>
                      <span className="value">{account.partner_bank_name}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">หมายเลขบัญชี:</span>
                      <span className="value">
                        {account.partner_bank_account}
                        <button 
                          className="copy-btn-small"
                          onClick={() => copyToClipboard(account.partner_bank_account, 'หมายเลขบัญชี')}
                        >
                          📋
                        </button>
                      </span>
                    </div>
                    <div className="detail-row">
                      <span className="label">ชื่อบัญชี:</span>
                      <span className="value">
                        {account.partner_account_name}
                        <button 
                          className="copy-btn-small"
                          onClick={() => copyToClipboard(account.partner_account_name, 'ชื่อบัญชี')}
                        >
                          📋
                        </button>
                      </span>
                    </div>
                    {account.partner_promptpay_id && (
                      <div className="detail-row">
                        <span className="label">PromptPay:</span>
                        <span className="value">
                          {account.partner_promptpay_id}
                          <button 
                            className="copy-btn-small"
                            onClick={() => copyToClipboard(account.partner_promptpay_id, 'PromptPay ID')}
                          >
                            📋
                          </button>
                        </span>
                      </div>
                    )}
                    <div className="detail-row">
                      <span className="label">การแบ่งรายได้:</span>
                      <span className="value revenue-split">
                        พาร์ทเนอร์ {account.revenue_split_percentage}% | 
                        ระบบ {(100 - account.revenue_split_percentage).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>🏦 ยังไม่มีบัญชีพาร์ทเนอร์</h3>
              <p>พาร์ทเนอร์ยังไม่ได้ตั้งค่าบัญชีธนาคาร</p>
            </div>
          )}
        </div>
      )}

      {/* Partner Transfers Sub Tab */}
      {activeSubTab === 'transfers' && (
        <div className="partner-transfers-section">
          <div className="section-header">
            <h3>💸 ประวัติการโอนเงินพาร์ทเนอร์</h3>
            <span className="count-badge">{partnerTransfers.length} รายการ</span>
          </div>
          
          {partnerTransfers.length > 0 ? (
            <div className="data-table">
              <table>
                <thead>
                  <tr>
                    <th>ฟิตเนส</th>
                    <th>จำนวนรวม</th>
                    <th>ส่วนพาร์ทเนอร์</th>
                    <th>ส่วนระบบ</th>
                    <th>บัญชีปลายทาง</th>
                    <th>สถานะ</th>
                    <th>วันที่สร้าง</th>
                    <th>วันที่โอน</th>
                    <th>หมายเลขอ้างอิง</th>
                  </tr>
                </thead>
                <tbody>
                  {partnerTransfers.map((transfer) => (
                    <tr key={transfer.transfer_id}>
                      <td>
                        <div className="fitness-info">
                          <span className="fitness-name">{transfer.tbl_fitness?.fit_name || 'N/A'}</span>
                          <small className="partner-name">{transfer.tbl_fitness?.fit_user || 'N/A'}</small>
                        </div>
                      </td>
                      <td className="amount">฿{transfer.total_amount?.toLocaleString()}</td>
                      <td className="partner-amount">฿{transfer.partner_amount?.toLocaleString()}</td>
                      <td className="system-amount">฿{transfer.system_amount?.toLocaleString()}</td>
                      <td>
                        <div className="bank-info">
                          <span className="bank-name">{transfer.partner_bank_name}</span>
                          <small className="account-number">{transfer.partner_bank_account}</small>
                        </div>
                      </td>
                      <td>
                        <span className={`status-badge transfer-${transfer.transfer_status}`}>
                          {formatStatus(transfer.transfer_status)}
                        </span>
                      </td>
                      <td>{formatDate(transfer.created_at)}</td>
                      <td>{formatDate(transfer.transfer_date)}</td>
                      <td>{transfer.transfer_reference || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <h3>💸 ยังไม่มีประวัติการโอนเงิน</h3>
              <p>เมื่อมีการชำระเงิน ระบบจะสร้างรายการโอนให้พาร์ทเนอร์อัตโนมัติ</p>
            </div>
          )}
        </div>
      )}

      {/* Analytics Sub Tab */}
      {activeSubTab === 'analytics' && (
        <div className="partner-analytics-section">
          <div className="section-header">
            <h3>📊 สถิติและรายงาน</h3>
          </div>
          
          <div className="analytics-stats">
            <div className="stat-card">
              <h4>🏦 บัญชีพาร์ทเนอร์</h4>
              <div className="stat-number">{partnerAccounts.length}</div>
              <div className="stat-label">บัญชี</div>
            </div>
            <div className="stat-card">
              <h4>💸 การโอนทั้งหมด</h4>
              <div className="stat-number">{partnerTransfers.length}</div>
              <div className="stat-label">รายการ</div>
            </div>
            <div className="stat-card">
              <h4>✅ โอนสำเร็จ</h4>
              <div className="stat-number">
                {partnerTransfers.filter(t => t.transfer_status === 'completed').length}
              </div>
              <div className="stat-label">รายการ</div>
            </div>
            <div className="stat-card">
              <h4>⏳ รอดำเนินการ</h4>
              <div className="stat-number">
               
                {partnerTransfers.filter(t => t.transfer_status === 'pending').length}
              </div>
              <div className="stat-label">รายการ</div>
            </div>
          </div>

          <div className="analytics-summary">
            <div className="summary-card">
              <h4>💰 มูลค่าการโอนรวม</h4>
              <div className="summary-amount">

                ฿{partnerTransfers.reduce((sum, t) => sum + (t.total_amount || 0), 0).toLocaleString()}
              </div>
            </div>
            <div className="summary-card">
              <h4>🤝 ส่วนพาร์ทเนอร์รวม</h4>
              <div className="summary-amount">
                ฿{partnerTransfers.reduce((sum, t) => sum + (t.partner_amount || 0), 0).toLocaleString()}
              </div>
            </div>
            <div className="summary-card">
              <h4>🏢 ส่วนระบบรวม</h4>
              <div className="summary-amount">
                ฿{partnerTransfers.reduce((sum, t) => sum + (t.system_amount || 0), 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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
        <p>✅ รายงานบัญชีพาร์ทเนอร์</p>
      </div>
    </div>
  </div>
);



export default AdminPage;