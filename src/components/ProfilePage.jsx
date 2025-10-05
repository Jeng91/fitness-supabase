import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import './ProfilePage.css';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    useremail: '',
    userage: '',
    usertel: '',
    profile_image: '',
    full_name: ''
  });
  const [activeTab, setActiveTab] = useState('profile');
  const [favorites, setFavorites] = useState([]);

  // โหลดรายการโปรด
  const loadFavorites = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('tbl_favorites')
        .select(`
          fitness_id,
          tbl_fitness:fitness_id (
            fit_id,
            fit_name,
            fit_address,
            fit_price,
            fit_image
          )
        `)
        .eq('user_id', user.id);

      if (!error && data) {
        const favoritesWithDetails = data.map(item => ({
          id: item.fitness_id,
          ...item.tbl_fitness
        }));
        setFavorites(favoritesWithDetails);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  }, [user?.id]);

  // ตรวจสอบ authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/login');
        return;
      }

      setUser(user);
    };
    
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('Fetching profile for user:', user.id);
        
        // Set timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
          setLoading(false);
          console.log('Profile loading timeout');
        }, 10000); // 10 seconds timeout
        
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_uid', user.id)
          .single();

        clearTimeout(timeoutId);

        if (error) {
          if (error.code === 'PGRST116') {
            // No profile found - create empty profile
            console.log('No profile found, will create when user saves');
            setProfile(null);
          } else {
            console.error('Error fetching profile:', error);
          }
        } else if (data) {
          console.log('Profile loaded:', data);
          setProfile(data);
          
          // Set form data with proper fallbacks
          const newFormData = {
            username: data.username || '',
            useremail: data.useremail || user?.email || '',
            userage: data.userage ? data.userage.toString() : '',
            usertel: data.usertel || '',
            profile_image: data.profile_image || '',
            full_name: data.full_name || ''
          };
          
          console.log('Setting form data:', newFormData);
          setFormData(newFormData);
        } else {
          // No data returned but no error
          console.log('No profile data found, creating empty profile');
          setProfile(null);
          setFormData({
            username: '',
            useremail: user?.email || '',
            userage: '',
            usertel: '',
            profile_image: '',
            full_name: ''
          });
        }
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchProfile();
    }
  }, [user]);

  // useEffect สำหรับโหลด favorites
  useEffect(() => {
    if (user?.id) {
      loadFavorites();
    }
  }, [user?.id, loadFavorites]);

  // ลบรายการโปรด
  const removeFavorite = async (fitnessId) => {
    try {
      const { error } = await supabase
        .from('tbl_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('fitness_id', fitnessId);

      if (!error) {
        setFavorites(favorites.filter(item => item.id !== fitnessId));
      }
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  // Load settings from localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    const savedNotifications = localStorage.getItem('notifications') === 'true';
    setDarkMode(savedDarkMode);
    setNotifications(savedNotifications);
    
    // Apply dark mode to body
    if (savedDarkMode) {
      document.body.classList.add('dark-mode');
    }
  }, []);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());
    
    if (newDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    
    // Show notification
    const message = newDarkMode ? 'เปิดโหมดมืดแล้ว' : 'ปิดโหมดมืดแล้ว';
    console.log(message);
  };

  // Toggle notifications
  const toggleNotifications = () => {
    const newNotifications = !notifications;
    setNotifications(newNotifications);
    localStorage.setItem('notifications', newNotifications.toString());
    
    // Show notification
    const message = newNotifications ? 'เปิดการแจ้งเตือนแล้ว' : 'ปิดการแจ้งเตือนแล้ว';
    console.log(message);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      console.log('Saving profile for user:', user.id, formData);
      
      // Basic validation
      if (formData.userage && (parseInt(formData.userage) < 1 || parseInt(formData.userage) > 120)) {
        alert('กรุณาใส่อายุระหว่าง 1-120 ปี');
        setIsLoading(false);
        return;
      }
      
      if (formData.useremail && !formData.useremail.includes('@')) {
        alert('กรุณาใส่อีเมลให้ถูกต้อง');
        setIsLoading(false);
        return;
      }
      
      // Prepare data for database
      const profileData = {
        user_uid: user.id,
        username: formData.username?.trim() || null,
        useremail: formData.useremail?.trim() || user?.email,
        userage: formData.userage ? parseInt(formData.userage) : null,
        usertel: formData.usertel?.trim() || null,
        profile_image: formData.profile_image?.trim() || null,
        full_name: formData.full_name?.trim() || null,
        updated_at: new Date().toISOString()
      };

      // Add created_at if this is a new profile
      if (!profile) {
        profileData.created_at = new Date().toISOString();
      }

      console.log('Sending data to database:', profileData);
      
      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileData)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        alert('เกิดข้อผิดพลาดในการอัพเดทข้อมูล: ' + error.message);
        return;
      }

      console.log('Profile saved successfully:', data);
      setProfile(data);
      
      // Update form data with saved data to ensure consistency
      setFormData({
        username: data.username || '',
        useremail: data.useremail || user?.email || '',
        userage: data.userage ? data.userage.toString() : '',
        usertel: data.usertel || '',
        profile_image: data.profile_image || '',
        full_name: data.full_name || ''
      });
      
      setEditing(false);
      alert('✅ บันทึกข้อมูลสำเร็จ!');
    } catch (error) {
      console.error('Error:', error);
      alert('เกิดข้อผิดพลาดในการอัพเดทข้อมูล');
    } finally {
      setIsLoading(false);
    }
  };

  const menuItems = [
    { id: 'profile', name: 'ข้อมูลส่วนตัว', icon: '👤' },
    { id: 'favorites', name: 'รายการโปรด', icon: '❤️' },
    { id: 'booking', name: 'สถานะการจอง', icon: '📅' },
    { id: 'history', name: 'ประวัติการเข้าใช้บริการ', icon: '📋' },
    { id: 'reviews', name: 'การรีวิว', icon: '⭐' },
    { id: 'workouts', name: 'บันทึกการออกกำลังกาย', icon: '💪' },
    { id: 'nutrition', name: 'บันทึกโภชนาการ', icon: '🥗' },
    { id: 'goals', name: 'เป้าหมาย', icon: '🎯' },
    { id: 'progress', name: 'ความก้าวหน้า', icon: '📊' },
    { id: 'settings', name: 'การตั้งค่า', icon: '⚙️' }
  ];

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading">
          <div className="spinner"></div>
          <p>กำลังโหลดข้อมูล...</p>
          <small>หากใช้เวลานานเกินไป กรุณารีเฟรชหน้าเว็บ</small>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-container">
        <div className="loading">
          <p>กรุณาเข้าสู่ระบบก่อน</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  return (
    <div className={`profile-container ${darkMode ? 'dark-mode' : ''}`}>
      {/* Header */}
      <header className="profile-header">
        <div className="header-content">
          <h1>โปรไฟล์ของฉัน</h1>
          <div className="user-info">
            <span>สวัสดี, {profile?.full_name || profile?.username || user?.email?.split('@')[0] || 'ผู้ใช้'}</span>
            <button onClick={handleLogout} className="logout-btn">
              ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Menu */}
      <nav className="profile-nav">
        <div className="nav-container">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-text">{item.name}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="profile-main">
        {activeTab === 'profile' && (
          <div className="tab-content">
            <div className="section-header">
              <h2>ข้อมูลส่วนตัว</h2>
              <div className="section-buttons">
                {!editing ? (
                  <>
                    <button
                      onClick={() => {
                        setLoading(true);
                        const fetchProfile = async () => {
                          try {
                            const { data } = await supabase
                              .from('profiles')
                              .select('*')
                              .eq('user_uid', user.id)
                              .single();
                            
                            if (data) {
                              setProfile(data);
                              setFormData({
                                username: data.username || '',
                                useremail: data.useremail || user?.email || '',
                                userage: data.userage ? data.userage.toString() : '',
                                usertel: data.usertel || '',
                                profile_image: data.profile_image || '',
                                full_name: data.full_name || ''
                              });
                            }
                          } catch (error) {
                            console.error('Refresh error:', error);
                          } finally {
                            setLoading(false);
                          }
                        };
                        fetchProfile();
                      }}
                      className="refresh-btn"
                      disabled={loading}
                    >
                      🔄 รีเฟรช
                    </button>
                    <button
                      onClick={() => setEditing(true)}
                      className="edit-btn"
                    >
                      แก้ไข
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleSave()}
                      className="edit-btn"
                      disabled={isLoading}
                    >
                      {isLoading ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                    <button
                      onClick={() => {
                        setEditing(false);
                        setFormData({
                          username: profile?.username || '',
                          useremail: profile?.useremail || user?.email || '',
                          userage: profile?.userage || '',
                          usertel: profile?.usertel || '',
                          profile_image: profile?.profile_image || '',
                          full_name: profile?.full_name || ''
                        });
                      }}
                      className="cancel-btn"
                    >
                      ยกเลิก
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="profile-form">
              <div className="form-group">
                <label>ชื่อผู้ใช้ (Username)</label>
                {editing ? (
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    placeholder="กรอกชื่อผู้ใช้"
                  />
                ) : (
                  <div className="form-value">{formData.username || profile?.username || 'ยังไม่ได้กรอก'}</div>
                )}
              </div>

              <div className="form-group">
                <label>ชื่อ-นามสกุล</label>
                {editing ? (
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    placeholder="กรอกชื่อ-นามสกุล"
                  />
                ) : (
                  <div className="form-value">{formData.full_name || profile?.full_name || 'ยังไม่ได้กรอก'}</div>
                )}
              </div>

              <div className="form-group">
                <label>อีเมล</label>
                {editing ? (
                  <input
                    type="email"
                    name="useremail"
                    value={formData.useremail}
                    onChange={handleInputChange}
                    placeholder="กรอกอีเมล"
                  />
                ) : (
                  <div className="form-value">{formData.useremail || profile?.useremail || user?.email || 'ยังไม่ได้กรอก'}</div>
                )}
              </div>

              <div className="form-group">
                <label>เบอร์โทรศัพท์</label>
                {editing ? (
                  <input
                    type="tel"
                    name="usertel"
                    value={formData.usertel}
                    onChange={handleInputChange}
                    placeholder="กรอกเบอร์โทรศัพท์"
                  />
                ) : (
                  <div className="form-value">{formData.usertel || profile?.usertel || 'ยังไม่ได้กรอก'}</div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>อายุ</label>
                  {editing ? (
                    <input
                      type="number"
                      name="userage"
                      value={formData.userage}
                      onChange={handleInputChange}
                      placeholder="กรอกอายุ"
                      min="1"
                      max="120"
                    />
                  ) : (
                    <div className="form-value">
                      {(formData.userage || profile?.userage) ? `${formData.userage || profile?.userage} ปี` : 'ยังไม่ได้กรอก'}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>รูปโปรไฟล์ (URL)</label>
                  {editing ? (
                    <input
                      type="url"
                      name="profile_image"
                      value={formData.profile_image}
                      onChange={handleInputChange}
                      placeholder="กรอก URL รูปภาพ"
                    />
                  ) : (
                    <div className="form-value">
                      {(formData.profile_image || profile?.profile_image) ? (
                        <div className="profile-image-preview">
                          <img 
                            src={formData.profile_image || profile.profile_image} 
                            alt="Profile" 
                            style={{width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover'}}
                            onError={(e) => {e.target.style.display = 'none'}}
                          />
                          <span style={{marginLeft: '10px'}}>มีรูปโปรไฟล์</span>
                        </div>
                      ) : 'ยังไม่ได้อัพโหลด'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'favorites' && (
          <div className="tab-content">
            <div className="section-header">
              <h2>รายการโปรด</h2>
              <button
                onClick={loadFavorites}
                className="refresh-btn"
                title="รีเฟรชรายการโปรด"
              >
                🔄 รีเฟรช
              </button>
            </div>
            
            <div className="favorites-section">
              {favorites.length > 0 ? (
                <div className="favorites-grid">
                  {favorites.map((fitness) => (
                    <div key={fitness.id} className="favorite-card">
                      <div className="favorite-image">
                        <img 
                          src={fitness.fit_image || '/placeholder-gym.jpg'} 
                          alt={fitness.fit_name}
                        />
                        <button
                          className="remove-favorite-btn"
                          onClick={() => removeFavorite(fitness.id)}
                          title="ลบออกจากรายการโปรด"
                        >
                          ❤️
                        </button>
                      </div>
                      
                      <div className="favorite-info">
                        <h3>{fitness.fit_name}</h3>
                        <p className="favorite-location">
                          <span className="location-icon">📍</span>
                          {fitness.fit_address}
                        </p>
                        <div className="favorite-price">
                          <span className="currency">THB</span>
                          <span className="amount">{fitness.fit_price}</span>
                        </div>
                        
                        <button 
                          className="view-fitness-btn"
                          onClick={() => navigate(`/fitness/${fitness.fit_id}`)}
                        >
                          ดูรายละเอียด
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-favorites">
                  <div className="no-favorites-icon">💔</div>
                  <h3>ยังไม่มีรายการโปรด</h3>
                  <p>เพิ่มฟิตเนสที่คุณชอบเข้าสู่รายการโปรด</p>
                  <button 
                    className="browse-fitness-btn"
                    onClick={() => navigate('/')}
                  >
                    เลือกดูฟิตเนส
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'booking' && (
          <div className="tab-content">
            <h2>สถานะการจอง</h2>
            <div className="booking-section">
              <div className="booking-stats">
                <div className="stat-card">
                  <h3>การจองที่กำลังจะมาถึง</h3>
                  <p className="stat-number">2</p>
                </div>
                <div className="stat-card">
                  <h3>การจองที่เสร็จสิ้น</h3>
                  <p className="stat-number">15</p>
                </div>
                <div className="stat-card">
                  <h3>การจองที่ยกเลิก</h3>
                  <p className="stat-number">1</p>
                </div>
              </div>
              
              <div className="booking-list">
                <h3>การจองล่าสุด</h3>
                <div className="booking-item">
                  <div className="booking-info">
                    <h4>Personal Training</h4>
                    <p>📅 15 ตุลาคม 2025 - 10:00 น.</p>
                    <p>👨‍🏫 ครูโค้ช: จอห์น สมิธ</p>
                  </div>
                  <span className="status confirmed">ยืนยันแล้ว</span>
                </div>
                <div className="booking-item">
                  <div className="booking-info">
                    <h4>Group Fitness</h4>
                    <p>📅 18 ตุลาคม 2025 - 18:00 น.</p>
                    <p>👥 กลุ่ม: Yoga Class</p>
                  </div>
                  <span className="status pending">รอยืนยัน</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="tab-content">
            <h2>ประวัติการเข้าใช้บริการ</h2>
            <div className="history-section">
              <div className="history-summary">
                <div className="summary-card">
                  <h3>จำนวนครั้งที่เข้าใช้บริการ</h3>
                  <p className="summary-number">42 ครั้ง</p>
                </div>
                <div className="summary-card">
                  <h3>เวลารวมทั้งหมด</h3>
                  <p className="summary-number">68 ชั่วโมง</p>
                </div>
              </div>
              
              <div className="history-list">
                <h3>ประวัติล่าสุด</h3>
                <div className="history-item">
                  <div className="history-date">12 ต.ค. 2025</div>
                  <div className="history-details">
                    <h4>Weight Training</h4>
                    <p>⏱️ เวลา: 1.5 ชั่วโมง</p>
                    <p>🏋️ อุปกรณ์: ห้องโรงยิม</p>
                  </div>
                  <div className="history-status">เสร็จสิ้น</div>
                </div>
                <div className="history-item">
                  <div className="history-date">10 ต.ค. 2025</div>
                  <div className="history-details">
                    <h4>Cardio Session</h4>
                    <p>⏱️ เวลา: 45 นาที</p>
                    <p>🏃 อุปกรณ์: ลู่วิ่ง</p>
                  </div>
                  <div className="history-status">เสร็จสิ้น</div>
                </div>
                <div className="history-item">
                  <div className="history-date">8 ต.ค. 2025</div>
                  <div className="history-details">
                    <h4>Yoga Class</h4>
                    <p>⏱️ เวลา: 1 ชั่วโมง</p>
                    <p>🧘 ห้อง: Yoga Studio</p>
                  </div>
                  <div className="history-status">เสร็จสิ้น</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="tab-content">
            <h2>การรีวิว</h2>
            <div className="reviews-section">
              <div className="review-summary">
                <div className="rating-overview">
                  <h3>คะแนนรีวิวเฉลี่ย</h3>
                  <div className="rating-display">
                    <span className="rating-score">4.8</span>
                    <div className="stars">
                      <span>⭐⭐⭐⭐⭐</span>
                    </div>
                    <p>จาก 12 รีวิว</p>
                  </div>
                </div>
              </div>
              
              <div className="add-review">
                <h3>เขียนรีวิวใหม่</h3>
                <div className="review-form">
                  <div className="rating-input">
                    <label>ให้คะแนน:</label>
                    <div className="star-rating">
                      <span className="star">⭐</span>
                      <span className="star">⭐</span>
                      <span className="star">⭐</span>
                      <span className="star">⭐</span>
                      <span className="star">⭐</span>
                    </div>
                  </div>
                  <textarea 
                    placeholder="เขียนรีวิวของคุณ..."
                    rows="4"
                    className="review-text"
                  ></textarea>
                  <button className="submit-review-btn">ส่งรีวิว</button>
                </div>
              </div>
              
              <div className="reviews-list">
                <h3>รีวิวของคุณ</h3>
                <div className="review-item">
                  <div className="review-header">
                    <div className="review-rating">⭐⭐⭐⭐⭐</div>
                    <div className="review-date">5 ต.ค. 2025</div>
                  </div>
                  <div className="review-service">Personal Training - ครูโค้ช: จอห์น</div>
                  <p className="review-content">
                    บริการดีมาก ครูโค้ชใส่ใจและให้คำแนะนำที่เป็นประโยชน์ 
                    สถานที่สะอาด อุปกรณ์ครบครัน แนะนำเลยครับ!
                  </p>
                </div>
                <div className="review-item">
                  <div className="review-header">
                    <div className="review-rating">⭐⭐⭐⭐</div>
                    <div className="review-date">28 ก.ย. 2025</div>
                  </div>
                  <div className="review-service">Group Fitness - Yoga Class</div>
                  <p className="review-content">
                    คลาสโยคะสนุกดี บรรยากาศดี แต่อาจจะแน่นไปหน่อย 
                    โดยรวมพอใจครับ
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'workouts' && (
          <div className="tab-content">
            <h2>บันทึกการออกกำลังกาย</h2>
            <div className="coming-soon">
              <div className="icon">💪</div>
              <p>ฟีเจอร์นี้กำลังพัฒนา</p>
              <small>เร็วๆ นี้จะสามารถบันทึกการออกกำลังกายของคุณได้</small>
            </div>
          </div>
        )}

        {activeTab === 'nutrition' && (
          <div className="tab-content">
            <h2>บันทึกโภชนาการ</h2>
            <div className="coming-soon">
              <div className="icon">🥗</div>
              <p>ฟีเจอร์นี้กำลังพัฒนา</p>
              <small>เร็วๆ นี้จะสามารถบันทึกการรับประทานอาหารของคุณได้</small>
            </div>
          </div>
        )}

        {activeTab === 'goals' && (
          <div className="tab-content">
            <h2>เป้าหมาย</h2>
            <div className="coming-soon">
              <div className="icon">🎯</div>
              <p>ฟีเจอร์นี้กำลังพัฒนา</p>
              <small>เร็วๆ นี้จะสามารถตั้งเป้าหมายฟิตเนสของคุณได้</small>
            </div>
          </div>
        )}

        {activeTab === 'progress' && (
          <div className="tab-content">
            <h2>ความก้าวหน้า</h2>
            <div className="coming-soon">
              <div className="icon">📊</div>
              <p>ฟีเจอร์นี้กำลังพัฒนา</p>
              <small>เร็วๆ นี้จะสามารถดูความก้าวหน้าของคุณได้</small>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="tab-content">
            <h2>การตั้งค่า</h2>
            <div className="settings-section">
              <div className="setting-item">
                <h3>การแจ้งเตือน</h3>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={notifications}
                    onChange={toggleNotifications}
                  />
                  <span className="slider"></span>
                </label>
              </div>
              <div className="setting-item">
                <h3>โหมดมืด</h3>
                <label className="switch">
                  <input 
                    type="checkbox" 
                    checked={darkMode}
                    onChange={toggleDarkMode}
                  />
                  <span className="slider"></span>
                </label>
              </div>
              <div className="setting-item">
                <h3>ภาษา</h3>
                <select defaultValue="th">
                  <option value="th">ไทย</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ProfilePage;