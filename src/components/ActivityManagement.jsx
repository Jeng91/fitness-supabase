import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../supabaseClient';
import './ActivityManagement.css';

const ClassManagement = ({ ownerData, onUpdate }) => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    class_name: '',
    description: '',
    image_url: '',
    class_time: '',
    duration: 60,
    instructor: '',
    max_participants: 10,
    price: 0,
    status: 'active'
  });

  // โหลดข้อมูลคลาส
  const loadClasses = useCallback(async () => {
    if (!ownerData?.owner_name) return;

    setLoading(true);
    try {
      // ดึงข้อมูลฟิตเนสก่อน - ใช้ fit_user จาก tbl_fitness
      const { data: fitnessData, error: fitnessError } = await supabase
        .from('tbl_fitness')
        .select('fit_id')
        .eq('fit_user', ownerData.owner_name)
        .single();

      if (fitnessError || !fitnessData) {
        console.log('ยังไม่มีข้อมูลฟิตเนส');
        setClasses([]);
        return;
      }

      // ดึงข้อมูลคลาส
      const { data: classData, error: classError } = await supabase
        .from('tbl_classes')
        .select('*')
        .eq('fit_id', fitnessData.fit_id)
        .order('created_at', { ascending: false });

      if (classError) {
        console.error('Error loading classes:', classError);
      } else {
        setClasses(classData || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [ownerData]);


  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  // อัปโหลดรูปภาพ
  const uploadImage = async (file) => {
    if (!file) return null;

    try {
      setUploading(true);

      if (file.size > 5 * 1024 * 1024) {
        alert('ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5MB');
        return null;
      }

      if (!file.type.startsWith('image/')) {
        alert('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
        return null;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `classes/${Date.now()}/${fileName}`;

      const { error } = await supabase.storage
        .from('fitness-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('fitness-images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Error:', error);
      alert('เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ');
      return null;
    } finally {
      setUploading(false);
    }
  };

  // บันทึกข้อมูลคลาส
  const handleSave = async (e) => {
    e.preventDefault();

    if (!formData.class_name || !formData.description) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    try {
      // ดึงข้อมูลฟิตเนส - ใช้ fit_user
      const { data: fitnessData, error: fitnessError } = await supabase
        .from('tbl_fitness')
        .select('fit_id')
        .eq('fit_user', ownerData.owner_name)
        .single();

      if (fitnessError || !fitnessData) {
        alert('กรุณาสร้างข้อมูลฟิตเนสก่อน');
        return;
      }

      const itemData = {
        fit_id: fitnessData.fit_id,
        class_name: formData.class_name,
        description: formData.description,
        image_url: formData.image_url,
        class_time: formData.class_time,
        duration: parseInt(formData.duration),
        instructor: formData.instructor,
        max_participants: parseInt(formData.max_participants),
        price: parseFloat(formData.price),
        status: formData.status
      };

      let result;
      if (editing) {
        result = await supabase
          .from('tbl_classes')
          .update(itemData)
          .eq('class_id', editing.class_id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('tbl_classes')
          .insert(itemData)
          .select()
          .single();
      }

      if (result.error) {
        console.error('Error saving class:', result.error);
        alert('เกิดข้อผิดพลาดในการบันทึก: ' + result.error.message);
        return;
      }

      // อัปเดต state
      if (editing) {
        setClasses(prev => 
          prev.map(item => 
            item.class_id === editing.class_id ? result.data : item
          )
        );
      } else {
        setClasses(prev => [result.data, ...prev]);
      }

      resetForm();
      alert('บันทึกคลาสสำเร็จ!');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error:', error);
      alert('เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  // ลบคลาส
  const deleteClass = async (item) => {
    if (!window.confirm('คุณต้องการลบคลาสนี้หรือไม่?')) return;

    try {
      const { error } = await supabase
        .from('tbl_classes')
        .delete()
        .eq('class_id', item.class_id);

      if (error) {
        console.error('Error deleting class:', error);
        alert('เกิดข้อผิดพลาดในการลบ');
        return;
      }

      setClasses(prev => prev.filter(cls => cls.class_id !== item.class_id));
      alert('ลบคลาสสำเร็จ!');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error:', error);
      alert('เกิดข้อผิดพลาดในการลบ');
    }
  };

  // แก้ไขคลาส
  const editClass = (item) => {
    setEditing(item);
    setFormData({
      class_name: item.class_name || '',
      description: item.description || '',
      image_url: item.image_url || '',
      class_time: item.class_time || '',
      duration: item.duration || 60,
      instructor: item.instructor || '',
      max_participants: item.max_participants || 10,
      price: item.price || 0,
      status: item.status || 'active'
    });
    setShowCreateForm(true);
  };

  // รีเซ็ตฟอร์ม
  const resetForm = () => {
    setFormData({
      class_name: '',
      description: '',
      image_url: '',
      class_time: '',
      duration: 60,
      instructor: '',
      max_participants: 10,
      price: 0,
      status: 'active'
    });
    setEditing(null);
    setShowCreateForm(false);
  };

  if (loading) {
    return (
      <div className="class-management">
        <div className="loading">กำลังโหลดข้อมูลคลาส...</div>
      </div>
    );
  }

  return (
    <div className="class-management">
      <div className="section-header">
        <h2>🎯 จัดการคลาส</h2>
        <button
          className="btn-primary"
          onClick={() => setShowCreateForm(true)}
        >
          + เพิ่มคลาสใหม่
        </button>
      </div>

      {classes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏋️‍♂️</div>
          <h3>ยังไม่มีคลาส</h3>
          <p>เริ่มต้นสร้างคลาสสำหรับฟิตเนสของคุณ</p>
          <button
            className="btn-primary"
            onClick={() => setShowCreateForm(true)}
          >
            + สร้างคลาสแรก
          </button>
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
                <h3>{classItem.class_name}</h3>
                <p className="description">{classItem.description}</p>
                
                <div className="class-details">
                  <div className="detail-item">
                    <span className="icon">⏰</span>
                    <span className="label">เวลา:</span>
                    <span className="value">{classItem.class_time || 'ไม่ระบุ'}</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="icon">⏱️</span>
                    <span className="label">ระยะเวลา:</span>
                    <span className="value">{classItem.duration} นาที</span>
                  </div>
                  
                  <div className="detail-item">
                    <span className="icon">👨‍🏫</span>
                    <span className="label">ผู้สอน:</span>
                    <span className="value">{classItem.instructor || 'ไม่ระบุ'}</span>
                  </div>
                  
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
                  
                  <div className="detail-item">
                    <span className="icon">📊</span>
                    <span className="label">สถานะ:</span>
                    <span className={`value status ${classItem.status}`}>
                      {classItem.status === 'active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                    </span>
                  </div>
                </div>
                
                <div className="class-actions">
                  <button
                    className="btn-edit"
                    onClick={() => editClass(classItem)}
                  >
                    ✏️ แก้ไข
                  </button>
                  <button
                    className="btn-delete"
                    onClick={() => deleteClass(classItem)}
                  >
                    🗑️ ลบ
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ฟอร์มสร้าง/แก้ไขคลาส */}
      {showCreateForm && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? '✏️ แก้ไขคลาส' : '➕ เพิ่มคลาสใหม่'}</h3>
              <button className="btn-close" onClick={resetForm}>×</button>
            </div>
            
            <form onSubmit={handleSave} className="form-content">
              <div className="form-group">
                <label>ชื่อคลาส *</label>
                <input
                  type="text"
                  value={formData.class_name}
                  onChange={(e) => setFormData({...formData, class_name: e.target.value})}
                  placeholder="เช่น โยคะเริ่มต้น, การ์ดิโอแดนซ์, ยกน้ำหนัก"
                  required
                />
              </div>

              <div className="form-group">
                <label>คำอธิบาย *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="อธิบายรายละเอียดของคลาส ระดับความยาก และข้อแนะนำ"
                  rows="3"
                  required
                />
              </div>

              <div className="form-group">
                <label>รูปภาพคลาส</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const imageUrl = await uploadImage(file);
                      if (imageUrl) {
                        setFormData({...formData, image_url: imageUrl});
                      }
                    }
                  }}
                  disabled={uploading}
                />
                {uploading && <p className="upload-status">กำลังอัปโหลด...</p>}
                {formData.image_url && (
                  <div className="image-preview">
                    <img 
                      src={formData.image_url} 
                      alt="Preview" 
                    />
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>เวลาเริ่ม</label>
                  <input
                    type="time"
                    value={formData.class_time}
                    onChange={(e) => setFormData({...formData, class_time: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>ระยะเวลา (นาที)</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: e.target.value})}
                    min="15"
                    max="180"
                    step="15"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>ชื่อผู้สอน</label>
                <input
                  type="text"
                  value={formData.instructor}
                  onChange={(e) => setFormData({...formData, instructor: e.target.value})}
                  placeholder="ชื่อผู้สอนหรือเทรนเนอร์"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>จำนวนผู้เข้าร่วมสูงสุด</label>
                  <input
                    type="number"
                    value={formData.max_participants}
                    onChange={(e) => setFormData({...formData, max_participants: e.target.value})}
                    min="1"
                    max="100"
                  />
                </div>

                <div className="form-group">
                  <label>ราคา (บาท)</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    min="0"
                    step="10"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>สถานะ</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                >
                  <option value="active">เปิดใช้งาน</option>
                  <option value="inactive">ปิดใช้งาน</option>
                </select>
              </div>

              <div className="form-actions">
                <button 
                  type="submit" 
                  className="btn-save"
                  disabled={!formData.class_name || !formData.description || uploading}
                >
                  {editing ? '💾 บันทึกการแก้ไข' : '➕ สร้างคลาส'}
                </button>
                <button type="button" onClick={resetForm} className="btn-cancel">
                  ยกเลิก
                </button>
                
              </div>
            </form>
          </div>
        </div>
      )}

      
    </div>
  );
};

export default ClassManagement;