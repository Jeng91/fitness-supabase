import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import './PaymentApproval.css';

const PaymentApproval = () => {
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  // ข้อมูลจำลองสำหรับทดสอบ
  const mockPendingPayments = useMemo(() => [
    {
      id: '1',
      transaction_id: 'txn_1728352900456_abc123',
      amount: 1200,
      description: 'ค่าสมาชิกฟิตเนส 2 เดือน',
      slip_filename: 'slip_payment_001.jpg',
      created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      user_profiles: {
        full_name: 'สมชาย ใจดี',
        email: 'somchai@email.com',
        phone_number: '081-234-5678'
      }
    }
  ], []);

  const fetchPendingPayments = useCallback(async () => {
    try {
      setLoading(true);
      
      // ดึงข้อมูลจากฐานข้อมูล
      const { data: dbPayments, error } = await supabase
        .from('pending_payments')
        .select(`
          *,
          profiles:user_id (
            full_name,
            usertel,
            useremail
          )
        `)
        .in('status', ['pending', 'pending_approval'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database error:', error);
        // หากไม่สามารถดึงจากฐานข้อมูลได้ ใช้ข้อมูลจาก localStorage
        const storedPayments = JSON.parse(localStorage.getItem('pending_payments') || '[]');
        const pendingPayments = storedPayments.filter(p => 
          p.status === 'pending_approval' || p.status === 'pending'
        );
        const allPayments = [...mockPendingPayments, ...pendingPayments];
        setPendingPayments(allPayments);
      } else {
        // รวมข้อมูลจากฐานข้อมูลและ localStorage
        const storedPayments = JSON.parse(localStorage.getItem('pending_payments') || '[]');
        const pendingStoredPayments = storedPayments.filter(p => 
          p.status === 'pending_approval' || p.status === 'pending'
        );
        const allPayments = [...(dbPayments || []), ...mockPendingPayments, ...pendingStoredPayments];
        setPendingPayments(allPayments);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      // ใช้ข้อมูลจำลองในกรณีที่เกิดข้อผิดพลาด
      const storedPayments = JSON.parse(localStorage.getItem('pending_payments') || '[]');
      const allPayments = [...mockPendingPayments, ...storedPayments];
      setPendingPayments(allPayments);
    } finally {
      setLoading(false);
    }
  }, [mockPendingPayments]);

  useEffect(() => {
    fetchPendingPayments();
  }, [fetchPendingPayments]);

  const handleApprovePayment = async (paymentId, transactionId) => {
    try {
      setProcessing(paymentId);
      
      // ดึงข้อมูลการชำระเงินที่จะอนุมัติ
      const paymentToApprove = pendingPayments.find(p => p.id === paymentId);
      
      if (!paymentToApprove) {
        alert('ไม่พบข้อมูลการชำระเงิน');
        return;
      }

      // ลองอัปเดตในฐานข้อมูลก่อน
      const { data: user } = await supabase.auth.getUser();
      let dbSuccess = false;
      
      try {
        // 1. เพิ่มข้อมูลไปยัง approved_payments
        const { data: approvedData, error: approvedError } = await supabase
          .from('approved_payments')
          .insert([{
            transaction_id: paymentToApprove.transaction_id,
            user_id: paymentToApprove.user_id,
            amount: paymentToApprove.amount,
            description: paymentToApprove.description,
            slip_url: paymentToApprove.slip_url,
            slip_filename: paymentToApprove.slip_filename,
            payment_type: paymentToApprove.payment_type || 'qr_payment',
            original_payment_id: paymentToApprove.id,
            approved_by: user.user?.id,
            booking_id: paymentToApprove.booking_id,
            membership_id: paymentToApprove.membership_id,
            notes: 'อนุมัติโดยแอดมิน - ตรวจสอบสลิปเรียบร้อย'
          }])
          .select()
          .single();

        if (!approvedError && approvedData) {
          // 2. อัปเดตสถานะใน pending_payments
          const { error: updateError } = await supabase
            .from('pending_payments')
            .update({
              status: 'approved',
              approved_by: user.user?.id,
              approved_at: new Date().toISOString()
            })
            .eq('id', paymentId);

          if (!updateError) {
            console.log('✅ อนุมัติการชำระเงินในฐานข้อมูลสำเร็จ');
            dbSuccess = true;
          }
        }
      } catch (dbError) {
        console.error('❌ Database error:', dbError);
      }

      // หากฐานข้อมูลไม่สำเร็จ ใช้ localStorage
      if (!dbSuccess) {
        console.log('📝 ใช้ localStorage แทน');
        
        // อัปเดต localStorage สำหรับ pending_payments
        const storedPayments = JSON.parse(localStorage.getItem('pending_payments') || '[]');
        const updatedPayments = storedPayments.map(payment => 
          payment.id === paymentId 
            ? { ...payment, status: 'approved', approved_at: new Date().toISOString() }
            : payment
        );
        localStorage.setItem('pending_payments', JSON.stringify(updatedPayments));

        // เพิ่มข้อมูลไปยัง approved_payments ใน localStorage
        const approvedPayments = JSON.parse(localStorage.getItem('approved_payments') || '[]');
        approvedPayments.push({
          ...paymentToApprove,
          status: 'approved',
          approved_by: user.user?.id || 'admin',
          approved_at: new Date().toISOString(),
          notes: 'อนุมัติโดยแอดมิน - ตรวจสอบสลิปเรียบร้อย'
        });
        localStorage.setItem('approved_payments', JSON.stringify(approvedPayments));
      }

      // อัปเดต UI
      setPendingPayments(prev => prev.filter(p => p.id !== paymentId));
      
      alert(`✅ อนุมัติการชำระเงิน #${transactionId} เรียบร้อยแล้ว`);
      
    } catch (error) {
      console.error('Error approving payment:', error);
      alert('เกิดข้อผิดพลาดในการอนุมัติ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setProcessing(null);
    }
  };

  const handleRejectPayment = async (paymentId, reason = '') => {
    try {
      setProcessing(paymentId);
      
      // ลองอัปเดตในฐานข้อมูลก่อน
      const { error } = await supabase
        .from('pending_payments')
        .update({
          status: 'rejected',
          rejected_reason: reason,
          rejected_by: (await supabase.auth.getUser()).data.user?.id,
          rejected_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (error) {
        console.error('Database update error:', error);
      }

      // อัปเดต UI และ localStorage
      setPendingPayments(prev => {
        const updated = prev.filter(payment => payment.id !== paymentId);
        // อัปเดต localStorage
        const storedPayments = updated.filter(p => !mockPendingPayments.find(mock => mock.id === p.id));
        localStorage.setItem('pending_payments', JSON.stringify(storedPayments));
        return updated;
      });

      alert(`❌ ปฏิเสธการชำระเงินเรียบร้อยแล้ว`);
    } catch (error) {
      console.error('Error rejecting payment:', error);
      alert('เกิดข้อผิดพลาดในการปฏิเสธ');
    } finally {
      setProcessing(null);
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
          <button 
            className="debug-btn"
            onClick={() => {
              console.log('=== Payment Data Locations ===');
              console.log('1. Supabase Database: pending_payments table');
              console.log('2. Supabase Storage: payment-slips bucket');
              console.log('3. localStorage backup:', JSON.parse(localStorage.getItem('pending_payments') || '[]'));
            }}
          >
            🔍 Debug Data
          </button>
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
                    {payment.profiles?.full_name || payment.user_profiles?.full_name || 'ไม่ระบุ'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">อีเมล:</span>
                  <span className="value">
                    {payment.profiles?.useremail || payment.user_profiles?.email || 'ไม่ระบุ'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">เบอร์โทร:</span>
                  <span className="value">
                    {payment.profiles?.usertel || payment.user_profiles?.phone_number || 'ไม่ระบุ'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">รายละเอียด:</span>
                  <span className="value">{payment.description}</span>
                </div>
                <div className="detail-row">
                  <span className="label">ประเภท:</span>
                  <span className="value">
                    {payment.payment_type === 'qr_payment' ? '🏦 QR Payment' : 
                     payment.payment_type === 'bank_transfer' ? '💳 โอนธนาคาร' : 
                     '💰 ชำระเงินสด'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">สถานะ:</span>
                  <span className={`status-badge ${payment.status}`}>
                    {payment.status === 'pending' ? '⏳ รอดำเนินการ' :
                     payment.status === 'pending_approval' ? '🔍 รออนุมัติ' :
                     payment.status === 'approved' ? '✅ อนุมัติแล้ว' :
                     '❌ ปฏิเสธ'}
                  </span>
                </div>
                {payment.slip_url && (
                  <div className="slip-preview-section">
                    <div className="slip-actions">
                      <a 
                        href={payment.slip_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="view-slip-btn"
                      >
                        🖼️ ดูสลิป
                      </a>
                      <span className="slip-filename">
                        📄 {payment.slip_filename || 'slip.jpg'}
                      </span>
                    </div>
                  </div>
                )}
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