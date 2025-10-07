import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import './FitnessDetailModal.css';

const FitnessDetailModal = ({ 
  isOpen, 
  onClose, 
  fitnessData,
  onViewLocation,
  onOpenImageGallery,
  isFullPage = false // เพิ่ม prop สำหรับตรวจสอบว่าเป็นหน้าเต็มหรือไม่
}) => {
  const navigate = useNavigate();
  const [shareNotification, setShareNotification] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [isBookingMode, setIsBookingMode] = useState(false);
  const [equipmentData, setEquipmentData] = useState([]);
  const [ownerData, setOwnerData] = useState(null);
  const [isMembershipBookingMode, setIsMembershipBookingMode] = useState({
    monthly: false,
    yearly: false
  });
  const [membershipStartDate, setMembershipStartDate] = useState({
    monthly: '',
    yearly: ''
  });

  // โหลดข้อมูลอุปกรณ์และเจ้าของ
  useEffect(() => {
    const loadAdditionalData = async () => {
      if (!fitnessData?.fit_id) return;
      
      try {
        // โหลดข้อมูลอุปกรณ์
        const { data: equipment, error: equipmentError } = await supabase
          .from('tbl_equipment')
          .select('*')
          .eq('fitness_id', fitnessData.fit_id);

        if (equipmentError && equipmentError.code !== 'PGRST116') {
          console.error('Error loading equipment:', equipmentError);
        } else {
          setEquipmentData(equipment || []);
        }

        // โหลดข้อมูลเจ้าของ
        const { data: owner, error: ownerError } = await supabase
          .from('tbl_owner')
          .select('*')
          .eq('owner_name', fitnessData.fit_user)
          .single();

        if (ownerError && ownerError.code !== 'PGRST116') {
          console.error('Error loading owner:', ownerError);
        } else {
          setOwnerData(owner);
        }

      } catch (error) {
        console.error('Error loading additional data:', error);
      }
    };

    loadAdditionalData();
  }, [fitnessData?.fit_id, fitnessData?.fit_user]);

  if (!isOpen || !fitnessData) return null;

  // ฟังก์ชันจัดรูปแบบเวลา - ตัด .00 ออก
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

  // ฟังก์ชันสำหรับแชร์ฟิตเนส
  const handleShare = async () => {
    const shareData = {
      title: `${fitnessData.fit_name || fitnessData.name} - PJ Fitness`,
      text: `🏋️‍♂️ ${fitnessData.fit_name || fitnessData.name}\n📍 ${fitnessData.fit_address || fitnessData.location}\n💰 ${fitnessData.fit_price || fitnessData.price || 60} บาท/วัน\n⭐ ${fitnessData.rating || '4.5'} คะแนน`,
      url: window.location.href
    };

    try {
      // ตรวจสอบว่าเบราว์เซอร์รองรับ Web Share API หรือไม่
      if (navigator.share) {
        await navigator.share(shareData);
        setShareNotification('✅ แชร์สำเร็จ!');
      } else {
        // ถ้าไม่รองรับให้คัดลอกลิงค์แทน
        await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
        setShareNotification('📋 คัดลอกข้อมูลฟิตเนสไปยังคลิปบอร์ดแล้ว!');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      // ถ้า error ให้ลองคัดลอกลิงค์อย่างง่าย
      try {
        await navigator.clipboard.writeText(window.location.href);
        setShareNotification('📋 คัดลอกลิงค์ไปยังคลิปบอร์ดแล้ว!');
      } catch (clipboardError) {
        // ถ้าคัดลอกไม่ได้ให้แสดง prompt
        prompt('คัดลอกลิงค์นี้:', window.location.href);
        setShareNotification('📋 กรุณาคัดลอกลิงค์ด้วยตนเอง');
      }
    }

    // ซ่อนข้อความหลัง 3 วินาที
    setTimeout(() => {
      setShareNotification('');
    }, 3000);
  };

  // ฟังก์ชันสำหรับจัดการการจอง
  const handleBookingClick = () => {
    setIsBookingMode(!isBookingMode);
  };

  // ฟังก์ชันสำหรับยืนยันการจอง
  const handleConfirmBooking = () => {
    try {
      if (!selectedDate) {
        alert('กรุณาเลือกวันที่ที่ต้องการจอง');
        return;
      }
      
      // สร้างข้อมูลการจองเพื่อส่งไปหน้าชำระเงิน
      const bookingData = {
        fitness_id: fitnessData?.fit_id || 22,
        fitnessName: fitnessData?.fit_name || fitnessData?.name || 'JM FITNESS',
        owner_uid: fitnessData?.owner_uid || 1,
        booking_date: selectedDate,
        total_amount: fitnessData?.fit_price || fitnessData?.price || 60,
        location: fitnessData?.fit_location || fitnessData?.location || 'ขาวเนียง มหาสารคาม',
        rating: fitnessData?.rating || '4.5',
        contact: fitnessData?.fit_contact || fitnessData?.contact,
        phone: fitnessData?.fit_phone || fitnessData?.phone,
        owner_name: fitnessData?.fit_user || ownerData?.owner_name,
        description: fitnessData?.fit_description || fitnessData?.description,
        images: {
          main: fitnessData?.fit_image || fitnessData?.image,
          secondary: [fitnessData?.fit_image2, fitnessData?.fit_image3, fitnessData?.fit_image4].filter(Boolean)
        },
        booking_type: 'daily' // ระบุว่าเป็นการจองรายวัน
      };
      
      
      // Navigate ไปหน้าชำระเงินพร้อมส่งข้อมูล
      navigate('/payment', { 
        state: { bookingData } 
      });
      
    } catch (error) {
      console.error('Error in handleConfirmBooking:', error);
      alert('เกิดข้อผิดพลาด: ' + error.message);
    }
  };

  // ฟังก์ชันสำหรับยกเลิกการจอง
  const handleCancelBooking = () => {
    setIsBookingMode(false);
    setSelectedDate('');
  };

  // ฟังก์ชันสำหรับจองสมาชิกพร้อมเลือกวันที่เริ่ม
  const handleMembershipBookingWithDate = (membershipType, amount, startDate) => {
    try {
      if (!startDate) {
        alert('กรุณาเลือกวันที่เริ่มสมาชิก');
        return;
      }

      // สร้างข้อมูลการจองสมาชิกเพื่อส่งไปหน้าชำระเงิน
      const membershipData = {
        fitness_id: fitnessData?.fit_id || 22,
        fitnessName: fitnessData?.fit_name || fitnessData?.name || 'JM FITNESS',
        owner_uid: fitnessData?.owner_uid || 1,
        membership_type: membershipType, // 'monthly' หรือ 'yearly'
        total_amount: amount,
        start_date: startDate, // วันที่เริ่มสมาชิก
        location: fitnessData?.fit_location || fitnessData?.location || 'ขาวเนียง มหาสารคาม',
        rating: fitnessData?.rating || '4.5',
        contact: fitnessData?.fit_contact || fitnessData?.contact,
        phone: fitnessData?.fit_phone || fitnessData?.phone,
        owner_name: fitnessData?.fit_user || ownerData?.owner_name,
        description: fitnessData?.fit_description || fitnessData?.description,
        images: {
          main: fitnessData?.fit_image || fitnessData?.image,
          secondary: [fitnessData?.fit_image2, fitnessData?.fit_image3, fitnessData?.fit_image4].filter(Boolean)
        },
        booking_type: 'membership' // ระบุว่าเป็นการจองสมาชิก
      };
      
      // Navigate ไปหน้าชำระเงินพร้อมส่งข้อมูลสมาชิก
      navigate('/payment', { 
        state: { bookingData: membershipData } 
      });
      
    } catch (error) {
      console.error('Error in handleMembershipBookingWithDate:', error);
      alert('เกิดข้อผิดพลาด: ' + error.message);
    }
  };

  // ฟังก์ชันสำหรับกำหนดวันที่ขั้นต่ำ (วันนี้)
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // ฟังก์ชันสำหรับกำหนดวันที่สูงสุด (30 วันข้างหน้า)
  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    return maxDate.toISOString().split('T')[0];
  };



  // Debug logs
  // เมื่อเป็น Full Page ให้ใช้ layout แบบใหม่
  if (isFullPage) {
    return (
      <div className="fitness-detail-content">
        {/* Share Notification */}
        {shareNotification && (
          <div className="share-notification">
            {shareNotification}
          </div>
        )}
        
        {/* Header Section */}
        <div className="fitness-header">
          <div className="fitness-title-section">
            <h1 className="fitness-title">{fitnessData.fit_name || fitnessData.name}</h1>
            <div className="fitness-location">
              📍 {fitnessData.fit_address || fitnessData.location}
            </div>
            <div className="fitness-owner">
              👤 เจ้าของ: {fitnessData.fit_user || ownerData?.owner_name || 'ไม่ระบุเจ้าของ'}
            </div>
          </div>
          <div className="fitness-actions">
            <button className="favorite-btn" title="บันทึกรายการโปรด">❤️</button>
            <button className="share-btn" onClick={handleShare} title="แชร์ฟิตเนส">📤</button>
          </div>
        </div>

        {/* Main Content */}
        <div className="fitness-main-content">
          {/* Left Section - Images */}
          <div className="fitness-images-section">
            <div className="main-image-container">
              <img 
                src={fitnessData.fit_image || fitnessData.image || "data:image/svg+xml,%3Csvg width='400' height='300' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%' height='100%' fill='%23f0f0f0'/%3E%3Ctext x='50%' y='50%' font-size='18' fill='%23666' text-anchor='middle' dy='.3em'%3EGym Image%3C/text%3E%3C/svg%3E"}
                alt={fitnessData.fit_name || fitnessData.name}
                className="main-fitness-image"
                onClick={() => onOpenImageGallery && onOpenImageGallery(fitnessData, 0)}
              />
            </div>
            
            {/* Thumbnail Images */}
            <div className="thumbnail-images">
              {[fitnessData.fit_image2, fitnessData.fit_image3, fitnessData.fit_image4].map((img, index) => 
                img && (
                  <img 
                    key={index}
                    src={img} 
                    alt={`รูปเสริม ${index + 1}`} 
                    className="thumbnail-image"
                    onClick={() => onOpenImageGallery && onOpenImageGallery(fitnessData, index + 1)}
                  />
                )
              )}
            </div>

            {/* Equipment Section */}
            <div className="equipment-showcase">
              <h3>🏋️‍♂️ อุปกรณ์ที่มีให้บริการ</h3>
              <div className="equipment-grid-showcase">
                {equipmentData.length > 0 ? (
                  equipmentData.slice(0, 6).map((equipment, index) => (
                      <div key={equipment.em_id || index} className="equipment-showcase-item">
                        <div className="equipment-image-container">
                          {equipment.em_image ? (
                            <img 
                              src={equipment.em_image} 
                              alt={equipment.em_name}
                              className="equipment-showcase-image"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : (
                            <div className="equipment-placeholder">
                              🏋️
                            </div>
                          )}
                        </div>
                        <div className="equipment-showcase-info">
                          <h4>{equipment.em_name || 'ไม่ระบุชื่อ'}</h4>
                          <p>จำนวน: {equipment.em_qty || 1} ชิ้น</p>
                          {equipment.em_detail && (
                            <p className="equipment-detail">{equipment.em_detail}</p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-equipment">
                      <p>🚧 ไม่มีข้อมูลอุปกรณ์</p>
                    </div>
                  )}
                </div>
            </div>
          </div>

          {/* Description Section */}
              {(fitnessData.fit_description || fitnessData.description) && (
                <div className="description-section">
                  <h4>📝 รายละเอียดเพิ่มเติม</h4>
                  <p>{fitnessData.fit_description || fitnessData.description}</p>
                </div>
              )}

          {/* Right Section - Info & Booking */}
          <div className="fitness-info-sidebar">
            {/* Rating & Price */}
            <div className="rating-price-section">
              <div className="rating-display">
                <span className="rating-score">{fitnessData.rating || '4.5'}</span>
                <div className="rating-details">
                  <div className="stars">⭐⭐⭐⭐⭐</div>
                  <div className="rating-count">100 รีวิวที่แสดงผล</div>
                </div>
              </div>
            </div>

            {/* Information Cards */}
            <div className="info-cards">
              <div className="info-card">
                <div className="info-label">ความพอดีสมบูรณ์ผู้เข้าใช้</div>
              </div>
              <div className="info-card">
                <div className="info-label">พอใจละติเซ่อการใช้</div>
              </div>
              <div className="info-card">
                <div className="info-label">ชื่อผู้ใช้อุปกรณ์</div>
              </div>
            </div>

            {/* Map Section */}
            <div className="map-section">
              <div className="map-placeholder">
                <button className="map-btn" onClick={() => onViewLocation && onViewLocation(fitnessData)}>
                  📍 แสดงพิกัด
                </button>
              </div>
            </div>
            

            {/* Schedule & Booking */}
            <div className="schedule-booking">
              <div className="schedule-info">
                
                <div className="schedule-item">
                  <span className="schedule-label">เวลา:</span>
                  <span className="schedule-value">
                    {fitnessData.fit_open_time && fitnessData.fit_close_time 
                      ? `${formatTime(fitnessData.fit_open_time)} - ${formatTime(fitnessData.fit_close_time)}`
                      : formatTime(fitnessData.hours) || '08.00 - 22.00'
                    }
                  </span>
                </div>
              </div>
              
              {/* Daily Booking Button */}
              {!isBookingMode ? (
                <button 
                  className="membership-btn daily" 
                  onClick={handleBookingClick}
                >
                  <span className="membership-price">{fitnessData.fit_price || fitnessData.price || 69}</span>
                  <span className="membership-unit">บาท/วัน</span>
                  <span className="membership-action"> จองบริการรายวัน</span>
                </button>
              ) : (
                <button 
                  className="membership-btn daily selected" 
                  onClick={handleBookingClick}
                >
                  <span className="membership-price">{fitnessData.fit_price || fitnessData.price || 69}</span>
                  <span className="membership-unit">บาท/วัน</span>
                  <span className="membership-action"> จองบริการรายวัน</span>
                </button>
              )}

              {/* Booking Section */}
              {isBookingMode && (
                <div className="booking-form">
                  <div className="date-selection">
                    <label htmlFor="booking-date">เลือกวันที่:</label>
                    <input
                      type="date"
                      id="booking-date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={getTodayDate()}
                      max={getMaxDate()}
                      className="date-input"
                    />
                  </div>
                  <div className="booking-actions">
                    <button 
                      className="confirm-booking-btn" 
                      onClick={handleConfirmBooking}
                      style={{
                        pointerEvents: 'auto',
                        cursor: 'pointer',
                        zIndex: 999
                      }}
                    >
                      ✅ ยืนยันการจอง
                    </button>
                    <button className="cancel-booking-btn" onClick={handleCancelBooking}>
                      ❌ ยกเลิก
                    </button>
                  </div>
                </div>
              )}

              

              {/* Membership Prices */}
              {(fitnessData.fit_price_memberm || fitnessData.priceMonthly) && (
                <div className="membership-container">
                  {!isMembershipBookingMode.monthly ? (
                    <button 
                      className="membership-btn monthly" 
                      onClick={() => setIsMembershipBookingMode({...isMembershipBookingMode, monthly: true})}
                    >
                      <span className="membership-price">{fitnessData.fit_price_memberm || fitnessData.priceMonthly}</span>
                      <span className="membership-unit">บาท/เดือน (สมาชิก)</span>
                      <span className="membership-action"> จองรายเดือน</span>
                    </button>
                  ) : (
                    <div className="membership-booking-form">
                      <button className="membership-btn monthly selected">
                        <span className="membership-price">{fitnessData.fit_price_memberm || fitnessData.priceMonthly}</span>
                        <span className="membership-unit">บาท/เดือน (สมาชิก)</span>
                        <span className="membership-action"> จองรายเดือน</span>
                      </button>
                      <div className="membership-date-selection">
                        <label htmlFor="membership-start-date-monthly">เลือกวันที่เริ่มสมาชิก:</label>
                        <input
                          type="date"
                          id="membership-start-date-monthly"
                          value={membershipStartDate.monthly}
                          onChange={(e) => setMembershipStartDate({...membershipStartDate, monthly: e.target.value})}
                          min={getTodayDate()}
                          max={getMaxDate()}
                          className="date-input"
                        />
                      </div>
                      <div className="membership-actions">
                        <button 
                          className="confirm-membership-btn" 
                          onClick={() => handleMembershipBookingWithDate('monthly', fitnessData.fit_price_memberm || fitnessData.priceMonthly, membershipStartDate.monthly)}
                        >
                          ✅ ยืนยันการจองรายเดือน
                        </button>
                        <button 
                          className="cancel-membership-btn" 
                          onClick={() => {
                            setIsMembershipBookingMode({...isMembershipBookingMode, monthly: false});
                            setMembershipStartDate({...membershipStartDate, monthly: ''});
                          }}
                        >
                          ❌ ยกเลิก
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {(fitnessData.fit_price_membery || fitnessData.priceYearly) && (
                <div className="membership-container">
                  {!isMembershipBookingMode.yearly ? (
                    <button 
                      className="membership-btn yearly" 
                      onClick={() => setIsMembershipBookingMode({...isMembershipBookingMode, yearly: true})}
                    >
                      <span className="membership-price">{fitnessData.fit_price_membery || fitnessData.priceYearly}</span>
                      <span className="membership-unit">บาท/ปี (สมาชิก)</span>
                      <span className="membership-action"> จองรายปี</span>
                    </button>
                  ) : (
                    <div className="membership-booking-form">
                      <button className="membership-btn yearly selected">
                        <span className="membership-price">{fitnessData.fit_price_membery || fitnessData.priceYearly}</span>
                        <span className="membership-unit">บาท/ปี (สมาชิก)</span>
                        <span className="membership-action"> จองรายปี</span>
                      </button>
                      <div className="membership-date-selection">
                        <label htmlFor="membership-start-date-yearly">เลือกวันที่เริ่มสมาชิก:</label>
                        <input
                          type="date"
                          id="membership-start-date-yearly"
                          value={membershipStartDate.yearly}
                          onChange={(e) => setMembershipStartDate({...membershipStartDate, yearly: e.target.value})}
                          min={getTodayDate()}
                          max={getMaxDate()}
                          className="date-input"
                        />
                      </div>
                      <div className="membership-actions">
                        <button 
                          className="confirm-membership-btn" 
                          onClick={() => handleMembershipBookingWithDate('yearly', fitnessData.fit_price_membery || fitnessData.priceYearly, membershipStartDate.yearly)}
                        >
                          ✅ ยืนยันการจองรายปี
                        </button>
                        <button 
                          className="cancel-membership-btn" 
                          onClick={() => {
                            setIsMembershipBookingMode({...isMembershipBookingMode, yearly: false});
                            setMembershipStartDate({...membershipStartDate, yearly: ''});
                          }}
                        >
                          ❌ ยกเลิก
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              

              
            </div>

            {/* Contact Info */}
            <div className="contact-section">
              <h4>ข้อมูลการติดต่อ</h4>
              
              <div className="contact-item">
                <span className="contact-icon">📞</span>
                <span className="contact-text">{fitnessData.fit_phone || fitnessData.phone || ownerData?.owner_phone || 'ไม่ระบุเบอร์โทร'}</span>
              </div>
              {(fitnessData.fit_contact || fitnessData.contact) && (
                <div className="contact-item">
                  <span className="contact-icon">✉️</span>
                  <span className="contact-text">{fitnessData.fit_contact || fitnessData.contact}</span>
                </div>
              )}
              {ownerData?.owner_email && (
                <div className="contact-item">
                  <span className="contact-icon">📧</span>
                  <span className="contact-text">{ownerData.owner_email}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Original Modal Layout (สำหรับ backward compatibility)
  return (
    <>
      <div className={`detail-modal-overlay ${isFullPage ? 'fitness-detail-page' : ''}`} onClick={isFullPage ? undefined : onClose}>
        <div className="detail-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{fitnessData.fitness_name}</h2>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
          
          <div className="modal-body">
            <div className="fitness-detail-container">
              {/* รูปภาพ */}
              <div className="fitness-image-section">
                <div className="main-image-container">
                  <img 
                    src={fitnessData.image || "data:image/svg+xml,%3Csvg width='400' height='300' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%' height='100%' fill='%23f0f0f0'/%3E%3Ctext x='50%' y='50%' font-size='18' fill='%23666' text-anchor='middle' dy='.3em'%3EGym Image%3C/text%3E%3C/svg%3E"}
                    alt={fitnessData.fitness_name}
                    className="detail-main-image"
                    onClick={() => onOpenImageGallery && onOpenImageGallery(fitnessData, 0)}
                    style={{ cursor: 'pointer' }}
                    onError={(e) => {
                      e.target.src = "data:image/svg+xml,%3Csvg width='400' height='300' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%' height='100%' fill='%23f0f0f0'/%3E%3Ctext x='50%' y='50%' font-size='18' fill='%23666' text-anchor='middle' dy='.3em'%3EGym Image%3C/text%3E%3C/svg%3E";
                    }}
                  />
                </div>
                
                {/* รูปภาพเสริม */}
                {(fitnessData.fit_image2 || fitnessData.fit_image3 || fitnessData.fit_image4) && (
                  <div className="additional-images">
                    <h4>รูปภาพเพิ่มเติม</h4>
                    <div className="additional-images-grid">
                      {fitnessData.fit_image2 && (
                        <img 
                          src={fitnessData.fit_image2} 
                          alt="รูปเสริม 1" 
                          className="detail-additional-image"
                          onClick={() => onOpenImageGallery && onOpenImageGallery(fitnessData, 1)}
                        />
                      )}
                      {fitnessData.fit_image3 && (
                        <img 
                          src={fitnessData.fit_image3} 
                          alt="รูปเสริม 2" 
                          className="detail-additional-image"
                          onClick={() => onOpenImageGallery && onOpenImageGallery(fitnessData, 2)}
                        />
                      )}
                      {fitnessData.fit_image4 && (
                        <img 
                          src={fitnessData.fit_image4} 
                          alt="รูปเสริม 3" 
                          className="detail-additional-image"
                          onClick={() => onOpenImageGallery && onOpenImageGallery(fitnessData, 3)}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

    </>
      
  );
};

export default FitnessDetailModal;