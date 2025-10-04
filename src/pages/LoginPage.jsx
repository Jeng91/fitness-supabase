import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import Layout from '../components/Layout';
import '../App.css';

const LoginPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // ตรวจสอบว่า user ล็อกอินอยู่แล้วหรือไม่
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // ตรวจสอบ role และ redirect
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        const { data: owner } = await supabase
          .from('tbl_owner')
          .select('*')
          .eq('owner_uid', user.id)
          .single();

        if (owner) {
          navigate('/partner');
        } else if (profile) {
          navigate('/');
        } else {
          navigate('/');
        }
      }
    };
    
    checkAuth();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      console.log('Attempting to sign in with:', formData.email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        console.error('Auth error:', error);
        throw error;
      }

      console.log('Auth successful, user:', data.user);
      setMessage('เข้าสู่ระบบสำเร็จ!');

      // ตรวจสอบ role และ redirect ทันที
      try {
        // ตรวจสอบใน tbl_owner ก่อน (partner)
        const { data: owner, error: ownerError } = await supabase
          .from('tbl_owner')
          .select('*')
          .eq('owner_uid', data.user.id)
          .single();

        if (owner && !ownerError) {
          console.log('Partner found:', owner);
          navigate('/partner');
          return;
        }

        // ตรวจสอบใน profiles (user ทั่วไป)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profile && !profileError) {
          console.log('Regular user found:', profile);
          navigate('/'); // หน้าหลักสำหรับ user ทั่วไป
          return;
        }

        // ถ้าไม่เจอในทั้งสองตาราง ให้ไปหน้าหลัก
        console.log('No profile found, redirecting to home');
        navigate('/');

      } catch (profileCheckError) {
        console.error('Error checking user profile:', profileCheckError);
        navigate('/'); // fallback ไปหน้าหลัก
      }

    } catch (error) {
      console.error('Login error:', error);
      setMessage(error.message);
    }

    setIsLoading(false);
  };

  return (
    <Layout>
      {/* Login Content */}
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
              required
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label>รหัสผ่าน:</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              disabled={isLoading}
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
          ยังไม่มีบัญชี? <span className="link" onClick={() => navigate('/register')}>สมัครสมาชิก</span>
        </p>
      </div>
    </Layout>
  );
};

export default LoginPage;