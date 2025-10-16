import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import supabase from '../supabaseClient';

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const loadUserProfile = async (userId) => {
    try {
      // ตรวจสอบใน profiles ก่อน
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_uid', userId)
        .single();

      if (profile) {
        setUserProfile(profile);
        return;
      }

      // ถ้าไม่พบใน profiles ให้ค้นใน tbl_owner
      const { data: owner } = await supabase
        .from('tbl_owner')
        .select('*')
        .eq('auth_user_id', userId)
        .single();

      if (owner) {
        setUserProfile({
          role: 'partner',
          full_name: owner.owner_name,
          email: owner.owner_email,
          ...owner
        });
      }
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        await loadUserProfile(user.id);
      } else {
        setUserProfile(null);
      }
    };
    
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user || null;
      setUser(currentUser);
      
      if (currentUser) {
        await loadUserProfile(currentUser.id);
      } else {
        setUserProfile(null);
      }
    });

    return () => subscription?.unsubscribe();
  }, []); // Empty dependency array

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      setIsScrolled(scrollTop > 50);
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setUserProfile(null);
      
      // Clear local storage
      localStorage.clear();
      sessionStorage.clear();
      
      navigate('/');
    } catch (error) {
      console.error('❌ Logout error:', error);
    }
  };

  const handleForceLogout = async () => {
    try {
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
              {userProfile?.profile_image ? (
                <img
                  src={userProfile.profile_image}
                  alt="avatar"
                  className="user-avatar"
                  style={{width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', marginRight: '8px'}}
                  onError={e => {e.target.style.display = 'none'}}
                />
              ) : (
                <span className="user-avatar">👤</span>
              )}
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