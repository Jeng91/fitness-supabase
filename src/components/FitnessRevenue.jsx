import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const FitnessRevenue = () => {
  const [revenue, setRevenue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRevenue();
  }, []);

  // Simple query: group approved_payments by fitness_int_id (if present) or fitness_id
  const fetchRevenue = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_fitness_revenue_summary', { p_limit: 100 });
      if (error) {
        // fallback: simple aggregation query
        const { data: agg, error: aggErr } = await supabase
          .from('approved_payments')
          .select('fitness_int_id, sum(amount) as total, count(id) as cnt')
          .group('fitness_int_id')
          .limit(100);
        if (aggErr) throw aggErr;
        setRevenue(agg || []);
        return;
      }
      setRevenue(data || []);
    } catch (err) {
      console.error('Error fetching revenue', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>กำลังโหลดสรุปรายได้...</div>;

  return (
    <div style={{ padding: 20 }}>
      <h2>สรุปรายได้ตามฟิตเนส</h2>
      <div>
        {revenue.map((r, idx) => (
          <div key={idx} style={{ border: '1px solid #ddd', padding: 12, marginBottom: 8 }}>
            <div><strong>Fitness ID (int):</strong> {r.fitness_int_id}</div>
            <div><strong>จำนวนรายการ:</strong> {r.cnt || r.count || 0}</div>
            <div><strong>รวมยอด:</strong> {r.total || r.sum || 0}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FitnessRevenue;
