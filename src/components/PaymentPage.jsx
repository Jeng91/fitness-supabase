import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from './Layout';
import { createPayment, updateBookingStatus, recordPromoClaim } from '../utils/bookingPaymentAPI';
import { createMembershipPayment } from '../utils/membershipAPI';
import QRPayment from './QRPayment';
import supabase from '../supabaseClient';
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
  const [paymentMethod, setPaymentMethod] = useState('credit_card'); // 'credit_card' or 'qr_code'
  
  // เพิ่ม state สำหรับโปรโมชัน
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [originalAmount, setOriginalAmount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);

  // ฟังก์ชันคำนวณวันที่สิ้นสุด
  const calculateEndDate = (startDate, membershipType) => {
    if (!startDate) return '';
    
    const start = new Date(startDate);
    const end = new Date(start);
    
    if (membershipType === 'monthly') {
      end.setDate(start.getDate() + 30 - 1); // -1 เพราะวันแรกนับเป็นวันที่ 1
    } else if (membershipType === 'yearly') {
      end.setDate(start.getDate() + 365 - 1); // -1 เพราะวันแรกนับเป็นวันที่ 1
    }
    
    return end.toISOString().split('T')[0];
  };

  // คำนวณวันที่สิ้นสุดสำหรับการแสดงผล
  const getEndDate = () => {
    if (bookingData.booking_type === 'membership') {
      return calculateEndDate(bookingData.start_date, bookingData.membership_type);
    } else if (bookingData.booking_type === 'daily') {
      return bookingData.booking_date; // รายวันจะสิ้นสุดในวันเดียวกัน
    }
    return '';
  };

  useEffect(() => {
    if (!bookingData) {
      alert('ไม่พบข้อมูลการจอง');
      navigate('/');
    } else {
      // กำหนดราคาเดิม
      setOriginalAmount(bookingData.total_amount);
    }
  }, [bookingData, navigate]);

  // ถ้ามี promotion ติดมากับ bookingData (มาจากปุ่ม "รับโปรโมชั่น") ให้ยืนยันกับฐานข้อมูลก่อนแล้วค่อย apply
  useEffect(() => {
    const applyPromoFromBookingData = async () => {
      if (!bookingData || !bookingData.promotion) return;
      try {
        const promoRef = bookingData.promotion;
        let promoRecord = null;

        // ถ้ามี promo object ที่มี promo_id หรือ id ให้ดึงโดยตรง
        if (promoRef.promo_id || promoRef.id) {
          const id = promoRef.promo_id || promoRef.id;
          const { data, error } = await supabase.from('tbl_promotions').select('*').eq('promo_id', id).single();
          if (!error && data) promoRecord = data;
        }

        // ถ้ายังไม่พบ ให้ลองหาโดย promo_code
        if (!promoRecord && promoRef.promo_code) {
          const { data, error } = await supabase.from('tbl_promotions').select('*').eq('promo_code', promoRef.promo_code).single();
          if (!error && data) promoRecord = data;
        }

        if (!promoRecord) {
          console.warn('ไม่พบโปรโมชั่นจาก bookingData.promotion ในฐานข้อมูล');
          return;
        }

        // ตรวจสอบสถานะ/วันหมดอายุ
        const now = new Date();
        if (promoRecord.status && promoRecord.status !== 'active') {
          console.warn('Promo from DB is not active:', promoRecord);
          return;
        }
        if (promoRecord.end_date && new Date(promoRecord.end_date) < now) {
          console.warn('Promo from DB is expired:', promoRecord);
          return;
        }

        // คำนวณส่วนลด
        let discount = 0;
        const base = bookingData?.total_amount || originalAmount || 0;
        if (promoRecord.discount_percentage > 0) {
          discount = Math.round((base * promoRecord.discount_percentage / 100) * 100) / 100;
        } else if (promoRecord.discount_amount > 0) {
          discount = Math.min(promoRecord.discount_amount, base);
        }

        setAppliedPromo(promoRecord);
        setDiscountAmount(discount);
      } catch (err) {
        console.error('Error applying promo from bookingData (DB confirm):', err);
      }
    };

    applyPromoFromBookingData();
  }, [bookingData, originalAmount]);

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

  // ฟังก์ชันตรวจสอบรหัสโปรโมชัน
  const validatePromoCode = async () => {
    if (!promoCode.trim()) {
      alert('กรุณาป้อนรหัสโปรโมชัน');
      return;
    }

    setPromoLoading(true);
    try {
      // ค้นหาโปรโมชันที่ตรงกับรหัส
      const { data: promotions, error } = await supabase
        .from('tbl_promotions')
        .select('*')
        .eq('promo_code', promoCode.toUpperCase())
        .eq('status', 'active')
        .single();

      if (error || !promotions) {
        alert('รหัสโปรโมชันไม่ถูกต้องหรือหมดอายุแล้ว');
        setPromoLoading(false);
        return;
      }

      // ตรวจสอบวันที่หมดอายุ
      const currentDate = new Date();
      if (promotions.end_date && new Date(promotions.end_date) < currentDate) {
        alert('รหัสโปรโมชันหมดอายุแล้ว');
        setPromoLoading(false);
        return;
      }

      // คำนวณส่วนลด
      let discount = 0;
      if (promotions.discount_percentage > 0) {
        discount = Math.round((originalAmount * promotions.discount_percentage / 100) * 100) / 100;
      } else if (promotions.discount_amount > 0) {
        discount = Math.min(promotions.discount_amount, originalAmount);
      }

      setAppliedPromo(promotions);
      setDiscountAmount(discount);
      alert(`✅ ใช้โปรโมชันสำเร็จ! ลด ${discount} บาท`);

    } catch (error) {
      console.error('Error validating promo code:', error);
      alert('เกิดข้อผิดพลาดในการตรวจสอบรหัสโปรโมชัน');
    } finally {
      setPromoLoading(false);
    }
  };

  // ฟังก์ชันยกเลิกโปรโมชัน
  const removePromoCode = () => {
    setPromoCode('');
    setAppliedPromo(null);
    setDiscountAmount(0);
  };

  // คำนวณราคาสุดท้าย
  const getFinalAmount = () => {
    return Math.max(0, originalAmount - discountAmount);
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
      // ตรวจสอบประเภทการจอง
      const isMembershipBooking = bookingData.booking_type === 'membership';
      const isClassEnrollment = bookingData.booking_type === 'class';
      
      if (isMembershipBooking) {
        // การสมัครสมาชิก
        await handleMembershipPayment();
      } else if (isClassEnrollment) {
        // การสมัครคลาส
        await handleClassEnrollmentPayment();
      } else {
        // การจองบริการปกติ
        await handleRegularBookingPayment();
      }
      
    } catch (error) {
      console.error('❌ Payment error:', error);
      alert('เกิดข้อผิดพลาดในการชำระเงิน: ' + error.message);
      setIsProcessing(false);
    }
  };

  const handleMembershipPayment = async () => {
    // สร้างข้อมูลการชำระเงินสำหรับสมาชิก
    const paymentData = {
      total_amount: bookingData.total_amount,
      payment_method: 'credit_card',
      payment_status: 'completed',
      transaction_id: `TXN_MEMBER_${Date.now()}`,
      gateway_response: {
        card_last_four: paymentForm.cardNumber.slice(-4),
        email: paymentForm.email,
        processed_at: new Date().toISOString(),
        payment_method: 'credit_card',
        status: 'success',
        membership_type: bookingData.membership_type
      },
      gateway_reference: `REF_MEMBER_${Date.now()}`
    };

    // บันทึกข้อมูลการชำระเงินลง Database
    const paymentResult = await createMembershipPayment(paymentData, bookingData);
    
    if (!paymentResult.success) {
      throw new Error(paymentResult.error || 'ไม่สามารถบันทึกข้อมูลการชำระเงินสมาชิกได้');
    }

    // แสดงผลสำเร็จสำหรับสมาชิก
    alert(`🎉 สมัครสมาชิกสำเร็จ!
    
🏋️ ฟิตเนส: ${bookingData.fitnessName}
📅 ประเภท: ${bookingData.membership_type === 'monthly' ? 'รายเดือน' : 'รายปี'}
� วันที่เริ่ม: ${bookingData.start_date}
🏁 วันที่สิ้นสุด: ${calculateEndDate(bookingData.start_date, bookingData.membership_type)}
�💰 จำนวนเงิน: ${bookingData.total_amount} บาท
💳 หมายเลขอ้างอิง: ${paymentData.transaction_id}

สมาชิกของคุณจะเริ่มต้นตั้งแต่วันที่เลือก!`);

    setIsProcessing(false);
    
    // ถ้ามีโปรโมชั่นที่ใช้ ให้บันทึกการใช้งานโปรโมชั่น (claim)
    if (appliedPromo) {
      try {
        const res = await recordPromoClaim(appliedPromo, bookingData.booking_id || null);
        if (!res.success) console.warn('Failed to record promo claim for membership:', res.error);
      } catch (err) {
        console.error('Error recording promo claim for membership:', err);
      }
    }

    // กลับไปหน้าหลัก
    setTimeout(() => {
      navigate('/');
    }, 2000);
  };

  const handleClassEnrollmentPayment = async () => {
    // สร้างข้อมูลการชำระเงินสำหรับคลาส
    const paymentData = {
      total_amount: bookingData.total_amount,
      payment_method: 'credit_card',
      payment_status: 'completed',
      transaction_id: `TXN_CLASS_${Date.now()}`,
      gateway_response: {
        card_last_four: paymentForm.cardNumber.slice(-4),
        email: paymentForm.email,
        processed_at: new Date().toISOString(),
        payment_method: 'credit_card',
        status: 'success',
        class_enrollment: true,
        class_name: bookingData.className
      },
      gateway_reference: `REF_CLASS_${Date.now()}`
    };

    try {
      // ที่นี่ควรเรียก API สำหรับสร้างการสมัครคลาส
      // const classEnrollmentData = {
      //   class_id: bookingData.classId,
      //   fitness_id: bookingData.fitnessId,
      //   amount: bookingData.total_amount,
      //   enrollment_date: new Date().toISOString().split('T')[0],
      //   status: 'enrolled'
      // };
      // const result = await createClassEnrollment(paymentData, classEnrollmentData);
      
      alert(`🎉 สมัครคลาสสำเร็จ!
      
🏋️ คลาส: ${bookingData.className}
🏢 ฟิตเนส: ${bookingData.fitnessName}
💰 จำนวนเงิน: ${bookingData.total_amount} บาท
💳 หมายเลขอ้างอิง: ${paymentData.transaction_id}

การสมัครคลาสของคุณได้รับการยืนยันแล้ว!`);

      setIsProcessing(false);
      
      // กลับไปหน้าหลัก
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (error) {
      console.error('Class enrollment payment error:', error);
      alert('เกิดข้อผิดพลาดในการสมัครคลาส: ' + error.message);
      setIsProcessing(false);
    }
  };

  const handleRegularBookingPayment = async () => {
    // สร้างข้อมูลการชำระเงิน
    const paymentData = {
      booking_id: bookingData.booking_id,
      total_amount: bookingData.total_amount,
      payment_method: 'credit_card',
      payment_status: 'completed',
      transaction_id: `TXN_${Date.now()}`,
      gateway_response: {
        card_last_four: paymentForm.cardNumber.slice(-4),
        email: paymentForm.email,
        processed_at: new Date().toISOString(),
        payment_method: 'credit_card',
        status: 'success'
      },
      gateway_reference: `REF_${Date.now()}`
    };
    // บันทึกข้อมูลการชำระเงินลง Database
    const paymentResult = await createPayment(paymentData);
    
    if (!paymentResult.success) {
      throw new Error(paymentResult.error || 'ไม่สามารถบันทึกข้อมูลการชำระเงินได้');
    }

    // อัพเดทสถานะการจองเป็น confirmed
    const bookingUpdateResult = await updateBookingStatus(
      bookingData.booking_id, 
      'confirmed',
      'ชำระเงินสำเร็จ - อัพเดทจาก PaymentPage'
    );

    if (!bookingUpdateResult.success) {
      console.warn('⚠️ Warning: Payment saved but failed to update booking status:', bookingUpdateResult.error);
    }

    // ถ้ามีโปรโมชั่นที่ใช้ ให้บันทึกการใช้งานโปรโมชั่น (claim)
    if (appliedPromo) {
      try {
        const res = await recordPromoClaim(appliedPromo, bookingData.booking_id || null);
        if (!res.success) console.warn('Failed to record promo claim for booking:', res.error);
      } catch (err) {
        console.error('Error recording promo claim for booking:', err);
      }
    }

    // แสดงผลสำเร็จ
    alert(`🎉 ชำระเงินสำเร็จ!
      
📋 ID การจอง: ${bookingData.booking_id}
💰 จำนวนเงิน: ${bookingData.total_amount} บาท
💳 หมายเลขอ้างอิง: ${paymentData.transaction_id}
📧 ใบเสร็จส่งไปที่: ${paymentForm.email}
🏋️ ฟิตเนส: ${bookingData.fitnessName}
📅 ${bookingData.booking_type === 'membership' ? 
  `วันที่เริ่มสมาชิก: ${bookingData.start_date}\n🏁 วันที่สิ้นสุดสมาชิก: ${getEndDate()}` : 
  `วันที่จอง: ${bookingData.booking_date}`}

✅ การจองของคุณได้รับการยืนยันแล้ว
📱 ข้อมูลการจองถูกบันทึกในระบบเรียบร้อย

ขอบคุณที่ใช้บริการ PJ Fitness!`);
      
    setIsProcessing(false);
    
    // กลับไปหน้าหลักหลังจากชำระเงินสำเร็จ
    setTimeout(() => {
      navigate('/');
    }, 1000);
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
            
            {bookingData.booking_type === 'membership' ? (
              <>
                <div className="summary-item">
                  <span className="label">ประเภท:</span>
                  <span className="value">
                    {bookingData.membership_type === 'monthly' ? 'สมาชิกรายเดือน' : 'สมาชิกรายปี'}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="label">ระยะเวลา:</span>
                  <span className="value">
                    {bookingData.membership_type === 'monthly' ? '30 วัน' : '365 วัน'}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="label">วันที่เริ่มสมาชิก:</span>
                  <span className="value">{bookingData.start_date}</span>
                </div>
                <div className="summary-item">
                  <span className="label">วันที่สิ้นสุดสมาชิก:</span>
                  <span className="value">{getEndDate()}</span>
                </div>
              </>
            ) : bookingData.booking_type === 'class' ? (
              <>
                <div className="summary-item">
                  <span className="label">ประเภท:</span>
                  <span className="value">🎯 สมัครคลาส</span>
                </div>
                <div className="summary-item">
                  <span className="label">ชื่อคลาส:</span>
                  <span className="value">{bookingData.className}</span>
                </div>
                {bookingData.classDetails?.instructor && (
                  <div className="summary-item">
                    <span className="label">ผู้สอน:</span>
                    <span className="value">{bookingData.classDetails.instructor}</span>
                  </div>
                )}
                {bookingData.classDetails?.duration && (
                  <div className="summary-item">
                    <span className="label">ระยะเวลา:</span>
                    <span className="value">{bookingData.classDetails.duration} นาที</span>
                  </div>
                )}
                {bookingData.classDetails?.class_time && (
                  <div className="summary-item">
                    <span className="label">เวลาเรียน:</span>
                    <span className="value">{bookingData.classDetails.class_time}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="summary-item">
                  <span className="label">ประเภท:</span>
                  <span className="value">จองบริการรายวัน</span>
                </div>
                <div className="summary-item">
                  <span className="label">วันที่:</span>
                  <span className="value">{bookingData.booking_date}</span>
                </div>
                <div className="summary-item">
                  <span className="label">ID การจอง:</span>
                  <span className="value">{bookingData.booking_id}</span>
                </div>
              </>
            )}
            
            {/* Promotion Code Section */}
            <div className="promo-section">
              <h4>🎁 รหัสโปรโมชัน</h4>
              {!appliedPromo ? (
                <div className="promo-input-group">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="ป้อนรหัสโปรโมชัน"
                    className="promo-input"
                  />
                  <button
                    type="button"
                    onClick={validatePromoCode}
                    disabled={promoLoading}
                    className="promo-btn"
                  >
                    {promoLoading ? '⏳' : '✅'} ใช้
                  </button>
                </div>
              ) : (
                <div className="applied-promo">
                  <div className="promo-info">
                    <span className="promo-title">🎉 {appliedPromo.title}</span>
                    <span className="promo-discount">ลด {discountAmount} บาท</span>
                  </div>
                  <button
                    type="button"
                    onClick={removePromoCode}
                    className="remove-promo-btn"
                  >
                    ❌ ยกเลิก
                  </button>
                </div>
              )}
            </div>
            
            {/* Price Summary */}
            <div className="price-summary">
              <div className="summary-item">
                <span className="label">ราคาเดิม:</span>
                <span className="value">฿{originalAmount.toLocaleString()}</span>
              </div>
              
              {appliedPromo && (
                <div className="summary-item discount">
                  <span className="label">ส่วนลด ({appliedPromo.promo_code}):</span>
                  <span className="value">-฿{discountAmount.toLocaleString()}</span>
                </div>
              )}
            </div>
            
            <div className="summary-item total">
              <span className="label">ราคาทั้งหมด:</span>
              <span className="value price">฿{getFinalAmount().toLocaleString()}</span>
            </div>
          </div>

          <div className="payment-form">
            <h3>💳 เลือกวิธีการชำระเงิน</h3>
            
            {/* Payment Method Selector */}
            <div className="payment-method-selector">
              <div className="method-options">
                <button 
                  className={`method-btn ${paymentMethod === 'credit_card' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('credit_card')}
                >
                  💳 บัตรเครดิต
                </button>
                <button 
                  className={`method-btn ${paymentMethod === 'qr_code' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('qr_code')}
                >
                  📱 QR Code
                </button>
              </div>
            </div>

            {/* Credit Card Form */}
            {paymentMethod === 'credit_card' && (
              <div className="credit-card-form">
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
                    ชำระเงิน ฿{getFinalAmount().toLocaleString()}
                  </>
                )}
              </button>
            </div>
              </div>
            )}

            {/* QR Code Payment */}
            {paymentMethod === 'qr_code' && (
              <div className="qr-payment-section">
                <QRPayment 
                  paymentData={{
                    total_amount: getFinalAmount(),
                    description: `${bookingData.fitnessName}${appliedPromo ? ` (ใช้โปรโมชัน ${appliedPromo.promo_code})` : ''} - ${
                      bookingData.booking_type === 'membership' ? 
                        (bookingData.membership_type === 'monthly' ? 'สมาชิกรายเดือน' : 'สมาชิกรายปี') : 
                      bookingData.booking_type === 'class' ?
                        `สมัครคลาส ${bookingData.className}` :
                        'จองบริการรายวัน'
                    }`
                  }}
                  onSuccess={(paymentResult) => {
                    alert(`🎉 ชำระเงินด้วย QR Code สำเร็จ!
                    
                      💰 จำนวนเงิน: ${bookingData.total_amount} บาท
                      💳 รหัสอ้างอิง: ${paymentResult.transaction_id}
                      🏋️ ฟิตเนส: ${bookingData.fitnessName}

                      ✅ การจองของคุณได้รับการยืนยันแล้ว`);
                                          
                    setTimeout(() => {
                      navigate('/');
                    }, 2000);
                  }}
                  onCancel={() => {
                    navigate(-1);
                  }}
                  onError={(error) => {
                    alert(`❌ เกิดข้อผิดพลาด: ${error}`);
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PaymentPage;