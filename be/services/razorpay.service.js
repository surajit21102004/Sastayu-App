const Razorpay = require('razorpay');
const { validatePaymentVerification } = require('razorpay/dist/utils/razorpay-utils');
const crypto = require('crypto');

// Standard coin packages requested by user:
// 10 Rs -> 10 Coins
// 50 Rs -> 60 Coins
// 100 Rs -> 200 Coins
const COIN_PACKAGES = [
  {
    id: 'pack_10',
    amount: 10,
    coins: 10,
    label: 'Starter 10',
    badge: 'Basic',
    bonusCoins: 0,
    perCoinRate: '₹1.00 / coin',
  },
  {
    id: 'pack_50',
    amount: 50,
    coins: 60,
    label: 'Booster 60',
    badge: '+10 Bonus Coins',
    bonusCoins: 10,
    perCoinRate: '₹0.83 / coin',
  },
  {
    id: 'pack_100',
    amount: 100,
    coins: 200,
    label: 'Super Saver 200',
    badge: '🔥 BEST VALUE (+100 Bonus)',
    bonusCoins: 100,
    isPopular: true,
    perCoinRate: '₹0.50 / coin',
  },
  {
    id: 'pack_250',
    amount: 250,
    coins: 550,
    label: 'Pro Partner 550',
    badge: '+300 Bonus Coins',
    bonusCoins: 300,
    perCoinRate: '₹0.45 / coin',
  },
  {
    id: 'pack_500',
    amount: 500,
    coins: 1200,
    label: 'Mega Partner 1200',
    badge: '👑 MAX VALUE (+700 Bonus)',
    bonusCoins: 700,
    perCoinRate: '₹0.41 / coin',
  },
];

class RazorpayService {
  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || 'rzp_live_TorXMuZgyrLhzC';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || 'zYGeMp15f7wMlhxvecUYb0TK';

    // Official Razorpay SDK Instance
    this.instance = new Razorpay({
      key_id: this.keyId,
      key_secret: this.keySecret,
    });
  }

  getInstance() {
    return this.instance;
  }

  getKeyId() {
    return this.keyId;
  }

  getPackages() {
    return COIN_PACKAGES;
  }

  getPackageById(packageId) {
    return COIN_PACKAGES.find((p) => p.id === packageId) || null;
  }

  getPackageByAmount(amount) {
    const num = Number(amount);
    const exact = COIN_PACKAGES.find((p) => p.amount === num);
    if (exact) return exact;

    // Default 1:1 if custom amount
    return {
      id: `custom_${num}`,
      amount: num,
      coins: num,
      label: `Custom ₹${num}`,
      badge: 'Direct Recharge',
      bonusCoins: 0,
    };
  }

  /**
   * Create Razorpay Order via Official SDK
   * @param {Object} options { amount: in Rupees, receipt: string, notes: Object }
   */
  async createOrder({ amount, receipt, notes = {} }) {
    const amountInPaise = Math.round(Number(amount) * 100);

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: receipt || `rec_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      notes: {
        platform: 'Sastayu Technician Wallet',
        ...notes,
      },
    };

    try {
      const order = await this.instance.orders.create(options);
      return order;
    } catch (err) {
      console.error('[Razorpay SDK Order Error]', err);
      throw err;
    }
  }

  /**
   * Verify Razorpay payment signature via Official SDK
   * @param {string} orderId
   * @param {string} paymentId
   * @param {string} signature
   */
  verifyPaymentSignature(orderId, paymentId, signature) {
    if (!orderId || !paymentId || !signature) {
      return false;
    }

    try {
      return validatePaymentVerification(
        { order_id: orderId, payment_id: paymentId },
        signature,
        this.keySecret
      );
    } catch (err) {
      const expectedSignature = crypto
        .createHmac('sha256', this.keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');
      return expectedSignature === signature;
    }
  }
}

module.exports = new RazorpayService();
