import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import './ApprovedPayments_Enhanced.css';

const ApprovedPayments = () => {
  const [approvedPayments, setApprovedPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  // คำนวณสถิติรายได้
  const revenueStats = useMemo(() => {
    const stats = {
      totalRevenue: 0,
      systemFee: 0,
      partnerRevenue: 0,
      totalTransactions: approvedPayments.length,
      bookingTypeStats: {
        daily: { count: 0, revenue: 0 },
        monthly: { count: 0, revenue: 0 },
        yearly: { count: 0, revenue: 0 },
        class: { count: 0, revenue: 0 },
        membership: { count: 0, revenue: 0 }
      }
    };

    approvedPayments.forEach(payment => {
      const amount = parseFloat(payment.amount) || 0;
      const systemFee = parseFloat(payment.system_fee) || (amount * 0.2);
      const partnerRevenue = parseFloat(payment.partner_revenue) || (amount * 0.8);
      const bookingType = payment.booking_type || 'membership';

      stats.totalRevenue += amount;
      stats.systemFee += systemFee;
      stats.partnerRevenue += partnerRevenue;

      if (stats.bookingTypeStats[bookingType]) {
        stats.bookingTypeStats[bookingType].count += 1;
        stats.bookingTypeStats[bookingType].revenue += amount;
      }
    });

    return stats;
  }, [approvedPayments]);

  useEffect(() => {
    fetchApprovedPayments();
  }, []);

  const fetchApprovedPayments = async () => {
    try {
      setLoading(true);
      
      // ดึงข้อมูลจาก approved_payments พร้อม join กับ profiles
      const { data: dbPayments, error } = await supabase
        .from('approved_payments_with_profiles')
        .select('*')
        .order('approved_at', { ascending: false });

      if (!error && dbPayments) {
        console.log('✅ ดึงข้อมูลการชำระเงินที่อนุมัติแล้วสำเร็จ:', dbPayments);
        setApprovedPayments(dbPayments);
      } else {
        console.log('📝 ใช้ข้อมูลจาก localStorage');
        // Fallback ไปยัง localStorage
        const localData = JSON.parse(localStorage.getItem('approved_payments') || '[]');
        setApprovedPayments(localData);
      }
    } catch (error) {
      console.error('Error fetching approved payments:', error);
      // ใช้ localStorage เป็น fallback
      const localData = JSON.parse(localStorage.getItem('approved_payments') || '[]');
      setApprovedPayments(localData);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount) => {
    return Number(amount).toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const getFilteredPayments = () => {
    let filtered = approvedPayments;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(payment => 
        payment.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.useremail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by date
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        default:
          break;
      }
      
      filtered = filtered.filter(payment => 
        new Date(payment.approved_at) >= filterDate
      );
    }

    return filtered;
  };

  // const getTotalAmount = () => {
  //   return getFilteredPayments().reduce((sum, payment) => sum + Number(payment.amount), 0);
  // };

  if (loading) {
    return (
      <div className="approved-payments-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  const filteredPayments = getFilteredPayments();

  return (
    <div className="approved-payments-container">
      <div className="approved-header">
        <h2>✅ รายการชำระเงินที่อนุมัติแล้ว</h2>
        
        {/* สถิติรายได้ */}
        <div className="revenue-stats">
          <div className="stat-card total-revenue">
            <span className="stat-number">฿{formatAmount(revenueStats.totalRevenue)}</span>
            <span className="stat-label">รายได้รวมทั้งหมด</span>
          </div>
          <div className="stat-card system-fee">
            <span className="stat-number">฿{formatAmount(revenueStats.systemFee)}</span>
            <span className="stat-label">รายได้ระบบ (20%)</span>
          </div>
          <div className="stat-card partner-revenue">
            <span className="stat-number">฿{formatAmount(revenueStats.partnerRevenue)}</span>
            <span className="stat-label">รายได้ฟิตเนส (80%)</span>
          </div>
          <div className="stat-card transaction-count">
            <span className="stat-number">{revenueStats.totalTransactions}</span>
            <span className="stat-label">รายการทั้งหมด</span>
          </div>
        </div>

        {/* สถิติการจองตามประเภท */}
        <div className="booking-type-stats">
          <h3>📊 สถิติการจองตามประเภท</h3>
          <div className="booking-stats-grid">
            {Object.entries(revenueStats.bookingTypeStats).map(([type, stats]) => (
              <div key={type} className="booking-stat-card">
                <div className="booking-type-name">
                  {type === 'daily' && '📅 รายวัน'}
                  {type === 'monthly' && '📆 รายเดือน'}
                  {type === 'yearly' && '🗓️ รายปี'}
                  {type === 'class' && '🏋️ คลาส'}
                  {type === 'membership' && '👥 สมาชิก'}
                </div>
                <div className="booking-stats">
                  <span className="booking-count">{stats.count} รายการ</span>
                  <span className="booking-revenue">฿{formatAmount(stats.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-filter">
          <input
            type="text"
            placeholder="🔍 ค้นหาด้วยรหัสอ้างอิง, ชื่อลูกค้า, อีเมล..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="date-filter">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="date-select"
          >
            <option value="all">📅 ทั้งหมด</option>
            <option value="today">🌅 วันนี้</option>
            <option value="week">📅 7 วันที่ผ่านมา</option>
            <option value="month">🗓️ 30 วันที่ผ่านมา</option>
          </select>
        </div>
      </div>

      {filteredPayments.length === 0 ? (
        <div className="no-approved-payments">
          <div className="empty-icon">📊</div>
          <h3>ไม่พบรายการชำระเงินที่อนุมัติแล้ว</h3>
          <p>ยังไม่มีการชำระเงินที่ได้รับการอนุมัติในช่วงเวลานี้</p>
        </div>
      ) : (
        <div className="payments-table-container">
          <table className="payments-table">
            <thead>
              <tr>
                <th>รหัสอ้างอิง</th>
                <th>ลูกค้า</th>
                <th>ติดต่อ</th>
                <th>ประเภทการจอง</th>
                <th>รายละเอียดฟิตเนส</th>
                <th>ยอดชำระ</th>
                <th>รายได้ระบบ</th>
                <th>รายได้ฟิตเนส</th>
                <th>วันที่อนุมัติ</th>
                <th>สลิป</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="payment-row">
                  <td className="transaction-id">
                    <span className="tx-id">{payment.transaction_id?.substring(0, 16)}...</span>
                  </td>
                  
                  <td className="customer-info">
                    <div className="customer-name">{payment.full_name || payment.user_profiles?.full_name || 'ไม่ระบุ'}</div>
                  </td>
                  
                  <td className="contact-info">
                    <div className="email">{payment.useremail || payment.user_profiles?.useremail || 'ไม่ระบุ'}</div>
                    <div className="phone">{payment.usertel || payment.user_profiles?.usertel || 'ไม่ระบุ'}</div>
                  </td>
                  
                  <td className="booking-type">
                    <div className="booking-badge">
                      {payment.booking_type === 'daily' && '📅 รายวัน'}
                      {payment.booking_type === 'monthly' && '📆 รายเดือน'}
                      {payment.booking_type === 'yearly' && '🗓️ รายปี'}
                      {payment.booking_type === 'class' && '🏋️ คลาส'}
                      {(payment.booking_type === 'membership' || !payment.booking_type) && '👥 สมาชิก'}
                    </div>
                    <div className="booking-period">{payment.booking_period || 'ไม่ระบุ'}</div>
                  </td>
                  
                  <td className="fitness-details">
                    <div className="fitness-name">{payment.fitness_name || 'PJ Fitness Center'}</div>
                    <div className="partner-name">{payment.partner_name || 'PJ Fitness Partner'}</div>
                    <div className="description">{payment.description}</div>
                  </td>
                  
                  <td className="amount-total">
                    <span className="amount">฿{formatAmount(payment.amount)}</span>
                  </td>
                  
                  <td className="system-fee">
                    <span className="fee-amount">฿{formatAmount(payment.system_fee || (payment.amount * 0.2))}</span>
                  </td>
                  
                  <td className="partner-revenue">
                    <span className="revenue-amount">฿{formatAmount(payment.partner_revenue || (payment.amount * 0.8))}</span>
                  </td>
                  
                  <td className="approved-date">
                    <span className="date">{formatDate(payment.approved_at || payment.created_at)}</span>
                  </td>
                  
                  <td className="slip-actions">
                    {payment.slip_url ? (
                      <a 
                        href={payment.slip_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="view-slip-btn"
                      >
                        📄 ดูสลิป
                      </a>
                    ) : (
                      <span className="no-slip">ไม่มีสลิป</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ApprovedPayments;