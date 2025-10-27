import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import Layout from '../components/Layout';
import '../App.css';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    role: 'user'
  });

  // ตรวจสอบว่า user ล็อกอินอยู่แล้วหรือไม่
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        navigate('/');
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

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    // ตรวจสอบรหัสผ่าน
    if (formData.password !== formData.confirmPassword) {
      setMessage('รหัสผ่านไม่ตรงกัน');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setMessage('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      setIsLoading(false);
      return;
    }

    try {
      // สมัครสมาชิกผ่าน Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: formData.role
          }
        }
      });

      if (error) {
        console.error('Registration error:', error);
        throw error;
      }

      if (data.user) {
        // สร้าง profile ใน database ตาม role
        if (formData.role === 'partner') {
          // สร้างใน tbl_owner สำหรับ partner
          // NOTE: the table uses `auth_user_id` (uuid) to reference auth.users
          // Do NOT try to set `owner_uid` (integer identity) from the uuid — that causes insert/type errors.
          const { data: ownerData, error: ownerError } = await supabase
            .from('tbl_owner')
            .insert([
              {
                auth_user_id: data.user.id,
                owner_name: formData.fullName,
                owner_email: formData.email,
                owner_password: formData.password,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            ])
            .select();

          if (ownerError) {
            // log full details to help debugging (status, message, details)
            console.error('Error creating owner profile:', ownerError);
          } else {
            console.log('Created owner record:', ownerData && ownerData[0]);
          }
        } else {
          // สร้างใน profiles สำหรับ user
          const { error: profileError } = await supabase
            .from('profiles')
            .insert([
              {
                user_uid: data.user.id,
                username: formData.email.split('@')[0],
                useremail: formData.email,
                full_name: formData.fullName,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }
            ]);

          if (profileError) {
            console.error('Error creating user profile:', profileError);
          }
        }

        setMessage('สมัครสมาชิกสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี');
        
        // Clear form
        setFormData({
          email: '',
          password: '',
          confirmPassword: '',
          fullName: '',
          role: 'user'
        });

        // Redirect to login after success
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }

    } catch (error) {
      console.error('Registration error:', error);
      setMessage(error.message);
    }

    setIsLoading(false);
  };

  return (
    <Layout>
      {/* Register Content */}
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
              required
              disabled={isLoading}
            />
          </div>
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
              required
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label>ประเภทผู้ใช้:</label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              disabled={isLoading}
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
          มีบัญชีแล้ว? <span className="link" onClick={() => navigate('/login')}>เข้าสู่ระบบ</span>
        </p>
      </div>
    </Layout>
  );
};

export default RegisterPage;