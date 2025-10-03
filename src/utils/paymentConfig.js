// ระบบบัญชีธนาคารและการจัดการชำระเงิน PJ Fitness
// เพิ่มฟีเจอร์ใหม่สำหรับแอดมิน

export const SYSTEM_BANK_ACCOUNTS = {
  main: {
    accountNumber: '3300613558',
    accountName: 'นายทรงเดช ศรีวิราช', 
    bankName: 'ธนาคารกรุงเทพ',
    bankCode: 'BBL',
    accountType: 'บัญชีออมทรัพย์',
    purpose: 'รับเงินค่าธรรมเนียมระบบ (20%)',
    qrCode: null // จะเพิ่ม QR Code ภายหลัง
  },
  backup: {
    accountNumber: '1234567890',
    accountName: 'บริษัท PJ ฟิตเนส จำกัด',
    bankName: 'ธนาคารกสิกรไทย',
    bankCode: 'KBANK', 
    accountType: 'บัญชีกระแสรายวัน',
    purpose: 'บัญชีสำรอง',
    qrCode: null
  }
};

export const PAYMENT_METHODS = {
  PROMPTPAY: {
    name: 'PromptPay',
    icon: '💳',
    systemAccount: 'main',
    feePercentage: 20,
    partnerPercentage: 80
  },
  BANK_TRANSFER: {
    name: 'โอนเงินผ่านธนาคาร',
    icon: '🏦',
    systemAccount: 'main', 
    feePercentage: 20,
    partnerPercentage: 80
  },
  CREDIT_CARD: {
    name: 'บัตรเครดิต',
    icon: '💴',
    systemAccount: 'main',
    feePercentage: 20,
    partnerPercentage: 80,
    processingFee: 2.5 // เพิ่ม 2.5% สำหรับค่าธรรมเนียมบัตร
  },
  CASH: {
    name: 'เงินสด',
    icon: '💵',
    systemAccount: null,
    feePercentage: 20,
    partnerPercentage: 80
  }
};

export const PAYMENT_STATUS = {
  PENDING: {
    name: 'รอการชำระเงิน',
    color: '#ffc107',
    description: 'รอลูกค้าชำระเงิน'
  },
  PROCESSING: {
    name: 'กำลังดำเนินการ',
    color: '#17a2b8',
    description: 'ระบบกำลังตรวจสอบการชำระเงิน'
  },
  COMPLETED: {
    name: 'ชำระเงินสำเร็จ',
    color: '#28a745',
    description: 'การชำระเงินเสร็จสมบูรณ์'
  },
  FAILED: {
    name: 'การชำระเงินล้มเหลว',
    color: '#dc3545',
    description: 'เกิดข้อผิดพลาดในการชำระเงิน'
  },
  CANCELLED: {
    name: 'ยกเลิกการชำระเงิน',
    color: '#6c757d',
    description: 'ลูกค้าหรือระบบยกเลิกการชำระเงิน'
  },
  REFUNDED: {
    name: 'คืนเงินแล้ว',
    color: '#fd7e14',
    description: 'ดำเนินการคืนเงินเรียบร้อย'
  }
};

// ฟังก์ชันคำนวณค่าธรรมเนียมตามประเภทการชำระเงิน
export const calculatePaymentFees = (amount, paymentMethod) => {
  const method = PAYMENT_METHODS[paymentMethod];
  if (!method) return null;

  let totalFees = (amount * method.feePercentage) / 100;
  
  // เพิ่มค่าธรรมเนียมการประมวลผลสำหรับบัตรเครดิต
  if (method.processingFee) {
    totalFees += (amount * method.processingFee) / 100;
  }

  const systemAmount = totalFees;
  const partnerAmount = amount - totalFees;

  return {
    originalAmount: amount,
    systemAmount: systemAmount,
    partnerAmount: partnerAmount,
    systemPercentage: method.feePercentage,
    partnerPercentage: method.partnerPercentage,
    processingFee: method.processingFee || 0,
    paymentMethod: method.name
  };
};

// ฟังก์ชันสร้างข้อมูลการโอนเงิน
export const generateTransferDetails = (paymentId, amount, paymentMethod) => {
  const method = PAYMENT_METHODS[paymentMethod];
  const account = SYSTEM_BANK_ACCOUNTS[method.systemAccount];
  
  if (!account) return null;

  const fees = calculatePaymentFees(amount, paymentMethod);
  
  return {
    paymentId,
    transferTo: {
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      bankName: account.bankName,
      bankCode: account.bankCode
    },
    amount: fees.systemAmount,
    reference: `PJF-${paymentId}`,
    description: `ค่าธรรมเนียมระบบ PJ Fitness - ${fees.paymentMethod}`,
    timestamp: new Date().toISOString()
  };
};

// ข้อมูลสำหรับรายงานการเงิน
export const FINANCIAL_REPORTS = {
  DAILY: 'รายงานรายวัน',
  WEEKLY: 'รายงานรายสัปดาห์', 
  MONTHLY: 'รายงานรายเดือน',
  YEARLY: 'รายงานรายปี',
  CUSTOM: 'รายงานตามช่วงเวลา'
};

// สถานะการจัดการเงินให้พาร์ทเนอร์
export const PARTNER_PAYOUT_STATUS = {
  PENDING: {
    name: 'รอการจ่ายเงิน',
    color: '#ffc107',
    description: 'รอดำเนินการจ่ายเงินให้พาร์ทเนอร์'
  },
  PROCESSING: {
    name: 'กำลังโอนเงิน',
    color: '#17a2b8', 
    description: 'กำลังดำเนินการโอนเงินให้พาร์ทเนอร์'
  },
  COMPLETED: {
    name: 'จ่ายเงินเรียบร้อย',
    color: '#28a745',
    description: 'จ่ายเงินให้พาร์ทเนอร์เรียบร้อยแล้ว'
  },
  FAILED: {
    name: 'จ่ายเงินล้มเหลว',
    color: '#dc3545',
    description: 'เกิดข้อผิดพลาดในการจ่ายเงิน'
  }
};