import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const PaymentHistory = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('approved_payments')
        .select(`*, profiles:user_id (full_name, email)`)
        .order('approved_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setPayments(data || []);
    } catch (err) {
      console.error('Error fetching history', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>กำลังโหลดประวัติการชำระเงิน...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h2>ประวัติการชำระเงิน</h2>
      <p>รายการล่าสุด {payments.length} รายการ</p>
      <div>
        {payments.map(p => (
          <div key={p.id} style={{ border: '1px solid #ddd', padding: 12, marginBottom: 8 }}>
            <div><strong>Transaction:</strong> {p.transaction_id}</div>
            <div><strong>จำนวน:</strong> {p.amount}</div>
            <div><strong>ผู้ใช้:</strong> {p.profiles?.full_name || p.user_id}</div>
            <div><strong>วันที่อนุมัติ:</strong> {new Date(p.approved_at).toLocaleString('th-TH')}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PaymentHistory;
