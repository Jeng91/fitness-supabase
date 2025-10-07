import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const PaymentAdmin = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('qr_payments')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const updatePaymentStatus = async (paymentId, newStatus) => {
    try {
      const { error } = await supabase
        .from('qr_payments')
        .update({ 
          status: newStatus,
          paid_at: newStatus === 'success' ? new Date().toISOString() : null
        })
        .eq('qr_payment_id', paymentId);

      if (error) throw error;
      
      // Refresh payments
      fetchPayments();
      alert(`Payment status updated to: ${newStatus}`);
    } catch (error) {
      console.error('Error updating payment:', error);
      alert('Error updating payment status');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('th-TH');
  };

  if (loading) {
    return <div className="loading">กำลังโหลดข้อมูลการชำระเงิน...</div>;
  }

  return (
    <div className="payment-admin">
      <h2>🏦 การจัดการการชำระเงิน</h2>
      <p>จำนวนรายการทั้งหมด: {payments.length} รายการ</p>
      
      <div className="payment-list">
        {payments.map((payment) => (
          <div key={payment.qr_payment_id} className="payment-card">
            <div className="payment-header">
              <span className={`status ${payment.status}`}>
                {payment.status === 'pending' && '⏳ รอชำระ'}
                {payment.status === 'success' && '✅ ชำระแล้ว'}
                {payment.status === 'failed' && '❌ ล้มเหลว'}
              </span>
              <span className="amount">{formatCurrency(payment.amount)}</span>
            </div>
            
            <div className="payment-details">
              <p><strong>Transaction ID:</strong> {payment.transaction_id}</p>
              <p><strong>ลูกค้า:</strong> {payment.profiles?.full_name || 'ไม่ระบุ'}</p>
              <p><strong>อีเมล:</strong> {payment.profiles?.email || 'ไม่ระบุ'}</p>
              <p><strong>วันที่สร้าง:</strong> {formatDate(payment.created_at)}</p>
              {payment.paid_at && (
                <p><strong>วันที่ชำระ:</strong> {formatDate(payment.paid_at)}</p>
              )}
              <p><strong>QR Code:</strong> {payment.qr_code?.substring(0, 50)}...</p>
            </div>
            
            {payment.status === 'pending' && (
              <div className="payment-actions">
                <button 
                  onClick={() => updatePaymentStatus(payment.qr_payment_id, 'success')}
                  className="btn-success"
                >
                  ✅ ยืนยันการชำระ
                </button>
                <button 
                  onClick={() => updatePaymentStatus(payment.qr_payment_id, 'failed')}
                  className="btn-failed"
                >
                  ❌ ยกเลิก
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <style jsx>{`
        .payment-admin {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }
        
        .payment-card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 16px;
          background: white;
        }
        
        .payment-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        
        .status {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: bold;
        }
        
        .status.pending {
          background: #fff3cd;
          color: #856404;
        }
        
        .status.success {
          background: #d4edda;
          color: #155724;
        }
        
        .status.failed {
          background: #f8d7da;
          color: #721c24;
        }
        
        .amount {
          font-size: 18px;
          font-weight: bold;
          color: #007bff;
        }
        
        .payment-details p {
          margin: 4px 0;
          font-size: 14px;
        }
        
        .payment-actions {
          display: flex;
          gap: 10px;
          margin-top: 12px;
        }
        
        .btn-success {
          background: #28a745;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .btn-failed {
          background: #dc3545;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .loading {
          text-align: center;
          padding: 40px;
          font-size: 18px;
        }
      `}</style>
    </div>
  );
};

export default PaymentAdmin;