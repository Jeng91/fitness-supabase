import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import Layout from '../components/Layout';
import FitnessDetailModal from '../components/FitnessDetailModal';
import '../App.css';
import './FitnessDetailPage.css';

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

    const formatTime = (timeString) => {
    if (!timeString) return timeString;
    
    // จัดการรูปแบบเวลาต่างๆ
    return timeString
      .replace(/(\d+):00\.00/g, '$1:00')     // 10:00.00 -> 10:00
      .replace(/(\d+)\.00\.00/g, '$1.00')   // 10.00.00 -> 10.00  
      .replace(/(\d+)\.00$/g, '$1')         // 10.00 -> 10
      .replace(/(\d+):00:00/g, '$1:00')     // 10:00:00 -> 10:00
      .replace(/\.00\s*-\s*(\d+)\.00/g, ' - $1')  // 10.00 - 23.00 -> 10 - 23
      .replace(/(\d+)\.00/g, '$1');         // ตัด .00 ทั้งหมด
  };

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
                          <span className="value">{formatTime(classItem.class_time)}</span>
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

      
    </Layout>
  );
};

export default FitnessDetailPage;