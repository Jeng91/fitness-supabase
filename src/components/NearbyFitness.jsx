// NearbyFitness.jsx - คอมโพเนนต์สำหรับค้นหาฟิตเนสใกล้เคียง
import React, { useState, useEffect } from 'react';
import locationAPI from '../utils/locationAPI';
import MapView from './MapView';
import './NearbyFitness.css';

const NearbyFitness = () => {
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyFitness, setNearbyFitness] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState(''); // 'requesting', 'success', 'error'
  const [statusMessage, setStatusMessage] = useState('');
  const [searchRadius, setSearchRadius] = useState(10); // กิโลเมตร
  const [sortBy, setSortBy] = useState('distance'); // 'distance', 'name', 'type'
  const [permissionState, setPermissionState] = useState('unknown');
  const [selectedFitness, setSelectedFitness] = useState(null);
  const [showMap, setShowMap] = useState(false);

  // ตรวจสอบสิทธิ์เข้าถึงตำแหน่งเมื่อโหลดคอมโพเนนต์
  useEffect(() => {
    const checkPermission = async () => {
      if (locationAPI.isGeolocationSupported()) {
        const permission = await locationAPI.requestLocationPermission();
        setPermissionState(permission);
      }
    };
    checkPermission();
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

  // ฟังก์ชันเปิด Google Maps เพื่อดูเส้นทาง
  const handleGetDirections = (fitness) => {
    if (userLocation && fitness.coordinates) {
      locationAPI.openDirections(
        userLocation.lat,
        userLocation.lng,
        fitness.coordinates.lat,
        fitness.coordinates.lng,
        fitness.fit_name
      );
    }
  };

  // ฟังก์ชันเปิด Google Maps เพื่อดูตำแหน่ง
  const handleViewLocation = (fitness) => {
    if (fitness.coordinates) {
      locationAPI.openLocationMap(
        fitness.coordinates.lat,
        fitness.coordinates.lng,
        fitness.fit_name
      );
    }
  };

  // ฟังก์ชันการติดต่อ (โทร)
  const handleContact = (phone) => {
    if (phone) {
      window.open(`tel:${phone}`, '_self');
    }
  };

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

  return (
    <div className="nearby-fitness-container">
      {/* Header */}
      <div className="nearby-header">
        <h2 className="nearby-title">
          <span className="location-icon">📍</span>
          ค้นหาฟิตเนสใกล้เคียง
        </h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => handleFindNearby(false)}
            disabled={isLoading}
            className="find-nearby-btn"
          >
            {isLoading ? (
              <>
                <span>⏳</span>
                กำลังค้นหา...
              </>
            ) : (
              <>
                <span>🎯</span>
                ค้นหาใกล้ฉัน
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
            ใช้ตำแหน่ง Demo
          </button>
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
        </div>
      </div>

      {/* ตัวเลือกรัศมีการค้นหา */}
      <div className="radius-selector">
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
      {locationStatus && (
        <div className={`location-status ${locationStatus}`}>
          <span>
            {locationStatus === 'requesting' && '⏳'}
            {locationStatus === 'success' && '✅'}
            {locationStatus === 'error' && '❌'}
          </span>
          {statusMessage}
        </div>
      )}

      {/* ข้อมูลตำแหน่งผู้ใช้ */}
      {userLocation && (
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
                  className={`fitness-card ${selectedFitness?.fit_id === fitness.fit_id ? 'selected' : ''}`}
                  onClick={() => setSelectedFitness(fitness)}
                >
                  <div className="fitness-card-header">
                    <div className="fitness-basic-info">
                      <h3>{fitness.fit_name}</h3>
                      <span className="fitness-type">{fitness.fit_type || 'ฟิตเนส'}</span>
                    </div>
                    <div className="distance-badge">
                      <span>📏</span>
                      {fitness.distanceText}
                    </div>
                  </div>

                  <div className="fitness-details">
                    <div className="detail-item">
                      <span className="detail-icon">📍</span>
                      <span>{fitness.fit_address}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-icon">📞</span>
                      <span>{fitness.fit_phone || 'ไม่ระบุ'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-icon">⏰</span>
                      <span>
                        {fitness.fit_dateopen && fitness.fit_dateclose 
                          ? `${fitness.fit_dateopen} - ${fitness.fit_dateclose}` 
                          : 'ไม่ระบุเวลาเปิด-ปิด'
                        }
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-icon">💰</span>
                      <span>ราคาเริ่มต้น {fitness.fit_price || 'ไม่ระบุ'} บาท</span>
                    </div>
                  </div>

                  <div className="fitness-actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGetDirections(fitness);
                      }}
                      className="action-btn primary"
                    >
                      <span>🗺️</span>
                      นำทาง
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewLocation(fitness);
                      }}
                      className="action-btn secondary"
                    >
                      <span>📍</span>
                      ดูแผนที่
                    </button>
                    {fitness.fit_phone && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleContact(fitness.fit_phone);
                        }}
                        className="action-btn outline"
                      >
                        <span>📞</span>
                        โทร
                      </button>
                    )}
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
      {!userLocation && !isLoading && (
        <div className="demo-notice">
          <span className="demo-notice-icon">💡</span>
          <div className="demo-notice-text">
            <strong>คำแนะนำ:</strong> กดปุ่ม "ค้นหาใกล้ฉัน" เพื่อใช้ตำแหน่งจริง หรือ "ใช้ตำแหน่ง Demo" เพื่อทดสอบระบบ
          </div>
        </div>
      )}
    </div>
  );
};

export default NearbyFitness;