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
    fit_user: ownerData?.owner_id || '',
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
    if (!ownerData?.owner_id) return;

    try {
      const { data: loadedData, error } = await supabase
        .from('tbl_fitness')
        .select('*')
        .eq('owner_id', ownerData.owner_id)
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
  }, [ownerData?.owner_id, onUpdate]);

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
        result = await supabase
          .from('tbl_fitness')
          .update(saveData)
          .eq('owner_id', ownerData.owner_id)
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
        // View Mode
        <div className="fitness-view">
          <div className="fitness-card">
            <div className="fitness-images">
              {fitnessData.fit_image && (
                <img 
                  src={fitnessData.fit_image} 
                  alt="รูปหลัก"
                  className="fitness-main-image"
                />
              )}
              {fitnessData.fit_image2 && (
                <img 
                  src={fitnessData.fit_image2} 
                  alt="รูปเสริม"
                  className="fitness-secondary-image"
                />
              )}
            </div>
            
            <div className="fitness-details">
              <h3>{fitnessData.fit_name}</h3>
              <p className="price">฿{fitnessData.fit_price?.toLocaleString()}/เดือน</p>
              <p className="description">{fitnessData.fit_detail}</p>
              <p className="location">📍 {fitnessData.fit_location}</p>
              {coordinates.lat && coordinates.lng && (
                <p className="coordinates">
                  🌍 ละติจูด: {coordinates.lat.toFixed(6)}, 
                  ลองจิจูด: {coordinates.lng.toFixed(6)}
                </p>
              )}
            </div>
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