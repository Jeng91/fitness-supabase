import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './ApprovedPayments.css';

const ApprovedPayments = () => {
  const [approvedPayments, setApprovedPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

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

  const getTotalAmount = () => {
    return getFilteredPayments().reduce((sum, payment) => sum + Number(payment.amount), 0);
  };

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
        <div className="approved-stats">
          <div className="stat-card">
            <span className="stat-number">{filteredPayments.length}</span>
            <span className="stat-label">รายการ</span>
          </div>
          <div className="stat-card total-amount">
            <span className="stat-number">฿{formatAmount(getTotalAmount())}</span>
            <span className="stat-label">ยอดรวม</span>
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
                <th>รายละเอียด</th>
                <th>จำนวนเงิน</th>
                <th>วันที่อนุมัติ</th>
                <th>อนุมัติโดย</th>
                <th>สลิป</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="payment-row">
                  <td className="transaction-id">
                    <span className="transaction-badge">
                      #{payment.transaction_id}
                    </span>
                  </td>
                  <td className="customer-info">
                    <div className="customer-name">
                      {payment.full_name || 'ไม่ระบุ'}
                    </div>
                  </td>
                  <td className="contact-info">
                    <div className="contact-details">
                      <div className="email">📧 {payment.useremail || 'ไม่ระบุ'}</div>
                      <div className="phone">📱 {payment.usertel || 'ไม่ระบุ'}</div>
                    </div>
                  </td>
                  <td className="description">
                    <span className="description-text">
                      {payment.description || 'ไม่ระบุ'}
                    </span>
                    <div className="payment-type">
                      {payment.payment_type === 'qr_payment' ? '🏦 QR Payment' : 
                       payment.payment_type === 'bank_transfer' ? '💳 โอนธนาคาร' : 
                       '💰 ชำระเงินสด'}
                    </div>
                  </td>
                  <td className="amount">
                    <span className="amount-value">
                      ฿{formatAmount(payment.amount)}
                    </span>
                  </td>
                  <td className="approved-date">
                    {formatDate(payment.approved_at)}
                  </td>
                  <td className="approved-by">
                    <div className="approver-info">
                      <div className="approver-name">
                        {payment.approved_by_name || 'แอดมิน'}
                      </div>
                      <div className="approver-email">
                        {payment.approved_by_email || ''}
                      </div>
                    </div>
                  </td>
                  <td className="slip-actions">
                    {payment.slip_url ? (
                      <a 
                        href={payment.slip_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="view-slip-btn"
                      >
                        🖼️ ดูสลิป
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