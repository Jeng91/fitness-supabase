// debug_approved_payments.js - สร้างข้อมูลทดสอบสำหรับการชำระเงินที่อนุมัติแล้ว

const testApprovedPayments = [
  {
    id: 'approved_001',
    transaction_id: 'txn_' + Date.now() + '_001',
    user_id: 'user_001',
    amount: 1500.00,
    description: 'ค่าสมาชิกฟิตเนส 2 เดือน',
    slip_url: 'https://example.com/slip1.jpg',
    slip_filename: 'slip_001.jpg',
    payment_type: 'qr_payment',
    
    // ข้อมูลการจองฟิตเนส
    booking_type: 'monthly',
    booking_period: '2 เดือน',
    fitness_name: 'PJ Fitness Center - สาขาลาดพร้าว',
    partner_name: 'PJ Fitness Center Management',
    
    // การคำนวณรายได้
    system_fee: 300.00, // 20%
    partner_revenue: 1200.00, // 80%
    
    approved_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // เมื่อวาน
    approved_by: 'admin@pjfitness.com',
    notes: 'อนุมัติโดยแอดมิน - ตรวจสอบสลิปเรียบร้อย',
    
    // ข้อมูลผู้ใช้จำลอง
    full_name: 'สมชาย ใจดี',
    useremail: 'somchai@email.com',
    usertel: '081-234-5678'
  },
  {
    id: 'approved_002',
    transaction_id: 'txn_' + (Date.now() + 1000) + '_002',
    user_id: 'user_002',
    amount: 500.00,
    description: 'ค่าใช้บริการฟิตเนส รายวัน',
    slip_url: 'https://example.com/slip2.jpg',
    slip_filename: 'slip_002.jpg',
    payment_type: 'qr_payment',
    
    // ข้อมูลการจองฟิตเนส
    booking_type: 'daily',
    booking_period: '1 วัน',
    fitness_name: 'PJ Fitness Center - สาขาอารีย์',
    partner_name: 'PJ Fitness Center Management',
    
    // การคำนวณรายได้
    system_fee: 100.00, // 20%
    partner_revenue: 400.00, // 80%
    
    approved_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 วันที่แล้ว
    approved_by: 'admin@pjfitness.com',
    notes: 'อนุมัติโดยแอดมิน - ตรวจสอบสลิปเรียบร้อย',
    
    // ข้อมูลผู้ใช้จำลอง
    full_name: 'สมหญิง สุขใจ',
    useremail: 'somying@email.com',
    usertel: '082-345-6789'
  },
  {
    id: 'approved_003',
    transaction_id: 'txn_' + (Date.now() + 2000) + '_003',
    user_id: 'user_003',
    amount: 8000.00,
    description: 'ค่าสมาชิกฟิตเนส 1 ปี',
    slip_url: 'https://example.com/slip3.jpg',
    slip_filename: 'slip_003.jpg',
    payment_type: 'qr_payment',
    
    // ข้อมูลการจองฟิตเนส
    booking_type: 'yearly',
    booking_period: '1 ปี',
    fitness_name: 'PJ Fitness Center - สาขาสีลม',
    partner_name: 'PJ Fitness Center Management',
    
    // การคำนวณรายได้
    system_fee: 1600.00, // 20%
    partner_revenue: 6400.00, // 80%
    
    approved_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 วันที่แล้ว
    approved_by: 'admin@pjfitness.com',
    notes: 'อนุมัติโดยแอดมิน - ตรวจสอบสลิปเรียบร้อย',
    
    // ข้อมูลผู้ใช้จำลอง
    full_name: 'วิทยา กรีนฟิต',
    useremail: 'wittaya@email.com',
    usertel: '083-456-7890'
  },
  {
    id: 'approved_004',
    transaction_id: 'txn_' + (Date.now() + 3000) + '_004',
    user_id: 'user_004',
    amount: 800.00,
    description: 'ค่าคลาสโยคะ 4 ครั้ง',
    slip_url: 'https://example.com/slip4.jpg',
    slip_filename: 'slip_004.jpg',
    payment_type: 'qr_payment',
    
    // ข้อมูลการจองฟิตเนส
    booking_type: 'class',
    booking_period: '4 ครั้ง',
    fitness_name: 'PJ Fitness Center - สาขาเอกมัย',
    partner_name: 'PJ Fitness Center Management',
    
    // การคำนวณรายได้
    system_fee: 160.00, // 20%
    partner_revenue: 640.00, // 80%
    
    approved_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 วันที่แล้ว
    approved_by: 'admin@pjfitness.com',
    notes: 'อนุมัติโดยแอดมิน - ตรวจสอบสลิปเรียบร้อย',
    
    // ข้อมูลผู้ใช้จำลอง
    full_name: 'นริศรา โยคะดี',
    useremail: 'narisara@email.com',
    usertel: '084-567-8901'
  },
  {
    id: 'approved_005',
    transaction_id: 'txn_' + (Date.now() + 4000) + '_005',
    user_id: 'user_005',
    amount: 3600.00,
    description: 'ค่าสมาชิกฟิตเนส 6 เดือน',
    slip_url: 'https://example.com/slip5.jpg',
    slip_filename: 'slip_005.jpg',
    payment_type: 'qr_payment',
    
    // ข้อมูลการจองฟิตเนส
    booking_type: 'monthly',
    booking_period: '6 เดือน',
    fitness_name: 'PJ Fitness Center - สาขาพระราม 4',
    partner_name: 'PJ Fitness Center Management',
    
    // การคำนวณรายได้
    system_fee: 720.00, // 20%
    partner_revenue: 2880.00, // 80%
    
    approved_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 วันที่แล้ว
    approved_by: 'admin@pjfitness.com',
    notes: 'อนุมัติโดยแอดมิน - ตรวจสอบสลิปเรียบร้อย',
    
    // ข้อมูลผู้ใช้จำลอง
    full_name: 'สุรชัย ฟิตแข็งแรง',
    useremail: 'surachai@email.com',
    usertel: '085-678-9012'
  }
];

// บันทึกข้อมูลทดสอบลง localStorage
localStorage.setItem('approved_payments', JSON.stringify(testApprovedPayments));

console.log('✅ เพิ่มข้อมูลทดสอบ approved_payments สำเร็จ!');
console.log('📊 รายได้รวม:', testApprovedPayments.reduce((sum, p) => sum + p.amount, 0).toLocaleString('th-TH') + ' บาท');
console.log('💰 รายได้ระบบ:', testApprovedPayments.reduce((sum, p) => sum + p.system_fee, 0).toLocaleString('th-TH') + ' บาท');
console.log('🏋️ รายได้ฟิตเนส:', testApprovedPayments.reduce((sum, p) => sum + p.partner_revenue, 0).toLocaleString('th-TH') + ' บาท');
console.log('🔢 จำนวนรายการ:', testApprovedPayments.length + ' รายการ');

// สถิติตามประเภทการจอง
const bookingStats = testApprovedPayments.reduce((stats, payment) => {
  const type = payment.booking_type;
  if (!stats[type]) {
    stats[type] = { count: 0, revenue: 0 };
  }
  stats[type].count++;
  stats[type].revenue += payment.amount;
  return stats;
}, {});

console.log('📈 สถิติตามประเภทการจอง:');
Object.entries(bookingStats).forEach(([type, data]) => {
  console.log(`  ${type}: ${data.count} รายการ, ${data.revenue.toLocaleString('th-TH')} บาท`);
});

alert('เพิ่มข้อมูลทดสอบ approved_payments สำเร็จ!\n\nดูรายละเอียดในหน้า "รายงาน" หรือ "การชำระเงิน"');