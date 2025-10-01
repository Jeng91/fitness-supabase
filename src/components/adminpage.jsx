import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../supabaseClient';
import './AdminPage.css';

const AdminPage = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
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
    bookings: [],
    reviews: [],
    notifications: [],
    revenue: {
      daily: 0,
      monthly: 0,
      yearly: 0
    }
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

      setDashboardData(prev => ({
        ...prev,
        users: users || [],
        partners: partners || []
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
          <h1>🔧 Admin Dashboard - PJ Fitness</h1>
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
            📊 แดshboard
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
            className={`tab-btn ${activeTab === 'registration' ? 'active' : ''}`}
            onClick={() => setActiveTab('registration')}
          >
            📝 การสมัครสมาชิก
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
            className={`tab-btn ${activeTab === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveTab('reviews')}
          >
            ⭐ รีวิว
          </button>
          <button 
            className={`tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
            onClick={() => setActiveTab('notifications')}
          >
            🔔 แจ้งเตือน
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
        {activeTab === 'registration' && <RegistrationTab data={dashboardData} />}
        {activeTab === 'bookings' && <BookingsTab />}
        {activeTab === 'payments' && <PaymentsTab />}
        {activeTab === 'reviews' && <ReviewsTab />}
        {activeTab === 'notifications' && <NotificationsTab />}
        {activeTab === 'reports' && <ReportsTab />}
      </main>
    </div>
  );
};

// Partners Tab Component
const PartnersTab = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // กรองข้อมูลตามการค้นหาและสถานะ
  const filteredPartners = data?.partners?.filter(partner => {
    const matchesSearch = !searchTerm || 
      partner.owner_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      partner.owner_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      partner.fitness_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !filterStatus || 
      (filterStatus === 'active' && partner.status !== 'inactive') ||
      (filterStatus === 'inactive' && partner.status === 'inactive');
    
    return matchesSearch && matchesStatus;
  }) || [];

  // เพิ่มฟังก์ชันสำหรับดึงข้อมูลฟิตเนสของพาร์ทเนอร์ id นั้น
  const [fitnessDetail, setFitnessDetail] = useState(null);

  const handleViewFitness = async (partnerId) => {
    // ดึงข้อมูลฟิตเนสที่สร้างโดย partnerId
    const { data } = await supabase
      .from('tbl_fitness')
      .select('fit_name')
      .eq('created_by', partnerId)
      .single();
    setFitnessDetail(data);
  };

  return (
    <div className="partners-content">
      <h2>🏢 จัดการพาร์ทเนอร์</h2>
      <div className="section">
        <div className="admin-stats">
          <div className="stat-card">
            <h3>จำนวนพาร์ทเนอร์ทั้งหมด</h3>
            <span className="stat-number">{data?.partners?.length || 0}</span>
          </div>
          <div className="stat-card">
            <h3>พาร์ทเนอร์ที่แสดง</h3>
            <span className="stat-number">{filteredPartners.length}</span>
          </div>
        </div>
        
        <div className="data-management">
          <div className="section-header">
            <h3>📊 ข้อมูลพาร์ทเนอร์</h3>
            <div className="action-buttons">
              <button className="btn-add">+ เพิ่มพาร์ทเนอร์ใหม่</button>
              <button className="btn-export">📤 ส่งออกข้อมูล</button>
            </div>
          </div>
          
          <div className="search-section">
            <input 
              type="text" 
              placeholder="ค้นหาพาร์ทเนอร์..." 
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select 
              className="filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">ทั้งหมด</option>
              <option value="active">ใช้งานอยู่</option>
              <option value="inactive">ไม่ใช้งาน</option>
            </select>
          </div>

          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>ชื่อพาร์ทเนอร์</th>
                  <th>อีเมล</th>
                  <th>ชื่อฟิตเนส</th>
                  <th>วันที่สมัคร</th>
                  <th>สถานะ</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredPartners.length > 0 ? (
                  filteredPartners.map((partner, index) => (
                    <tr key={partner.id || index}>
                      <td>{partner.id || `P${String(index + 1).padStart(3, '0')}`}</td>
                      <td>{partner.owner_name || 'ไม่ระบุ'}</td>
                      <td>{partner.owner_email || 'ไม่ระบุ'}</td>
                      <td>{partner.fitness_name || 'ไม่ระบุชื่อฟิตเนส'}</td>
                      <td>{partner.created_at ? new Date(partner.created_at).toLocaleDateString('th-TH') : 'ไม่ระบุ'}</td>
                      <td><span className="status-active">ใช้งานอยู่</span></td>
                      <td>
                        <button className="btn-edit">แก้ไข</button>
                        <button className="btn-view" onClick={() => handleViewFitness(partner.id)}>ดู</button>
                        <button className="btn-delete">ลบ</button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>
                      <div>
                        <p>ไม่พบข้อมูลพาร์ทเนอร์ที่ตรงกับการค้นหา</p>
                        {data?.partners?.length === 0 && (
                          <button className="btn-add">+ เพิ่มพาร์ทเนอร์แรก</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="partner-actions">
            <div className="bulk-actions">
              <h4>การจัดการแบบกลุ่ม</h4>
              <select className="bulk-select">
                <option value="">เลือกการดำเนินการ</option>
                <option value="activate">เปิดใช้งาน</option>
                <option value="deactivate">ปิดใช้งาน</option>
                <option value="delete">ลบข้อมูล</option>
              </select>
              <button className="btn-apply">ดำเนินการ</button>
            </div>
          </div>
        </div>
      </div>

      {/* Fitness Detail - Modal or Section */}
      {fitnessDetail && (
        <div className="fitness-detail">
          <h3>รายละเอียดฟิตเนส</h3>
          <div>
            <strong>ชื่อฟิตเนส:</strong> {fitnessDetail.fit_name}
          </div>
          {/* Other fitness details can be added here */}
        </div>
      )}
    </div>
  );
};

// Other Tab Components (ใช้งานง่ายๆ ก่อน)
const DashboardTab = ({ data }) => (
  <div className="dashboard-content">
    <h2>📊 ภาพรวมระบบ</h2>
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
        <div className="stat-number">{data.bookings.length}</div>
        <div className="stat-label">รายการ</div>
      </div>
      <div className="stat-card">
        <h3>⭐ รีวิว</h3>
        <div className="stat-number">{data.reviews.length}</div>
        <div className="stat-label">รีวิว</div>
      </div>
    </div>
  </div>
);

const UsersTab = ({ data }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // กรองข้อมูลตามการค้นหาและสถานะ
  const filteredUsers = data?.users?.filter(user => {
    const matchesSearch = !searchTerm || 
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.useremail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.usertel?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !filterStatus || 
      (filterStatus === 'active' && user.status !== 'inactive') ||
      (filterStatus === 'inactive' && user.status === 'inactive');
    
    return matchesSearch && matchesStatus;
  }) || [];

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('คุณต้องการลบผู้ใช้นี้ใช่หรือไม่?')) return;
    
    try {
      // ในระบบจริงจะลบจากฐานข้อมูล
      alert(`ลบผู้ใช้ ID: ${userId} เรียบร้อย`);
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('เกิดข้อผิดพลาดในการลบผู้ใช้');
    }
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
      // ในระบบจริงจะอัปเดตในฐานข้อมูล
      alert(`เปลี่ยนสถานะผู้ใช้เป็น ${newStatus} เรียบร้อย`);
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
    }
  };

  return (
    <div className="users-content">
      <h2>👥 จัดการผู้ใช้งาน</h2>
      <div className="section">
        <div className="admin-stats">
          <div className="stats-card">
            <div className="stats-number">{data?.users?.length || 0}</div>
            <div className="stats-label">จำนวนผู้ใช้ทั้งหมด</div>
          </div>
          <div className="stats-card">
            <div className="stats-number">{filteredUsers.length}</div>
            <div className="stats-label">ผู้ใช้ที่แสดง</div>
          </div>
          <div className="stats-card">
            <div className="stats-number">
              {data?.users?.filter(user => {
                const today = new Date().toDateString();
                const userDate = new Date(user.created_at).toDateString();
                return today === userDate;
              }).length || 0}
            </div>
            <div className="stats-label">ผู้ใช้ใหม่วันนี้</div>
          </div>
          <div className="stats-card">
            <div className="stats-number">
              {data?.users?.filter(user => user.status !== 'inactive').length || 0}
            </div>
            <div className="stats-label">ผู้ใช้ที่ใช้งานอยู่</div>
          </div>
        </div>
        
        <div className="data-management">
          <div className="section-header">
            <h3>📊 ข้อมูลผู้ใช้งาน</h3>
            <div className="action-buttons">
              <button className="btn-add">+ เพิ่มผู้ใช้ใหม่</button>
              <button className="btn-export">📤 ส่งออกข้อมูล</button>
            </div>
          </div>
          
        <div className="search-filter-container">
          <div className="search-section">
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <input 
                type="text" 
                placeholder="ค้นหาผู้ใช้ (ชื่อ, อีเมล, เบอร์โทร)..." 
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ flex: 1 }}
              />
              <select 
                className="search-input"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{ width: '200px' }}
              >
                <option value="">🔍 ทั้งหมด</option>
                <option value="active">✅ ใช้งานอยู่</option>
                <option value="inactive">❌ ไม่ใช้งาน</option>
              </select>
              <button className="search-button">
                🔍 ค้นหา
              </button>
            </div>
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
                  <th>อายุ</th>
                  <th>เบอร์โทร</th>
                  <th>วันที่สมัคร</th>
                  <th>สถานะ</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user, index) => (
                    <tr key={user.user_uid || index}>
                      <td>{user.user_uid || `U${String(index + 1).padStart(3, '0')}`}</td>
                      <td>
                        <div className="user-info">
                          <div className="user-avatar">
                            {user.profile_image ? (
                              <img src={user.profile_image} alt="Avatar" className="user-avatar" />
                            ) : (
                              <div className="user-avatar" style={{
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.2rem',
                                fontWeight: 'bold'
                              }}>👤</div>
                            )}
                          </div>
                          <div className="user-details">
                            <h4>{user.username || 'ไม่ระบุ'}</h4>
                            <p>{user.useremail || 'ไม่มีอีเมล'}</p>
                          </div>
                        </div>
                      </td>
                      <td>{user.useremail || 'ไม่ระบุ'}</td>
                      <td>{user.full_name || 'ไม่ระบุ'}</td>
                      <td>{user.userage ? `${user.userage} ปี` : 'ไม่ระบุ'}</td>
                      <td>{user.usertel || 'ไม่ระบุ'}</td>
                      <td>{user.created_at ? new Date(user.created_at).toLocaleDateString('th-TH') : 'ไม่ระบุ'}</td>
                      <td>
                        <span className={`status-badge ${user.status === 'inactive' ? 'status-inactive' : 'status-active'}`}>
                          {user.status === 'inactive' ? 'ไม่ใช้งาน' : 'ใช้งานอยู่'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button className="btn-view">ดู</button>
                          <button className="btn-edit">แก้ไข</button>
                          <button 
                            className={`btn-toggle ${user.status === 'inactive' ? 'btn-activate' : 'btn-deactivate'}`}
                            onClick={() => handleToggleStatus(user.user_uid, user.status || 'active')}
                          >
                            {user.status === 'inactive' ? 'เปิดใช้' : 'ปิดใช้'}
                          </button>
                          <button 
                            className="btn-delete"
                            onClick={() => handleDeleteUser(user.user_uid)}
                          >
                            ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>
                      <div>
                        <p>ไม่พบข้อมูลผู้ใช้ที่ตรงกับการค้นหา</p>
                        {data?.users?.length === 0 && (
                          <button className="btn-add">+ เพิ่มผู้ใช้แรก</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="user-actions">
            <div className="bulk-actions">
              <h4>การจัดการแบบกลุ่ม</h4>
              <select className="bulk-select">
                <option value="">เลือกการดำเนินการ</option>
                <option value="activate">เปิดใช้งาน</option>
                <option value="deactivate">ปิดใช้งาน</option>
                <option value="delete">ลบข้อมูล</option>
                <option value="export">ส่งออกข้อมูล</option>
              </select>
              <button className="btn-apply">ดำเนินการ</button>
            </div>
            
            <div className="user-insights">
              <h4>📈 สถิติผู้ใช้</h4>
              <div className="insights-grid">
                <div className="insight-item">
                  <span className="insight-label">ช่วงอายุเฉลี่ย:</span>
                  <span className="insight-value">
                    {data?.users?.length > 0 ? 
                      Math.round(data.users.reduce((sum, user) => sum + (parseInt(user.userage) || 0), 0) / data.users.length) + ' ปี'
                      : 'ไม่มีข้อมูล'
                    }
                  </span>
                </div>
                <div className="insight-item">
                  <span className="insight-label">ผู้ใช้ใหม่เดือนนี้:</span>
                  <span className="insight-value">
                    {data?.users?.filter(user => {
                      const thisMonth = new Date().getMonth();
                      const userMonth = new Date(user.created_at).getMonth();
                      return thisMonth === userMonth;
                    }).length || 0} คน
                  </span>
                </div>
                <div className="insight-item">
                  <span className="insight-label">อัตราการใช้งาน:</span>
                  <span className="insight-value">
                    {data?.users?.length > 0 ? 
                      Math.round((data.users.filter(user => user.status !== 'inactive').length / data.users.length) * 100) + '%'
                      : '0%'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RegistrationTab = ({ data }) => (
  <div className="registration-content">
    <h2>📝 การจัดการการสมัครสมาชิก</h2>
    <div className="section">
      <p>ระบบจัดการการสมัครสมาชิก</p>
    </div>
  </div>
);

const BookingsTab = () => {
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Mock booking data - ในระบบจริงจะดึงจาก Supabase
  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setLoading(true);
    try {
      // Mock data - ในอนาคตจะดึงจากฐานข้อมูล
      const mockBookings = [
        {
          id: 'BK001',
          user_name: 'นายสมชาย ใจดี',
          user_email: 'somchai@email.com',
          fitness_name: 'PJ Fitness Ladprao',
          service_type: 'Personal Training',
          booking_date: '2025-10-01',
          booking_time: '09:00',
          duration: '60 นาที',
          price: 800,
          status: 'confirmed',
          created_at: '2025-09-28T10:30:00Z',
          notes: 'ต้องการเทรนเนอร์ผู้หญิง'
        },
        {
          id: 'BK002',
          user_name: 'นางสาวมาลี สวยงาม',
          user_email: 'malee@email.com',
          fitness_name: 'PJ Fitness Sukhumvit',
          service_type: 'Group Class - Yoga',
          booking_date: '2025-10-02',
          booking_time: '18:00',
          duration: '90 นาที',
          price: 350,
          status: 'pending',
          created_at: '2025-09-29T14:15:00Z',
          notes: ''
        },
        {
          id: 'BK003',
          user_name: 'นายวิทย์ รักสุขภาพ',
          user_email: 'wit@email.com',
          fitness_name: 'PJ Fitness Silom',
          service_type: 'Swimming Pool',
          booking_date: '2025-10-01',
          booking_time: '07:00',
          duration: '120 นาที',
          price: 200,
          status: 'completed',
          created_at: '2025-09-27T16:45:00Z',
          notes: 'ชอบว่ายน้ำท่าผีเสื้อ'
        },
        {
          id: 'BK004',
          user_name: 'นางสาวน้ำทิพย์ แข็งแรง',
          user_email: 'namtip@email.com',
          fitness_name: 'PJ Fitness Thonglor',
          service_type: 'Massage & Spa',
          booking_date: '2025-10-03',
          booking_time: '15:30',
          duration: '90 นาที',
          price: 1200,
          status: 'cancelled',
          created_at: '2025-09-30T08:20:00Z',
          notes: 'ขอยกเลิกเนื่องจากติดธุระ'
        }
      ];
      
      setBookings(mockBookings);
      setFilteredBookings(mockBookings);
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
    setLoading(false);
  };

  // Filter bookings based on search and filters
  useEffect(() => {
    let filtered = bookings;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(booking =>
        booking.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.fitness_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.service_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter) {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    // Date filter
    if (dateFilter) {
      filtered = filtered.filter(booking => booking.booking_date === dateFilter);
    }

    setFilteredBookings(filtered);
  }, [bookings, searchTerm, statusFilter, dateFilter]);

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { text: 'รอยืนยัน', class: 'status-pending' },
      confirmed: { text: 'ยืนยันแล้ว', class: 'status-confirmed' },
      completed: { text: 'เสร็จสิ้น', class: 'status-completed' },
      cancelled: { text: 'ยกเลิก', class: 'status-cancelled' }
    };
    
    const statusInfo = statusMap[status] || { text: status, class: 'status-unknown' };
    return <span className={`status-badge ${statusInfo.class}`}>{statusInfo.text}</span>;
  };

  const handleStatusChange = async (bookingId, newStatus) => {
    try {
      // อัปเดตสถานะใน state (ในระบบจริงจะอัปเดตฐานข้อมูล)
      setBookings(prev => prev.map(booking =>
        booking.id === bookingId ? { ...booking, status: newStatus } : booking
      ));
      alert(`อัปเดตสถานะการจองเป็น "${newStatus}" เรียบร้อย`);
    } catch (error) {
      console.error('Error updating booking status:', error);
      alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
    }
  };

  const handleViewBooking = (booking) => {
    setSelectedBooking(booking);
    setShowBookingModal(true);
  };

  const BookingDetailModal = ({ booking, onClose }) => {
    if (!booking) return null;

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>รายละเอียดการจอง #{booking.id}</h3>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
          <div className="modal-body">
            <div className="booking-details">
              <div className="detail-row">
                <strong>ผู้จอง:</strong> {booking.user_name}
              </div>
              <div className="detail-row">
                <strong>อีเมล:</strong> {booking.user_email}
              </div>
              <div className="detail-row">
                <strong>สาขา:</strong> {booking.fitness_name}
              </div>
              <div className="detail-row">
                <strong>บริการ:</strong> {booking.service_type}
              </div>
              <div className="detail-row">
                <strong>วันที่จอง:</strong> {new Date(booking.booking_date).toLocaleDateString('th-TH')}
              </div>
              <div className="detail-row">
                <strong>เวลา:</strong> {booking.booking_time}
              </div>
              <div className="detail-row">
                <strong>ระยะเวลา:</strong> {booking.duration}
              </div>
              <div className="detail-row">
                <strong>ราคา:</strong> ฿{booking.price.toLocaleString()}
              </div>
              <div className="detail-row">
                <strong>สถานะ:</strong> {getStatusBadge(booking.status)}
              </div>
              <div className="detail-row">
                <strong>วันที่สร้าง:</strong> {new Date(booking.created_at).toLocaleString('th-TH')}
              </div>
              {booking.notes && (
                <div className="detail-row">
                  <strong>หมายเหตุ:</strong> {booking.notes}
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn-close" onClick={onClose}>ปิด</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bookings-content">
      <h2>📅 จัดการระบบการจองและบริการ</h2>
      
      {/* Stats Cards */}
      <div className="admin-stats">
        <div className="stat-card">
          <h3>การจองทั้งหมด</h3>
          <span className="stat-number">{bookings.length}</span>
        </div>
        <div className="stat-card">
          <h3>รอยืนยัน</h3>
          <span className="stat-number">{bookings.filter(b => b.status === 'pending').length}</span>
        </div>
        <div className="stat-card">
          <h3>ยืนยันแล้ว</h3>
          <span className="stat-number">{bookings.filter(b => b.status === 'confirmed').length}</span>
        </div>
        <div className="stat-card">
          <h3>รายได้รวม</h3>
          <span className="stat-number">฿{bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + b.price, 0).toLocaleString()}</span>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="booking-controls">
        <div className="search-section">
          <input
            type="text"
            placeholder="ค้นหาการจอง (ชื่อ, อีเมล, สาขา, บริการ)..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">ทุกสถานะ</option>
            <option value="pending">รอยืนยัน</option>
            <option value="confirmed">ยืนยันแล้ว</option>
            <option value="completed">เสร็จสิ้น</option>
            <option value="cancelled">ยกเลิก</option>
          </select>
          <input
            type="date"
            className="filter-date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
          <button className="btn-reset" onClick={() => {
            setSearchTerm('');
            setStatusFilter('');
            setDateFilter('');
          }}>
            รีเซ็ต
          </button>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="data-table">
        {loading ? (
          <div className="loading-message">กำลังโหลดข้อมูล...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>ผู้จอง</th>
                <th>สาขา</th>
                <th>บริการ</th>
                <th>วันที่</th>
                <th>เวลา</th>
                <th>ราคา</th>
                <th>สถานะ</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.length > 0 ? (
                filteredBookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>{booking.id}</td>
                    <td>
                      <div>
                        <div style={{ fontWeight: '500' }}>{booking.user_name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#666' }}>{booking.user_email}</div>
                      </div>
                    </td>
                    <td>{booking.fitness_name}</td>
                    <td>{booking.service_type}</td>
                    <td>{new Date(booking.booking_date).toLocaleDateString('th-TH')}</td>
                    <td>{booking.booking_time}</td>
                    <td>฿{booking.price.toLocaleString()}</td>
                    <td>{getStatusBadge(booking.status)}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-view"
                          onClick={() => handleViewBooking(booking)}
                        >
                          ดู
                        </button>
                        {booking.status === 'pending' && (
                          <button
                            className="btn-confirm"
                            onClick={() => handleStatusChange(booking.id, 'confirmed')}
                          >
                            ยืนยัน
                          </button>
                        )}
                        {booking.status === 'confirmed' && (
                          <button
                            className="btn-complete"
                            onClick={() => handleStatusChange(booking.id, 'completed')}
                          >
                            เสร็จสิ้น
                          </button>
                        )}
                        {(booking.status === 'pending' || booking.status === 'confirmed') && (
                          <button
                            className="btn-cancel"
                            onClick={() => handleStatusChange(booking.id, 'cancelled')}
                          >
                            ยกเลิก
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>
                    ไม่พบข้อมูลการจองที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Booking Detail Modal */}
      {showBookingModal && (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedBooking(null);
          }}
        />
      )}
    </div>
  );
};

const PaymentsTab = () => {
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [revenueSettings, setRevenueSettings] = useState({
    appCommission: 10, // แอพเก็บ 10%
    partnerShare: 90   // พาร์ทเนอร์ได้ 90%
  });

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    try {
      // Mock payment data - ในระบบจริงจะดึงจาก Supabase
      const mockPayments = [
        {
          id: 'PAY001',
          booking_id: 'BK001',
          user_name: 'นายสมชาย ใจดี',
          user_email: 'somchai@email.com',
          fitness_name: 'PJ Fitness Ladprao',
          partner_id: 'ladprao',
          service_type: 'Personal Training',
          total_amount: 800,
          app_commission: 80,  // 10%
          partner_amount: 720, // 90%
          payment_method: 'credit_card',
          payment_status: 'completed',
          transaction_id: 'TXN_001_20251001',
          created_at: '2025-10-01T09:30:00Z',
          completed_at: '2025-10-01T09:31:00Z',
          partner_paid: true,
          partner_paid_at: '2025-10-01T18:00:00Z'
        },
        {
          id: 'PAY002',
          booking_id: 'BK002',
          user_name: 'นางสาวมาลี สวยงาม',
          user_email: 'malee@email.com',
          fitness_name: 'PJ Fitness Sukhumvit',
          partner_id: 'sukhumvit',
          service_type: 'Group Class - Yoga',
          total_amount: 350,
          app_commission: 35,
          partner_amount: 315,
          payment_method: 'promptpay',
          payment_status: 'completed',
          transaction_id: 'TXN_002_20251002',
          created_at: '2025-10-02T18:15:00Z',
          completed_at: '2025-10-02T18:16:00Z',
          partner_paid: false,
          partner_paid_at: null
        },
        {
          id: 'PAY003',
          booking_id: 'BK003',
          user_name: 'นายวิทย์ รักสุขภาพ',
          user_email: 'wit@email.com',
          fitness_name: 'PJ Fitness Silom',
          partner_id: 'silom',
          service_type: 'Swimming Pool',
          total_amount: 200,
          app_commission: 20,
          partner_amount: 180,
          payment_method: 'bank_transfer',
          payment_status: 'pending',
          transaction_id: 'TXN_003_20251001',
          created_at: '2025-10-01T07:00:00Z',
          completed_at: null,
          partner_paid: false,
          partner_paid_at: null
        },
        {
          id: 'PAY004',
          booking_id: 'BK004',
          user_name: 'นางสาวน้ำทิพย์ แข็งแรง',
          user_email: 'namtip@email.com',
          fitness_name: 'PJ Fitness Thonglor',
          partner_id: 'thonglor',
          service_type: 'Massage & Spa',
          total_amount: 1200,
          app_commission: 120,
          partner_amount: 1080,
          payment_method: 'credit_card',
          payment_status: 'failed',
          transaction_id: 'TXN_004_20251003',
          created_at: '2025-10-03T15:30:00Z',
          completed_at: null,
          partner_paid: false,
          partner_paid_at: null
        },
        {
          id: 'PAY005',
          booking_id: 'BK005',
          user_name: 'นายประยุทธ์ สุขใส',
          user_email: 'prayut@email.com',
          fitness_name: 'PJ Fitness Chatuchak',
          partner_id: 'chatuchak',
          service_type: 'Personal Training',
          total_amount: 1000,
          app_commission: 100,
          partner_amount: 900,
          payment_method: 'wallet',
          payment_status: 'completed',
          transaction_id: 'TXN_005_20250930',
          created_at: '2025-09-30T16:45:00Z',
          completed_at: '2025-09-30T16:46:00Z',
          partner_paid: true,
          partner_paid_at: '2025-10-01T09:00:00Z'
        }
      ];
      
      setPayments(mockPayments);
      setFilteredPayments(mockPayments);
    } catch (error) {
      console.error('Error loading payments:', error);
    }
    setLoading(false);
  };

  // Filter payments
  useEffect(() => {
    let filtered = payments;

    if (searchTerm) {
      filtered = filtered.filter(payment =>
        payment.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.fitness_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(payment => payment.payment_status === statusFilter);
    }

    if (dateFilter) {
      filtered = filtered.filter(payment => 
        payment.created_at.startsWith(dateFilter)
      );
    }

    setFilteredPayments(filtered);
  }, [payments, searchTerm, statusFilter, dateFilter]);

  const getPaymentStatusBadge = (status) => {
    const statusMap = {
      pending: { text: 'รอดำเนินการ', class: 'payment-pending' },
      completed: { text: 'สำเร็จ', class: 'payment-completed' },
      failed: { text: 'ล้มเหลว', class: 'payment-failed' },
      refunded: { text: 'คืนเงินแล้ว', class: 'payment-refunded' }
    };
    
    const statusInfo = statusMap[status] || { text: status, class: 'payment-unknown' };
    return <span className={`payment-badge ${statusInfo.class}`}>{statusInfo.text}</span>;
  };

  const getPaymentMethodText = (method) => {
    const methodMap = {
      credit_card: 'บัตรเครดิต',
      promptpay: 'PromptPay',
      bank_transfer: 'โอนธนาคาร',
      wallet: 'กระเป๋าเงิน'
    };
    return methodMap[method] || method;
  };

  const handlePayPartner = async (paymentId) => {
    try {
      // อัปเดตสถานะการจ่ายเงินให้พาร์ทเนอร์
      setPayments(prev => prev.map(payment =>
        payment.id === paymentId 
          ? { 
              ...payment, 
              partner_paid: true, 
              partner_paid_at: new Date().toISOString() 
            }
          : payment
      ));
      alert('จ่ายเงินให้พาร์ทเนอร์เรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error paying partner:', error);
      alert('เกิดข้อผิดพลาดในการจ่ายเงิน');
    }
  };

  const handleRefund = async (paymentId) => {
    if (!window.confirm('คุณต้องการคืนเงินให้ลูกค้าใช่หรือไม่?')) return;
    
    try {
      setPayments(prev => prev.map(payment =>
        payment.id === paymentId 
          ? { ...payment, payment_status: 'refunded' }
          : payment
      ));
      alert('คืนเงินให้ลูกค้าเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error processing refund:', error);
      alert('เกิดข้อผิดพลาดในการคืนเงิน');
    }
  };

  const calculateTotals = () => {
    const completedPayments = filteredPayments.filter(p => p.payment_status === 'completed');
    const totalRevenue = completedPayments.reduce((sum, p) => sum + p.total_amount, 0);
    const totalAppCommission = completedPayments.reduce((sum, p) => sum + p.app_commission, 0);
    const totalPartnerAmount = completedPayments.reduce((sum, p) => sum + p.partner_amount, 0);
    const pendingPartnerPayments = completedPayments.filter(p => !p.partner_paid).reduce((sum, p) => sum + p.partner_amount, 0);

    return {
      totalRevenue,
      totalAppCommission,
      totalPartnerAmount,
      pendingPartnerPayments,
      transactionCount: completedPayments.length
    };
  };

  const totals = calculateTotals();

  const PaymentDetailModal = ({ payment, onClose }) => {
    if (!payment) return null;

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content payment-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>รายละเอียดการชำระเงิน #{payment.id}</h3>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
          <div className="modal-body">
            <div className="payment-details">
              <div className="detail-section">
                <h4>ข้อมูลการชำระเงิน</h4>
                <div className="detail-row">
                  <strong>รหัสการจอง:</strong> {payment.booking_id}
                </div>
                <div className="detail-row">
                  <strong>รหัสธุรกรรม:</strong> {payment.transaction_id}
                </div>
                <div className="detail-row">
                  <strong>วิธีการชำระเงิน:</strong> {getPaymentMethodText(payment.payment_method)}
                </div>
                <div className="detail-row">
                  <strong>สถานะ:</strong> {getPaymentStatusBadge(payment.payment_status)}
                </div>
              </div>

              <div className="detail-section">
                <h4>ข้อมูลลูกค้า</h4>
                <div className="detail-row">
                  <strong>ชื่อ:</strong> {payment.user_name}
                </div>
                <div className="detail-row">
                  <strong>อีเมล:</strong> {payment.user_email}
                </div>
                <div className="detail-row">
                  <strong>บริการ:</strong> {payment.service_type}
                </div>
                <div className="detail-row">
                  <strong>สาขา:</strong> {payment.fitness_name}
                </div>
              </div>

              <div className="detail-section">
                <h4>การแบ่งรายได้</h4>
                <div className="revenue-breakdown">
                  <div className="revenue-row total">
                    <span>ยอดรวม:</span>
                    <span>฿{payment.total_amount.toLocaleString()}</span>
                  </div>
                  <div className="revenue-row app">
                    <span>ส่วนแอพ ({revenueSettings.appCommission}%):</span>
                    <span>฿{payment.app_commission.toLocaleString()}</span>
                  </div>
                  <div className="revenue-row partner">
                    <span>ส่วนพาร์ทเนอร์ ({revenueSettings.partnerShare}%):</span>
                    <span>฿{payment.partner_amount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h4>สถานะการจ่ายเงิน</h4>
                <div className="detail-row">
                  <strong>การจ่ายให้พาร์ทเนอร์:</strong> 
                  <span className={payment.partner_paid ? 'status-paid' : 'status-unpaid'}>
                    {payment.partner_paid ? 'จ่ายแล้ว' : 'ยังไม่จ่าย'}
                  </span>
                </div>
                {payment.partner_paid_at && (
                  <div className="detail-row">
                    <strong>วันที่จ่าย:</strong> {new Date(payment.partner_paid_at).toLocaleString('th-TH')}
                  </div>
                )}
              </div>

              <div className="detail-section">
                <h4>เวลา</h4>
                <div className="detail-row">
                  <strong>วันที่สร้าง:</strong> {new Date(payment.created_at).toLocaleString('th-TH')}
                </div>
                {payment.completed_at && (
                  <div className="detail-row">
                    <strong>วันที่เสร็จสิ้น:</strong> {new Date(payment.completed_at).toLocaleString('th-TH')}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn-close" onClick={onClose}>ปิด</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="payments-content">
      <h2>💳 การตรวจสอบและจัดการการชำระเงิน</h2>

      {/* Revenue Summary */}
      <div className="revenue-summary">
        <div className="revenue-card total">
          <div className="revenue-icon">💰</div>
          <div className="revenue-content">
            <h3>รายได้รวม</h3>
            <div className="revenue-value">฿{totals.totalRevenue.toLocaleString()}</div>
            <div className="revenue-count">{totals.transactionCount} รายการ</div>
          </div>
        </div>

        <div className="revenue-card app">
          <div className="revenue-icon">📱</div>
          <div className="revenue-content">
            <h3>รายได้แอพ ({revenueSettings.appCommission}%)</h3>
            <div className="revenue-value">฿{totals.totalAppCommission.toLocaleString()}</div>
            <div className="revenue-count">ส่วนแบ่งแอพ</div>
          </div>
        </div>

        <div className="revenue-card partner">
          <div className="revenue-icon">🏢</div>
          <div className="revenue-content">
            <h3>รายได้พาร์ทเนอร์ ({revenueSettings.partnerShare}%)</h3>
            <div className="revenue-value">฿{totals.totalPartnerAmount.toLocaleString()}</div>
            <div className="revenue-count">ส่วนแบ่งพาร์ทเนอร์</div>
          </div>
        </div>

        <div className="revenue-card pending">
          <div className="revenue-icon">⏳</div>
          <div className="revenue-content">
            <h3>รอจ่ายพาร์ทเนอร์</h3>
            <div className="revenue-value">฿{totals.pendingPartnerPayments.toLocaleString()}</div>
            <div className="revenue-count">ยังไม่จ่าย</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="payment-controls">
        <div className="search-section">
          <input
            type="text"
            placeholder="ค้นหาการชำระเงิน (ชื่อ, อีเมล, รหัสธุรกรรม)..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">ทุกสถานะ</option>
            <option value="pending">รอดำเนินการ</option>
            <option value="completed">สำเร็จ</option>
            <option value="failed">ล้มเหลว</option>
            <option value="refunded">คืนเงินแล้ว</option>
          </select>
          <input
            type="date"
            className="filter-date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
          <button className="btn-reset" onClick={() => {
            setSearchTerm('');
            setStatusFilter('');
            setDateFilter('');
          }}>
            รีเซ็ต
          </button>
        </div>
      </div>

      {/* Payments Table */}
      <div className="data-table">
        {loading ? (
          <div className="loading-message">กำลังโหลดข้อมูล...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>ลูกค้า</th>
                <th>สาขา</th>
                <th>ยอดรวม</th>
                <th>ส่วนแอพ</th>
                <th>ส่วนพาร์ทเนอร์</th>
                <th>วิธีชำระ</th>
                <th>สถานะ</th>
                <th>จ่ายพาร์ทเนอร์</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length > 0 ? (
                filteredPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td>{payment.id}</td>
                    <td>
                      <div>
                        <div style={{ fontWeight: '500' }}>{payment.user_name}</div>
                        <div style={{ fontSize: '0.8rem', color: '#666' }}>{payment.service_type}</div>
                      </div>
                    </td>
                    <td>{payment.fitness_name}</td>
                    <td className="currency">฿{payment.total_amount.toLocaleString()}</td>
                    <td className="currency app-amount">฿{payment.app_commission.toLocaleString()}</td>
                    <td className="currency partner-amount">฿{payment.partner_amount.toLocaleString()}</td>
                    <td>{getPaymentMethodText(payment.payment_method)}</td>
                    <td>{getPaymentStatusBadge(payment.payment_status)}</td>
                    <td>
                      {payment.payment_status === 'completed' ? (
                        payment.partner_paid ? (
                          <span className="status-paid">✓ จ่ายแล้ว</span>
                        ) : (
                          <button
                            className="btn-pay-partner"
                            onClick={() => handlePayPartner(payment.id)}
                          >
                            จ่ายเงิน
                          </button>
                        )
                      ) : (
                        <span className="status-na">-</span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-view"
                          onClick={() => {
                            setSelectedPayment(payment);
                            setShowPaymentModal(true);
                          }}
                        >
                          ดู
                        </button>
                        {payment.payment_status === 'completed' && !payment.partner_paid && (
                          <button
                            className="btn-refund"
                            onClick={() => handleRefund(payment.id)}
                          >
                            คืนเงิน
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '2rem' }}>
                    ไม่พบข้อมูลการชำระเงินที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Payment Detail Modal */}
      {showPaymentModal && (
        <PaymentDetailModal
          payment={selectedPayment}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedPayment(null);
          }}
        />
      )}

      {/* Revenue Settings */}
      <div className="revenue-settings">
        <h3>⚙️ ตั้งค่าการแบ่งรายได้</h3>
        <div className="settings-form">
          <div className="setting-item">
            <label>เปอร์เซ็นต์แอพ:</label>
            <input
              type="number"
              value={revenueSettings.appCommission}
              onChange={(e) => {
                const appPercent = parseInt(e.target.value);
                setRevenueSettings({
                  appCommission: appPercent,
                  partnerShare: 100 - appPercent
                });
              }}
              min="0"
              max="100"
            />
            <span>%</span>
          </div>
          <div className="setting-item">
            <label>เปอร์เซ็นต์พาร์ทเนอร์:</label>
            <input
              type="number"
              value={revenueSettings.partnerShare}
              readOnly
              className="readonly"
            />
            <span>%</span>
          </div>
          <div className="setting-note">
            <small>💡 ค่าเริ่มต้น: แอพเก็บ 10%, พาร์ทเนอร์ได้ 90%</small>
          </div>
        </div>
      </div>
    </div>
  );
};

const ReviewsTab = () => {
  const [reviews, setReviews] = useState([]);
  const [filteredReviews, setFilteredReviews] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fitnessFilter, setFitnessFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);

  // Mock fitness branches
  const fitnessBranches = [
    { id: 'all', name: 'ทุกสาขา' },
    { id: 'ladprao', name: 'PJ Fitness Ladprao' },
    { id: 'sukhumvit', name: 'PJ Fitness Sukhumvit' },
    { id: 'silom', name: 'PJ Fitness Silom' },
    { id: 'thonglor', name: 'PJ Fitness Thonglor' },
    { id: 'chatuchak', name: 'PJ Fitness Chatuchak' }
  ];

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    setLoading(true);
    try {
      // Mock review data - ในระบบจริงจะดึงจาก Supabase
      const mockReviews = [
        {
          id: 'REV001',
          booking_id: 'BK001',
          user_name: 'นายสมชาย ใจดี',
          user_email: 'somchai@email.com',
          user_avatar: '👨‍💼',
          fitness_name: 'PJ Fitness Ladprao',
          fitness_id: 'ladprao',
          service_type: 'Personal Training',
          trainer_name: 'โค้ชอาร์ม',
          rating: 5,
          title: 'บริการดีเยี่ยม โค้ชใส่ใจมาก',
          comment: 'ประทับใจมากครับ โค้ชอาร์มสอนดีมาก อธิบายท่าทางละเอียด และให้คำแนะนำดี ๆ เยอะมาก อุปกรณ์ครบครัน สถานที่สะอาด จะมาใช้บริการต่อแน่นอนครับ',
          images: ['gym1.jpg', 'trainer1.jpg'],
          status: 'approved',
          created_at: '2025-10-01T10:30:00Z',
          updated_at: '2025-10-01T11:00:00Z',
          admin_response: null,
          helpful_count: 12,
          report_count: 0
        },
        {
          id: 'REV002',
          booking_id: 'BK002',
          user_name: 'นางสาวมาลี สวยงาม',
          user_email: 'malee@email.com',
          user_avatar: '👩‍💄',
          fitness_name: 'PJ Fitness Sukhumvit',
          fitness_id: 'sukhumvit',
          service_type: 'Group Class - Yoga',
          trainer_name: 'ครูยิง',
          rating: 4,
          title: 'คลาสโยคะดี แต่ที่จอดรถน้อย',
          comment: 'ชอบบรรยากาศคลาสโยคะมาก ครูยิงสอนดี ท่าทางสวยงาม แต่ที่จอดรถน้อยไป บางทีต้องจอดไกล ถ้าเพิ่มที่จอดรถจะดีมาก',
          images: ['yoga1.jpg'],
          status: 'pending',
          created_at: '2025-10-02T19:15:00Z',
          updated_at: '2025-10-02T19:15:00Z',
          admin_response: null,
          helpful_count: 8,
          report_count: 0
        },
        {
          id: 'REV003',
          booking_id: 'BK003',
          user_name: 'นายวิทย์ รักสุขภาพ',
          user_email: 'wit@email.com',
          user_avatar: '🏊‍♂️',
          fitness_name: 'PJ Fitness Silom',
          fitness_id: 'silom',
          service_type: 'Swimming Pool',
          trainer_name: '-',
          rating: 3,
          title: 'สระว่ายน้ำโอเค แต่น้ำค่อนข้างเย็น',
          comment: 'สระว่ายน้ำสะอาดดี แต่น้ำเย็นไปหน่อย โดยเฉพาะช่วงเช้า อยากให้ปรับอุณหภูมิน้ำให้เหมาะสมกว่านี้ครับ',
          images: [],
          status: 'approved',
          created_at: '2025-10-01T08:00:00Z',
          updated_at: '2025-10-01T14:30:00Z',
          admin_response: 'ขอบคุณสำหรับข้อเสนอแนะครับ เราจะปรับปรุงระบบควบคุมอุณหภูมิน้ำให้ดีขึ้น',
          helpful_count: 5,
          report_count: 0
        },
        {
          id: 'REV004',
          booking_id: 'BK004',
          user_name: 'นางสาวน้ำทิพย์ แข็งแรง',
          user_email: 'namtip@email.com',
          user_avatar: '💆‍♀️',
          fitness_name: 'PJ Fitness Thonglor',
          fitness_id: 'thonglor',
          service_type: 'Massage & Spa',
          trainer_name: 'หมอนวด สุขใจ',
          rating: 2,
          title: 'บริการไม่ตรงตามที่คาดหวัง',
          comment: 'ผิดหวังมาก บุกนัดเวลา 15:30 แต่รอจนเกือบ 16:00 หมอนวดดูไม่มีประสบการณ์ นวดแรงเกินไป ทำเจ็บ ราคาแพงแต่คุณภาพไม่คุ้ม',
          images: [],
          status: 'flagged',
          created_at: '2025-10-03T16:45:00Z',
          updated_at: '2025-10-03T16:45:00Z',
          admin_response: null,
          helpful_count: 2,
          report_count: 1
        },
        {
          id: 'REV005',
          booking_id: 'BK005',
          user_name: 'นายประยุทธ์ สุขใส',
          user_email: 'prayut@email.com',
          user_avatar: '💪',
          fitness_name: 'PJ Fitness Chatuchak',
          fitness_id: 'chatuchak',
          service_type: 'Personal Training',
          trainer_name: 'โค้ชแบงค์',
          rating: 5,
          title: 'โค้ชแบงค์เทพมาก! แนะนำเลย',
          comment: 'โค้ชแบงค์สุดยอดจริง ๆ ครับ มีความรู้เยอะมาก วางแผนการออกกำลังกายให้ดี ผลลัพธ์เห็นชัดเจนภายใน 1 เดือน น้ำหนักลด กล้ามเนื้อแน่นขึ้น ขอบคุณมากครับ',
          images: ['result1.jpg', 'result2.jpg'],
          status: 'approved',
          created_at: '2025-09-30T17:30:00Z',
          updated_at: '2025-09-30T18:00:00Z',
          admin_response: 'ขอบคุณที่ให้ความไว้วางใจ เรายินดีที่ลูกค้าพอใจในบริการของเรา',
          helpful_count: 15,
          report_count: 0
        },
        {
          id: 'REV006',
          booking_id: 'BK006',
          user_name: 'นายสมศักดิ์ ใจร้าย',
          user_email: 'somak@email.com',
          user_avatar: '😠',
          fitness_name: 'PJ Fitness Ladprao',
          fitness_id: 'ladprao',
          service_type: 'Group Class - Zumba',
          trainer_name: 'ครูเปิ้ล',
          rating: 1,
          title: 'แย่มาก ไม่แนะนำ!!!',
          comment: 'ห่วยแตกมาก เสียเงินเปล่า ครูเปิ้ลสอนไม่เป็น เพลงเก่า ๆ ไม่สนุก คนในคลาสน้อย บรรยากาศไม่ดี จะไม่มาอีกแล้ว ไม่แนะนำใครมาเลย!!!',
          images: [],
          status: 'rejected',
          created_at: '2025-09-29T20:00:00Z',
          updated_at: '2025-09-30T09:00:00Z',
          admin_response: 'ขออภัยสำหรับประสบการณ์ที่ไม่ดี เราจะนำข้อเสนอแนะไปปรับปรุงบริการ',
          helpful_count: 1,
          report_count: 3
        }
      ];
      
      setReviews(mockReviews);
      setFilteredReviews(mockReviews);
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
    setLoading(false);
  };

  // Filter reviews
  useEffect(() => {
    let filtered = reviews;

    if (searchTerm) {
      filtered = filtered.filter(review =>
        review.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.fitness_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        review.trainer_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (ratingFilter) {
      filtered = filtered.filter(review => review.rating === parseInt(ratingFilter));
    }

    if (statusFilter) {
      filtered = filtered.filter(review => review.status === statusFilter);
    }

    if (fitnessFilter && fitnessFilter !== 'all') {
      filtered = filtered.filter(review => review.fitness_id === fitnessFilter);
    }

    setFilteredReviews(filtered);
  }, [reviews, searchTerm, ratingFilter, statusFilter, fitnessFilter]);

  const getStarRating = (rating) => {
    return '⭐'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { text: 'รอดำเนินการ', class: 'review-pending' },
      approved: { text: 'อนุมัติแล้ว', class: 'review-approved' },
      rejected: { text: 'ปฏิเสธ', class: 'review-rejected' },
      flagged: { text: 'ถูกรายงาน', class: 'review-flagged' }
    };
    
    const statusInfo = statusMap[status] || { text: status, class: 'review-unknown' };
    return <span className={`review-badge ${statusInfo.class}`}>{statusInfo.text}</span>;
  };

  const handleStatusChange = async (reviewId, newStatus, adminResponse = null) => {
    try {
      setReviews(prev => prev.map(review =>
        review.id === reviewId 
          ? { 
              ...review, 
              status: newStatus,
              admin_response: adminResponse,
              updated_at: new Date().toISOString()
            }
          : review
      ));
      alert(`อัปเดตสถานะรีวิวเป็น "${newStatus}" เรียบร้อย`);
    } catch (error) {
      console.error('Error updating review status:', error);
      alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
    }
  };

  const handleReplyReview = async (reviewId, response) => {
    try {
      setReviews(prev => prev.map(review =>
        review.id === reviewId 
          ? { 
              ...review, 
              admin_response: response,
              updated_at: new Date().toISOString()
            }
          : review
      ));
      alert('ตอบกลับรีวิวเรียบร้อยแล้ว');
    } catch (error) {
      console.error('Error replying to review:', error);
      alert('เกิดข้อผิดพลาดในการตอบกลับ');
    }
  };

  const calculateAverageRating = () => {
    const approvedReviews = filteredReviews.filter(r => r.status === 'approved');
    if (approvedReviews.length === 0) return 0;
    const total = approvedReviews.reduce((sum, r) => sum + r.rating, 0);
    return (total / approvedReviews.length).toFixed(1);
  };

  const getRatingDistribution = () => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    filteredReviews.forEach(review => {
      distribution[review.rating]++;
    });
    return distribution;
  };

  const getReviewStats = () => {
    const total = filteredReviews.length;
    const pending = filteredReviews.filter(r => r.status === 'pending').length;
    const approved = filteredReviews.filter(r => r.status === 'approved').length;
    const flagged = filteredReviews.filter(r => r.status === 'flagged').length;
    const avgRating = calculateAverageRating();
    
    return { total, pending, approved, flagged, avgRating };
  };

  const stats = getReviewStats();
  const distribution = getRatingDistribution();

  const ReviewDetailModal = ({ review, onClose, onReply, onStatusChange }) => {
    const [replyText, setReplyText] = useState(review?.admin_response || '');
    const [isReplying, setIsReplying] = useState(false);

    if (!review) return null;

    const handleReply = () => {
      if (replyText.trim()) {
        onReply(review.id, replyText);
        setIsReplying(false);
        onClose();
      }
    };

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content review-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>รายละเอียดรีวิว #{review.id}</h3>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
          <div className="modal-body">
            <div className="review-detail-content">
              <div className="review-header">
                <div className="user-info">
                  <span className="user-avatar">{review.user_avatar}</span>
                  <div>
                    <div className="user-name">{review.user_name}</div>
                    <div className="review-date">{new Date(review.created_at).toLocaleString('th-TH')}</div>
                  </div>
                </div>
                <div className="review-rating">
                  <span className="stars">{getStarRating(review.rating)}</span>
                  <span className="rating-number">({review.rating}/5)</span>
                </div>
              </div>

              <div className="review-content">
                <h4>{review.title}</h4>
                <p>{review.comment}</p>
              </div>

              <div className="review-meta">
                <div className="meta-item">
                  <strong>สาขา:</strong> {review.fitness_name}
                </div>
                <div className="meta-item">
                  <strong>บริการ:</strong> {review.service_type}
                </div>
                {review.trainer_name !== '-' && (
                  <div className="meta-item">
                    <strong>เทรนเนอร์:</strong> {review.trainer_name}
                  </div>
                )}
                <div className="meta-item">
                  <strong>สถานะ:</strong> {getStatusBadge(review.status)}
                </div>
                <div className="meta-item">
                  <strong>การโต้ตอบ:</strong> 👍 {review.helpful_count} | 🚩 {review.report_count}
                </div>
              </div>

              <div className="admin-section">
                <h4>การจัดการรีวิว</h4>
                
                {/* Status Actions */}
                <div className="status-actions">
                  {review.status === 'pending' && (
                    <>
                      <button 
                        className="btn-approve"
                        onClick={() => onStatusChange(review.id, 'approved')}
                      >
                        ✅ อนุมัติ
                      </button>
                      <button 
                        className="btn-reject"
                        onClick={() => onStatusChange(review.id, 'rejected')}
                      >
                        ❌ ปฏิเสธ
                      </button>
                    </>
                  )}
                  {review.status === 'flagged' && (
                    <>
                      <button 
                        className="btn-approve"
                        onClick={() => onStatusChange(review.id, 'approved')}
                      >
                        ✅ อนุมัติ
                      </button>
                      <button 
                        className="btn-reject"
                        onClick={() => onStatusChange(review.id, 'rejected')}
                      >
                        ❌ ลบออก
                      </button>
                    </>
                  )}
                </div>

                {/* Reply Section */}
                <div className="reply-section">
                  <h5>การตอบกลับ:</h5>
                  {review.admin_response && !isReplying ? (
                    <div className="existing-reply">
                      <div className="reply-content">{review.admin_response}</div>
                      <button 
                        className="btn-edit-reply"
                        onClick={() => setIsReplying(true)}
                      >
                        แก้ไขการตอบกลับ
                      </button>
                    </div>
                  ) : (
                    <div className="reply-form">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="พิมพ์การตอบกลับ..."
                        rows={4}
                        className="reply-textarea"
                      />
                      <div className="reply-actions">
                        <button 
                          className="btn-send-reply"
                          onClick={handleReply}
                        >
                          ส่งการตอบกลับ
                        </button>
                        {isReplying && (
                          <button 
                            className="btn-cancel-reply"
                            onClick={() => setIsReplying(false)}
                          >
                            ยกเลิก
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn-close" onClick={onClose}>ปิด</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="reviews-content">
      <h2>⭐ การจัดการรีวิวและความคิดเห็น</h2>

      {/* Review Stats */}
      <div className="review-stats">
        <div className="stats-card overview">
          <div className="stats-icon">📊</div>
          <div className="stats-content">
            <h3>ภาพรวมรีวิว</h3>
            <div className="stats-value">{stats.total}</div>
            <div className="stats-label">รีวิวทั้งหมด</div>
          </div>
        </div>

        <div className="stats-card rating">
          <div className="stats-icon">⭐</div>
          <div className="stats-content">
            <h3>คะแนนเฉลี่ย</h3>
            <div className="stats-value">{stats.avgRating}/5.0</div>
            <div className="stats-label">{getStarRating(Math.round(stats.avgRating))}</div>
          </div>
        </div>

        <div className="stats-card pending">
          <div className="stats-icon">⏳</div>
          <div className="stats-content">
            <h3>รอดำเนินการ</h3>
            <div className="stats-value">{stats.pending}</div>
            <div className="stats-label">รีวิว</div>
          </div>
        </div>

        <div className="stats-card approved">
          <div className="stats-icon">✅</div>
          <div className="stats-content">
            <h3>อนุมัติแล้ว</h3>
            <div className="stats-value">{stats.approved}</div>
            <div className="stats-label">รีวิว</div>
          </div>
        </div>
      </div>

      {/* Rating Distribution */}
      <div className="rating-distribution">
        <h3>การกระจายคะแนน</h3>
        <div className="distribution-chart">
          {[5, 4, 3, 2, 1].map(rating => (
            <div key={rating} className="distribution-row">
              <span className="rating-label">{rating} ⭐</span>
              <div className="distribution-bar">
                <div 
                  className="bar-fill"
                  style={{ 
                    width: `${stats.total > 0 ? (distribution[rating] / stats.total) * 100 : 0}%`,
                    backgroundColor: rating >= 4 ? '#28a745' : rating >= 3 ? '#ffc107' : '#dc3545'
                  }}
                ></div>
              </div>
              <span className="rating-count">{distribution[rating]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="review-controls">
        <div className="search-section">
          <input
            type="text"
            placeholder="ค้นหารีวิว (ชื่อ, หัวข้อ, เนื้อหา, สาขา)..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="filter-select"
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
          >
            <option value="">ทุกคะแนน</option>
            <option value="5">5 ดาว</option>
            <option value="4">4 ดาว</option>
            <option value="3">3 ดาว</option>
            <option value="2">2 ดาว</option>
            <option value="1">1 ดาว</option>
          </select>
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">ทุกสถานะ</option>
            <option value="pending">รอดำเนินการ</option>
            <option value="approved">อนุมัติแล้ว</option>
            <option value="rejected">ปฏิเสธ</option>
            <option value="flagged">ถูกรายงาน</option>
          </select>
          <select
            className="filter-select"
            value={fitnessFilter}
            onChange={(e) => setFitnessFilter(e.target.value)}
          >
            {fitnessBranches.map(branch => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
          <button className="btn-reset" onClick={() => {
            setSearchTerm('');
            setRatingFilter('');
            setStatusFilter('');
            setFitnessFilter('all');
          }}>
            รีเซ็ต
          </button>
        </div>
      </div>

      {/* Reviews Table */}
      <div className="data-table">
        {loading ? (
          <div className="loading-message">กำลังโหลดข้อมูลรีวิว...</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>ลูกค้า</th>
                <th>คะแนน</th>
                <th>หัวข้อ</th>
                <th>สาขา</th>
                <th>บริการ</th>
                <th>สถานะ</th>
                <th>การโต้ตอบ</th>
                <th>วันที่</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredReviews.length > 0 ? (
                filteredReviews.map((review) => (
                  <tr key={review.id}>
                    <td>{review.id}</td>
                    <td>
                      <div className="user-cell">
                        <span className="user-avatar">{review.user_avatar}</span>
                        <div>
                          <div style={{ fontWeight: '500' }}>{review.user_name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#666' }}>
                            {review.trainer_name !== '-' ? `โค้ช: ${review.trainer_name}` : 'ไม่มีโค้ช'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="rating-cell">
                        <span className="stars">{getStarRating(review.rating)}</span>
                        <span className="rating-number">({review.rating})</span>
                      </div>
                    </td>
                    <td>
                      <div className="title-cell">
                        {review.title.length > 30 ? `${review.title.slice(0, 30)}...` : review.title}
                      </div>
                    </td>
                    <td>{review.fitness_name}</td>
                    <td>{review.service_type}</td>
                    <td>{getStatusBadge(review.status)}</td>
                    <td>
                      <div className="interaction-cell">
                        <span className="helpful">👍 {review.helpful_count}</span>
                        <span className="reports">🚩 {review.report_count}</span>
                      </div>
                    </td>
                    <td>{new Date(review.created_at).toLocaleDateString('th-TH')}</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-view"
                          onClick={() => {
                            setSelectedReview(review);
                            setShowReviewModal(true);
                          }}
                        >
                          ดู
                        </button>
                        {review.status === 'pending' && (
                          <>
                            <button
                              className="btn-approve"
                              onClick={() => handleStatusChange(review.id, 'approved')}
                            >
                              อนุมัติ
                            </button>
                            <button
                              className="btn-reject"
                              onClick={() => handleStatusChange(review.id, 'rejected')}
                            >
                              ปฏิเสธ
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: '2rem' }}>
                    ไม่พบรีวิวที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Review Detail Modal */}
      {showReviewModal && (
        <ReviewDetailModal
          review={selectedReview}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedReview(null);
          }}
          onReply={handleReplyReview}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
};

const NotificationsTab = () => (
  <div className="notifications-content">
    <h2>🔔 จัดการการแจ้งเตือน</h2>
    <div className="section">
      <p>ระบบจัดการการแจ้งเตือนยังอยู่ระหว่างการพัฒนา</p>
    </div>
  </div>
);

// Mock fitness branches - ย้ายออกมานอก component เพื่อป้องกัน re-creation
const fitnessBranches = [
  { id: 'all', name: 'ทุกสาขา' },
  { id: 'ladprao', name: 'PJ Fitness Ladprao' },
  { id: 'sukhumvit', name: 'PJ Fitness Sukhumvit' },
  { id: 'silom', name: 'PJ Fitness Silom' },
  { id: 'thonglor', name: 'PJ Fitness Thonglor' },
  { id: 'chatuchak', name: 'PJ Fitness Chatuchak' }
];

const ReportsTab = () => {
  const [reportData, setReportData] = useState({
    daily: [],
    monthly: [],
    yearly: [],
    fitnessBreakdown: []
  });
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [selectedFitness, setSelectedFitness] = useState('all');
  const [loading, setLoading] = useState(false);

  const generateMockReportData = useCallback(() => {
    // Generate daily data for current month
    const dailyData = [];
    const daysInMonth = new Date(2025, 9, 0).getDate(); // October 2025
    
    for (let day = 1; day <= daysInMonth; day++) {
      const revenue = Math.floor(Math.random() * 50000) + 20000; // 20k-70k per day
      const bookings = Math.floor(Math.random() * 50) + 20; // 20-70 bookings
      dailyData.push({
        date: `2025-10-${String(day).padStart(2, '0')}`,
        revenue: revenue,
        bookings: bookings,
        avgPerBooking: Math.round(revenue / bookings)
      });
    }

    // Generate monthly data for current year
    const monthlyData = [];
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    
    for (let month = 0; month < 12; month++) {
      const revenue = Math.floor(Math.random() * 800000) + 400000; // 400k-1.2M per month
      const bookings = Math.floor(Math.random() * 800) + 400; // 400-1200 bookings
      monthlyData.push({
        month: months[month],
        period: `2025-${String(month + 1).padStart(2, '0')}`,
        revenue: revenue,
        bookings: bookings,
        avgPerBooking: Math.round(revenue / bookings)
      });
    }

    // Generate yearly data
    const yearlyData = [];
    for (let year = 2023; year <= 2025; year++) {
      const revenue = Math.floor(Math.random() * 5000000) + 8000000; // 8M-13M per year
      const bookings = Math.floor(Math.random() * 5000) + 8000; // 8k-13k bookings
      yearlyData.push({
        year: year,
        revenue: revenue,
        bookings: bookings,
        avgPerBooking: Math.round(revenue / bookings),
        growth: year > 2023 ? (Math.random() * 30 + 5).toFixed(1) : 0 // 5-35% growth
      });
    }

    // Generate fitness breakdown
    const fitnessBreakdown = fitnessBranches.slice(1).map(fitness => {
      const revenue = Math.floor(Math.random() * 200000) + 100000; // 100k-300k per branch
      const bookings = Math.floor(Math.random() * 200) + 100; // 100-300 bookings
      return {
        id: fitness.id,
        name: fitness.name,
        revenue: revenue,
        bookings: bookings,
        avgPerBooking: Math.round(revenue / bookings),
        marketShare: ((revenue / 1000000) * 100).toFixed(1) // Mock market share
      };
    });

    return {
      daily: dailyData,
      monthly: monthlyData,
      yearly: yearlyData,
      fitnessBreakdown: fitnessBreakdown
    };
  }, []);

  const loadReportData = useCallback(async () => {
    setLoading(true);
    try {
      // Mock report data - ในระบบจริงจะดึงจาก Supabase
      const mockData = generateMockReportData();
      setReportData(mockData);
    } catch (error) {
      console.error('Error loading report data:', error);
    }
    setLoading(false);
  }, [generateMockReportData]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  const getCurrentData = () => {
    switch (selectedPeriod) {
      case 'daily':
        return reportData.daily;
      case 'monthly':
        return reportData.monthly;
      case 'yearly':
        return reportData.yearly;
      default:
        return reportData.monthly;
    }
  };

  const getTotalRevenue = () => {
    const data = getCurrentData();
    return data.reduce((sum, item) => sum + item.revenue, 0);
  };

  const getTotalBookings = () => {
    const data = getCurrentData();
    return data.reduce((sum, item) => sum + item.bookings, 0);
  };

  const getAveragePerBooking = () => {
    const totalRevenue = getTotalRevenue();
    const totalBookings = getTotalBookings();
    return totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0;
  };

  const exportToCSV = (data, filename) => {
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => row[header]).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('th-TH');
  };

  return (
    <div className="reports-content">
      <h2>📈 รายงานและการวิเคราะห์ข้อมูล</h2>

      {/* Controls */}
      <div className="report-controls">
        <div className="control-group">
          <label>ช่วงเวลา:</label>
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="report-select"
          >
            <option value="daily">รายวัน</option>
            <option value="monthly">รายเดือน</option>
            <option value="yearly">รายปี</option>
          </select>
        </div>

        <div className="control-group">
          <label>สาขา:</label>
          <select 
            value={selectedFitness} 
            onChange={(e) => setSelectedFitness(e.target.value)}
            className="report-select"
          >
            {fitnessBranches.map(branch => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>

        {selectedPeriod === 'daily' && (
          <div className="control-group">
            <label>เดือน:</label>
            <input 
              type="month" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="report-date"
            />
          </div>
        )}

        <div className="control-group">
          <button 
            className="btn-export"
            onClick={() => exportToCSV(getCurrentData(), `report-${selectedPeriod}-${new Date().toISOString().slice(0, 10)}`)}
          >
            📤 ส่งออก CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="report-summary">
        <div className="summary-card">
          <div className="summary-icon">💰</div>
          <div className="summary-content">
            <h3>รายได้รวม</h3>
            <div className="summary-value">{formatCurrency(getTotalRevenue())}</div>
            <div className="summary-period">{selectedPeriod === 'daily' ? 'เดือนนี้' : selectedPeriod === 'monthly' ? 'ปีนี้' : 'ทั้งหมด'}</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">📊</div>
          <div className="summary-content">
            <h3>จำนวนการจอง</h3>
            <div className="summary-value">{getTotalBookings().toLocaleString()}</div>
            <div className="summary-period">รายการ</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">💳</div>
          <div className="summary-content">
            <h3>ค่าเฉลี่ยต่อการจอง</h3>
            <div className="summary-value">{formatCurrency(getAveragePerBooking())}</div>
            <div className="summary-period">บาท/รายการ</div>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon">🏢</div>
          <div className="summary-content">
            <h3>จำนวนสาขา</h3>
            <div className="summary-value">{fitnessBranches.length - 1}</div>
            <div className="summary-period">สาขา</div>
          </div>
        </div>
      </div>

      {/* Main Report Table */}
      <div className="report-table-section">
        <div className="section-header">
          <h3>📋 รายงาน{selectedPeriod === 'daily' ? 'รายวัน' : selectedPeriod === 'monthly' ? 'รายเดือน' : 'รายปี'}</h3>
          <div className="table-actions">
            <button 
              className="btn-refresh"
              onClick={loadReportData}
              disabled={loading}
            >
              🔄 รีเฟรช
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-message">กำลังโหลดข้อมูลรายงาน...</div>
        ) : (
          <div className="data-table">
            <table>
              <thead>
                <tr>
                  <th>{selectedPeriod === 'daily' ? 'วันที่' : selectedPeriod === 'monthly' ? 'เดือน' : 'ปี'}</th>
                  <th>รายได้ (บาท)</th>
                  <th>จำนวนการจอง</th>
                  <th>ค่าเฉลี่ย/การจอง</th>
                  {selectedPeriod === 'yearly' && <th>การเติบโต (%)</th>}
                </tr>
              </thead>
              <tbody>
                {getCurrentData().map((item, index) => (
                  <tr key={index}>
                    <td>
                      {selectedPeriod === 'daily' ? formatDate(item.date) :
                       selectedPeriod === 'monthly' ? item.month :
                       item.year}
                    </td>
                    <td className="currency">{formatCurrency(item.revenue)}</td>
                    <td className="number">{item.bookings.toLocaleString()}</td>
                    <td className="currency">{formatCurrency(item.avgPerBooking)}</td>
                    {selectedPeriod === 'yearly' && (
                      <td className="growth">
                        {item.growth > 0 ? `+${item.growth}%` : '-'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Fitness Branch Breakdown */}
      <div className="fitness-breakdown-section">
        <h3>🏢 รายงานตามสาขา</h3>
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>สาขา</th>
                <th>รายได้ (บาท)</th>
                <th>จำนวนการจอง</th>
                <th>ค่าเฉลี่ย/การจอง</th>
                <th>ส่วนแบ่งตลาด (%)</th>
              </tr>
            </thead>
            <tbody>
              {reportData.fitnessBreakdown.map((branch) => (
                <tr key={branch.id}>
                  <td>{branch.name}</td>
                  <td className="currency">{formatCurrency(branch.revenue)}</td>
                  <td className="number">{branch.bookings.toLocaleString()}</td>
                  <td className="currency">{formatCurrency(branch.avgPerBooking)}</td>
                  <td className="percentage">{branch.marketShare}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Insights */}
      <div className="insights-section">
        <h3>💡 ข้อมูลเชิงลึก</h3>
        <div className="insights-grid">
          <div className="insight-card">
            <h4>📈 แนวโน้มรายได้</h4>
            <p>รายได้เฉลี่ยต่อเดือน: {formatCurrency(getTotalRevenue() / 12)}</p>
            <p>การเติบโตเฉลี่ย: +15.2% ต่อปี</p>
          </div>
          
          <div className="insight-card">
            <h4>🎯 สาขายอดนิยม</h4>
            <p>สาขาที่มีรายได้สูงสุด: PJ Fitness Sukhumvit</p>
            <p>สาขาที่มีการจองมากสุด: PJ Fitness Ladprao</p>
          </div>
          
          <div className="insight-card">
            <h4>⭐ ประสิทธิภาพ</h4>
            <p>อัตราการจองเสร็จสิ้น: 89.5%</p>
            <p>ความพึงพอใจเฉลี่ย: 4.7/5.0</p>
          </div>
          
          <div className="insight-card">
            <h4>📅 ช่วงเวลายอดนิยม</h4>
            <p>วันที่ดีที่สุด: วันเสาร์</p>
            <p>เวลาที่ดีที่สุด: 18:00-20:00 น.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;