import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../supabaseClient';
import './MainPartners.css';
import FitnessManagement from './FitnessManagement';
import EquipmentManagement from './EquipmentManagement';

const MainPartners = ({ user, onLogout, onNavigateToHome }) => {
  const [partnerData, setPartnerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');
  
  // Cache states เพื่อลด re-loading
  const [dataLoaded, setDataLoaded] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(null);
  
  // State สำหรับ components ใหม่
  const [fitnessData, setFitnessData] = useState(null);
  const [equipmentList, setEquipmentList] = useState([]);

  // Debug: ตรวจสอบว่า onLogout ถูกส่งมาหรือไม่
  console.log('MainPartners received onLogout:', typeof onLogout);

  // Callback functions for child components
  const handleFitnessUpdate = useCallback((updatedFitnessData) => {
    setFitnessData(updatedFitnessData);
    console.log('🔄 Fitness data updated:', updatedFitnessData);
  }, []);

  const handleEquipmentUpdate = useCallback((updatedEquipmentList) => {
    setEquipmentList(updatedEquipmentList);
    console.log('🔄 Equipment list updated:', updatedEquipmentList);
  }, []);

  useEffect(() => {
    if (user?.id && !dataLoaded) {
      fetchPartnerData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, dataLoaded]);
  
  // Cache refresh every 5 minutes
  useEffect(() => {
    if (dataLoaded && lastFetchTime) {
      const refreshInterval = setInterval(() => {
        const now = Date.now();
        const timeDiff = now - lastFetchTime;
        
        // Refresh data every 5 minutes (300000ms) only if user is active
        if (timeDiff > 300000 && document.visibilityState === 'visible') {
          console.log('🔄 Refreshing data after 5 minutes');
          setDataLoaded(false);
        }
      }, 60000); // Check every minute
      
      return () => clearInterval(refreshInterval);
    }
  }, [dataLoaded, lastFetchTime]);



  const handleLogoutClick = () => {
    console.log('Logout button clicked in MainPartners');
    if (typeof onLogout === 'function') {
      console.log('Calling onLogout function...');
      onLogout();
    } else {
      console.error('onLogout is not a function:', onLogout);
    }
  };

  const fetchPartnerData = async () => {
    try {
      setLoading(true);
      console.log('📊 Fetching partner data...');
      
      const { data, error } = await supabase
        .from('tbl_owner')
        .select('*')
        .eq('auth_user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching partner data:', error);
      } else {
        setPartnerData(data);
        setDataLoaded(true);
        setLastFetchTime(Date.now());
        console.log('✅ Partner data loaded and cached');
        
        // โหลดข้อมูลฟิตเนสถ้ายังไม่ได้โหลด
        if (!fitnessDataLoaded) {
          loadExistingFitnessData(data);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันสำหรับโหลดข้อมูลฟิตเนสที่มีอยู่แล้ว
  const loadExistingFitnessData = async (partnerInfo = null) => {
    try {
      const currentPartner = partnerInfo || partnerData;
      if (!currentPartner?.owner_name) return;
      
      console.log('📊 Loading existing fitness data...');
      
      // ใช้ fit_user แทน fit_owner_id เพราะ fit_owner_id ไม่มีในตาราง
      const { data, error } = await supabase
        .from('tbl_fitness')
        .select('*')
        .eq('fit_user', currentPartner.owner_name)
        .single();

      if (data && !error) {
        // โหลดรูปรองจาก localStorage
        const savedSecondaryImages = localStorage.getItem(`fitness_secondary_${data.id}`);
        const secondaryImages = savedSecondaryImages ? JSON.parse(savedSecondaryImages) : [];

        setFitnessData({
          id: data.id, // เก็บ fitness ID
          fit_name: data.fit_name || '',
          fit_user: data.fit_user || '',
          fit_price: data.fit_price || '',
          fit_image: data.fit_image || '',
          fit_image_secondary: Array.isArray(secondaryImages) ? secondaryImages : [],
          fit_address: data.fit_address || '',
          fit_contact: data.fit_contact || '',
          fit_dateopen: data.fit_dateopen || '',
          fit_dateclose: data.fit_dateclose || '',
          fit_location: data.fit_location || '',
          fit_moredetails: data.fit_moredetails || '',
          fit_phone: data.fit_phone || ''
        });

        // โหลดพิกัดถ้ามี
        if (data.fit_location) {
          const coords = data.fit_location.split(',');
          if (coords.length === 2) {
            setCoordinates({
              lat: parseFloat(coords[0].trim()),
              lng: parseFloat(coords[1].trim())
            });
          }
        }

        console.log('✅ โหลดข้อมูลฟิตเนสที่มีอยู่แล้วสำเร็จ');
        setFitnessDataLoaded(true);
        setHasFitnessData(true);
        setFitnessMode('view'); // เซ็ตเป็น view mode เมื่อโหลดข้อมูลสำเร็จ
      } else {
        console.log('ℹ️ ไม่พบข้อมูลฟิตเนสที่มีอยู่แล้ว');
        setFitnessDataLoaded(true);
        setHasFitnessData(false);
        setFitnessMode('view'); // เซ็ตเป็น view แต่จะแสดงปุ่มสร้างใหม่
      }
    } catch (error) {
      console.error('Error loading existing fitness data:', error);
      setFitnessDataLoaded(true);
      setHasFitnessData(false);
    }
  };

  const handleSectionChange = (section) => {
    console.log(`🔄 Switching to section: ${section}`);
    setActiveSection(section);
    
    // บันทึก section ปัจจุบันใน localStorage
    localStorage.setItem(`partner_active_section_${user?.id}`, section);
  };
  
  // โหลด active section จาก localStorage เมื่อเริ่มต้น
  React.useEffect(() => {
    if (user?.id) {
      const savedSection = localStorage.getItem(`partner_active_section_${user.id}`);
      if (savedSection) {
        setActiveSection(savedSection);
      }
    }
  }, [user?.id]);
  
  // Auto-save form data เมื่อมีการเปลี่ยนแปลงข้อมูลฟิตเนส
  React.useEffect(() => {
    if (user?.id && fitnessData.fit_name) {
      setAutoSaveStatus('กำลังบันทึก...');
      
      const timeoutId = setTimeout(() => {
        const formData = {
          ...fitnessData,
          lastSaved: Date.now()
        };
        localStorage.setItem(`partner_fitness_draft_${user.id}`, JSON.stringify(formData));
        setAutoSaveStatus('บันทึกแล้ว ✓');
        console.log('💾 Auto-saved form data to localStorage');
        
        // ซ่อนสถานะหลังจาก 2 วินาที
        setTimeout(() => {
          setAutoSaveStatus('');
        }, 2000);
      }, 2000); // บันทึกทุก 2 วินาทีหลังจากการเปลี่ยนแปลง

      return () => {
        clearTimeout(timeoutId);
        setAutoSaveStatus('');
      };
    }
  }, [fitnessData, user?.id]);
  
  // โหลด draft data จาก localStorage เมื่อเริ่มต้น (ถ้าไม่มีข้อมูลจาก database)
  React.useEffect(() => {
    if (user?.id && !fitnessDataLoaded) {
      const savedDraft = localStorage.getItem(`partner_fitness_draft_${user.id}`);
      if (savedDraft) {
        try {
          const draftData = JSON.parse(savedDraft);
          const timeDiff = Date.now() - (draftData.lastSaved || 0);
          
          // ใช้ draft ถ้าบันทึกไว้ไม่เกิน 24 ชั่วโมง
          if (timeDiff < 86400000) {
            setFitnessData(prev => ({
              ...prev,
              ...draftData,
              lastSaved: undefined // ลบ field นี้ออก
            }));
            console.log('📋 Loaded draft data from localStorage');
          }
        } catch (error) {
          console.warn('Error loading draft data:', error);
        }
      }
    }
  }, [user?.id, fitnessDataLoaded]);



  // Function สำหรับอัปโหลดรูปภาพ
  const uploadImage = async (file, imageType) => {
    try {
      // ตรวจสอบประเภทไฟล์
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('กรุณาเลือกไฟล์รูปภาพ (JPG, PNG, WebP เท่านั้น)');
        return null;
      }

      // ตรวจสอบขนาดไฟล์ (5MB)
      if (file.size > 5242880) {
        alert('ขนาดไฟล์ใหญ่เกินไป (สูงสุด 5MB)');
        return null;
      }

      if (imageType === 'main') {
        setUploading(true);
      } else {
        setUploadingSecondary(true);
      }

      // สร้างชื่อไฟล์ที่ไม่ซ้ำ
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `fitness/${Date.now()}/${fileName}`;

      // อัปโหลดไฟล์ไปยัง fitness-images bucket
      const { data, error } = await supabase.storage
        .from('fitness-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        alert(`เกิดข้อผิดพลาดในการอัปโหลด: ${error.message}`);
        return null;
      }

      console.log('Upload successful:', data);

      // สร้าง public URL
      const { data: urlData } = supabase.storage
        .from('fitness-images')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        alert('ไม่สามารถสร้าง URL สำหรับรูปภาพได้');
        return null;
      }

      console.log(`✅ อัปโหลด${imageType === 'main' ? 'รูปหลัก' : 'รูปรอง'}สำเร็จ:`, urlData.publicUrl);
      return urlData.publicUrl;

    } catch (error) {
      console.error('Error uploading image:', error);
      alert('เกิดข้อผิดพลาดในการอัปโหลด: ' + error.message);
      return null;
    } finally {
      if (imageType === 'main') {
        setUploading(false);
      } else {
        setUploadingSecondary(false);
      }
    }
  };

  // Function สำหรับลบรูปภาพหลัก
  const removeMainImage = async () => {
    if (!fitnessData.fit_image) {
      alert('ไม่มีรูปภาพหลักให้ลบ');
      return;
    }
    
    if (window.confirm('คุณต้องการลบรูปภาพหลักหรือไม่?')) {
      try {
        // ตรวจสอบว่าเป็น URL จาก Supabase Storage หรือไม่
        if (fitnessData.fit_image.includes('supabase') && fitnessData.fit_image.includes('fitness-images')) {
          // ดึง file path จาก URL
          const url = new URL(fitnessData.fit_image);
          const pathParts = url.pathname.split('/');
          const objectIndex = pathParts.indexOf('object');
          
          if (objectIndex !== -1 && objectIndex + 2 < pathParts.length) {
            const filePath = pathParts.slice(objectIndex + 2).join('/');
            
            console.log('ลบไฟล์จาก Storage:', filePath);
            
            // ลบไฟล์จาก Storage
            const { error } = await supabase.storage
              .from('fitness-images')
              .remove([filePath]);
            
            if (error) {
              console.warn('ไม่สามารถลบไฟล์จาก Storage:', error.message);
            } else {
              console.log('✅ ลบไฟล์จาก Storage สำเร็จ');
            }
          }
        }
        
        // อัปเดท state (ลบ URL ออกจาก state เสมอ)
        setFitnessData({...fitnessData, fit_image: ''});
        alert('ลบรูปภาพหลักสำเร็จ');
        console.log('✅ ลบรูปภาพหลักสำเร็จ');
      } catch (error) {
        console.error('Error removing main image:', error);
        alert('เกิดข้อผิดพลาดในการลบรูปภาพ: ' + error.message);
      }
    }
  };

  // Function สำหรับดึงตำแหน่งปัจจุบัน
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('เบราว์เซอร์ของคุณไม่รองรับ Geolocation');
      return;
    }

    setGettingLocation(true);
    alert('กำลังดึงตำแหน่งปัจจุบัน... กรุณารอสักครู่');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoordinates({ lat: latitude, lng: longitude });
        
        // อัปเดทข้อมูลตำแหน่งในฟอร์ม
        const locationString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        setFitnessData({...fitnessData, fit_location: locationString});
        
        setGettingLocation(false);
        alert(`✅ ดึงตำแหน่งสำเร็จ!\nพิกัด: ${locationString}`);
        console.log('✅ ดึงตำแหน่งสำเร็จ:', locationString);
      },
      (error) => {
        setGettingLocation(false);
        console.error('Error getting location:', error);
        
        switch(error.code) {
          case error.PERMISSION_DENIED:
            alert('❌ กรุณาอนุญาตให้เข้าถึงตำแหน่งในเบราว์เซอร์\n\nวิธีการ:\n1. คลิกไอคอน 🔒 ข้างแถบ URL\n2. เลือก "อนุญาต" สำหรับ Location\n3. รีเฟรชหน้าและลองใหม่');
            break;
          case error.POSITION_UNAVAILABLE:
            alert('❌ ไม่สามารถหาตำแหน่งได้\nกรุณาตรวจสอบ GPS หรือเชื่อมต่ออินเทอร์เน็ต');
            break;
          case error.TIMEOUT:
            alert('❌ หมดเวลาในการค้นหาตำแหน่ง\nกรุณาลองใหม่อีกครั้ง');
            break;
          default:
            alert('❌ เกิดข้อผิดพลาดในการหาตำแหน่ง\nกรุณาลองใหม่หรือใส่พิกัดด้วยตนเอง');
            break;
        }
      },
      { 
        timeout: 15000, 
        enableHighAccuracy: true,
        maximumAge: 60000 // ใช้ตำแหน่งเก่าที่ไม่เกิน 1 นาที
      }
    );
  };

  // Function สำหรับเปิด Google Maps สำหรับเลือกพิกัด
  const openGoogleMaps = () => {
    // สร้าง URL สำหรับเลือกตำแหน่งใน Google Maps
    let mapUrl;
    
    if (coordinates.lat && coordinates.lng) {
      // ถ้ามีพิกัดอยู่แล้ว ให้เปิดที่ตำแหน่งนั้น
      mapUrl = `https://www.google.com/maps/@${coordinates.lat},${coordinates.lng},15z`;
    } else if (fitnessData.fit_location) {
      // ลองแปลงจาก string ที่มีอยู่
      const coords = fitnessData.fit_location.split(',');
      if (coords.length === 2) {
        const lat = parseFloat(coords[0].trim());
        const lng = parseFloat(coords[1].trim());
        if (!isNaN(lat) && !isNaN(lng)) {
          mapUrl = `https://www.google.com/maps/@${lat},${lng},15z`;
        } else {
          // ถ้าไม่ใช่พิกัด ให้ search ชื่อสถานที่
          mapUrl = `https://www.google.com/maps/search/${encodeURIComponent(fitnessData.fit_location)}`;
        }
      } else {
        mapUrl = `https://www.google.com/maps/search/${encodeURIComponent(fitnessData.fit_location)}`;
      }
    } else {
      // ถ้าไม่มีข้อมูลใดๆ ให้เปิดแผนที่ประเทศไทย
      mapUrl = 'https://www.google.com/maps/@13.7563,100.5018,10z';
    }
    
    // เปิดแผนที่ในแท็บใหม่
    const newWindow = window.open(mapUrl, '_blank');
    
    if (newWindow) {
      alert(`📍 เปิด Google Maps แล้ว!

📋 วิธีการเลือกพิกัด:
1. ค้นหาหรือคลิกที่ตำแหน่งที่ต้องการ
2. คลิกขวาที่ตำแหน่งนั้น
3. เลือก "คัดลอกพิกัด" หรือดูพิกัดใน URL
4. นำพิกัดมาใส่ในช่อง "สถานที่ตั้ง"

รูปแบบ: 13.756331, 100.501765`);
    } else {
      alert('❌ ไม่สามารถเปิด Google Maps ได้\nกรุณาอนุญาตให้เปิด popup หรือเปิดลิงก์ด้วยตนเอง');
    }
  };

  // Function สำหรับจัดการการเลือกไฟล์รูปหลัก
  const handleFileSelect = async (event, imageType) => {
    const file = event.target.files[0];
    if (!file) return;

    const uploadedUrl = await uploadImage(file, imageType);
    if (uploadedUrl) {
      if (imageType === 'main') {
        setFitnessData({...fitnessData, fit_image: uploadedUrl});
      }
    }
  };

  // Function สำหรับจัดการรูปรองหลายรูป
  const handleSecondaryImagesSelect = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // ตรวจสอบจำนวนรูปทั้งหมด
    const currentImages = fitnessData.fit_image_secondary.length;
    const newImagesCount = files.length;
    const totalImages = currentImages + newImagesCount;

    if (totalImages > 5) {
      alert(`สามารถอัปโหลดได้สูงสุด 5 รูป (ปัจจุบันมี ${currentImages} รูป, สามารถเพิ่มได้อีก ${5 - currentImages} รูป)`);
      return;
    }

    // อัปโหลดทีละไฟล์
    const uploadedUrls = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const uploadedUrl = await uploadImage(file, 'secondary');
      if (uploadedUrl) {
        uploadedUrls.push(uploadedUrl);
      }
    }

    // อัปเดต state ด้วย URLs ใหม่
    if (uploadedUrls.length > 0) {
      setFitnessData({
        ...fitnessData, 
        fit_image_secondary: [...fitnessData.fit_image_secondary, ...uploadedUrls]
      });
    }
  };

  // Function สำหรับลบรูปรอง
  const removeSecondaryImage = async (indexToRemove, imageUrl) => {
    if (window.confirm('คุณต้องการลบรูปภาพนี้หรือไม่?')) {
      try {
        // ลบไฟล์จาก Storage (เฉพาะที่เป็น URL จาก Storage)
        if (imageUrl && imageUrl.includes('supabase') && imageUrl.includes('fitness-images')) {
          try {
            // ดึง file path จาก URL
            const url = new URL(imageUrl);
            const pathParts = url.pathname.split('/');
            const objectIndex = pathParts.indexOf('object');
            
            if (objectIndex !== -1 && objectIndex + 2 < pathParts.length) {
              const filePath = pathParts.slice(objectIndex + 2).join('/');
              
              console.log('ลบไฟล์รองจาก Storage:', filePath);
              
              const { error } = await supabase.storage
                .from('fitness-images')
                .remove([filePath]);
              
              if (error) {
                console.warn('ไม่สามารถลบไฟล์จาก Storage:', error.message);
              } else {
                console.log('✅ ลบไฟล์รองจาก Storage สำเร็จ');
              }
            }
          } catch (urlError) {
            console.warn('ไม่สามารถ parse URL:', urlError);
          }
        }

        // ลบจาก state (ลบเสมอ ไม่ว่าจะลบไฟล์จาก Storage ได้หรือไม่)
        const updatedImages = fitnessData.fit_image_secondary.filter((_, index) => index !== indexToRemove);
        setFitnessData({...fitnessData, fit_image_secondary: updatedImages});
        
        alert('ลบรูปภาพสำเร็จ');
        console.log('✅ ลบรูปรองสำเร็จ');
      } catch (error) {
        console.error('Error removing image:', error);
        alert('เกิดข้อผิดพลาดในการลบรูป: ' + error.message);
      }
    }
  };

  // Function สำหรับบันทึกข้อมูลฟิตเนส


  // =============== FITNESS MODE MANAGEMENT FUNCTIONS ===============
  








  // =============== FITNESS CRUD FUNCTIONS ===============
  const saveFitnessChanges = async () => {
    // ตรวจสอบข้อมูลพื้นฐาน
    if (!fitnessData.fit_name.trim()) {
      alert('กรุณากรอกชื่อฟิตเนส');
      return;
    }

    if (!partnerData?.owner_name) {
      alert('ไม่พบข้อมูลเจ้าของ กรุณาล็อกอินใหม่');
      return;
    }

    setSaving(true);
    try {
      // เตรียมข้อมูลสำหรับบันทึก
      const fitnessInfo = {
        fit_name: fitnessData.fit_name,
        fit_user: partnerData.owner_name,
        fit_price: parseFloat(fitnessData.fit_price) || 100,
        fit_image: fitnessData.fit_image || '',
        fit_address: fitnessData.fit_address || '',
        fit_contact: fitnessData.fit_contact || '',
        fit_dateopen: fitnessData.fit_dateopen || '',
        fit_dateclose: fitnessData.fit_dateclose || '',
        fit_location: fitnessData.fit_location || '',
        fit_moredetails: fitnessData.fit_moredetails || '',
        fit_phone: fitnessData.fit_phone || '',
        updated_at: new Date().toISOString(),
      };

      let result;
      let fitnessId = fitnessData.id;
      let actionText = '';

      if (fitnessMode === 'create' || !fitnessId) {
        // สร้างฟิตเนสใหม่
        fitnessInfo.created_at = new Date().toISOString();
        fitnessInfo.created_by = user.id;
        
        console.log('🔥 สร้างฟิตเนสใหม่:', fitnessInfo);

        result = await supabase
          .from('tbl_fitness')
          .insert([fitnessInfo])
          .select();

        if (result.error) {
          throw result.error;
        }

        fitnessId = result.data[0]?.id;
        actionText = 'สร้าง';
        
      } else if (fitnessMode === 'edit' && fitnessId) {
        // อัปเดตฟิตเนสที่มีอยู่
        console.log('� อัปเดตฟิตเนส ID:', fitnessId, fitnessInfo);
        
        result = await supabase
          .from('tbl_fitness')
          .update(fitnessInfo)
          .eq('id', fitnessId)
          .select();

        if (result.error) {
          throw result.error;
        }
        
        actionText = 'อัปเดต';
      }

      // อัปเดท state หลังบันทึกสำเร็จ
      if (fitnessId) {
        setFitnessData(prev => ({ ...prev, id: fitnessId }));
        setHasFitnessData(true);
        setFitnessDataLoaded(true);
        setFitnessMode('view');
        
        // บันทึกรูปรองใน localStorage
        if (fitnessData.fit_image_secondary.length > 0) {
          localStorage.setItem(`fitness_secondary_${fitnessId}`, JSON.stringify(fitnessData.fit_image_secondary));
          console.log('✅ บันทึกรูปรองใน localStorage สำเร็จ');
        }

        // ลบ draft data
        localStorage.removeItem(`partner_fitness_draft_${user.id}`);
        
        // โหลดข้อมูลอุปกรณ์ (เชื่อมโยงกับฟิตเนสที่สร้างใหม่)
        if (actionText === 'สร้าง') {
          await loadEquipmentData();
        }
      }

      alert(`🎉 ${actionText}ฟิตเนส "${fitnessData.fit_name}" สำเร็จ!

📊 รายละเอียด:
- Fitness ID: ${fitnessId}
- ชื่อเจ้าของ: ${partnerData.owner_name}
- ราคา: ${fitnessData.fit_price || 100} บาท
- รูปหลัก: ${fitnessData.fit_image ? '✅' : '❌'}
- รูปรอง: ${fitnessData.fit_image_secondary.length} รูป

${actionText === 'สร้าง' ? '� ตอนนี้คุณสามารถเพิ่มอุปกรณ์ได้แล้ว!' : '✨ ข้อมูลได้รับการอัปเดตแล้ว!'}`);

      console.log(`✅ ${actionText}ฟิตเนสสำเร็จ:`, result.data);

    } catch (error) {
      console.error('Error saving fitness:', error);
      
      let errorMessage = 'เกิดข้อผิดพลาดในการบันทึกฟิตเนส: ';
      
      if (error.code === '23505') {
        errorMessage += 'มีข้อมูลซ้ำในระบบ';
      } else if (error.code === '23503') {
        errorMessage += 'ข้อมูลอ้างอิงไม่ถูกต้อง';
      } else {
        errorMessage += error.message;
      }
      
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // =============== EQUIPMENT MANAGEMENT FUNCTIONS ===============

  // Function สำหรับโหลดข้อมูลอุปกรณ์
  const loadEquipmentData = useCallback(async () => {
    try {
      setEquipmentLoading(true);
      
      // ใช้ fitness_id ที่เก็บใน fitnessData
      if (!fitnessData.id) {
        console.log('ℹ️ ยังไม่มี fitness_id, ข้ามการโหลดอุปกรณ์');
        setEquipmentList([]);
        return;
      }

      console.log('📊 Loading equipment data for fitness_id:', fitnessData.id);

      // โหลดอุปกรณ์ทั้งหมดของฟิตเนสนี้
      const { data, error } = await supabase
        .from('tbl_equipment')
        .select('*')
        .eq('fitness_id', fitnessData.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading equipment:', error);
        alert('เกิดข้อผิดพลาดในการโหลดอุปกรณ์: ' + error.message);
      } else {
        setEquipmentList(data || []);
        console.log('✅ โหลดข้อมูลอุปกรณ์สำเร็จ:', data);
      }
    } catch (error) {
      console.error('Error loading equipment:', error);
      alert('เกิดข้อผิดพลาดในการโหลดอุปกรณ์: ' + error.message);
    } finally {
      setEquipmentLoading(false);
    }
  }, [fitnessData.id]); // ใช้ fitness_id แทน

  // Function สำหรับบันทึกอุปกรณ์ใหม่หรืออัปเดท
  const saveEquipment = async () => {
    if (!equipmentData.em_name.trim()) {
      alert('กรุณากรอกชื่ออุปกรณ์');
      return;
    }

    setSavingEquipment(true);
    try {
      // ตรวจสอบ fitness_id
      if (!fitnessData.id) {
        alert('กรุณาสร้างข้อมูลฟิตเนสก่อน');
        return;
      }

      const equipmentInfo = {
        em_name: equipmentData.em_name,
        em_image: equipmentData.em_image || '',
        fitness_id: fitnessData.id, // ใช้ fitness_id ที่มีอยู่แล้ว
        updated_at: new Date().toISOString()
      };

      let result;

      if (editingEquipment) {
        // อัปเดทอุปกรณ์ที่มีอยู่
        result = await supabase
          .from('tbl_equipment')
          .update(equipmentInfo)
          .eq('em_id', editingEquipment.em_id)
          .select();
        
        console.log('✅ อัปเดทอุปกรณ์สำเร็จ');
      } else {
        // สร้างอุปกรณ์ใหม่
        equipmentInfo.created_at = new Date().toISOString();
        equipmentInfo.created_by = user.id;
        
        result = await supabase
          .from('tbl_equipment')
          .insert([equipmentInfo])
          .select();
        
        console.log('✅ เพิ่มอุปกรณ์ใหม่สำเร็จ');
      }

      if (result.error) {
        throw result.error;
      }

      alert(`✅ ${editingEquipment ? 'อัปเดท' : 'เพิ่ม'}อุปกรณ์สำเร็จ!`);
      
      // รีเซ็ตฟอร์มและโหลดข้อมูลใหม่
      setEquipmentData({ em_name: '', em_image: '' });
      setEditingEquipment(null);
      loadEquipmentData();

    } catch (error) {
      console.error('Error saving equipment:', error);
      alert('เกิดข้อผิดพลาดในการบันทึก: ' + error.message);
    } finally {
      setSavingEquipment(false);
    }
  };

  // Function สำหรับลบอุปกรณ์
  const deleteEquipment = async (equipment) => {
    if (!window.confirm(`คุณต้องการลบอุปกรณ์ "${equipment.em_name}" หรือไม่?`)) {
      return;
    }

    try {
      // ลบรูปภาพจาก Storage ถ้ามี
      if (equipment.em_image && equipment.em_image.includes('supabase') && equipment.em_image.includes('fitness-images')) {
        try {
          const url = new URL(equipment.em_image);
          const pathParts = url.pathname.split('/');
          const objectIndex = pathParts.indexOf('object');
          
          if (objectIndex !== -1 && objectIndex + 2 < pathParts.length) {
            const filePath = pathParts.slice(objectIndex + 2).join('/');
            
            const { error: storageError } = await supabase.storage
              .from('fitness-images')
              .remove([filePath]);
            
            if (storageError) {
              console.warn('ไม่สามารถลบรูปจาก Storage:', storageError.message);
            } else {
              console.log('✅ ลบรูปจาก Storage สำเร็จ');
            }
          }
        } catch (urlError) {
          console.warn('ไม่สามารถ parse URL:', urlError);
        }
      }

      // ลบอุปกรณ์จากฐานข้อมูล
      const { error } = await supabase
        .from('tbl_equipment')
        .delete()
        .eq('em_id', equipment.em_id);

      if (error) {
        throw error;
      }

      alert('✅ ลบอุปกรณ์สำเร็จ');
      loadEquipmentData();

    } catch (error) {
      console.error('Error deleting equipment:', error);
      alert('เกิดข้อผิดพลาดในการลบ: ' + error.message);
    }
  };

  // Function สำหรับเริ่มแก้ไขอุปกรณ์
  const startEditEquipment = (equipment) => {
    setEditingEquipment(equipment);
    setEquipmentData({
      em_name: equipment.em_name,
      em_image: equipment.em_image || ''
    });
  };

  // Function สำหรับยกเลิกการแก้ไข
  const cancelEditEquipment = () => {
    setEditingEquipment(null);
    setEquipmentData({ em_name: '', em_image: '' });
  };

  // Function สำหรับอัปโหลดรูปอุปกรณ์
  const uploadEquipmentImage = async (file) => {
    try {
      // ตรวจสอบประเภทไฟล์
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('กรุณาเลือกไฟล์รูปภาพ (JPG, PNG, WebP เท่านั้น)');
        return null;
      }

      // ตรวจสอบขนาดไฟล์ (5MB)
      if (file.size > 5242880) {
        alert('ขนาดไฟล์ใหญ่เกินไป (สูงสุด 5MB)');
        return null;
      }

      setUploading(true);

      // สร้างชื่อไฟล์ที่ไม่ซ้ำ
      const fileExt = file.name.split('.').pop();
      const fileName = `equipment-${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `equipment/${Date.now()}/${fileName}`;

      // อัปโหลดไฟล์ไปยัง fitness-images bucket
      const { error } = await supabase.storage
        .from('fitness-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        alert(`เกิดข้อผิดพลาดในการอัปโหลด: ${error.message}`);
        return null;
      }

      // สร้าง public URL
      const { data: urlData } = supabase.storage
        .from('fitness-images')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        alert('ไม่สามารถสร้าง URL สำหรับรูปภาพได้');
        return null;
      }

      console.log('✅ อัปโหลดรูปอุปกรณ์สำเร็จ:', urlData.publicUrl);
      return urlData.publicUrl;

    } catch (error) {
      console.error('Error uploading equipment image:', error);
      alert('เกิดข้อผิดพลาดในการอัปโหลด: ' + error.message);
      return null;
    } finally {
      setUploading(false);
    }
  };

  // Function สำหรับจัดการการเลือกไฟล์อุปกรณ์
  const handleEquipmentImageSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const uploadedUrl = await uploadEquipmentImage(file);
    if (uploadedUrl) {
      setEquipmentData({...equipmentData, em_image: uploadedUrl});
    }
  };

  // โหลดข้อมูลอุปกรณ์เมื่อเข้าหน้า equipment และมี fitness_id
  React.useEffect(() => {
    if (activeSection === 'equipment' && fitnessData.id) {
      loadEquipmentData();
    }
  }, [activeSection, fitnessData.id, loadEquipmentData]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  return (
    <div className="main-partners">
      <header className="partners-header">
        <div className="header-content">
          <h1>🏋️‍♂️ Partner Dashboard</h1>
          <div className="user-info">
            <span>สวัสดี, {partnerData?.owner_name || 'Partner'}</span>
            <button onClick={handleLogoutClick} className="logout-btn">
              ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      <div className="partners-container">
        <nav className="partners-sidebar">
          <div className="sidebar-menu">
            <button 
              className={`menu-item ${activeSection === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleSectionChange('dashboard')}
            >
              <span className="icon">📊</span>
              แดชบอร์ด
            </button>
            <button 
              className={`menu-item ${activeSection === 'members' ? 'active' : ''}`}
              onClick={() => handleSectionChange('members')}
            >
              <span className="icon">👥</span>
              สมาชิก
            </button>
            <button 
              className={`menu-item ${activeSection === 'bookings' ? 'active' : ''}`}
              onClick={() => handleSectionChange('bookings')}
            >
              <span className="icon">📅</span>
              การจอง
            </button>
            <button 
              className={`menu-item ${activeSection === 'classes' ? 'active' : ''}`}
              onClick={() => handleSectionChange('classes')}
            >
              <span className="icon">💪</span>
              คลาสออกกำลังกาย
            </button>
            <button 
              className={`menu-item ${activeSection === 'fitness-info' ? 'active' : ''}`}
              onClick={() => handleSectionChange('fitness-info')}
            >
              <span className="icon">🏢</span>
              {hasFitnessData ? 'ข้อมูลฟิตเนส' : 'สร้างฟิตเนส'}
            </button>
            <button 
              className={`menu-item ${activeSection === 'equipment' ? 'active' : ''}`}
              onClick={() => handleSectionChange('equipment')}
            >
              <span className="icon">🏋️</span>
              อุปกรณ์
            </button>
            <button 
              className={`menu-item ${activeSection === 'pricing' ? 'active' : ''}`}
              onClick={() => handleSectionChange('pricing')}
            >
              <span className="icon">💰</span>
              กำหนดราคา
            </button>
            <button 
              className={`menu-item ${activeSection === 'activities' ? 'active' : ''}`}
              onClick={() => handleSectionChange('activities')}
            >
              <span className="icon">📸</span>
              กิจกรรม
            </button>
            <button 
              className={`menu-item ${activeSection === 'payment-status' ? 'active' : ''}`}
              onClick={() => handleSectionChange('payment-status')}
            >
              <span className="icon">💳</span>
              สถานะการชำระ
            </button>
            <button 
              className={`menu-item ${activeSection === 'promotions' ? 'active' : ''}`}
              onClick={() => handleSectionChange('promotions')}
            >
              <span className="icon">📢</span>
              โปรโมชั่น
            </button>
            <button 
              className={`menu-item ${activeSection === 'qr-scanner' ? 'active' : ''}`}
              onClick={() => handleSectionChange('qr-scanner')}
            >
              <span className="icon">📱</span>
              สแกน QR
            </button>
            <button 
              className={`menu-item ${activeSection === 'reports' ? 'active' : ''}`}
              onClick={() => handleSectionChange('reports')}
            >
              <span className="icon">📈</span>
              รายงาน
            </button>
            <button 
              className={`menu-item ${activeSection === 'settings' ? 'active' : ''}`}
              onClick={() => handleSectionChange('settings')}
            >
              <span className="icon">⚙️</span>
              การตั้งค่า
            </button>
          </div>
        </nav>

        <main className="partners-content">
          {activeSection === 'dashboard' && (
            <div className="dashboard-section">
              <h2>แดชบอร์ด</h2>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">👥</div>
                  <div className="stat-info">
                    <h3>สมาชิกทั้งหมด</h3>
                    <p className="stat-number">150</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📅</div>
                  <div className="stat-info">
                    <h3>การจองวันนี้</h3>
                    <p className="stat-number">25</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">💰</div>
                  <div className="stat-info">
                    <h3>รายได้เดือนนี้</h3>
                    <p className="stat-number">₿45,000</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="main-partners">
                    <header className="partners-header">
                      <div className="header-content">
                        <h1>🏋️‍♂️ Partner Dashboard</h1>
                        <div className="user-info">
                          <span>สวัสดี, {partnerData?.owner_name || 'Partner'}</span>
                          <button onClick={handleLogoutClick} className="logout-btn">
                            ออกจากระบบ
                          </button>
                        </div>
                      </div>
                    </header>
                    <div className="partners-container">
                      <nav className="partners-sidebar">
                        <div className="sidebar-menu">
                          {/* ...menu buttons... */}
                        </div>
                      </nav>
                      <main className="partners-content">
                        {activeSection === 'dashboard' && (
                          <div className="dashboard-section">{/* ...dashboard code... */}</div>
                        )}
                        {activeSection === 'members' && (
                          <div className="members-section">{/* ...members code... */}</div>
                        )}
                        {activeSection === 'bookings' && (
                          <div className="bookings-section">{/* ...bookings code... */}</div>
                        )}
                        {activeSection === 'classes' && (
                          <div className="classes-section">{/* ...classes code... */}</div>
                        )}
                        {activeSection === 'fitness-info' && (
                          <FitnessManagement />
                        )}
                        {activeSection === 'equipment' && (
                          <EquipmentManagement />
                        )}
                        {activeSection === 'fitness' && (
                          <div className="fitness-info-section">{/* ...fitness code... */}</div>
                        )}
                        {activeSection === 'pricing' && (
                          <div className="pricing-section">{/* ...pricing code... */}</div>
                        )}
                        {/* ...other sections... */}
                      </main>
                    </div>
                  </div>
                  <h4>� อัปโหลดรูปภาพ</h4>
                  
                  <ul>
                    <li>รองรับไฟล์: JPG, PNG, WebP</li>
                    <li>ขนาดสูงสุด: 5MB</li>
                   
                  </ul>
                </div>
              </div>
              
              <div className="section-content">
                <div className="settings-group">
                  <h3>ข้อมูลพื้นฐานฟิตเนส</h3>
                  
                  <div className="form-group">
                    <label>ชื่อฟิตเนส:</label>
                    <input 
                      type="text" 
                      placeholder="กรอกชื่อฟิตเนส"
                      value={fitnessData.fit_name}
                      onChange={(e) => setFitnessData({...fitnessData, fit_name: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>ชื่อเจ้าของกิจการ:</label>
                    <input 
                      type="text" 
                      placeholder="กรอกชื่อเจ้าของ"
                      value={fitnessData.fit_user || partnerData?.owner_name || ''}
                      onChange={(e) => setFitnessData({...fitnessData, fit_user: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>ราคา (บาท/วัน):</label>
                    <input 
                      type="number" 
                      placeholder="กรอกราคาต่อวัน"
                      value={fitnessData.fit_price}
                      onChange={(e) => setFitnessData({...fitnessData, fit_price: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>รูปภาพหลัก:</label>
                    <div className="image-upload-section">
                      <div className="upload-options">
                        <div className="upload-method">
                          <label className="upload-btn">
                            📁 เลือกจากเครื่อง
                            <input 
                              type="file" 
                              accept="image/jpeg,image/jpg,image/png,image/webp"
                              onChange={(e) => handleFileSelect(e, 'main')}
                              style={{ display: 'none' }}
                            />
                          </label>
                          <span className="upload-note">หรือ</span>
                          <input 
                            type="url" 
                            placeholder="กรอก URL รูปภาพหลัก"
                            aria-label="URL รูปภาพหลัก"
                            value={fitnessData.fit_image}
                            onChange={(e) => setFitnessData({...fitnessData, fit_image: e.target.value})}
                            className="url-input"
                          />
                        </div>
                        {uploading && (
                          <div className="upload-status">
                            <span>กำลังอัปโหลด...</span>
                          </div>
                        )}
                      </div>
                      {fitnessData.fit_image && (
                        <div className="image-preview">
                          <img 
                            src={fitnessData.fit_image} 
                            alt="รูปภาพหลัก" 
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                          <div className="image-controls">
                            <span className="image-label">รูปภาพหลัก</span>
                            <button 
                              type="button"
                              className="remove-image-btn"
                              onClick={removeMainImage}
                              title="ลบรูปภาพหลัก"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label>รูปภาพรอง (สูงสุด 10 รูป):</label>
                    <div className="image-upload-section">
                      <div className="upload-options">
                        <div className="upload-method">
                          <label className="upload-btn">
                            📁 เลือกรูปภาพหลายรูป
                            <input 
                              type="file" 
                              accept="image/jpeg,image/jpg,image/png,image/webp"
                              multiple
                              onChange={handleSecondaryImagesSelect}
                              style={{ display: 'none' }}
                            />
                          </label>
                          <div className="upload-info">
                            <span>📌 สามารถเลือกได้หลายรูปพร้อมกัน</span>
                            <span>📊 ปัจจุบัน: {fitnessData.fit_image_secondary.length}/5 รูป</span>
                          </div>
                        </div>
                        {uploadingSecondary && (
                          <div className="upload-status">
                            <span>กำลังอัปโหลดรูปภาพ...</span>
                          </div>
                        )}
                      </div>

                      {/* แสดงรูปภาพรองทั้งหมด */}
                      {fitnessData.fit_image_secondary.length > 0 && (
                        <div className="secondary-images-grid">
                          <h4>รูปภาพรอง ({fitnessData.fit_image_secondary.length}/5)</h4>
                          <div className="images-gallery">
                            {fitnessData.fit_image_secondary.map((imageUrl, index) => (
                              <div key={index} className="secondary-image-item">
                                <img 
                                  src={imageUrl} 
                                  alt={`รูปภาพรอง ${index + 1}`} 
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                                <div className="image-overlay">
                                  <span className="image-number">{index + 1}</span>
                                  <button 
                                    type="button"
                                    className="delete-image-btn"
                                    onClick={() => removeSecondaryImage(index, imageUrl)}
                                    title="ลบรูปภาพนี้"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label>ที่อยู่:</label>
                    <textarea 
                      placeholder="กรอกที่อยู่ฟิตเนส" 
                      rows="3"
                      value={fitnessData.fit_address}
                      onChange={(e) => setFitnessData({...fitnessData, fit_address: e.target.value})}
                    ></textarea>
                  </div>
                  
                  <div className="form-group">
                    <label>ข้อมูลการติดต่อ:</label>
                    <input 
                      type="text" 
                      placeholder="กรอกข้อมูลการติดต่อ"
                      value={fitnessData.fit_contact}
                      onChange={(e) => setFitnessData({...fitnessData, fit_contact: e.target.value})}
                    />
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>เวลาเปิด:</label>
                      <input 
                        type="time" 
                        aria-label="เวลาเปิดฟิตเนส"
                        value={fitnessData.fit_dateopen}
                        onChange={(e) => setFitnessData({...fitnessData, fit_dateopen: e.target.value})}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>เวลาปิด:</label>
                      <input 
                        type="time" 
                        aria-label="เวลาปิดฟิตเนส"
                        value={fitnessData.fit_dateclose}
                        onChange={(e) => setFitnessData({...fitnessData, fit_dateclose: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label>ตำแหน่ง GPS:</label>
                    <div className="location-input-section">
                      <input 
                        type="text" 
                        placeholder="กรอกพิกัด เช่น 13.7563, 100.5018"
                        aria-label="ตำแหน่ง GPS"
                        value={fitnessData.fit_location}
                        onChange={(e) => setFitnessData({...fitnessData, fit_location: e.target.value})}
                        className="location-input"
                        style={{ marginBottom: '8px' }}
                      />
                      {fitnessData.fit_location && (
                        <div style={{ color: '#fff', fontSize: '0.95em' }}>
                          พิกัดปัจจุบัน: {fitnessData.fit_location}
                        </div>
                      )}
                      <div className="location-buttons">
                        <button 
                          type="button"
                          className="location-btn"
                          onClick={getCurrentLocation}
                          disabled={gettingLocation}
                          title="ดึงตำแหน่งปัจจุบัน"
                        >
                          {gettingLocation ? '📍⏳' : '📍 ตำแหน่งปัจจุบัน'}
                        </button>
                        <button 
                          type="button"
                          className="maps-btn"
                          onClick={openGoogleMaps}
                          title="เปิดใน Google Maps"
                        >
                          🗺️ Google Maps
                        </button>
                      </div>
                      {coordinates.lat && coordinates.lng && (
                        <div className="coordinates-display">
                          <small>พิกัด: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}</small>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label>รายละเอียดเพิ่มเติม:</label>
                    <textarea 
                      placeholder="กรอกรายละเอียดเพิ่มเติมเกี่ยวกับฟิตเนส" 
                      rows="4"
                      value={fitnessData.fit_moredetails}
                      onChange={(e) => setFitnessData({...fitnessData, fit_moredetails: e.target.value})}
                    ></textarea>
                  </div>
                  
                  <div className="form-group">
                    <label>เบอร์โทรศัพท์:</label>
                    <input 
                      type="tel" 
                      placeholder="กรอกเบอร์โทรศัพท์"
                      value={fitnessData.fit_phone}
                      onChange={(e) => setFitnessData({...fitnessData, fit_phone: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="action-buttons">
                  <button 
                    className="btn-primary" 
                    onClick={saveFitnessChanges}
                    disabled={saving}
                  >
                    {saving ? 'กำลังบันทึก...' : (hasFitnessData ? 'อัปเดทข้อมูล' : 'บันทึกข้อมูล')}
                  </button>
                  
                  <button 
                    className="btn-success" 
                    onClick={saveFitnessChanges}
                    disabled={saving}
                    style={{ backgroundColor: '#17a2b8', borderColor: '#17a2b8' }}
                  >
                      {saving ? 'กำลังบันทึก...' : '� บันทึก/อัปเดตฟิตเนส'}
                    </button>
                  
                  <button 
                    className="btn-secondary"
                    onClick={() => setFitnessData({
                      id: null,
                      fit_name: '',
                      fit_user: '',
                      fit_price: '',
                      fit_image: '',
                      fit_image_secondary: [],
                      fit_address: '',
                      fit_contact: '',
                      fit_dateopen: '',
                      fit_dateclose: '',
                      fit_location: '',
                      fit_moredetails: '',
                      fit_phone: ''
                    })}
                  >
                    ล้างข้อมูล
                  </button>
                </div>
              </div>
            </div>
          )}
          

          {activeSection === 'pricing' && (
            <div className="pricing-section">
              <h2>กำหนดราคาบริการ</h2>
              <div className="section-content">
                <div className="pricing-grid">
                  <div className="pricing-card">
                    <h3>ค่าสมาชิก</h3>
                    <div className="form-group">
                      <label>รายวัน:</label>
                      <input type="number" placeholder="กรอกราคา" />
                    </div>
                    <div className="form-group">
                      <label>รายเดือน:</label>
                      <input type="number" placeholder="กรอกราคา" />
                    </div>
                    <div className="form-group">
                      <label>รายปี:</label>
                      <input type="number" placeholder="กรอกราคา" />
                    </div>
                  </div>
                  <div className="pricing-card">
                    <h3>ค่าบริการคลาส</h3>
                    <div className="form-group">
                      <label>คลาสโยคะ:</label>
                      <input type="number" placeholder="กรอกราคา" />
                    </div>
                    <div className="form-group">
                      <label>คลาสแอโรบิค:</label>
                      <input type="number" placeholder="กรอกราคา" />
                    </div>
                    <div className="form-group">
                      <label>คลาสเทรนเนอร์ส่วนตัว:</label>
                      <input type="number" placeholder="กรอกราคา" />
                    </div>
                  </div>
                </div>
                <div className="action-buttons">
                  <button className="btn-primary">บันทึกราคา</button>
                  <button className="btn-secondary">รีเซ็ต</button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'activities' && (
            <div className="activities-section">
              <h2>จัดการกิจกรรมและรายละเอียด</h2>
              <div className="section-content">
                <div className="upload-section">
                  <h3>อัพโหลดรูปภาพกิจกรรม</h3>
                  <div className="upload-area">
                    <input type="file" accept="image/*" multiple />
                    <p>ลากและวางไฟล์รูปภาพที่นี่ หรือคลิกเพื่อเลือกไฟล์</p>
                  </div>
                </div>
                <div className="activity-form">
                  <h3>รายละเอียดกิจกรรม</h3>
                  <div className="form-group">
                    <label>ชื่อกิจกรรม:</label>
                    <input type="text" placeholder="เช่น คลาสโยคะ" />
                  </div>
                  <div className="form-group">
                    <label>รายละเอียด:</label>
                    <textarea placeholder="อธิบายกิจกรรม" rows="4"></textarea>
                  </div>
                  <div className="form-group">
                    <label>วันและเวลา:</label>
                    <input type="datetime-local" />
                  </div>
                </div>
                <div className="action-buttons">
                  <button className="btn-primary">เผยแพร่กิจกรรม</button>
                  <button className="btn-secondary">บันทึกร่าง</button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'payment-status' && (
            <div className="payment-status-section">
              <h2>ตรวจสอบสถานะการชำระเงิน</h2>
              <div className="section-content">
                <div className="search-bar">
                  <input type="text" placeholder="ค้นหาสมาชิกด้วยชื่อหรืออีเมล" />
                  <button className="btn-primary">ค้นหา</button>
                </div>
                <div className="payment-table">
                  <table>
                    <thead>
                      <tr>
                        <th>ชื่อสมาชิก</th>
                        <th>แพ็กเกจ</th>
                        <th>วันที่ชำระ</th>
                        <th>สถานะ</th>
                        <th>จำนวน</th>
                        <th>การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>นายสมชาย ใจดี</td>
                        <td>รายเดือน</td>
                        <td>01/09/2025</td>
                        <td><span className="status-paid">ชำระแล้ว</span></td>
                        <td>1,500 บาท</td>
                        <td><button className="btn-secondary">ดูรายละเอียด</button></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'promotions' && (
            <div className="promotions-section">
              <h2>โปรโมชั่นและการแจ้งเตือน</h2>
              <div className="section-content">
                <div className="promotion-form">
                  <h3>สร้างโปรโมชั่นใหม่</h3>
                  <div className="form-group">
                    <label>หัวข้อโปรโมชั่น:</label>
                    <input type="text" placeholder="เช่น ส่วนลด 50% สำหรับสมาชิกใหม่" />
                  </div>
                  <div className="form-group">
                    <label>รายละเอียด:</label>
                    <textarea placeholder="อธิบายรายละเอียดโปรโมชั่น" rows="3"></textarea>
                  </div>
                  <div className="form-group">
                    <label>วันที่เริ่มต้น:</label>
                    <input type="date" />
                  </div>
                  <div className="form-group">
                    <label>วันที่สิ้นสุด:</label>
                    <input type="date" />
                  </div>
                  <div className="form-group">
                    <label>รายชื่ออีเมลผู้รับ:</label>
                    <textarea placeholder="กรอกอีเมลผู้รับ (คั่นด้วยจุลภาค)" rows="2"></textarea>
                  </div>
                </div>
                <div className="action-buttons">
                  <button className="btn-primary">ส่งอีเมล</button>
                  <button className="btn-secondary">บันทึกร่าง</button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'qr-scanner' && (
            <div className="qr-scanner-section">
              <h2>สแกน QR Code การจอง</h2>
              <div className="section-content">
                <div className="scanner-area">
                  <div className="qr-placeholder">
                    <span className="icon">📱</span>
                    <h3>เปิดกล้องเพื่อสแกน QR Code</h3>
                    <p>นำ QR Code ของสมาชิกมาสแกนเพื่อดูข้อมูลการจอง</p>
                    <button className="btn-primary">เปิดกล้อง</button>
                  </div>
                </div>
                <div className="scan-history">
                  <h3>ประวัติการสแกนล่าสุด</h3>
                  <div className="scan-item">
                    <span className="scan-time">10:30 น.</span>
                    <span className="member-name">นายสมชาย ใจดี</span>
                    <span className="booking-info">คลาสโยคะ - 11:00 น.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'equipment' && (
            <div className="equipment-section">
              <div className="section-header">
                <h2>🏋️ จัดการอุปกรณ์</h2>
                <div className="connection-status">
                  {fitnessData.id ? (
                    <span className="status-connected">
                      ✅ เชื่อมต่อกับฟิตเนส: {fitnessData.fit_name || 'ไม่ระบุชื่อ'}
                    </span>
                  ) : (
                    <span className="status-disconnected">
                      ⚠️ กรุณาสร้างข้อมูลฟิตเนสก่อน
                    </span>
                  )}
                </div>
              </div>
              
              {/* ฟอร์มเพิ่ม/แก้ไขอุปกรณ์ */}
              <div className="section-content">
                <div className="settings-group">
                  <h3>{editingEquipment ? '✏️ แก้ไขอุปกรณ์' : '➕ เพิ่มอุปกรณ์ใหม่'}</h3>
                  
                  <div className="form-group">
                    <label htmlFor="equipment-name">ชื่ออุปกรณ์:</label>
                    <input 
                      id="equipment-name"
                      type="text" 
                      placeholder="กรอกชื่ออุปกรณ์"
                      value={equipmentData.em_name}
                      onChange={(e) => setEquipmentData({...equipmentData, em_name: e.target.value})}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="equipment-image">รูปภาพอุปกรณ์:</label>
                    <div className="image-upload-section">
                      <input 
                        id="equipment-image"
                        type="file" 
                        accept="image/*"
                        onChange={handleEquipmentImageSelect}
                        disabled={uploading}
                      />
                      {uploading && (
                        <div className="upload-status">
                          <span>กำลังอัปโหลด...</span>
                        </div>
                      )}
                      {equipmentData.em_image && (
                        <div className="image-preview">
                          <img src={equipmentData.em_image} alt="Preview" />
                          <div className="image-label">รูปอุปกรณ์</div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="action-buttons">
                    <button 
                      className="btn-primary"
                      onClick={saveEquipment}
                      disabled={savingEquipment || !equipmentData.em_name.trim()}
                    >
                      {savingEquipment ? 'กำลังบันทึก...' : (editingEquipment ? '💾 อัปเดท' : '➕ เพิ่มอุปกรณ์')}
                    </button>
                    {editingEquipment && (
                      <button 
                        className="btn-secondary"
                        onClick={cancelEditEquipment}
                      >
                        ❌ ยกเลิก
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* รายการอุปกรณ์ */}
              <div className="section-content">
                <div className="settings-group">
                  <h3>📋 รายการอุปกรณ์ทั้งหมด</h3>
                  
                  {equipmentLoading ? (
                    <div className="loading-message">
                      <span>กำลังโหลดข้อมูลอุปกรณ์...</span>
                    </div>
                  ) : equipmentList.length === 0 ? (
                    <div className="empty-message">
                      <p>ยังไม่มีอุปกรณ์ กรุณาเพิ่มอุปกรณ์ใหม่</p>
                    </div>
                  ) : (
                    <div className="equipment-grid">
                      {equipmentList.map((equipment) => (
                        <div key={equipment.em_id} className="equipment-card">
                          {equipment.em_image && (
                            <div className="equipment-image">
                              <img src={equipment.em_image} alt={equipment.em_name} />
                            </div>
                          )}
                          <div className="equipment-info">
                            <h4>{equipment.em_name}</h4>
                            <div className="equipment-meta">
                              <small>สร้างเมื่อ: {new Date(equipment.created_at).toLocaleDateString('th-TH')}</small>
                            </div>
                            <div className="equipment-actions">
                              <button 
                                className="btn-edit"
                                onClick={() => startEditEquipment(equipment)}
                                title="แก้ไข"
                              >
                                ✏️
                              </button>
                              <button 
                                className="btn-delete"
                                onClick={() => deleteEquipment(equipment)}
                                title="ลบ"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeSection === 'reports' && (
            <div className="reports-section">
              <h2>รายงานและสถิติ</h2>
              <div className="section-content">
                <p>ส่วนดูรายงานและสถิติการใช้งาน</p>
                <div className="action-buttons">
                  <button className="btn-primary">รายงานรายได้</button>
                  <button className="btn-secondary">สถิติการใช้งาน</button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'settings' && (
            <div className="settings-section">
              <h2>การตั้งค่า</h2>
              <div className="section-content">
                <div className="settings-group">
                  <h3>ข้อมูลพาร์ทเนอร์</h3>
                  <div className="form-group">
                    <label>ชื่อ:</label>
                    <input 
                      type="text" 
                      value={partnerData?.owner_name || ''} 
                      readOnly 
                    />
                  </div>
                  <div className="form-group">
                    <label>อีเมล:</label>
                    <input 
                      type="email" 
                      value={partnerData?.owner_email || ''} 
                      readOnly 
                    />
                  </div>
                </div>
                
                <div className="settings-group">
                  <h3>การตั้งค่าระบบ</h3>
                  <div className="action-buttons">
                    <button className="btn-primary">แก้ไขข้อมูล</button>
                    <button className="btn-secondary">เปลี่ยนรหัสผ่าน</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default MainPartners;