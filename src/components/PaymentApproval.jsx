import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../supabaseClient';
import './PaymentApproval.css';

// ฟังก์ชันวิเคราะห์ข้อมูลการจอง
const getBookingTypeFromDescription = (description) => {
  if (!description) return 'membership';
  
  const desc = description.toLowerCase();
  if (desc.includes('รายวัน') || desc.includes('daily')) return 'daily';
  if (desc.includes('รายเดือน') || desc.includes('monthly') || desc.includes('เดือน')) return 'monthly';
  if (desc.includes('รายปี') || desc.includes('yearly') || desc.includes('ปี')) return 'yearly';
  if (desc.includes('คลาส') || desc.includes('class')) return 'class';
  return 'membership';
};

const getBookingPeriodFromDescription = (description) => {
  if (!description) return '';
  
  const desc = description.toLowerCase();
  if (desc.includes('1 วัน')) return '1 วัน';
  if (desc.includes('1 เดือน')) return '1 เดือน';
  if (desc.includes('2 เดือน')) return '2 เดือน';
  if (desc.includes('3 เดือน')) return '3 เดือน';
  if (desc.includes('6 เดือน')) return '6 เดือน';
  if (desc.includes('1 ปี')) return '1 ปี';
  
  // ถอดข้อมูลจากตัวเลข
  const monthMatch = desc.match(/(\d+)\s*เดือน/);
  if (monthMatch) return `${monthMatch[1]} เดือน`;
  
  const dayMatch = desc.match(/(\d+)\s*วัน/);
  if (dayMatch) return `${dayMatch[1]} วัน`;
  
  const yearMatch = desc.match(/(\d+)\s*ปี/);
  if (yearMatch) return `${yearMatch[1]} ปี`;
  
  return 'ไม่ระบุ';
};

const extractFitnessNameFromDescription = (description) => {
  if (!description) return 'PJ Fitness Center';
  
  // ลองดึงชื่อฟิตเนสจาก description
  if (description.includes('ฟิตเนส')) {
    const parts = description.split(' ');
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].includes('ฟิตเนส') && parts[i-1]) {
        return `${parts[i-1]} ${parts[i]}`;
      }
    }
  }
  
  return 'PJ Fitness Center';
};

const extractPartnerNameFromDescription = (description) => {
  if (!description) return 'PJ Fitness Partner';
  
  // สำหรับตอนนี้ใช้ชื่อเริ่มต้น อาจปรับปรุงในอนาคต
  return extractFitnessNameFromDescription(description) + ' Management';
};

const PaymentApproval = () => {
  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

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
        setPendingPayments(pendingPayments);
      } else {
        // รวมข้อมูลจากฐานข้อมูลและ localStorage
        const storedPayments = JSON.parse(localStorage.getItem('pending_payments') || '[]');
        const pendingStoredPayments = storedPayments.filter(p => 
          p.status === 'pending_approval' || p.status === 'pending'
        );
        const allPayments = [...(dbPayments || []), ...pendingStoredPayments];
        setPendingPayments(allPayments);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      // ใช้ข้อมูลจาก localStorage ในกรณีที่เกิดข้อผิดพลาด
      const storedPayments = JSON.parse(localStorage.getItem('pending_payments') || '[]');
      const pendingPayments = storedPayments.filter(p => 
        p.status === 'pending_approval' || p.status === 'pending'
      );
      setPendingPayments(pendingPayments);
    } finally {
      setLoading(false);
    }
  }, []);

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
            
            // ข้อมูลการจองฟิตเนส
            booking_type: getBookingTypeFromDescription(paymentToApprove.description),
            booking_period: getBookingPeriodFromDescription(paymentToApprove.description),
            fitness_name: extractFitnessNameFromDescription(paymentToApprove.description),
            partner_name: extractPartnerNameFromDescription(paymentToApprove.description),
            
            // การคำนวณรายได้ (20% system fee, 80% partner revenue)
            system_fee: Math.round(paymentToApprove.amount * 0.20 * 100) / 100,
            partner_revenue: Math.round(paymentToApprove.amount * 0.80 * 100) / 100,
            
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
            dbSuccess = true;
          }
        }
      } catch (dbError) {
        console.error('❌ Database error:', dbError);
      }

      // หากฐานข้อมูลไม่สำเร็จ ใช้ localStorage
      if (!dbSuccess) {
        
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
          id: `approved_${Date.now()}`,
          transaction_id: paymentToApprove.transaction_id,
          user_id: paymentToApprove.user_id,
          amount: paymentToApprove.amount,
          description: paymentToApprove.description,
          slip_url: paymentToApprove.slip_url,
          slip_filename: paymentToApprove.slip_filename,
          payment_type: paymentToApprove.payment_type || 'qr_payment',
          original_payment_id: paymentToApprove.id,
          
          // ข้อมูลการจองฟิตเนส
          booking_type: getBookingTypeFromDescription(paymentToApprove.description),
          booking_period: getBookingPeriodFromDescription(paymentToApprove.description),
          fitness_name: extractFitnessNameFromDescription(paymentToApprove.description),
          partner_name: extractPartnerNameFromDescription(paymentToApprove.description),
          
          // การคำนวณรายได้
          system_fee: Math.round(paymentToApprove.amount * 0.20 * 100) / 100,
          partner_revenue: Math.round(paymentToApprove.amount * 0.80 * 100) / 100,
          
          approved_by: 'admin@system.com',
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
        // อัปเดต localStorage (กรองเฉพาะข้อมูลจาก localStorage)
        const storedPayments = JSON.parse(localStorage.getItem('pending_payments') || '[]');
        const filteredStoredPayments = storedPayments.filter(p => p.id !== paymentId);
        localStorage.setItem('pending_payments', JSON.stringify(filteredStoredPayments));
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