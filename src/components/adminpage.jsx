import React, { useState, useEffect } from 'react';
import supabase from '../supabaseClient';
import './AdminPage.css';
import PaymentAdmin from './PaymentAdmin';
import PaymentApproval from './PaymentApproval';
import ApprovedPayments from './ApprovedPayments';
import FitnessTab from './admin/FitnessTab';
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
  
  // ข้อมูลสำหรับแดชบอร์ด (ค่าเริ่มต้น)
  const [dashboardData, setDashboardData] = useState({
    users: [],
    partners: [],
    pendingFitness: [],
    approvedFitness: [],
    pendingPayments: [],
    bookings: [],
    payments: [],
    totalRevenue: 0,
    systemRevenue: 0
  });
  // ใช้เพื่อกรองรายการฟิตเนสเมื่อกดปุ่มดูฟิตเนสของพาร์ทเนอร์
  const [filterOwnerUid, setFilterOwnerUid] = useState(null);

  // โหลดข้อมูลแดชบอร์ด (เรียกเมื่อเข้าหน้า หรือ refresh)
  const loadDashboardData = async () => {
    try {
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) console.error('Error loading users:', usersError);

      const { data: partners, error: partnersError } = await supabase
        .from('tbl_owner')
        .select('*');
      if (partnersError) console.error('Error loading partners:', partnersError);

      const { data: pendingFitness, error: pendingError } = await supabase
        .from('tbl_fitness_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (pendingError) console.error('Error loading pending fitness requests:', pendingError);

      const { data: approvedFitness, error: fitnessError } = await supabase
        .from('tbl_fitness')
        .select('*')
        .order('created_at', { ascending: false });
      if (fitnessError) console.error('Error loading fitness data:', fitnessError);

      const { data: pendingPayments, error: pendingPaymentsError } = await supabase
        .from('pending_payments')
        .select('*')
        .in('status', ['pending', 'pending_approval'])
        .order('created_at', { ascending: false });
      if (pendingPaymentsError) console.error('Error loading pending payments:', pendingPaymentsError);

      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });
      if (bookingsError) console.error('Error loading bookings:', bookingsError);

      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .order('created_at', { ascending: false });
      if (paymentsError) console.error('Error loading payments:', paymentsError);

      // Build pendingPaymentsWithProfile by matching user_id
      let pendingPaymentsWithProfile = (pendingPayments || []).map(p => ({ ...p, profile: null }));
      if (pendingPaymentsWithProfile.length > 0 && users && users.length > 0) {
        pendingPaymentsWithProfile = pendingPaymentsWithProfile.map(payment => {
          const userProfile = users.find(u => u.user_uid === payment.user_id) || null;
          return { ...payment, profile: userProfile };
        });
      }

      const totalRevenue = (payments || []).reduce((sum, payment) => payment.payment_status === 'completed' ? sum + (payment.total_amount || 0) : sum, 0);
      const systemRevenue = (payments || []).reduce((sum, payment) => payment.payment_status === 'completed' ? sum + (payment.system_fee || 0) : sum, 0);

      setDashboardData({
        users: users || [],
        partners: partners || [],
        pendingFitness: pendingFitness || [],
        approvedFitness: approvedFitness || [],
        pendingPayments: pendingPaymentsWithProfile || [],
        bookings: bookings || [],
        payments: payments || [],
        totalRevenue,
        systemRevenue
      });
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

  // ฟังก์ชันล็อกอิน (เรียกเมื่อ submit แบบฟอร์ม)
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    try {
      // พยายามค้นหา admin ในตาราง tbl_admins (ถ้ามี)
      const { data: admins, error } = await supabase
        .from('tbl_admins')
        .select('*')
        .eq('email', loginForm.email)
        .limit(1);

      if (!error && admins && admins.length > 0) {
        const admin = admins[0];
        // หากตารางเก็บรหัสผ่านแบบ plain-text (ไม่แนะนำ) ให้ตรวจสอบ
        if (admin.password && admin.password === loginForm.password) {
          setAdminData(admin);
          setIsAuthenticated(true);
          setMessage('✅ เข้าสู่ระบบสำเร็จ');
          await loadDashboardData();
          return;
        }
      }

      // fallback: ยอมรับค่า default credentials ที่ตั้งไว้ใน loginForm (สำหรับ dev)
      if (
        loginForm.email === 'admin@pjfitness.com' &&
        loginForm.password === 'PJFitness@2025!'
      ) {
        setAdminData({ admin_id: 'local-admin', admin_name: 'Local Admin' });
        setIsAuthenticated(true);
        setMessage('✅ เข้าสู่ระบบ (local) สำเร็จ');
        await loadDashboardData();
        return;
      }

      setMessage('❌ อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    } catch (err) {
      console.error('Login error:', err);
      setMessage(`❌ เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // ฟังก์ชันอนุมัติฟิตเนส
  const handleApproveFitness = async (fitnessRequest) => {
    try {
      setIsLoading(true);
      
      // เพิ่มข้อมูลลงใน tbl_fitness และรับข้อมูลที่ถูกเพิ่มกลับมา
      const { data: insertedFitnessArr, error: insertError } = await supabase
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
        ])
        .select();

      if (insertError) throw insertError;
      const insertedFitness = Array.isArray(insertedFitnessArr) && insertedFitnessArr.length > 0 ? insertedFitnessArr[0] : null;

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
      // ถ้าได้ row ที่เพิ่มมา ให้อัปเดต state ทันทีเพื่่อให้ UI แสดงผลทันที
      if (insertedFitness) {
        setDashboardData(prev => ({
          ...prev,
          // เพิ่มรายการที่เพิ่งอนุมัติเข้าไปด้านบนของ approvedFitness
          approvedFitness: [insertedFitness, ...(prev.approvedFitness || [])]
        }));
      }
      // รีโหลดข้อมูลเพิ่มเติม (ปลอดภัย) แต่ UI จะอัปเดตก่อนจากการอัพเดต state ข้างต้น
      await loadDashboardData();
      
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
            <div className={`admin-message ${String(message).includes('สำเร็จ') ? 'success' : 'error'}`}>
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
          {activeTab === 'partners' && <PartnersTab data={dashboardData} onRefresh={loadDashboardData} onViewPartnerFitness={(p) => { setFilterOwnerUid(p?.owner_uid ?? p?.owner_id ?? null); setActiveTab('fitness'); }} />}
          {activeTab === 'bookings' && <BookingsTab data={dashboardData} />}
          {activeTab === 'payments' && <PaymentAdmin />}
          {activeTab === 'approval' && <PaymentApproval pendingPayments={dashboardData.pendingPayments} onRefresh={loadDashboardData} setActiveTab={setActiveTab} />}
          {activeTab === 'approved' && <ApprovedPayments />}
          {activeTab === 'bank' && <BankAccountTab />}
          {activeTab === 'partnerAccounts' && <PartnerAccountsTab />}
          {activeTab === 'fitness' && <FitnessTab data={dashboardData} filterOwnerUid={filterOwnerUid} onApprove={handleApproveFitness} onReject={handleRejectFitness} />}
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
                <th>สถานะ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {data.pendingPayments.slice(0, 5).map((payment, index) => (
                <tr key={payment.id || index}>
                  <td>
                    <span
                      className="transaction-id"
                      style={{display: 'inline-block', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}
                      title={payment.transaction_id}
                    >
                      {payment.transaction_id}
                    </span>
                  </td>
                  <td>
                    <div
                      className="user-info"
                      style={{maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}
                      title={payment.profile?.full_name || payment.profile?.useremail || 'ไม่ระบุ'}
                    >
                      <div>
                        {payment.profile?.full_name || 'ไม่ระบุ'}
                      </div>
                      <small style={{display: 'block', color: '#666', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                        {payment.profile?.useremail || payment.profile?.email || ''}
                      </small>
                    </div>
                  </td>
                  <td>
                    <span className="amount" style={{display: 'inline-block', minWidth: 100}}>฿{Number(payment.amount || 0).toLocaleString()}</span>
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
                    <button className="btn-delete" style={{background:'#ff0000ff',color:'#ffffffff'}} onClick={() => handleDelete(user)}>ลบ</button>
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
const PartnersTab = ({ data, onRefresh, onViewPartnerFitness }) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editForm, setEditForm] = useState({
    owner_name: '',
    owner_email: '',
    // owner_phone and owner_address removed — not stored on tbl_owner in this schema
    fit_phone: '',
    fit_address: '',
    fit_name: ''
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  };

  const handleViewDetails = async (partner) => {
    // Open modal immediately
    setSelectedPartner(partner);
    setShowDetailModal(true);

    // Try to fetch an associated tbl_fitness row to populate fit_name/fit_phone/fit_address
    try {
      let fitnessRows = [];
      const { data: byOwner, error: byOwnerErr } = await supabase
        .from('tbl_fitness')
        .select('*')
        .eq('owner_id', partner.owner_id)
        .limit(1);
      if (!byOwnerErr && byOwner && byOwner.length > 0) {
        fitnessRows = byOwner;
      } else {
        // Fallback: try matching by fit_user (some records use fit_user = owner_name)
        const { data: byUser, error: byUserErr } = await supabase
          .from('tbl_fitness')
          .select('*')
          .eq('fit_user', partner.owner_name)
          .limit(1);
        if (!byUserErr && byUser && byUser.length > 0) fitnessRows = byUser;
      }

      if (fitnessRows.length > 0) {
        const f = fitnessRows[0];
        setSelectedPartner(prev => ({
          ...prev,
          fit_name: f.fit_name || prev.fit_name,
          fit_phone: f.fit_phone || f.fit_contact || prev.fit_phone,
          fit_address: f.fit_address || f.fit_location || prev.fit_address
        }));
      }
    } catch (err) {
      console.error('Error loading partner fitness for details modal:', err);
    }
  };

  const handleEdit = async (partner) => {
    setSelectedPartner(partner);
    // Pre-fill owner fields we have
    setEditForm(prev => ({
      ...prev,
      owner_name: partner.owner_name || '',
      owner_email: partner.owner_email || ''
    }));

    // Try to fetch related tbl_fitness row to prefill fit fields
    try {
      const { data: byOwner, error: byOwnerErr } = await supabase
        .from('tbl_fitness')
        .select('*')
        .eq('owner_id', partner.owner_id)
        .limit(1);
      let fitnessRow = null;
      if (!byOwnerErr && byOwner && byOwner.length > 0) fitnessRow = byOwner[0];
      else {
        const { data: byUser, error: byUserErr } = await supabase
          .from('tbl_fitness')
          .select('*')
          .eq('fit_user', partner.owner_name)
          .limit(1);
        if (!byUserErr && byUser && byUser.length > 0) fitnessRow = byUser[0];
      }

      if (fitnessRow) {
        setEditForm(prev => ({
          ...prev,
          fit_name: fitnessRow.fit_name || prev.fit_name,
          fit_phone: fitnessRow.fit_phone || fitnessRow.fit_contact || prev.fit_phone,
          fit_address: fitnessRow.fit_address || fitnessRow.fit_location || prev.fit_address
        }));
      }
    } catch (err) {
      console.error('Error fetching fitness for edit:', err);
    }

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
  const selOwnerIdStr = selectedPartner?.owner_id == null ? '' : String(selectedPartner.owner_id);
  if (!selOwnerIdStr.includes('demo')) {
        // อัปเดตข้อมูลเจ้าของใน tbl_owner (owner_phone/owner_address not stored here)
        const { error: ownerError } = await supabase
          .from('tbl_owner')
          .update({
            owner_name: editForm.owner_name,
            owner_email: editForm.owner_email,
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
            fit_user: editForm.owner_name, // keep owner reference
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
  const delOwnerIdStr = selectedPartner?.owner_id == null ? '' : String(selectedPartner.owner_id);
  if (!delOwnerIdStr.includes('demo')) {
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
          <div className="modal-content user-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📋 รายละเอียดพาร์ทเนอร์</h3>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>ID:</label>
                <input type="text" value={selectedPartner.owner_uid || selectedPartner.owner_id || ''} readOnly />
              </div>
              <div className="form-group">
                <label>👤 ชื่อพาร์ทเนอร์:</label>
                <input type="text" value={selectedPartner.owner_name || ''} readOnly />
              </div>
              <div className="form-group">
                <label>📧 อีเมล:</label>
                <input type="text" value={selectedPartner.owner_email || ''} readOnly />
              </div>
              <div className="form-group">
                <label>📱 เบอร์โทรฟิตเนส:</label>
                <input type="text" value={selectedPartner.fit_phone || selectedPartner.fit_contact || 'ไม่ระบุ'} readOnly />
              </div>
              <div className="form-group">
                <label>🏢 ชื่อฟิตเนส:</label>
                <input type="text" value={selectedPartner.fit_name || ''} readOnly />
              </div>
              <div className="form-group">
                <label>📍 ที่อยู่ฟิตเนส:</label>
                <input type="text" value={selectedPartner.fit_address || selectedPartner.owner_address || ''} readOnly />
              </div>
              <div className="form-group">
                <label>📅 วันที่สมัคร:</label>
                <input type="text" value={selectedPartner.created_at ? new Date(selectedPartner.created_at).toLocaleString('th-TH') : ''} readOnly />
              </div>
              <div className="form-group">
                <label>🔄 อัปเดตล่าสุด:</label>
                <input type="text" value={selectedPartner.updated_at ? new Date(selectedPartner.updated_at).toLocaleString('th-TH') : ''} readOnly />
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
                {/* owner_phone and owner_address removed from edit form (not in DB) */}
                
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

// FitnessTab moved to its own file: src/components/admin/FitnessTab.jsx

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
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        alert(`✅ คัดลอก ${type} เรียบร้อยแล้ว: ${text}`);
      }).catch(() => {
        // fallback below
        try {
          const ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          alert(`✅ คัดลอก ${type} เรียบร้อยแล้ว: ${text}`);
        } catch (e) {
          alert('❌ ไม่สามารถคัดลอกได้');
        }
      });
    } else {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        alert(`✅ คัดลอก ${type} เรียบร้อยแล้ว: ${text}`);
      } catch (e) {
        alert('❌ ไม่สามารถคัดลอกได้');
      }
    }
  };

  return (
    <div className="bank-account-content">
      <h2>🏦 บัญชีธนาคารระบบ</h2>
      <div className="section">
        <div className="bank-info-grid">
          {/* Render only the primary system account (main) */}
          {(() => {
            const account = SYSTEM_BANK_ACCOUNTS.main;
            if (!account) return null;
            return (
              <div className="bank-card">
                <div className="bank-header">
                  <h3>💰 {account.purpose}</h3>
                  <span className={`bank-type main`}>บัญชีหลัก</span>
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
            );
          })()}
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