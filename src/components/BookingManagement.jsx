
import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../supabaseClient';

const BookingManagement = ({ ownerData, onUpdate }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const loadBookings = useCallback(async () => {
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
        setBookings([]);
        return;
      }

      // Get bookings for this fitness
      const { data: bookingData, error: bookingError } = await supabase
        .from('tbl_booking')
        .select(`
          *,
          tbl_user:user_id (
            user_id,
            user_email,
            user_name,
            user_phone
          )
        `)
        .eq('fit_id', fitnessData.fit_id)
        .order('booking_date', { ascending: false });

      if (bookingError) {
        console.error('Error loading bookings:', bookingError);
        return;
      }

      setBookings(bookingData || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [ownerData?.owner_id]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const updateBookingStatus = async (bookingId, newStatus) => {
    try {
      const { error } = await supabase
        .from('tbl_booking')
        .update({ booking_status: newStatus })
        .eq('booking_id', bookingId);

      if (error) {
        console.error('Error updating booking:', error);
        alert('เกิดข้อผิดพลาดในการอัปเดทสถานะ');
        return;
      }

      // Update local state
      setBookings(prev => 
        prev.map(booking => 
          booking.booking_id === bookingId 
            ? { ...booking, booking_status: newStatus }
            : booking
        )
      );

      alert('อัปเดทสถานะสำเร็จ!');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error:', error);
      alert('เกิดข้อผิดพลาดในการอัปเดทสถานะ');
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.tbl_user?.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.tbl_user?.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.booking_id?.toString().includes(searchTerm);
    
    const matchesStatus = filterStatus === 'all' || booking.booking_status === filterStatus;
    
    const matchesDate = !filterDate || 
                       new Date(booking.booking_date).toISOString().split('T')[0] === filterDate;
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const getBookingStats = () => {
    return {
      total: bookings.length,
      pending: bookings.filter(b => b.booking_status === 'pending').length,
      confirmed: bookings.filter(b => b.booking_status === 'confirmed').length,
      completed: bookings.filter(b => b.booking_status === 'completed').length,
      cancelled: bookings.filter(b => b.booking_status === 'cancelled').length,
      totalRevenue: bookings
        .filter(b => b.booking_status !== 'cancelled')
        .reduce((sum, b) => sum + (b.booking_price || 0), 0)
    };
  };

  const stats = getBookingStats();

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'confirmed': return 'info';
      case 'completed': return 'success';
      case 'cancelled': return 'danger';
      default: return 'secondary';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'รอยืนยัน';
      case 'confirmed': return 'ยืนยันแล้ว';
      case 'completed': return 'เสร็จสิ้น';
      case 'cancelled': return 'ยกเลิก';
      default: return status;
    }
  };

  if (loading) {
    return <div className="loading">กำลังโหลดข้อมูลการจอง...</div>;
  }

  return (
    <div className="booking-management">
      <div className="section-header">
        <h2>📅 จัดการการจอง</h2>
        <div className="booking-stats">
          <span className="stat-item">ทั้งหมด: {stats.total}</span>
          <span className="stat-item warning">รอยืนยัน: {stats.pending}</span>
          <span className="stat-item info">ยืนยันแล้ว: {stats.confirmed}</span>
          <span className="stat-item success">เสร็จสิ้น: {stats.completed}</span>
        </div>
      </div>

      <div className="booking-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="ค้นหาการจอง (ชื่อ, อีเมล, ID)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <input
          type="date"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">ทุกสถานะ</option>
          <option value="pending">รอยืนยัน</option>
          <option value="confirmed">ยืนยันแล้ว</option>
          <option value="completed">เสร็จสิ้น</option>
          <option value="cancelled">ยกเลิก</option>
        </select>
      </div>

      {filteredBookings.length === 0 ? (
        <div className="empty-state">
          <h3>ไม่พบการจอง</h3>
          <p>ยังไม่มีการจองในระบบหรือไม่ตรงกับเงื่อนไขการค้นหา</p>
        </div>
      ) : (
        <div className="bookings-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>ลูกค้า</th>
                <th>วันที่จอง</th>
                <th>ราคา</th>
                <th>สถานะ</th>
                <th>การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.map(booking => (
                <tr key={booking.booking_id}>
                  <td>#{booking.booking_id}</td>
                  <td>
                    <div className="customer-info">
                      <div className="name">{booking.tbl_user?.user_name || 'ไม่ระบุ'}</div>
                      <div className="email">{booking.tbl_user?.user_email}</div>
                    </div>
                  </td>
                  <td>{new Date(booking.booking_date).toLocaleDateString('th-TH')}</td>
                  <td>฿{booking.booking_price?.toLocaleString()}</td>
                  <td>
                    <span className={`status ${getStatusColor(booking.booking_status)}`}>
                      {getStatusText(booking.booking_status)}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-secondary btn-sm"
                        onClick={() => setSelectedBooking(booking)}
                      >
                        ดูรายละเอียด
                      </button>
                      {booking.booking_status === 'pending' && (
                        <>
                          <button
                            className="btn-success btn-sm"
                            onClick={() => updateBookingStatus(booking.booking_id, 'confirmed')}
                          >
                            ยืนยัน
                          </button>
                          <button
                            className="btn-danger btn-sm"
                            onClick={() => updateBookingStatus(booking.booking_id, 'cancelled')}
                          >
                            ยกเลิก
                          </button>
                        </>
                      )}
                      {booking.booking_status === 'confirmed' && (
                        <button
                          className="btn-primary btn-sm"
                          onClick={() => updateBookingStatus(booking.booking_id, 'completed')}
                        >
                          เสร็จสิ้น
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedBooking && (
        <div className="modal-overlay" onClick={() => setSelectedBooking(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>รายละเอียดการจอง #{selectedBooking.booking_id}</h3>
              <button
                className="btn-close"
                onClick={() => setSelectedBooking(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="booking-details">
                <div className="detail-group">
                  <h4>ข้อมูลลูกค้า</h4>
                  <p><strong>ชื่อ:</strong> {selectedBooking.tbl_user?.user_name || 'ไม่ระบุ'}</p>
                  <p><strong>อีเมล:</strong> {selectedBooking.tbl_user?.user_email}</p>
                  <p><strong>โทรศัพท์:</strong> {selectedBooking.tbl_user?.user_phone || 'ไม่ระบุ'}</p>
                </div>
                <div className="detail-group">
                  <h4>รายละเอียดการจอง</h4>
                  <p><strong>รหัสการจอง:</strong> #{selectedBooking.booking_id}</p>
                  <p><strong>วันที่จอง:</strong> {new Date(selectedBooking.booking_date).toLocaleDateString('th-TH')}</p>
                  <p><strong>ราคา:</strong> ฿{selectedBooking.booking_price?.toLocaleString()}</p>
                  <p><strong>สถานะ:</strong> 
                    <span className={`status ${getStatusColor(selectedBooking.booking_status)}`}>
                      {getStatusText(selectedBooking.booking_status)}
                    </span>
                  </p>
                  <p><strong>วันที่สร้าง:</strong> {new Date(selectedBooking.created_at).toLocaleString('th-TH')}</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setSelectedBooking(null)}
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingManagement;
