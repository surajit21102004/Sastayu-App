import { Platform } from 'react-native';
import Constants from 'expo-constants';

// In Expo Go on mobile, localhost points to the phone itself.
// We dynamically resolve the computer's local Wi-Fi IP from the Expo bundler host,
// with a fallback to the active development IP (192.168.0.102).
const getDevHostIp = () => {
  try {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      Constants.manifest2?.extra?.expoGo?.debuggerHost ||
      Constants.manifest?.debuggerHost;

    if (hostUri) {
      const ip = hostUri.split(':')[0];
      if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
        return ip;
      }
    }
  } catch (e) {
    // ignore
  }
  return '192.168.0.102';
};

const LOCAL_IP = getDevHostIp();
const PORT = '5000';

export const API_BASE_URL = Platform.select({
  web: `http://localhost:${PORT}/api`,
  default: `http://${LOCAL_IP}:${PORT}/api`,
});

console.log('[API] Connected to Sastayu Backend at:', API_BASE_URL);

/**
 * Helper to make HTTP requests with timeout and error handling
 */
async function apiRequest(endpoint, method = 'GET', data = null, token = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const options = {
    method,
    headers,
  };

  if (data && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
    options.body = JSON.stringify(data);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    options.signal = controller.signal;

    const res = await fetch(url, options);
    clearTimeout(timeoutId);

    const json = await res.json();
    return json;
  } catch (err) {
    console.warn(`[API ERROR] ${method} ${endpoint}:`, err.message);
    return {
      success: false,
      message: err.name === 'AbortError' ? 'Request timed out' : err.message,
      isOffline: true,
    };
  }
}

// 1. Auth APIs
export const authAPI = {
  customerSendOtp: async (phone) => {
    return await apiRequest('/auth/customer/send-otp', 'POST', { phone });
  },
  customerVerifyOtp: async (phone, otp) => {
    return await apiRequest('/auth/customer/verify-otp', 'POST', { phone, otp });
  },
  customerSetupProfile: async (profileData, token) => {
    return await apiRequest('/auth/customer/setup-profile', 'POST', profileData, token);
  },
  workerLogin: async (phone, otp = '1234', trade = 'Electrician') => {
    return await apiRequest('/auth/worker/login', 'POST', { phone, otp, trade });
  },
  workerRegister: async (phone, name, trade) => {
    return await apiRequest('/auth/worker/register', 'POST', { phone, name, trade });
  },
  workerSetupProfile: async (profileData, token) => {
    return await apiRequest('/auth/worker/setup-profile', 'POST', profileData, token);
  },
  getMe: async (token) => {
    return await apiRequest('/auth/me', 'GET', null, token);
  },
};

// 2. Bookings APIs
export const bookingsAPI = {
  getBookings: async (status, token) => {
    const query = status ? `?status=${status}` : '';
    return await apiRequest(`/bookings${query}`, 'GET', null, token);
  },
  getBookingById: async (id, token) => {
    return await apiRequest(`/bookings/${id}`, 'GET', null, token);
  },
  createBooking: async (bookingData, token) => {
    return await apiRequest('/bookings', 'POST', bookingData, token);
  },
  updateStatus: async (id, status, extraData = {}, token) => {
    return await apiRequest(`/bookings/${id}/status`, 'PATCH', { status, ...extraData }, token);
  },
  declineBooking: async (id, reason = 'Declined by technician', token) => {
    return await apiRequest(`/bookings/${id}/decline`, 'POST', { reason }, token);
  },
  completeBooking: async (id, otp, repairCharge, token) => {
    return await apiRequest(`/bookings/${id}/complete`, 'POST', { otp, repairCharge }, token);
  },
  counterPrice: async (id, counterPrice, counterNote, token) => {
    return await apiRequest(`/bookings/${id}/counter-price`, 'POST', { counterPrice, counterNote }, token);
  },
  acceptProposedPrice: async (id, token) => {
    return await apiRequest(`/bookings/${id}/accept-price`, 'POST', {}, token);
  },
  respondToCounter: async (id, action, token) => {
    return await apiRequest(`/bookings/${id}/respond-counter`, 'POST', { action }, token);
  },
  liveSync: async (params = {}, token) => {
    const q = new URLSearchParams(params).toString();
    const query = q ? `?${q}` : '';
    return await apiRequest(`/bookings/live-sync${query}`, 'GET', null, token);
  },
  rateBooking: async (id, rating, tags, comment, token) => {
    return await apiRequest(`/bookings/${id}/rate`, 'POST', { rating, tags, comment }, token);
  },
  confirmPayment: async (id, paymentMode, amount, transactionId, token) => {
    return await apiRequest(`/bookings/${id}/pay`, 'POST', { paymentMode, amount, transactionId }, token);
  },
  acceptJaldi: async (id, workerId, token) => {
    return await apiRequest(`/bookings/${id}/accept-jaldi`, 'POST', { workerId }, token);
  },
};

