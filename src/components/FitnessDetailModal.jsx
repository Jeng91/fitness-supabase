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
                    <p>{fitnessData.hours}</p>
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
                {console.log('🔍 Equipment check:', {
                  hasEquipment: !!fitnessData.equipment,
                  equipmentLength: fitnessData.equipment?.length,
                  equipment: fitnessData.equipment
                })}
                {fitnessData.equipment && fitnessData.equipment.length > 0 ? (
                  <div className="detail-item equipment-section">
                    <span className="detail-icon">🏋️‍♂️</span>
                    <div className="detail-content">
                      <strong>อุปกรณ์ที่มีให้บริการ ({fitnessData.equipment.length} รายการ):</strong>
                      <div className="equipment-grid">
                        {fitnessData.equipment.map((eq, index) => (
                          <div key={eq.eq_id || index} className="equipment-item">
                            <div className="equipment-info">
                              <h4>{eq.eq_name || 'ไม่ระบุชื่อ'}</h4>
                              {eq.eq_price && (
                                <p className="equipment-price">
                                  💰 {eq.eq_price} บาท/ชั่วโมง
                                </p>
                              )}
                              {eq.eq_detail && (
                                <p className="equipment-detail">
                                  📋 {eq.eq_detail}
                                </p>
                              )}
                              {eq.eq_qty && (
                                <p className="equipment-qty">
                                  📦 จำนวน: {eq.eq_qty} ชิ้น
                                </p>
                              )}
                            </div>
                            {eq.eq_image && (
                              <div className="equipment-image">
                                <img 
                                  src={eq.eq_image} 
                                  alt={eq.eq_name}
                                  className="equipment-thumb"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="detail-item">
                    <span className="detail-icon">🏋️‍♂️</span>
                    <div className="detail-content">
                      <strong>อุปกรณ์:</strong>
                      <p>ยังไม่มีข้อมูลอุปกรณ์</p>
                    </div>
                  </div>
                )}
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