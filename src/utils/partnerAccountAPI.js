import { supabase } from '../supabaseClient';

// ฟังก์ชันสำหรับอัปเดตข้อมูลบัญชีพาร์ทเนอร์
export const updatePartnerBankAccount = async (fitnessId, bankAccountData) => {
  try {
    console.log('🔄 Updating partner bank account for fitness:', fitnessId, bankAccountData);

    const { data, error } = await supabase
      .from('tbl_fitness')
      .update({
        partner_bank_account: bankAccountData.partner_bank_account,
        partner_bank_name: bankAccountData.partner_bank_name,
        partner_account_name: bankAccountData.partner_account_name,
        partner_promptpay_id: bankAccountData.partner_promptpay_id,
        revenue_split_percentage: bankAccountData.revenue_split_percentage || 80.00
      })
      .eq('fit_id', fitnessId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update partner bank account: ${error.message}`);
    }

    console.log('✅ Partner bank account updated:', data);

    return {
      success: true,
      data: data
    };

  } catch (error) {
    console.error('❌ updatePartnerBankAccount error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ฟังก์ชันสำหรับดึงข้อมูลบัญชีพาร์ทเนอร์
export const getPartnerBankAccount = async (fitnessId) => {
  try {
    console.log('🔄 Fetching partner bank account for fitness:', fitnessId);

    const { data, error } = await supabase
      .from('tbl_fitness')
      .select(`
        fit_id,
        fit_name,
        partner_bank_account,
        partner_bank_name,
        partner_account_name,
        partner_promptpay_id,
        revenue_split_percentage,
        fit_user
      `)
      .eq('fit_id', fitnessId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch partner bank account: ${error.message}`);
    }

    console.log('✅ Partner bank account fetched:', data);

    return {
      success: true,
      data: data
    };

  } catch (error) {
    console.error('❌ getPartnerBankAccount error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ฟังก์ชันสำหรับดึงข้อมูลบัญชีพาร์ทเนอร์ทั้งหมด (สำหรับ Admin)
export const getAllPartnerBankAccounts = async () => {
  try {
    console.log('🔄 Fetching all partner bank accounts...');

    const { data, error } = await supabase
      .from('tbl_fitness')
      .select(`
        fit_id,
        fit_name,
        fit_user,
        partner_bank_account,
        partner_bank_name,
        partner_account_name,
        partner_promptpay_id,
        revenue_split_percentage,
        created_at
      `)
      .not('partner_bank_account', 'is', null)
      .order('fit_name', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch partner bank accounts: ${error.message}`);
    }

    console.log('✅ All partner bank accounts fetched:', data);

    return {
      success: true,
      data: data || []
    };

  } catch (error) {
    console.error('❌ getAllPartnerBankAccounts error:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

// ฟังก์ชันสำหรับสร้างการโอนเงินไปพาร์ทเนอร์
export const createPartnerTransfer = async (transferData) => {
  try {
    console.log('🔄 Creating partner transfer...', transferData);

    // คำนวณจำนวนเงินที่พาร์ทเนอร์และระบบจะได้
    const totalAmount = parseFloat(transferData.total_amount);
    const revenueSplitPercentage = parseFloat(transferData.revenue_split_percentage || 80.00);
    const partnerAmount = (totalAmount * revenueSplitPercentage) / 100;
    const systemAmount = totalAmount - partnerAmount;

    const { data, error } = await supabase
      .from('tbl_partner_transfers')
      .insert({
        partner_fitness_id: transferData.partner_fitness_id,
        payment_id: transferData.payment_id,
        total_amount: totalAmount,
        partner_amount: partnerAmount,
        system_amount: systemAmount,
        transfer_status: 'pending',
        partner_bank_account: transferData.partner_bank_account,
        partner_bank_name: transferData.partner_bank_name,
        partner_account_name: transferData.partner_account_name,
        notes: transferData.notes || `การโอนเงินจากการชำระเงิน Payment ID: ${transferData.payment_id}`
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create partner transfer: ${error.message}`);
    }

    console.log('✅ Partner transfer created:', data);

    return {
      success: true,
      data: data
    };

  } catch (error) {
    console.error('❌ createPartnerTransfer error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ฟังก์ชันสำหรับอัปเดตสถานะการโอนเงิน
export const updateTransferStatus = async (transferId, status, transferReference = null) => {
  try {
    console.log('🔄 Updating transfer status:', transferId, status);

    const updateData = {
      transfer_status: status,
      updated_at: new Date().toISOString()
    };

    if (status === 'completed') {
      updateData.transfer_date = new Date().toISOString();
    }

    if (transferReference) {
      updateData.transfer_reference = transferReference;
    }

    const { data, error } = await supabase
      .from('tbl_partner_transfers')
      .update(updateData)
      .eq('transfer_id', transferId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update transfer status: ${error.message}`);
    }

    console.log('✅ Transfer status updated:', data);

    return {
      success: true,
      data: data
    };

  } catch (error) {
    console.error('❌ updateTransferStatus error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ฟังก์ชันสำหรับดึงข้อมูลการโอนเงินของพาร์ทเนอร์
export const getPartnerTransfers = async (fitnessId = null) => {
  try {
    console.log('🔄 Fetching partner transfers for fitness:', fitnessId);

    let query = supabase
      .from('tbl_partner_transfers')
      .select(`
        *,
        tbl_fitness:partner_fitness_id (
          fit_name,
          fit_user
        ),
        payments:payment_id (
          transaction_id,
          payment_method,
          created_at
        )
      `)
      .order('created_at', { ascending: false });

    if (fitnessId) {
      query = query.eq('partner_fitness_id', fitnessId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch partner transfers: ${error.message}`);
    }

    console.log('✅ Partner transfers fetched:', data);

    return {
      success: true,
      data: data || []
    };

  } catch (error) {
    console.error('❌ getPartnerTransfers error:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

// ฟังก์ชันสำหรับคำนวณรายได้ของพาร์ทเนอร์
export const calculatePartnerRevenue = async (fitnessId, startDate = null, endDate = null) => {
  try {
    console.log('🔄 Calculating partner revenue for fitness:', fitnessId, { startDate, endDate });

    let query = supabase
      .from('tbl_partner_transfers')
      .select('total_amount, partner_amount, system_amount, transfer_status')
      .eq('partner_fitness_id', fitnessId);

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to calculate partner revenue: ${error.message}`);
    }

    // คำนวณสถิติ
    const stats = {
      totalTransfers: data.length,
      totalRevenue: data.reduce((sum, transfer) => sum + parseFloat(transfer.total_amount || 0), 0),
      partnerAmount: data.reduce((sum, transfer) => sum + parseFloat(transfer.partner_amount || 0), 0),
      systemAmount: data.reduce((sum, transfer) => sum + parseFloat(transfer.system_amount || 0), 0),
      completedTransfers: data.filter(t => t.transfer_status === 'completed').length,
      pendingTransfers: data.filter(t => t.transfer_status === 'pending').length,
      completedAmount: data
        .filter(t => t.transfer_status === 'completed')
        .reduce((sum, transfer) => sum + parseFloat(transfer.partner_amount || 0), 0)
    };

    console.log('✅ Partner revenue calculated:', stats);

    return {
      success: true,
      data: stats
    };

  } catch (error) {
    console.error('❌ calculatePartnerRevenue error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// ฟังก์ชันสำหรับตรวจสอบความถูกต้องของข้อมูลบัญชี
export const validateBankAccountData = (bankAccountData) => {
  const errors = {};

  if (!bankAccountData.partner_bank_account || bankAccountData.partner_bank_account.trim() === '') {
    errors.partner_bank_account = 'กรุณากรอกหมายเลขบัญชี';
  } else if (!/^\d{10,12}$/.test(bankAccountData.partner_bank_account.replace(/[-\s]/g, ''))) {
    errors.partner_bank_account = 'หมายเลขบัญชีต้องเป็นตัวเลข 10-12 หลัก';
  }

  if (!bankAccountData.partner_bank_name || bankAccountData.partner_bank_name.trim() === '') {
    errors.partner_bank_name = 'กรุณาเลือกธนาคาร';
  }

  if (!bankAccountData.partner_account_name || bankAccountData.partner_account_name.trim() === '') {
    errors.partner_account_name = 'กรุณากรอกชื่อบัญชี';
  }

  if (bankAccountData.partner_promptpay_id && 
      !/^(0[689]\d{8}|1\d{12})$/.test(bankAccountData.partner_promptpay_id.replace(/[-\s]/g, ''))) {
    errors.partner_promptpay_id = 'PromptPay ID ต้องเป็นเบอร์โทรศัพท์ 10 หลัก หรือเลขบัตรประชาชน 13 หลัก';
  }

  const revenueSplit = parseFloat(bankAccountData.revenue_split_percentage);
  if (isNaN(revenueSplit) || revenueSplit < 0 || revenueSplit > 100) {
    errors.revenue_split_percentage = 'เปอร์เซ็นต์การแบ่งรายได้ต้องอยู่ระหว่าง 0-100';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors: errors
  };
};

// Export default object
const partnerAccountAPI = {
  updatePartnerBankAccount,
  getPartnerBankAccount,
  getAllPartnerBankAccounts,
  createPartnerTransfer,
  updateTransferStatus,
  getPartnerTransfers,
  calculatePartnerRevenue,
  validateBankAccountData
};

export default partnerAccountAPI;