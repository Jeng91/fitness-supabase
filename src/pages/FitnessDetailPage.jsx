import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import Layout from '../components/Layout';
import FitnessDetailModal from '../components/FitnessDetailModal';
import '../App.css';

const FitnessDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [fitnessData, setFitnessData] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classesLoading, setClassesLoading] = useState(false);

  useEffect(() => {
    const loadFitnessDetail = async () => {
      try {
        const { data, error } = await supabase
          .from('tbl_fitness')
          .select('*')
          .eq('fit_id', id)
          .single();

        if (error) {
          console.error('Error loading fitness detail:', error);
          navigate('/');
          return;
        }

        // แปลงข้อมูลให้ตรงกับ format ที่ FitnessDetailModal ใช้
        const transformedData = {
          id: data.fit_id,
          name: data.fit_name,
          price: data.fit_price,
          location: data.fit_address,
          image: data.fit_image,
          fit_image2: data.fit_image2,
          fit_image3: data.fit_image3,
          fit_image4: data.fit_image4,
          contact: data.fit_contact,
          fit_location: data.fit_location,
          user: data.fit_user,
          phone: data.fit_phone,
          openTime: data.fit_open_time,
          closeTime: data.fit_close_time,
          description: data.fit_description,
          fit_id: data.fit_id,
          ...data
        };

        setFitnessData(transformedData);
      } catch (error) {
        console.error('Error in loadFitnessDetail:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    const loadClasses = async () => {
      try {
        setClassesLoading(true);
        const { data, error } = await supabase
          .from('tbl_classes')
          .select('*')
          .eq('fit_id', id)
          .eq('status', 'active')
          .order('class_time', { ascending: true });

        if (error) {
          console.error('Error loading classes:', error);
        } else {
          setClasses(data || []);
        }
      } catch (error) {
        console.error('Error in loadClasses:', error);
      } finally {
        setClassesLoading(false);
      }
    };

    if (id) {
      loadFitnessDetail();
      loadClasses();
    }
  }, [id, navigate]);

  const handleViewLocation = (fitness) => {
    if (fitness.fit_location) {
      window.open(`https://www.google.com/maps?q=${fitness.fit_location}`, '_blank');
    } else {
      alert('ไม่พบข้อมูลตำแหน่งสำหรับฟิตเนสนี้');
    }
  };

  const handleOpenImageGallery = (fitness) => {
    // สามารถเพิ่ม logic สำหรับ image gallery ได้
    console.log('Open image gallery for:', fitness.name);
  };

  if (loading) {
    return (
      <Layout>
        <div className="loading">กำลังโหลด...</div>
      </Layout>
    );
  }

  if (!fitnessData) {
    return (
      <Layout>
        <div className="error">ไม่พบข้อมูลฟิตเนส</div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Fitness Detail */}
      <div className="fitness-detail-page">
        <div className="detail-header">
          <button 
            className="back-btn"
            onClick={() => navigate('/')}
          >
            ← กลับ
          </button>
        </div>
        <FitnessDetailModal
          isOpen={true}
          onClose={() => navigate('/')}
          fitnessData={fitnessData}
          onViewLocation={handleViewLocation}
          onOpenImageGallery={handleOpenImageGallery}
          isFullPage={true}
        />

        {/* Classes Section */}
        <div className="classes-section">
          <h2 className="section-title">🎯 คลาสออกกำลังกาย</h2>
          
          {classesLoading ? (
            <div className="classes-loading">กำลังโหลดคลาส...</div>
          ) : classes.length === 0 ? (
            <div className="no-classes">
              <div className="no-classes-icon">🏋️‍♂️</div>
              <h3>ยังไม่มีคลาส</h3>
              <p>ฟิตเนสนี้ยังไม่มีคลาสออกกำลังกายที่เปิดให้บริการ</p>
            </div>
          ) : (
            <div className="classes-grid">
              {classes.map((classItem) => (
                <div key={classItem.class_id} className="class-card">
                  {classItem.image_url && (
                    <div className="class-image">
                      <img 
                        src={classItem.image_url} 
                        alt={classItem.class_name}
                      />
                    </div>
                  )}
                  <div className="class-content">
                    <h3 className="class-name">{classItem.class_name}</h3>
                    <p className="class-description">{classItem.description}</p>
                    
                    <div className="class-details">
                      {classItem.class_time && (
                        <div className="detail-item">
                          <span className="icon">⏰</span>
                          <span className="label">เวลา:</span>
                          <span className="value">{classItem.class_time}</span>
                        </div>
                      )}
                      
                      <div className="detail-item">
                        <span className="icon">⏱️</span>
                        <span className="label">ระยะเวลา:</span>
                        <span className="value">{classItem.duration} นาที</span>
                      </div>
                      
                      {classItem.instructor && (
                        <div className="detail-item">
                          <span className="icon">👨‍🏫</span>
                          <span className="label">ผู้สอน:</span>
                          <span className="value">{classItem.instructor}</span>
                        </div>
                      )}
                      
                      <div className="detail-item">
                        <span className="icon">👥</span>
                        <span className="label">ผู้เข้าร่วม:</span>
                        <span className="value">สูงสุด {classItem.max_participants} คน</span>
                      </div>
                      
                      <div className="detail-item">
                        <span className="icon">💰</span>
                        <span className="label">ราคา:</span>
                        <span className="value price">{classItem.price} บาท</span>
                      </div>
                    </div>
                    
                    <button className="btn-book-class">
                      📝 จองคลาสนี้
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .fitness-detail-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .detail-header {
          padding: 20px;
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
        }

        .back-btn {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.3s ease;
        }

        .back-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateX(-5px);
        }

        .classes-section {
          padding: 40px 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .section-title {
          color: white;
          font-size: 2rem;
          margin-bottom: 30px;
          text-align: center;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .classes-loading {
          text-align: center;
          padding: 40px;
          color: white;
          font-size: 18px;
        }

        .no-classes {
          text-align: center;
          padding: 60px 20px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          backdrop-filter: blur(10px);
        }

        .no-classes-icon {
          font-size: 4rem;
          margin-bottom: 20px;
        }

        .no-classes h3 {
          color: white;
          font-size: 1.5rem;
          margin-bottom: 10px;
        }

        .no-classes p {
          color: rgba(255, 255, 255, 0.8);
        }

        .classes-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
          gap: 25px;
        }

        .class-card {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 16px;
          overflow: hidden;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          transition: all 0.3s ease;
        }

        .class-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
        }

        .class-image {
          height: 200px;
          overflow: hidden;
        }

        .class-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .class-card:hover .class-image img {
          transform: scale(1.05);
        }

        .class-content {
          padding: 25px;
        }

        .class-name {
          color: white;
          font-size: 1.4rem;
          margin: 0 0 10px 0;
          font-weight: 600;
        }

        .class-description {
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 20px;
          line-height: 1.6;
        }

        .class-details {
          margin-bottom: 25px;
        }

        .detail-item {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
          color: rgba(255, 255, 255, 0.9);
        }

        .detail-item .icon {
          margin-right: 8px;
          font-size: 1.1rem;
          width: 20px;
        }

        .detail-item .label {
          margin-right: 8px;
          font-weight: 500;
          min-width: 80px;
        }

        .detail-item .value {
          color: white;
          font-weight: 500;
        }

        .detail-item .value.price {
          font-weight: 600;
          color: #ffd700;
          font-size: 1.1rem;
        }

        .btn-book-class {
          width: 100%;
          background: linear-gradient(45deg, #4facfe, #00f2fe);
          color: white;
          border: none;
          padding: 15px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
          transition: all 0.3s ease;
        }

        .btn-book-class:hover {
          background: linear-gradient(45deg, #00f2fe, #4facfe);
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(79, 172, 254, 0.3);
        }

        .loading, .error {
          text-align: center;
          padding: 50px;
          color: white;
          font-size: 20px;
        }

        .error {
          color: #ff6b6b;
        }

        @media (max-width: 768px) {
          .classes-grid {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          
          .section-title {
            font-size: 1.5rem;
          }
          
          .class-content {
            padding: 20px;
          }
        }
      `}</style>
    </Layout>
  );
};

export default FitnessDetailPage;