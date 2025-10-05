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
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

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

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setIsResetting(true);
    setResetMessage('');

    try {
      // ตรวจสอบว่าอีเมลมีอยู่ในระบบหรือไม่
      const { data: user, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('useremail', resetEmail)
        .single();

      if (error || !user) {
        throw new Error('ไม่พบอีเมลนี้ในระบบ');
      }

      // สร้าง OTP 6 หลัก
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otpCode);
      
      // จำลองการส่ง OTP (ในการใช้งานจริงจะส่งผ่าน SMS หรือ Email)
      console.log('OTP Code:', otpCode); // สำหรับ demo
      
      setResetMessage(`OTP ได้ถูกสร้างแล้ว: ${otpCode}\n(ในการใช้งานจริงจะส่งผ่าน SMS)`);
      setShowOtpInput(true);
      
    } catch (error) {
      console.error('Password reset error:', error);
      setResetMessage(error.message);
    }

    setIsResetting(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setIsResetting(true);
    setResetMessage('');

    if (otp !== generatedOtp) {
      setResetMessage('รหัส OTP ไม่ถูกต้อง');
      setIsResetting(false);
      return;
    }

    if (newPassword.length < 6) {
      setResetMessage('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      setIsResetting(false);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setResetMessage('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      setIsResetting(false);
      return;
    }

    try {
      // ค้นหา user ID จากอีเมล
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_uid')
        .eq('useremail', resetEmail)
        .single();

      if (profileError || !profile) {
        throw new Error('ไม่พบข้อมูลผู้ใช้');
      }

      // เนื่องจากไม่สามารถใช้ admin API ได้โดยตรง
      // เราจะบันทึก OTP และรหัสผ่านใหม่ไว้ในตาราง profiles ชั่วคราว
      // หรือให้ผู้ใช้ login ด้วยรหัสผ่านเดิมแล้วเปลี่ยนรหัสผ่าน
      
      // สำหรับ demo นี้ เราจะแสดงข้อความให้ผู้ใช้ทราบ
      setResetMessage('เปลี่ยนรหัสผ่านสำเร็จ!\n(ในระบบจริงจะอัพเดทรหัสผ่านในฐานข้อมูล)');
      
      // รอ 2 วินาทีแล้วปิด modal
      setTimeout(() => {
        closeForgotPasswordModal();
        setMessage('เปลี่ยนรหัสผ่านสำเร็จ (Demo Mode) กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่');
      }, 2000);

    } catch (error) {
      console.error('Password update error:', error);
      setResetMessage(error.message);
    }

    setIsResetting(false);
  };

  const closeForgotPasswordModal = () => {
    setShowForgotPassword(false);
    setResetEmail('');
    setResetMessage('');
    setShowOtpInput(false);
    setOtp('');
    setGeneratedOtp('');
    setNewPassword('');
    setConfirmNewPassword('');
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
              <h3>{!showOtpInput ? 'รีเซ็ตรหัสผ่าน' : 'ยืนยัน OTP และเปลี่ยนรหัสผ่าน'}</h3>
              <button className="close-btn" onClick={closeForgotPasswordModal}>
                ×
              </button>
            </div>
            
            {/* Steps Indicator */}
            <div className="modal-steps">
              <div className={`step-indicator ${!showOtpInput ? 'active' : 'completed'}`}>
                1
              </div>
              <div className={`step-indicator ${showOtpInput ? 'active' : ''}`}>
                2
              </div>
            </div>
            
            <div className="modal-body">
              {resetMessage && (
                <div className={`message ${resetMessage.includes('สำเร็จ') || resetMessage.includes('ถูกสร้าง') ? 'success' : 'error'}`}>
                  {resetMessage.split('\n').map((line, index) => (
                    <div key={index}>{line}</div>
                  ))}
                </div>
              )}
              
              {!showOtpInput ? (
                // ขั้นตอนที่ 1: กรอกอีเมล
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
                      type="button" 
                      className="cancel-btn"
                      onClick={closeForgotPasswordModal}
                      disabled={isResetting}
                    >
                      ยกเลิก
                    </button>
                    <button 
                      type="submit" 
                      className="submit-btn"
                      disabled={isResetting || !resetEmail}
                    >
                      {isResetting ? 'กำลังสร้าง OTP...' : 'สร้าง OTP'}
                    </button>
                  </div>
                </form>
              ) : (
                // ขั้นตอนที่ 2: ยืนยัน OTP และเปลี่ยนรหัสผ่าน
                <form onSubmit={handleVerifyOtp}>
                  <div className="form-group">
                    <label>รหัส OTP (6 หลัก):</label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      required
                      disabled={isResetting}
                      className="otp-input"
                    />
                    <small style={{ color: '#666', fontSize: '0.8rem', display: 'block', marginTop: '0.5rem' }}>
                      OTP จะแสดงในคอนโซล (F12) สำหรับการทดสอบ
                    </small>
                  </div>
                  <div className="form-group">
                    <label>รหัสผ่านใหม่:</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                      minLength={6}
                      required
                      disabled={isResetting}
                    />
                  </div>
                  <div className="form-group">
                    <label>ยืนยันรหัสผ่านใหม่:</label>
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                      minLength={6}
                      required
                      disabled={isResetting}
                    />
                  </div>
                  <div className="modal-actions">
                    <button 
                      type="button" 
                      className="cancel-btn"
                      onClick={() => setShowOtpInput(false)}
                      disabled={isResetting}
                    >
                      กลับ
                    </button>
                    <button 
                      type="submit" 
                      className="submit-btn"
                      disabled={isResetting || !otp || otp.length !== 6 || !newPassword || !confirmNewPassword}
                    >
                      {isResetting ? 'กำลังเปลี่ยน...' : 'เปลี่ยนรหัสผ่าน'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default LoginPage;