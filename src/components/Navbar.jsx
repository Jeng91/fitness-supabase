import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import supabase from '../supabaseClient';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        await loadUserProfile(user.id);
      }
    };
    
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        await loadUserProfile(session.user.id);
      } else {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId) => {
    try {
      // ตรวจสอบใน profiles ก่อน
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profile) {
        setUserProfile(profile);
        return;
      }

      // ถ้าไม่เจอใน profiles ตรวจสอบใน tbl_owner
      const { data: owner } = await supabase
        .from('tbl_owner')
        .select('*')
        .eq('owner_uid', userId)
        .single();

      if (owner) {
        setUserProfile({
          id: owner.owner_uid,
          full_name: owner.owner_name,
          email: owner.owner_email,
          role: 'partner',
          ...owner
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setUserProfile(null);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h2 onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          PJ Fitness
        </h2>
      </div>
      <ul className="navbar-menu">
        <li 
          className={isActive('/') ? 'active' : ''}
          onClick={() => navigate('/')}
        >
          หน้าหลัก
        </li>
        {!user ? (
          <>
            <li 
              className={isActive('/login') ? 'active' : ''}
              onClick={() => navigate('/login')}
            >
              เข้าสู่ระบบ
            </li>
            <li 
              className={isActive('/register') ? 'active' : ''}
              onClick={() => navigate('/register')}
            >
              สมัครสมาชิก
            </li>
          </>
        ) : (
          <>
            {userProfile?.role === 'partner' ? (
              <li 
                className={isActive('/partner') ? 'active' : ''}
                onClick={() => navigate('/partner')}
              >
                แดชบอร์ดพาร์ทเนอร์
              </li>
            ) : (
              <li 
                className={isActive('/profile') ? 'active' : ''}
                onClick={() => navigate('/profile')}
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
              onClick={handleLogout}
              style={{ cursor: 'pointer' }}
            >
              ออกจากระบบ
            </li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;