// 3. Worker Partner APIs
export const workersAPI = {
  getNearby: async (trade, lat, lng, emergency) => {
    const params = new URLSearchParams();
    if (trade) params.append('trade', trade);
    if (lat) params.append('lat', lat);
    if (lng) params.append('lng', lng);
    if (emergency) params.append('emergency', 'true');
    const query = params.toString() ? `?${params.toString()}` : '';
    return await apiRequest(`/workers/nearby${query}`, 'GET');
  },
  getDashboard: async (token) => {
    return await apiRequest('/workers/dashboard', 'GET', null, token);
  },
  toggleStatus: async (isOnline, token) => {
    return await apiRequest('/workers/status', 'PATCH', { isOnline }, token);
  },
  getEarnings: async (period = 'today', startDate, endDate, token) => {
    let query = `?period=${period}`;
    if (startDate && endDate) {
      query += `&startDate=${startDate}&endDate=${endDate}`;
    }
    return await apiRequest(`/workers/earnings${query}`, 'GET', null, token);
  },
};

// 4. Disputes APIs
export const disputesAPI = {
  reportExtraCharge: async (disputeData, token) => {
    return await apiRequest('/disputes/report-extra', 'POST', disputeData, token);
  },
  getMyDisputes: async (token) => {
    return await apiRequest('/disputes', 'GET', null, token);
  },
};

// 5. Services Catalog APIs
export const servicesAPI = {
  getServices: async (category) => {
    const query = category ? `?category=${category}` : '';
    return await apiRequest(`/services${query}`, 'GET');
  },
  getCategories: async () => {
    return await apiRequest('/services/categories', 'GET');
  },
};

// 6. Admin Portal APIs (Prompt 5)
export const adminAPI = {
  getOverview: async (token) => {
    return await apiRequest('/admin/overview', 'GET', null, token);
  },
  getUsers: async (search = '', token) => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return await apiRequest(`/admin/users${query}`, 'GET', null, token);
  },
  updateUserStatus: async (id, role, token) => {
    return await apiRequest(`/admin/users/${id}/status`, 'PATCH', { role }, token);
  },
  getWorkers: async (search = '', token) => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return await apiRequest(`/admin/workers${query}`, 'GET', null, token);
  },
  updateWorkerStatus: async (id, status, token) => {
    return await apiRequest(`/admin/workers/${id}/status`, 'PATCH', { status }, token);
  },
  getWorkerEarnings: async (period = 'today', token) => {
    return await apiRequest(`/admin/worker-earnings?period=${period}`, 'GET', null, token);
  },
  settlePayout: async (payload, token) => {
    return await apiRequest('/admin/settle-payout', 'POST', payload, token);
  },
  getPayouts: async (token) => {
    return await apiRequest('/admin/payouts', 'GET', null, token);
  },
};

// 7. Worker Coin Wallet & Razorpay API
export const walletAPI = {
  getBalance: async (workerId, token) => {
    const q = workerId ? `?workerId=${workerId}` : '';
    return await apiRequest(`/wallet/balance${q}`, 'GET', null, token);
  },
  directRecharge: async (data, token) => {
    return await apiRequest('/wallet/direct-recharge', 'POST', data, token);
  },
  createRechargeOrder: async (packageId, amount, workerId, token) => {
    return await apiRequest('/wallet/create-recharge-order', 'POST', { packageId, amount, workerId }, token);
  },
  verifyRecharge: async (data, token) => {
    return await apiRequest('/wallet/verify-recharge', 'POST', data, token);
  },
  getTransactions: async (workerId, token) => {
    const q = workerId ? `?workerId=${workerId}` : '';
    return await apiRequest(`/wallet/transactions${q}`, 'GET', null, token);
  },
};


