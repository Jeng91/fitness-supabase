import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from './Layout';
import './PaymentPage.css';

const PaymentPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const bookingData = location.state?.bookingData;

  useEffect(() => {
    if (!bookingData) {
      alert('ไม่พบข้อมูลการจอง');
      navigate('/');
    }
  }, [bookingData, navigate]);

  const handleBack = () => {
    navigate('/');
  };

  const handlePayment = () => {
    alert('จำลองการชำระเงินสำเร็จ!');
    navigate('/');
  };

  if (!bookingData) {
    return <div>กำลังโหลด...</div>;
  }

  return (
    <Layout>
      <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
        <button onClick={handleBack} style={{ marginBottom: '20px', padding: '10px' }}>
          ← กลับ
        </button>
        
        <h1>💳 ชำระเงิน</h1>
        
        <div style={{ background: '#f8f9fa', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
          <h3>📋 สรุปการจอง</h3>
          <p><strong>ยิม:</strong> {bookingData.fitnessName}</p>
          <p><strong>วันที่:</strong> {bookingData.booking_date}</p>
          <p><strong>ราคา:</strong> {bookingData.total_amount} บาท</p>
        </div>

        <div style={{ background: 'white', padding: '20px', border: '1px solid #ddd', borderRadius: '8px' }}>
          <h3>💳 ข้อมูลการชำระเงิน</h3>
          <input
            type="text"
            placeholder="หมายเลขบัตร"
            style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '4px', border: '1px solid #ddd' }}
          />
          <input
            type="email"
            placeholder="อีเมล"
            style={{ width: '100%', padding: '10px', margin: '10px 0', borderRadius: '4px', border: '1px solid #ddd' }}
          />
          
          <div style={{ marginTop: '30px', textAlign: 'center' }}>
            <button
              onClick={handlePayment}
              style={{
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                padding: '15px 30px',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer'
              }}
            >
              ชำระเงิน {bookingData.total_amount} บาท
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default PaymentPage;