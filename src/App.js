﻿import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './App.css';
import supabase from './supabaseClient';
import ProfilePage from './components/ProfilePage';
import MainPartners from './components/MainPartners';
import FitnessDetailModal from './components/FitnessDetailModal';
import LoadingSpinner from './components/LoadingSpinner';


function App() {
  // ฟังก์ชันจัดการ Supabase API Error  
  const handleSupabaseError = useCallback((error, operation = 'unknown') => {
    console.error(`Supabase error in ${operation}:`, error);
    
    if (error.code === '406' || error.message?.includes('406')) {
      console.warn('HTTP 406 Not Acceptable - retrying with different headers');
      return { shouldRetry: true, retryDelay: 1000 };
    }
    
    if (error.message?.includes('Invalid Refresh Token') || 
        error.message?.includes('refresh_token_not_found')) {
      handleAuthError();
      return { shouldRetry: false };
    }
    
    return { shouldRetry: false };
  }, [handleAuthError]);

  // ฟังก์ชันจัดการ Auth Error
  const handleAuthError = useCallback(async () => {
    try {
      // Clear all auth-related storage
      const keysToRemove = [
        'sb-ibtvipouiddtvsdsccfc-auth-token',
        'supabase.auth.token',
        'sb-auth-token'
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      });
      
      // Clear all localStorage if needed
      Object.keys(localStorage).forEach(key => {
        if (key.includes('supabase') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      // Force clear session storage
      sessionStorage.clear();
      
      // Sign out user with global scope
      await supabase.auth.signOut({ scope: 'global' });
      
      // Reset states
      setUser(null);
      setUserProfile(null);
      setCurrentPage('หน้าหลัก');
      
      console.log('Auth error handled, all tokens cleared');
    } catch (error) {
      console.error('Error handling auth error:', error);
      // Force reload as last resort
      window.location.reload();
    }
  }, []);

  // ฟังก์ชันปรับฟอร์แมตเวลา
  const formatTime = (timeString) => {
    if (!timeString) return timeString;
    return timeString
      .replace(/(\d+):00\.00/g, '$1:00')     // 10:00.00 -> 10:00
      .replace(/(\d+)\.00\.00/g, '$1.00')   // 10.00.00 -> 10.00  
      .replace(/(\d+)\.00$/g, '$1')         // 10.00 -> 10
      .replace(/(\d+):00:00/g, '$1:00')     // 10:00:00 -> 10:00
      .replace(/\.00\s*-\s*(\d+)\.00/g, ' - $1')  // 10.00 - 23.00 -> 10 - 23
      .replace(/(\d+)\.00/g, '$1');         // ตัด .00 ทั้งหมด
  };

    const [currentPage, setCurrentPage] = useState('หน้าหลัก');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [fitnessData, setFitnessData] = useState([]); // เพิ่ม state สำหรับข้อมูลฟิตเนส
    const [filteredFitnessData, setFilteredFitnessData] = useState([]); // ข้อมูลที่กรองแล้ว
    const [searchTerm, setSearchTerm] = useState(''); // คำค้นหา
    const [priceFilter, setPriceFilter] = useState('all'); // กรองราคา
    const [sortBy, setSortBy] = useState('newest'); // การเรียง
    const [showImageModal, setShowImageModal] = useState(false); // Modal สำหรับแสดงรูป
    const [showImageGallery, setShowImageGallery] = useState(false); // Modal สำหรับแสดง Gallery
    const [selectedFitness, setSelectedFitness] = useState(null); // ฟิตเนสที่เลือกดู
    const [selectedImageIndex, setSelectedImageIndex] = useState(0); // รูปที่เลือกดู
    const [formData, setFormData] = useState({
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      role: 'user'
    });

    // Redirect to mainpartners page if userProfile is partner
  useEffect(() => {
    if (userProfile?.role === 'partner' && currentPage !== 'mainpartners') {
      setCurrentPage('mainpartners');
    }
  }, [userProfile, currentPage]);

  // ตรวจสอบสถานะการเข้าสู่ระบบเมื่อแอปเริ่มต้น
  useEffect(() => {
    // Check and clean corrupted auth data on app start
    const cleanCorruptedAuthData = () => {
      try {
        const authKeys = Object.keys(localStorage).filter(key => 
          key.includes('supabase') || key.includes('sb-')
        );
        
        for (const key of authKeys) {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              const parsed = JSON.parse(value);
              // Check if token is expired or corrupted
              if (parsed?.expires_at && parsed.expires_at < Date.now() / 1000) {
                console.log(`Removing expired auth key: ${key}`);
                localStorage.removeItem(key);
              }
            }
          } catch (e) {
            console.log(`Removing corrupted auth key: ${key}`);
            localStorage.removeItem(key);
          }
        }
      } catch (error) {
        console.error('Error cleaning auth data:', error);
      }
    };

    cleanCorruptedAuthData();

    // Global error handler for unhandled promise rejections
    const handleUnhandledRejection = (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      const errorMessage = event.reason?.message || '';
      const isAuthError = errorMessage.includes('refresh_token_not_found') ||
                         errorMessage.includes('Invalid Refresh Token') ||
                         errorMessage.includes('AuthApiError') ||
                         event.reason?.code === 'refresh_token_not_found';
      
      if (isAuthError) {
        console.log('Auth error detected in unhandled rejection, clearing auth');
        event.preventDefault(); // Prevent error from showing in console
        handleAuthError();
      }
    };

    // Global fetch interceptor for auth errors
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        
        if (response.status === 400 && args[0]?.includes('/auth/v1/token')) {
          const responseText = await response.clone().text();
          if (responseText.includes('refresh_token_not_found')) {
            console.log('Refresh token error detected in fetch, clearing auth');
            handleAuthError();
          }
        }
        
        return response;
      } catch (error) {
        console.error('Fetch error:', error);
        throw error;
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    const checkUserSession = async () => {
      try {
        console.log('Checking user session...');
        
        // Clear any potentially corrupted auth data first
        const authKeys = Object.keys(localStorage).filter(key => 
          key.includes('supabase') || key.includes('sb-')
        );
        
        if (authKeys.length > 0) {
          console.log('Found existing auth keys, clearing...', authKeys);
          authKeys.forEach(key => localStorage.removeItem(key));
          sessionStorage.clear();
        }
        
        // Force sign out any existing session
        await supabase.auth.signOut({ scope: 'global' });
        
        // Small delay to ensure cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
          console.error('Error getting user session:', error);
          if (error.message?.includes('refresh_token_not_found') || 
              error.message?.includes('Invalid Refresh Token')) {
            console.log('Refresh token error detected, clearing auth state');
            await handleAuthError();
            return;
          }
        }
        
        if (user) {
          console.log('User found:', user.email);
          setUser(user);
          await loadUserProfile(user.id);
        } else {
          console.log('No user found, setting default state');
          setUser(null);
          setUserProfile(null);
          setCurrentPage('หน้าหลัก');
        }
      } catch (error) {
        console.error('Error in checkUserSession:', error);
        await handleAuthError();
      }
    };

    checkUserSession();
    
    // ฟังการเปลี่ยนแปลงสถานะ auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email);
      
      if (event === 'SIGNED_OUT' || !session?.user) {
        // Clear all user data เมื่อออกจากระบบ
        setUser(null);
        setUserProfile(null);
        setCurrentPage('หน้าหลัก');
        console.log('User signed out, cleared all data');
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
        if (session?.user) {
          setUser(session.user);
          await loadUserProfile(session.user.id);
        }
      } else if (event === 'SIGNED_IN') {
        console.log('User signed in:', session?.user?.email);
        if (session?.user) {
          setUser(session.user);
          await loadUserProfile(session.user.id);
        }
      } else if (session?.user) {
        try {
          setUser(session.user);
          await loadUserProfile(session.user.id);
          console.log('User session loaded:', session.user.email);
        } catch (error) {
          console.error('Error loading user profile:', error);
          if (error.message?.includes('refresh_token_not_found') || 
              error.message?.includes('Invalid Refresh Token')) {
            console.log('Token error in auth state change, clearing auth');
            await handleAuthError();
          }
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      // Restore original fetch
      window.fetch = originalFetch;
    };
  }, [handleAuthError, handleSupabaseError]);

  const loadUserProfile = async (userId, retryCount = 0) => {
    try {
      console.log('Loading profile for user:', userId);

      // ตรวจสอบ tbl_owner ก่อน
      const { data: owner, error: ownerError } = await supabase
        .from('tbl_owner')
        .select('*')
        .eq('auth_user_id', userId)
        .single();

      if (ownerError) {
        const errorResult = handleSupabaseError(ownerError, 'loadUserProfile-owner');
        if (errorResult.shouldRetry && retryCount < 3) {
          console.log(`Retrying loadUserProfile for owner (attempt ${retryCount + 1})`);
          await new Promise(resolve => setTimeout(resolve, errorResult.retryDelay));
          return loadUserProfile(userId, retryCount + 1);
        }
      }

      if (owner && !ownerError) {
        // console.log('Found owner profile:', owner);
        // console.log('Owner keys:', Object.keys(owner));
        setUserProfile({ ...owner, role: 'partner' });
        return;
      }

      // ถ้าไม่ใช่ partner ให้หาใน profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_uid', userId)
        .single();

      if (profile && !profileError) {
        console.log('Found user profile:', profile);
        setUserProfile({ ...profile, role: 'user' });
        return;
      }

      console.log('No profile found in any table for user:', userId);
      // ถ้าไม่เจอใน table ไหนเลย ให้สร้าง default profile
      const currentUser = await supabase.auth.getUser();
      setUserProfile({
        role: 'user',
        full_name: currentUser.data?.user?.user_metadata?.full_name || 'ผู้ใช้ใหม่',
        email: currentUser.data?.user?.email
      });

    } catch (error) {
      console.error('Error loading user profile:', error);
      // สร้าง fallback profile
      const currentUser = await supabase.auth.getUser();
      setUserProfile({
        role: 'user', 
        full_name: currentUser.data?.user?.user_metadata?.full_name || 'ผู้ใช้ใหม่',
        email: currentUser.data?.user?.email
      });
    }
  };

  // Function สำหรับโหลดข้อมูลฟิตเนส
  const loadFitnessData = useCallback(async () => {
    try {
      console.log('Loading fitness data from database...');
      
      // ดึงข้อมูลฟิตเนส
      const { data: fitnessData, error: fitnessError } = await supabase
        .from('tbl_fitness')
        .select('*')
        .order('created_at', { ascending: false });

      if (fitnessError) {
        console.error('Error loading fitness data from tbl_fitness:', fitnessError);
        setFitnessData([]);
        setFilteredFitnessData([]);
        return;
      }

      // ดึงข้อมูลเจ้าของทั้งหมด
      const { data: ownerData, error: ownerError } = await supabase
        .from('tbl_owner')
        .select('owner_uid, owner_name, owner_email, auth_user_id');

      if (ownerError) {
        console.error('Error loading owner data:', ownerError);
      }

      // ดึงข้อมูลอุปกรณ์ทั้งหมด
      const { data: equipmentData, error: equipmentError } = await supabase
        .from('tbl_equipment')
        .select('*');

      if (equipmentError) {
        console.error('Error loading equipment data:', equipmentError);
      } else {
        console.log('Equipment data loaded:', equipmentData);
      }

      console.log('Raw fitness data from database:', fitnessData);
      console.log('Owner data from database:', ownerData);

      // สร้าง map สำหรับ owner data เพื่อใช้ในการ lookup
      const ownerMap = {};
      if (ownerData) {
        ownerData.forEach(owner => {
          // Map ทั้ง owner_uid, owner_name และ auth_user_id
          ownerMap[owner.owner_uid] = owner;
          ownerMap[owner.owner_uid.toString()] = owner; // เผื่อเป็น string
          ownerMap[owner.owner_name] = owner; // Map by name
          if (owner.auth_user_id) {
            ownerMap[owner.auth_user_id] = owner;
          }
        });
      }
      // สร้าง equipment map สำหรับ fitness แต่ละแห่ง โดยใช้ fitness_id
      const equipmentMap = {};
      if (equipmentData) {
        console.log('💪 Equipment data available:', equipmentData);
        console.log('💪 Equipment count:', equipmentData.length);
        
        equipmentData.forEach(equipment => {
          console.log('💪 Processing equipment:', equipment);
          console.log('💪 Equipment fitness_id:', equipment.fitness_id);
          
          // ใช้ fitness_id เป็นหลักในการจับคู่
          const fitnessId = equipment.fitness_id;
          if (fitnessId) {
            if (!equipmentMap[fitnessId]) {
              equipmentMap[fitnessId] = [];
            }
            equipmentMap[fitnessId].push(equipment);
            console.log(`💪 Added equipment "${equipment.em_name || equipment.eq_name}" to fitness_id: ${fitnessId}`);
          } else {
            console.log('💪 Equipment has no fitness_id:', equipment);
          }
        });
        console.log('💪 Final equipment map:', equipmentMap);
        console.log('💪 Equipment map keys:', Object.keys(equipmentMap));
      } else {
        console.log('💪 No equipment data found');
      }

      if (fitnessData) {
        console.log('Raw fitness data from database:', fitnessData);
        // แปลงข้อมูลจาก tbl_fitness ให้เป็นรูปแบบที่ใช้แสดงผล
        const transformedData = fitnessData?.map(fitness => {
          // หา owner จาก fit_user หรือ created_by
          const owner = ownerMap[fitness.fit_user] || ownerMap[fitness.created_by] || null;
          
          // หาอุปกรณ์ของฟิตเนสนี้โดยใช้ fit_id
          let fitnessEquipment = equipmentMap[fitness.fit_id] || [];
          
          console.log(`💪 Looking for equipment with fitness_id: ${fitness.fit_id}`);
          console.log(`💪 Found equipment for ${fitness.fit_name}:`, fitnessEquipment);
          console.log(`💪 Equipment count: ${fitnessEquipment.length}`);
          
          return {
            id: fitness.fit_id,
            fitness_name: fitness.fit_name || 'ไม่ระบุชื่อ',
            location: fitness.fit_address || 'ไม่ระบุที่อยู่',
            phone: fitness.fit_phone || 'ไม่ระบุเบอร์โทร',
            description: fitness.fit_moredetails || 'ไม่มีรายละเอียด',
            owner_name: owner?.owner_name || 'ไม่ระบุเจ้าของ',
            owner_email: owner?.owner_email || '',
            rating: 4.5, // ค่าเริ่มต้น
            price_per_day: fitness.fit_price || 100,
            hours: fitness.fit_dateopen && fitness.fit_dateclose 
              ? formatTime(`${fitness.fit_dateopen} - ${fitness.fit_dateclose}`)
              : 'จ-ส: 06.00 - 22.00',
            status: 'active',
            image: fitness.fit_image,
            image_secondary: fitness.fit_image_secondary,
            // เพิ่มรูปภาพเสริม
            fit_image2: fitness.fit_image2,
            fit_image3: fitness.fit_image3,
            fit_image4: fitness.fit_image4,
            // เพิ่มพิกัด
            fit_location: fitness.fit_location,
            // เพิ่มข้อมูลอุปกรณ์
            equipment: fitnessEquipment,
            contact: fitness.fit_contact || 'ไม่ระบุข้อมูลติดต่อ'
          };
        }) || [];
        
        console.log('Transformed fitness data:', transformedData);
        setFitnessData(transformedData);
        setFilteredFitnessData(transformedData); // ตั้งค่าข้อมูลที่กรองแล้ว
      } else {
        setFitnessData([]);
        setFilteredFitnessData([]);
      }
    } catch (error) {
      console.error('Error:', error);
      setFitnessData([]);
      setFilteredFitnessData([]);
    }
  }, []); // empty dependency array เพราะไม่ dependency ใดๆ

  // useEffect สำหรับอัปเดตการกรองเมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    let filtered = [...fitnessData];

    // ค้นหาตามชื่อ, ที่อยู่, หรือเจ้าของ
    if (searchTerm) {
      filtered = filtered.filter(fitness => 
        fitness.fitness_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fitness.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        fitness.owner_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // กรองตามราคา
    if (priceFilter !== 'all') {
      switch (priceFilter) {
        case 'under50':
          filtered = filtered.filter(fitness => fitness.price_per_day < 50);
          break;
        case '50-100':
          filtered = filtered.filter(fitness => fitness.price_per_day >= 50 && fitness.price_per_day <= 100);
          break;
        case '100-200':
          filtered = filtered.filter(fitness => fitness.price_per_day > 100 && fitness.price_per_day <= 200);
          break;
        case 'over200':
          filtered = filtered.filter(fitness => fitness.price_per_day > 200);
          break;
        default:
          break;
      }
    }

    // เรียงลำดับ
    switch (sortBy) {
      case 'newest':
        // เรียงตามลำดับที่เพิ่มล่าสุด (ถ้ามี created_at)
        break;
      case 'price-low':
        filtered.sort((a, b) => a.price_per_day - b.price_per_day);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price_per_day - a.price_per_day);
        break;
      case 'name':
        filtered.sort((a, b) => a.fitness_name.localeCompare(b.fitness_name));
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      default:
        break;
    }

    setFilteredFitnessData(filtered);
  }, [fitnessData, searchTerm, priceFilter, sortBy]);

  // Function สำหรับนำทางกลับหน้าหลัก
  const handleNavigateToHome = () => {
    loadFitnessData(); // โหลดข้อมูลฟิตเนสใหม่
    setCurrentPage('หน้าหลัก');
  };

  // Function สำหรับเปิด Modal แสดงรูป
  const handleShowImages = (fitness) => {
    setSelectedFitness(fitness);
    setShowImageModal(true);
  };

  // Function สำหรับปิด Modal
  const handleCloseModal = () => {
    setShowImageModal(false);
    setSelectedFitness(null);
  };

  const handleShowDetail = (fitness) => {
    setSelectedFitness(fitness);
    setCurrentPage('fitness-detail');
  };



  // ฟังก์ชันสำหรับ Image Gallery
  const handleOpenImageGallery = (fitness, imageIndex = 0) => {
    setSelectedFitness(fitness);
    setSelectedImageIndex(imageIndex);
    setShowImageGallery(true);
  };

  const handleCloseImageGallery = () => {
    setShowImageGallery(false);
    setSelectedFitness(null);
    setSelectedImageIndex(0);
  };

  // ฟังก์ชันดูพิกัด
  const handleViewLocation = (fitness) => {
    console.log('🗺️ Viewing location for:', fitness);
    console.log('🗺️ fit_location:', fitness.fit_location);
    
    if (fitness.fit_location) {
      const coords = fitness.fit_location.split(',');
      console.log('🗺️ Parsed coordinates:', coords);
      
      if (coords.length === 2) {
        const lat = parseFloat(coords[0].trim());
        const lng = parseFloat(coords[1].trim());
        console.log('🗺️ Lat:', lat, 'Lng:', lng);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
          console.log('🗺️ Opening URL:', googleMapsUrl);
          window.open(googleMapsUrl, '_blank');
        } else {
          alert('ข้อมูลพิกัดไม่ใช่ตัวเลข');
        }
      } else {
        alert('รูปแบบพิกัดไม่ถูกต้อง (ต้องเป็น lat,lng)');
      }
    } else {
      alert('ไม่มีข้อมูลพิกัด');
    }
  };

  // เพิ่ม useEffect สำหรับโหลดข้อมูลฟิตเนสเมื่อเริ่มต้น
  useEffect(() => {
    console.log('Loading fitness data on app start...');
    loadFitnessData();
    
    // Real-time subscription สำหรับการอัปเดตข้อมูลฟิตเนส
    const fitnessSubscription = supabase
      .channel('fitness-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'tbl_fitness' }, 
        (payload) => {
          console.log('Fitness data changed:', payload);
          loadFitnessData(); // โหลดข้อมูลใหม่อัตโนมัติ
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      supabase.removeChannel(fitnessSubscription);
    };
  }, [loadFitnessData]);

  // ในหน้าแสดงฟิตเนส (เช่น App.js หรือหน้าค้นหา)
  // ดึงข้อมูลฟิตเนสทั้งหมดที่มีใน database มาแสดงทันที ไม่ต้องรอ login
  useEffect(() => {
    const fetchAllFitness = async () => {
      const { data } = await supabase
        .from('tbl_fitness')
        .select('*');
      if (data) {
        setFitnessData(data); // setFitnessData คือ state สำหรับเก็บข้อมูลฟิตเนสทั้งหมด
      }
    };
    fetchAllFitness();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setMessage('รหัสผ่านไม่ตรงกัน');
      setIsLoading(false);
      return;
    }

    try {
      // สมัครสมาชิกด้วย Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: undefined, // ปิด email confirmation
          data: {
            full_name: formData.fullName,
            role: formData.role
          }
        }
      });

      if (authError) {
        throw authError;
      }

      // เพิ่มข้อมูลลงในตารางที่เหมาะสมตาม role
      let insertData = {
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      let tableName = '';
      
      switch (formData.role) {
        case 'user':
          tableName = 'profiles';
          insertData = {
            ...insertData,
            user_uid: authData.user.id,  // ใช้ user_uid แทน auth_user_id
            username: formData.email.split('@')[0],
            useremail: formData.email,
            full_name: formData.fullName,
            userage: null,
            usertel: null,
            profile_image: null
          };
          break;
        case 'partner':
          tableName = 'tbl_owner';
          insertData = {
            ...insertData,
            auth_user_id: authData.user.id,  // ถ้า tbl_owner ใช้ auth_user_id
            owner_name: formData.fullName,
            owner_email: formData.email,
            owner_password: formData.password // ใช้รหัสผ่านจากฟอร์ม
          };
          break;
        default:
          throw new Error('ประเภทผู้ใช้ไม่ถูกต้อง');
      }

      const { error: insertError } = await supabase
        .from(tableName)
        .insert([insertData]);

      if (insertError) {
        throw insertError;
      }

      setMessage('สมัครสมาชิกสำเร็จ! คุณสามารถเข้าสู่ระบบได้ทันที');
      
      // รีเซ็ตฟอร์ม
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        role: 'user'
      });

      // เปลี่ยนไปหน้าเข้าสู่ระบบหลัง 3 วินาที
      setTimeout(() => {
        setCurrentPage('เข้าสู่ระบบ');
      }, 3000);

    } catch (error) {
      console.error('Registration error:', error);
      
      // Handle specific error cases
      if (error.message.includes('User already registered')) {
        setMessage('อีเมลนี้ถูกใช้ไปแล้ว กรุณาใช้อีเมลอื่น');
      } else if (error.message.includes('Password should be at least 6 characters')) {
        setMessage('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      } else if (error.message.includes('Invalid email')) {
        setMessage('รูปแบบอีเมลไม่ถูกต้อง');
      } else if (error.message.includes('Signup requires a valid password')) {
        setMessage('กรุณาใส่รหัสผ่าน');
      } else {
        setMessage(`เกิดข้อผิดพลาดในการสมัครสมาชิก: ${error.message}`);
      }
    }

    setIsLoading(false);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });

      if (error) {
        // Handle specific error types
        let errorMessage = '';
        switch (error.message) {
          case 'Invalid login credentials':
            errorMessage = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
            break;
          case 'Email not confirmed':
            errorMessage = 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ ตรวจสอบในกล่องจดหมาย';
            break;
          case 'Too many requests':
            errorMessage = 'มีการพยายามเข้าสู่ระบบมากเกินไป กรุณารอสักครู่';
            break;
          default:
            errorMessage = `เกิดข้อผิดพลาด: ${error.message}`;
        }
        throw new Error(errorMessage);
      }

      setMessage('เข้าสู่ระบบสำเร็จ!');
      // รีเซ็ตฟอร์ม
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        role: 'user'
      });

      // ตรวจสอบประเภทผู้ใช้หลัง login
      setTimeout(async () => {
        const currentUser = await supabase.auth.getUser();
        if (currentUser.data?.user) {
          // ตรวจสอบ tbl_owner ก่อน
          const { data: owner } = await supabase
            .from('tbl_owner')
            .select('*')
            .eq('auth_user_id', currentUser.data.user.id)
            .single();

          if (owner) {
            setCurrentPage('mainpartners');
            return;
          }

          // ถ้าไม่ใช่ partner ให้ตรวจสอบ profiles
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_uid', currentUser.data.user.id)
            .single();

          if (profile) {
            setCurrentPage('โปรไฟล์');
            return;
          }

          // ถ้าไม่เจอในทั้งสองตาราง ให้ไปหน้าโปรไฟล์
          setCurrentPage('โปรไฟล์');
        }
      }, 1000);

    } catch (error) {
      console.error('Login error:', error);
      setMessage(error.message);
    }

    setIsLoading(false);
  };

  const handleLogout = async () => {
    console.log('handleLogout called in App.js');
    try {
      console.log('Attempting to sign out...');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase signOut error:', error);
        throw error;
      }
      
      console.log('Supabase signOut successful');
      
      // Clear state manually เพื่อให้แน่ใจว่าออกจากระบบ
      setUser(null);
      setUserProfile(null);
      setMessage('ออกจากระบบสำเร็จ');
      setCurrentPage('หน้าหลัก');
      
      // Clear form data
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        role: 'user'
      });
      
      console.log('All user data cleared, redirecting to หน้าหลัก');
      
    } catch (error) {
      console.error('Logout error:', error);
      setMessage(`เกิดข้อผิดพลาด: ${error.message}`);
    }
  };

  const renderContent = () => {
    // Force show homepage if no user
    if (!user || !userProfile) {
      return (
        <div className="home-content">
          <div className="fitness-section">
            <div className="fitness-header">
              <div className="fitness-title">
                <h2>ฟิตเนสที่อยู่ใกล้</h2>
                <p className="fitness-count">พบ {filteredFitnessData.length} แห่ง จากทั้งหมด {fitnessData.length} แห่ง</p>
              </div>
              <button 
                className="refresh-btn" 
                onClick={loadFitnessData}
                title="รีเฟรชข้อมูล"
              >
                🔄 รีเฟรช
              </button>
            </div>
            
            {/* ระบบค้นหาและกรอง */}
            <div className="search-filter-section">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="ค้นหาฟิตเนส, ที่อยู่, หรือเจ้าของ..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                <span className="search-icon">🔍</span>
              </div>
              
              <div className="filter-section">
                <select 
                  value={priceFilter} 
                  onChange={(e) => setPriceFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">ทุกราคา</option>
                  <option value="under50">ต่ำกว่า 50 บาท</option>
                  <option value="50-100">50-100 บาท</option>
                  <option value="over100">มากกว่า 100 บาท</option>
                </select>
                
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                  className="filter-select"
                >
                  <option value="newest">ใหม่ล่าสุด</option>
                  <option value="price-low">ราคาต่ำ-สูง</option>
                  <option value="price-high">ราคาสูง-ต่ำ</option>
                  <option value="name">ชื่อ A-Z</option>
                </select>
              </div>
            </div>
            
            {/* รายการฟิตเนส */}
            <div className="fitness-grid">
              {filteredFitnessData.length > 0 ? (
                filteredFitnessData.map((fitness, index) => (
                  <div key={fitness.fit_id || index} className="fitness-card">
                    <div className="fitness-image-container">
                      <img 
                        src={fitness.image || "data:image/svg+xml,%3Csvg width='300' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%' height='100%' fill='%23f0f0f0'/%3E%3Ctext x='50%' y='50%' font-size='18' fill='%23666' text-anchor='middle' dy='.3em'%3EGym Image%3C/text%3E%3C/svg%3E"}
                        alt={fitness.fitness_name}
                        className="fitness-image"
                        onClick={() => handleShowImages(fitness)}
                        onError={(e) => {
                          e.target.src = "data:image/svg+xml,%3Csvg width='300' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%' height='100%' fill='%23f0f0f0'/%3E%3Ctext x='50%' y='50%' font-size='18' fill='%23666' text-anchor='middle' dy='.3em'%3EGym Image%3C/text%3E%3C/svg%3E";
                        }}
                      />
                      <div className="fitness-status">
                        <span className="status-text">เปิดทำการ</span>
                        <span className="status-dot green"></span>
                      </div>
                      <button className="favorite-btn">❤️</button>
                    </div>
                    <div className="fitness-info">
                      <h3>{fitness.fitness_name}</h3>
                      <p className="fitness-location">📍 {fitness.location}</p>
                      <p className="fitness-phone">📞 {fitness.phone}</p>
                      <p className="fitness-owner">👤 {fitness.owner_name}</p>
                      <div className="fitness-details">
                        <span className="fitness-hours">🕒 {formatTime(fitness.hours)}</span>
                        <div className="fitness-rating">
                          <span className="stars">⭐</span>
                          <span>{fitness.rating || '4.5'}</span>
                        </div>
                      </div>
                      <div className="fitness-price">
                        <span>{fitness.price_per_day || 100}</span>
                        <span>บาท/วัน</span>
                      </div>
                      <button 
                        className="detail-btn"
                        onClick={() => handleShowDetail(fitness)}
                      >
                        📋 ดูรายละเอียด
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="no-fitness">
                  {fitnessData.length === 0 ? (
                    <>
                      <p>ยังไม่มีข้อมูลฟิตเนส</p>
                      <p>เจ้าของฟิตเนสสามารถเพิ่มข้อมูลได้ที่หน้า Partner</p>
                    </>
                  ) : (
                    <>
                      <p>ไม่พบฟิตเนสที่ตรงกับเงื่อนไขการค้นหา</p>
                      <p>ลองเปลี่ยนคำค้นหาหรือเงื่อนไขการกรอง</p>
                      <button 
                        onClick={() => {
                          setSearchTerm('');
                          setPriceFilter('all');
                          setSortBy('newest');
                        }}
                        className="clear-filters-btn"
                      >
                        เคลียร์การค้นหา
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    switch (currentPage) {
      case 'หน้าหลัก':
        return (
          <div className="home-content">
            <div className="fitness-section">
              <div className="fitness-header">
                <div className="fitness-title">
                  <h2>ฟิตเนสที่อยู่ใกล้</h2>
                  <p className="fitness-count">พบ {filteredFitnessData.length} แห่ง จากทั้งหมด {fitnessData.length} แห่ง</p>
                </div>
                <button 
                  className="refresh-btn" 
                  onClick={loadFitnessData}
                  title="รีเฟรชข้อมูล"
                >
                  🔄 รีเฟรช
                </button>
              </div>
              
              {/* ระบบค้นหาและกรอง */}
              <div className="search-filter-section">
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="ค้นหาฟิตเนส, ที่อยู่, หรือเจ้าของ..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                  <span className="search-icon">🔍</span>
                </div>
                
                <div className="filter-section">
                  <select 
                    value={priceFilter} 
                    onChange={(e) => setPriceFilter(e.target.value)}
                    className="filter-select"
                  >
                    <option value="all">ทุกราคา</option>
                    <option value="under50">ต่ำกว่า 50 บาท</option>
                    <option value="50-100">50-100 บาท</option>
                    <option value="100-200">100-200 บาท</option>
                    <option value="over200">มากกว่า 200 บาท</option>
                  </select>
                  
                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value)}
                    className="filter-select"
                  >
                    <option value="newest">ล่าสุด</option>
                    <option value="price-low">ราคาต่ำ-สูง</option>
                    <option value="price-high">ราคาสูง-ต่ำ</option>
                    <option value="name">ชื่อ A-Z</option>
                    <option value="rating">คะแนนสูงสุด</option>
                  </select>
                </div>
              </div>
              <div className="fitness-grid">
                {filteredFitnessData.length > 0 ? (
                  filteredFitnessData.map((fitness, index) => (
                    <div key={fitness.id || index} className="fitness-card">
                      <div className="fitness-image" onClick={() => handleShowImages(fitness)}>
                        <div className="image-gallery">
                          <img 
                            src={fitness.image || "data:image/svg+xml,%3Csvg width='300' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%' height='100%' fill='%23f0f0f0'/%3E%3Ctext x='50%' y='50%' font-size='18' fill='%23666' text-anchor='middle' dy='.3em'%3EGym Image%3C/text%3E%3C/svg%3E"}
                            alt={fitness.fitness_name}
                            className="main-image"
                            onError={(e) => {
                              e.target.src = "data:image/svg+xml,%3Csvg width='300' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='100%' height='100%' fill='%23f0f0f0'/%3E%3Ctext x='50%' y='50%' font-size='18' fill='%23666' text-anchor='middle' dy='.3em'%3EGym Image%3C/text%3E%3C/svg%3E";
                            }}
                          />
                          {fitness.image_secondary && (
                            <div className="secondary-image-indicator">
                              <span>+1</span>
                            </div>
                          )}
                        </div>
                        <div className="fitness-status">
                          <span className="status-dot green"></span>
                        </div>
                        <button className="favorite-btn">❤️</button>
                      </div>
                      <div className="fitness-info">
                        <h3>{fitness.fitness_name}</h3>
                        <p className="fitness-location">📍 {fitness.location}</p>
                        <p className="fitness-phone">📞 {fitness.phone}</p>
                        <p className="fitness-owner">👤 {fitness.owner_name}</p>
                        <div className="fitness-details">
                          <span className="fitness-hours">🕒 {formatTime(fitness.hours)}</span>
                          <div className="fitness-rating">
                            <span className="stars">⭐</span>
                            <span>{fitness.rating || '4.5'}</span>
                          </div>
                        </div>
                        <div className="fitness-price">
                          <span>{fitness.price_per_day || 100}</span>
                          <span>บาท/วัน</span>
                        </div>
                        <button 
                          className="detail-btn"
                          onClick={() => handleShowDetail(fitness)}
                        >
                          📋 ดูรายละเอียด
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-fitness">
                    {fitnessData.length === 0 ? (
                      <>
                        <p>ยังไม่มีข้อมูลฟิตเนส</p>
                        <p>เจ้าของฟิตเนสสามารถเพิ่มข้อมูลได้ที่หน้า Partner</p>
                      </>
                    ) : (
                      <>
                        <p>ไม่พบฟิตเนสที่ตรงกับเงื่อนไขการค้นหา</p>
                        <p>ลองเปลี่ยนคำค้นหาหรือเงื่อนไขการกรอง</p>
                        <button 
                          onClick={() => {
                            setSearchTerm('');
                            setPriceFilter('all');
                            setSortBy('newest');
                          }}
                          className="clear-filters-btn"
                        >
                          เคลียร์การค้นหา
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Image Modal */}
            {showImageModal && selectedFitness && (
              <div className="image-modal-overlay" onClick={handleCloseModal}>
                <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <h3>{selectedFitness.fitness_name}</h3>
                    <button className="close-btn" onClick={handleCloseModal}>×</button>
                  </div>
                  <div className="modal-body">
                    <div className="image-gallery-modal">
                      {selectedFitness.image && (
                        <div className="modal-image-container">
                          <img src={selectedFitness.image} alt="รูปหลัก" />
                          <span className="image-caption">รูปภาพหลัก</span>
                        </div>
                      )}
                      {selectedFitness.image_secondary && (
                        <div className="modal-image-container">
                          <img src={selectedFitness.image_secondary} alt="รูปรอง" />
                          <span className="image-caption">รูปภาพรอง</span>
                        </div>
                      )}
                    </div>
                    <div className="fitness-details-modal">
                      <p><strong>ที่อยู่:</strong> {selectedFitness.location}</p>
                      <p><strong>เวลาทำการ:</strong> {formatTime(selectedFitness.hours)}</p>
                      <p><strong>ราคา:</strong> {selectedFitness.price_per_day} บาท/วัน</p>
                      <p><strong>เบอร์โทร:</strong> {selectedFitness.phone}</p>
                      {selectedFitness.description && (
                        <p><strong>รายละเอียด:</strong> {selectedFitness.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Image Gallery Modal */}
            {showImageGallery && selectedFitness && (
              <div className="image-gallery-overlay" onClick={handleCloseImageGallery}>
                <div className="image-gallery-content" onClick={(e) => e.stopPropagation()}>
                  <div className="gallery-header">
                    <h3>{selectedFitness.fitness_name} - รูปภาพ</h3>
                    <button className="close-btn" onClick={handleCloseImageGallery}>×</button>
                  </div>
                  <div className="gallery-body">
                    <div className="main-gallery-image">
                      {(() => {
                        const images = [
                          selectedFitness.image,
                          selectedFitness.fit_image2,
                          selectedFitness.fit_image3,
                          selectedFitness.fit_image4
                        ].filter(img => img);
                        
                        return images[selectedImageIndex] ? (
                          <img 
                            src={images[selectedImageIndex]} 
                            alt={`รูปภาพ ${selectedImageIndex + 1}`}
                            className="gallery-main-image"
                          />
                        ) : (
                          <div className="no-image">ไม่มีรูปภาพ</div>
                        );
                      })()}
                    </div>
                    
                    <div className="gallery-thumbnails">
                      {[
                        { src: selectedFitness.image, label: 'รูปหลัก' },
                        { src: selectedFitness.fit_image2, label: 'รูปเสริม 1' },
                        { src: selectedFitness.fit_image3, label: 'รูปเสริม 2' },
                        { src: selectedFitness.fit_image4, label: 'รูปเสริม 3' }
                      ].map((item, index) => (
                        item.src && (
                          <div 
                            key={index}
                            className={`thumbnail ${selectedImageIndex === index ? 'active' : ''}`}
                            onClick={() => setSelectedImageIndex(index)}
                          >
                            <img src={item.src} alt={item.label} />
                            <span className="thumbnail-label">{item.label}</span>
                          </div>
                        )
                      ))}
                    </div>
                    
                    <div className="gallery-navigation">
                      <button 
                        className="nav-btn prev"
                        onClick={() => {
                          const images = [
                            selectedFitness.image,
                            selectedFitness.fit_image2,
                            selectedFitness.fit_image3,
                            selectedFitness.fit_image4
                          ].filter(img => img);
                          const prevIndex = selectedImageIndex > 0 ? selectedImageIndex - 1 : images.length - 1;
                          setSelectedImageIndex(prevIndex);
                        }}
                      >
                        ‹ ก่อนหน้า
                      </button>
                      <button 
                        className="nav-btn next"
                        onClick={() => {
                          const images = [
                            selectedFitness.image,
                            selectedFitness.fit_image2,
                            selectedFitness.fit_image3,
                            selectedFitness.fit_image4
                          ].filter(img => img);
                          const nextIndex = selectedImageIndex < images.length - 1 ? selectedImageIndex + 1 : 0;
                          setSelectedImageIndex(nextIndex);
                        }}
                      >
                        ถัดไป ›
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'เข้าสู่ระบบ':
        return (
          <div className="login-content">
            <h2>เข้าสู่ระบบ</h2>
            {message && (
              <div className={`message ${message.includes('สำเร็จ') ? 'success' : 'error'}`}>
                {message}
              </div>
            )}
            <form className="login-form" onSubmit={handleLogin}>
              <div className="form-group">
                <label>อีเมล:</label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="กรุณาใส่อีเมล" 
                  required
                />
              </div>
              <div className="form-group">
                <label>รหัสผ่าน:</label>
                <input 
                  type="password" 
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="กรุณาใส่รหัสผ่าน" 
                  required
                />
              </div>
              <button 
                type="submit" 
                className="login-btn"
                disabled={isLoading}
              >
                {isLoading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
              </button>
            </form>
            <p className="signup-link">
              ยังไม่มีบัญชี? <span className="link" onClick={() => setCurrentPage('สมัครสมาชิก')}>สมัครสมาชิก</span>
            </p>
          </div>
        );
      case 'สมัครสมาชิก':
        return (
          <div className="register-content">
            <h2>สมัครสมาชิก</h2>
            {message && (
              <div className={`message ${message.includes('สำเร็จ') ? 'success' : 'error'}`}>
                {message}
              </div>
            )}
            <form className="register-form" onSubmit={handleRegister}>
              <div className="form-group">
                <label>ชื่อ-นามสกุล:</label>
                <input 
                  type="text" 
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="กรุณาใส่ชื่อ-นามสกุล" 
                  required 
                />
              </div>
              <div className="form-group">
                <label>อีเมล:</label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="กรุณาใส่อีเมล" 
                  required 
                />
              </div>
              <div className="form-group">
                <label>รหัสผ่าน:</label>
                <input 
                  type="password" 
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="กรุณาใส่รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)" 
                  required 
                  minLength="6"
                />
              </div>
              <div className="form-group">
                <label>ยืนยันรหัสผ่าน:</label>
                <input 
                  type="password" 
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="กรุณายืนยันรหัสผ่าน" 
                  required 
                />
              </div>
              <div className="form-group">
                <label>ประเภทผู้ใช้:</label>
                <select 
                  name="role" 
                  value={formData.role}
                  onChange={handleInputChange}
                  className="role-select"
                >
                  <option value="user">👤 ผู้ใช้ทั่วไป</option>
                  <option value="partner">🤝 พาร์ทเนอร์</option>
                </select>
              </div>
              <button 
                type="submit" 
                className="register-btn"
                disabled={isLoading}
              >
                {isLoading ? 'กำลังสมัคร...' : 'สมัครสมาชิก'}
              </button>
            </form>
            <p className="login-link">
              มีบัญชีแล้ว? <span className="link" onClick={() => setCurrentPage('เข้าสู่ระบบ')}>เข้าสู่ระบบ</span>
            </p>
          </div>
        );
      case 'โปรไฟล์':
        console.log('Rendering ProfilePage with user:', user);
        return (
          <ProfilePage 
            user={user} 
            onLogout={handleLogout}
          />
        );
      case 'mainpartners':
        // ดึงข้อมูล ownerData จาก userProfile ที่เป็น partner
        console.log('🔍 MainPartners - userProfile:', userProfile);
        if (userProfile?.role === 'partner') {
          return (
            <MainPartners 
              user={user}
              ownerData={userProfile}
              onLogout={handleLogout}
              onNavigateToHome={handleNavigateToHome}
            />
          );
        }
        // fallback ถ้าไม่ใช่ partner
        return <div>ไม่พบข้อมูลแดชบอร์ดพาร์ทเนอร์</div>;
      case 'fitness-detail':
        return (
          <div className="fitness-detail-page">
            <div className="detail-header">
              <button 
                className="back-btn"
                onClick={() => setCurrentPage('หน้าหลัก')}
              >
                ← กลับ
              </button>
            </div>
            {selectedFitness && (
              <FitnessDetailModal
                isOpen={true}
                onClose={() => setCurrentPage('หน้าหลัก')}
                fitnessData={selectedFitness}
                onViewLocation={handleViewLocation}
                onOpenImageGallery={handleOpenImageGallery}
                isFullPage={true}
              />
            )}
          </div>
        );
      default:
        return <div>ไม่พบหน้าที่ต้องการ</div>;
    }
  };

    return (
    <div className="App">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-brand">
          <h2>PJ Fitness</h2>
        </div>
        <ul className="navbar-menu">
          <li 
            className={currentPage === 'หน้าหลัก' ? 'active' : ''}
            onClick={() => setCurrentPage('หน้าหลัก')}
          >
            หน้าหลัก
          </li>
          {!user ? (
            <>
              <li 
                className={currentPage === 'เข้าสู่ระบบ' ? 'active' : ''}
                onClick={() => setCurrentPage('เข้าสู่ระบบ')}
              >
                เข้าสู่ระบบ
              </li>
              <li 
                className={currentPage === 'สมัครสมาชิก' ? 'active' : ''}
                onClick={() => setCurrentPage('สมัครสมาชิก')}
              >
                สมัครสมาชิก
              </li>
            </>
          ) : (
            <>
              {userProfile?.role === 'partner' ? (
              <li 
                  className={currentPage === 'mainpartners' ? 'active' : ''}
                  onClick={() => setCurrentPage('mainpartners')}
              >
                  แดชบอร์ดพาร์ทเนอร์
              </li>
              ) : (
              <li 
                  className={currentPage === 'โปรไฟล์' ? 'active' : ''}
                  onClick={() => setCurrentPage('โปรไฟล์')}
              >
                  โปรไฟล์
                </li>
              )}
              <li className="user-info">
                👤 {
                  userProfile?.full_name || 
                  userProfile?.owner_name || 
                  user?.user_metadata?.full_name ||
                  user?.email?.split('@')[0] ||
                  'ผู้ใช้'
                }
                {userProfile?.role && (
                  <span className="user-role">
                    ({userProfile.role === 'user' ? 'ผู้ใช้' : 'พาร์ทเนอร์'})
                  </span>
                )}
              </li>
              <li 
                className="logout-btn"
                onClick={() => {
                  console.log('Logout button clicked from navbar');
                  handleLogout();
                }}
                style={{cursor: 'pointer'}}
              >
                🚪 ออกจากระบบ
              </li>
            </>
          )}
        </ul>
      </nav>

      {/* Main Content */}
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;