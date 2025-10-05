import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import Layout from '../components/Layout';
import '../App.css';

const HomePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [favorites, setFavorites] = useState([]);
  
  // ฟังก์ชันปรับฟอร์แมตเวลา
  const formatTime = (timeString) => {
    if (!timeString) return timeString;
    return timeString
      .replace(/(\d+):00\.00/g, '$1:00')
      .replace(/(\d+)\.00\.00/g, '$1.00')
      .replace(/(\d+)\.00$/g, '$1')
      .replace(/(\d+):00:00/g, '$1:00')
      .replace(/\.00\s*-\s*(\d+)\.00/g, ' - $1')
      .replace(/(\d+)\.00/g, '$1');
  };

  const [fitnessData, setFitnessData] = useState([]);
  const [filteredFitnessData, setFilteredFitnessData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [priceFilter, setPriceFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [showImageModal, setShowImageModal] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [selectedFitness, setSelectedFitness] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Function สำหรับโหลดข้อมูลฟิตเนส
  const loadFitnessData = useCallback(async () => {
    try {
      const { data: fitnessData, error: fitnessError } = await supabase
        .from('tbl_fitness')
        .select('*')
        .order('created_at', { ascending: false });

      if (fitnessError) {
        console.error('Error loading fitness data:', fitnessError);
        return;
      }
      
      // แปลงข้อมูลให้ตรงกับ format เดิม
      const transformedData = fitnessData.map(item => ({
        id: item.fit_id,
        name: item.fit_name,
        price: item.fit_price,
        location: item.fit_address,
        image: item.fit_image,
        fit_image2: item.fit_image2,
        fit_image3: item.fit_image3,
        fit_image4: item.fit_image4,
        contact: item.fit_contact,
        fit_location: item.fit_location,
        user: item.fit_user,
        phone: item.fit_phone,
        openTime: formatTime(item.fit_open_time),
        closeTime: formatTime(item.fit_close_time),
        description: item.fit_description,
        fit_id: item.fit_id,
        ...item
      }));

      setFitnessData(transformedData);
      setFilteredFitnessData(transformedData);
      
    } catch (error) {
      console.error('Error in loadFitnessData:', error);
    }
  }, []);

  // ตรวจสอบ authentication
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // โหลดข้อมูลฟิตเนสเมื่อ component mount
  useEffect(() => {
    loadFitnessData();
    if (user) {
      loadFavorites();
    }
  }, [loadFitnessData, user]);

  // โหลดรายการโปรด
  const loadFavorites = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('tbl_favorites')
        .select('fitness_id')
        .eq('user_id', user.id);

      if (!error && data) {
        setFavorites(data.map(item => item.fitness_id));
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  // เพิ่ม/ลบ รายการโปรด
  const toggleFavorite = async (fitnessId) => {
    if (!user) {
      setShowLoginModal(true);
      return;
    }

    try {
      const isFavorite = favorites.includes(fitnessId);
      
      if (isFavorite) {
        // ลบออกจากรายการโปรด
        const { error } = await supabase
          .from('tbl_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('fitness_id', fitnessId);

        if (!error) {
          setFavorites(favorites.filter(id => id !== fitnessId));
        }
      } else {
        // เพิ่มเข้ารายการโปรด
        const { error } = await supabase
          .from('tbl_favorites')
          .insert([
            {
              user_id: user.id,
              fitness_id: fitnessId
            }
          ]);

        if (!error) {
          setFavorites([...favorites, fitnessId]);
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // Filter และ Search
  useEffect(() => {
    let filtered = [...fitnessData];

    // กรองตามคำค้นหา
    if (searchTerm) {
      filtered = filtered.filter(fitness =>
        fitness.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fitness.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fitness.user?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // กรองตามราคา
    if (priceFilter !== 'all') {
      switch (priceFilter) {
        case 'low':
          filtered = filtered.filter(fitness => fitness.price <= 50);
          break;
        case 'medium':
          filtered = filtered.filter(fitness => fitness.price > 50 && fitness.price <= 100);
          break;
        case 'high':
          filtered = filtered.filter(fitness => fitness.price > 100);
          break;
        default:
          break;
      }
    }

    // เรียงลำดับ
    switch (sortBy) {
      case 'newest':
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'oldest':
        filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }

    setFilteredFitnessData(filtered);
  }, [fitnessData, searchTerm, priceFilter, sortBy]);

  const handleFitnessClick = (fitness) => {
    // ตรวจสอบว่า user login แล้วหรือยัง
    if (!user) {
      setShowLoginModal(true);
      return;
    }
    
    setSelectedFitness(fitness);
    navigate(`/fitness/${fitness.fit_id}`);
  };

  const handleImageClick = (fitness, imageIndex = 0) => {
    setSelectedFitness(fitness);
    setSelectedImageIndex(imageIndex);
    setShowImageModal(true);
  };

  return (
    <Layout>
      {/* Main Content */}
      <div className="home-content">
        <div className="fitness-section">
          <div className="fitness-header">
            <div className="fitness-title">
              <h2>ฟิตเนสที่อยู่ใกล้</h2>
              <p className="fitness-count">พบ {filteredFitnessData.length} แห่ง จากทั้งหมด {fitnessData.length} แห่ง</p>
            </div>
            <button 
              className="refresh-btn" 
              onClick={loadFitnessData}
              title="รีเฟรชข้อมูล"
            >
              🔄 รีเฟรช
            </button>
          </div>
          
          {/* ระบบค้นหาและกรอง */}
          <div className="search-filter-section">
            <div className="search-box">
              <input
                type="text"
                placeholder="ค้นหาฟิตเนส, ที่อยู่, หรือเจ้าของ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <span className="search-icon">🔍</span>
            </div>
            
            <div className="filter-controls">
              <select 
                value={priceFilter} 
                onChange={(e) => setPriceFilter(e.target.value)}
                className="filter-select"
              >
                <option value="all">ราคาทั้งหมด</option>
                <option value="low">≤ 50 บาท</option>
                <option value="medium">51-100 บาท</option>
                <option value="high"> 100 บาท</option>
              </select>
              
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="filter-select"
              >
                <option value="newest">ใหม่ที่สุด</option>
                <option value="oldest">เก่าที่สุด</option>
                <option value="price-low">ราคาต่ำ-สูง</option>
                <option value="price-high">ราคาสูง-ต่ำ</option>
                <option value="name">ชื่อ A-Z</option>
              </select>
            </div>
          </div>

          {/* รายการฟิตเนส */}
          <div className="fitness-grid">
            {filteredFitnessData.length > 0 ? (
              filteredFitnessData.map((fitness) => (
                <div key={fitness.id} className="fitness-card">
                  <div className="fitness-image-container">
                    <img 
                      src={fitness.image || '/placeholder-gym.jpg'} 
                      alt={fitness.name}
                      className="fitness-image"
                      onClick={() => handleImageClick(fitness, 0)}
                    />
                    
                    {/* Favorite Button */}
                    <button
                      className={`favorite-btn ${favorites.includes(fitness.fit_id) ? 'favorited' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(fitness.fit_id);
                      }}
                      title={favorites.includes(fitness.fit_id) ? 'ลบออกจากรายการโปรด' : 'เพิ่มในรายการโปรด'}
                    >
                      {favorites.includes(fitness.fit_id) ? '❤️' : '🤍'}
                    </button>
                  </div>
                  
                  <div className="fitness-info">
                    <h3 className="fitness-name">{fitness.name}</h3>
                    <p className="fitness-location">
                      <span className="location-icon">📍</span>
                      {fitness.location}
                    </p>
                    
                    <div className="fitness-price-section">
                      <span className="price-label">เริ่มต้นที่</span>
                      <div className="fitness-price">
                        <span className="amount">{fitness.price}</span>
                        <span className="currency"> บาท/คน</span>
                      </div>
                    </div>

                    {/* Rating Badge - ย้ายมาไว้ข้างล่างของราคา */}
                    <div className="rating-badge-inline">
                      <span className="rating-score">9.6</span>
                      <div className="rating-text">
                        <span>แสนงี่เซ</span>
                        <small>138 ความคิดเห็นจากผู้มักที่</small>
                      </div>
                    </div>
                    
                    <div className="fitness-actions">
                      <button 
                        className="view-details-btn"
                        onClick={() => handleFitnessClick(fitness)}
                      >
                        ดูรายละเอียด
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-fitness">
                <h3>ไม่พบฟิตเนสที่ค้นหา</h3>
                <p>ลองเปลี่ยนคำค้นหาหรือกรองข้อมูลใหม่</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {showImageModal && selectedFitness && (
        <div className="modal-overlay" onClick={() => setShowImageModal(false)}>
          <div className="image-modal" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowImageModal(false)}>×</button>
            <img 
              src={selectedFitness.image} 
              alt={selectedFitness.name}
              className="modal-image"
            />
          </div>
        </div>
      )}

      {/* Image Gallery Modal */}
      {showImageGallery && selectedFitness && (
        <div className="modal-overlay" onClick={() => setShowImageGallery(false)}>
          <div className="gallery-modal" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setShowImageGallery(false)}>×</button>
            <div className="gallery-content">
              <img 
                src={[
                  selectedFitness.image,
                  selectedFitness.fit_image2,
                  selectedFitness.fit_image3,
                  selectedFitness.fit_image4
                ].filter(img => img)[selectedImageIndex]} 
                alt={selectedFitness.name}
                className="gallery-image"
              />
              <div className="gallery-nav">
                <button 
                  className="nav-btn prev"
                  onClick={() => {
                    const images = [
                      selectedFitness.image,
                      selectedFitness.fit_image2,
                      selectedFitness.fit_image3,
                      selectedFitness.fit_image4
                    ].filter(img => img);
                    const prevIndex = selectedImageIndex > 0 ? selectedImageIndex - 1 : images.length - 1;
                    setSelectedImageIndex(prevIndex);
                  }}
                >
                  ‹ ก่อนหน้า
                </button>
                <button 
                  className="nav-btn next"
                  onClick={() => {
                    const images = [
                      selectedFitness.image,
                      selectedFitness.fit_image2,
                      selectedFitness.fit_image3,
                      selectedFitness.fit_image4
                    ].filter(img => img);
                    const nextIndex = selectedImageIndex < images.length - 1 ? selectedImageIndex + 1 : 0;
                    setSelectedImageIndex(nextIndex);
                  }}
                >
                  ถัดไป ›
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Login Required Modal */}
      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="login-required-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔐 กรุณาเข้าสู่ระบบ</h3>
              <button className="close-btn" onClick={() => setShowLoginModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>กรุณาเข้าสู่ระบบหรือสมัครสมาชิกเพื่อดูรายละเอียดฟิตเนส</p>
              <div className="modal-actions">
                <button 
                  className="login-btn-modal"
                  onClick={() => {
                    setShowLoginModal(false);
                    navigate('/login');
                  }}
                >
                  เข้าสู่ระบบ
                </button>
                <button 
                  className="register-btn-modal"
                  onClick={() => {
                    setShowLoginModal(false);
                    navigate('/register');
                  }}
                >
                  สมัครสมาชิก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default HomePage;