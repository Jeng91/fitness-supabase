// เพิ่มฟังก์ชันสำหรับดูข้อมูลที่บันทึกแล้ว
console.log('=== ข้อมูลใน localStorage ===');
const pendingPayments = JSON.parse(localStorage.getItem('pending_payments') || '[]');
console.log('Pending Payments in localStorage:', pendingPayments);

console.log('=== Storage Bucket ===');
console.log('Payment slips saved to: payment-slips bucket');

console.log('=== Database Table ===');
console.log('Payment records saved to: pending_payments table');

// ฟังก์ชันสำหรับล้างข้อมูล localStorage
window.clearPendingPayments = () => {
  localStorage.removeItem('pending_payments');
  console.log('✅ ล้างข้อมูล localStorage แล้ว');
};

// ฟังก์ชันสำหรับดูข้อมูลทั้งหมด
window.showAllPaymentData = () => {
  console.log('=== All Payment Data ===');
  console.log('1. localStorage:', JSON.parse(localStorage.getItem('pending_payments') || '[]'));
  console.log('2. Check Supabase Dashboard -> Storage -> payment-slips');
  console.log('3. Check Supabase Dashboard -> Table Editor -> pending_payments');
};

console.log('💡 ใช้ showAllPaymentData() เพื่อดูข้อมูลทั้งหมด');
console.log('💡 ใช้ clearPendingPayments() เพื่อล้างข้อมูล localStorage');