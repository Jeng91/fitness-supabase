import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../supabaseClient';

const PricingManagement = ({ ownerData, onUpdate }) => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [formData, setFormData] = useState({
    package_name: '',
    package_type: 'daily',
    package_price: '',
    package_duration: 1,
    package_description: '',
    package_features: ''
  });

  const loadPackages = useCallback(async () => {
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
        setPackages([]);
        return;
      }

      // Get pricing packages for this fitness
      const { data: packageData, error: packageError } = await supabase
        .from('tbl_pricing_packages')
        .select('*')
        .eq('fit_id', fitnessData.fit_id)
        .order('package_price', { ascending: true });

      if (packageError) {
        console.error('Error loading packages:', packageError);
        return;
      }

      setPackages(packageData || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [ownerData?.owner_id]);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  const savePackage = async () => {
    if (!formData.package_name || !formData.package_price) {
      alert('กรุณากรอกชื่อแพ็กเกจและราคา');
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

      const packageData = {
        fit_id: fitnessData.fit_id,
        package_name: formData.package_name,
        package_type: formData.package_type,
        package_price: parseInt(formData.package_price),
        package_duration: parseInt(formData.package_duration),
        package_description: formData.package_description,
        package_features: formData.package_features
      };

      let result;
      if (editing) {
        // Update existing package
        result = await supabase
          .from('tbl_pricing_packages')
          .update(packageData)
          .eq('package_id', editing.package_id)
          .select()
          .single();
      } else {
        // Create new package
        result = await supabase
          .from('tbl_pricing_packages')
          .insert(packageData)
          .select()
          .single();
      }

      if (result.error) {
        console.error('Error saving package:', result.error);
        alert('เกิดข้อผิดพลาดในการบันทึก');
        return;
      }

      // Update local state
      if (editing) {
        setPackages(prev => 
          prev.map(pkg => 
            pkg.package_id === editing.package_id ? result.data : pkg
          )
        );
      } else {
        setPackages(prev => [...prev, result.data]);
      }

      // Reset form
      setFormData({
        package_name: '',
        package_type: 'daily',
        package_price: '',
        package_duration: 1,
        package_description: '',
        package_features: ''
      });
      setEditing(null);
      setShowCreateForm(false);

      alert('บันทึกแพ็กเกจสำเร็จ!');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error:', error);
      alert('เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  const deletePackage = async (packageId) => {
    if (!window.confirm('คุณต้องการลบแพ็กเกจนี้หรือไม่?')) return;

    try {
      const { error } = await supabase
        .from('tbl_pricing_packages')
        .delete()
        .eq('package_id', packageId);

      if (error) {
        console.error('Error deleting package:', error);
        alert('เกิดข้อผิดพลาดในการลบ');
        return;
      }

      setPackages(prev => prev.filter(pkg => pkg.package_id !== packageId));
      alert('ลบแพ็กเกจสำเร็จ!');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error:', error);
      alert('เกิดข้อผิดพลาดในการลบ');
    }
  };

  const startEdit = (pkg) => {
    setEditing(pkg);
    setFormData({
      package_name: pkg.package_name,
      package_type: pkg.package_type,
      package_price: pkg.package_price.toString(),
      package_duration: pkg.package_duration,
      package_description: pkg.package_description || '',
      package_features: pkg.package_features || ''
    });
    setShowCreateForm(true);
  };

  const cancelEdit = () => {
    setEditing(null);
    setShowCreateForm(false);
    setFormData({
      package_name: '',
      package_type: 'daily',
      package_price: '',
      package_duration: 1,
      package_description: '',
      package_features: ''
    });
  };

  const getPackageTypeText = (type) => {
    switch (type) {
      case 'daily': return 'รายวัน';
      case 'weekly': return 'รายสัปดาห์';
      case 'monthly': return 'รายเดือน';
      case 'yearly': return 'รายปี';
      case 'class': return 'คลาส';
      default: return type;
    }
  };

  const getPackageTypeColor = (type) => {
    switch (type) {
      case 'daily': return 'info';
      case 'weekly': return 'warning';
      case 'monthly': return 'success';
      case 'yearly': return 'primary';
      case 'class': return 'secondary';
      default: return 'info';
    }
  };

  if (loading) {
    return <div className="loading">กำลังโหลดข้อมูลแพ็กเกจ...</div>;
  }

  return (
    <div className="pricing-management">
      <div className="section-header">
        <h2>💰 จัดการโปรโมชั่นและแพ็กเกจ</h2>
        <button
          className="btn-primary"
          onClick={() => setShowCreateForm(true)}
        >
          + เพิ่มแพ็กเกจใหม่
        </button>
      </div>

      {packages.length === 0 ? (
        <div className="empty-state">
          <h3>ยังไม่มีแพ็กเกจ</h3>
          <p>เริ่มต้นสร้างแพ็กเกจราคาสำหรับฟิตเนสของคุณ</p>
          <button
            className="btn-primary"
            onClick={() => setShowCreateForm(true)}
          >
            + สร้างแพ็กเกจแรก
          </button>
        </div>
      ) : (
        <div className="packages-grid">
          {packages.map(pkg => (
            <div key={pkg.package_id} className="package-card">
              <div className="package-header">
                <h3>{pkg.package_name}</h3>
                <span className={`package-type ${getPackageTypeColor(pkg.package_type)}`}>
                  {getPackageTypeText(pkg.package_type)}
                </span>
              </div>
              <div className="package-price">
                <span className="price">฿{pkg.package_price.toLocaleString()}</span>
                <span className="duration">
                  {pkg.package_duration} {pkg.package_type === 'daily' ? 'วัน' : 
                                        pkg.package_type === 'weekly' ? 'สัปดาห์' :
                                        pkg.package_type === 'monthly' ? 'เดือน' :
                                        pkg.package_type === 'yearly' ? 'ปี' : 'ครั้ง'}
                </span>
              </div>
              {pkg.package_description && (
                <div className="package-description">
                  <p>{pkg.package_description}</p>
                </div>
              )}
              {pkg.package_features && (
                <div className="package-features">
                  <h4>สิทธิประโยชน์:</h4>
                  <ul>
                    {pkg.package_features.split('\n').map((feature, index) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="package-actions">
                <button
                  className="btn-secondary"
                  onClick={() => startEdit(pkg)}
                >
                  แก้ไข
                </button>
                <button
                  className="btn-danger"
                  onClick={() => deletePackage(pkg.package_id)}
                >
                  ลบ
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateForm && (
        <div className="modal-overlay" onClick={cancelEdit}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'แก้ไขแพ็กเกจ' : 'เพิ่มแพ็กเกจใหม่'}</h3>
              <button className="btn-close" onClick={cancelEdit}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>ชื่อแพ็กเกจ *</label>
                  <input
                    type="text"
                    value={formData.package_name}
                    onChange={(e) => setFormData(prev => ({...prev, package_name: e.target.value}))}
                    placeholder="เช่น แพ็กเกจรายเดือน"
                  />
                </div>
                <div className="form-group">
                  <label>ประเภท *</label>
                  <select
                    value={formData.package_type}
                    onChange={(e) => setFormData(prev => ({...prev, package_type: e.target.value}))}
                  >
                    <option value="daily">รายวัน</option>
                    <option value="weekly">รายสัปดาห์</option>
                    <option value="monthly">รายเดือน</option>
                    <option value="yearly">รายปี</option>
                    <option value="class">คลาส</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>ราคา (บาท) *</label>
                  <input
                    type="number"
                    value={formData.package_price}
                    onChange={(e) => setFormData(prev => ({...prev, package_price: e.target.value}))}
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div className="form-group">
                  <label>ระยะเวลา</label>
                  <input
                    type="number"
                    value={formData.package_duration}
                    onChange={(e) => setFormData(prev => ({...prev, package_duration: parseInt(e.target.value)}))}
                    min="1"
                  />
                </div>
                <div className="form-group full-width">
                  <label>รายละเอียด</label>
                  <textarea
                    value={formData.package_description}
                    onChange={(e) => setFormData(prev => ({...prev, package_description: e.target.value}))}
                    placeholder="รายละเอียดของแพ็กเกจ"
                    rows="3"
                  />
                </div>
                <div className="form-group full-width">
                  <label>สิทธิประโยชน์ (แยกบรรทัด)</label>
                  <textarea
                    value={formData.package_features}
                    onChange={(e) => setFormData(prev => ({...prev, package_features: e.target.value}))}
                    placeholder="เช่น:&#10;- ใช้อุปกรณ์ได้ไม่จำกัด&#10;- ฟรี Personal Training&#10;- เข้าคลาสได้ทุกคลาส"
                    rows="4"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={cancelEdit}>
                ยกเลิก
              </button>
              <button 
                className="btn-primary" 
                onClick={savePackage}
                disabled={!formData.package_name || !formData.package_price}
              >
                {editing ? 'บันทึกการเปลี่ยนแปลง' : 'สร้างแพ็กเกจ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingManagement;