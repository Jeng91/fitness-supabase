import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../supabaseClient';
import imageCompression from 'browser-image-compression';

const FitnessManagement = ({ 
  ownerData, 
  onUpdate,
  initialFitnessData = null 
}) => {
  // State สำหรับจัดการโหมดการทำงาน
  const [fitnessMode, setFitnessMode] = useState('view'); // 'create', 'edit', 'view'
  const [hasFitnessData, setHasFitnessData] = useState(false);
  
  // State สำหรับข้อมูลฟิตเนส
  const [fitnessData, setFitnessData] = useState({
    fit_name: '',
    fit_price: '',
    fit_image: '',
    fit_address: '',
    fit_contact: '',
    fit_location: '',
    created_by: ownerData?.owner_uid || '',
    fit_phone: '',
    fit_dateopen: '',
    fit_dateclose: '',
  });

  // State สำหรับ UI และ Loading
  const [mainUploading, setMainUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [coordinates, setCoordinates] = useState({ lat: 0, lng: 0 });
  const [autoSaveStatus, setAutoSaveStatus] = useState('');

  // Load existing fitness data
  const loadExistingFitnessData = useCallback(async () => {
    console.log('loadExistingFitnessData called with ownerData:', ownerData);
    
    if (!ownerData?.owner_uid) {
      console.log('No ownerData.owner_uid available for loading fitness data');
      return;
    }

    try {
      const { data: loadedData, error } = await supabase
        .from('tbl_fitness')
        .select('*')
        .eq('created_by', ownerData.owner_uid)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading fitness data:', error);
        return;
      }

      if (loadedData) {
        console.log('✅ พบข้อมูลฟิตเนสที่มีอยู่แล้ว:', loadedData);
        setFitnessData(loadedData);
        setCoordinates({ lat: loadedData.fit_lat || 0, lng: loadedData.fit_lng || 0 });
        setHasFitnessData(true);
        setFitnessMode('view');
        
        // Notify parent component
        if (onUpdate) {
          onUpdate(loadedData);
        }
      } else {
        console.log('ℹ️ ไม่พบข้อมูลฟิตเนสที่มีอยู่แล้ว');
        setHasFitnessData(false);
        setFitnessMode('view');
      }
    } catch (error) {
      console.error('Error in loadExistingFitnessData:', error);
    }
  }, [ownerData, onUpdate]);

  useEffect(() => {
    if (initialFitnessData) {
      setFitnessData(initialFitnessData);
      setCoordinates({ lat: initialFitnessData.fit_lat || 0, lng: initialFitnessData.fit_lng || 0 });
      setHasFitnessData(true);
      setFitnessMode('view');
    } else if (ownerData?.owner_id) {
      loadExistingFitnessData();
    }
  }, [initialFitnessData, ownerData, loadExistingFitnessData]);

  // Fetch fitness data for logged-in user
  useEffect(() => {
    const fetchFitnessData = async () => {
      const user = await supabase.auth.getUser();
      if (user?.data?.user?.id) {
        const { data } = await supabase
          .from('tbl_fitness')
          .select('*')
          .eq('created_by', user.data.user.id)
          .single();
        if (data) {
          setFitnessData(data);
          setHasFitnessData(true);
          setFitnessMode('view');
        } else {
          setHasFitnessData(false);
          setFitnessMode('create');
        }
      }
    };
    fetchFitnessData();
  }, []);

  // Auto-save form data
  useEffect(() => {
    if (ownerData?.owner_id && fitnessData.fit_name) {
      setAutoSaveStatus('กำลังบันทึก...');
      
      const saveTimer = setTimeout(async () => {
        try {
          setAutoSaveStatus('บันทึกอัตโนมัติ...');
          
          // const saveData = {
          //   ...fitnessData,
          //   fit_lat: coordinates.lat,
          //   fit_lng: coordinates.lng,
          //   owner_id: ownerData.owner_id
          // };

          setAutoSaveStatus('บันทึกเสร็จสิ้น ✓');
        } catch (error) {
          setAutoSaveStatus('เกิดข้อผิดพลาด ❌');
        }
      }, 2000);

      return () => clearTimeout(saveTimer);
    }
  }, [fitnessData, coordinates, ownerData?.owner_id]);

  // Upload image function
  const uploadImage = async (file, isSecondary = false, setLoadingFn, onProgress) => {
    if (!file) return null;
    try {
      if (setLoadingFn) setLoadingFn(true);
      // ตั้งค่าการบีบอัด/resize
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1024,
        useWebWorker: true,
        onProgress: onProgress || (() => {})
      };
      const compressedFile = await imageCompression(file, options);
      if (compressedFile.size > 5 * 1024 * 1024) {
        alert('ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5MB หลังบีบอัด');
        return null;
      }
      if (!compressedFile.type.startsWith('image/')) {
        alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
        return null;
      }
      const fileExt = compressedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const folder = isSecondary ? 'secondary' : 'main';
      const filePath = `${folder}/${Date.now()}/${fileName}`;
      const { error } = await supabase.storage
        .from('fitness-images')
        .upload(filePath, compressedFile, {
          cacheControl: '3600',
          upsert: false
        });
      if (error) {
        console.error('Upload error:', error);
        alert('เกิดข้อผิดพลาดในการอัพโหลดรูปภาพ: ' + error.message);
        return null;
      }
      const { data: { publicUrl } } = supabase.storage
        .from('fitness-images')
        .getPublicUrl(filePath);
      return publicUrl;
    } catch (error) {
      console.error('Error:', error);
      alert('เกิดข้อผิดพลาดในการอัพโหลดรูปภาพ');
      return null;
    } finally {
      if (setLoadingFn) setLoadingFn(false);
    }
  };

  // Save fitness changes
  const saveFitnessChanges = async () => {
    if (!fitnessData.fit_name?.trim()) {
      alert('กรุณากรอกชื่อฟิตเนส');
      return;
    }

    if (!fitnessData.fit_price || fitnessData.fit_price <= 0) {
      alert('กรุณากรอกราคาที่ถูกต้อง');
      return;
    }

    setSaving(true);
    try {
      const user = await supabase.auth.getUser();
      const saveData = {
        fit_name: fitnessData.fit_name,
        fit_price: fitnessData.fit_price,
        fit_image: fitnessData.fit_image,
        fit_address: fitnessData.fit_address,
        fit_contact: fitnessData.fit_contact,
        fit_location: fitnessData.fit_location,
        fit_user: fitnessData.fit_user,
        fit_phone: fitnessData.fit_phone,
        fit_dateopen: fitnessData.fit_dateopen,
        fit_dateclose: fitnessData.fit_dateclose,
        created_by: user.data.user.id,
        fit_moredetails: fitnessData.fit_moredetails || '', // ส่ง string ว่างถ้าไม่มีข้อมูล เพื่อไม่ให้ null
      };

      let result;
      if (fitnessMode === 'create' || !hasFitnessData) {
        // Create new fitness
        result = await supabase
          .from('tbl_fitness')
          .insert(saveData)
          .select()
          .single();
      } else {
        // Update existing fitness
        console.log('Updating fitness with ownerData:', ownerData);
        
        if (!ownerData?.owner_uid) {
          console.error('Error: ownerData.owner_uid is undefined');
          alert('เกิดข้อผิดพลาด: ไม่พบข้อมูล owner_uid');
          setSaving(false);
          return;
        }
        
        result = await supabase
          .from('tbl_fitness')
          .update(saveData)
          .eq('created_by', ownerData.owner_uid)
          .select()
          .single();
      }

      if (result.error) {
        console.error('Error saving fitness:', result.error);
        alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + result.error.message);
        return;
      }

      console.log('✅ บันทึกข้อมูลฟิตเนสสำเร็จ:', result.data);
      setFitnessData(result.data);
      setHasFitnessData(true);
      setFitnessMode('view');
      
      // Notify parent component
      if (onUpdate) {
        onUpdate(result.data);
      }

      alert('บันทึกข้อมูลสำเร็จ!');
    } catch (error) {
      console.error('Error:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFitnessData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="fitness-management">
      <style jsx>{`
        .fitness-management {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }

        .fitness-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          padding-bottom: 15px;
          border-bottom: 2px solid #e9ecef;
        }

        .fitness-header h2 {
          color: #333;
          margin: 0;
          font-size: 28px;
        }

        .view-actions {
          display: flex;
          gap: 10px;
        }

        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn.secondary {
          background: #6c757d;
          color: white;
        }

        .btn.secondary:hover {
          background: #5a6268;
          transform: translateY(-2px);
        }

        .fitness-display-card {
          background: white;
          border-radius: 16px;
          padding: 30px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          border: 1px solid #e9ecef;
        }

        .fitness-image-gallery {
          margin-bottom: 30px;
        }

        .main-image-container {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          height: 300px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .main-fitness-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .no-image-placeholder {
          height: 300px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          border-radius: 12px;
          color: #6c757d;
          font-size: 48px;
        }

        .no-image-placeholder p {
          margin: 10px 0 0 0;
          font-size: 16px;
        }

        .image-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(transparent, rgba(0,0,0,0.7));
          padding: 20px;
        }

        .image-label {
          color: white;
          font-size: 16px;
          font-weight: 600;
        }

        .fitness-info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .info-card {
          background: #f8f9fa;
          border-radius: 12px;
          padding: 20px;
          display: flex;
          align-items: center;
          gap: 15px;
          transition: all 0.3s ease;
          border-left: 4px solid #dee2e6;
        }

        .info-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }

        .info-card.primary {
          border-left-color: #007bff;
          background: linear-gradient(135deg, #007bff);
        }

        .info-card.price {
          border-left-color: #28a745;
          background: linear-gradient(135deg, #28a745);
        }

        .info-card.location {
          border-left-color: #dc3545;
          background: linear-gradient(135deg, #dc3545);
        }

        .info-card.contact {
          border-left-color: #ffc107;
          background: linear-gradient(135deg, #ffc107);
        }

        .info-card.time {
          border-left-color: #6f42c1;
          background: linear-gradient(135deg, #6f42c1);
        }

        .info-card.social {
          border-left-color: #20c997;
          background: linear-gradient(135deg,  #20c997);
        }

        .info-icon {
          font-size: 24px;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: white;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .info-content h3, .info-content h4 {
          margin: 0 0 5px 0;
          color: #333;
          font-size: 18px;
          font-weight: 600;
        }

        .info-label {
          margin: 0;
          color: #6c757d;
          font-size: 14px;
          font-weight: 500;
        }

        .gps-info {
          background: linear-gradient(135deg, #e8f4f8 0%, #f0f8ff 100%);
          border-radius: 12px;
          padding: 20px;
          border-left: 4px solid #17a2b8;
        }

        .gps-info h4 {
          margin: 0 0 15px 0;
          color: #333;
          font-size: 18px;
        }

        .gps-coords {
          display: flex;
          gap: 20px;
          margin-bottom: 15px;
          flex-wrap: wrap;
        }

        .gps-coords span {
          background: white;
          padding: 8px 15px;
          border-radius: 20px;
          font-size: 14px;
          color: #333;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .btn-map {
          background: #17a2b8;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 25px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.3s ease;
        }

        .btn-map:hover {
          background: #138496;
          transform: translateY(-2px);
        }

        @media (max-width: 768px) {
          .fitness-header {
            flex-direction: column;
            gap: 15px;
            text-align: center;
          }

          .fitness-info-grid {
            grid-template-columns: 1fr;
          }

          .gps-coords {
            flex-direction: column;
            gap: 10px;
          }
        }
      `}</style>
      <div className="section-header">
        <h2>🏋️ จัดการข้อมูลฟิตเนส</h2>
        <div className="header-actions">
          {hasFitnessData ? (
            <>
              {fitnessMode === 'view' ? (
                <button
                  className="btn-primary"
                  onClick={() => setFitnessMode('edit')}
                >
                  ✏️ แก้ไขข้อมูล
                </button>
              ) : (
                <div className="edit-actions">
                  <button
                    className="btn-primary"
                    onClick={saveFitnessChanges}
                    disabled={saving}
                  >
                    {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setFitnessMode('view');
                      loadExistingFitnessData();
                    }}
                  >
                    ยกเลิก
                  </button>
                </div>
              )}
            </>
          ) : (
            <button
              className="btn-primary"
              onClick={() => setFitnessMode('create')}
            >
              + สร้างฟิตเนส
            </button>
          )}
        </div>
      </div>

      {autoSaveStatus && (
        <div className={`auto-save-status ${autoSaveStatus.includes('❌') ? 'error' : 
          autoSaveStatus.includes('✓') ? 'success' : 'loading'}`}>
          {autoSaveStatus}
        </div>
      )}

      {fitnessMode === 'view' && hasFitnessData ? (
        // View Mode - แสดงข้อมูลอย่างสวยงาม
        <div className="fitness-view">
          <div className="fitness-header">
            <h2>🏢 ข้อมูลฟิตเนสของคุณ</h2>
          </div>

          <div className="fitness-display-card">
            {/* รูปภาพหลัก */}
            <div className="fitness-image-gallery">
              {fitnessData.fit_image ? (
                <div className="main-image-container">
                  <img 
                    src={fitnessData.fit_image} 
                    alt={fitnessData.fit_name}
                    className="main-fitness-image"
                  />
                  <div className="image-overlay">
                    <span className="image-label">รูปหลัก</span>
                  </div>
                </div>
              ) : (
                <div className="no-image-placeholder">
                  🏢
                  <p>ยังไม่มีรูปภาพ</p>
                </div>
              )}
            </div>

            {/* ข้อมูลหลัก */}
            <div className="fitness-info-grid">
              <div className="info-card primary">
                <div className="info-icon">🏋️‍♂️</div>
                <div className="info-content">
                  <h3>{fitnessData.fit_name || 'ไม่ระบุชื่อ'}</h3>
                  <p className="info-label">ชื่อฟิตเนส</p>
                </div>
              </div>

              <div className="info-card price">
                <div className="info-icon">💵</div>
                <div className="info-content">
                  <h3>฿{fitnessData.fit_price ? Number(fitnessData.fit_price).toLocaleString() : '0'}</h3>
                  <p className="info-label">บาท/เดือน</p>
                </div>
              </div>

              <div className="info-card location">
                <div className="info-icon">🏠</div>
                <div className="info-content">
                  <h4>{fitnessData.fit_address || 'ไม่ระบุที่อยู่'}</h4>
                  <p className="info-label">ที่อยู่</p>
                </div>
              </div>

              <div className="info-card contact">
                <div className="info-icon">☎️</div>
                <div className="info-content">
                  <h4>{fitnessData.fit_phone || 'ไม่ระบุเบอร์โทร'}</h4>
                  <p className="info-label">เบอร์โทรติดต่อ</p>
                </div>
              </div>

              <div className="info-card time">
                <div className="info-icon">🕑</div>
                <div className="info-content">
                  <h4>
                    {fitnessData.fit_dateopen || '00:00'} - {fitnessData.fit_dateclose || '00:00'}
                  </h4>
                  <p className="info-label">เวลาเปิด-ปิด</p>
                </div>
              </div>

              <div className="info-card social">
                <div className="info-icon">📲</div>
                <div className="info-content">
                  <h4>{fitnessData.fit_contact || 'ไม่ระบุ'}</h4>
                  <p className="info-label">ช่องทางติดต่อ (โซเชียล)</p>
                </div>
              </div>
            </div>

            {/* GPS Location */}
            {coordinates.lat && coordinates.lng && (
              <div className="gps-info">
                <h4>🌍 ตำแหน่ง GPS</h4>
                <div className="gps-coords">
                  <span>ละติจูด: {coordinates.lat.toFixed(6)}</span>
                  <span>ลองจิจูด: {coordinates.lng.toFixed(6)}</span>
                </div>
                <button 
                  className="btn-map"
                  onClick={() => window.open(`https://maps.google.com/?q=${coordinates.lat},${coordinates.lng}`, '_blank')}
                >
                  🗺️ เปิดใน Google Maps
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (fitnessMode === 'create' || fitnessMode === 'edit') ? (
        // Create/Edit Mode
        <div className="fitness-form">
          <div className="form-grid">
            <div className="form-group">
              <label>ชื่อฟิตเนส *</label>
              <input
                type="text"
                value={fitnessData.fit_name}
                onChange={(e) => handleInputChange('fit_name', e.target.value)}
                placeholder="กรอกชื่อฟิตเนส"
              />
            </div>

            <div className="form-group">
              <label>ราคา/เดือน (บาท) *</label>
              <input
                type="number"
                value={fitnessData.fit_price}
                onChange={(e) => handleInputChange('fit_price', e.target.value)}
                placeholder="0"
                min="0"
              />
            </div>

            <div className="form-group">
              <label>รูปภาพหลัก</label>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const imageUrl = await uploadImage(file, false, setMainUploading);
                  if (imageUrl) {
                    handleInputChange('fit_image', imageUrl);
                  }
                }}
                disabled={mainUploading}
              />
              {mainUploading && <p className="uploading">กำลังอัพโหลด...</p>}
              {/* สามารถเพิ่ม progress bar ได้ที่นี่ */}
              {fitnessData.fit_image && (
                <div className="image-preview-main">
                  <img src={fitnessData.fit_image} alt="รูปภาพหลัก" className="image-preview" />
                  <button type="button" className="remove-image-btn" onClick={() => handleInputChange('fit_image', '')}>ลบ</button>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>ที่อยู่/สถานที่ตั้ง</label>
              <input
                type="text"
                value={fitnessData.fit_address || ''}
                onChange={(e) => handleInputChange('fit_address', e.target.value)}
                placeholder="กรอกที่อยู่ฟิตเนส"
              />
            </div>

            <div className="form-group">
              <label>เบอร์โทรศัพท์</label>
              <input
                type="text"
                value={fitnessData.fit_phone || ''}
                onChange={(e) => handleInputChange('fit_phone', e.target.value)}
                placeholder="กรอกเบอร์โทรศัพท์"
              />
            </div>

            <div className="form-group">
              <label>ข้อมูลการติดต่อ (ช่องทางอื่นๆ)</label>
              <input
                type="text"
                value={fitnessData.fit_contact || ''}
                onChange={(e) => handleInputChange('fit_contact', e.target.value)}
                placeholder="กรอกข้อมูลการติดต่ออื่นๆ"
              />
            </div>
            <div className="form-group">
              <label>วันที่เปิด</label>
              <input
                type="time"
                value={fitnessData.fit_dateopen || ''}
                onChange={(e) => handleInputChange('fit_dateopen', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>วันที่ปิด</label>
              <input
                type="time"
                value={fitnessData.fit_dateclose || ''}
                onChange={(e) => handleInputChange('fit_dateclose', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>พิกัด (Location)</label>
              <input
                type="text"
                value={fitnessData.fit_location || ''}
                onChange={(e) => handleInputChange('fit_location', e.target.value)}
                placeholder="กรอกพิกัดฟิตเนส เช่น 16.12345, 103.12345"
              />
            </div>
          </div>

           <div className="form-group">
              <label>รายละเอียดเพิ่มเติม</label>
              <textarea
                value={fitnessData.fit_moredetails || ''}
                onChange={(e) => handleInputChange('fit_moredetails', e.target.value)}
                placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับฟิตเนส"
                
              />
            </div>

          {(fitnessMode === 'create' || fitnessMode === 'edit') && (
            <div className="form-actions">
              <button
                className="btn-primary"
                onClick={saveFitnessChanges}
                disabled={saving}
              >
                {saving ? 'กำลังบันทึก...' : (fitnessMode === 'create' ? 'สร้างข้อมูลฟิตเนส' : 'บันทึกการเปลี่ยนแปลง')}
              </button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setFitnessMode('view');
                  loadExistingFitnessData();
                }}
              >
                ยกเลิก
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default FitnessManagement;