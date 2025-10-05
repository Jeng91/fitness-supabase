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
      // สร้างข้อมูลการชำระเงิน
      const paymentData = {
        booking_id: bookingData.booking_id,
        total_amount: bookingData.total_amount,
        payment_method: 'credit_card',
        payment_status: 'completed', // จำลองการชำระเงินสำเร็จ
        transaction_id: `TXN_${Date.now()}`,
        gateway_response: JSON.stringify({
          card_last_four: paymentForm.cardNumber.slice(-4),
          email: paymentForm.email,
          processed_at: new Date().toISOString()
        }),
        gateway_reference: `REF_${Date.now()}`
      };

      // บันทึกการชำระเงิน
      const paymentResult = await createPayment(paymentData);
      
      if (!paymentResult.success) {
        throw new Error(paymentResult.error);
      }

      // อัพเดทสถานะการจอง
      const bookingResult = await updateBookingStatus(
        bookingData.booking_id, 
        'confirmed',
        'ชำระเงินสำเร็จ'
      );

      if (!bookingResult.success) {
        console.warn('Warning: Payment successful but booking status update failed');
      }

      // แสดงผลสำเร็จ
      alert(`🎉 ชำระเงินสำเร็จ!
      
💰 จำนวนเงิน: ${bookingData.total_amount} บาท
💳 หมายเลขอ้างอิง: ${paymentData.transaction_id}
📧 ใบเสร็จส่งไปที่: ${paymentForm.email}

💡 การแบ่งเงิน:
• ระบบ PJ Fitness: ${Math.round(bookingData.total_amount * 0.20)} บาท (20%)
• ${bookingData.fitnessName}: ${Math.round(bookingData.total_amount * 0.80)} บาท (80%)

ขอบคุณที่ใช้บริการ!`);
      
      navigate('/');
      
    } catch (error) {
      console.error('Payment error:', error);
      alert(`❌ เกิดข้อผิดพลาดในการชำระเงิน: ${error.message}`);
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
            <div className="payment-info">
              <p>💡 การแบ่งเงิน: ระบบ 20% | ฟิตเนส 80%</p>
            </div>
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
            <div className="summary-item">
              <span className="label">ID การจอง:</span>
              <span className="value">{bookingData.booking_id}</span>
            </div>
            <div className="summary-item total">
              <span className="label">ราคาทั้งหมด:</span>
              <span className="value price">{bookingData.total_amount} บาท</span>
            </div>
            <div className="split-info">
              <div className="split-item">
                <span>ระบบ PJ Fitness (20%):</span>
                <span>{Math.round(bookingData.total_amount * 0.20)} บาท</span>
              </div>
              <div className="split-item">
                <span>{bookingData.fitnessName} (80%):</span>
                <span>{Math.round(bookingData.total_amount * 0.80)} บาท</span>
              </div>
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