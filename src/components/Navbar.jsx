import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import supabase from '../supabaseClient';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      // Debug logging disabled for clean console
      // console.log('🔍 Navbar - Current user from supabase.auth.getUser():', user);
      setUser(user);
      
      if (user) {
        // console.log('✅ User found, loading profile for user ID:', user.id);
        await loadUserProfile(user.id);
      } else {
        // console.log('❌ No user found, clearing profile');
        setUserProfile(null);
      }
    };
    
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // console.log('🔄 Auth state changed:', event, session?.user || null);
      setUser(session?.user || null);
      if (session?.user) {
        await loadUserProfile(session.user.id);
      } else {
        setUserProfile(null);
      }
    });

    // Scroll effect
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 50);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const loadUserProfile = async (userId) => {
    try {
      // Debug logging disabled for clean console
      // console.log('📝 Loading user profile for ID:', userId);
      // ตรวจสอบใน profiles ก่อน
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_uid', userId)
        .single();

      if (profile) {
        // console.log('✅ Found profile in profiles table:', profile);
        setUserProfile(profile);
        return;
      }

      // ถ้าไม่เจอใน profiles ตรวจสอบใน tbl_owner
      const { data: owner } = await supabase
        .from('tbl_owner')
        .select('*')
        .eq('auth_user_id', userId)
        .single();

      if (owner) {
        // console.log('✅ Found profile in tbl_owner table:', owner);
        setUserProfile({
          id: owner.owner_uid,
          full_name: owner.owner_name,
          email: owner.owner_email,
          role: 'partner',
          ...owner
        });
      } else {
        // console.log('❌ No profile found in either table for user ID:', userId);
      }
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
    }
  };

  const handleLogout = async () => {
    try {
      // console.log('🚪 Logging out user...');
      await supabase.auth.signOut();
      setUser(null);
      setUserProfile(null);
      
      // Clear local storage
      localStorage.clear();
      sessionStorage.clear();
      
      // console.log('✅ Logout successful, navigating to home');
      navigate('/');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  };

  const handleForceLogout = async () => {
    try {
      console.log('🔥 Force logout - clearing all auth state...');
      
      // Force sign out
      await supabase.auth.signOut({ scope: 'global' });
      
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear cookies
      document.cookie.split(";").forEach((c) => {
        const eqPos = c.indexOf("=");
        const name = eqPos > -1 ? c.substr(0, eqPos) : c;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
      });
      
      // Reset component state
      setUser(null);
      setUserProfile(null);
      
      console.log('✅ Force logout complete');
      navigate('/');
      window.location.reload(); // Force reload
    } catch (error) {
      console.error('❌ Force logout error:', error);
    }
  };

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
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
              <span className="user-avatar">👤</span>
              <span className="user-details">
                {
                  userProfile?.full_name || 
                  userProfile?.owner_name || 
                  user?.user_metadata?.full_name ||
                  user?.email?.split('@')[0] ||
                  'ผู้ใช้'
                }
                {userProfile?.role && (
                  <span className="user-role">
                    {userProfile.role === 'user' ? 'สมาชิก' : 'พาร์ทเนอร์'}
                  </span>
                )}
              </span>
            </li>
            <li 
              className="logout-btn"
              onClick={handleLogout}
              style={{ cursor: 'pointer' }}
            >
              <span className="logout-icon">🚪</span>
              ออกจากระบบ
            </li>
            {/* Force Logout button - HIDDEN */}
            {false && process.env.NODE_ENV === 'development' && (
              <li 
                className="logout-btn"
                onClick={handleForceLogout}
                style={{ cursor: 'pointer', background: '#ff6b6b' }}
                title="Force Logout (Debug Only)"
              >
                <span className="logout-icon">🔥</span>
                Force Logout
              </li>
            )}
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;