import React, { useState, useEffect, useCallback } from 'react';
import { 
  updatePartnerBankAccount, 
  getPartnerBankAccount, 
  getPartnerTransfers,
  calculatePartnerRevenue,
  validateBankAccountData 
} from '../utils/partnerAccountAPI';
import './PartnerBankManagement.css';

const PartnerBankManagement = ({ ownerData }) => {
  const [fitnessId, setFitnessId] = useState(null);
  const [bankAccountData, setBankAccountData] = useState({
    partner_bank_account: '',
    partner_bank_name: '',
    partner_account_name: '',
    partner_promptpay_id: '',
    revenue_split_percentage: 80.00
  });
  const [transfers, setTransfers] = useState([]);
  const [revenueStats, setRevenueStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [activeTab, setActiveTab] = useState('account'); // 'account', 'transfers', 'revenue'

  // รายชื่อธนาคารไทย
  const THAI_BANKS = [
    { code: 'BBL', name: 'ธนาคารกรุงเทพ', shortName: 'กรุงเทพ' },
    { code: 'KBANK', name: 'ธนาคารกสิกรไทย', shortName: 'กสิกรไทย' },
    { code: 'KTB', name: 'ธนาคารกรุงไทย', shortName: 'กรุงไทย' },
    { code: 'SCB', name: 'ธนาคารไทยพาณิชย์', shortName: 'ไทยพาณิชย์' },
    { code: 'TMB', name: 'ธนาคารทหารไทยธนชาต', shortName: 'ทหารไทยธนชาต' },
    { code: 'BAY', name: 'ธนาคารกรุงศรีอยุธยา', shortName: 'กรุงศรีอยุธยา' },
    { code: 'GSB', name: 'ธนาคารออมสิน', shortName: 'ออมสิน' },
    { code: 'BAAC', name: 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร', shortName: 'ธ.ก.ส.' },
    { code: 'TISCO', name: 'ธนาคารทิสโก้', shortName: 'ทิสโก้' },
    { code: 'UOB', name: 'ธนาคารยูโอบี', shortName: 'ยูโอบี' }
  ];

  // โหลดข้อมูลฟิตเนส ID
  const loadFitnessId = useCallback(async () => {
    if (!ownerData?.owner_name) return;

    try {
      // ดึง fitness_id จาก supabase
      const { supabase } = await import('../supabaseClient');
      const { data, error } = await supabase
        .from('tbl_fitness')
        .select('fit_id')
        .eq('fit_user', ownerData.owner_name)
        .single();

      if (error) {
        console.error('Error loading fitness ID:', error);
        return;
      }

      if (data) {
        setFitnessId(data.fit_id);
      }
    } catch (error) {
      console.error('Error in loadFitnessId:', error);
    }
  }, [ownerData?.owner_name]);

  // โหลดข้อมูลบัญชีพาร์ทเนอร์
  const loadBankAccount = useCallback(async () => {
    if (!fitnessId) return;

    setLoading(true);
    try {
      const result = await getPartnerBankAccount(fitnessId);
      if (result.success) {
        setBankAccountData({
          partner_bank_account: result.data.partner_bank_account || '',
          partner_bank_name: result.data.partner_bank_name || '',
          partner_account_name: result.data.partner_account_name || '',
          partner_promptpay_id: result.data.partner_promptpay_id || '',
          revenue_split_percentage: result.data.revenue_split_percentage || 80.00
        });
      }
    } catch (error) {
      console.error('Error loading bank account:', error);
    } finally {
      setLoading(false);
    }
  }, [fitnessId]);

  // โหลดข้อมูลการโอนเงิน
  const loadTransfers = useCallback(async () => {
    if (!fitnessId) return;

    try {
      const result = await getPartnerTransfers(fitnessId);
      if (result.success) {
        setTransfers(result.data);
      }
    } catch (error) {
      console.error('Error loading transfers:', error);
    }
  }, [fitnessId]);

  // โหลดสถิติรายได้
  const loadRevenueStats = useCallback(async () => {
    if (!fitnessId) return;

    try {
      const result = await calculatePartnerRevenue(fitnessId);
      if (result.success) {
        setRevenueStats(result.data);
      }
    } catch (error) {
      console.error('Error loading revenue stats:', error);
    }
  }, [fitnessId]);

  // จัดการการเปลี่ยนแปลงข้อมูล
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBankAccountData(prev => ({
      ...prev,
      [name]: value
    }));

    // ล้าง error เมื่อผู้ใช้พิมพ์
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // บันทึกข้อมูลบัญชี
  const handleSaveBankAccount = async () => {
    // ตรวจสอบความถูกต้อง
    const validation = validateBankAccountData(bankAccountData);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setSaving(true);
    try {
      const result = await updatePartnerBankAccount(fitnessId, bankAccountData);
      if (result.success) {
        alert('✅ บันทึกข้อมูลบัญชีสำเร็จ!');
        setShowAccountForm(false);
        setErrors({});
        loadBankAccount(); // โหลดข้อมูลใหม่
      } else {
        alert('❌ เกิดข้อผิดพลาด: ' + result.error);
      }
    } catch (error) {
      console.error('Error saving bank account:', error);
      alert('❌ เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSaving(false);
    }
  };

  // Copy ข้อมูลบัญชี
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      alert(`📋 คัดลอก${label}แล้ว: ${text}`);
    }).catch(err => {
      console.error('Error copying to clipboard:', err);
      alert('❌ ไม่สามารถคัดลอกได้');
    });
  };

  // Format functions
  const formatBankAccount = (account) => {
    if (!account) return '-';
    return account.replace(/(\d{3})(\d{1})(\d{5})(\d{1})/, '$1-$2-$3-$4');
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('th-TH');
  };

  const formatStatus = (status) => {
    const statusMap = {
      'pending': '⏳ รอดำเนินการ',
      'processing': '🔄 กำลังดำเนินการ',
      'completed': '✅ เสร็จสิ้น',
      'failed': '❌ ล้มเหลว',
      'cancelled': '🚫 ยกเลิก'
    };
    return statusMap[status] || status;
  };

  // Initialize data
  useEffect(() => {
    loadFitnessId();
  }, [loadFitnessId]);

  useEffect(() => {
    if (fitnessId) {
      loadBankAccount();
      loadTransfers();
      loadRevenueStats();
    }
  }, [fitnessId, loadBankAccount, loadTransfers, loadRevenueStats]);

  if (loading) {
    return <div className="loading">กำลังโหลดข้อมูล...</div>;
  }

  if (!fitnessId) {
    return (
      <div className="partner-bank-management">
        <div className="empty-state">
          <h3>ไม่พบข้อมูลฟิตเนส</h3>
          <p>กรุณาตั้งค่าข้อมูลฟิตเนสก่อนใช้งาน</p>
        </div>
      </div>
    );
  }

  return (
    <div className="partner-bank-management">
      <div className="section-header">
        <h2>🏦 จัดการบัญชีธนาคาร</h2>
        <div className="header-actions">
          {!bankAccountData.partner_bank_account && (
            <button 
              className="btn-primary"
              onClick={() => setShowAccountForm(true)}
            >
              + เพิ่มบัญชีธนาคาร
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'account' ? 'active' : ''}`}
          onClick={() => setActiveTab('account')}
        >
          🏦 บัญชีธนาคาร
        </button>
        <button 
          className={`tab-btn ${activeTab === 'transfers' ? 'active' : ''}`}
          onClick={() => setActiveTab('transfers')}
        >
          💸 การโอนเงิน
        </button>
        <button 
          className={`tab-btn ${activeTab === 'revenue' ? 'active' : ''}`}
          onClick={() => setActiveTab('revenue')}
        >
          📊 สถิติรายได้
        </button>
      </div>

      {/* Account Tab */}
      {activeTab === 'account' && (
        <div className="account-tab">
          {bankAccountData.partner_bank_account ? (
            <div className="account-display">
              <div className="account-card">
                <h3>💳 ข้อมูลบัญชีธนาคาร</h3>
                <div className="account-details">
                  <div className="detail-row">
                    <span className="label">ธนาคาร:</span>
                    <span className="value">{bankAccountData.partner_bank_name}</span>
                  </div>
                  <div className="detail-row">
                    <span className="label">หมายเลขบัญชี:</span>
                    <span className="value">
                      {formatBankAccount(bankAccountData.partner_bank_account)}
                      <button 
                        className="copy-btn"
                        onClick={() => copyToClipboard(bankAccountData.partner_bank_account, 'หมายเลขบัญชี')}
                      >
                        📋
                      </button>
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="label">ชื่อบัญชี:</span>
                    <span className="value">
                      {bankAccountData.partner_account_name}
                      <button 
                        className="copy-btn"
                        onClick={() => copyToClipboard(bankAccountData.partner_account_name, 'ชื่อบัญชี')}
                      >
                        📋
                      </button>
                    </span>
                  </div>
                  {bankAccountData.partner_promptpay_id && (
                    <div className="detail-row">
                      <span className="label">PromptPay ID:</span>
                      <span className="value">
                        {bankAccountData.partner_promptpay_id}
                        <button 
                          className="copy-btn"
                          onClick={() => copyToClipboard(bankAccountData.partner_promptpay_id, 'PromptPay ID')}
                        >
                          📋
                        </button>
                      </span>
                    </div>
                  )}
                  <div className="detail-row">
                    <span className="label">การแบ่งรายได้:</span>
                    <span className="value">
                      พาร์ทเนอร์ {bankAccountData.revenue_split_percentage}% | 
                      ระบบ {(100 - bankAccountData.revenue_split_percentage).toFixed(2)}%
                    </span>
                  </div>
                </div>
                <div className="account-actions">
                  <button 
                    className="btn-secondary"
                    onClick={() => setShowAccountForm(true)}
                  >
                    ✏️ แก้ไขข้อมูล
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <h3>🏦 ยังไม่มีข้อมูลบัญชีธนาคาร</h3>
              <p>กรุณาเพิ่มข้อมูลบัญชีธนาคารเพื่อรับการโอนเงิน</p>
              <button 
                className="btn-primary"
                onClick={() => setShowAccountForm(true)}
              >
                + เพิ่มบัญชีธนาคาร
              </button>
            </div>
          )}
        </div>
      )}

      {/* Transfers Tab */}
      {activeTab === 'transfers' && (
        <div className="transfers-tab">
          <h3>💸 ประวัติการโอนเงิน</h3>
          {transfers.length > 0 ? (
            <div className="transfers-list">
              {transfers.map((transfer) => (
                <div key={transfer.transfer_id} className="transfer-card">
                  <div className="transfer-header">
                    <span className="transfer-amount">฿{transfer.partner_amount?.toLocaleString()}</span>
                    <span className={`transfer-status ${transfer.transfer_status}`}>
                      {formatStatus(transfer.transfer_status)}
                    </span>
                  </div>
                  <div className="transfer-details">
                    <div className="detail-row">
                      <span className="label">รายได้รวม:</span>
                      <span className="value">฿{transfer.total_amount?.toLocaleString()}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">ส่วนระบบ:</span>
                      <span className="value">฿{transfer.system_amount?.toLocaleString()}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">วันที่สร้าง:</span>
                      <span className="value">{formatDate(transfer.created_at)}</span>
                    </div>
                    {transfer.transfer_date && (
                      <div className="detail-row">
                        <span className="label">วันที่โอน:</span>
                        <span className="value">{formatDate(transfer.transfer_date)}</span>
                      </div>
                    )}
                    {transfer.transfer_reference && (
                      <div className="detail-row">
                        <span className="label">หมายเลขอ้างอิง:</span>
                        <span className="value">{transfer.transfer_reference}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h3>💸 ยังไม่มีประวัติการโอนเงิน</h3>
              <p>เมื่อมีการชำระเงินจากลูกค้า ระบบจะสร้างรายการโอนเงินให้อัตโนมัติ</p>
            </div>
          )}
        </div>
      )}

      {/* Revenue Tab */}
      {activeTab === 'revenue' && (
        <div className="revenue-tab">
          <h3>📊 สถิติรายได้</h3>
          {revenueStats ? (
            <div className="revenue-stats">
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">💰</div>
                  <div className="stat-content">
                    <h4>รายได้รวม</h4>
                    <span className="stat-value">฿{revenueStats.totalRevenue?.toLocaleString()}</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🤝</div>
                  <div className="stat-content">
                    <h4>ส่วนพาร์ทเนอร์</h4>
                    <span className="stat-value">฿{revenueStats.partnerAmount?.toLocaleString()}</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🏢</div>
                  <div className="stat-content">
                    <h4>ส่วนระบบ</h4>
                    <span className="stat-value">฿{revenueStats.systemAmount?.toLocaleString()}</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">✅</div>
                  <div className="stat-content">
                    <h4>โอนแล้ว</h4>
                    <span className="stat-value">฿{revenueStats.completedAmount?.toLocaleString()}</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📊</div>
                  <div className="stat-content">
                    <h4>การโอนทั้งหมด</h4>
                    <span className="stat-value">{revenueStats.totalTransfers} ครั้ง</span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">⏳</div>
                  <div className="stat-content">
                    <h4>รอดำเนินการ</h4>
                    <span className="stat-value">{revenueStats.pendingTransfers} ครั้ง</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <h3>📊 ยังไม่มีข้อมูลรายได้</h3>
              <p>เมื่อมีการชำระเงินจากลูกค้า สถิติจะปรากฏที่นี่</p>
            </div>
          )}
        </div>
      )}

      {/* Account Form Modal */}
      {showAccountForm && (
        <div className="modal-overlay" onClick={() => setShowAccountForm(false)}>
          <div className="modal-content account-form" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🏦 {bankAccountData.partner_bank_account ? 'แก้ไข' : 'เพิ่ม'}ข้อมูลบัญชีธนาคาร</h3>
              <button
                className="btn-close"
                onClick={() => setShowAccountForm(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>ธนาคาร *</label>
                  <select
                    name="partner_bank_name"
                    value={bankAccountData.partner_bank_name}
                    onChange={handleInputChange}
                    className={`form-input ${errors.partner_bank_name ? 'error' : ''}`}
                  >
                    <option value="">เลือกธนาคาร</option>
                    {THAI_BANKS.map(bank => (
                      <option key={bank.code} value={bank.name}>
                        {bank.name}
                      </option>
                    ))}
                  </select>
                  {errors.partner_bank_name && (
                    <span className="error-text">{errors.partner_bank_name}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>หมายเลขบัญชี *</label>
                  <input
                    type="text"
                    name="partner_bank_account"
                    placeholder="กรอกหมายเลขบัญชี (10-12 หลัก)"
                    value={bankAccountData.partner_bank_account}
                    onChange={handleInputChange}
                    className={`form-input ${errors.partner_bank_account ? 'error' : ''}`}
                    maxLength="12"
                  />
                  {errors.partner_bank_account && (
                    <span className="error-text">{errors.partner_bank_account}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>ชื่อบัญชี *</label>
                  <input
                    type="text"
                    name="partner_account_name"
                    placeholder="ชื่อเจ้าของบัญชี"
                    value={bankAccountData.partner_account_name}
                    onChange={handleInputChange}
                    className={`form-input ${errors.partner_account_name ? 'error' : ''}`}
                  />
                  {errors.partner_account_name && (
                    <span className="error-text">{errors.partner_account_name}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>PromptPay ID (ไม่บังคับ)</label>
                  <input
                    type="text"
                    name="partner_promptpay_id"
                    placeholder="เบอร์โทรศัพท์ หรือ เลขบัตรประชาชน"
                    value={bankAccountData.partner_promptpay_id}
                    onChange={handleInputChange}
                    className={`form-input ${errors.partner_promptpay_id ? 'error' : ''}`}
                  />
                  {errors.partner_promptpay_id && (
                    <span className="error-text">{errors.partner_promptpay_id}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>การแบ่งรายได้ (%) *</label>
                  <input
                    type="number"
                    name="revenue_split_percentage"
                    placeholder="80"
                    min="0"
                    max="100"
                    step="0.01"
                    value={bankAccountData.revenue_split_percentage}
                    onChange={handleInputChange}
                    className={`form-input ${errors.revenue_split_percentage ? 'error' : ''}`}
                  />
                  <small className="helper-text">
                    พาร์ทเนอร์จะได้รับ {bankAccountData.revenue_split_percentage}% และระบบจะได้รับ {(100 - bankAccountData.revenue_split_percentage).toFixed(2)}%
                  </small>
                  {errors.revenue_split_percentage && (
                    <span className="error-text">{errors.revenue_split_percentage}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowAccountForm(false)}
              >
                ยกเลิก
              </button>
              <button
                className="btn-primary"
                onClick={handleSaveBankAccount}
                disabled={saving}
              >
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerBankManagement;