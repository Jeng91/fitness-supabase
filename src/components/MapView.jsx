// MapView.jsx - คอมโพเนนต์แสดงแผนที่ Google Maps
import React, { useState, useEffect } from 'react';
import './MapView.css';

const MapView = ({ 
  userLocation, 
  fitnessLocations = [], 
  selectedFitness = null,
  onFitnessSelect = () => {},
  mapHeight = '400px',
  showControls = true 
}) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapInstance, setMapInstance] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [mapError, setMapError] = useState(null);

  // โหลด Google Maps API
  useEffect(() => {
    if (window.google && window.google.maps) {
      setMapLoaded(true);
      return;
    }

    const loadGoogleMaps = () => {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = () => setMapLoaded(true);
      script.onerror = () => setMapError('ไม่สามารถโหลด Google Maps ได้');
      document.head.appendChild(script);
    };

    loadGoogleMaps();
  }, []);

  // สร้างแผนที่เมื่อโหลดเสร็จ
  useEffect(() => {
    if (!mapLoaded || !userLocation) return;

    const mapContainer = document.getElementById('google-map');
    if (!mapContainer) return;

    try {
      // กำหนดตำแหน่งเริ่มต้น
      const center = userLocation ? 
        { lat: userLocation.lat, lng: userLocation.lng } :
        { lat: 16.246825, lng: 103.255075 }; // มหาวิทยาลัยมหาสารคาม

      // สร้างแผนที่
      const map = new window.google.maps.Map(mapContainer, {
        zoom: 13,
        center: center,
        mapTypeId: 'roadmap',
        zoomControl: showControls,
        mapTypeControl: showControls,
        scaleControl: showControls,
        streetViewControl: showControls,
        rotateControl: showControls,
        fullscreenControl: showControls,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'on' }]
          }
        ]
      });

      setMapInstance(map);

      // เพิ่มมาร์กเกอร์สำหรับตำแหน่งผู้ใช้
      if (userLocation) {
        const userMarker = new window.google.maps.Marker({
          position: { lat: userLocation.lat, lng: userLocation.lng },
          map: map,
          title: 'ตำแหน่งของคุณ',
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
                <circle cx="16" cy="16" r="8" fill="#4285f4" stroke="white" stroke-width="3"/>
                <circle cx="16" cy="16" r="3" fill="white"/>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(32, 32),
            anchor: new window.google.maps.Point(16, 16)
          }
        });

        // Info Window สำหรับตำแหน่งผู้ใช้
        const userInfoWindow = new window.google.maps.InfoWindow({
          content: `
            <div style="padding: 8px; max-width: 200px;">
              <h4 style="margin: 0 0 4px 0; color: #333;">📍 ตำแหน่งของคุณ</h4>
              <p style="margin: 0; font-size: 12px; color: #666;">
                ${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}
              </p>
            </div>
          `
        });

        userMarker.addListener('click', () => {
          userInfoWindow.open(map, userMarker);
        });

        setMarkers(prev => [...prev, { marker: userMarker, type: 'user' }]);
      }

    } catch (error) {
      console.error('Error creating map:', error);
      setMapError('เกิดข้อผิดพลาดในการสร้างแผนที่');
    }
  }, [mapLoaded, userLocation, showControls]);

  // เพิ่มมาร์กเกอร์สำหรับฟิตเนส
  useEffect(() => {
    if (!mapInstance || !fitnessLocations.length) return;

    // ลบมาร์กเกอร์ฟิตเนสเก่า
    markers.forEach(({ marker, type }) => {
      if (type === 'fitness') {
        marker.setMap(null);
      }
    });

    const newMarkers = markers.filter(({ type }) => type !== 'fitness');

    // เพิ่มมาร์กเกอร์ใหม่
    fitnessLocations.forEach((fitness, index) => {
      if (!fitness.coordinates) return;

      const isSelected = selectedFitness && selectedFitness.fit_id === fitness.fit_id;
      
      const fitnessMarker = new window.google.maps.Marker({
        position: { 
          lat: fitness.coordinates.lat, 
          lng: fitness.coordinates.lng 
        },
        map: mapInstance,
        title: fitness.fit_name,
        icon: {
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
              <circle cx="20" cy="20" r="18" fill="${isSelected ? '#e74c3c' : '#27ae60'}" stroke="white" stroke-width="3"/>
              <text x="20" y="25" text-anchor="middle" fill="white" font-size="16" font-weight="bold">🏋️</text>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(40, 40),
          anchor: new window.google.maps.Point(20, 20)
        },
        zIndex: isSelected ? 1000 : 100
      });

      // Info Window สำหรับฟิตเนส
      const fitnessInfoWindow = new window.google.maps.InfoWindow({
        content: `
          <div style="padding: 12px; max-width: 280px;">
            <h4 style="margin: 0 0 8px 0; color: #333; font-size: 16px;">
              🏋️ ${fitness.fit_name}
            </h4>
            <p style="margin: 0 0 6px 0; font-size: 13px; color: #666;">
              📍 ${fitness.fit_address}
            </p>
            <p style="margin: 0 0 6px 0; font-size: 13px; color: #666;">
              📏 ${fitness.distanceText || 'ไม่ทราบระยะทาง'}
            </p>
            <p style="margin: 0 0 8px 0; font-size: 13px; color: #666;">
              💰 เริ่มต้น ${fitness.fit_price || 'ไม่ระบุ'} บาท
            </p>
            <div style="display: flex; gap: 8px; margin-top: 8px;">
              <button 
                onclick="window.open('https://www.google.com/maps/dir/${userLocation?.lat},${userLocation?.lng}/${fitness.coordinates.lat},${fitness.coordinates.lng}', '_blank')"
                style="background: #27ae60; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;"
              >
                🗺️ นำทาง
              </button>
              <button 
                onclick="if(window.onFitnessSelect) window.onFitnessSelect(${JSON.stringify(fitness).replace(/"/g, '&quot;')})"
                style="background: #3498db; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;"
              >
                📋 รายละเอียด
              </button>
            </div>
          </div>
        `
      });

      fitnessMarker.addListener('click', () => {
        fitnessInfoWindow.open(mapInstance, fitnessMarker);
        onFitnessSelect(fitness);
      });

      newMarkers.push({ marker: fitnessMarker, type: 'fitness', fitness });
    });

    setMarkers(newMarkers);

    // ปรับขนาดแผนที่ให้เห็นทุกจุด
    if (fitnessLocations.length > 0 && userLocation) {
      const bounds = new window.google.maps.LatLngBounds();
      
      // เพิ่มตำแหน่งผู้ใช้
      bounds.extend({ lat: userLocation.lat, lng: userLocation.lng });
      
      // เพิ่มตำแหน่งฟิตเนส
      fitnessLocations.forEach(fitness => {
        if (fitness.coordinates) {
          bounds.extend({ 
            lat: fitness.coordinates.lat, 
            lng: fitness.coordinates.lng 
          });
        }
      });

      mapInstance.fitBounds(bounds);
      
      // ตั้งค่า zoom สูงสุด
      const listener = window.google.maps.event.addListener(mapInstance, 'idle', () => {
        if (mapInstance.getZoom() > 16) {
          mapInstance.setZoom(16);
        }
        window.google.maps.event.removeListener(listener);
      });
    }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapInstance, fitnessLocations, selectedFitness, userLocation, onFitnessSelect]);

  // เปิดใช้ callback สำหรับ Info Window
  useEffect(() => {
    window.onFitnessSelect = onFitnessSelect;
    return () => {
      delete window.onFitnessSelect;
    };
  }, [onFitnessSelect]);

  if (mapError) {
    return (
      <div className="map-error" style={{ height: mapHeight }}>
        <div className="error-content">
          <span className="error-icon">🗺️❌</span>
          <h3>ไม่สามารถโหลดแผนที่ได้</h3>
          <p>{mapError}</p>
          <small>กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต</small>
        </div>
      </div>
    );
  }

  if (!mapLoaded) {
    return (
      <div className="map-loading" style={{ height: mapHeight }}>
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>กำลังโหลดแผนที่...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="map-container" style={{ height: mapHeight }}>
      <div id="google-map" style={{ width: '100%', height: '100%' }}></div>
      
      {/* แสดงจำนวนฟิตเนส */}
      {fitnessLocations.length > 0 && (
        <div className="map-overlay">
          <div className="fitness-count-badge">
            🏋️ {fitnessLocations.length} แห่ง
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;