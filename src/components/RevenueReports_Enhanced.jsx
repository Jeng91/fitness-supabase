import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';

const RevenueReports = () => {
  const [approvedPayments, setApprovedPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchRevenueData();
  }, [dateRange]);

  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      
      // ดึงข้อมูลจาก approved_payments
      const { data: dbPayments, error } = await supabase
        .from('approved_payments')
        .select('*')
        .gte('approved_at', dateRange.start)
        .lte('approved_at', dateRange.end + 'T23:59:59')
        .order('approved_at', { ascending: false });

      if (!error && dbPayments) {
        setApprovedPayments(dbPayments);
      } else {
        // Fallback ไปยัง localStorage
        const localData = JSON.parse(localStorage.getItem('approved_payments') || '[]');
        const filteredData = localData.filter(payment => {
          const paymentDate = new Date(payment.approved_at || payment.created_at);
          const startDate = new Date(dateRange.start);
          const endDate = new Date(dateRange.end + 'T23:59:59');
          return paymentDate >= startDate && paymentDate <= endDate;
        });
        setApprovedPayments(filteredData);
      }
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      setApprovedPayments([]);
    } finally {
      setLoading(false);
    }
  };

  // คำนวณสถิติรายได้รายละเอียด
  const revenueAnalytics = useMemo(() => {
    const analytics = {
      totalRevenue: 0,
      systemRevenue: 0,
      partnerRevenue: 0,
      totalTransactions: approvedPayments.length,
      averageTransactionValue: 0,
      
      // การแบ่งตามประเภทการจอง
      bookingTypes: {
        daily: { count: 0, revenue: 0, systemFee: 0, partnerRevenue: 0 },
        monthly: { count: 0, revenue: 0, systemFee: 0, partnerRevenue: 0 },
        yearly: { count: 0, revenue: 0, systemFee: 0, partnerRevenue: 0 },
        class: { count: 0, revenue: 0, systemFee: 0, partnerRevenue: 0 },
        membership: { count: 0, revenue: 0, systemFee: 0, partnerRevenue: 0 }
      },
      
      // การแบ่งตามฟิตเนส
      fitnessBreakdown: {},
      
      // การแบ่งตามวันที่
      dailyRevenue: {}
    };

    approvedPayments.forEach(payment => {
      const amount = parseFloat(payment.amount) || 0;
      const systemFee = parseFloat(payment.system_fee) || (amount * 0.2);
      const partnerRevenue = parseFloat(payment.partner_revenue) || (amount * 0.8);
      const bookingType = payment.booking_type || 'membership';
      const fitnessName = payment.fitness_name || 'PJ Fitness Center';
      const date = new Date(payment.approved_at || payment.created_at).toISOString().split('T')[0];

      // ยอดรวมทั้งหมด
      analytics.totalRevenue += amount;
      analytics.systemRevenue += systemFee;
      analytics.partnerRevenue += partnerRevenue;

      // แยกตามประเภทการจอง
      if (analytics.bookingTypes[bookingType]) {
        analytics.bookingTypes[bookingType].count += 1;
        analytics.bookingTypes[bookingType].revenue += amount;
        analytics.bookingTypes[bookingType].systemFee += systemFee;
        analytics.bookingTypes[bookingType].partnerRevenue += partnerRevenue;
      }

      // แยกตามฟิตเนส
      if (!analytics.fitnessBreakdown[fitnessName]) {
        analytics.fitnessBreakdown[fitnessName] = {
          count: 0,
          revenue: 0,
          systemFee: 0,
          partnerRevenue: 0
        };
      }
      analytics.fitnessBreakdown[fitnessName].count += 1;
      analytics.fitnessBreakdown[fitnessName].revenue += amount;
      analytics.fitnessBreakdown[fitnessName].systemFee += systemFee;
      analytics.fitnessBreakdown[fitnessName].partnerRevenue += partnerRevenue;

      // แยกตามวันที่
      if (!analytics.dailyRevenue[date]) {
        analytics.dailyRevenue[date] = {
          count: 0,
          revenue: 0,
          systemFee: 0,
          partnerRevenue: 0
        };
      }
      analytics.dailyRevenue[date].count += 1;
      analytics.dailyRevenue[date].revenue += amount;
      analytics.dailyRevenue[date].systemFee += systemFee;
      analytics.dailyRevenue[date].partnerRevenue += partnerRevenue;
    });

    // คำนวณค่าเฉลี่ย
    if (analytics.totalTransactions > 0) {
      analytics.averageTransactionValue = analytics.totalRevenue / analytics.totalTransactions;
    }

    return analytics;
  }, [approvedPayments]);

  const formatAmount = (amount) => {
    return Number(amount).toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>📊 รายงานรายได้และสถิติ</h2>
        <p>กำลังโหลดข้อมูลรายได้...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h2>📊 รายงานรายได้และสถิติ</h2>
      
      {/* ตัวเลือกช่วงเวลา */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', alignItems: 'center' }}>
        <label>วันที่เริ่มต้น:</label>
        <input
          type="date"
          value={dateRange.start}
          onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <label>วันที่สิ้นสุด:</label>
        <input
          type="date"
          value={dateRange.end}
          onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
          style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
      </div>

      {/* สรุปรายได้รวม */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '30px' }}>
        <div style={{ background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)', color: 'white', padding: '20px', borderRadius: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8em', fontWeight: 'bold' }}>฿{formatAmount(revenueAnalytics.totalRevenue)}</div>
          <div>รายได้รวมทั้งหมด</div>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '20px', borderRadius: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8em', fontWeight: 'bold' }}>฿{formatAmount(revenueAnalytics.systemRevenue)}</div>
          <div>รายได้ระบบ (20%)</div>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white', padding: '20px', borderRadius: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8em', fontWeight: 'bold' }}>฿{formatAmount(revenueAnalytics.partnerRevenue)}</div>
          <div>รายได้ฟิตเนส (80%)</div>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)', color: '#333', padding: '20px', borderRadius: '10px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8em', fontWeight: 'bold' }}>฿{formatAmount(revenueAnalytics.averageTransactionValue)}</div>
          <div>ยอดเฉลี่ยต่อรายการ</div>
        </div>
      </div>

      {/* สถิติการจองตามประเภท */}
      <div style={{ marginBottom: '30px' }}>
        <h3>📋 การวิเคราะห์ตามประเภทการจอง</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
          {Object.entries(revenueAnalytics.bookingTypes).map(([type, data]) => (
            <div key={type} style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #e9ecef' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>
                  {type === 'daily' && '📅'}
                  {type === 'monthly' && '📆'}
                  {type === 'yearly' && '🗓️'}
                  {type === 'class' && '🏋️'}
                  {type === 'membership' && '👥'}
                </span>
                <span>
                  {type === 'daily' && 'รายวัน'}
                  {type === 'monthly' && 'รายเดือน'}
                  {type === 'yearly' && 'รายปี'}
                  {type === 'class' && 'คลาส'}
                  {type === 'membership' && 'สมาชิก'}
                </span>
              </div>
              
              <div style={{ fontSize: '0.9em' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>รายการ:</span>
                  <span>{data.count}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>รายได้รวม:</span>
                  <span style={{ fontWeight: 'bold', color: '#059669' }}>฿{formatAmount(data.revenue)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>รายได้ระบบ:</span>
                  <span style={{ color: '#dc2626' }}>฿{formatAmount(data.systemFee)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>รายได้ฟิตเนส:</span>
                  <span style={{ color: '#16a34a' }}>฿{formatAmount(data.partnerRevenue)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* สถิติการจองตามฟิตเนสเซ็นเตอร์ */}
      <div style={{ marginBottom: '30px' }}>
        <h3>🏢 การวิเคราะห์ตามฟิตเนสเซ็นเตอร์</h3>
        <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e9ecef' }}>ฟิตเนสเซ็นเตอร์</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e9ecef' }}>จำนวนรายการ</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e9ecef' }}>รายได้รวม</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e9ecef' }}>รายได้ระบบ</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e9ecef' }}>รายได้ฟิตเนส</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e9ecef' }}>% ของรายได้รวม</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(revenueAnalytics.fitnessBreakdown)
                .sort(([,a], [,b]) => b.revenue - a.revenue)
                .map(([fitnessName, data]) => (
                <tr key={fitnessName}>
                  <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef', fontWeight: 'bold' }}>{fitnessName}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef', textAlign: 'right' }}>{data.count}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef', textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>฿{formatAmount(data.revenue)}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef', textAlign: 'right', color: '#dc2626' }}>฿{formatAmount(data.systemFee)}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef', textAlign: 'right', color: '#16a34a' }}>฿{formatAmount(data.partnerRevenue)}</td>
                  <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef', textAlign: 'right' }}>
                    {revenueAnalytics.totalRevenue > 0 
                      ? ((data.revenue / revenueAnalytics.totalRevenue) * 100).toFixed(1)
                      : 0
                    }%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* รายการที่อนุมัติ */}
      <div>
        <h3>✅ รายการที่อนุมัติในช่วงเวลานี้</h3>
        <p>จำนวนรายการทั้งหมด: {revenueAnalytics.totalTransactions} รายการ</p>
        
        {approvedPayments.length > 0 ? (
          <div style={{ background: 'white', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8f9fa' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e9ecef' }}>วันที่</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e9ecef' }}>ประเภท</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e9ecef' }}>ฟิตเนส</th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e9ecef' }}>รายละเอียด</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e9ecef' }}>ยอดชำระ</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e9ecef' }}>รายได้ระบบ</th>
                  <th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e9ecef' }}>รายได้ฟิตเนส</th>
                </tr>
              </thead>
              <tbody>
                {approvedPayments.slice(0, 10).map((payment) => (
                  <tr key={payment.id}>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef' }}>
                      {formatDate(payment.approved_at || payment.created_at)}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef' }}>
                      <span style={{ 
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                        color: 'white', 
                        padding: '4px 8px', 
                        borderRadius: '4px', 
                        fontSize: '0.8em' 
                      }}>
                        {payment.booking_type === 'daily' && '📅 รายวัน'}
                        {payment.booking_type === 'monthly' && '📆 รายเดือน'}
                        {payment.booking_type === 'yearly' && '🗓️ รายปี'}
                        {payment.booking_type === 'class' && '🏋️ คลาส'}
                        {(payment.booking_type === 'membership' || !payment.booking_type) && '👥 สมาชิก'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef', fontWeight: 'bold', color: '#059669' }}>
                      {payment.fitness_name || 'PJ Fitness Center'}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef' }}>
                      {payment.description}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef', textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>
                      ฿{formatAmount(payment.amount)}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef', textAlign: 'right', color: '#dc2626' }}>
                      ฿{formatAmount(payment.system_fee || (payment.amount * 0.2))}
                    </td>
                    <td style={{ padding: '12px', borderBottom: '1px solid #e9ecef', textAlign: 'right', color: '#16a34a' }}>
                      ฿{formatAmount(payment.partner_revenue || (payment.amount * 0.8))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {approvedPayments.length > 10 && (
              <div style={{ padding: '12px', textAlign: 'center', background: '#f8f9fa', fontSize: '0.9em', color: '#6c757d' }}>
                แสดง 10 รายการแรก จากทั้งหมด {approvedPayments.length} รายการ
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', background: '#f8f9fa', borderRadius: '8px', color: '#6c757d' }}>
            ไม่มีรายการในช่วงเวลาที่เลือก
          </div>
        )}
      </div>
    </div>
  );
};

export default RevenueReports;