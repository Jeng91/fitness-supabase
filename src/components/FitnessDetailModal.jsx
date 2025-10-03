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
            <button className="favorite-btn">♡</button>
            <button className="share-btn">🔗</button>
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
              {(() => {
                const equipmentData = fitnessData.equipment || [];
                const hasEquipment = Array.isArray(equipmentData) && equipmentData.length > 0;
                
                if (hasEquipment) {
                  return (
                    <div className="equipment-grid-showcase">
                      {equipmentData.slice(0, 4).map((eq, index) => (
                        <div key={eq.em_id || eq.eq_id || index} className="equipment-showcase-item">
                          <div className="equipment-image-container">
                            {(eq.eq_image || eq.em_image) ? (
                              <img 
                                src={eq.eq_image || eq.em_image} 
                                alt={eq.eq_name || eq.em_name}
                                className="equipment-showcase-image"
                              />
                            ) : (
                              <div className="equipment-placeholder">🏋️‍♂️</div>
                            )}
                          </div>
                          <div className="equipment-showcase-info">
                            <h4>{eq.em_name || eq.eq_name || 'ไม่ระบุชื่อ'}</h4>
                            <p>จำนวน: {eq.eq_qty || eq.em_qty || 10}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                } else {
                  return (
                    <div className="equipment-grid-showcase">
                      <div className="equipment-showcase-item">
                        <div className="equipment-image-container">
                          <div className="equipment-placeholder">🏃‍♂️</div>
                        </div>
                        <div className="equipment-showcase-info">
                          <h4>เครื่องวิ่ง</h4>
                          <p>จำนวน: 10</p>
                        </div>
                      </div>
                      <div className="equipment-showcase-item">
                        <div className="equipment-image-container">
                          <div className="equipment-placeholder">🚴‍♂️</div>
                        </div>
                        <div className="equipment-showcase-info">
                          <h4>จักรยาน</h4>
                          <p>จำนวน: 10</p>
                        </div>
                      </div>
                      <div className="equipment-showcase-item">
                        <div className="equipment-image-container">
                          <div className="equipment-placeholder">🏋️‍♂️</div>
                        </div>
                        <div className="equipment-showcase-info">
                          <h4>เครื่องยก</h4>
                          <p>จำนวน: 10</p>
                        </div>
                      </div>
                      <div className="equipment-showcase-item">
                        <div className="equipment-image-container">
                          <div className="equipment-placeholder">💪</div>
                        </div>
                        <div className="equipment-showcase-info">
                          <h4>ดัมเบล</h4>
                          <p>จำนวน: 5</p>
                        </div>
                      </div>
                    </div>
                  );
                }
              })()}
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
                <button className="map-btn" onClick={onViewLocation}>
                  📍 แสดงแผนที่
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
            
            {/* ข้อมูลรายละเอียด */}
            <div className="fitness-info-section">
              <div className="info-header">
                <div className="rating-section">
                  <span className="stars">⭐⭐⭐⭐⭐</span>
                  <span className="rating-score">{fitnessData.rating || '4.5'}</span>
                  <span className="rating-count">(25 รีวิว)</span>
                </div>
                <div className="price-section">
                  <span className="price-amount">{fitnessData.price_per_day || 100}</span>
                  <span className="price-unit">บาท/วัน</span>
                </div>
              </div>
              
              <div className="info-details">
                <div className="detail-item">
                  <span className="detail-icon">📍</span>
                  <div className="detail-content">
                    <strong>ที่อยู่:</strong>
                    <p>{fitnessData.location}</p>
                  </div>
                </div>
                
                <div className="detail-item">
                  <span className="detail-icon">📞</span>
                  <div className="detail-content">
                    <strong>เบอร์โทร:</strong>
                    <p>{fitnessData.phone}</p>
                  </div>
                </div>
                
                <div className="detail-item">
                  <span className="detail-icon">🕒</span>
                  <div className="detail-content">
                    <strong>เวลาทำการ:</strong>
                    <p>{formatTime(fitnessData.hours)}</p>
                  </div>
                </div>
                
                <div className="detail-item">
                  <span className="detail-icon">👤</span>
                  <div className="detail-content">
                    <strong>เจ้าของ:</strong>
                    <p>{fitnessData.owner_name}</p>
                  </div>
                </div>
                
                {fitnessData.description && (
                  <div className="detail-item">
                    <span className="detail-icon">📝</span>
                    <div className="detail-content">
                      <strong>รายละเอียดเพิ่มเติม:</strong>
                      <p>{fitnessData.description}</p>
                    </div>
                  </div>
                )}
                
                {/* ข้อมูลอุปกรณ์ */}
                {(() => {
                  // ตรวจสอบข้อมูลอุปกรณ์จากหลายแหล่ง
                  const equipmentData = fitnessData.equipment || fitnessData.equipments || [];
                  const hasEquipment = Array.isArray(equipmentData) && equipmentData.length > 0;
                  
                  console.log('🔍 Equipment check:', {
                    hasEquipment,
                    equipmentLength: equipmentData?.length,
                    equipment: equipmentData,
                    allFitnessData: fitnessData
                  });

                  if (hasEquipment) {
                    return (
                      <div className="detail-item equipment-section">
                        <span className="detail-icon">🏋️‍♂️</span>
                        <div className="detail-content">
                          <strong>อุปกรณ์ที่มีให้บริการ ({equipmentData.length} รายการ):</strong>
                          <div className="equipment-grid">
                            {equipmentData.map((eq, index) => (
                              <div key={eq.em_id || eq.eq_id || index} className="equipment-item">
                                <div className="equipment-info">
                                  <h4>{eq.em_name || eq.eq_name || 'ไม่ระบุชื่อ'}</h4>
                                  {(eq.eq_price || eq.em_price) && (
                                    <p className="equipment-price">
                                      💰 {eq.eq_price || eq.em_price} บาท/ชั่วโมง
                                    </p>
                                  )}
                                  {(eq.eq_detail || eq.em_detail) && (
                                    <p className="equipment-detail">
                                      📋 {eq.eq_detail || eq.em_detail}
                                    </p>
                                  )}
                                  {(eq.eq_qty || eq.em_qty) && (
                                    <p className="equipment-qty">
                                      📦 จำนวน: {eq.eq_qty || eq.em_qty} ชิ้น
                                    </p>
                                  )}
                                </div>
                                {(eq.eq_image || eq.em_image) && (
                                  <div className="equipment-image">
                                    <img 
                                      src={eq.eq_image || eq.em_image} 
                                      alt={eq.eq_name || eq.em_name}
                                      className="equipment-thumb"
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    // แสดงข้อมูลสำรองหากไม่มีอุปกรณ์
                    const mockEquipment = [
                      { name: 'เครื่องวิ่ง', price: '50 บาท/ชั่วโมง' },
                      { name: 'ดัมเบล', price: '30 บาท/ชั่วโมง' },
                      { name: 'จักรยานออกกำลังกาย', price: '40 บาท/ชั่วโมง' }
                    ];
                    
                    return (
                      <div className="detail-item">
                        <span className="detail-icon">🏋️‍♂️</span>
                        <div className="detail-content">
                          <strong>อุปกรณ์ที่ให้บริการ:</strong>
                          <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
                            {mockEquipment.map((eq, index) => (
                              <li key={index} style={{ marginBottom: '0.25rem' }}>
                                {eq.name} - {eq.price}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  }
                })()}
              </div>
              
              <div className="action-buttons">
                <button className="contact-btn">
                  📞 ติดต่อ
                </button>
                <button 
                  className="location-btn"
                  onClick={() => onViewLocation && onViewLocation(fitnessData)}
                >
                  📍 ดูพิกัด
                </button>
                <button className="favorite-btn-large">
                  ❤️ บันทึก
                </button>
                <button className="book-btn">
                  📅 จองเลย
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FitnessDetailModal;