import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../supabaseClient';

const MemberManagement = ({ ownerData, onUpdate }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const loadMembers = useCallback(async () => {
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
        setMembers([]);
        return;
      }

      // Get members who have bookings at this fitness
      const { data: bookingData, error: bookingError } = await supabase
        .from('tbl_booking')
        .select(`
          *,
          tbl_user:user_id (
            user_id,
            user_email,
            user_name,
            user_phone,
            user_age,
            user_gender
          )
        `)
        .eq('fit_id', fitnessData.fit_id)
        .order('booking_date', { ascending: false });

      if (bookingError) {
        console.error('Error loading members:', bookingError);
        return;
      }

      // Process and group members
      const memberMap = new Map();
      bookingData?.forEach(booking => {
        const user = booking.tbl_user;
        if (user && !memberMap.has(user.user_id)) {
          memberMap.set(user.user_id, {
            ...user,
            totalBookings: 1,
            lastBooking: booking.booking_date,
            totalSpent: booking.booking_price || 0,
            status: booking.booking_status || 'active'
          });
        } else if (user && memberMap.has(user.user_id)) {
          const existing = memberMap.get(user.user_id);
          existing.totalBookings += 1;
          existing.totalSpent += booking.booking_price || 0;
          if (new Date(booking.booking_date) > new Date(existing.lastBooking)) {
            existing.lastBooking = booking.booking_date;
          }
        }
      });

      setMembers(Array.from(memberMap.values()));
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [ownerData?.owner_id]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.user_email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || member.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getMemberStats = () => {
    return {
      total: members.length,
      active: members.filter(m => m.status === 'active').length,
      inactive: members.filter(m => m.status === 'inactive').length,
      totalRevenue: members.reduce((sum, m) => sum + (m.totalSpent || 0), 0)
    };
  };

  const stats = getMemberStats();

  if (loading) {
    return <div className="loading">กำลังโหลดข้อมูลสมาชิก...</div>;
  }

  return (
    <div className="member-management">
      <div className="section-header">
        <h2>👥 จัดการสมาชิก</h2>
        <div className="member-stats">
          <span className="stat-item">สมาชิกทั้งหมด: {stats.total}</span>
          <br /><span className="stat-item active">ใช้งาน: {stats.active}</span>
          <br /><span className="stat-item inactive">ไม่ใช้งาน: {stats.inactive}</span>
        </div>
      </div>

      <div className="member-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="ค้นหาสมาชิก (ชื่อ, อีเมล)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">ทั้งหมด</option>
          <option value="active">ใช้งาน</option>
          <option value="inactive">ไม่ใช้งาน</option>
        </select>
      </div>

      {filteredMembers.length === 0 ? (
        <div className="empty-state">
          <h3>ไม่พบข้อมูลสมาชิก</h3>
          <p>ยังไม่มีสมาชิกในระบบหรือไม่ตรงกับเงื่อนไขการค้นหา</p>
        </div>
      ) : (
        <div className="members-grid">
          {filteredMembers.map(member => (
            <div 
              key={member.user_id} 
              className="member-card"
              onClick={() => setSelectedMember(member)}
            >
              <div className="member-header">
                <h3>{member.user_name || 'ไม่ระบุชื่อ'}</h3>
                <span className={`status ${member.status}`}>
                  {member.status === 'active' ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                </span>
              </div>
              <div className="member-info">
                <p>📧 {member.user_email}</p>
                <p>📱 {member.user_phone || 'ไม่ระบุ'}</p>
                <p>🎂 อายุ: {member.user_age || 'ไม่ระบุ'} ปี</p>
                <p>👤 เพศ: {member.user_gender === 'male' ? 'ชาย' : member.user_gender === 'female' ? 'หญิง' : 'ไม่ระบุ'}</p>
              </div>
              <div className="member-stats">
                <div className="stat">
                  <span className="label">จองทั้งหมด:</span>
                  <span className="value">{member.totalBookings} ครั้ง</span>
                </div>
                <div className="stat">
                  <span className="label">ยอดใช้จ่าย:</span>
                  <span className="value">฿{member.totalSpent?.toLocaleString()}</span>
                </div>
                <div className="stat">
                  <span className="label">ครั้งล่าสุด:</span>
                  <span className="value">{new Date(member.lastBooking).toLocaleDateString('th-TH')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedMember && (
        <div className="modal-overlay" onClick={() => setSelectedMember(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>รายละเอียดสมาชิก: {selectedMember.user_name}</h3>
              <button
                className="btn-close"
                onClick={() => setSelectedMember(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="member-details">
                <div className="detail-group">
                  <h4>ข้อมูลส่วนตัว</h4>
                  <p><strong>ชื่อ:</strong> {selectedMember.user_name || 'ไม่ระบุ'}</p>
                  <p><strong>อีเมล:</strong> {selectedMember.user_email}</p>
                  <p><strong>โทรศัพท์:</strong> {selectedMember.user_phone || 'ไม่ระบุ'}</p>
                  <p><strong>อายุ:</strong> {selectedMember.user_age || 'ไม่ระบุ'} ปี</p>
                  <p><strong>เพศ:</strong> {selectedMember.user_gender === 'male' ? 'ชาย' : selectedMember.user_gender === 'female' ? 'หญิง' : 'ไม่ระบุ'}</p>
                </div>
                <div className="detail-group">
                  <h4>สถิติการใช้งาน</h4>
                  <p><strong>จำนวนการจอง:</strong> {selectedMember.totalBookings} ครั้ง</p>
                  <p><strong>ยอดใช้จ่ายรวม:</strong> ฿{selectedMember.totalSpent?.toLocaleString()}</p>
                  <p><strong>การจองครั้งล่าสุด:</strong> {new Date(selectedMember.lastBooking).toLocaleDateString('th-TH')}</p>
                  <p><strong>สถานะ:</strong> 
                    <span className={`status ${selectedMember.status}`}>
                      {selectedMember.status === 'active' ? 'ใช้งาน' : 'ไม่ใช้งาน'}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberManagement;