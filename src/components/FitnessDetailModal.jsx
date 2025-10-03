import React from 'react';
import './FitnessDetailModal.css';

const FitnessDetailModal = ({ 
  isOpen, 
  onClose, 
  fitnessData,
  onViewLocation,
  onOpenImageGallery,
  isFullPage = false // เพิ่ม prop สำหรับตรวจสอบว่าเป็นหน้าเต็มหรือไม่
}) => {
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

  // Debug logs
  console.log('🖼️ Selected fitness data:', fitnessData);
  console.log('🖼️ fit_image2:', fitnessData.fit_image2);
  console.log('🖼️ fit_image3:', fitnessData.fit_image3);
  console.log('🖼️ fit_image4:', fitnessData.fit_image4);
  console.log('🗺️ fit_location:', fitnessData.fit_location);
  console.log('🏋️‍♂️ equipment:', fitnessData.equipment);

  // เมื่อเป็น Full Page ให้ใช้ layout แบบใหม่
  if (isFullPage) {
    return (
      <div className="fitness-detail-content">
        {/* Header Section */}
        <div className="fitness-header">
          <div className="fitness-title-section">
            <h1 className="fitness-title">{fitnessData.fitness_name}</h1>
            <div className="fitness-location">
              📍 {fitnessData.location}
            </div>
          </div>
          <div className="fitness-actions">
            <button className="share-btn">📤</button>
          </div>
        </div>

        {/* Main Content */}
        <div className="fitness-main-content">
          {/* Left Section - Images */}
          <div className="fitness-images-section">
            <div className="main-image-container">
              <img 
                src={fitnessData.image || "data:image/svg+xml,%3Csvg width='400' height='300' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%' height='100%' fill='%23f0f0f0'/%3E%3Ctext x='50%' y='50%' font-size='18' fill='%23666' text-anchor='middle' dy='.3em'%3EGym Image%3C/text%3E%3C/svg%3E"}
                alt={fitnessData.fitness_name}
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
              <h3>อุปกรณ์ที่มีให้บริการ</h3>
              <div className="equipment-grid-showcase">
                {(() => {
                  console.log('🏋️‍♂️ Equipment data:', fitnessData.equipment);
                  const equipmentList = fitnessData.equipment || [];
                  
                  if (equipmentList.length > 0) {
                    return equipmentList.slice(0, 4).map((equipment, index) => (
                      <div key={equipment.eq_id || equipment.em_id || index} className="equipment-showcase-item">
                        <div className="equipment-image-container">
                          {equipment.eq_image || equipment.em_image ? (
                            <img 
                              src={equipment.eq_image || equipment.em_image} 
                              alt={equipment.eq_name || equipment.em_name}
                              className="equipment-showcase-image"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          
                        </div>
                        <div className="equipment-showcase-info">
                          <h4>{equipment.eq_name || equipment.em_name || 'ไม่ระบุชื่อ'}</h4>
                          <p>จำนวน: {equipment.eq_qty || equipment.em_qty || 1}</p>
                        </div>
                      </div>
                    ));
                  } else {
                    return (
                      <div className="no-equipment">
                        <p>ไม่มีข้อมูลอุปกรณ์</p>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          </div>

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
                  <span className="schedule-label">เปิดวัน:</span>
                  <span className="schedule-value">จันทร์-เสาร์</span>
                </div>
                <div className="schedule-item">
                  <span className="schedule-label">เวลา:</span>
                  <span className="schedule-value">{formatTime(fitnessData.hours) || '08.00 - 22.00'}</span>
                </div>
              </div>
              
              <div className="price-display">
                <span className="price-number">{fitnessData.price_per_day || 69}</span>
                <span className="price-unit">บาท/วัน</span>
              </div>
              
              <button className="booking-btn">
                📋 จองบริการ
              </button>
            </div>

            {/* Contact Info */}
            <div className="contact-section">
              <div className="contact-item">
                <span className="contact-icon">📞</span>
                <span className="contact-text">{fitnessData.phone || 'ไม่ระบุเบอร์โทร'}</span>
              </div>
              <div className="contact-item">
                <span className="contact-icon">👤</span>
                <span className="contact-text">{fitnessData.owner_name || 'ไม่ระบุเจ้าของ'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Original Modal Layout (สำหรับ backward compatibility)
  return (
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
      
  );
};

export default FitnessDetailModal;