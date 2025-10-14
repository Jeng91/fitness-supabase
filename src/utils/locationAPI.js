// locationAPI.js - ระบบจัดการตำแหน่งและค้นหาฟิตเนสใกล้เคียง
import supabase from '../supabaseClient';

// ฟังก์ชันคำนวณระยะทางระหว่าง 2 จุด (Haversine formula)
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // รัศมีโลก (กิโลเมตร)
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance; // ระยะทางในกิโลเมตร
};

// ฟังก์ชันขอตำแหน่งปัจจุบันของผู้ใช้
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 นาที
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        switch(error.code) {
          case error.PERMISSION_DENIED:
            reject(new Error('การเข้าถึงตำแหน่งถูกปฏิเสธโดยผู้ใช้'));
            break;
          case error.POSITION_UNAVAILABLE:
            reject(new Error('ข้อมูลตำแหน่งไม่สามารถใช้ได้'));
            break;
          case error.TIMEOUT:
            reject(new Error('การขอตำแหน่งหมดเวลา'));
            break;
          default:
            reject(new Error('เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ'));
            break;
        }
      },
      options
    );
  });
};

// ฟังก์ชันค้นหาฟิตเนสใกล้เคียง
export const findNearbyFitness = async (userLat, userLng, radiusKm = 10) => {
  try {
    console.log('🔍 Searching for fitness near:', userLat, userLng, 'within', radiusKm, 'km');
    
    // ดึงข้อมูลฟิตเนสทั้งหมดที่มีพิกัด (tbl_fitness = ข้อมูลที่ approved แล้ว)
    const { data: fitnessData, error } = await supabase
      .from('tbl_fitness')
      .select('*')
      .not('fit_location', 'is', null)
      .not('fit_location', 'eq', '');

    if (error) {
      console.error('Error fetching fitness data:', error);
      throw error;
    }

    if (!fitnessData || fitnessData.length === 0) {
      return { success: true, data: [], message: 'ไม่พบฟิตเนสในระบบ' };
    }

    // คำนวณระยะทางและเรียงลำดับ
    const fitnessWithDistance = fitnessData
      .map(fitness => {
        // ตรวจสอบและแปลงพิกัด
        let fitnessLat, fitnessLng;
        
        if (fitness.fit_location) {
          const coords = fitness.fit_location.split(',');
          if (coords.length >= 2) {
            fitnessLat = parseFloat(coords[0].trim());
            fitnessLng = parseFloat(coords[1].trim());
          }
        }

        // ถ้าไม่มีพิกัดหรือพิกัดไม่ถูกต้อง ข้าม
        if (!fitnessLat || !fitnessLng || isNaN(fitnessLat) || isNaN(fitnessLng)) {
          return null;
        }

        // คำนวณระยะทาง
        const distance = calculateDistance(userLat, userLng, fitnessLat, fitnessLng);
        
        return {
          ...fitness,
          distance: distance,
          distanceText: distance < 1 ? 
            `${Math.round(distance * 1000)} เมตร` : 
            `${distance.toFixed(1)} กิโลเมตร`,
          coordinates: {
            lat: fitnessLat,
            lng: fitnessLng
          }
        };
      })
      .filter(Boolean) // ลบรายการที่เป็น null
      .filter(fitness => fitness.distance <= radiusKm) // กรองเฉพาะที่อยู่ในรัศมี
      .sort((a, b) => a.distance - b.distance); // เรียงตามระยะทาง

    console.log(`🎯 Found ${fitnessWithDistance.length} fitness centers within ${radiusKm}km`);

    return {
      success: true,
      data: fitnessWithDistance,
      userLocation: { lat: userLat, lng: userLng },
      message: `พบฟิตเนส ${fitnessWithDistance.length} แห่ง ในรัศมี ${radiusKm} กิโลเมตร`
    };

  } catch (error) {
    console.error('Error in findNearbyFitness:', error);
    return {
      success: false,
      data: [],
      error: error.message
    };
  }
};

// ฟังก์ชันเปิด Google Maps สำหรับ directions
export const openDirections = (fromLat, fromLng, toLat, toLng, fitnessName = '') => {
  const url = `https://www.google.com/maps/dir/${fromLat},${fromLng}/${toLat},${toLng}`;
  window.open(url, '_blank');
};

// ฟังก์ชันเปิด Google Maps แสดงตำแหน่ง
export const openLocationMap = (lat, lng, name = '') => {
  const url = `https://www.google.com/maps?q=${lat},${lng}&z=15`;
  window.open(url, '_blank');
};

// ฟังก์ชันแปลงพิกัดเป็น address (Reverse Geocoding) - ใช้ Google Maps API
export const reverseGeocode = async (lat, lng) => {
  try {
    // สำหรับการใช้งานจริง ต้องมี Google Maps API Key
    // ตอนนี้ return พิกัดเป็น string
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
};

// ฟังก์ชันตรวจสอบว่าเบราว์เซอร์รองรับ Geolocation หรือไม่
export const isGeolocationSupported = () => {
  return 'geolocation' in navigator;
};

// ฟังก์ชันขอสิทธิ์เข้าถึงตำแหน่ง
export const requestLocationPermission = async () => {
  try {
    const permission = await navigator.permissions.query({name: 'geolocation'});
    return permission.state; // 'granted', 'denied', 'prompt'
  } catch (error) {
    console.warn('Permission API not supported:', error);
    return 'unknown';
  }
};

// ฟังก์ชันสำหรับ demo (ใช้ตำแหน่งมหาวิทยาลัยมหาสารคาม)
export const getDemoLocation = () => {
  return {
    lat: 16.246825,
    lng: 103.255075,
    name: 'มหาวิทยาลัยมหาสารคาม'
  };
};

// Export default object
const locationAPI = {
  calculateDistance,
  getCurrentLocation,
  findNearbyFitness,
  openDirections,
  openLocationMap,
  reverseGeocode,
  isGeolocationSupported,
  requestLocationPermission,
  getDemoLocation
};

export default locationAPI;