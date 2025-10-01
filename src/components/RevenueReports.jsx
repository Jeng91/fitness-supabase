import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../supabaseClient';

const RevenueReports = ({ ownerData, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState({
    daily: [],
    monthly: [],
    yearly: []
  });
  const [activeTab, setActiveTab] = useState('daily');
    // const [selectedPeriod, setSelectedPeriod] = useState('this_month'); // TODO: Implement period selection
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    totalBookings: 0,
    averagePerBooking: 0,
    topPaymentMethod: '',
    growthRate: 0
  });

  const loadRevenueData = useCallback(async () => {
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
        console.log('ยังไม่มีข้อมูลฟิตเนส');
        setReportData({ daily: [], monthly: [], yearly: [] });
        return;
      }

      // Get all completed payments for this fitness
      const { data: paymentData, error: paymentError } = await supabase
        .from('tbl_payments')
        .select(`
          *,
          tbl_booking:booking_id (
            booking_id,
            booking_date,
            booking_price,
            fit_id
          )
        `)
        .eq('payment_status', 'completed')
        .eq('tbl_booking.fit_id', fitnessData.fit_id)
        .order('payment_date', { ascending: false });

      if (paymentError) {
        console.error('Error loading payment data:', paymentError);
        return;
      }

      const payments = paymentData?.filter(p => p.tbl_booking?.fit_id === fitnessData.fit_id) || [];

      // Process data for different time periods
      const processedData = processRevenueData(payments);
      setReportData(processedData);

      // Calculate summary statistics
      const summaryStats = calculateSummary(payments);
      setSummary(summaryStats);

    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }, [ownerData?.owner_id]);

  const processRevenueData = (payments) => {
    const daily = {};
    const monthly = {};
    const yearly = {};

    payments.forEach(payment => {
      const date = new Date(payment.payment_date);
      const dayKey = date.toISOString().split('T')[0];
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const yearKey = date.getFullYear().toString();
      const amount = payment.amount || 0;

      // Daily data
      if (!daily[dayKey]) {
        daily[dayKey] = { date: dayKey, revenue: 0, bookings: 0, payments: [] };
      }
      daily[dayKey].revenue += amount;
      daily[dayKey].bookings += 1;
      daily[dayKey].payments.push(payment);

      // Monthly data
      if (!monthly[monthKey]) {
        monthly[monthKey] = { date: monthKey, revenue: 0, bookings: 0, payments: [] };
      }
      monthly[monthKey].revenue += amount;
      monthly[monthKey].bookings += 1;
      monthly[monthKey].payments.push(payment);

      // Yearly data
      if (!yearly[yearKey]) {
        yearly[yearKey] = { date: yearKey, revenue: 0, bookings: 0, payments: [] };
      }
      yearly[yearKey].revenue += amount;
      yearly[yearKey].bookings += 1;
      yearly[yearKey].payments.push(payment);
    });

    return {
      daily: Object.values(daily).sort((a, b) => new Date(b.date) - new Date(a.date)),
      monthly: Object.values(monthly).sort((a, b) => new Date(b.date + '-01') - new Date(a.date + '-01')),
      yearly: Object.values(yearly).sort((a, b) => parseInt(b.date) - parseInt(a.date))
    };
  };

  const calculateSummary = (payments) => {
    const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalBookings = payments.length;
    const averagePerBooking = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    // Find most popular payment method
    const paymentMethods = {};
    payments.forEach(p => {
      paymentMethods[p.payment_method] = (paymentMethods[p.payment_method] || 0) + 1;
    });
    const topPaymentMethod = Object.keys(paymentMethods).reduce((a, b) => 
      paymentMethods[a] > paymentMethods[b] ? a : b, 'ไม่มีข้อมูล'
    );

    // Calculate growth rate (compare this month with last month)
    const currentMonth = new Date().toISOString().substring(0, 7);
    const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().substring(0, 7);
    
    const currentMonthRevenue = payments
      .filter(p => p.payment_date.startsWith(currentMonth))
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    
    const lastMonthRevenue = payments
      .filter(p => p.payment_date.startsWith(lastMonth))
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    
    const growthRate = lastMonthRevenue > 0 ? 
      ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalBookings,
      averagePerBooking,
      topPaymentMethod,
      growthRate
    };
  };

  useEffect(() => {
    loadRevenueData();
  }, [loadRevenueData]);

  const exportReport = async () => {
    try {
      const currentData = reportData[activeTab];
      if (!currentData || currentData.length === 0) {
        alert('ไม่มีข้อมูลสำหรับส่งออก');
        return;
      }

      // Create CSV content
      const headers = ['วันที่', 'รายได้ (บาท)', 'จำนวนการจอง', 'รายได้เฉลี่ยต่อการจอง'];
      const csvContent = [
        headers.join(','),
        ...currentData.map(item => [
          item.date,
          item.revenue,
          item.bookings,
          item.bookings > 0 ? (item.revenue / item.bookings).toFixed(2) : 0
        ].join(','))
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `revenue-report-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('เกิดข้อผิดพลาดในการส่งออกรายงาน');
    }
  };

  const formatDate = (dateStr, type) => {
    if (type === 'yearly') return dateStr;
    if (type === 'monthly') return new Date(dateStr + '-01').toLocaleDateString('th-TH', { year: 'numeric', month: 'long' });
    return new Date(dateStr).toLocaleDateString('th-TH');
  };

  const getPaymentMethodText = (method) => {
    switch (method) {
      case 'credit_card': return 'บัตรเครดิต';
      case 'bank_transfer': return 'โอนเงิน';
      case 'promptpay': return 'พร้อมเพย์';
      case 'cash': return 'เงินสด';
      default: return method;
    }
  };

  if (loading) {
    return <div className="loading">กำลังโหลดรายงานรายได้...</div>;
  }

  const currentData = reportData[activeTab] || [];

  return (
    <div className="revenue-reports">
      <div className="section-header">
        <h2>📊 รายงานรายได้</h2>
        <button className="btn-primary" onClick={exportReport}>
          📥 ส่งออกรายงาน
        </button>
      </div>

      {/* Summary Cards */}
      <div className="revenue-summary">
        <div className="summary-card">
          <div className="summary-icon">💰</div>
          <div className="summary-content">
            <h3>รายได้รวม</h3>
            <p className="summary-value">฿{summary.totalRevenue.toLocaleString()}</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">📅</div>
          <div className="summary-content">
            <h3>การจองทั้งหมด</h3>
            <p className="summary-value">{summary.totalBookings}</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">📈</div>
          <div className="summary-content">
            <h3>รายได้เฉลี่ย/การจอง</h3>
            <p className="summary-value">฿{summary.averagePerBooking.toFixed(0)}</p>
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-icon">💳</div>
          <div className="summary-content">
            <h3>วิธีชำระยอดนิยม</h3>
            <p className="summary-value">{getPaymentMethodText(summary.topPaymentMethod)}</p>
          </div>
        </div>
        <div className={`summary-card ${summary.growthRate >= 0 ? 'positive' : 'negative'}`}>
          <div className="summary-icon">{summary.growthRate >= 0 ? '📈' : '📉'}</div>
          <div className="summary-content">
            <h3>เปรียบเทียบเดือนก่อน</h3>
            <p className="summary-value">
              {summary.growthRate >= 0 ? '+' : ''}{summary.growthRate.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-buttons">
        <button
          className={`tab-btn ${activeTab === 'daily' ? 'active' : ''}`}
          onClick={() => setActiveTab('daily')}
        >
          📅 รายวัน
        </button>
        <button
          className={`tab-btn ${activeTab === 'monthly' ? 'active' : ''}`}
          onClick={() => setActiveTab('monthly')}
        >
          📆 รายเดือน
        </button>
        <button
          className={`tab-btn ${activeTab === 'yearly' ? 'active' : ''}`}
          onClick={() => setActiveTab('yearly')}
        >
          🗓️ รายปี
        </button>
      </div>

      {/* Revenue Chart Area */}
      <div className="chart-container">
        <h3>กราฟรายได้{activeTab === 'daily' ? 'รายวัน' : activeTab === 'monthly' ? 'รายเดือน' : 'รายปี'}</h3>
        {currentData.length === 0 ? (
          <div className="empty-chart">
            <p>ไม่มีข้อมูลรายได้ในช่วงเวลานี้</p>
          </div>
        ) : (
          <div className="revenue-chart">
            {currentData.slice(0, 10).map((item, index) => (
              <div key={index} className="chart-bar">
                <div className="bar-label">
                  {formatDate(item.date, activeTab)}
                </div>
                <div className="bar-container">
                  <div 
                    className="bar" 
                    style={{ 
                      height: `${Math.max((item.revenue / Math.max(...currentData.map(d => d.revenue))) * 100, 5)}%` 
                    }}
                  >
                    <span className="bar-value">฿{item.revenue.toLocaleString()}</span>
                  </div>
                </div>
                <div className="bar-bookings">
                  {item.bookings} การจอง
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detailed Table */}
      <div className="revenue-table">
        <h3>รายละเอียดรายได้</h3>
        {currentData.length === 0 ? (
          <div className="empty-state">
            <p>ไม่มีข้อมูลรายได้</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>วันที่</th>
                <th>รายได้</th>
                <th>จำนวนการจอง</th>
                <th>รายได้เฉลี่ย/การจอง</th>
                <th>การดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {currentData.map((item, index) => (
                <tr key={index}>
                  <td>{formatDate(item.date, activeTab)}</td>
                  <td className="revenue-amount">฿{item.revenue.toLocaleString()}</td>
                  <td>{item.bookings}</td>
                  <td>฿{item.bookings > 0 ? (item.revenue / item.bookings).toFixed(0) : 0}</td>
                  <td>
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => {
                        // Show detailed breakdown for this period
                        const details = item.payments.map(p => ({
                          id: p.payment_id,
                          amount: p.amount,
                          method: getPaymentMethodText(p.payment_method),
                          date: new Date(p.payment_date).toLocaleString('th-TH')
                        }));
                        
                        const detailsText = details.map(d => 
                          `#${d.id}: ฿${d.amount} (${d.method}) - ${d.date}`
                        ).join('\n');
                        
                        alert(`รายละเอียดการชำระเงิน:\n\n${detailsText}`);
                      }}
                    >
                      ดูรายละเอียด
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default RevenueReports;