import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../supabaseClient';
import imageCompression from 'browser-image-compression';
import './FitnessManagement.css';

const FitnessManagement = ({ 
  ownerData, 
  onUpdate,
  initialFitnessData = null 
}) => {
  console.log('🔍 FitnessManagement - ownerData received:', ownerData);
  console.log('🔍 FitnessManagement - ownerData keys:', ownerData ? Object.keys(ownerData) : 'null');
  
  // ฟังก์ชันปรับฟอร์แมตเวลา
  const formatTime = (timeString) => {
    if (!timeString) return timeString;
    return timeString
      .replace(/(\d+):00\.00/g, '$1:00')     // 10:00.00 -> 10:00
      .replace(/(\d+)\.00\.00/g, '$1.00')   // 10.00.00 -> 10.00  
      .replace(/(\d+)\.00$/g, '$1')         // 10.00 -> 10
      .replace(/(\d+):00:00/g, '$1:00')     // 10:00:00 -> 10:00
      .replace(/\.00\s*-\s*(\d+)\.00/g, ' - $1')  // 10.00 - 23.00 -> 10 - 23
      .replace(/(\d+)\.00/g, '$1');         // ตัด .00 ทั้งหมด
  };
  
  // State สำหรับจัดการโหมดการทำงาน
  const [fitnessMode, setFitnessMode] = useState('view'); // 'create', 'edit', 'view'
  const [hasFitnessData, setHasFitnessData] = useState(false);
  
  // State สำหรับข้อมูลฟิตเนส
  const [fitnessData, setFitnessData] = useState({
    fit_name: '',
    fit_price: '',
    fit_price_memberm: '',
    fit_price_membery: '',
    fit_image: '',
    fit_image2: '',
    fit_image3: '',
    fit_image4: '',
    fit_address: '',
    fit_contact: '',
    fit_location: '',
    fit_user: ownerData?.owner_name || '',
    created_by: ownerData?.owner_uid || '',
    fit_phone: '',
    fit_dateopen: '',
    fit_dateclose: '',
  });

  // State สำหรับ UI และ Loading
  const [mainUploading, setMainUploading] = useState(false);
  const [image2Uploading, setImage2Uploading] = useState(false);
  const [image3Uploading, setImage3Uploading] = useState(false);
  const [image4Uploading, setImage4Uploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [coordinates, setCoordinates] = useState({ lat: 0, lng: 0 });
  const [autoSaveStatus, setAutoSaveStatus] = useState('');

  // Load existing fitness data
  const loadExistingFitnessData = useCallback(async () => {
    console.log('🔍 loadExistingFitnessData called with ownerData:', ownerData);
    
    if (!ownerData?.owner_name) {
      console.log('❌ No ownerData.owner_name available for loading fitness data');
      return;
    }

    try {
      const { data: loadedData, error } = await supabase
        .from('tbl_fitness')
        .select('*')
        .eq('fit_user', ownerData.owner_name)
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
    } else if (ownerData?.owner_name) {
      console.log('🚀 กำลังโหลดข้อมูลฟิตเนสสำหรับ:', ownerData.owner_name);
      loadExistingFitnessData();
    }
  }, [initialFitnessData, ownerData, loadExistingFitnessData]);

  // Fetch fitness data for logged-in user
  useEffect(() => {
    const fetchFitnessData = async () => {
      const user = await supabase.auth.getUser();
      if (user?.data?.user?.id && ownerData?.owner_name) {
        const { data } = await supabase
          .from('tbl_fitness')
          .select('*')
          .eq('fit_user', ownerData.owner_name)
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
  }, [ownerData]);

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
        fit_image2: fitnessData.fit_image2 || '',
        fit_image3: fitnessData.fit_image3 || '',
        fit_image4: fitnessData.fit_image4 || '',
        fit_address: fitnessData.fit_address,
        fit_contact: fitnessData.fit_contact,
        fit_location: fitnessData.fit_location,
        fit_user: ownerData?.owner_name || fitnessData.fit_user,
        fit_phone: fitnessData.fit_phone,
        fit_dateopen: fitnessData.fit_dateopen,
        fit_dateclose: fitnessData.fit_dateclose,
        created_by: user.data.user.id,
        fit_moredetails: fitnessData.fit_moredetails || '', // ส่ง string ว่างถ้าไม่มีข้อมูล เพื่อไม่ให้ null
      };

      // เพิ่ม membership prices หากมี columns ในฐานข้อมูล
      if (fitnessData.fit_price_memberm !== undefined && fitnessData.fit_price_memberm !== '') {
        saveData.fit_price_memberm = fitnessData.fit_price_memberm || 0;
      }
      if (fitnessData.fit_price_membery !== undefined && fitnessData.fit_price_membery !== '') {
        saveData.fit_price_membery = fitnessData.fit_price_membery || 0;
      }

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
        
        if (!ownerData?.owner_name) {
          console.error('Error: ownerData.owner_name is undefined');
          alert('เกิดข้อผิดพลาด: ไม่พบข้อมูล owner_name');
          setSaving(false);
          return;
        }
        
        result = await supabase
          .from('tbl_fitness')
          .update(saveData)
          .eq('fit_user', ownerData.owner_name)
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
            {/* รูปภาพหลักและรูปเสริม */}
            <div className="fitness-image-gallery">
              {/* รูปหลัก */}
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

              {/* รูปเสริม */}
              {(fitnessData.fit_image2 || fitnessData.fit_image3 || fitnessData.fit_image4) && (
                <div className="secondary-images">
                  <h4>รูปภาพเพิ่มเติม</h4>
                  <div className="secondary-images-grid">
                    {fitnessData.fit_image2 && (
                      <div className="secondary-image-item">
                        <img src={fitnessData.fit_image2} alt="รูปเสริม 1" />
                        <span className="secondary-label">รูปเสริม 1</span>
                      </div>
                    )}
                    {fitnessData.fit_image3 && (
                      <div className="secondary-image-item">
                        <img src={fitnessData.fit_image3} alt="รูปเสริม 2" />
                        <span className="secondary-label">รูปเสริม 2</span>
                      </div>
                    )}
                    {fitnessData.fit_image4 && (
                      <div className="secondary-image-item">
                        <img src={fitnessData.fit_image4} alt="รูปเสริม 3" />
                        <span className="secondary-label">รูปเสริม 3</span>
                      </div>
                    )}
                  </div>
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
                    {formatTime(fitnessData.fit_dateopen) || '08:00'} - {formatTime(fitnessData.fit_dateclose) || '22:00'}
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
              <div className="info-card price">
                <div className="info-icon">💵</div>
                <div className="info-content">
                  <h3>฿{fitnessData.fit_price ? Number(fitnessData.fit_price).toLocaleString() : '0'}</h3>
                  <p className="info-label">บาท/วัน</p>
                </div>
              </div>

              <div className="info-card price-member">
                <div className="info-icon">💵</div>
                <div className="info-content">
                  <h3>฿{fitnessData.fit_price_memberm ? Number(fitnessData.fit_price_memberm).toLocaleString() : '0'}</h3>
                  <p className="info-label">สมาชิก/เดือน</p>
                </div>
              </div>

              <div className="info-card price-member">
                <div className="info-icon">💵</div>
                <div className="info-content">
                  <h3>฿{fitnessData.fit_price_membery ? Number(fitnessData.fit_price_membery).toLocaleString() : '0'}</h3>
                  <p className="info-label">สมาชิก/ปี</p>
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
              {fitnessData.fit_image && (
                <div className="image-preview-main">
                  <img src={fitnessData.fit_image} alt="รูปภาพหลัก" className="image-preview" />
                  <button type="button" className="remove-image-btn" onClick={() => handleInputChange('fit_image', '')}>ลบ</button>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>รูปภาพเสริม 1</label>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const imageUrl = await uploadImage(file, true, setImage2Uploading);
                  if (imageUrl) {
                    handleInputChange('fit_image2', imageUrl);
                  }
                }}
                disabled={image2Uploading}
              />
              {image2Uploading && <p className="uploading">กำลังอัพโหลด...</p>}
              {fitnessData.fit_image2 && (
                <div className="image-preview-main">
                  <img src={fitnessData.fit_image2} alt="รูปภาพเสริม 1" className="image-preview" />
                  <button type="button" className="remove-image-btn" onClick={() => handleInputChange('fit_image2', '')}>ลบ</button>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>รูปภาพเสริม 2</label>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const imageUrl = await uploadImage(file, true, setImage3Uploading);
                  if (imageUrl) {
                    handleInputChange('fit_image3', imageUrl);
                  }
                }}
                disabled={image3Uploading}
              />
              {image3Uploading && <p className="uploading">กำลังอัพโหลด...</p>}
              {fitnessData.fit_image3 && (
                <div className="image-preview-main">
                  <img src={fitnessData.fit_image3} alt="รูปภาพเสริม 2" className="image-preview" />
                  <button type="button" className="remove-image-btn" onClick={() => handleInputChange('fit_image3', '')}>ลบ</button>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>รูปภาพเสริม 3</label>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const imageUrl = await uploadImage(file, true, setImage4Uploading);
                  if (imageUrl) {
                    handleInputChange('fit_image4', imageUrl);
                  }
                }}
                disabled={image4Uploading}
              />
              {image4Uploading && <p className="uploading">กำลังอัพโหลด...</p>}
              {fitnessData.fit_image4 && (
                <div className="image-preview-main">
                  <img src={fitnessData.fit_image4} alt="รูปภาพเสริม 3" className="image-preview" />
                  <button type="button" className="remove-image-btn" onClick={() => handleInputChange('fit_image4', '')}>ลบ</button>
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

            <div className="form-group">
              <label>ราคา/วัน (บาท) *</label>
              <input
                type="number"
                value={fitnessData.fit_price}
                onChange={(e) => handleInputChange('fit_price', e.target.value)}
                placeholder="0"
                min="0"
              />
            </div>

            <div className="form-group">
              <label>ราคาสมาชิกรายเดือน (บาท)</label>
              <input
                type="number"
                value={fitnessData.fit_price_memberm}
                onChange={(e) => handleInputChange('fit_price_memberm', e.target.value)}
                placeholder="0"
                min="0"
              />
            </div>

            <div className="form-group">
              <label>ราคาสมาชิกรายปี (บาท)</label>
              <input
                type="number"
                value={fitnessData.fit_price_membery}
                onChange={(e) => handleInputChange('fit_price_membery', e.target.value)}
                placeholder="0"
                min="0"
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
