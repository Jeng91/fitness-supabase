// ตัวอย่างฟังก์ชันสำหรับพาร์ทเนอร์ส่งคำขอสร้างฟิตเนส
// ไฟล์นี้สามารถใช้ใน PartnerDashboard หรือ component ที่เกี่ยวข้อง

import supabase from '../supabaseClient';

// ฟังก์ชันส่งคำขอสร้างฟิตเนส
export const submitFitnessRequest = async (fitnessData, ownerId) => {
  try {
    const { data, error } = await supabase
      .from('tbl_fitness_requests')
      .insert([
        {
          fit_name: fitnessData.name,
          fit_type: fitnessData.type,
          fit_description: fitnessData.description,
          fit_price: parseFloat(fitnessData.price),
          fit_duration: parseInt(fitnessData.duration),
          fit_location: fitnessData.location,
          fit_contact: fitnessData.contact,
          fit_image: fitnessData.imageUrl || null,
          owner_id: ownerId,
          status: 'pending'
        }
      ])
      .select();

    if (error) throw error;

    return {
      success: true,
      message: '✅ ส่งคำขอสร้างฟิตเนสสำเร็จ! รอการอนุมัติจากแอดมิน',
      data: data[0]
    };

  } catch (error) {
    console.error('Error submitting fitness request:', error);
    return {
      success: false,
      message: `❌ เกิดข้อผิดพลาด: ${error.message}`,
      error
    };
  }
};

// ฟังก์ชันดูสถานะคำขอของพาร์ทเนอร์
export const getPartnerFitnessRequests = async (ownerId) => {
  try {
    const { data, error } = await supabase
      .from('tbl_fitness_requests')
      .select(`
        *,
        tbl_admin!rejected_by(admin_name),
        tbl_admin!approved_by(admin_name)
      `)
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data: data || []
    };

  } catch (error) {
    console.error('Error fetching fitness requests:', error);
    return {
      success: false,
      message: `❌ เกิดข้อผิดพลาด: ${error.message}`,
      error
    };
  }
};

// ฟังก์ชันแก้ไขคำขอ (สำหรับคำขอที่ยังรออนุมัติ)
export const updateFitnessRequest = async (requestId, updatedData) => {
  try {
    const { data, error } = await supabase
      .from('tbl_fitness_requests')
      .update({
        fit_name: updatedData.name,
        fit_type: updatedData.type,
        fit_description: updatedData.description,
        fit_price: parseFloat(updatedData.price),
        fit_duration: parseInt(updatedData.duration),
        fit_location: updatedData.location,
        fit_contact: updatedData.contact,
        fit_image: updatedData.imageUrl || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .eq('status', 'pending') // สามารถแก้ไขได้เฉพาะที่ยังรอการอนุมัติ
      .select();

    if (error) throw error;

    return {
      success: true,
      message: '✅ แก้ไขคำขอสำเร็จ!',
      data: data[0]
    };

  } catch (error) {
    console.error('Error updating fitness request:', error);
    return {
      success: false,
      message: `❌ เกิดข้อผิดพลาด: ${error.message}`,
      error
    };
  }
};

// ฟังก์ชันลบคำขอ (สำหรับคำขอที่ยังรออนุมัติ)
export const deleteFitnessRequest = async (requestId) => {
  try {
    const { error } = await supabase
      .from('tbl_fitness_requests')
      .delete()
      .eq('id', requestId)
      .eq('status', 'pending'); // สามารถลบได้เฉพาะที่ยังรอการอนุมัติ

    if (error) throw error;

    return {
      success: true,
      message: '✅ ลบคำขอสำเร็จ!'
    };

  } catch (error) {
    console.error('Error deleting fitness request:', error);
    return {
      success: false,
      message: `❌ เกิดข้อผิดพลาด: ${error.message}`,
      error
    };
  }
};

// ตัวอย่างการใช้งานใน React Component
/*
import React, { useState, useEffect } from 'react';
import { submitFitnessRequest, getPartnerFitnessRequests } from './fitnessRequestAPI';

const PartnerFitnessManagement = ({ partnerId }) => {
  const [requests, setRequests] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    type: '',
    description: '',
    price: '',
    duration: '',
    location: '',
    contact: '',
    imageUrl: ''
  });

  useEffect(() => {
    loadRequests();
  }, [partnerId]);

  const loadRequests = async () => {
    const result = await getPartnerFitnessRequests(partnerId);
    if (result.success) {
      setRequests(result.data);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await submitFitnessRequest(formData, partnerId);
    
    if (result.success) {
      alert(result.message);
      setFormData({
        name: '',
        type: '',
        description: '',
        price: '',
        duration: '',
        location: '',
        contact: '',
        imageUrl: ''
      });
      loadRequests(); // โหลดข้อมูลใหม่
    } else {
      alert(result.message);
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return '⏳ รอการอนุมัติ';
      case 'approved': return '✅ อนุมัติแล้ว';
      case 'rejected': return '❌ ปฏิเสธ';
      default: return status;
    }
  };

  return (
    <div>
      <h2>จัดการฟิตเนส</h2>
      
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="ชื่อฟิตเนส"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          required
        />
        <select
          value={formData.type}
          onChange={(e) => setFormData({...formData, type: e.target.value})}
          required
        >
          <option value="">เลือกประเภท</option>
          <option value="Gym">Gym</option>
          <option value="Yoga">Yoga</option>
          <option value="CrossFit">CrossFit</option>
          <option value="Boxing">Boxing</option>
          <option value="Swimming">Swimming</option>
        </select>
        <textarea
          placeholder="คำอธิบาย"
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          required
        />
        <input
          type="number"
          placeholder="ราคา"
          value={formData.price}
          onChange={(e) => setFormData({...formData, price: e.target.value})}
          required
        />
        <input
          type="number"
          placeholder="ระยะเวลา (นาที)"
          value={formData.duration}
          onChange={(e) => setFormData({...formData, duration: e.target.value})}
          required
        />
        <input
          type="text"
          placeholder="สถานที่"
          value={formData.location}
          onChange={(e) => setFormData({...formData, location: e.target.value})}
          required
        />
        <input
          type="text"
          placeholder="ข้อมูลติดต่อ"
          value={formData.contact}
          onChange={(e) => setFormData({...formData, contact: e.target.value})}
          required
        />
        <input
          type="url"
          placeholder="URL รูปภาพ (ไม่จำเป็น)"
          value={formData.imageUrl}
          onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
        />
        <button type="submit">ส่งคำขอสร้างฟิตเนส</button>
      </form>

      <h3>คำขอของฉัน</h3>
      <table>
        <thead>
          <tr>
            <th>ชื่อฟิตเนส</th>
            <th>สถานะ</th>
            <th>วันที่ส่ง</th>
            <th>หมายเหตุ</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((request) => (
            <tr key={request.id}>
              <td>{request.fit_name}</td>
              <td>{getStatusText(request.status)}</td>
              <td>{new Date(request.created_at).toLocaleDateString('th-TH')}</td>
              <td>{request.rejection_reason || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PartnerFitnessManagement;
*/