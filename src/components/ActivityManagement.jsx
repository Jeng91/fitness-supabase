import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../supabaseClient';

const ActivityManagement = ({ ownerData, onUpdate }) => {
  const [activities, setActivities] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('activities');
  const [editing, setEditing] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    activity_date: '',
    activity_time: '',
    duration: 60,
    instructor: '',
    max_participants: 10,
    price: 0,
    status: 'active'
  });

  const loadActivities = useCallback(async () => {
    if (!ownerData?.owner_id) return;

    setLoading(true);
    try {
      // Get fitness data first
      const { data: fitnessData, error: fitnessError } = await supabase
        .from('tbl_fitness')
        .select('fit_id')
        .eq('owner_id', ownerData.owner_id)
        .single();

      if (fitnessError || !fitnessData) {
        console.log('ยังไม่มีข้อมูลฟิตเนส');
        setActivities([]);
        setClasses([]);
        return;
      }

      // Get activities
      const { data: activityData, error: activityError } = await supabase
        .from('tbl_activities')
        .select('*')
        .eq('fit_id', fitnessData.fit_id)
        .order('activity_date', { ascending: false });

      if (activityError) {
        console.error('Error loading activities:', activityError);
      } else {
        setActivities(activityData || []);
      }

      // Get classes
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
  }, [ownerData?.owner_id]);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

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
      const filePath = `activities/${Date.now()}/${fileName}`;

      const { error } = await supabase.storage
        .from('fitness-images')
        .upload(filePath, file, {
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
      setUploading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const imageUrl = await uploadImage(file);
    if (imageUrl) {
      setFormData(prev => ({ ...prev, image_url: imageUrl }));
    }
  };

  const saveItem = async () => {
    if (!formData.name || !formData.description) {
      alert('กรุณากรอกชื่อและรายละเอียด');
      return;
    }

    try {
      // Get fitness data
      const { data: fitnessData, error: fitnessError } = await supabase
        .from('tbl_fitness')
        .select('fit_id')
        .eq('owner_id', ownerData.owner_id)
        .single();

      if (fitnessError || !fitnessData) {
        alert('กรุณาสร้างข้อมูลฟิตเนสก่อน');
        return;
      }

      const tableName = activeTab === 'activities' ? 'tbl_activities' : 'tbl_classes';
      const itemData = {
        fit_id: fitnessData.fit_id,
        ...(activeTab === 'activities' ? {
          activity_name: formData.name,
          activity_description: formData.description,
          activity_image_url: formData.image_url,
          activity_date: formData.activity_date,
          activity_time: formData.activity_time,
          activity_status: formData.status
        } : {
          class_name: formData.name,
          class_description: formData.description,
          class_image_url: formData.image_url,
          duration: parseInt(formData.duration),
          instructor: formData.instructor,
          max_participants: parseInt(formData.max_participants),
          price: parseFloat(formData.price),
          status: formData.status
        })
      };

      let result;
      if (editing) {
        const idField = activeTab === 'activities' ? 'activity_id' : 'class_id';
        result = await supabase
          .from(tableName)
          .update(itemData)
          .eq(idField, editing[idField])
          .select()
          .single();
      } else {
        result = await supabase
          .from(tableName)
          .insert(itemData)
          .select()
          .single();
      }

      if (result.error) {
        console.error('Error saving item:', result.error);
        alert('เกิดข้อผิดพลาดในการบันทึก');
        return;
      }

      // Update local state
      if (activeTab === 'activities') {
        if (editing) {
          setActivities(prev => 
            prev.map(item => 
              item.activity_id === editing.activity_id ? result.data : item
            )
          );
        } else {
          setActivities(prev => [result.data, ...prev]);
        }
      } else {
        if (editing) {
          setClasses(prev => 
            prev.map(item => 
              item.class_id === editing.class_id ? result.data : item
            )
          );
        } else {
          setClasses(prev => [result.data, ...prev]);
        }
      }

      // Reset form
      resetForm();
      alert(`บันทึก${activeTab === 'activities' ? 'กิจกรรม' : 'คลาส'}สำเร็จ!`);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error:', error);
      alert('เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  const deleteItem = async (item) => {
    const itemType = activeTab === 'activities' ? 'กิจกรรม' : 'คลาส';
    if (!window.confirm(`คุณต้องการลบ${itemType}นี้หรือไม่?`)) return;

    try {
      const tableName = activeTab === 'activities' ? 'tbl_activities' : 'tbl_classes';
      const idField = activeTab === 'activities' ? 'activity_id' : 'class_id';
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq(idField, item[idField]);

      if (error) {
        console.error('Error deleting item:', error);
        alert('เกิดข้อผิดพลาดในการลบ');
        return;
      }

      // Update local state
      if (activeTab === 'activities') {
        setActivities(prev => prev.filter(a => a.activity_id !== item.activity_id));
      } else {
        setClasses(prev => prev.filter(c => c.class_id !== item.class_id));
      }

      alert(`ลบ${itemType}สำเร็จ!`);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error:', error);
      alert('เกิดข้อผิดพลาดในการลบ');
    }
  };

  const startEdit = (item) => {
    setEditing(item);
    if (activeTab === 'activities') {
      setFormData({
        name: item.activity_name || '',
        description: item.activity_description || '',
        image_url: item.activity_image_url || '',
        activity_date: item.activity_date || '',
        activity_time: item.activity_time || '',
        duration: 60,
        instructor: '',
        max_participants: 10,
        price: 0,
        status: item.activity_status || 'active'
      });
    } else {
      setFormData({
        name: item.class_name || '',
        description: item.class_description || '',
        image_url: item.class_image_url || '',
        activity_date: '',
        activity_time: '',
        duration: item.duration || 60,
        instructor: item.instructor || '',
        max_participants: item.max_participants || 10,
        price: item.price || 0,
        status: item.status || 'active'
      });
    }
    setShowCreateForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      image_url: '',
      activity_date: '',
      activity_time: '',
      duration: 60,
      instructor: '',
      max_participants: 10,
      price: 0,
      status: 'active'
    });
    setEditing(null);
    setShowCreateForm(false);
  };

  const currentItems = activeTab === 'activities' ? activities : classes;

  if (loading) {
    return <div className="loading">กำลังโหลดข้อมูล...</div>;
  }

  return (
    <div className="activity-management">
      <div className="section-header">
        <h2>🎯 จัดการกิจกรรมและคลาส</h2>
        <button
          className="btn-primary"
          onClick={() => setShowCreateForm(true)}
        >
          + เพิ่ม{activeTab === 'activities' ? 'กิจกรรม' : 'คลาส'}
        </button>
      </div>

      <div className="tab-buttons">
        <button
          className={`tab-btn ${activeTab === 'activities' ? 'active' : ''}`}
          onClick={() => setActiveTab('activities')}
        >
          🎪 กิจกรรม
        </button>
        <button
          className={`tab-btn ${activeTab === 'classes' ? 'active' : ''}`}
          onClick={() => setActiveTab('classes')}
        >
          🧘 คลาส
        </button>
      </div>

      {currentItems.length === 0 ? (
        <div className="empty-state">
          <h3>ยังไม่มี{activeTab === 'activities' ? 'กิจกรรม' : 'คลาส'}</h3>
          <p>เริ่มต้นสร้าง{activeTab === 'activities' ? 'กิจกรรม' : 'คลาส'}สำหรับฟิตเนสของคุณ</p>
          <button
            className="btn-primary"
            onClick={() => setShowCreateForm(true)}
          >
            + สร้าง{activeTab === 'activities' ? 'กิจกรรม' : 'คลาส'}แรก
          </button>
        </div>
      ) : (
        <div className="items-grid">
          {currentItems.map(item => (
            <div key={activeTab === 'activities' ? item.activity_id : item.class_id} className="item-card">
              {(item.activity_image_url || item.class_image_url) && (
                <img 
                  src={item.activity_image_url || item.class_image_url} 
                  alt={item.activity_name || item.class_name}
                  className="item-image"
                />
              )}
              <div className="item-content">
                <div className="item-header">
                  <h3>{item.activity_name || item.class_name}</h3>
                  <span className={`status ${item.activity_status || item.status}`}>
                    {(item.activity_status || item.status) === 'active' ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                  </span>
                </div>
                <p className="item-description">
                  {item.activity_description || item.class_description}
                </p>
                
                {activeTab === 'activities' ? (
                  <div className="activity-details">
                    {item.activity_date && (
                      <p>📅 วันที่: {new Date(item.activity_date).toLocaleDateString('th-TH')}</p>
                    )}
                    {item.activity_time && (
                      <p>⏰ เวลา: {item.activity_time}</p>
                    )}
                  </div>
                ) : (
                  <div className="class-details">
                    <p>⏱️ ระยะเวลา: {item.duration} นาที</p>
                    <p>👨‍🏫 ผู้สอน: {item.instructor || 'ไม่ระบุ'}</p>
                    <p>👥 จำนวนสูงสุด: {item.max_participants} คน</p>
                    <p>💰 ราคา: ฿{item.price?.toLocaleString()}</p>
                  </div>
                )}
                
                <div className="item-actions">
                  <button
                    className="btn-secondary"
                    onClick={() => startEdit(item)}
                  >
                    แก้ไข
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => deleteItem(item)}
                  >
                    ลบ
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateForm && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {editing ? 'แก้ไข' : 'เพิ่ม'}{activeTab === 'activities' ? 'กิจกรรม' : 'คลาส'}
              </h3>
              <button className="btn-close" onClick={resetForm}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>ชื่อ{activeTab === 'activities' ? 'กิจกรรม' : 'คลาส'} *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                    placeholder={`ชื่อ${activeTab === 'activities' ? 'กิจกรรม' : 'คลาส'}`}
                  />
                </div>
                
                <div className="form-group">
                  <label>สถานะ</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({...prev, status: e.target.value}))}
                  >
                    <option value="active">เปิดใช้งาน</option>
                    <option value="inactive">ปิดใช้งาน</option>
                  </select>
                </div>

                {activeTab === 'activities' && (
                  <>
                    <div className="form-group">
                      <label>วันที่จัดกิจกรรม</label>
                      <input
                        type="date"
                        value={formData.activity_date}
                        onChange={(e) => setFormData(prev => ({...prev, activity_date: e.target.value}))}
                      />
                    </div>
                    <div className="form-group">
                      <label>เวลา</label>
                      <input
                        type="time"
                        value={formData.activity_time}
                        onChange={(e) => setFormData(prev => ({...prev, activity_time: e.target.value}))}
                      />
                    </div>
                  </>
                )}

                {activeTab === 'classes' && (
                  <>
                    <div className="form-group">
                      <label>ระยะเวลา (นาที)</label>
                      <input
                        type="number"
                        value={formData.duration}
                        onChange={(e) => setFormData(prev => ({...prev, duration: parseInt(e.target.value)}))}
                        min="15"
                        max="180"
                      />
                    </div>
                    <div className="form-group">
                      <label>ผู้สอน</label>
                      <input
                        type="text"
                        value={formData.instructor}
                        onChange={(e) => setFormData(prev => ({...prev, instructor: e.target.value}))}
                        placeholder="ชื่อผู้สอน"
                      />
                    </div>
                    <div className="form-group">
                      <label>จำนวนผู้เข้าร่วมสูงสุด</label>
                      <input
                        type="number"
                        value={formData.max_participants}
                        onChange={(e) => setFormData(prev => ({...prev, max_participants: parseInt(e.target.value)}))}
                        min="1"
                        max="100"
                      />
                    </div>
                    <div className="form-group">
                      <label>ราคา (บาท)</label>
                      <input
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData(prev => ({...prev, price: parseFloat(e.target.value)}))}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </>
                )}

                <div className="form-group full-width">
                  <label>รายละเอียด *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                    placeholder={`รายละเอียดของ${activeTab === 'activities' ? 'กิจกรรม' : 'คลาส'}`}
                    rows="4"
                  />
                </div>

                <div className="form-group full-width">
                  <label>รูปภาพ</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                  {uploading && <p className="uploading">กำลังอัพโหลด...</p>}
                  {formData.image_url && (
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="image-preview"
                    />
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={resetForm}>
                ยกเลิก
              </button>
              <button 
                className="btn-primary" 
                onClick={saveItem}
                disabled={!formData.name || !formData.description}
              >
                {editing ? 'บันทึกการเปลี่ยนแปลง' : `สร้าง${activeTab === 'activities' ? 'กิจกรรม' : 'คลาส'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityManagement;