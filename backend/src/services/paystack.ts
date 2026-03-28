import axios from 'axios';

const PAYSTACK_BASE = 'https://api.paystack.co';
const SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';

const paystackAxios = axios.create({
  baseURL: PAYSTACK_BASE,
  headers: {
    Authorization: `Bearer ${SECRET_KEY}`,
    'Content-Type': 'application/json',
  },
});

export interface VirtualAccountResult {
  success: boolean;
  accountNumber?: string;
  bankName?: string;
  accountName?: string;
  bankCode?: string;
  reference?: string;
  error?: string;
}

export interface TransferResult {
  success: boolean;
  reference?: string;
  transferCode?: string;
  error?: string;
}

// Create a dedicated virtual account for a user (Paystack DVA)
export const createVirtualAccount = async (
  email: string,
  name: string,
  phone?: string
): Promise<VirtualAccountResult> => {
  try {
    // Step 1: Create a customer
    const customerRes = await paystackAxios.post('/customer', {
      email,
      first_name: name.split(' ')[0],
      last_name: name.split(' ').slice(1).join(' ') || name.split(' ')[0],
      phone: phone || '',
    });

    if (!customerRes.data.status) {
      return { success: false, error: customerRes.data.message };
    }

    const customerCode = customerRes.data.data.customer_code;

    // Step 2: Create a dedicated virtual account
    const dvaRes = await paystackAxios.post('/dedicated_account', {
      customer: customerCode,
      preferred_bank: 'wema-bank', // or 'access-bank'
    });

    if (!dvaRes.data.status) {
      return { success: false, error: dvaRes.data.message };
    }

    const dva = dvaRes.data.data;
    return {
      success: true,
      accountNumber: dva.account_number,
      bankName: dva.bank?.name || 'Wema Bank',
      accountName: dva.account_name,
      bankCode: dva.bank?.id?.toString() || '',
      reference: customerCode,
    };
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
    const message = axiosError?.response?.data?.message || axiosError?.message || 'Unknown error';
    console.error('Paystack createVirtualAccount error:', message);
    return { success: false, error: message };
  }
};

// Get wallet balance from Paystack DVA
export const getAccountBalance = async (accountNumber: string): Promise<{ success: boolean; balance?: number; error?: string }> => {
  try {
    const res = await paystackAxios.get(`/dedicated_account/${accountNumber}`);
    if (!res.data.status) {
      return { success: false, error: res.data.message };
    }
    return { success: true, balance: res.data.data.balance || 0 };
  } catch (error: unknown) {
    const axiosError = error as { message?: string };
    return { success: false, error: axiosError?.message || 'Unknown error' };
  }
};

// Create a transfer recipient
export const createTransferRecipient = async (
  name: string,
  accountNumber: string,
  bankCode: string
): Promise<{ success: boolean; recipientCode?: string; error?: string }> => {
  try {
    const res = await paystackAxios.post('/transferrecipient', {
      type: 'nuban',
      name,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: 'NGN',
    });

    if (!res.data.status) {
      return { success: false, error: res.data.message };
    }

    return { success: true, recipientCode: res.data.data.recipient_code };
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
    const message = axiosError?.response?.data?.message || axiosError?.message || 'Unknown error';
    return { success: false, error: message };
  }
};

// Initiate a transfer
export const initiateTransfer = async (
  amount: number,
  recipientCode: string,
  reason: string
): Promise<TransferResult> => {
  try {
    const res = await paystackAxios.post('/transfer', {
      source: 'balance',
      amount: amount * 100, // Paystack uses kobo
      recipient: recipientCode,
      reason,
    });

    if (!res.data.status) {
      return { success: false, error: res.data.message };
    }

    return {
      success: true,
      reference: res.data.data.reference,
      transferCode: res.data.data.transfer_code,
    };
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
    const message = axiosError?.response?.data?.message || axiosError?.message || 'Unknown error';
    return { success: false, error: message };
  }
};

// List all Nigerian banks
export const listBanks = async (): Promise<{ success: boolean; banks?: { name: string; code: string }[]; error?: string }> => {
  try {
    const res = await paystackAxios.get('/bank?country=nigeria&perPage=100');
    if (!res.data.status) {
      return { success: false, error: res.data.message };
    }
    return {
      success: true,
      banks: res.data.data.map((b: { name: string; code: string }) => ({ name: b.name, code: b.code })),
    };
  } catch (error: unknown) {
    const axiosError = error as { message?: string };
    return { success: false, error: axiosError?.message || 'Unknown error' };
  }
};

// Verify account number
export const verifyAccountNumber = async (
  accountNumber: string,
  bankCode: string
): Promise<{ success: boolean; accountName?: string; error?: string }> => {
  try {
    const res = await paystackAxios.get(
      `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`
    );
    if (!res.data.status) {
      return { success: false, error: res.data.message };
    }
    return { success: true, accountName: res.data.data.account_name };
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
    const message = axiosError?.response?.data?.message || axiosError?.message || 'Unknown error';
    return { success: false, error: message };
  }
};

// Initialize a payment (for subscriptions)
export const initializePayment = async (
  email: string,
  amountNaira: number,
  metadata: Record<string, unknown>
): Promise<{ success: boolean; authorizationUrl?: string; reference?: string; error?: string }> => {
  try {
    const res = await paystackAxios.post('/transaction/initialize', {
      email,
      amount: amountNaira * 100,
      metadata,
      callback_url: `${process.env.FRONTEND_URL}/subscription/verify`,
    });

    if (!res.data.status) {
      return { success: false, error: res.data.message };
    }

    return {
      success: true,
      authorizationUrl: res.data.data.authorization_url,
      reference: res.data.data.reference,
    };
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
    const message = axiosError?.response?.data?.message || axiosError?.message || 'Unknown error';
    return { success: false, error: message };
  }
};

// Verify a payment
export const verifyPayment = async (
  reference: string
): Promise<{ success: boolean; status?: string; amount?: number; metadata?: Record<string, unknown>; error?: string }> => {
  try {
    const res = await paystackAxios.get(`/transaction/verify/${reference}`);
    if (!res.data.status) {
      return { success: false, error: res.data.message };
    }
    return {
      success: true,
      status: res.data.data.status,
      amount: res.data.data.amount / 100,
      metadata: res.data.data.metadata,
    };
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
    const message = axiosError?.response?.data?.message || axiosError?.message || 'Unknown error';
    return { success: false, error: message };
  }
};
