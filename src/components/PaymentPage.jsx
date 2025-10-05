import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from './Layout';
import { createPayment, updateBookingStatus } from '../utils/bookingPaymentAPI';
import './PaymentPage.css';

const PaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const bookingData = location.state?.bookingData;
  
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: '',
    expiry: '',
    cvv: '',
    email: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!bookingData) {
      alert('ไม่พบข้อมูลการจอง');
      navigate('/');
    } else {
      console.log('🔍 PaymentPage - BookingData:', bookingData);
      console.log('🔍 PaymentPage - Booking ID:', bookingData.booking_id);
    }
  }, [bookingData, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPaymentForm(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!paymentForm.cardNumber || paymentForm.cardNumber.length < 16) {
      newErrors.cardNumber = 'หมายเลขบัตรต้องมี 16 หลัก';
    }
    
    if (!paymentForm.expiry || !/^\d{2}\/\d{2}$/.test(paymentForm.expiry)) {
      newErrors.expiry = 'รูปแบบวันหมดอายุ MM/YY';
    }
    
    if (!paymentForm.cvv || paymentForm.cvv.length !== 3) {
      newErrors.cvv = 'CVV ต้องมี 3 หลัก';
    }
    
    if (!paymentForm.email || !/\S+@\S+\.\S+/.test(paymentForm.email)) {
      newErrors.email = 'รูปแบบอีเมลไม่ถูกต้อง';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBack = () => {
    navigate('/');
  };

  const handlePayment = async () => {
    if (!validateForm()) {
      return;
    }

    setIsProcessing(true);
    
    try {
      // จำลองการประมวลผลการชำระเงิน (2-3 วินาที)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // สร้าง Booking ID ถ้ายังไม่มี
      const finalBookingId = bookingData.booking_id || `BK_${Date.now()}`;
      
      // สร้างข้อมูลการชำระเงิน (จำลอง)
      const paymentData = {
        booking_id: finalBookingId,
        total_amount: bookingData.total_amount,
        payment_method: 'credit_card',
        payment_status: 'completed',
        transaction_id: `TXN_${Date.now()}`,
        gateway_response: JSON.stringify({
          card_last_four: paymentForm.cardNumber.slice(-4),
          email: paymentForm.email,
          processed_at: new Date().toISOString()
        }),
        gateway_reference: `REF_${Date.now()}`
      };

      console.log('🎉 Payment Simulation - Success:', paymentData);

      // จำลองการบันทึกข้อมูลลง Database
      console.log('💾 Saving to Database:');
      console.log('📋 Booking ID:', finalBookingId);
      console.log('💳 Payment Data:', paymentData);
      console.log('🏋️ Fitness:', bookingData.fitnessName);
      console.log('📅 Date:', bookingData.booking_date);

      // แสดงผลสำเร็จ
      alert(`🎉 ชำระเงินสำเร็จ!
      
📋 ID การจอง: ${finalBookingId}
💰 จำนวนเงิน: ${bookingData.total_amount} บาท
💳 หมายเลขอ้างอิง: ${paymentData.transaction_id}
📧 ใบเสร็จส่งไปที่: ${paymentForm.email}
🏋️ ฟิตเนส: ${bookingData.fitnessName}
📅 วันที่: ${bookingData.booking_date}

✅ การจองของคุณได้รับการยืนยันแล้ว
📱 ข้อมูลการจองถูกบันทึกในระบบเรียบร้อย

ขอบคุณที่ใช้บริการ PJ Fitness!`);
      
      // กลับไปหน้าหลักหลังจากชำระเงินสำเร็จ
      setTimeout(() => {
        navigate('/');
      }, 1000);
      
    } catch (error) {
      console.error('Payment simulation error:', error);
      alert(`❌ เกิดข้อผิดพลาดในการชำระเงิน: ${error.message || 'ระบบขัดข้อง'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!bookingData) {
    return <div className="loading">กำลังโหลด...</div>;
  }

  return (
    <Layout>
      <div className="payment-page">
        <div className="payment-container">
          <button onClick={handleBack} className="back-btn">
            ← กลับ
          </button>
          
          <div className="payment-header">
            <h1>💳 ชำระเงิน</h1>
            <p>ชำระค่าบริการฟิตเนสอย่างปลอดภัย</p>
            
          </div>
          
          <div className="booking-summary">
            <h3>📋 สรุปการจอง</h3>
            <div className="summary-item">
              <span className="label">ชื่อฟิตเนส:</span>
              <span className="value">{bookingData.fitnessName}</span>
            </div>
            <div className="summary-item">
              <span className="label">วันที่:</span>
              <span className="value">{bookingData.booking_date}</span>
            </div>
            {bookingData.booking_id ? (
              <div className="summary-item">
                <span className="label">ID การจอง:</span>
                <span className="value">{bookingData.booking_id}</span>
              </div>
            ) : (
              <div className="summary-item">
                <span className="label">ID การจอง:</span>
                <span className="value">จะสร้างหลังชำระเงิน</span>
              </div>
            )}
            <div className="summary-item total">
              <span className="label">ราคาทั้งหมด:</span>
              <span className="value price">{bookingData.total_amount} บาท</span>
            </div>
          </div>

          <div className="payment-form">
            <h3>💳 ข้อมูลการชำระเงิน</h3>
            <div className="form-group">
              <label>หมายเลขบัตรเครดิต</label>
              <input
                type="text"
                name="cardNumber"
                placeholder="1234 5678 9012 3456"
                className={`form-input ${errors.cardNumber ? 'error' : ''}`}
                value={paymentForm.cardNumber}
                onChange={handleInputChange}
                maxLength="16"
              />
              {errors.cardNumber && <span className="error-text">{errors.cardNumber}</span>}
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>วันหมดอายุ</label>
                <input
                  type="text"
                  name="expiry"
                  placeholder="MM/YY"
                  className={`form-input ${errors.expiry ? 'error' : ''}`}
                  value={paymentForm.expiry}
                  onChange={handleInputChange}
                  maxLength="5"
                />
                {errors.expiry && <span className="error-text">{errors.expiry}</span>}
              </div>
              <div className="form-group">
                <label>CVV</label>
                <input
                  type="text"
                  name="cvv"
                  placeholder="123"
                  className={`form-input ${errors.cvv ? 'error' : ''}`}
                  value={paymentForm.cvv}
                  onChange={handleInputChange}
                  maxLength="3"
                />
                {errors.cvv && <span className="error-text">{errors.cvv}</span>}
              </div>
            </div>

            <div className="form-group">
              <label>อีเมล (สำหรับใบเสร็จ)</label>
              <input
                type="email"
                name="email"
                placeholder="example@email.com"
                className={`form-input ${errors.email ? 'error' : ''}`}
                value={paymentForm.email}
                onChange={handleInputChange}
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>
            
            <div className="payment-actions">
              <button
                onClick={handlePayment}
                className={`payment-btn ${isProcessing ? 'processing' : ''}`}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <span className="btn-icon">⏳</span>
                    กำลังประมวลผล...
                  </>
                ) : (
                  <>
                    <span className="btn-icon">💳</span>
                    ชำระเงิน {bookingData.total_amount} บาท
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PaymentPage;