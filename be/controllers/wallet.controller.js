const { pool } = require('../config/db');
const razorpayService = require('../services/razorpay.service');
const liveEvents = require('../services/liveEvents');

const OVERDRAFT_LIMIT = -50; // Maximum allowed negative coin balance

/**
 * Get Worker Wallet Balance, Free Bookings Status & Packages
 * GET /api/wallet/balance
 */
async function getWalletBalance(req, res, next) {
  try {
    let workerId = req.user ? req.user.id : (req.query.workerId ? Number(req.query.workerId) : null);

    let rows = [];
    if (workerId) {
      const [wRows] = await pool.execute(
        `SELECT id, name, phone, trade, coin_balance, free_bookings_used, total_jobs
         FROM workers WHERE id = ?`,
        [workerId]
      );
      rows = wRows;
    }

    if (rows.length === 0) {
      // Graceful fallback to first worker if requested ID is not found
      const [fallbackRows] = await pool.execute(
        `SELECT id, name, phone, trade, coin_balance, free_bookings_used, total_jobs
         FROM workers ORDER BY id ASC LIMIT 1`
      );
      rows = fallbackRows;
    }

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Worker profile not found.' });
    }

    const worker = rows[0];
    const coinBalance = Number(worker.coin_balance) || 0;
    const freeUsed = Number(worker.free_bookings_used) || 0;
    const freeRemaining = Math.max(0, 2 - freeUsed);

    // Fetch recent wallet transactions
    const [transactions] = await pool.execute(
      `SELECT * FROM worker_wallet_transactions
       WHERE worker_id = ?
       ORDER BY id DESC LIMIT 20`,
      [worker.id]
    );

    const canAcceptBooking = freeRemaining > 0 || coinBalance > OVERDRAFT_LIMIT;

    return res.status(200).json({
      success: true,
      workerId: worker.id,
      workerName: worker.name,
      coinBalance,
      overdraftLimit: OVERDRAFT_LIMIT,
      freeTier: {
        totalFreeAllowed: 2,
        freeBookingsUsed: freeUsed,
        freeBookingsRemaining: freeRemaining,
        isActive: freeRemaining > 0,
      },
      canAcceptBooking,
      isOverdraft: coinBalance < 0,
      isLimitReached: coinBalance <= OVERDRAFT_LIMIT,
      packages: razorpayService.getPackages(),
      razorpayKeyId: razorpayService.getKeyId(),
      recentTransactions: transactions,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Create Razorpay Order for Wallet Coin Recharge
 * POST /api/wallet/create-recharge-order
 */
async function createRechargeOrder(req, res, next) {
  try {
    const workerId = req.user ? req.user.id : (req.body.workerId ? Number(req.body.workerId) : 1);
    const { packageId, amount: customAmount } = req.body;

    let packageData = null;
    if (packageId) {
      packageData = razorpayService.getPackageById(packageId);
    }

    if (!packageData && customAmount) {
      packageData = razorpayService.getPackageByAmount(customAmount);
    }

    if (!packageData) {
      return res.status(400).json({
        success: false,
        message: 'Invalid recharge package or amount. Please select ₹10, ₹50, or ₹100.',
      });
    }

    const [wRows] = await pool.execute('SELECT id, name, phone FROM workers WHERE id = ?', [workerId]);
    const worker = wRows[0] || { name: 'Technician', phone: '' };

    // Create real Razorpay order
    const order = await razorpayService.createOrder({
      amount: packageData.amount,
      receipt: `wrecharge_${workerId}_${Date.now()}`,
      notes: {
        workerId: String(workerId),
        packageId: packageData.id,
        coinsAwarded: String(packageData.coins),
        workerPhone: worker.phone || '',
      },
    });

    return res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount, // in paise
      amountRupees: packageData.amount,
      coins: packageData.coins,
      bonusCoins: packageData.bonusCoins || 0,
      currency: order.currency,
      package: packageData,
      keyId: razorpayService.getKeyId(),
      worker: {
        id: workerId,
        name: worker.name,
        phone: worker.phone,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Verify Razorpay Payment and Credit Coins to Worker Wallet
 * POST /api/wallet/verify-recharge
 */
async function verifyRecharge(req, res, next) {
  try {
    const workerId = req.user ? req.user.id : (req.body.workerId ? Number(req.body.workerId) : 1);
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      packageId,
      coins: requestedCoins,
      amount: requestedAmount,
    } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId) {
      return res.status(400).json({
        success: false,
        message: 'Missing Razorpay order or payment details.',
      });
    }

    // Verify cryptographic signature if provided
    if (razorpaySignature) {
      const isValid = razorpayService.verifyPaymentSignature(
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature
      );

      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payment signature. Verification failed.',
        });
      }
    }

    // Determine coins to credit
    let coinsToCredit = 0;
    let amountPaid = 0;

    const pkg = razorpayService.getPackageById(packageId);
    if (pkg) {
      coinsToCredit = pkg.coins;
      amountPaid = pkg.amount;
    } else {
      coinsToCredit = Number(requestedCoins) || Number(requestedAmount) || 10;
      amountPaid = Number(requestedAmount) || 10;
    }

    // Get current balance
    const [wRows] = await pool.execute('SELECT coin_balance FROM workers WHERE id = ?', [workerId]);
    if (wRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Worker not found.' });
    }

    const currentBalance = Number(wRows[0].coin_balance) || 0;
    const newBalance = currentBalance + coinsToCredit;

    // Credit coins in workers table
    await pool.execute(
      'UPDATE workers SET coin_balance = ? WHERE id = ?',
      [newBalance, workerId]
    );

    // Record transaction
    const [txResult] = await pool.execute(
      `INSERT INTO worker_wallet_transactions
       (worker_id, type, coins, balance_after, amount_paid, razorpay_order_id, razorpay_payment_id, description)
       VALUES (?, 'recharge', ?, ?, ?, ?, ?, ?)`,
      [
        workerId,
        coinsToCredit,
        newBalance,
        amountPaid,
        razorpayOrderId,
        razorpayPaymentId,
        `Wallet Recharge: Added ${coinsToCredit} Coins (₹${amountPaid})`,
      ]
    );

    // Broadcast LIVE event so worker app updates UI instantly
    liveEvents.broadcast('WALLET_UPDATED', {
      workerId: Number(workerId),
      coinBalance: newBalance,
      deltaCoins: coinsToCredit,
      type: 'recharge',
      description: `Recharged ₹${amountPaid} for ${coinsToCredit} Coins`,
    });

    return res.status(200).json({
      success: true,
      message: `Recharge successful! ${coinsToCredit} Coins added to your wallet.`,
      coinBalance: newBalance,
      coinsAdded: coinsToCredit,
      amountPaid,
      transactionId: txResult.insertId,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Direct Wallet Coin Recharge (Instant Simple Mode)
 * POST /api/wallet/direct-recharge
 */
async function directRecharge(req, res, next) {
  try {
    let workerId = req.user ? req.user.id : (req.body.workerId ? Number(req.body.workerId) : null);
    const { packageId, amount: reqAmount, coins: reqCoins } = req.body;

    let coinsToCredit = 0;
    let amountPaid = 0;

    const pkg = razorpayService.getPackageById(packageId);
    if (pkg) {
      coinsToCredit = pkg.coins;
      amountPaid = pkg.amount;
    } else {
      coinsToCredit = Number(reqCoins) || Number(reqAmount) || 10;
      amountPaid = Number(reqAmount) || 10;
    }

    // Get current balance
    let wRows = [];
    if (workerId) {
      const [rows] = await pool.execute('SELECT id, name, coin_balance FROM workers WHERE id = ?', [workerId]);
      wRows = rows;
    }

    if (!wRows || wRows.length === 0) {
      const [fallbackRows] = await pool.execute('SELECT id, name, coin_balance FROM workers ORDER BY id ASC LIMIT 1');
      wRows = fallbackRows;
    }

    if (wRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Worker not found.' });
    }

    const worker = wRows[0];
    const currentBalance = Number(worker.coin_balance) || 0;
    const newBalance = currentBalance + coinsToCredit;

    // Credit coins in workers table
    await pool.execute(
      'UPDATE workers SET coin_balance = ? WHERE id = ?',
      [newBalance, worker.id]
    );

    // Record transaction
    const [txResult] = await pool.execute(
      `INSERT INTO worker_wallet_transactions
       (worker_id, type, coins, balance_after, amount_paid, razorpay_order_id, razorpay_payment_id, description)
       VALUES (?, 'recharge', ?, ?, ?, ?, ?, ?)`,
      [
        worker.id,
        coinsToCredit,
        newBalance,
        amountPaid,
        `direct_${Date.now()}`,
        `wallet_direct_${Date.now()}`,
        `Wallet Recharge: +${coinsToCredit} Coins (₹${amountPaid})`,
      ]
    );

    // Broadcast LIVE event so worker app updates UI instantly
    liveEvents.broadcast('WALLET_UPDATED', {
      workerId: Number(worker.id),
      coinBalance: newBalance,
      deltaCoins: coinsToCredit,
      type: 'recharge',
      description: `Recharged ₹${amountPaid} for ${coinsToCredit} Coins`,
    });

    return res.status(200).json({
      success: true,
      message: `Recharge successful! +${coinsToCredit} Coins added to your wallet.`,
      coinBalance: newBalance,
      coinsAdded: coinsToCredit,
      amountPaid,
      transactionId: txResult.insertId,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Hosted Razorpay Mobile/Web Checkout Page
 * GET /api/wallet/checkout-page
 */
async function renderCheckoutPage(req, res, next) {
  try {
    const orderId = String(req.query.orderId || '').replace(/[^a-zA-Z0-9_-]/g, '');
    const packageId = String(req.query.packageId || 'pack_100').replace(/[^a-zA-Z0-9_-]/g, '');
    const coins = Number(req.query.coins) || 200;
    const amount = Number(req.query.amount) || 100;
    const workerId = Number(req.query.workerId) || 4;
    const workerName = String(req.query.name || 'Technician').replace(/[<>&"]/g, '');
    const workerPhone = String(req.query.phone || '9876543210').replace(/[^0-9+]/g, '');
    const keyId = razorpayService.getKeyId();

    if (!orderId) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><title>Invalid Order</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
        <body style="font-family:sans-serif;background:#0F172A;color:#fff;text-align:center;padding:40px 20px;">
          <h2>❌ Missing Order ID</h2>
          <p>Please initiate recharge from the Sastayu App.</p>
          <a href="sastayu://" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#0284C7;color:#fff;text-decoration:none;border-radius:10px;font-weight:bold;">Return to App</a>
        </body>
        </html>
      `);
    }

    // Relax CSP headers for Razorpay's iframe and checkout script
    res.setHeader(
      'Content-Security-Policy',
      "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval'; frame-src *; connect-src *;"
    );

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Sastayu Partner Wallet Recharge • Razorpay</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background-color: #0B0F19; color: #F8FAFC; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 16px; }
    .card { background: #111827; border: 1px solid #1F2937; border-radius: 20px; width: 100%; max-width: 440px; padding: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); text-align: center; }
    .brand-row { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 20px; }
    .brand-logo { width: 44px; height: 44px; border-radius: 12px; background: #0284C7; display: flex; align-items: center; justify-content: center; font-size: 24px; }
    .brand-title { font-size: 20px; font-weight: 800; color: #FFFFFF; letter-spacing: 0.5px; }
    .brand-sub { font-size: 11px; color: #94A3B8; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
    .coin-badge { background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: #000; font-weight: 800; font-size: 14px; padding: 6px 14px; border-radius: 20px; display: inline-flex; align-items: center; gap: 6px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(245,158,11,0.3); }
    .plan-box { background: #1F2937; border-radius: 14px; padding: 18px; margin-bottom: 24px; text-align: left; }
    .plan-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
    .plan-row:last-child { margin-bottom: 0; padding-top: 10px; border-top: 1px dashed #374151; }
    .plan-label { color: #9CA3AF; font-size: 13px; font-weight: 500; }
    .plan-val { color: #F9FAFB; font-size: 14px; font-weight: 700; }
    .plan-price { color: #38BDF8; font-size: 22px; font-weight: 900; }
    .btn-pay { width: 100%; background: #0284C7; color: #FFFFFF; border: none; padding: 16px; border-radius: 14px; font-size: 16px; font-weight: 800; cursor: pointer; transition: all 0.2s; box-shadow: 0 10px 20px rgba(2,132,199,0.35); display: flex; align-items: center; justify-content: center; gap: 8px; }
    .btn-pay:hover { background: #0369A1; }
    .btn-pay:active { transform: scale(0.98); }
    .btn-secondary { width: 100%; background: transparent; color: #94A3B8; border: 1px solid #374151; padding: 12px; border-radius: 12px; font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 12px; }
    .gateway-footer { margin-top: 24px; display: flex; align-items: center; justify-content: center; gap: 6px; color: #64748B; font-size: 12px; font-weight: 600; }
    
    /* Overlay for loading/success */
    .status-overlay { display: none; margin-top: 20px; }
    .spinner { width: 40px; height: 40px; border: 4px solid #1F2937; border-top-color: #38BDF8; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .success-check { width: 64px; height: 64px; background: #10B981; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36px; margin: 0 auto 16px; color: white; animation: pop 0.4s ease-out; }
    @keyframes pop { from { transform: scale(0.5); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  </style>
</head>
<body>
  <div class="card" id="mainCard">
    <div class="brand-row">
      <div class="brand-logo">⚡</div>
      <div style="text-align: left;">
        <div class="brand-title">Sastayu Partner</div>
        <div class="brand-sub">Coin Wallet Recharge</div>
      </div>
    </div>

    <div class="coin-badge">
      🪙 +${coins} Wallet Coins
    </div>

    <div class="plan-box">
      <div class="plan-row">
        <span class="plan-label">Technician:</span>
        <span class="plan-val">${workerName}</span>
      </div>
      <div class="plan-row">
        <span class="plan-label">Razorpay Order:</span>
        <span class="plan-val" style="font-family: monospace; font-size: 12px;">${orderId}</span>
      </div>
      <div class="plan-row">
        <span class="plan-label">Total Coins Credited:</span>
        <span class="plan-val" style="color:#F59E0B;">+${coins} Coins</span>
      </div>
      <div class="plan-row">
        <span class="plan-label">Amount Payable:</span>
        <span class="plan-price">₹${amount}</span>
      </div>
    </div>

    <div id="actionArea">
      <button class="btn-pay" id="payButton" onclick="openRazorpayCheckout()">
        🔒 Pay ₹${amount} with Razorpay
      </button>
      <button class="btn-secondary" onclick="returnToApp('cancelled')">
        Cancel & Return to App
      </button>
    </div>

    <div id="statusArea" class="status-overlay">
      <div class="spinner" id="statusSpinner"></div>
      <div id="statusTitle" style="font-size: 17px; font-weight: 700; margin-bottom: 6px;">Opening Razorpay Gateway...</div>
      <div id="statusSub" style="font-size: 13px; color: #94A3B8;">Select UPI, Card, or NetBanking to complete payment</div>
      <div id="returnBtnContainer" style="display: none; margin-top: 16px;">
        <button class="btn-pay" style="background:#10B981;" onclick="returnToApp('success')">
          ✓ Return to Sastayu App
        </button>
      </div>
    </div>

    <div class="gateway-footer">
      <span>🛡️ Razorpay Live Gateway (rzp_live_TorXMuZgyrLhzC)</span>
    </div>
  </div>

  <script>
    const orderData = {
      key: '${keyId}',
      amount: ${amount * 100},
      currency: 'INR',
      name: 'Sastayu Home Services',
      description: '${coins} Coins Technician Wallet Recharge',
      order_id: '${orderId}',
      image: 'https://cdn-icons-png.flaticon.com/512/924/924514.png',
      prefill: {
        name: '${workerName}',
        contact: '${workerPhone}'
      },
      theme: {
        color: '#0284C7'
      }
    };

    let rzpInstance = null;

    function openRazorpayCheckout() {
      document.getElementById('actionArea').style.display = 'none';
      document.getElementById('statusArea').style.display = 'block';
      document.getElementById('statusSpinner').style.display = 'block';
      document.getElementById('statusTitle').innerText = 'Processing with Razorpay...';
      document.getElementById('statusSub').innerText = 'Please complete the payment in the Razorpay window';

      const options = {
        ...orderData,
        handler: async function (response) {
          document.getElementById('statusTitle').innerText = 'Verifying Payment...';
          document.getElementById('statusSub').innerText = 'Cryptographically confirming with Razorpay & crediting coins...';
          
          try {
            const verifyRes = await fetch('/api/wallet/verify-recharge', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                workerId: ${workerId},
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                packageId: '${packageId}',
                coins: ${coins},
                amount: ${amount}
              })
            });

            const data = await verifyRes.json();
            if (data.success) {
              document.getElementById('statusSpinner').style.display = 'none';
              document.getElementById('statusArea').innerHTML = \`
                <div class="success-check">✓</div>
                <div style="font-size: 20px; font-weight: 800; color: #10B981; margin-bottom: 8px;">Recharge Successful!</div>
                <div style="font-size: 15px; font-weight: 700; color: #F59E0B; margin-bottom: 6px;">+${coins} Coins Credited</div>
                <div style="font-size: 13px; color: #94A3B8; margin-bottom: 18px;">New Balance: \${data.coinBalance} Coins<br><span style="font-family: monospace; font-size: 11px;">Payment ID: \${response.razorpay_payment_id}</span></div>
                <button class="btn-pay" style="background:#10B981;" onclick="returnToApp('success', \${data.coinBalance})">
                  Return to Sastayu App
                </button>
              \`;

              // Auto redirect back to Expo App
              setTimeout(() => {
                returnToApp('success', data.coinBalance);
              }, 1200);
            } else {
              showError(data.message || 'Verification failed. Please contact support.');
            }
          } catch (err) {
            showError('Payment received but verification check had an error: ' + err.message);
          }
        },
        modal: {
          ondismiss: function () {
            document.getElementById('statusSpinner').style.display = 'none';
            document.getElementById('statusTitle').innerText = 'Payment Incomplete';
            document.getElementById('statusSub').innerText = 'You closed the Razorpay payment window without completing.';
            document.getElementById('actionArea').style.display = 'block';
            document.getElementById('payButton').innerText = '🔄 Try Razorpay Payment Again';
          }
        }
      };

      rzpInstance = new Razorpay(options);
      rzpInstance.on('payment.failed', function (res) {
        showError(res.error?.description || 'Payment failed or was declined.');
      });
      rzpInstance.open();
    }

    function showError(msg) {
      document.getElementById('statusSpinner').style.display = 'none';
      document.getElementById('statusTitle').innerText = 'Payment Not Completed';
      document.getElementById('statusTitle').style.color = '#EF4444';
      document.getElementById('statusSub').innerText = msg;
      document.getElementById('actionArea').style.display = 'block';
      document.getElementById('payButton').innerText = '🔄 Retry Razorpay Payment';
    }

    function returnToApp(status, newBal) {
      const targetBal = newBal !== undefined ? newBal : '';
      const appUrl = 'sastayu://wallet-recharge-result?status=' + status + '&coins=${coins}&balance=' + targetBal + '&orderId=${orderId}';
      window.location.href = appUrl;
      setTimeout(() => {
        // Fallback if deep link doesn't auto-close
        window.close();
      }, 500);
    }

    // Auto-launch Razorpay Checkout after 400ms for seamless user experience
    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        try {
          openRazorpayCheckout();
        } catch (e) {
          console.warn('Auto-launch failed, user can tap button:', e);
        }
      }, 400);
    });
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  } catch (err) {
    next(err);
  }
}

/**
 * Get Worker Wallet Transactions History
 * GET /api/wallet/transactions
 */
async function getTransactions(req, res, next) {
  try {
    const workerId = req.user ? req.user.id : (req.query.workerId ? Number(req.query.workerId) : 1);

    const [rows] = await pool.execute(
      `SELECT * FROM worker_wallet_transactions
       WHERE worker_id = ?
       ORDER BY id DESC LIMIT 50`,
      [workerId]
    );

    return res.status(200).json({
      success: true,
      transactions: rows,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getWalletBalance,
  createRechargeOrder,
  verifyRecharge,
  directRecharge,
  renderCheckoutPage,
  getTransactions,
  OVERDRAFT_LIMIT,
};

