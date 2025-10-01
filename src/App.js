import React, { useState, useEffect } from 'react';
import './App.css';
import supabase from './supabaseClient';
import ProfilePage from './components/ProfilePage';
import MainPartners from './components/MainPartners';


function App() {


    const [currentPage, setCurrentPage] = useState('หน้าหลัก');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [fitnessData, setFitnessData] = useState([]); // เพิ่ม state สำหรับข้อมูลฟิตเนส
    const [showImageModal, setShowImageModal] = useState(false); // Modal สำหรับแสดงรูป
    const [selectedFitness, setSelectedFitness] = useState(null); // ฟิตเนสที่เลือกดู
    const [formData, setFormData] = useState({
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      role: 'user'
    });

    // Redirect to mainpartners page if userProfile is partner
  useEffect(() => {
    if (userProfile?.role === 'partner' && currentPage !== 'mainpartners') {
      setCurrentPage('mainpartners');
    }
  }, [userProfile, currentPage]);

  // ตรวจสอบสถานะการเข้าสู่ระบบเมื่อแอปเริ่มต้น
  useEffect(() => {
    const checkUserSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);
        await loadUserProfile(user.id);
      }
    };

    checkUserSession();
    
    // ฟังการเปลี่ยนแปลงสถานะ auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (event === 'SIGNED_OUT' || !session?.user) {
        // Clear all user data เมื่อออกจากระบบ
        setUser(null);
        setUserProfile(null);
        setCurrentPage('หน้าหลัก');
        console.log('User signed out, cleared all data');
      } else if (session?.user) {
        setUser(session.user);
        await loadUserProfile(session.user.id);
        console.log('User signed in:', session.user.email);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId) => {
    try {
      console.log('Loading profile for user:', userId);

      // ตรวจสอบ tbl_owner ก่อน
      const { data: owner, error: ownerError } = await supabase
        .from('tbl_owner')
        .select('*')
        .eq('auth_user_id', userId)
        .single();

      if (owner && !ownerError) {
        console.log('Found owner profile:', owner);
        console.log('Owner keys:', Object.keys(owner));
        setUserProfile({ ...owner, role: 'partner' });
        return;
      }

      // ถ้าไม่ใช่ partner ให้หาใน profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_uid', userId)
        .single();

      if (profile && !profileError) {
        console.log('Found user profile:', profile);
        setUserProfile({ ...profile, role: 'user' });
        return;
      }

      console.log('No profile found in any table for user:', userId);
      // ถ้าไม่เจอใน table ไหนเลย ให้สร้าง default profile
      const currentUser = await supabase.auth.getUser();
      setUserProfile({
        role: 'user',
        full_name: currentUser.data?.user?.user_metadata?.full_name || 'ผู้ใช้ใหม่',
        email: currentUser.data?.user?.email
      });

    } catch (error) {
      console.error('Error loading user profile:', error);
      // สร้าง fallback profile
      const currentUser = await supabase.auth.getUser();
      setUserProfile({
        role: 'user', 
        full_name: currentUser.data?.user?.user_metadata?.full_name || 'ผู้ใช้ใหม่',
        email: currentUser.data?.user?.email
      });
    }
  };

  // Function สำหรับโหลดข้อมูลฟิตเนส
  const loadFitnessData = async () => {
    try {
      // ดึงจาก tbl_fitness ตามโครงสร้างที่ให้มา
      const { data, error } = await supabase
        .from('tbl_fitness')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading fitness data from tbl_fitness:', error);
        setFitnessData([]);
      } else {
        // แปลงข้อมูลจาก tbl_fitness ให้เป็นรูปแบบที่ใช้แสดงผล
        const transformedData = data?.map(fitness => ({
          id: fitness.fit_id,
          fitness_name: fitness.fit_name,
          location: fitness.fit_address,
          phone: fitness.fit_phone,
          description: fitness.fit_moredetails,
          owner_name: fitness.fit_user,
          rating: 4.5, // ค่าเริ่มต้น
          price_per_day: fitness.fit_price || 100,
          hours: fitness.fit_dateopen && fitness.fit_dateclose 
            ? `${fitness.fit_dateopen} - ${fitness.fit_dateclose}`
            : 'จ-ส: 06.00 - 22.00',
          status: 'active',
          image: fitness.fit_image,
          image_secondary: fitness.fit_image_secondary
        })) || [];
        
        setFitnessData(transformedData);
      }
    } catch (error) {
      console.error('Error:', error);
      setFitnessData([]);
    }
  };

  // Function สำหรับนำทางกลับหน้าหลัก
  const handleNavigateToHome = () => {
    loadFitnessData(); // โหลดข้อมูลฟิตเนสใหม่
    setCurrentPage('หน้าหลัก');
  };

  // Function สำหรับเปิด Modal แสดงรูป
  const handleShowImages = (fitness) => {
    setSelectedFitness(fitness);
    setShowImageModal(true);
  };

  // Function สำหรับปิด Modal
  const handleCloseModal = () => {
    setShowImageModal(false);
    setSelectedFitness(null);
  };

  // เพิ่ม useEffect สำหรับโหลดข้อมูลฟิตเนสเมื่อเริ่มต้น
  useEffect(() => {
    loadFitnessData();
  }, []);

  // ในหน้าแสดงฟิตเนส (เช่น App.js หรือหน้าค้นหา)
  // ดึงข้อมูลฟิตเนสทั้งหมดที่มีใน database มาแสดงทันที ไม่ต้องรอ login
  useEffect(() => {
    const fetchAllFitness = async () => {
      const { data } = await supabase
        .from('tbl_fitness')
        .select('*');
      if (data) {
        setFitnessData(data); // setFitnessData คือ state สำหรับเก็บข้อมูลฟิตเนสทั้งหมด
      }
    };
    fetchAllFitness();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setMessage('รหัสผ่านไม่ตรงกัน');
      setIsLoading(false);
      return;
    }

    try {
      // สมัครสมาชิกด้วย Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: undefined, // ปิด email confirmation
          data: {
            full_name: formData.fullName,
            role: formData.role
          }
        }
      });

      if (authError) {
        throw authError;
      }

      // เพิ่มข้อมูลลงในตารางที่เหมาะสมตาม role
      let insertData = {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      let tableName = '';
      
      switch (formData.role) {
        case 'user':
          tableName = 'profiles';
          insertData = {
            ...insertData,
            user_uid: authData.user.id,  // ใช้ user_uid แทน auth_user_id
            username: formData.email.split('@')[0],
            useremail: formData.email,
            full_name: formData.fullName,
            userage: null,
            usertel: null,
            profile_image: null
          };
          break;
        case 'partner':
          tableName = 'tbl_owner';
          insertData = {
            ...insertData,
            auth_user_id: authData.user.id,  // ถ้า tbl_owner ใช้ auth_user_id
            owner_name: formData.fullName,
            owner_email: formData.email,
            owner_password: formData.password // ใช้รหัสผ่านจากฟอร์ม
          };
          break;
        default:
          throw new Error('ประเภทผู้ใช้ไม่ถูกต้อง');
      }

      const { error: insertError } = await supabase
        .from(tableName)
        .insert([insertData]);

      if (insertError) {
        throw insertError;
      }

      setMessage('สมัครสมาชิกสำเร็จ! คุณสามารถเข้าสู่ระบบได้ทันที');
      
      // รีเซ็ตฟอร์ม
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        role: 'user'
      });

      // เปลี่ยนไปหน้าเข้าสู่ระบบหลัง 3 วินาที
      setTimeout(() => {
        setCurrentPage('เข้าสู่ระบบ');
      }, 3000);

    } catch (error) {
      console.error('Registration error:', error);
      
      // Handle specific error cases
      if (error.message.includes('User already registered')) {
        setMessage('อีเมลนี้ถูกใช้ไปแล้ว กรุณาใช้อีเมลอื่น');
      } else if (error.message.includes('Password should be at least 6 characters')) {
        setMessage('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      } else if (error.message.includes('Invalid email')) {
        setMessage('รูปแบบอีเมลไม่ถูกต้อง');
      } else if (error.message.includes('Signup requires a valid password')) {
        setMessage('กรุณาใส่รหัสผ่าน');
      } else {
        setMessage(`เกิดข้อผิดพลาดในการสมัครสมาชิก: ${error.message}`);
      }
    }

    setIsLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (error) {
        // Handle specific error types
        let errorMessage = '';
        switch (error.message) {
          case 'Invalid login credentials':
            errorMessage = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
            break;
          case 'Email not confirmed':
            errorMessage = 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ ตรวจสอบในกล่องจดหมาย';
            break;
          case 'Too many requests':
            errorMessage = 'มีการพยายามเข้าสู่ระบบมากเกินไป กรุณารอสักครู่';
            break;
          default:
            errorMessage = `เกิดข้อผิดพลาด: ${error.message}`;
        }
        throw new Error(errorMessage);
      }

      setMessage('เข้าสู่ระบบสำเร็จ!');
      // รีเซ็ตฟอร์ม
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        role: 'user'
      });

      // ตรวจสอบประเภทผู้ใช้หลัง login
      setTimeout(async () => {
        const currentUser = await supabase.auth.getUser();
        if (currentUser.data?.user) {
          // ตรวจสอบ tbl_owner ก่อน
          const { data: owner } = await supabase
            .from('tbl_owner')
            .select('*')
            .eq('auth_user_id', currentUser.data.user.id)
            .single();

          if (owner) {
            setCurrentPage('mainpartners');
            return;
          }

          // ถ้าไม่ใช่ partner ให้ตรวจสอบ profiles
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_uid', currentUser.data.user.id)
            .single();

          if (profile) {
            setCurrentPage('โปรไฟล์');
            return;
          }

          // ถ้าไม่เจอในทั้งสองตาราง ให้ไปหน้าโปรไฟล์
          setCurrentPage('โปรไฟล์');
        }
      }, 1000);

    } catch (error) {
      console.error('Login error:', error);
      setMessage(error.message);
    }

    setIsLoading(false);
  };

  const handleLogout = async () => {
    console.log('handleLogout called in App.js');
    try {
      console.log('Attempting to sign out...');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase signOut error:', error);
        throw error;
      }
      
      console.log('Supabase signOut successful');
      
      // Clear state manually เพื่อให้แน่ใจว่าออกจากระบบ
      setUser(null);
      setUserProfile(null);
      setMessage('ออกจากระบบสำเร็จ');
      setCurrentPage('หน้าหลัก');
      
      // Clear form data
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        role: 'user'
      });
      
      console.log('All user data cleared, redirecting to หน้าหลัก');
      
    } catch (error) {
      console.error('Logout error:', error);
      setMessage(`เกิดข้อผิดพลาด: ${error.message}`);
    }
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'หน้าหลัก':
        return (
          <div className="home-content">
            <div className="search-section">
              <h1>ค้นหา</h1>
              <div className="search-bar">
                <input type="text" placeholder="ค้นหา..." className="search-input" />
                <button className="search-btn">ค้นหา</button>
              </div>
            </div>
            
            <div className="fitness-section">
              <h2>ฟิตเนสที่อยู่ใกล้</h2>
              <div className="fitness-grid">
                {fitnessData.length > 0 ? (
                  fitnessData.map((fitness, index) => (
                    <div key={fitness.id || index} className="fitness-card">
                      <div className="fitness-image" onClick={() => handleShowImages(fitness)}>
                        <div className="image-gallery">
                          <img 
                            src={fitness.image || "data:image/svg+xml,%3Csvg width='300' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%' height='100%' fill='%23f0f0f0'/%3E%3Ctext x='50%' y='50%' font-size='18' fill='%23666' text-anchor='middle' dy='.3em'%3EGym Image%3C/text%3E%3C/svg%3E"}
                            alt={fitness.fitness_name}
                            className="main-image"
                            onError={(e) => {
                              e.target.src = "data:image/svg+xml,%3Csvg width='300' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%' height='100%' fill='%23f0f0f0'/%3E%3Ctext x='50%' y='50%' font-size='18' fill='%23666' text-anchor='middle' dy='.3em'%3EGym Image%3C/text%3E%3C/svg%3E";
                            }}
                          />
                          {fitness.image_secondary && (
                            <div className="secondary-image-indicator">
                              <span>+1</span>
                            </div>
                          )}
                        </div>
                        <div className="fitness-status">
                          <span className="status-dot green"></span>
                        </div>
                        <button className="favorite-btn">❤️</button>
                      </div>
                      <div className="fitness-info">
                        <h3>{fitness.fitness_name}</h3>
                        <p className="fitness-location">{fitness.location}</p>
                        <div className="fitness-details">
                          <span className="fitness-hours">{fitness.hours}</span>
                          <div className="fitness-rating">
                            <span className="stars">⭐</span>
                            <span>{fitness.rating || '4.5'}</span>
                          </div>
                        </div>
                        <div className="fitness-price">
                          <span>{fitness.price_per_day || 100}</span>
                          <span className="price-unit">บาท/วัน</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-fitness">
                    <p>ยังไม่มีข้อมูลฟิตเนส</p>
                    <p>เจ้าของฟิตเนสสามารถเพิ่มข้อมูลได้ที่หน้า Partner</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Image Modal */}
            {showImageModal && selectedFitness && (
              <div className="image-modal-overlay" onClick={handleCloseModal}>
                <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3>{selectedFitness.fitness_name}</h3>
                    <button className="close-btn" onClick={handleCloseModal}>×</button>
                  </div>
                  <div className="modal-body">
                    <div className="image-gallery-modal">
                      {selectedFitness.image && (
                        <div className="modal-image-container">
                          <img src={selectedFitness.image} alt="รูปหลัก" />
                          <span className="image-caption">รูปภาพหลัก</span>
                        </div>
                      )}
                      {selectedFitness.image_secondary && (
                        <div className="modal-image-container">
                          <img src={selectedFitness.image_secondary} alt="รูปรอง" />
                          <span className="image-caption">รูปภาพรอง</span>
                        </div>
                      )}
                    </div>
                    <div className="fitness-details-modal">
                      <p><strong>ที่อยู่:</strong> {selectedFitness.location}</p>
                      <p><strong>เวลาทำการ:</strong> {selectedFitness.hours}</p>
                      <p><strong>ราคา:</strong> {selectedFitness.price_per_day} บาท/วัน</p>
                      <p><strong>เบอร์โทร:</strong> {selectedFitness.phone}</p>
                      {selectedFitness.description && (
                        <p><strong>รายละเอียด:</strong> {selectedFitness.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'เข้าสู่ระบบ':
        return (
          <div className="login-content">
            <h2>เข้าสู่ระบบ</h2>
            {message && (
              <div className={`message ${message.includes('สำเร็จ') ? 'success' : 'error'}`}>
                {message}
              </div>
            )}
            <form className="login-form" onSubmit={handleLogin}>
              <div className="form-group">
                <label>อีเมล:</label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="กรุณาใส่อีเมล" 
                  required
                />
              </div>
              <div className="form-group">
                <label>รหัสผ่าน:</label>
                <input 
                  type="password" 
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="กรุณาใส่รหัสผ่าน" 
                  required
                />
              </div>
              <button 
                type="submit" 
                className="login-btn"
                disabled={isLoading}
              >
                {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
              </button>
            </form>
            <p className="signup-link">
              ยังไม่มีบัญชี? <span className="link" onClick={() => setCurrentPage('สมัครสมาชิก')}>สมัครสมาชิก</span>
            </p>
          </div>
        );
      case 'สมัครสมาชิก':
        return (
          <div className="register-content">
            <h2>สมัครสมาชิก</h2>
            {message && (
              <div className={`message ${message.includes('สำเร็จ') ? 'success' : 'error'}`}>
                {message}
              </div>
            )}
            <form className="register-form" onSubmit={handleRegister}>
              <div className="form-group">
                <label>ชื่อ-นามสกุล:</label>
                <input 
                  type="text" 
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="กรุณาใส่ชื่อ-นามสกุล" 
                  required 
                />
              </div>
              <div className="form-group">
                <label>อีเมล:</label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="กรุณาใส่อีเมล" 
                  required 
                />
              </div>
              <div className="form-group">
                <label>รหัสผ่าน:</label>
                <input 
                  type="password" 
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="กรุณาใส่รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)" 
                  required 
                  minLength="6"
                />
              </div>
              <div className="form-group">
                <label>ยืนยันรหัสผ่าน:</label>
                <input 
                  type="password" 
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="กรุณายืนยันรหัสผ่าน" 
                  required 
                />
              </div>
              <div className="form-group">
                <label>ประเภทผู้ใช้:</label>
                <select 
                  name="role" 
                  value={formData.role}
                  onChange={handleInputChange}
                  className="role-select"
                >
                  <option value="user">👤 ผู้ใช้ทั่วไป</option>
                  <option value="partner">🤝 พาร์ทเนอร์</option>
                </select>
              </div>
              <button 
                type="submit" 
                className="register-btn"
                disabled={isLoading}
              >
                {isLoading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
              </button>
            </form>
            <p className="login-link">
              มีบัญชีแล้ว? <span className="link" onClick={() => setCurrentPage('เข้าสู่ระบบ')}>เข้าสู่ระบบ</span>
            </p>
          </div>
        );
      case 'โปรไฟล์':
        console.log('Rendering ProfilePage with user:', user);
        return (
          <ProfilePage 
            user={user} 
            onLogout={handleLogout}
          />
        );
      case 'mainpartners':
        // ดึงข้อมูล ownerData จาก userProfile ที่เป็น partner
        if (userProfile?.role === 'partner') {
          return (
            <MainPartners 
              user={user}
              ownerData={userProfile}
              onLogout={handleLogout}
              onNavigateToHome={handleNavigateToHome}
            />
          );
        }
        // fallback ถ้าไม่ใช่ partner
        return <div>ไม่พบข้อมูลแดชบอร์ดพาร์ทเนอร์</div>;
      default:
        return <div>ไม่พบหน้าที่ต้องการ</div>;
    }
  };

  return (
    <div className="App">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">
          <h2>PJ Fitness</h2>
        </div>
        <ul className="navbar-menu">
          <li 
            className={currentPage === 'หน้าหลัก' ? 'active' : ''}
            onClick={() => setCurrentPage('หน้าหลัก')}
          >
            หน้าหลัก
          </li>
          {!user ? (
            <>
              <li 
                className={currentPage === 'เข้าสู่ระบบ' ? 'active' : ''}
                onClick={() => setCurrentPage('เข้าสู่ระบบ')}
              >
                เข้าสู่ระบบ
              </li>
              <li 
                className={currentPage === 'สมัครสมาชิก' ? 'active' : ''}
                onClick={() => setCurrentPage('สมัครสมาชิก')}
              >
                สมัครสมาชิก
              </li>
            </>
          ) : (
            <>
              {userProfile?.role === 'partner' ? (
                <li 
                  className={currentPage === 'mainpartners' ? 'active' : ''}
                  onClick={() => setCurrentPage('mainpartners')}
                >
                  แดชบอร์ดพาร์ทเนอร์
                </li>
              ) : (
                <li 
                  className={currentPage === 'โปรไฟล์' ? 'active' : ''}
                  onClick={() => setCurrentPage('โปรไฟล์')}
                >
                  โปรไฟล์
                </li>
              )}
              <li className="user-info">
                👤 {
                  userProfile?.full_name || 
                  userProfile?.owner_name || 
                  user?.user_metadata?.full_name ||
                  user?.email?.split('@')[0] ||
                  'ผู้ใช้'
                }
                {userProfile?.role && (
                  <span className="user-role">
                    ({userProfile.role === 'user' ? 'ผู้ใช้' : 'พาร์ทเนอร์'})
                  </span>
                )}
              </li>
              <li 
                className="logout-btn"
                onClick={() => {
                  console.log('Logout button clicked from navbar');
                  handleLogout();
                }}
                style={{cursor: 'pointer'}}
              >
                🚪 ออกจากระบบ
              </li>
            </>
          )}
        </ul>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
