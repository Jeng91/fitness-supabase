import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../supabaseClient';
import imageCompression from 'browser-image-compression';
import './EquipmentManagement.css';

const EquipmentManagement = ({ ownerData, onUpdate }) => {
  const [equipmentData, setEquipmentData] = useState([]);
  const [editingEquipment, setEditingEquipment] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [equipmentLoading, setEquipmentLoading] = useState(false);
  const [savingEquipment, setSavingEquipment] = useState(false);
  const [fitnessId, setFitnessId] = useState(null);

  // ดึง fitness_id ของ user ที่ login
  useEffect(() => {
    const fetchFitnessId = async () => {
      const user = await supabase.auth.getUser();
      const { data } = await supabase
        .from('tbl_fitness')
        .select('fit_id')
        .eq('created_by', user.data.user.id)
        .single();
      if (data?.fit_id) setFitnessId(data.fit_id);
    };
    fetchFitnessId();
  }, []);

  const loadEquipmentData = useCallback(async () => {
    if (!fitnessId) return;
    setEquipmentLoading(true);
    try {
      const { data, error } = await supabase
        .from('tbl_equipment')
        .select('*')
        .eq('fitness_id', fitnessId)
        .order('em_id', { ascending: true });
      if (error) {
        console.error('Error loading equipment:', error);
        return;
      }
      setEquipmentData(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setEquipmentLoading(false);
    }
  }, [fitnessId]);

  useEffect(() => {
    loadEquipmentData();
  }, [loadEquipmentData]);

  const uploadEquipmentImage = async (file) => {
    if (!file) return null;
    try {
      setUploading(true);
      // ตั้งค่าการบีบอัด/resize
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1024,
        useWebWorker: true
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
      const filePath = `equipment/${Date.now()}/${fileName}`;
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
      setUploading(false);
    }
  };

  const saveEquipment = async (equipment) => {
    if (!equipment.em_name?.trim()) {
      alert('กรุณากรอกชื่ออุปกรณ์');
      return;
    }
    setSavingEquipment(true);
    try {
      const user = await supabase.auth.getUser();
      if (!fitnessId) {
        alert('กรุณาสร้างข้อมูลฟิตเนสก่อน');
        setSavingEquipment(false);
        return;
      }
      if (equipment.em_id) {
        // Update existing
        const { error } = await supabase
          .from('tbl_equipment')
          .update({
            em_name: equipment.em_name,
            em_image: equipment.em_image || '',
            fitness_id: fitnessId,
            updated_at: new Date().toISOString(),
          })
          .eq('em_id', equipment.em_id);
        if (error) {
          console.error('Error updating equipment:', error);
          alert('เกิดข้อผิดพลาดในการอัปเดทอุปกรณ์');
          return;
        }
        setEquipmentData(prev =>
          prev.map(item =>
            item.em_id === equipment.em_id ? equipment : item
          )
        );
      } else {
        // Create new
        const { data: newEquipment, error } = await supabase
          .from('tbl_equipment')
          .insert({
            em_name: equipment.em_name,
            em_image: equipment.em_image || '',
            fitness_id: fitnessId,
            created_by: user.data.user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (error) {
          console.error('Error creating equipment:', error);
          alert('เกิดข้อผิดพลาดในการเพิ่มอุปกรณ์');
          return;
        }
        setEquipmentData(prev => [...prev, newEquipment]);
      }
      setEditingEquipment(null);
      if (onUpdate) onUpdate(equipmentData);
    } catch (error) {
      console.error('Error:', error);
      alert('เกิดข้อผิดพลาดในการบันทึกอุปกรณ์');
    } finally {
      setSavingEquipment(false);
    }
  };

  const deleteEquipment = async (emId) => {
    if (!window.confirm('คุณต้องการลบอุปกรณ์นี้หรือไม่?')) return;
    try {
      const { error } = await supabase
        .from('tbl_equipment')
        .delete()
        .eq('em_id', emId);
      if (error) {
        console.error('Error deleting equipment:', error);
        alert('เกิดข้อผิดพลาดในการลบอุปกรณ์');
        return;
      }
      setEquipmentData(prev => prev.filter(item => item.em_id !== emId));
      if (onUpdate) onUpdate(equipmentData.filter(item => item.em_id !== emId));
    } catch (error) {
      console.error('Error:', error);
      alert('เกิดข้อผิดพลาดในการลบอุปกรณ์');
    }
  };

  const startEditEquipment = (equipment = null) => {
    setEditingEquipment(equipment || {
      em_name: '',
      em_image: '',
    });
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !editingEquipment) return;
    const imageUrl = await uploadEquipmentImage(file);
    if (imageUrl) {
      setEditingEquipment(prev => ({
        ...prev,
        em_image: imageUrl
      }));
    }
  };

  if (equipmentLoading) {
    return <div className="loading">กำลังโหลดข้อมูลอุปกรณ์...</div>;
  }

  return (
    <div className="equipment-management">
      <div className="section-header">
        <h2>🏃 จัดการอุปกรณ์ฟิตเนส</h2>
        <button
          className="btn-primary"
          onClick={() => startEditEquipment()}
        >
          + เพิ่มอุปกรณ์
        </button>
      </div>

      {equipmentData.length === 0 ? (
        <div className="empty-state">
          <p>ยังไม่มีอุปกรณ์ในระบบ</p>
          <button
            className="btn-primary"
            onClick={() => startEditEquipment()}
          >
            เพิ่มอุปกรณ์แรก
          </button>
        </div>
      ) : (
        <div className="equipment-grid">
          {equipmentData.map(equipment => (
            <div key={equipment.em_id} className="equipment-card">
              {equipment.em_image && (
                <img 
                  src={equipment.em_image} 
                  alt={equipment.em_name}
                  className="equipment-image"
                />
              )}
              <div className="equipment-info">
                <h3>{equipment.em_name}</h3>
                <div className="equipment-actions">
                  <button
                    className="btn-secondary"
                    onClick={() => startEditEquipment(equipment)}
                  >
                    แก้ไข
                  </button>
                  <button
                    className="btn-danger"
                    onClick={() => deleteEquipment(equipment.em_id)}
                  >
                    ลบ
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingEquipment && (
        <div className="modal-overlay" onClick={() => setEditingEquipment(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingEquipment.em_id ? 'แก้ไขอุปกรณ์' : 'เพิ่มอุปกรณ์'}</h3>
              <button
                className="btn-close"
                onClick={() => setEditingEquipment(null)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>ชื่ออุปกรณ์</label>
                <input
                  type="text"
                  value={editingEquipment.em_name || ''}
                  onChange={e => setEditingEquipment(prev => ({
                    ...prev,
                    em_name: e.target.value
                  }))}
                  placeholder="กรอกชื่ออุปกรณ์"
                />
              </div>

              <div className="form-group">
                <label>รูปภาพอุปกรณ์</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  disabled={uploading}
                />
                {uploading && <p className="uploading">กำลังอัพโหลด...</p>}
                {editingEquipment.em_image && (
                  <img
                    src={editingEquipment.em_image}
                    alt="Preview"
                    className="image-preview"
                  />
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setEditingEquipment(null)}
              >
                ยกเลิก
              </button>
              <button
                className="btn-primary"
                onClick={() => saveEquipment(editingEquipment)}
                disabled={savingEquipment || !editingEquipment.em_name?.trim()}
              >
                {savingEquipment ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentManagement;