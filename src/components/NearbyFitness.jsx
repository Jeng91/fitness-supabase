// NearbyFitness.jsx - คอมโพเนนต์สำหรับค้นหาฟิตเนสใกล้เคียง
import React, { useState, useEffect } from 'react';
import locationAPI from '../utils/locationAPI';
import MapView from './MapView';
import './NearbyFitness.css';
import { useNavigate } from 'react-router-dom';

const NearbyFitness = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyFitness, setNearbyFitness] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState(''); // 'requesting', 'success', 'error'
  const [statusMessage, setStatusMessage] = useState('');
  const [searchRadius, setSearchRadius] = useState(10); // กิโลเมตร
  const [sortBy, setSortBy] = useState('distance'); // 'distance', 'name', 'type'
  const [selectedFitness, setSelectedFitness] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const navigate = useNavigate();

  // ตรวจสอบสิทธิ์เข้าถึงตำแหน่งและค้นหาฟิตเนสทันทีเมื่อโหลดคอมโพเนนต์
  useEffect(() => {
    const autoSearchFitness = async () => {
      if (locationAPI.isGeolocationSupported()) {
        const permission = await locationAPI.requestLocationPermission();
        
        // ถ้าได้รับอนุญาตแล้ว หรือ ยังไม่เคยถาม ให้ค้นหาทันที
        if (permission === 'granted' || permission === 'prompt' || permission === 'unknown') {
          handleFindNearby(false); // ค้นหาตำแหน่งจริง
        }
      }
    };
    autoSearchFitness();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ฟังก์ชันขอตำแหน่งและค้นหาฟิตเนส
  const handleFindNearby = async (useDemo = false) => {
    setIsLoading(true);
    setLocationStatus('requesting');
    setStatusMessage('กำลังขอสิทธิ์เข้าถึงตำแหน่ง...');

    try {
      let location;
      
      if (useDemo) {
        // ใช้ตำแหน่ง demo (มหาวิทยาลัยมหาสารคาม)
        location = locationAPI.getDemoLocation();
        setStatusMessage('ใช้ตำแหน่ง Demo: มหาวิทยาลัยมหาสารคาม');
      } else {
        // ขอตำแหน่งจริงจากผู้ใช้
        setStatusMessage('กำลังค้นหาตำแหน่งของคุณ...');
        location = await locationAPI.getCurrentLocation();
        setStatusMessage('พบตำแหน่งของคุณแล้ว!');
      }

      setUserLocation(location);
      setLocationStatus('success');

      // ค้นหาฟิตเนสใกล้เคียง
      setStatusMessage('กำลังค้นหาฟิตเนสใกล้เคียง...');
      const result = await locationAPI.findNearbyFitness(
        location.lat, 
        location.lng, 
        searchRadius
      );

      if (result.success) {
        setNearbyFitness(result.data);
        setStatusMessage(result.message);
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('Error finding nearby fitness:', error);
      setLocationStatus('error');
      setStatusMessage(`เกิดข้อผิดพลาด: ${error.message}`);
      setNearbyFitness([]);
    } finally {
      setIsLoading(false);
    }
  };

  // ฟังก์ชันเรียงลำดับผลลัพธ์
  const sortFitnessResults = (data, sortType) => {
    const sorted = [...data];
    switch (sortType) {
      case 'distance':
        return sorted.sort((a, b) => a.distance - b.distance);
      case 'name':
        return sorted.sort((a, b) => a.fit_name.localeCompare(b.fit_name));
      case 'type':
        return sorted.sort((a, b) => (a.fit_type || 'ฟิตเนส').localeCompare(b.fit_type || 'ฟิตเนส'));
      default:
        return sorted;
    }
  };

  // ...existing code...

  // ฟังก์ชันเลือกฟิตเนสจากแผนที่
  const handleFitnessSelectFromMap = (fitness) => {
    setSelectedFitness(fitness);
    // เลื่อนไปยังการ์ดฟิตเนสที่เลือก
    const cardElement = document.getElementById(`fitness-card-${fitness.fit_id}`);
    if (cardElement) {
      cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      cardElement.style.border = '3px solid #e74c3c';
      setTimeout(() => {
        cardElement.style.border = '';
      }, 3000);
    }
  };

  const sortedFitness = sortFitnessResults(nearbyFitness, sortBy);

  // หากพบผลลัพธ์ ให้ตรวจสอบหาฟิตเนสที่ใกล้ที่สุดแล้วเลือกอัตโนมัติ
  useEffect(() => {
    try {
      if (!userLocation || !nearbyFitness || nearbyFitness.length === 0) return;
      // ถ้ามีการเลือกอยู่แล้ว ให้ไม่ทับ
      if (selectedFitness) return;

      const nearest = sortFitnessResults(nearbyFitness, 'distance')[0];
      const AUTO_DISTANCE_KM = 0.2; // ระยะอัตโนมัติ: 200 เมตร

      if (nearest) {
        // กรณีที่มีเพียงรายการเดียว หรือ ฟิตเนสที่ใกล้ที่สุดอยู่ใกล้กว่าเงื่อนไข ให้แสดงอัตโนมัติ
        if (nearbyFitness.length === 1 || nearest.distance <= AUTO_DISTANCE_KM) {
          setSelectedFitness(nearest);
          // เลื่อนการ์ดเข้ามาในมุมมอง และไฮไลต์ชั่วคราว
          setTimeout(() => {
            const el = document.getElementById(`fitness-card-${nearest.fit_id}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.style.boxShadow = '0 8px 24px rgba(102,126,234,0.18)';
              el.style.border = '2px solid rgba(102,126,234,0.3)';
              setTimeout(() => {
                el.style.boxShadow = '';
                el.style.border = '';
              }, 3000);
            }
          }, 250);
        }
      }
    } catch (err) {
      console.error('Auto-select nearest fitness error:', err);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nearbyFitness, userLocation]);

  return (
    <div className="nearby-fitness-container">
      {/* Header */}
      <div className="nearby-header">
        <h2 className="nearby-title">
          <span className="location-icon">📍</span>
          ฟิตเนสใกล้เคียง (รัศมี 10 กิโลเมตร)
        </h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          {nearbyFitness.length > 0 && (
            <button
              onClick={() => setShowMap(!showMap)}
              className="find-nearby-btn"
              style={{ background: 'linear-gradient(135deg, #9b59b6, #8e44ad)' }}
            >
              <span>{showMap ? '📋' : '🗺️'}</span>
              {showMap ? 'รายการ' : 'แผนที่'}
            </button>
          )}
          <button
            onClick={() => handleFindNearby(false)}
            disabled={isLoading}
            className="find-nearby-btn"
            style={{ background: 'linear-gradient(135deg, #27ae60, #229954)' }}
          >
            {isLoading ? (
              <>
                <span>⏳</span>
                กำลังค้นหา...
              </>
            ) : (
              <>
                <span>🔄</span>
                รีเฟรช
              </>
            )}
          </button>
          <button
            onClick={() => handleFindNearby(true)}
            disabled={isLoading}
            className="find-nearby-btn"
            style={{ background: 'linear-gradient(135deg, #f39c12, #e67e22)' }}
          >
            <span>🏫</span>
            Demo
          </button>
        </div>
      </div>

      {/* ตัวเลือกรัศมีการค้นหา - ซ่อนไว้ */}
      <div className="radius-selector" style={{ display: 'none' }}>
        <label htmlFor="radius">รัศมีการค้นหา:</label>
        <input
          id="radius"
          type="number"
          min="1"
          max="50"
          value={searchRadius}
          onChange={(e) => setSearchRadius(parseInt(e.target.value) || 10)}
          className="radius-input"
        />
        <span>กิโลเมตร</span>
      </div>

      {/* แสดงสถานะ */}
      {locationStatus && locationStatus !== 'success' && (
        <div className={`location-status ${locationStatus}`}>
          <span>
            {locationStatus === 'requesting' && '⏳'}
            {locationStatus === 'error' && '❌'}
          </span>
          {statusMessage}
        </div>
      )}

      {/* ข้อมูลตำแหน่งผู้ใช้ */}
      {/* location-info ถูกซ่อน */}
      {false && (
        <div className="location-info">
          <h4>📍 ตำแหน่งของคุณ</h4>
          <div className="location-details">
            <div><strong>ละติจูด:</strong> {userLocation.lat.toFixed(6)}</div>
            <div><strong>ลองจิจูด:</strong> {userLocation.lng.toFixed(6)}</div>
            {userLocation.accuracy && (
              <div><strong>ความแม่นยำ:</strong> ±{Math.round(userLocation.accuracy)} เมตร</div>
            )}
            {userLocation.name && (
              <div><strong>ชื่อสถานที่:</strong> {userLocation.name}</div>
            )}
          </div>
        </div>
      )}

      {/* แสดงการโหลด */}
      {isLoading && (
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      )}

      {/* แสดงแผนที่หรือรายการ */}
      {!isLoading && nearbyFitness.length > 0 && (
        <>
          {showMap ? (
            /* แสดงแผนที่ */
            <div style={{ marginBottom: '20px' }}>
              <MapView
                userLocation={userLocation}
                fitnessLocations={sortedFitness}
                selectedFitness={selectedFitness}
                onFitnessSelect={handleFitnessSelectFromMap}
                mapHeight="500px"
                showControls={true}
              />
            </div>
          ) : (
            /* แสดงรายการฟิตเนส */
            <div className="fitness-results">
              <div className="results-header">
                <div className="results-count">
                  พบฟิตเนส {nearbyFitness.length} แห่ง
                </div>
                <div className="sort-options">
                  <button
                    className={`sort-btn ${sortBy === 'distance' ? 'active' : ''}`}
                    onClick={() => setSortBy('distance')}
                  >
                    ระยะทาง
                  </button>
                  <button
                    className={`sort-btn ${sortBy === 'name' ? 'active' : ''}`}
                    onClick={() => setSortBy('name')}
                  >
                    ชื่อ
                  </button>
                  <button
                    className={`sort-btn ${sortBy === 'type' ? 'active' : ''}`}
                    onClick={() => setSortBy('type')}
                  >
                    ประเภท
                  </button>
                </div>
              </div>

              {/* รายการฟิตเนส */}
              {sortedFitness.map((fitness, index) => (
                <div 
                    key={fitness.fit_id} 
                    id={`fitness-card-${fitness.fit_id}`}
                    className="fitness-card modern"
                  >
                  <div className="fitness-card-imgwrap">
                    <img 
                      src={fitness.fit_image || '/default-fitness.png'} 
                      alt={fitness.fit_name}
                      className="fitness-card-img"
                      onError={e => e.target.style.display = 'none'}
                    />
                    <button className="favorite-btn" title="เพิ่มในรายการโปรด">
                      <span role="img" aria-label="favorite">♡</span>
                    </button>
                  </div>
                  <div className="fitness-card-content">
                    <div className="fitness-card-title">{fitness.fit_name}</div>
                    <div className="fitness-card-address">
                      <span role="img" aria-label="address">📍</span> {fitness.fit_address}
                    </div>
                    <div className="fitness-card-price-rating">
                      <div className="fitness-card-price">
                        <span className="price-label">เริ่มต้นที่</span>
                        <span className="price-value">{fitness.fit_price ? Number(fitness.fit_price).toFixed(2) : '-'} บาท/วัน</span>
                      </div>
                      <div className="fitness-card-rating">
                        <span className="rating-value">{fitness.rating || '9.6'}</span>
                        <span className="rating-count">{fitness.review_count || '138'} ความคิดเห็น</span>
                      </div>
                    </div>
                    <button className="view-details-btn" onClick={() => navigate(`/fitness/${fitness.fit_id}`)}>
                      ดูรายละเอียด
                    </button>
                    {/* เพิ่มปุ่มลิ้งค์ไปหน้ารายละเอียดฟิตเนส */}
                    
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ไม่พบผลลัพธ์ */}
      {!isLoading && nearbyFitness.length === 0 && locationStatus === 'success' && (
        <div className="no-results">
          <div className="no-results-icon">🔍</div>
          <h3>ไม่พบฟิตเนสใกล้เคียง</h3>
          <p>ลองเพิ่มรัศมีการค้นหาหรือเปลี่ยนตำแหน่ง</p>
        </div>
      )}

      {/* คำแนะนำสำหรับผู้ใช้ใหม่ */}
      {!userLocation && !isLoading && locationStatus !== 'error' && (
        <div className="demo-notice">
          <span className="demo-notice-icon">🎯</span>
          <div className="demo-notice-text">
            <strong>กำลังค้นหาฟิตเนสใกล้เคียง...</strong> ระบบจะขอสิทธิ์เข้าถึงตำแหน่งของคุณเพื่อค้นหาฟิตเนสในรัศมี 10 กิโลเมตร
          </div>
        </div>
      )}

      {/* แสดงข้อความเมื่อถูกปฏิเสธสิทธิ์ */}
      {locationStatus === 'error' && (
        <div className="demo-notice" style={{ background: '#fff5f5', borderColor: '#feb2b2' }}>
          <span className="demo-notice-icon" style={{ color: '#e53e3e' }}>🚫</span>
          <div className="demo-notice-text" style={{ color: '#c53030' }}>
            <strong>ไม่สามารถเข้าถึงตำแหน่งได้:</strong> กรุณาอนุญาตการเข้าถึงตำแหน่งในเบราว์เซอร์ หรือกดปุ่ม "Demo" เพื่อทดสอบระบบ
          </div>
        </div>
      )}
    </div>
  );
};

export default NearbyFitness;