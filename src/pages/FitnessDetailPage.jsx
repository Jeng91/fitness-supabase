import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import supabase from '../supabaseClient';
import Layout from '../components/Layout';
import FitnessDetailModal from '../components/FitnessDetailModal';
import '../App.css';

const FitnessDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [fitnessData, setFitnessData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFitnessDetail = async () => {
      try {
        const { data, error } = await supabase
          .from('tbl_fitness')
          .select('*')
          .eq('fit_id', id)
          .single();

        if (error) {
          console.error('Error loading fitness detail:', error);
          navigate('/');
          return;
        }

        // แปลงข้อมูลให้ตรงกับ format ที่ FitnessDetailModal ใช้
        const transformedData = {
          id: data.fit_id,
          name: data.fit_name,
          price: data.fit_price,
          location: data.fit_address,
          image: data.fit_image,
          fit_image2: data.fit_image2,
          fit_image3: data.fit_image3,
          fit_image4: data.fit_image4,
          contact: data.fit_contact,
          fit_location: data.fit_location,
          user: data.fit_user,
          phone: data.fit_phone,
          openTime: data.fit_open_time,
          closeTime: data.fit_close_time,
          description: data.fit_description,
          fit_id: data.fit_id,
          ...data
        };

        setFitnessData(transformedData);
      } catch (error) {
        console.error('Error in loadFitnessDetail:', error);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadFitnessDetail();
    }
  }, [id, navigate]);

  const handleViewLocation = (fitness) => {
    if (fitness.fit_location) {
      window.open(`https://www.google.com/maps?q=${fitness.fit_location}`, '_blank');
    } else {
      alert('ไม่พบข้อมูลตำแหน่งสำหรับฟิตเนสนี้');
    }
  };

  const handleOpenImageGallery = (fitness) => {
    // สามารถเพิ่ม logic สำหรับ image gallery ได้
    console.log('Open image gallery for:', fitness.name);
  };

  if (loading) {
    return (
      <Layout>
        <div className="loading">กำลังโหลด...</div>
      </Layout>
    );
  }

  if (!fitnessData) {
    return (
      <Layout>
        <div className="error">ไม่พบข้อมูลฟิตเนส</div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Fitness Detail */}
      <div className="fitness-detail-page">
        <div className="detail-header">
          <button 
            className="back-btn"
            onClick={() => navigate('/')}
          >
            ← กลับ
          </button>
        </div>
        <FitnessDetailModal
          isOpen={true}
          onClose={() => navigate('/')}
          fitnessData={fitnessData}
          onViewLocation={handleViewLocation}
          onOpenImageGallery={handleOpenImageGallery}
          isFullPage={true}
        />
      </div>
    </Layout>
  );
};

export default FitnessDetailPage;