import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../supabaseClient';
import './MarketingTools.css';

const MarketingTools = ({ ownerData, onUpdate }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('campaigns');
  const [editing, setEditing] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [sending, setSending] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'promotion',
    target_audience: 'all',
    start_date: '',
    end_date: '',
    discount_percentage: 0,
    discount_amount: 0,
    promo_code: '',
    email_subject: '',
    email_content: '',
    status: 'draft'
  });

  const loadMarketingData = useCallback(async () => {
    if (!ownerData?.owner_id) return;

    setLoading(true);
    try {
      // Get fitness data first
      const { data: fitnessData, error: fitnessError } = await supabase
        .from('tbl_fitness')
        .select('fit_id')
        .eq('owner_id', ownerData.owner_id)
        .single();

      if (fitnessError || !fitnessData) {
        setCampaigns([]);
        setPromotions([]);
        return;
      }

      // Get marketing campaigns
      const { data: campaignData, error: campaignError } = await supabase
        .from('tbl_marketing_campaigns')
        .select('*')
        .eq('fit_id', fitnessData.fit_id)
        .order('created_at', { ascending: false });

      if (campaignError) {
        console.error('Error loading campaigns:', campaignError);
      } else {
        setCampaigns(campaignData || []);
      }

      // Get promotions
      const { data: promotionData, error: promotionError } = await supabase
        .from('tbl_promotions')
        .select('*')
        .eq('fit_id', fitnessData.fit_id)
        .order('created_at', { ascending: false });

      if (promotionError) {
        console.error('Error loading promotions:', promotionError);
      } else {
        setPromotions(promotionData || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [ownerData?.owner_id]);

  useEffect(() => {
    loadMarketingData();
  }, [loadMarketingData]);

  const generatePromoCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, promo_code: code }));
  };

  const saveItem = async () => {
    if (!formData.title || !formData.description) {
      alert('กรุณากรอกชื่อและรายละเอียด');
      return;
    }

    try {
      // Get fitness data
      const { data: fitnessData, error: fitnessError } = await supabase
        .from('tbl_fitness')
        .select('fit_id')
        .eq('owner_id', ownerData.owner_id)
        .single();

      if (fitnessError || !fitnessData) {
        alert('กรุณาสร้างข้อมูลฟิตเนสก่อน');
        return;
      }

      const tableName = activeTab === 'campaigns' ? 'tbl_marketing_campaigns' : 'tbl_promotions';
      const itemData = {
        fit_id: fitnessData.fit_id,
        owner_id: ownerData.owner_id,
        title: formData.title,
        description: formData.description,
        type: formData.type,
        target_audience: formData.target_audience,
        start_date: formData.start_date,
        end_date: formData.end_date,
        status: formData.status,
        ...(activeTab === 'campaigns' ? {
          email_subject: formData.email_subject,
          email_content: formData.email_content
        } : {
          discount_percentage: parseFloat(formData.discount_percentage) || 0,
          discount_amount: parseFloat(formData.discount_amount) || 0,
          promo_code: formData.promo_code
        })
      };

      let result;
      if (editing) {
        const idField = activeTab === 'campaigns' ? 'campaign_id' : 'promotion_id';
        result = await supabase
          .from(tableName)
          .update(itemData)
          .eq(idField, editing[idField])
          .select()
          .single();
      } else {
        result = await supabase
          .from(tableName)
          .insert(itemData)
          .select()
          .single();
      }

      if (result.error) {
        console.error('Error saving item:', result.error);
        alert('เกิดข้อผิดพลาดในการบันทึก');
        return;
      }

      // Update local state
      if (activeTab === 'campaigns') {
        if (editing) {
          setCampaigns(prev => 
            prev.map(item => 
              item.campaign_id === editing.campaign_id ? result.data : item
            )
          );
        } else {
          setCampaigns(prev => [result.data, ...prev]);
        }
      } else {
        if (editing) {
          setPromotions(prev => 
            prev.map(item => 
              item.promotion_id === editing.promotion_id ? result.data : item
            )
          );
        } else {
          setPromotions(prev => [result.data, ...prev]);
        }
      }

      // Reset form
      resetForm();
      alert(`บันทึก${activeTab === 'campaigns' ? 'แคมเปญ' : 'โปรโมชั่น'}สำเร็จ!`);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error:', error);
      alert('เกิดข้อผิดพลาดในการบันทึก');
    }
  };

  const sendCampaign = async (campaign) => {
    if (!window.confirm('คุณต้องการส่งแคมเปญนี้หรือไม่?')) return;

    setSending(true);
    try {
      // Get target audience emails
      const { data: fitnessData } = await supabase
        .from('tbl_fitness')
        .select('fit_id')
        .eq('owner_id', ownerData.owner_id)
        .single();

      if (!fitnessData) {
        alert('ไม่พบข้อมูลฟิตเนส');
        return;
      }

      // Get member emails based on target audience
      let emailQuery = supabase
        .from('tbl_booking')
        .select(`
          tbl_user:user_id (
            user_email,
            user_name
          )
        `)
        .eq('fit_id', fitnessData.fit_id);

      if (campaign.target_audience === 'active_members') {
        emailQuery = emailQuery.eq('booking_status', 'confirmed');
      }

      const { data: emailData, error: emailError } = await emailQuery;

      if (emailError) {
        console.error('Error getting emails:', emailError);
        alert('เกิดข้อผิดพลาดในการดึงข้อมูลอีเมล');
        return;
      }

      // Get unique emails
      const uniqueEmails = [...new Set(
        emailData?.map(item => item.tbl_user?.user_email).filter(Boolean) || []
      )];

      if (uniqueEmails.length === 0) {
        alert('ไม่พบอีเมลสำหรับส่ง');
        return;
      }

      // Here you would integrate with an email service like SendGrid, AWS SES, etc.
      // For now, we'll just simulate sending and update the campaign status
      
      // Update campaign status to sent
      const { error: updateError } = await supabase
        .from('tbl_marketing_campaigns')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString(),
          sent_count: uniqueEmails.length
        })
        .eq('campaign_id', campaign.campaign_id);

      if (updateError) {
        console.error('Error updating campaign:', updateError);
        alert('เกิดข้อผิดพลาดในการอัปเดทสถานะ');
        return;
      }

      // Update local state
      setCampaigns(prev => 
        prev.map(c => 
          c.campaign_id === campaign.campaign_id 
            ? { ...c, status: 'sent', sent_at: new Date().toISOString(), sent_count: uniqueEmails.length }
            : c
        )
      );

      alert(`ส่งแคมเปญสำเร็จไปยัง ${uniqueEmails.length} อีเมล!`);
    } catch (error) {
      console.error('Error sending campaign:', error);
      alert('เกิดข้อผิดพลาดในการส่งแคมเปญ');
    } finally {
      setSending(false);
    }
  };

  const deleteItem = async (item) => {
    const itemType = activeTab === 'campaigns' ? 'แคมเปญ' : 'โปรโมชั่น';
    if (!window.confirm(`คุณต้องการลบ${itemType}นี้หรือไม่?`)) return;

    try {
      const tableName = activeTab === 'campaigns' ? 'tbl_marketing_campaigns' : 'tbl_promotions';
      const idField = activeTab === 'campaigns' ? 'campaign_id' : 'promotion_id';
      
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq(idField, item[idField]);

      if (error) {
        console.error('Error deleting item:', error);
        alert('เกิดข้อผิดพลาดในการลบ');
        return;
      }

      // Update local state
      if (activeTab === 'campaigns') {
        setCampaigns(prev => prev.filter(c => c.campaign_id !== item.campaign_id));
      } else {
        setPromotions(prev => prev.filter(p => p.promotion_id !== item.promotion_id));
      }

      alert(`ลบ${itemType}สำเร็จ!`);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Error:', error);
      alert('เกิดข้อผิดพลาดในการลบ');
    }
  };

  const startEdit = (item) => {
    setEditing(item);
    if (activeTab === 'campaigns') {
      setFormData({
        title: item.title || '',
        description: item.description || '',
        type: item.type || 'promotion',
        target_audience: item.target_audience || 'all',
        start_date: item.start_date || '',
        end_date: item.end_date || '',
        discount_percentage: 0,
        discount_amount: 0,
        promo_code: '',
        email_subject: item.email_subject || '',
        email_content: item.email_content || '',
        status: item.status || 'draft'
      });
    } else {
      setFormData({
        title: item.title || '',
        description: item.description || '',
        type: item.type || 'promotion',
        target_audience: item.target_audience || 'all',
        start_date: item.start_date || '',
        end_date: item.end_date || '',
        discount_percentage: item.discount_percentage || 0,
        discount_amount: item.discount_amount || 0,
        promo_code: item.promo_code || '',
        email_subject: '',
        email_content: '',
        status: item.status || 'draft'
      });
    }
    setShowCreateForm(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'promotion',
      target_audience: 'all',
      start_date: '',
      end_date: '',
      discount_percentage: 0,
      discount_amount: 0,
      promo_code: '',
      email_subject: '',
      email_content: '',
      status: 'draft'
    });
    setEditing(null);
    setShowCreateForm(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'secondary';
      case 'active': return 'success';
      case 'sent': return 'info';
      case 'expired': return 'warning';
      case 'inactive': return 'danger';
      default: return 'secondary';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'draft': return 'แบบร่าง';
      case 'active': return 'ใช้งาน';
      case 'sent': return 'ส่งแล้ว';
      case 'expired': return 'หมดอายุ';
      case 'inactive': return 'ปิดใช้งาน';
      default: return status;
    }
  };

  const currentItems = activeTab === 'campaigns' ? campaigns : promotions;

  if (loading) {
    return <div className="loading">กำลังโหลดข้อมูล...</div>;
  }

  return (
    <div className="marketing-tools">
      <div className="section-header">
        <h2>📢 เครื่องมือการตลาด</h2>
        <button
          className="btn-primary"
          onClick={() => setShowCreateForm(true)}
        >
          + เพิ่ม{activeTab === 'campaigns' ? 'แคมเปญ' : 'โปรโมชั่น'}
        </button>
      </div>

      <div className="tab-buttons">
        <button
          className={`tab-btn ${activeTab === 'campaigns' ? 'active' : ''}`}
          onClick={() => setActiveTab('campaigns')}
        >
          📧 แคมเปญอีเมล
        </button>
        <button
          className={`tab-btn ${activeTab === 'promotions' ? 'active' : ''}`}
          onClick={() => setActiveTab('promotions')}
        >
          🎁 โปรโมชั่น
        </button>
      </div>

      {currentItems.length === 0 ? (
        <div className="empty-state">
          <h3>ยังไม่มี{activeTab === 'campaigns' ? 'แคมเปญ' : 'โปรโมชั่น'}</h3>
          <p>เริ่มต้นสร้าง{activeTab === 'campaigns' ? 'แคมเปญอีเมล' : 'โปรโมชั่น'}สำหรับฟิตเนสของคุณ</p>
          <button
            className="btn-primary"
            onClick={() => setShowCreateForm(true)}
          >
            + สร้าง{activeTab === 'campaigns' ? 'แคมเปญ' : 'โปรโมชั่น'}แรก
          </button>
        </div>
      ) : (
        <div className="marketing-grid">
          {currentItems.map(item => (
            <div key={activeTab === 'campaigns' ? item.campaign_id : item.promotion_id} className="marketing-card">
              <div className="marketing-header">
                <h3>{item.title}</h3>
                <span className={`status ${getStatusColor(item.status)}`}>
                  {getStatusText(item.status)}
                </span>
              </div>
              
              <div className="marketing-content">
                <p className="description">{item.description}</p>
                
                <div className="marketing-details">
                  <p><strong>ประเภท:</strong> {item.type === 'promotion' ? 'โปรโมชั่น' : item.type}</p>
                  <p><strong>กลุ่มเป้าหมาย:</strong> {
                    item.target_audience === 'all' ? 'ทุกคน' :
                    item.target_audience === 'active_members' ? 'สมาชิกที่ใช้งาน' :
                    item.target_audience === 'new_members' ? 'สมาชิกใหม่' : item.target_audience
                  }</p>
                  
                  {item.start_date && (
                    <p><strong>วันที่เริ่ม:</strong> {new Date(item.start_date).toLocaleDateString('th-TH')}</p>
                  )}
                  {item.end_date && (
                    <p><strong>วันที่สิ้นสุด:</strong> {new Date(item.end_date).toLocaleDateString('th-TH')}</p>
                  )}

                  {activeTab === 'campaigns' && item.sent_count && (
                    <p><strong>ส่งไปแล้ว:</strong> {item.sent_count} อีเมล</p>
                  )}

                  {activeTab === 'promotions' && (
                    <>
                      {item.discount_percentage > 0 && (
                        <p><strong>ส่วนลด:</strong> {item.discount_percentage}%</p>
                      )}
                      {item.discount_amount > 0 && (
                        <p><strong>ส่วนลด:</strong> ฿{item.discount_amount}</p>
                      )}
                      {item.promo_code && (
                        <p><strong>รหัสโปรโมชั่น:</strong> <code>{item.promo_code}</code></p>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              <div className="marketing-actions">
                <button
                  className="btn-secondary"
                  onClick={() => startEdit(item)}
                >
                  แก้ไข
                </button>
                
                {activeTab === 'campaigns' && item.status === 'draft' && (
                  <button
                    className="btn-primary"
                    onClick={() => sendCampaign(item)}
                    disabled={sending}
                  >
                    {sending ? 'กำลังส่ง...' : 'ส่งแคมเปญ'}
                  </button>
                )}
                
                <button
                  className="btn-danger"
                  onClick={() => deleteItem(item)}
                >
                  ลบ
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateForm && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal-content large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {editing ? 'แก้ไข' : 'เพิ่ม'}{activeTab === 'campaigns' ? 'แคมเปญ' : 'โปรโมชั่น'}
              </h3>
              <button className="btn-close" onClick={resetForm}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>ชื่อ{activeTab === 'campaigns' ? 'แคมเปญ' : 'โปรโมชั่น'} *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({...prev, title: e.target.value}))}
                    placeholder={`ชื่อ${activeTab === 'campaigns' ? 'แคมเปญ' : 'โปรโมชั่น'}`}
                  />
                </div>
                
                <div className="form-group">
                  <label>สถานะ</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({...prev, status: e.target.value}))}
                  >
                    <option value="draft">แบบร่าง</option>
                    <option value="active">ใช้งาน</option>
                    <option value="inactive">ปิดใช้งาน</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>กลุ่มเป้าหมาย</label>
                  <select
                    value={formData.target_audience}
                    onChange={(e) => setFormData(prev => ({...prev, target_audience: e.target.value}))}
                  >
                    <option value="all">ทุกคน</option>
                    <option value="active_members">สมาชิกที่ใช้งาน</option>
                    <option value="new_members">สมาชิกใหม่</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>ประเภท</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({...prev, type: e.target.value}))}
                  >
                    <option value="promotion">โปรโมชั่น</option>
                    <option value="announcement">ประกาศ</option>
                    <option value="event">งานเมื่อไหน่</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>วันที่เริ่ม</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({...prev, start_date: e.target.value}))}
                  />
                </div>

                <div className="form-group">
                  <label>วันที่สิ้นสุด</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({...prev, end_date: e.target.value}))}
                  />
                </div>

                {activeTab === 'promotions' && (
                  <>
                    <div className="form-group">
                      <label>ส่วนลด (%)</label>
                      <input
                        type="number"
                        value={formData.discount_percentage}
                        onChange={(e) => setFormData(prev => ({...prev, discount_percentage: parseFloat(e.target.value) || 0}))}
                        min="0"
                        max="100"
                        step="0.1"
                      />
                    </div>

                    <div className="form-group">
                      <label>ส่วนลด (บาท)</label>
                      <input
                        type="number"
                        value={formData.discount_amount}
                        onChange={(e) => setFormData(prev => ({...prev, discount_amount: parseFloat(e.target.value) || 0}))}
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div className="form-group">
                      <label>รหัสโปรโมชั่น</label>
                      <div className="promo-code-input">
                        <input
                          type="text"
                          value={formData.promo_code}
                          onChange={(e) => setFormData(prev => ({...prev, promo_code: e.target.value.toUpperCase()}))}
                          placeholder="PROMO2024"
                        />
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={generatePromoCode}
                        >
                          สุ่ม
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'campaigns' && (
                  <>
                    <div className="form-group full-width">
                      <label>หัวข้ออีเมล</label>
                      <input
                        type="text"
                        value={formData.email_subject}
                        onChange={(e) => setFormData(prev => ({...prev, email_subject: e.target.value}))}
                        placeholder="หัวข้ออีเมลที่จะส่ง"
                      />
                    </div>

                    <div className="form-group full-width">
                      <label>เนื้อหาอีเมล</label>
                      <textarea
                        value={formData.email_content}
                        onChange={(e) => setFormData(prev => ({...prev, email_content: e.target.value}))}
                        placeholder="เนื้อหาอีเมลที่จะส่งให้ลูกค้า"
                        rows="6"
                      />
                    </div>
                  </>
                )}

                <div className="form-group full-width">
                  <label>รายละเอียด *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                    placeholder={`รายละเอียดของ${activeTab === 'campaigns' ? 'แคมเปญ' : 'โปรโมชั่น'}`}
                    rows="4"
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={resetForm}>
                ยกเลิก
              </button>
              <button 
                className="btn-primary" 
                onClick={saveItem}
                disabled={!formData.title || !formData.description}
              >
                {editing ? 'บันทึกการเปลี่ยนแปลง' : `สร้าง${activeTab === 'campaigns' ? 'แคมเปญ' : 'โปรโมชั่น'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketingTools;