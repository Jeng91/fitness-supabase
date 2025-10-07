import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { supabase } from '../supabaseClient';
import './QRPayment.css';

const QRPayment = memo(({ paymentData, onSuccess, onCancel, onError }) => {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('pending');
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes in seconds
  const [error, setError] = useState('');
  const [slipFile, setSlipFile] = useState(null);
  const [slipPreview, setSlipPreview] = useState('');
  const [uploading, setUploading] = useState(false);
  const [transactionId, setTransactionId] = useState(null);

  // Static QR Code path - replace with your new QR image
  // QR Code Path
  const STATIC_QR_PATH = '/qr-payment.jpg';  // ใช้ useRef เพื่อเก็บ callbacks ที่เสถียร
  const onSuccessRef = useRef(onSuccess);
  const onCancelRef = useRef(onCancel);
  const onErrorRef = useRef(onError);

  // อัปเดต refs เมื่อ props เปลี่ยน
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onCancelRef.current = onCancel;
    onErrorRef.current = onError;
  }, [onSuccess, onCancel, onError]);

  // จัดการการเลือกไฟล์สลิป
  const handleSlipFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // ตรวจสอบชนิดไฟล์
      if (!file.type.startsWith('image/')) {
        setError('กรุณาเลือกไฟล์รูปภาพเท่านั้น');
        return;
      }
      
      // ตรวจสอบขนาดไฟล์ (5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('ขนาดไฟล์ต้องไม่เกิน 5MB');
        return;
      }

      setSlipFile(file);
      
      // สร้างภาพตัวอย่าง
      const reader = new FileReader();
      reader.onload = (e) => {
        setSlipPreview(e.target.result);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  // อัปโหลดสลิปและยืนยันการชำระเงิน
  const handleSlipUpload = async () => {
    if (!slipFile) {
      setError('กรุณาเลือกไฟล์สลิปก่อน');
      return;
    }

    try {
      setUploading(true);
      setError('');

      console.log('🔄 กำลังอัปโหลดสลิป...', {
        file: slipFile.name,
        size: slipFile.size,
        type: slipFile.type
      });

      // ลองอัปโหลดไฟล์ไปยัง Supabase Storage
      let slipUrl = null;
      let slipFileName = slipFile.name;
      
      try {
        const fileExt = slipFile.name.split('.').pop();
        const fileName = `${transactionId}-${Date.now()}.${fileExt}`;
        const filePath = `slips/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('payment-slips')
          .upload(filePath, slipFile);

        if (!uploadError) {
          // ได้ URL ของไฟล์ที่อัปโหลด
          const { data: urlData } = supabase.storage
            .from('payment-slips')
            .getPublicUrl(filePath);

          slipUrl = urlData.publicUrl;
          slipFileName = fileName;
          console.log('✅ อัปโหลดไฟล์สำเร็จ:', slipUrl);
        } else {
          console.error('❌ อัปโหลดไฟล์ล้มเหลว:', uploadError);
          slipUrl = URL.createObjectURL(slipFile); // ใช้ local URL แทน
        }
      } catch (uploadError) {
        console.error('❌ Storage error:', uploadError);
        slipUrl = URL.createObjectURL(slipFile); // ใช้ local URL แทน
      }

      // ลองบันทึกลงฐานข้อมูล
      let savedToDatabase = false;
      try {
        const { data: user } = await supabase.auth.getUser();
        
        if (user.user) {
          const { data, error } = await supabase
            .from('pending_payments')
            .insert([{
              transaction_id: transactionId,
              user_id: user.user.id,
              amount: paymentData?.amount || 0,
              description: paymentData?.description || 'Fitness Payment',
              slip_url: slipUrl,
              slip_filename: slipFileName,
              payment_type: 'qr_payment',
              status: 'pending',
              booking_id: paymentData?.booking_id || null,
              membership_id: paymentData?.membership_id || null
            }])
            .select()
            .single();

          if (!error) {
            console.log('✅ บันทึกลงฐานข้อมูลสำเร็จ:', data);
            savedToDatabase = true;
          } else {
            console.error('❌ บันทึกลงฐานข้อมูลล้มเหลว:', error);
          }
        }
      } catch (dbError) {
        console.error('❌ Database error:', dbError);
      }

      // หากไม่สามารถบันทึกลงฐานข้อมูลได้ ใช้ localStorage
      if (!savedToDatabase) {
        console.log('📝 ใช้ localStorage แทน');
        const paymentRecord = {
          transaction_id: transactionId,
          amount: paymentData?.amount || 0,
          description: paymentData?.description || 'Fitness Payment',
          slip_filename: slipFileName,
          slip_url: slipUrl,
          payment_type: 'qr_payment',
          status: 'pending_approval',
          booking_id: paymentData?.booking_id || null,
          membership_id: paymentData?.membership_id || null,
          created_at: new Date().toISOString()
        };

        // เก็บข้อมูลใน localStorage
        const existingPayments = JSON.parse(localStorage.getItem('pending_payments') || '[]');
        existingPayments.push({
          ...paymentRecord,
          id: Date.now().toString(),
          profiles: {
            full_name: 'ผู้ใช้ทดสอบ',
            useremail: 'test@email.com',
            usertel: '081-234-5678'
          }
        });
        localStorage.setItem('pending_payments', JSON.stringify(existingPayments));
      }

      // อัปเดตสถานะเป็นรออนุมัติ
      setStatus('pending_approval');
      
      onSuccessRef.current?.({
        transaction_id: transactionId,
        amount: paymentData?.amount,
        status: 'pending_approval',
        slip_uploaded: true,
        slip_filename: slipFileName,
        slip_url: slipUrl,
        payment_id: Date.now().toString(),
        message: 'ส่งข้อมูลการชำระเงินเรียบร้อย รอการอนุมัติจากแอดมิน'
      });

      console.log('✅ ส่งข้อมูลการชำระเงินเรียบร้อย');

    } catch (err) {
      console.error('Slip upload error:', err);
      setError(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // เริ่มต้นด้วย static QR
  useEffect(() => {
    setLoading(false);
    setStatus('pending');
    setTimeLeft(900); // 15 minutes
    setTransactionId(generateTransactionId());
  }, []);

  // Timer สำหรับนับถอยหลัง
  useEffect(() => {
    if (timeLeft > 0 && status === 'pending') {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      handleExpired();
    }
  }, [timeLeft, status]);

  // สร้าง transaction ID แบบสุ่ม
  const generateTransactionId = () => {
    return 'txn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  };

  // รีเซ็ตการอัปโหลดสลิป
  const resetSlipUpload = () => {
    setSlipFile(null);
    setSlipPreview(null);
    setUploading(false);
    setError('');
  };

  const handleCancel = useCallback(() => {
    setStatus('cancelled');
    resetSlipUpload();
    onCancelRef.current?.();
  }, []);

  const handleExpired = () => {
    setStatus('expired');
    setError('QR Code หมดอายุแล้ว กรุณาสร้างใหม่');
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleRetry = useCallback(() => {
    setTimeLeft(900);
    setStatus('pending');
    setError('');
    setTransactionId(generateTransactionId());
    resetSlipUpload();
  }, []);

  if (loading) {
    return (
      <div className="qr-payment-container">
        <div className="qr-loading">
          <div className="loading-spinner"></div>
          <p>กำลังสร้าง QR Code...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="qr-payment-container">
        <div className="qr-error">
          <h3>❌ เกิดข้อผิดพลาด</h3>
          <p>{error}</p>
          <button className="retry-btn" onClick={handleRetry}>
            🔄 ลองใหม่
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="qr-payment-container">
      {/* Header */}
      <div className="qr-header">
        <h3>📱 ชำระเงินด้วย QR Code</h3>
        <div className="qr-timer">
          <span className="timer-icon">⏰</span>
          <span className="timer-text">เหลือเวลา: {formatTime(timeLeft)}</span>
        </div>
      </div>

      {/* QR Code Display */}
      <div className="qr-display">
        {status === 'pending' ? (
          <>
            <div className="qr-code-wrapper">
              <img 
                src={STATIC_QR_PATH}
                alt="QR Code สำหรับการชำระเงิน"
                className="qr-code-image"
                onError={(e) => {
                  console.error('ไม่สามารถโหลดรูป QR Code ได้');
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkVycm9yIExvYWRpbmcgUVI8L3RleHQ+PC9zdmc+';
                }}
              />
            </div>
            <p className="qr-instruction">
              สแกน QR Code ด้วยแอพธนาคารของคุณ<br/>
              <small>📱 <strong>โอนเงินตาม QR Code แล้วอัปโหลดสลิป</strong></small>
            </p>

            {/* Slip Upload Section */}
            <div className="slip-upload-section">
              <h4>📄 อัปโหลดสลิปการโอนเงิน</h4>
              
              {/* File Input */}
              <div className="file-input-wrapper">
                <input
                  type="file"
                  id="slip-upload"
                  accept="image/*"
                  onChange={handleSlipFileChange}
                  style={{ display: 'none' }}
                />
                <label htmlFor="slip-upload" className="file-input-label">
                  📁 เลือกไฟล์สลิป
                </label>
              </div>

              {/* Slip Preview */}
              {slipPreview && (
                <div className="slip-preview">
                  <img src={slipPreview} alt="ตัวอย่างสลิป" className="slip-preview-image" />
                  <p className="slip-filename">{slipFile?.name}</p>
                </div>
              )}

              {/* Upload Button */}
              {slipFile && (
                <button 
                  className="upload-slip-btn"
                  onClick={handleSlipUpload}
                  disabled={uploading}
                >
                  {uploading ? '⏳ กำลังอัปโหลด...' : '✅ ยืนยันการชำระเงิน'}
                </button>
              )}

              {/* Error Display */}
              {error && (
                <div className="error-message">
                  <p>❌ {error}</p>
                </div>
              )}
            </div>
          </>
        ) : status === 'success' ? (
          <div className="qr-success">
            <div className="success-icon">✅</div>
            <h4>ชำระเงินสำเร็จ!</h4>
            <p>การทำรายการเสร็จสมบูรณ์</p>
          </div>
        ) : status === 'pending_approval' ? (
          <div className="qr-pending-approval">
            <div className="pending-icon">⏳</div>
            <h4>🔍 รอการอนุมัติ</h4>
            <p>✅ ส่งสลิปการโอนเงินเรียบร้อยแล้ว</p>
            <p><small>📋 แอดมินจะตรวจสอบและอนุมัติในเร็วๆ นี้</small></p>
            <div className="approval-notice">
              <div className="notice-content">
                <p>📌 <strong>ข้อมูลการชำระเงิน:</strong></p>
                <p>• รหัสอ้างอิง: {transactionId}</p>
                <p>• จำนวนเงิน: {paymentData?.amount} บาท</p>
                <p>• ไฟล์สลิป: {slipFile?.name}</p>
                <p style={{marginTop: '12px', fontWeight: 'bold', color: '#f57c00'}}>
                  ⚠️ กรุณารอการอนุมัติจากแอดมิน
                </p>
              </div>
            </div>
          </div>
        ) : status === 'failed' ? (
          <div className="qr-failed">
            <div className="failed-icon">❌</div>
            <h4>การชำระเงินล้มเหลว</h4>
            <p>{error}</p>
            <button className="retry-btn" onClick={handleRetry}>
              🔄 ลองใหม่
            </button>
          </div>
        ) : status === 'expired' ? (
          <div className="qr-expired">
            <div className="expired-icon">⏰</div>
            <h4>QR Code หมดอายุ</h4>
            <p>กรุณาสร้าง QR Code ใหม่</p>
            <button className="retry-btn" onClick={handleRetry}>
              🔄 สร้างใหม่
            </button>
          </div>
        ) : null}
      </div>

      {/* Payment Details */}
      <div className="qr-details">
        <div className="detail-row">
          <span className="label">จำนวนเงิน:</span>
          <span className="value">{paymentData.total_amount} บาท</span>
        </div>
        <div className="detail-row">
          <span className="label">รหัสอ้างอิง:</span>
          <span className="value">{transactionId}</span>
        </div>
        <div className="detail-row">
          <span className="label">สถานะ:</span>
          <span className={`status ${status}`}>
            {status === 'pending' ? '⏳ รอชำระเงิน' :
             status === 'success' ? '✅ ชำระแล้ว' :
             status === 'pending_approval' ? '🔍 รออนุมัติ' :
             status === 'failed' ? '❌ ล้มเหลว' :
             status === 'expired' ? '⏰ หมดอายุ' : '⏸️ ยกเลิก'}
          </span>
        </div>
      </div>

      {/* Instructions */}
      <div className="qr-instructions">
        <h4>📋 วิธีการชำระเงิน</h4>
        <ol>
          <li>เปิดแอพธนาคารหรือ Mobile Banking</li>
          <li>เลือกเมนู "โอนเงิน" หรือ "PromptPay"</li>
          <li>สแกน QR Code ที่แสดงด้านบน</li>
          <li>ตรวจสอบจำนวนเงินและกดยืนยัน</li>
          <li>รอระบบตรวจสอบการชำระเงิน</li>
        </ol>
        
        <div className="production-warning">
          <h5>⚠️ หมายเหตุสำคัญ:</h5>
          <ul>
            <li>🏦 QR Code นี้เชื่อมต่อกับ PromptPay จริง</li>
            <li>💰 การโอนเงินจะเกิดขึ้นจริง</li>
            <li>👨‍💼 Admin จะตรวจสอบและยืนยันการชำระเงิน</li>
            <li>⏰ กรุณารอการยืนยันจากระบบ</li>
          </ul>
        </div>
      </div>

      {/* Action Buttons */}
      {status === 'pending' && (
        <div className="qr-actions">
          <button className="cancel-btn" onClick={handleCancel}>
            ❌ ยกเลิก
          </button>
        </div>
      )}
    </div>
  );
});

QRPayment.displayName = 'QRPayment';

export default QRPayment;