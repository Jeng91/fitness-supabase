import React, { useState, useEffect, useCallback } from 'react';
import { 
  SYSTEM_BANK_ACCOUNTS, 
  PAYMENT_METHODS, 
  PAYMENT_STATUS,
  calculatePaymentFees 
} from '../utils/paymentConfig';
import supabase from '../supabaseClient';
import './AdminPaymentManagement.css';

const AdminPaymentManagement = () => {
  const [activeSection, setActiveSection] = useState('overview');
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  // สถิติการเงิน
  const [financialStats, setFinancialStats] = useState({
    totalRevenue: 0,
    systemRevenue: 0,
    partnerRevenue: 0,
    pendingPayouts: 0,
    completedPayments: 0,
    todayRevenue: 0
  });

  useEffect(() => {
    loadPaymentData();
  }, [dateRange, loadPaymentData]);

  const loadPaymentData = useCallback(async () => {
    setLoading(true);
    try {
      // โหลดข้อมูลการชำระเงิน
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          *,
          bookings (
            *,
            tbl_fitness (
              fit_name,
              tbl_owner (
                owner_name
              )
            )
          ),
          payment_splits (*)
        `)
        .gte('created_at', `${dateRange.startDate}T00:00:00`)
        .lte('created_at', `${dateRange.endDate}T23:59:59`)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);

      // คำนวณสถิติ
      calculateFinancialStats(paymentsData || []);

    } catch (error) {
      console.error('Error loading payment data:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  const calculateFinancialStats = (paymentsData) => {
    const stats = paymentsData.reduce((acc, payment) => {
      const amount = parseFloat(payment.amount || 0);
      acc.totalRevenue += amount;
      
      if (payment.status === 'completed') {
        acc.completedPayments += 1;
        
        // คำนวณส่วนแบ่งระบบและพาร์ทเนอร์
        const fees = calculatePaymentFees(amount, payment.payment_method);
        if (fees) {
          acc.systemRevenue += fees.systemAmount;
          acc.partnerRevenue += fees.partnerAmount;
        }
      }

      // รายได้วันนี้
      const paymentDate = new Date(payment.created_at).toDateString();
      const today = new Date().toDateString();
      if (paymentDate === today && payment.status === 'completed') {
        acc.todayRevenue += amount;
      }

      return acc;
    }, {
      totalRevenue: 0,
      systemRevenue: 0, 
      partnerRevenue: 0,
      pendingPayouts: 0,
      completedPayments: 0,
      todayRevenue: 0
    });

    setFinancialStats(stats);
  };

  const handleUpdatePaymentStatus = async (paymentId, newStatus) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('payment_id', paymentId);

      if (error) throw error;
      
      // รีโหลดข้อมูล
      loadPaymentData();
      alert('อัปเดตสถานะการชำระเงินสำเร็จ');
    } catch (error) {
      console.error('Error updating payment status:', error);
      alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
    }
  };

  const generatePayoutReport = () => {
    // สร้างรายงานการจ่ายเงินให้พาร์ทเนอร์
    const payoutData = payments
      .filter(p => p.status === 'completed')
      .reduce((acc, payment) => {
        const booking = payment.bookings;
        if (!booking || !booking.tbl_fitness) return acc;

        const ownerId = booking.tbl_fitness.tbl_owner?.owner_name || 'Unknown';
        const amount = parseFloat(payment.amount || 0);
        const fees = calculatePaymentFees(amount, payment.payment_method);
        
        if (!acc[ownerId]) {
          acc[ownerId] = {
            ownerName: ownerId,
            totalAmount: 0,
            paymentCount: 0,
            payments: []
          };
        }

        acc[ownerId].totalAmount += fees?.partnerAmount || 0;
        acc[ownerId].paymentCount += 1;
        acc[ownerId].payments.push({
          paymentId: payment.payment_id,
          amount: amount,
          partnerAmount: fees?.partnerAmount || 0,
          fitnessName: booking.tbl_fitness.fit_name,
          date: payment.created_at
        });

        return acc;
      }, {});

    return Object.values(payoutData);
  };

  const PaymentOverview = () => (
    <div className="payment-overview">
      <div className="stats-grid">
        <div className="stat-card total">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <h3>รายได้รวม</h3>
            <p className="stat-value">฿{financialStats.totalRevenue.toLocaleString()}</p>
            <span className="stat-period">ช่วงเวลาที่เลือก</span>
          </div>
        </div>

        <div className="stat-card system">
          <div className="stat-icon">🏦</div>
          <div className="stat-info">
            <h3>รายได้ระบบ (20%)</h3>
            <p className="stat-value">฿{financialStats.systemRevenue.toLocaleString()}</p>
            <span className="stat-detail">ค่าธรรมเนียมระบบ</span>
          </div>
        </div>

        <div className="stat-card partner">
          <div className="stat-icon">🤝</div>
          <div className="stat-info">
            <h3>รายได้พาร์ทเนอร์ (80%)</h3>
            <p className="stat-value">฿{financialStats.partnerRevenue.toLocaleString()}</p>
            <span className="stat-detail">ส่วนแบ่งพาร์ทเนอร์</span>
          </div>
        </div>

        <div className="stat-card today">
          <div className="stat-icon">📅</div>
          <div className="stat-info">
            <h3>รายได้วันนี้</h3>
            <p className="stat-value">฿{financialStats.todayRevenue.toLocaleString()}</p>
            <span className="stat-detail">อัปเดตล่าสุด</span>
          </div>
        </div>
      </div>

      {/* ข้อมูลบัญชีธนาคารระบบ */}
      <div className="bank-accounts-section">
        <h3>🏦 บัญชีธนาคารระบบ</h3>
        <div className="bank-accounts-grid">
          {Object.entries(SYSTEM_BANK_ACCOUNTS).map(([key, account]) => (
            <div key={key} className="bank-account-card">
              <div className="account-header">
                <h4>{account.purpose}</h4>
                <span className={`account-type ${key}`}>{account.accountType}</span>
              </div>
              <div className="account-details">
                <p><strong>ธนาคาร:</strong> {account.bankName}</p>
                <p><strong>เลขบัญชี:</strong> {account.accountNumber}</p>
                <p><strong>ชื่อบัญชี:</strong> {account.accountName}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const PaymentList = () => (
    <div className="payment-list">
      <div className="payment-controls">
        <div className="date-range">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
          />
          <span>ถึง</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
          />
        </div>
        <button onClick={loadPaymentData} className="refresh-btn">
          🔄 รีเฟรชข้อมูล
        </button>
      </div>

      <div className="payment-table-container">
        <table className="payment-table">
          <thead>
            <tr>
              <th>ID การชำระ</th>
              <th>ลูกค้า</th>
              <th>ฟิตเนส</th>
              <th>จำนวนเงิน</th>
              <th>ระบบ (20%)</th>
              <th>พาร์ทเนอร์ (80%)</th>
              <th>วิธีการชำระ</th>
              <th>สถานะ</th>
              <th>วันที่</th>
              <th>การจัดการ</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => {
              const fees = calculatePaymentFees(
                parseFloat(payment.amount || 0), 
                payment.payment_method
              );
              const status = PAYMENT_STATUS[payment.status?.toUpperCase()] || PAYMENT_STATUS.PENDING;
              
              return (
                <tr key={payment.payment_id}>
                  <td>{payment.payment_id}</td>
                  <td>{payment.bookings?.user_id || 'N/A'}</td>
                  <td>{payment.bookings?.tbl_fitness?.fit_name || 'N/A'}</td>
                  <td className="amount">฿{parseFloat(payment.amount || 0).toLocaleString()}</td>
                  <td className="system-amount">฿{fees?.systemAmount.toLocaleString() || '0'}</td>
                  <td className="partner-amount">฿{fees?.partnerAmount.toLocaleString() || '0'}</td>
                  <td>
                    <span className="payment-method">
                      {PAYMENT_METHODS[payment.payment_method]?.icon || '💳'} 
                      {PAYMENT_METHODS[payment.payment_method]?.name || payment.payment_method}
                    </span>
                  </td>
                  <td>
                    <span 
                      className="status-badge" 
                      style={{ backgroundColor: status.color }}
                    >
                      {status.name}
                    </span>
                  </td>
                  <td>{new Date(payment.created_at).toLocaleString('th-TH')}</td>
                  <td>
                    <select
                      value={payment.status}
                      onChange={(e) => handleUpdatePaymentStatus(payment.payment_id, e.target.value)}
                      className="status-select"
                    >
                      {Object.entries(PAYMENT_STATUS).map(([key, status]) => (
                        <option key={key} value={key.toLowerCase()}>
                          {status.name}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const PayoutManagement = () => {
    const payoutData = generatePayoutReport();
    
    return (
      <div className="payout-management">
        <h3>💸 การจ่ายเงินให้พาร์ทเนอร์</h3>
        
        <div className="payout-summary">
          <div className="summary-card">
            <h4>รอการจ่ายเงิน</h4>
            <p className="payout-amount">
              ฿{payoutData.reduce((sum, p) => sum + p.totalAmount, 0).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="payout-table-container">
          <table className="payout-table">
            <thead>
              <tr>
                <th>เจ้าของฟิตเนส</th>
                <th>จำนวนการชำระ</th>
                <th>ยอดรวม</th>
                <th>จำนวนที่ต้องจ่าย (80%)</th>
                <th>สถานะ</th>
                <th>การจัดการ</th>
              </tr>
            </thead>
            <tbody>
              {payoutData.map((payout, index) => (
                <tr key={index}>
                  <td>{payout.ownerName}</td>
                  <td>{payout.paymentCount}</td>
                  <td>฿{payout.totalAmount.toLocaleString()}</td>
                  <td className="payout-amount">฿{payout.totalAmount.toLocaleString()}</td>
                  <td>
                    <span className="status-badge pending">รอการจ่าย</span>
                  </td>
                  <td>
                    <button className="payout-btn">จ่ายเงิน</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="payment-management">
      <div className="payment-header">
        <h2>💰 การจัดการชำระเงิน</h2>
        <div className="section-tabs">
          <button 
            className={activeSection === 'overview' ? 'active' : ''}
            onClick={() => setActiveSection('overview')}
          >
            📊 ภาพรวม
          </button>
          <button 
            className={activeSection === 'payments' ? 'active' : ''}
            onClick={() => setActiveSection('payments')}
          >
            💳 รายการชำระเงิน
          </button>
          <button 
            className={activeSection === 'payouts' ? 'active' : ''}
            onClick={() => setActiveSection('payouts')}
          >
            💸 การจ่ายเงินพาร์ทเนอร์
          </button>
        </div>
      </div>

      <div className="payment-content">
        {loading && <div className="loading">กำลังโหลดข้อมูล...</div>}
        
        {activeSection === 'overview' && <PaymentOverview />}
        {activeSection === 'payments' && <PaymentList />}
        {activeSection === 'payouts' && <PayoutManagement />}
      </div>
    </div>
  );
};

export default AdminPaymentManagement;