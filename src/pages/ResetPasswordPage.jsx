import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import supabase from '../supabaseClient';
import Layout from '../components/Layout';
import '../App.css';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const handlePasswordReset = async () => {
      // ตรวจสอบ access token จาก URL
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      const type = searchParams.get('type');
      
      if (accessToken && refreshToken && type === 'recovery') {
        try {
          // Set session ด้วย tokens ที่ได้รับ
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            console.error('Session error:', error);
            setMessage('ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว');
          } else {
            // ตรวจสอบ user session
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
              setMessage('ไม่พบข้อมูลผู้ใช้ กรุณาลองใหม่อีกครั้ง');
            }
          }
        } catch (err) {
          console.error('Auth error:', err);
          setMessage('เกิดข้อผิดพลาดในการยืนยันตัวตน');
        }
      } else {
        setMessage('ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว');
      }
    };

    handlePasswordReset();
  }, [searchParams]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    // ตรวจสอบความยาวรหัสผ่าน
    if (password.length < 6) {
      setMessage('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      setIsLoading(false);
      return;
    }

    // ตรวจสอบการยืนยันรหัสผ่าน
    if (password !== confirmPassword) {
      setMessage('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      setIsLoading(false);
      return;
    }

    try {
      // ตรวจสอบ session ก่อนอัพเดต
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        setMessage('ไม่พบข้อมูลผู้ใช้ กรุณาคลิกลิงก์รีเซ็ตรหัสผ่านใหม่');
        setIsLoading(false);
        return;
      }

      // อัพเดตรหัสผ่าน
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      setMessage('เปลี่ยนรหัสผ่านสำเร็จ! กำลังนำคุณไปหน้าเข้าสู่ระบบ...');
      
      // ออกจากระบบและไปหน้า login
      await supabase.auth.signOut();
      
      // รอ 2 วินาทีแล้วไป login page
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (error) {
      console.error('Password reset error:', error);
      setMessage(error.message);
    }

    setIsLoading(false);
  };

  return (
    <Layout>
      <div className="login-content">
        <h2>รีเซ็ตรหัสผ่าน</h2>
        {message && (
          <div className={`message ${message.includes('สำเร็จ') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}
        
        {!message.includes('ลิงก์') && (
          <form className="login-form" onSubmit={handleResetPassword}>
            <div className="form-group">
              <label>รหัสผ่านใหม่:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="กรอกรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label>ยืนยันรหัสผ่านใหม่:</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                required
                disabled={isLoading}
                minLength={6}
              />
            </div>
            <button 
              type="submit" 
              className="login-btn"
              disabled={isLoading || !password || !confirmPassword}
            >
              {isLoading ? 'กำลังเปลี่ยนรหัสผ่าน...' : 'เปลี่ยนรหัสผ่าน'}
            </button>
          </form>
        )}
        
        <p className="signup-link">
          <span className="link" onClick={() => navigate('/login')}>กลับไปหน้าเข้าสู่ระบบ</span>
        </p>
      </div>
    </Layout>
  );
};

export default ResetPasswordPage;