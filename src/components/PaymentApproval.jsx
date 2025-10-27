import React, { useState } from 'react';
import supabase from '../supabaseClient';
import './PaymentApproval.css';
import { useEffect } from 'react';
// upload helper removed (not used in this component)

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

// ลบ PaymentApproval ที่ซ้ำซ้อนออก
const PaymentApproval = ({ pendingPayments = [], onRefresh, setActiveTab }) => {
  const [processing, setProcessing] = useState(null);
  const [pricingInfo, setPricingInfo] = useState({}); // map payment.id -> { label, amount }

  useEffect(() => {
    // Fetch pricing details for pending payments (booking/membership/class)
    const fetchPricing = async () => {
      const newInfo = {};
      for (const payment of pendingPayments) {
        try {
          const bookingType = getBookingTypeFromDescription(payment.description);

          // default fallback: use payment.amount
          let label = 'จำนวนเงิน (รวม)';
          let amount = payment.amount || 0;

          // If booking_id available, try to fetch booking and fitness prices
          if (payment.booking_id) {
            const { data: booking, error: bookingErr } = await supabase
              .from('bookings')
              .select(`*, tbl_fitness:fitness_id (fit_price, fit_price_memberm, fit_price_membery, fit_name)`)
              .eq('booking_id', payment.booking_id)
              .single();

            if (!bookingErr && booking) {
              // pick price based on bookingType
              if (bookingType === 'daily') {
                // fit_price may be stored as string in tbl_fitness.fit_price
                amount = booking.tbl_fitness?.fit_price ? Number(booking.tbl_fitness.fit_price) : Number(booking.total_amount || payment.amount || 0);
                label = 'จำนวนเงิน (รายวัน)';
              } else if (bookingType === 'monthly') {
                amount = booking.tbl_fitness?.fit_price_memberm ?? Number(booking.total_amount || payment.amount || 0);
                label = 'จำนวนเงิน (รายเดือน)';
              } else if (bookingType === 'yearly') {
                amount = booking.tbl_fitness?.fit_price_membery ?? Number(booking.total_amount || payment.amount || 0);
                label = 'จำนวนเงิน (รายปี)';
              } else if (bookingType === 'class') {
                // For class bookings the booking.total_amount likely represents class price
                amount = Number(booking.total_amount || payment.amount || 0);
                label = 'จำนวนเงิน (คลาส)';
              } else {
                // membership/other
                amount = Number(booking.total_amount || payment.amount || 0);
                label = 'จำนวนเงิน (รวม)';
              }
            }
          }

          // If membership_id available, try to fetch membership row
          if (payment.membership_id) {
            const { data: membership, error: memErr } = await supabase
              .from('tbl_memberships')
              .select(`amount, membership_type, fitness_id`)
              .eq('membership_id', payment.membership_id)
              .single();

            if (!memErr && membership) {
              amount = membership.amount || amount;
              label = membership.membership_type === 'monthly' ? 'จำนวนเงิน (สมาชิก รายเดือน)' : 'จำนวนเงิน (สมาชิก รายปี)';
            }
          }

          // Fallback: if description indicates class and we couldn't find booking, use payment.amount
          if (getBookingTypeFromDescription(payment.description) === 'class' && !newInfo[payment.id]) {
            label = 'จำนวนเงิน (คลาส)';
            amount = payment.amount || amount;
          }

          newInfo[payment.id] = { label, amount };
        } catch (err) {
          console.error('Error fetching pricing for payment', payment.id, err);
          newInfo[payment.id] = { label: 'จำนวนเงิน', amount: payment.amount || 0 };
        }
      }

      setPricingInfo(newInfo);
    };

    if (pendingPayments && pendingPayments.length > 0) {
      fetchPricing();
    } else {
      setPricingInfo({});
    }
  }, [pendingPayments]);

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
        // Use server-side RPC to approve pending payment atomically
        const adminId = user.user?.id || null;
        const { data: rpcResult, error: rpcError } = await supabase.rpc('approve_pending_payment', { p_pending_id: paymentId, p_admin_id: adminId });

        if (rpcError) {
          // If RPC returns an error, log and fall back to client path
          console.error('RPC error approving payment:', rpcError);
          throw rpcError;
        }

        // rpcResult is expected to be JSON with status 'ok' on success
        if (rpcResult && (rpcResult.status === 'ok' || rpcResult.status === 'success')) {
          dbSuccess = true;
        } else {
          // Not OK: attempt fallback handled below
          console.warn('RPC did not return ok:', rpcResult);
        }
      } catch (dbError) {
        console.error('❌ Error calling approve_pending_payment RPC:', dbError);
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

  // อัปเดต UI: ไม่ต้อง setPendingPayments เพราะใช้ props
      
      alert(`✅ อนุมัติการชำระเงิน #${transactionId} เรียบร้อยแล้ว`);
  if (setActiveTab) setActiveTab('approved');
  if (onRefresh) onRefresh();
      
    } catch (error) {
      console.error('Error approving payment:', error);
      alert('เกิดข้อผิดพลาดในการอนุมัติ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setProcessing(null);
  // รีเฟรชข้อมูลหลังอนุมัติ
  if (onRefresh) onRefresh();
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

      // อัปเดต UI และ localStorage: ไม่ต้อง setPendingPayments เพราะใช้ props

      alert(`❌ ปฏิเสธการชำระเงินเรียบร้อยแล้ว`);
  if (setActiveTab) setActiveTab('approved');
  if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error rejecting payment:', error);
      alert('เกิดข้อผิดพลาดในการปฏิเสธ');
    } finally {
      setProcessing(null);
  // รีเฟรชข้อมูลหลังปฏิเสธ
  if (onRefresh) onRefresh();
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
                    {payment.profile?.full_name || 'ไม่ระบุ'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">อีเมล:</span>
                  <span className="value">
                    {payment.profile?.useremail || 'ไม่ระบุ'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">เบอร์โทร:</span>
                  <span className="value">
                    {payment.profile?.usertel || 'ไม่ระบุ'}
                  </span>
                </div>
                {/* แสดงจำนวนเงินของฟิตเนส ตามประเภทการจอง */}
                <div className="detail-row">
                  <span className="label">{pricingInfo[payment.id]?.label || 'จำนวนเงินของฟิตเนส:'}</span>
                  <span className="value">
                    ฿{formatAmount(pricingInfo[payment.id]?.amount ?? payment.amount ?? 0)}
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