import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../supabaseClient';

const QRGenerator = ({ ownerData, onUpdate }) => {
  const [fitnessData, setFitnessData] = useState(null);
  const [qrData, setQrData] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [qrSize, setQrSize] = useState(256);
  const [includeInfo, setIncludeInfo] = useState({
    name: true,
    address: true,
    phone: true,
    price: true,
    website: false
  });

  const generateQRData = useCallback((fitness) => {
    if (!fitness) return;

    let qrText = '';
    
    if (includeInfo.name && fitness.fit_name) {
      qrText += `🏋️ ${fitness.fit_name}\n`;
    }
    
    if (includeInfo.address && fitness.fit_address) {
      qrText += `📍 ${fitness.fit_address}\n`;
    }
    
    if (includeInfo.phone && fitness.fit_phone) {
      qrText += `📞 ${fitness.fit_phone}\n`;
    }
    
    if (includeInfo.price && fitness.fit_price) {
      qrText += `💰 ราคา: ฿${fitness.fit_price}\n`;
    }
    
    if (includeInfo.website && fitness.fit_website) {
      qrText += `🌐 ${fitness.fit_website}\n`;
    }

    // Add booking URL or fitness ID for online booking
    qrText += `\n🔗 รหัสฟิตเนส: ${fitness.fit_id}`;
    qrText += `\n📱 จองออนไลน์: ${window.location.origin}/book/${fitness.fit_id}`;

    setQrData(qrText.trim());
  }, [includeInfo]);

  const loadFitnessData = useCallback(async () => {
    if (!ownerData?.owner_id) return;

    setLoading(true);
    try {
      const { data: fitness, error: fitnessError } = await supabase
        .from('tbl_fitness')
        .select('*')
        .eq('owner_id', ownerData.owner_id)
        .single();

      if (fitnessError) {
        console.error('Error loading fitness data:', fitnessError);
        setError('ไม่พบข้อมูลฟิตเนส');
        return;
      }

      setFitnessData(fitness);
      generateQRData(fitness);
    } catch (error) {
      console.error('Error:', error);
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล');
    } finally {
      setLoading(false);
    }
  }, [ownerData?.owner_id, generateQRData]);

  const generateQRCode = useCallback(() => {
    if (!qrData) return;

    // Using QR Server API to generate QR code
    const encodedData = encodeURIComponent(qrData);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodedData}&format=png&margin=10`;
    setQrCodeUrl(qrUrl);
  }, [qrData, qrSize]);

  const downloadQRCode = () => {
    if (!qrCodeUrl) return;

    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `${fitnessData?.fit_name || 'fitness'}-qr-code.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyQRData = () => {
    if (!qrData) return;
    
    navigator.clipboard.writeText(qrData).then(() => {
      alert('คัดลอกข้อมูลเรียบร้อยแล้ว');
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  };

  useEffect(() => {
    loadFitnessData();
  }, [loadFitnessData]);

  useEffect(() => {
    if (fitnessData) {
      generateQRData(fitnessData);
    }
  }, [includeInfo, fitnessData, generateQRData]);

  useEffect(() => {
    if (qrData) {
      generateQRCode();
    }
  }, [qrData, qrSize, generateQRCode]);

  if (loading) {
    return <div className="loading">กำลังโหลดข้อมูลฟิตเนส...</div>;
  }

  if (error) {
    return (
      <div className="error-state">
        <h3>เกิดข้อผิดพลาด</h3>
        <p>{error}</p>
        <button className="btn-primary" onClick={loadFitnessData}>
          ลองใหม่
        </button>
      </div>
    );
  }

  if (!fitnessData) {
    return (
      <div className="empty-state">
        <h3>ไม่พบข้อมูลฟิตเนส</h3>
        <p>กรุณาเพิ่มข้อมูลฟิตเนสของคุณก่อนสร้าง QR Code</p>
      </div>
    );
  }

  return (
    <div className="qr-generator">
      <div className="section-header">
        <h2>📱 สร้าง QR Code ร้านฟิตเนส</h2>
        <button className="btn-primary" onClick={loadFitnessData}>
          🔄 รีเฟรช
        </button>
      </div>

      <div className="qr-content">
        <div className="qr-settings">
          <div className="settings-group">
            <h3>ข้อมูลที่จะแสดงใน QR Code</h3>
            <div className="checkbox-group">
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={includeInfo.name}
                  onChange={(e) => setIncludeInfo({...includeInfo, name: e.target.checked})}
                />
                <span>ชื่อฟิตเนส</span>
              </label>
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={includeInfo.address}
                  onChange={(e) => setIncludeInfo({...includeInfo, address: e.target.checked})}
                />
                <span>ที่อยู่</span>
              </label>
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={includeInfo.phone}
                  onChange={(e) => setIncludeInfo({...includeInfo, phone: e.target.checked})}
                />
                <span>เบอร์โทรศัพท์</span>
              </label>
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={includeInfo.price}
                  onChange={(e) => setIncludeInfo({...includeInfo, price: e.target.checked})}
                />
                <span>ราคา</span>
              </label>
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={includeInfo.website}
                  onChange={(e) => setIncludeInfo({...includeInfo, website: e.target.checked})}
                />
                <span>เว็บไซต์</span>
              </label>
            </div>
          </div>

          <div className="settings-group">
            <h3>ขนาด QR Code</h3>
            <div className="size-options">
              {[128, 256, 512, 1024].map(size => (
                <button
                  key={size}
                  className={`size-btn ${qrSize === size ? 'active' : ''}`}
                  onClick={() => setQrSize(size)}
                >
                  {size}x{size}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="qr-display">
          <div className="qr-preview">
            <h3>QR Code ของร้านฟิตเนส</h3>
            {qrCodeUrl ? (
              <div className="qr-image-container">
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code ฟิตเนส" 
                  className="qr-image"
                />
                <div className="qr-actions">
                  <button className="btn-primary" onClick={downloadQRCode}>
                    📥 ดาวน์โหลด QR Code
                  </button>
                  <button className="btn-secondary" onClick={copyQRData}>
                    📋 คัดลอกข้อมูล
                  </button>
                </div>
              </div>
            ) : (
              <div className="qr-placeholder">
                <span className="icon">📱</span>
                <p>กำลังสร้าง QR Code...</p>
              </div>
            )}
          </div>

          <div className="qr-data-preview">
            <h3>ข้อมูลใน QR Code</h3>
            <div className="data-content">
              {qrData ? (
                <pre>{qrData}</pre>
              ) : (
                <p>เลือกข้อมูลที่ต้องการแสดงใน QR Code</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="fitness-info-summary">
        <h3>ข้อมูลฟิตเนสของคุณ</h3>
        <div className="info-grid">
          <div className="info-item">
            <strong>ชื่อ:</strong> {fitnessData?.fit_name || 'ไม่ระบุ'}
          </div>
          <div className="info-item">
            <strong>ที่อยู่:</strong> {fitnessData?.fit_address || 'ไม่ระบุ'}
          </div>
          <div className="info-item">
            <strong>โทรศัพท์:</strong> {fitnessData?.fit_phone || 'ไม่ระบุ'}
          </div>
          <div className="info-item">
            <strong>ราคา:</strong> {fitnessData?.fit_price ? `฿${fitnessData.fit_price}` : 'ไม่ระบุ'}
          </div>
          <div className="info-item">
            <strong>เว็บไซต์:</strong> {fitnessData?.fit_website || 'ไม่ระบุ'}
          </div>
          <div className="info-item">
            <strong>รหัสฟิตเนส:</strong> {fitnessData?.fit_id}
          </div>
        </div>
        <div className="info-note">
          <p>💡 <strong>คำแนะนำ:</strong> นำ QR Code นี้ไปติดที่ร้านฟิตเนสของคุณ ลูกค้าสามารถสแกนเพื่อดูข้อมูลและจองได้ทันที</p>
        </div>
      </div>
    </div>
  );
};

export default QRGenerator;