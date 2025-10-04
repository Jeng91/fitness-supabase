import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './PaymentPage.css';

const PaymentPage = ({ 
  bookingData, 
  onPaymentSuccess, 
  onPaymentCancel,
  isOpen 
}) => {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [transactionId, setTransactionId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // ข้อมูลการชำระเงิน
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardName: '',
    email: '',
    phone: ''
  });

  // คำนวณการแบ่งเงิน
  const totalAmount = bookingData?.total_amount || 0;
  const systemFee = Math.round(totalAmount * 0.20 * 100) / 100; // 20%
  const fitnessAmount = Math.round(totalAmount * 0.80 * 100) / 100; // 80%

  useEffect(() => {
    // สร้าง transaction ID แบบ unique
    setTransactionId(`TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  }, []);

  // ฟังก์ชันสำหรับ Mock Payment Gateway API
  const processPaymentGateway = async (paymentInfo) => {
    // จำลอง API Call ไปยัง Payment Gateway (เช่น Omise, 2C2P, etc.)
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // จำลองการสุ่มผลลัพธ์
        const isSuccess = Math.random() > 0.1; // 90% success rate
        
        if (isSuccess) {
          resolve({
            success: true,
            transaction_id: transactionId,
            gateway_reference: `REF_${Date.now()}`,
            status: 'completed',
            amount: totalAmount,
            currency: 'THB',
            response_data: {
              gateway: 'mock_payment',
              timestamp: new Date().toISOString(),
              method: paymentInfo.method
            }
          });
        } else {
          reject({
            success: false,
            error_code: 'PAYMENT_FAILED',
            error_message: 'การชำระเงินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง'
          });
        }
      }, 3000); // จำลองเวลาประมวลผล 3 วินาที
    });
  };

  // ฟังก์ชันสำหรับบันทึกข้อมูลการจองในฐานข้อมูล
  const createBookingRecord = async (user) => {
    try {
      const { data: bookingRecord, error: bookingError } = await supabase
        .from('bookings')
        .insert([
          {
            user_id: user.id,
            fitness_id: bookingData.fitness_id,
            owner_uid: bookingData.owner_uid,
            booking_date: bookingData.booking_date,
            total_amount: totalAmount,
            booking_status: 'pending',
            notes: `จองผ่านระบบออนไลน์ - ${new Date().toLocaleDateString('th-TH')}`
          }
        ])
        .select()
        .single();

      if (bookingError) throw bookingError;
      return bookingRecord;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  };

  // ฟังก์ชันสำหรับบันทึกข้อมูลการชำระเงิน
  const createPaymentRecord = async (user, bookingId, gatewayResponse) => {
    try {
      const { data: paymentRecord, error: paymentError } = await supabase
        .from('payments')
        .insert([
          {
            booking_id: bookingId,
            user_id: user.id,
            total_amount: totalAmount,
            system_fee: systemFee,
            fitness_amount: fitnessAmount,
            payment_method: paymentMethod,
            payment_status: 'completed',
            transaction_id: gatewayResponse.transaction_id,
            gateway_response: gatewayResponse.response_data,
            gateway_reference: gatewayResponse.gateway_reference,
            paid_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (paymentError) throw paymentError;
      return paymentRecord;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  };

  // ฟังก์ชันสำหรับสร้างการแบ่งเงิน
  const createPaymentSplit = async (paymentId) => {
    try {
      const { data: splitRecord, error: splitError } = await supabase
        .from('payment_splits')
        .insert([
          {
            payment_id: paymentId,
            system_split_amount: systemFee,
            system_split_status: 'completed',
            fitness_split_amount: fitnessAmount,
            fitness_split_status: 'pending', // รอการโอนให้ฟิตเนส
            system_fee_ref: `SYS_${transactionId}`,
            fitness_transfer_ref: `FIT_${transactionId}`
          }
        ])
        .select()
        .single();

      if (splitError) throw splitError;
      return splitRecord;
    } catch (error) {
      console.error('Error creating payment split:', error);
      throw error;
    }
  };

  // ฟังก์ชันสำหรับอัพเดทสถานะการจอง
  const updateBookingStatus = async (bookingId, status) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          booking_status: status,
          updated_at: new Date().toISOString()
        })
        .eq('booking_id', bookingId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating booking status:', error);
      throw error;
    }
  };

  // ฟังก์ชันหลักสำหรับประมวลผลการชำระเงิน
  const handlePayment = async () => {
    setLoading(true);
    setErrorMessage('');
    setPaymentStatus('processing');

    try {
      // 1. ตรวจสอบข้อมูลผู้ใช้
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('กรุณาเข้าสู่ระบบก่อนทำการชำระเงิน');
      }

      // 2. สร้างข้อมูลการจองในฐานข้อมูล
      const bookingRecord = await createBookingRecord(user);

      // 3. ประมวลผลการชำระเงินผ่าน Payment Gateway
      const gatewayResponse = await processPaymentGateway({
        method: paymentMethod,
        amount: totalAmount,
        transaction_id: transactionId,
        user_info: {
          email: paymentData.email,
          phone: paymentData.phone
        }
      });

      // 4. บันทึกข้อมูลการชำระเงิน
      const paymentRecord = await createPaymentRecord(
        user, 
        bookingRecord.booking_id, 
        gatewayResponse
      );

      // 5. สร้างการแบ่งเงิน
      await createPaymentSplit(paymentRecord.payment_id);

      // 6. อัพเดทสถานะการจองเป็น confirmed
      await updateBookingStatus(bookingRecord.booking_id, 'confirmed');

      // 7. แสดงผลลัพธ์สำเร็จ
      setPaymentStatus('completed');
      
      // เรียกฟังก์ชัน callback
      if (onPaymentSuccess) {
        onPaymentSuccess({
          booking: bookingRecord,
          payment: paymentRecord,
          transaction_id: gatewayResponse.transaction_id
        });
      }

    } catch (error) {
      console.error('Payment failed:', error);
      setPaymentStatus('failed');
      setErrorMessage(error.message || 'การชำระเงินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันสำหรับการเปลี่ยนแปลงข้อมูลฟอร์ม
  const handleInputChange = (field, value) => {
    setPaymentData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // ฟังก์ชันตรวจสอบความถูกต้องของฟอร์ม
  const isFormValid = () => {
    if (paymentMethod === 'credit_card') {
      return paymentData.cardNumber && 
             paymentData.expiryDate && 
             paymentData.cvv && 
             paymentData.cardName &&
             paymentData.email;
    }
    return paymentData.email; // สำหรับ payment method อื่นๆ
  };

  console.log('🔍 PaymentPage props:', { isOpen, hasBookingData: !!bookingData });
  console.log('🔍 PaymentPage bookingData:', bookingData);
  
  if (!isOpen) {
    console.log('❌ PaymentPage not showing - isOpen is false');
    return null;
  }

  console.log('✅ PaymentPage WILL render - isOpen is true');

  // Force render สำหรับ testing
  const displayBookingData = bookingData || {
    fitness_id: 22,
    fitnessName: 'JM FITNESS',
    total_amount: 60,
    booking_date: '2025-10-06',
    location: 'ขาวเนียง มหาสารคาม'
  };

  console.log('✅ Using displayBookingData:', displayBookingData);

  return (
    <div 
      className="payment-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10001,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <div className="payment-container">
        {/* Header */}
        <div className="payment-header">
          <h2>💳 ชำระเงิน</h2>
          <button 
            className="close-payment-btn" 
            onClick={onPaymentCancel}
            disabled={loading}
          >
            ×
          </button>
        </div>

        {/* Booking Summary */}
        <div className="booking-summary">
          <h3>📋 สรุปการจอง</h3>
          <div className="booking-details">
            <div className="booking-item">
              <span>🏋️‍♂️ ฟิตเนส:</span>
              <span>{displayBookingData.fitnessName}</span>
            </div>
            <div className="booking-item">
              <span>📅 วันที่:</span>
              <span>{new Date(displayBookingData.booking_date).toLocaleDateString('th-TH')}</span>
            </div>
            <div className="booking-item">
              <span>💰 ราคา:</span>
              <span>{totalAmount.toLocaleString()} บาท</span>
            </div>
          </div>
        </div>

        {/* Payment Split Info */}
        <div className="payment-split-info">
          <h4>💸 การแบ่งเงิน</h4>
          <div className="split-details">
            <div className="split-item">
              <span>🏢 ค่าธรรมเนียมระบบ (20%):</span>
              <span>{systemFee.toLocaleString()} บาท</span>
            </div>
            <div className="split-item">
              <span>🏋️‍♂️ ยอดที่ฟิตเนสได้รับ (80%):</span>
              <span>{fitnessAmount.toLocaleString()} บาท</span>
            </div>
          </div>
        </div>

        {/* Payment Method Selection */}
        <div className="payment-method-section">
          <h4>🔄 เลือกวิธีการชำระเงิน</h4>
          <div className="payment-methods">
            <label className={`payment-method-option ${paymentMethod === 'credit_card' ? 'selected' : ''}`}>
              <input
                type="radio"
                value="credit_card"
                checked={paymentMethod === 'credit_card'}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              💳 บัตรเครดิต/เดบิต
            </label>
            <label className={`payment-method-option ${paymentMethod === 'promptpay' ? 'selected' : ''}`}>
              <input
                type="radio"
                value="promptpay"
                checked={paymentMethod === 'promptpay'}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              📱 PromptPay
            </label>
            <label className={`payment-method-option ${paymentMethod === 'bank_transfer' ? 'selected' : ''}`}>
              <input
                type="radio"
                value="bank_transfer"
                checked={paymentMethod === 'bank_transfer'}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              🏦 โอนเงินผ่านธนาคาร
            </label>
          </div>
        </div>

        {/* Payment Form */}
        <div className="payment-form">
          {paymentMethod === 'credit_card' && (
            <div className="credit-card-form">
              <div className="form-row">
                <input
                  type="text"
                  placeholder="หมายเลขบัตร"
                  value={paymentData.cardNumber}
                  onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                  maxLength="19"
                />
              </div>
              <div className="form-row">
                <input
                  type="text"
                  placeholder="MM/YY"
                  value={paymentData.expiryDate}
                  onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                  maxLength="5"
                />
                <input
                  type="text"
                  placeholder="CVV"
                  value={paymentData.cvv}
                  onChange={(e) => handleInputChange('cvv', e.target.value)}
                  maxLength="4"
                />
              </div>
              <div className="form-row">
                <input
                  type="text"
                  placeholder="ชื่อบนบัตร"
                  value={paymentData.cardName}
                  onChange={(e) => handleInputChange('cardName', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Common Fields */}
          <div className="common-fields">
            <input
              type="email"
              placeholder="อีเมล"
              value={paymentData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              required
            />
            <input
              type="tel"
              placeholder="เบอร์โทรศัพท์"
              value={paymentData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
            />
          </div>
        </div>

        {/* Payment Status */}
        {paymentStatus !== 'pending' && (
          <div className={`payment-status ${paymentStatus}`}>
            {paymentStatus === 'processing' && (
              <div className="processing-status">
                <div className="spinner"></div>
                <span>🔄 กำลังประมวลผลการชำระเงิน...</span>
              </div>
            )}
            {paymentStatus === 'completed' && (
              <div className="success-status">
                <span>✅ ชำระเงินสำเร็จ!</span>
              </div>
            )}
            {paymentStatus === 'failed' && (
              <div className="error-status">
                <span>❌ {errorMessage}</span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="payment-actions">
          <button
            className="cancel-payment-btn"
            onClick={onPaymentCancel}
            disabled={loading}
          >
            ❌ ยกเลิก
          </button>
          <button
            className="confirm-payment-btn"
            onClick={handlePayment}
            disabled={loading || !isFormValid() || paymentStatus === 'completed'}
          >
            {loading ? '🔄 กำลังประมวลผล...' : `💳 ชำระเงิน ${totalAmount.toLocaleString()} บาท`}
          </button>
        </div>

        {/* Transaction Info */}
        <div className="transaction-info">
          <small>Transaction ID: {transactionId}</small>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;