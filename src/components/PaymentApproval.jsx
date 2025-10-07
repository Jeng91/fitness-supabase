import React, { useState, useEffect } from 'react';
import './PaymentApproval.css';

const PaymentApproval = () => {
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  // จำลองข้อมูลการชำระเงินรออนุมัติ
  const mockPendingPayments = React.useMemo(() => [
    {
      id: '1',
      transaction_id: 'txn_1728352800123_abc123',
      amount: 500,
      description: 'ค่าสมาชิกฟิตเนส 1 เดือน',
      slip_filename: 'slip_payment_001.jpg',
      created_at: new Date().toISOString(),
      user_profiles: {
        full_name: 'สมชาย ใจดี',
        email: 'somchai@email.com',
        phone_number: '081-234-5678'
      }
    },
    {
      id: '2', 
      transaction_id: 'txn_1728352900456_def456',
      amount: 1500,
      description: 'ค่าสมาชิกฟิตเนส 3 เดือน',
      slip_filename: 'slip_payment_002.jpg',
      created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      user_profiles: {
        full_name: 'สมหญิง สวยงาม',
        email: 'somying@email.com',
        phone_number: '082-345-6789'
      }
    }
  ], []);

  useEffect(() => {
    // ดึงข้อมูลจาก localStorage และ mock data
    setTimeout(() => {
      const storedPayments = JSON.parse(localStorage.getItem('pending_payments') || '[]');
      const allPayments = [...mockPendingPayments, ...storedPayments];
      setPendingPayments(allPayments);
      setLoading(false);
    }, 1000);
  }, [mockPendingPayments]);

  const handleApprovePayment = async (paymentId, transactionId) => {
    try {
      setProcessing(paymentId);
      
      // จำลองการอนุมัติ
      await new Promise(resolve => setTimeout(resolve, 1500));

      // ลบรายการที่อนุมัติแล้วออกจากลิสต์และ localStorage
      setPendingPayments(prev => {
        const updated = prev.filter(payment => payment.id !== paymentId);
        // อัปเดต localStorage
        const storedPayments = updated.filter(p => !mockPendingPayments.find(mock => mock.id === p.id));
        localStorage.setItem('pending_payments', JSON.stringify(storedPayments));
        return updated;
      });

      alert(`✅ อนุมัติการชำระเงิน ${transactionId} เรียบร้อยแล้ว`);
    } catch (error) {
      console.error('Error approving payment:', error);
      alert('เกิดข้อผิดพลาดในการอนุมัติ');
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectPayment = async (paymentId, reason = '') => {
    try {
      setProcessing(paymentId);
      
      // จำลองการปฏิเสธ
      await new Promise(resolve => setTimeout(resolve, 1500));

      // ลบรายการที่ปฏิเสธแล้วออกจากลิสต์และ localStorage
      setPendingPayments(prev => {
        const updated = prev.filter(payment => payment.id !== paymentId);
        // อัปเดต localStorage
        const storedPayments = updated.filter(p => !mockPendingPayments.find(mock => mock.id === p.id));
        localStorage.setItem('pending_payments', JSON.stringify(storedPayments));
        return updated;
      });

      alert(`❌ ปฏิเสธการชำระเงินเรียบร้อยแล้ว${reason ? `\nเหตุผล: ${reason}` : ''}`);
    } catch (error) {
      console.error('Error rejecting payment:', error);
      alert('เกิดข้อผิดพลาดในการปฏิเสธ');
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount) => {
    return new Intl.NumberFormat('th-TH').format(amount);
  };

  if (loading) {
    return (
      <div className="payment-approval-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-approval-container">
      <div className="approval-header">
        <h2>🔍 รายการชำระเงินรออนุมัติ</h2>
        <div className="approval-stats">
          <span className="pending-count">
            รออนุมัติ: {pendingPayments.length} รายการ
          </span>
        </div>
      </div>

      {pendingPayments.length === 0 ? (
        <div className="no-pending-payments">
          <div className="empty-icon">✅</div>
          <h3>ไม่มีรายการรออนุมัติ</h3>
          <p>ทุกการชำระเงินได้รับการอนุมัติเรียบร้อยแล้ว</p>
        </div>
      ) : (
        <div className="payments-grid">
          {pendingPayments.map((payment) => (
            <div key={payment.id} className="payment-card">
              <div className="payment-header">
                <div className="transaction-info">
                  <h4>#{payment.transaction_id}</h4>
                  <span className="payment-date">
                    {formatDate(payment.created_at)}
                  </span>
                </div>
                <div className="payment-amount">
                  ฿{formatAmount(payment.amount)}
                </div>
              </div>

              <div className="payment-details">
                <div className="detail-row">
                  <span className="label">ลูกค้า:</span>
                  <span className="value">
                    {payment.user_profiles?.full_name || 'ไม่ระบุ'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">อีเมล:</span>
                  <span className="value">
                    {payment.user_profiles?.email || 'ไม่ระบุ'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">รายละเอียด:</span>
                  <span className="value">{payment.description}</span>
                </div>
                <div className="detail-row">
                  <span className="label">ไฟล์สลิป:</span>
                  <span className="value">{payment.slip_filename}</span>
                </div>
              </div>

              <div className="payment-actions">
                <button
                  className="approve-btn"
                  onClick={() => handleApprovePayment(payment.id, payment.transaction_id)}
                  disabled={processing === payment.id}
                >
                  {processing === payment.id ? '⏳ กำลังดำเนินการ...' : '✅ อนุมัติ'}
                </button>
                <button
                  className="reject-btn"
                  onClick={() => {
                    const reason = prompt('เหตุผลในการปฏิเสธ (ไม่บังคับ):');
                    if (reason !== null) {
                      handleRejectPayment(payment.id, reason);
                    }
                  }}
                  disabled={processing === payment.id}
                >
                  ❌ ปฏิเสธ
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PaymentApproval;