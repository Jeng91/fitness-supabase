import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../supabaseClient';

const PaymentManagement = ({ ownerData, onUpdate }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDate, setFilterDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const loadPayments = useCallback(async () => {
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
        setPayments([]);
        return;
      }

      // Get payments for bookings at this fitness
      const { data: paymentData, error: paymentError } = await supabase
        .from('tbl_payments')
        .select(`
          *,
          tbl_booking:booking_id (
            booking_id,
            booking_date,
            booking_price,
            fit_id,
            tbl_user:user_id (
              user_id,
              user_email,
              user_name,
              user_phone
            )
          )
        `)
        .eq('tbl_booking.fit_id', fitnessData.fit_id)
        .order('payment_date', { ascending: false });

      if (paymentError) {
        console.error('Error loading payments:', paymentError);
        return;
      }

      // Filter payments that belong to this fitness
      const filteredPayments = paymentData?.filter(payment => 
        payment.tbl_booking?.fit_id === fitnessData.fit_id
      ) || [];

      setPayments(filteredPayments);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [ownerData?.owner_id]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const updatePaymentStatus = async (paymentId, newStatus) => {
    try {
      const { error } = await supabase
        .from('tbl_payments')
        .update({ 
          payment_status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('payment_id', paymentId);

      if (error) {
        console.error('Error updating payment:', error);
        alert('เกิดข้อผิดพลาดในการอัปเดทสถานะ');
        return;
      }

      // Update local state
      setPayments(prev => 
        prev.map(payment => 
          payment.payment_id === paymentId 
            ? { ...payment, payment_status: newStatus, updated_at: new Date().toISOString() }
            : payment
        )
      );

      alert('อัปเดทสถานะการชำระเงินสำเร็จ!');
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error:', error);
      alert('เกิดข้อผิดพลาดในการอัปเดทสถานะ');
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.tbl_booking?.tbl_user?.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.tbl_booking?.tbl_user?.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.payment_id?.toString().includes(searchTerm) ||
                         payment.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || payment.payment_status === filterStatus;
    
    const matchesDate = !filterDate || 
                       new Date(payment.payment_date).toISOString().split('T')[0] === filterDate;
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  const getPaymentStats = () => {
    return {
      total: payments.length,
      pending: payments.filter(p => p.payment_status === 'pending').length,
      completed: payments.filter(p => p.payment_status === 'completed').length,
      failed: payments.filter(p => p.payment_status === 'failed').length,
      refunded: payments.filter(p => p.payment_status === 'refunded').length,
      totalAmount: payments
        .filter(p => p.payment_status === 'completed')
        .reduce((sum, p) => sum + (p.amount || 0), 0)
    };
  };

  const stats = getPaymentStats();

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'completed': return 'success';
      case 'failed': return 'danger';
      case 'refunded': return 'info';
      default: return 'secondary';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'รอดำเนินการ';
      case 'completed': return 'สำเร็จ';
      case 'failed': return 'ล้มเหลว';
      case 'refunded': return 'คืนเงิน';
      default: return status;
    }
  };

  const getPaymentMethodText = (method) => {
    switch (method) {
      case 'credit_card': return 'บัตรเครดิต';
      case 'bank_transfer': return 'โอนเงิน';
      case 'promptpay': return 'พร้อมเพย์';
      case 'cash': return 'เงินสด';
      default: return method;
    }
  };

  if (loading) {
    return <div className="loading">กำลังโหลดข้อมูลการชำระเงิน...</div>;
  }

  return (
    <div className="payment-management">
      <div className="section-header">
        <h2>💳 จัดการการชำระเงิน</h2>
        <div className="payment-stats">
          <span className="stat-item">ทั้งหมด: {stats.total}</span>
          <span className="stat-item warning">รอดำเนินการ: {stats.pending}</span>
          <span className="stat-item success">สำเร็จ: {stats.completed}</span>
          <span className="stat-item success">ยอดรวม: ฿{stats.totalAmount.toLocaleString()}</span>
        </div>
      </div>

      <div className="payment-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="ค้นหาการชำระเงิน (ชื่อ, อีเมล, ID, Transaction)"
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
          <option value="pending">รอดำเนินการ</option>
          <option value="completed">สำเร็จ</option>
          <option value="failed">ล้มเหลว</option>
          <option value="refunded">คืนเงิน</option>
        </select>
      </div>

      {filteredPayments.length === 0 ? (
        <div className="empty-state">
          <h3>ไม่พบการชำระเงิน</h3>
          <p>ยังไม่มีการชำระเงินในระบบหรือไม่ตรงกับเงื่อนไขการค้นหา</p>
        </div>
      ) : (
        <div className="payments-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>ลูกค้า</th>
                <th>จำนวนเงิน</th>
                <th>วิธีชำระ</th>
                <th>วันที่</th>
                <th>สถานะ</th>
                <th>การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map(payment => (
                <tr key={payment.payment_id}>
                  <td>#{payment.payment_id}</td>
                  <td>
                    <div className="customer-info">
                      <div className="name">{payment.tbl_booking?.tbl_user?.user_name || 'ไม่ระบุ'}</div>
                      <div className="email">{payment.tbl_booking?.tbl_user?.user_email}</div>
                    </div>
                  </td>
                  <td>
                    <span className="amount">฿{payment.amount?.toLocaleString()}</span>
                  </td>
                  <td>{getPaymentMethodText(payment.payment_method)}</td>
                  <td>{new Date(payment.payment_date).toLocaleDateString('th-TH')}</td>
                  <td>
                    <span className={`status ${getStatusColor(payment.payment_status)}`}>
                      {getStatusText(payment.payment_status)}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-secondary btn-sm"
                        onClick={() => setSelectedPayment(payment)}
                      >
                        ดูรายละเอียด
                      </button>
                      {payment.payment_status === 'pending' && (
                        <>
                          <button
                            className="btn-success btn-sm"
                            onClick={() => updatePaymentStatus(payment.payment_id, 'completed')}
                          >
                            ยืนยันการชำระ
                          </button>
                          <button
                            className="btn-danger btn-sm"
                            onClick={() => updatePaymentStatus(payment.payment_id, 'failed')}
                          >
                            ล้มเหลว
                          </button>
                        </>
                      )}
                      {payment.payment_status === 'completed' && (
                        <button
                          className="btn-warning btn-sm"
                          onClick={() => updatePaymentStatus(payment.payment_id, 'refunded')}
                        >
                          คืนเงิน
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

      {selectedPayment && (
        <div className="modal-overlay" onClick={() => setSelectedPayment(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>รายละเอียดการชำระเงิน #{selectedPayment.payment_id}</h3>
              <button
                className="btn-close"
                onClick={() => setSelectedPayment(null)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="payment-details">
                <div className="detail-group">
                  <h4>ข้อมูลลูกค้า</h4>
                  <p><strong>ชื่อ:</strong> {selectedPayment.tbl_booking?.tbl_user?.user_name || 'ไม่ระบุ'}</p>
                  <p><strong>อีเมล:</strong> {selectedPayment.tbl_booking?.tbl_user?.user_email}</p>
                  <p><strong>โทรศัพท์:</strong> {selectedPayment.tbl_booking?.tbl_user?.user_phone || 'ไม่ระบุ'}</p>
                </div>
                <div className="detail-group">
                  <h4>รายละเอียดการชำระเงิน</h4>
                  <p><strong>รหัสการชำระ:</strong> #{selectedPayment.payment_id}</p>
                  <p><strong>รหัสธุรกรรม:</strong> {selectedPayment.transaction_id || 'ไม่ระบุ'}</p>
                  <p><strong>จำนวนเงิน:</strong> ฿{selectedPayment.amount?.toLocaleString()}</p>
                  <p><strong>วิธีชำระ:</strong> {getPaymentMethodText(selectedPayment.payment_method)}</p>
                  <p><strong>วันที่ชำระ:</strong> {new Date(selectedPayment.payment_date).toLocaleString('th-TH')}</p>
                  <p><strong>สถานะ:</strong> 
                    <span className={`status ${getStatusColor(selectedPayment.payment_status)}`}>
                      {getStatusText(selectedPayment.payment_status)}
                    </span>
                  </p>
                </div>
                <div className="detail-group">
                  <h4>ข้อมูลการจอง</h4>
                  <p><strong>รหัสการจอง:</strong> #{selectedPayment.tbl_booking?.booking_id}</p>
                  <p><strong>วันที่จอง:</strong> {new Date(selectedPayment.tbl_booking?.booking_date).toLocaleDateString('th-TH')}</p>
                  <p><strong>ราคาการจอง:</strong> ฿{selectedPayment.tbl_booking?.booking_price?.toLocaleString()}</p>
                </div>
                {selectedPayment.notes && (
                  <div className="detail-group">
                    <h4>หมายเหตุ</h4>
                    <p>{selectedPayment.notes}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setSelectedPayment(null)}
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

export default PaymentManagement;