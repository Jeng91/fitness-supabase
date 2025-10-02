import React from 'react';
import './FitnessDetailModal.css';

const FitnessDetailModal = ({ 
  isOpen, 
  onClose, 
  fitnessData,
  onViewLocation,
  onOpenImageGallery 
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

  return (
    <div className="detail-modal-overlay" onClick={onClose}>
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