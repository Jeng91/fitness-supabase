import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import { generatePaymentQR, checkQRPaymentStatus, cancelQRPayment, generateTransactionId } from '../utils/qrPaymentAPI';
import './QRPayment.css';

const QRPayment = memo(({ paymentData, onSuccess, onCancel, onError }) => {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('pending');
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutes in seconds
  const [error, setError] = useState('');

  // ใช้ useRef เพื่อเก็บ callbacks ที่เสถียร
  const onSuccessRef = useRef(onSuccess);
  const onCancelRef = useRef(onCancel);
  const onErrorRef = useRef(onError);
  const generateQRRef = useRef();

  // อัปเดต refs เมื่อ props เปลี่ยน
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onCancelRef.current = onCancel;
    onErrorRef.current = onError;
  }, [onSuccess, onCancel, onError]);

  const generateQR = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const transactionId = generateTransactionId();
      const qrPaymentData = {
        ...paymentData,
        transaction_id: transactionId,
        description: `Payment for ${paymentData.description || 'Fitness Booking'}`
      };

      const result = await generatePaymentQR(qrPaymentData);

      if (result.success) {
        console.log('🎯 QR Data received:', result.data);
        console.log('🖼️ QR Image URL:', result.data.qr_code_url);
        setQrData(result.data);
        setStatus('pending');
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('QR Generation error:', err);
      setError(err.message);
      onErrorRef.current?.(err.message);
    } finally {
      setLoading(false);
    }
  }, [paymentData]); // ใช้เฉพาะ paymentData

  // เชื่อมต่อ generateQR กับ ref
  generateQRRef.current = generateQR;

  const checkPaymentStatus = useCallback(async () => {
    try {
      const result = await checkQRPaymentStatus(qrData.transaction_id);
      
      if (result.success) {
        const newStatus = result.data.status;
        setStatus(newStatus);

        if (newStatus === 'success') {
          onSuccessRef.current?.(result.data);
        } else if (newStatus === 'failed') {
          setError('การชำระเงินล้มเหลว กรุณาลองใหม่อีกครั้ง');
          onErrorRef.current?.('Payment failed');
        }
      }
    } catch (err) {
      console.error('Status check error:', err);
    }
  }, [qrData?.transaction_id]); // ใช้เฉพาะ transaction_id

  // เรียก generateQR เมื่อ component mount หรือ paymentData เปลี่ยน
  useEffect(() => {
    generateQR();
  }, [generateQR]);

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

  // ตรวจสอบสถานะการชำระเงินทุก 3 วินาที (ลดลงจาก 5 วินาที)
  // และเพิ่มการตรวจสอบจาก webhook
  useEffect(() => {
    if (status === 'pending' && qrData?.transaction_id) {
      const statusChecker = setInterval(async () => {
        await checkPaymentStatus();
      }, 3000); // ลดเวลาการ poll เพื่อให้ responsive มากขึ้น

      return () => clearInterval(statusChecker);
    }
  }, [status, qrData, checkPaymentStatus]);

  // เพิ่มการฟัง WebSocket หรือ Server-Sent Events สำหรับ real-time updates
  useEffect(() => {
    if (qrData?.transaction_id) {
      // ตรวจสอบ localStorage สำหรับการอัปเดตจาก webhook
      const checkWebhookUpdate = () => {
        const webhookUpdate = localStorage.getItem(`webhook_${qrData.transaction_id}`);
        if (webhookUpdate) {
          const updateData = JSON.parse(webhookUpdate);
          setStatus(updateData.status);
          
          if (updateData.status === 'success') {
            onSuccess?.(updateData);
          } else if (updateData.status === 'failed') {
            setError('การชำระเงินล้มเหลว กรุณาลองใหม่อีกครั้ง');
            onError?.('Payment failed');
          }
          
          // ล้างข้อมูลหลังจากใช้แล้ว
          localStorage.removeItem(`webhook_${qrData.transaction_id}`);
        }
      };

      const webhookChecker = setInterval(checkWebhookUpdate, 1000);
      return () => clearInterval(webhookChecker);
    }
  }, [qrData?.transaction_id, onSuccess, onError]);

  const handleCancel = useCallback(async () => {
    try {
      if (qrData?.transaction_id) {
        await cancelQRPayment(qrData.transaction_id);
      }
      setStatus('cancelled');
      onCancelRef.current?.();
    } catch (err) {
      console.error('Cancel error:', err);
    }
  }, [qrData?.transaction_id]);

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
    generateQRRef.current();
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

  if (error && !qrData) {
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
                src={qrData?.qr_image_url || '/placeholder-qr.png'} 
                alt="QR Code for Payment"
                className="qr-code-image"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkVycm9yIExvYWRpbmcgUVI8L3RleHQ+PC9zdmc+';
                }}
              />
            </div>
            <p className="qr-instruction">
              สแกน QR Code ด้วยแอพธนาคารของคุณ
            </p>
          </>
        ) : status === 'success' ? (
          <div className="qr-success">
            <div className="success-icon">✅</div>
            <h4>ชำระเงินสำเร็จ!</h4>
            <p>การทำรายการเสร็จสมบูรณ์</p>
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
          <span className="value">{qrData?.transaction_id}</span>
        </div>
        <div className="detail-row">
          <span className="label">สถานะ:</span>
          <span className={`status ${status}`}>
            {status === 'pending' ? '⏳ รอชำระเงิน' :
             status === 'success' ? '✅ ชำระแล้ว' :
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
          <li>เลือกเมนู "โอนเงิน" หรือ "ชำระเงิน"</li>
          <li>สแกน QR Code ที่แสดงด้านบน</li>
          <li>ตรวจสอบจำนวนเงินและกดยืนยัน</li>
          <li>รอระบบตรวจสอบการชำระเงิน</li>
        </ol>
      </div>

      {/* Action Buttons */}
      {status === 'pending' && (
        <div className="qr-actions">
          <button className="cancel-btn" onClick={handleCancel}>
            ❌ ยกเลิก
          </button>
          <button className="refresh-btn" onClick={checkPaymentStatus}>
            🔄 ตรวจสอบสถานะ
          </button>
        </div>
      )}
    </div>
  );
});

QRPayment.displayName = 'QRPayment';

export default QRPayment;