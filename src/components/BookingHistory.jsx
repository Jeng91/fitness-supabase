import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { getUserBookings, getUserPayments, getBookingStats } from '../utils/bookingPaymentAPI';
import './BookingHistory.css';

const BookingHistory = () => {
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, activeTab]); // ลบ loadData ออกจาก dependency

  const checkUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      setUser(user);
    } catch (error) {
      console.error('Error checking user:', error);
    }
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (activeTab === 'bookings') {
        const bookingResult = await getUserBookings(user.id);
        if (bookingResult.success) {
          setBookings(bookingResult.data);
        }
      } else if (activeTab === 'payments') {
        const paymentResult = await getUserPayments(user.id);
        if (paymentResult.success) {
          setPayments(paymentResult.data);
        }
      } else if (activeTab === 'stats') {
        const statsResult = await getBookingStats();
        if (statsResult.success) {
          setStats(statsResult.data);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [user, activeTab]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#ffc107';
      case 'confirmed': return '#28a745';
      case 'completed': return '#17a2b8';
      case 'cancelled': return '#dc3545';
      case 'expired': return '#6c757d';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'รอการชำระ';
      case 'confirmed': return 'ยืนยันแล้ว';
      case 'completed': return 'เสร็จสิ้น';
      case 'cancelled': return 'ยกเลิกแล้ว';
      case 'expired': return 'หมดอายุ';
      case 'processing': return 'กำลังดำเนินการ';
      case 'failed': return 'ไม่สำเร็จ';
      case 'refunded': return 'คืนเงินแล้ว';
      default: return status;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB'
    }).format(amount);
  };

  if (!user) {
    return (
      <div className="booking-history-container">
        <div className="no-user">
          <h3>กรุณาเข้าสู่ระบบ</h3>
          <p>เพื่อดูประวัติการจองและการชำระเงิน</p>
        </div>
      </div>
    );
  }

  return (
    <div className="booking-history-container">
      <div className="booking-history-header">
        <h2>📊 ประวัติการใช้บริการ</h2>
        <p>ติดตามสถานะการจองและการชำระเงินของคุณ</p>
      </div>

      {/* Navigation Tabs */}
      <div className="history-tabs">
        <button
          className={`tab-btn ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          📋 การจอง
        </button>
        <button
          className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          💳 การชำระเงิน
        </button>
        <button
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📈 สถิติ
        </button>
      </div>

      {/* Content */}
      <div className="history-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>กำลังโหลดข้อมูล...</p>
          </div>
        ) : (
          <>
            {/* Bookings Tab */}
            {activeTab === 'bookings' && (
              <div className="bookings-tab">
                <h3>📋 ประวัติการจอง</h3>
                {bookings.length === 0 ? (
                  <div className="no-data">
                    <p>ยังไม่มีการจองในระบบ</p>
                  </div>
                ) : (
                  <div className="bookings-list">
                    {bookings.map((booking) => (
                      <div key={booking.booking_id} className="booking-card">
                        <div className="booking-header">
                          <div className="booking-info">
                            <h4>🏋️‍♂️ {booking.tbl_fitness?.fitness_name || 'ไม่ระบุชื่อ'}</h4>
                            <p>📍 {booking.tbl_fitness?.location || 'ไม่ระบุสถานที่'}</p>
                          </div>
                          <div 
                            className="booking-status"
                            style={{ backgroundColor: getStatusColor(booking.booking_status) }}
                          >
                            {getStatusText(booking.booking_status)}
                          </div>
                        </div>
                        
                        <div className="booking-details">
                          <div className="detail-row">
                            <span>📅 วันที่จอง:</span>
                            <span>{new Date(booking.booking_date).toLocaleDateString('th-TH')}</span>
                          </div>
                          <div className="detail-row">
                            <span>💰 ยอดเงิน:</span>
                            <span>{formatCurrency(booking.total_amount)}</span>
                          </div>
                          <div className="detail-row">
                            <span>🕒 วันที่สร้าง:</span>
                            <span>{formatDate(booking.created_at)}</span>
                          </div>
                          {booking.notes && (
                            <div className="detail-row">
                              <span>📝 หมายเหตุ:</span>
                              <span>{booking.notes}</span>
                            </div>
                          )}
                        </div>

                        {/* Payment Status */}
                        {booking.payments && booking.payments.length > 0 && (
                          <div className="payment-status-section">
                            <h5>💳 สถานะการชำระเงิน</h5>
                            {booking.payments.map((payment) => (
                              <div key={payment.payment_id} className="payment-status-item">
                                <span 
                                  className="payment-status-badge"
                                  style={{ backgroundColor: getStatusColor(payment.payment_status) }}
                                >
                                  {getStatusText(payment.payment_status)}
                                </span>
                                {payment.paid_at && (
                                  <span className="payment-date">
                                    {formatDate(payment.paid_at)}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
              <div className="payments-tab">
                <h3>💳 ประวัติการชำระเงิน</h3>
                {payments.length === 0 ? (
                  <div className="no-data">
                    <p>ยังไม่มีประวัติการชำระเงิน</p>
                  </div>
                ) : (
                  <div className="payments-list">
                    {payments.map((payment) => (
                      <div key={payment.payment_id} className="payment-card">
                        <div className="payment-header">
                          <div className="payment-info">
                            <h4>💳 การชำระเงิน</h4>
                            <p>🏋️‍♂️ {payment.bookings?.tbl_fitness?.fitness_name || 'ไม่ระบุ'}</p>
                          </div>
                          <div 
                            className="payment-status"
                            style={{ backgroundColor: getStatusColor(payment.payment_status) }}
                          >
                            {getStatusText(payment.payment_status)}
                          </div>
                        </div>

                        <div className="payment-details">
                          <div className="detail-row">
                            <span>💰 ยอดเงินรวม:</span>
                            <span className="amount-total">
                              {formatCurrency(payment.total_amount)}
                            </span>
                          </div>
                          <div className="detail-row">
                            <span>🏢 ค่าธรรมเนียมระบบ (20%):</span>
                            <span>{formatCurrency(payment.system_fee)}</span>
                          </div>
                          <div className="detail-row">
                            <span>🏋️‍♂️ ยอดที่ฟิตเนสได้รับ (80%):</span>
                            <span>{formatCurrency(payment.fitness_amount)}</span>
                          </div>
                          <div className="detail-row">
                            <span>🔄 วิธีการชำระ:</span>
                            <span>{payment.payment_method}</span>
                          </div>
                          {payment.transaction_id && (
                            <div className="detail-row">
                              <span>🔢 รหัสธุรกรรม:</span>
                              <span className="transaction-id">{payment.transaction_id}</span>
                            </div>
                          )}
                          {payment.paid_at && (
                            <div className="detail-row">
                              <span>🕒 วันที่ชำระ:</span>
                              <span>{formatDate(payment.paid_at)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Stats Tab */}
            {activeTab === 'stats' && (
              <div className="stats-tab">
                <h3>📈 สถิติการใช้บริการ</h3>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon">📋</div>
                    <div className="stat-info">
                      <h4>การจองทั้งหมด</h4>
                      <p className="stat-number">{stats.total_bookings || 0}</p>
                    </div>
                  </div>
                  
                  <div className="stat-card">
                    <div className="stat-icon">⏳</div>
                    <div className="stat-info">
                      <h4>รอการชำระ</h4>
                      <p className="stat-number">{stats.pending_bookings || 0}</p>
                    </div>
                  </div>
                  
                  <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-info">
                      <h4>ยืนยันแล้ว</h4>
                      <p className="stat-number">{stats.confirmed_bookings || 0}</p>
                    </div>
                  </div>
                  
                  <div className="stat-card">
                    <div className="stat-icon">🏆</div>
                    <div className="stat-info">
                      <h4>เสร็จสิ้น</h4>
                      <p className="stat-number">{stats.completed_bookings || 0}</p>
                    </div>
                  </div>
                  
                  <div className="stat-card">
                    <div className="stat-icon">❌</div>
                    <div className="stat-info">
                      <h4>ยกเลิก</h4>
                      <p className="stat-number">{stats.cancelled_bookings || 0}</p>
                    </div>
                  </div>
                  
                  <div className="stat-card revenue">
                    <div className="stat-icon">💰</div>
                    <div className="stat-info">
                      <h4>ยอดใช้จ่ายรวม</h4>
                      <p className="stat-number">{formatCurrency(stats.total_revenue || 0)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default BookingHistory;