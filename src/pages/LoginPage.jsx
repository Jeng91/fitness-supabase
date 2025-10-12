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
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // ตรวจสอบว่า user ล็อกอินอยู่แล้วหรือไม่
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // ตรวจสอบ role และ redirect
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('user_uid', user.id)
          .single();

        const { data: owner } = await supabase
          .from('tbl_owner')
          .select('*')
          .eq('auth_user_id', user.id)
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) {
        console.error('Auth error:', error);
        throw error;
      }

      setMessage('เข้าสู่ระบบสำเร็จ!');

      // ตรวจสอบ role และ redirect ทันที
      try {
        
        // ตรวจสอบใน tbl_owner ก่อน (partner)
        const { data: owner, error: ownerError } = await supabase
          .from('tbl_owner')
          .select('*')
          .eq('auth_user_id', data.user.id)
          .single();

        if (owner && !ownerError) {
          navigate('/partner');
          return;
        }

        // ตรวจสอบใน profiles (user ทั่วไป)
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_uid', data.user.id)
          .single();

        if (profile && !profileError) {
          navigate('/'); // หน้าหลักสำหรับ user ทั่วไป
          return;
        }

        // ถ้าไม่เจอในทั้งสองตาราง ให้ไปหน้าหลัก
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

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setIsResetting(true);
    setResetMessage('');

    try {
      // ใช้ Supabase Auth resetPasswordForEmail
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        throw error;
      }

      setResetMessage('ลิงก์รีเซ็ตรหัสผ่านได้ถูกส่งไปยังอีเมลของคุณแล้ว กรุณาตรวจสอบอีเมล');
      
    } catch (error) {
      console.error('Password reset error:', error);
      if (error.message.includes('User not found')) {
        setResetMessage('ไม่พบอีเมลนี้ในระบบ');
      } else {
        setResetMessage('เกิดข้อผิดพลาดในการส่งอีเมล กรุณาลองใหม่อีกครั้ง');
      }
    }

    setIsResetting(false);
  };

  const closeForgotPasswordModal = () => {
    setShowForgotPassword(false);
    setResetEmail('');
    setResetMessage('');
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
        <p className="forgot-password-link">
          <span className="link" onClick={() => setShowForgotPassword(true)}>ลืมรหัสผ่าน?</span>
        </p>
        <p className="signup-link">
          ยังไม่มีบัญชี? <span className="link" onClick={() => navigate('/register')}>สมัครสมาชิก</span>
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="modal-overlay" onClick={closeForgotPasswordModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>รีเซ็ตรหัสผ่าน</h3>
              <button className="close-btn" onClick={closeForgotPasswordModal}>
                ×
              </button>
            </div>
            
            <div className="modal-body">
              {resetMessage && (
                <div className={`message ${resetMessage.includes('ส่งไปยัง') || resetMessage.includes('สำเร็จ') ? 'success' : 'error'}`}>
                  {resetMessage}
                </div>
              )}
              
              <form onSubmit={handleForgotPassword}>
                  <div className="form-group">
                    <label>อีเมลของคุณ:</label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="กรอกอีเมลที่ใช้สมัครสมาชิก"
                      required
                      disabled={isResetting}
                    />
                  </div>
                  <div className="modal-actions">
                    <button 
                      type="submit" 
                      className="submit-btn"
                      disabled={isResetting || !resetEmail}
                    >
                      {isResetting ? 'กำลังส่งอีเมล...' : 'ส่งลิงก์รีเซ็ต'}
                    </button>
                    <button 
                      type="button" 
                      className="cancel-btn"
                      onClick={closeForgotPasswordModal}
                      disabled={isResetting}
                    >
                      ยกเลิก
                    </button>
                  </div>
                </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default LoginPage;