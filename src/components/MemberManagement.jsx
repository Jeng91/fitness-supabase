import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../supabaseClient';
import { getFitnessMemberships, getFitnessClassEnrollments, updateMembershipStatus } from '../utils/membershipAPI';
import './MemberManagement.css';

const MemberManagement = ({ ownerData, onUpdate }) => {
  // States เดิม
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // States ใหม่สำหรับสมาชิกและคลาส
  const [activeTab, setActiveTab] = useState('bookings'); // 'bookings', 'memberships', 'classes'
  const [memberships, setMemberships] = useState([]);
  const [classEnrollments, setClassEnrollments] = useState([]);
  const [fitnessId, setFitnessId] = useState(null);

  // ฟังก์ชันดึง fitness_id
  const getFitnessId = useCallback(async () => {
    if (!ownerData?.owner_name) return null;

    try {
      const { data, error } = await supabase
        .from('tbl_fitness')
        .select('fit_id')
        .eq('fit_user', ownerData.owner_name)
        .single();

      if (error || !data) {
        console.log('ยังไม่มีข้อมูลฟิตเนส');
        return null;
      }

      return data.fit_id;
    } catch (error) {
      console.error('Error getting fitness ID:', error);
      return null;
    }
  }, [ownerData]);

  // ฟังก์ชันดึงข้อมูลสมาชิก
  const loadMemberships = useCallback(async () => {
    if (!fitnessId) return;

    setLoading(true);
    try {
      const result = await getFitnessMemberships(fitnessId);
      if (result.success) {
        setMemberships(result.data);
      } else {
        console.error('Error loading memberships:', result.error);
        setMemberships([]);
      }
    } catch (error) {
      console.error('Error in loadMemberships:', error);
      setMemberships([]);
    } finally {
      setLoading(false);
    }
  }, [fitnessId]);

  // ฟังก์ชันดึงข้อมูลการสมัครคลาส
  const loadClassEnrollments = useCallback(async () => {
    if (!fitnessId) return;

    setLoading(true);
    try {
      const result = await getFitnessClassEnrollments(fitnessId);
      if (result.success) {
        setClassEnrollments(result.data);
      } else {
        console.error('Error loading class enrollments:', result.error);
        setClassEnrollments([]);
      }
    } catch (error) {
      console.error('Error in loadClassEnrollments:', error);
      setClassEnrollments([]);
    } finally {
      setLoading(false);
    }
  }, [fitnessId]);

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

  // อัปเดตสถานะสมาชิก
  const handleUpdateMembershipStatus = async (membershipId, newStatus) => {
    try {
      const result = await updateMembershipStatus(membershipId, newStatus);
      if (result.success) {
        alert(`อัปเดตสถานะสมาชิกเป็น ${newStatus} เรียบร้อย`);
        loadMemberships(); // โหลดข้อมูลใหม่
      } else {
        alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ: ' + result.error);
      }
    } catch (error) {
      console.error('Error updating membership status:', error);
      alert('เกิดข้อผิดพลาด: ' + error.message);
    }
  };

  // Filter ข้อมูลตามการค้นหา
  const getFilteredMemberships = () => {
    return memberships.filter(membership => {
      const searchMatch = 
        membership.profiles?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        membership.profiles?.useremail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        membership.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const statusMatch = filterStatus === 'all' || membership.status === filterStatus;
      
      return searchMatch && statusMatch;
    });
  };

  const getFilteredClassEnrollments = () => {
    return classEnrollments.filter(enrollment => {
      const searchMatch = 
        enrollment.profiles?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enrollment.profiles?.useremail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enrollment.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        enrollment.tbl_classes?.class_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const statusMatch = filterStatus === 'all' || enrollment.status === filterStatus;
      
      return searchMatch && statusMatch;
    });
  };

  // Format functions
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('th-TH');
  };

  const formatMembershipType = (type) => {
    return type === 'monthly' ? 'รายเดือน' : 'รายปี';
  };

  const formatStatus = (status) => {
    const statusMap = {
      'active': 'ใช้งาน',
      'expired': 'หมดอายุ',
      'cancelled': 'ยกเลิก',
      'enrolled': 'สมัครแล้ว',
      'completed': 'เสร็จสิ้น'
    };
    return statusMap[status] || status;
  };

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      const fitId = await getFitnessId();
      if (fitId) {
        setFitnessId(fitId);
      }
    };
    
    initializeData();
  }, [getFitnessId]);

  useEffect(() => {
    if (fitnessId) {
      if (activeTab === 'memberships') {
        loadMemberships();
      } else if (activeTab === 'classes') {
        loadClassEnrollments();
      }
    }
  }, [fitnessId, activeTab, loadMemberships, loadClassEnrollments]);

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
          <span className="stat-item">การจองทั้งหมด: {stats.total}</span>
          <br /><span className="stat-item active">ใช้งาน: {stats.active}</span>
          <br /><span className="stat-item inactive">ไม่ใช้งาน: {stats.inactive}</span>
          <br /><span className="stat-item">สมาชิก: {memberships.filter(m => m.status === 'active').length}</span>
          <br /><span className="stat-item">การสมัครคลาส: {classEnrollments.filter(e => e.status === 'enrolled').length}</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          📋 การจอง
        </button>
        <button 
          className={`tab-btn ${activeTab === 'memberships' ? 'active' : ''}`}
          onClick={() => setActiveTab('memberships')}
        >
          👤 สมาชิกฟิตเนส
        </button>
        <button 
          className={`tab-btn ${activeTab === 'classes' ? 'active' : ''}`}
          onClick={() => setActiveTab('classes')}
        >
          🏃‍♂️ การสมัครคลาส
        </button>
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
          {activeTab === 'bookings' && (
            <>
              <option value="active">ใช้งาน</option>
              <option value="inactive">ไม่ใช้งาน</option>
            </>
          )}
          {activeTab === 'memberships' && (
            <>
              <option value="active">ใช้งาน</option>
              <option value="expired">หมดอายุ</option>
              <option value="cancelled">ยกเลิก</option>
            </>
          )}
          {activeTab === 'classes' && (
            <>
              <option value="enrolled">สมัครแล้ว</option>
              <option value="completed">เสร็จสิ้น</option>
              <option value="cancelled">ยกเลิก</option>
            </>
          )}
        </select>
      </div>

      {loading ? (
        <div className="loading">กำลังโหลดข้อมูล...</div>
      ) : (
        <>
          {/* แสดงข้อมูลการจอง (เดิม) */}
          {activeTab === 'bookings' && (
            <>
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
            </>
          )}

          {/* แสดงข้อมูลสมาชิกฟิตเนส */}
          {activeTab === 'memberships' && (
            <div className="members-container">
              {getFilteredMemberships().length > 0 ? (
                <div className="members-grid">
                  {getFilteredMemberships().map((membership) => (
                    <div key={membership.membership_id} className="member-card membership-card">
                      <div className="member-header">
                        <div className="member-info">
                          <h3>{membership.profiles?.full_name || membership.profiles?.username || 'ไม่ระบุชื่อ'}</h3>
                          <p className="member-email">{membership.profiles?.useremail}</p>
                        </div>
                        <div className={`status-badge ${membership.status}`}>
                          {formatStatus(membership.status)}
                        </div>
                      </div>
                      
                      <div className="member-details">
                        <div className="detail-row">
                          <span className="label">ประเภท:</span>
                          <span className="value">{formatMembershipType(membership.membership_type)}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">จำนวนเงิน:</span>
                          <span className="value">฿{membership.amount}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">เริ่มต้น:</span>
                          <span className="value">{formatDate(membership.start_date)}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">สิ้นสุด:</span>
                          <span className="value">{formatDate(membership.end_date)}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">เบอร์โทร:</span>
                          <span className="value">{membership.profiles?.usertel || '-'}</span>
                        </div>
                      </div>

                      {membership.status === 'active' && (
                        <div className="member-actions">
                          <button 
                            className="action-btn cancel"
                            onClick={() => handleUpdateMembershipStatus(membership.membership_id, 'cancelled')}
                          >
                            ยกเลิกสมาชิก
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <h3>ไม่พบข้อมูลสมาชิก</h3>
                  <p>{fitnessId ? 'ยังไม่มีสมาชิกในฟิตเนสของคุณ' : 'กรุณาตั้งค่าข้อมูลฟิตเนสก่อน'}</p>
                </div>
              )}
            </div>
          )}

          {/* แสดงข้อมูลการสมัครคลาส */}
          {activeTab === 'classes' && (
            <div className="members-container">
              {getFilteredClassEnrollments().length > 0 ? (
                <div className="members-grid">
                  {getFilteredClassEnrollments().map((enrollment) => (
                    <div key={enrollment.enrollment_id} className="member-card class-enrollment">
                      <div className="member-header">
                        <div className="member-info">
                          <h3>{enrollment.profiles?.full_name || enrollment.profiles?.username || 'ไม่ระบุชื่อ'}</h3>
                          <p className="member-email">{enrollment.profiles?.useremail}</p>
                        </div>
                        <div className={`status-badge ${enrollment.status}`}>
                          {formatStatus(enrollment.status)}
                        </div>
                      </div>
                      
                      <div className="member-details">
                        <div className="detail-row">
                          <span className="label">คลาส:</span>
                          <span className="value">{enrollment.tbl_classes?.class_name || 'ไม่ระบุ'}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">ราคา:</span>
                          <span className="value">฿{enrollment.tbl_classes?.price || 0}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">วันที่สมัคร:</span>
                          <span className="value">{formatDate(enrollment.enrollment_date)}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">เบอร์โทร:</span>
                          <span className="value">{enrollment.profiles?.usertel || '-'}</span>
                        </div>
                        {enrollment.tbl_classes?.description && (
                          <div className="detail-row">
                            <span className="label">รายละเอียด:</span>
                            <span className="value">{enrollment.tbl_classes.description}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <h3>ไม่พบข้อมูลการสมัครคลาส</h3>
                  <p>{fitnessId ? 'ยังไม่มีการสมัครคลาสในฟิตเนสของคุณ' : 'กรุณาตั้งค่าข้อมูลฟิตเนสก่อน'}</p>
                </div>
              )}
            </div>
          )}
        </>
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