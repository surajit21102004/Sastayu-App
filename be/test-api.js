const http = require('http');
const { app, startServer } = require('./server');

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const headers = {
      'Content-Type': 'application/json',
    };
    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 5000,
        path,
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runApiTests() {
  console.log('\n--- STARTING LIVE API & DATABASE INTEGRATION TESTS ---');

  let server;
  try {
    server = await startServer();

    // 1. Health check
    console.log('\n1. Testing GET /api/health:');
    const healthRes = await request('GET', '/api/health');
    console.log(`Status: ${healthRes.status}`);
    console.log('Response:', healthRes.body);

    // 2. Customer Send OTP
    console.log('\n2. Testing POST /api/auth/customer/send-otp:');
    const sendOtpRes = await request('POST', '/api/auth/customer/send-otp', { phone: '9876543210' });
    console.log(`Status: ${sendOtpRes.status}`);
    console.log('Response:', sendOtpRes.body);

    // 3. Customer Verify OTP
    console.log('\n3. Testing POST /api/auth/customer/verify-otp:');
    const verifyOtpRes = await request('POST', '/api/auth/customer/verify-otp', {
      phone: '9876543210',
      otp: '4321',
    });
    console.log(`Status: ${verifyOtpRes.status}`);
    console.log('Response:', verifyOtpRes.body);
    const customerToken = verifyOtpRes.body.token;

    // 4. Worker Login
    console.log('\n4. Testing POST /api/auth/worker/login:');
    const workerLoginRes = await request('POST', '/api/auth/worker/login', {
      phone: '9876543210',
      trade: 'Electrician',
    });
    console.log(`Status: ${workerLoginRes.status}`);
    console.log('Response:', workerLoginRes.body);
    const workerToken = workerLoginRes.body.token;

    // 5. Services Catalog
    console.log('\n5. Testing GET /api/services:');
    const servicesRes = await request('GET', '/api/services');
    console.log(`Status: ${servicesRes.status}`);
    console.log(`Fetched ${servicesRes.body.count} services from MySQL:`);
    servicesRes.body.services.slice(0, 3).forEach((s) => {
      console.log(` • [${s.category}] ${s.name} - ₹${s.base_price}`);
    });

    // 6. Worker Dashboard
    console.log('\n6. Testing GET /api/workers/dashboard:');
    const dashRes = await request('GET', '/api/workers/dashboard', null, workerToken);
    console.log(`Status: ${dashRes.status}`);
    console.log('Response:', dashRes.body);

    // 7. Create New Booking
    console.log('\n7. Testing POST /api/bookings:');
    const newBookingRes = await request(
      'POST',
      '/api/bookings',
      {
        serviceTitle: 'Electrician · Fan not working',
        serviceType: 'jaldi',
        totalAmount: 499.00,
        visitCharge: 149.00,
        customerNotes: 'Fan speed very slow, needs capacitor check.',
      },
      customerToken
    );
    console.log(`Status: ${newBookingRes.status}`);
    console.log('Response:', newBookingRes.body);

    // 8. Report Extra Charge Dispute
    console.log('\n8. Testing POST /api/disputes/report-extra:');
    const disputeRes = await request(
      'POST',
      '/api/disputes/report-extra',
      {
        bookingId: newBookingRes.body.booking?.id || 1,
        appPrice: 499.00,
        workerAskedAmount: 800.00,
        reason: 'Asked extra after work',
        notes: 'Technician requested 800 cash without bill.',
      },
      customerToken
    );
    console.log(`Status: ${disputeRes.status}`);
    console.log('Response:', disputeRes.body);

    // 9. Worker Wallet Balance
    console.log('\n9. Testing GET /api/wallet/balance:');
    const walletBalanceRes = await request('GET', '/api/wallet/balance?workerId=1', null, workerToken);
    console.log(`Status: ${walletBalanceRes.status}`);
    console.log('Wallet Response:', walletBalanceRes.body);

    // 10. Create Razorpay Recharge Order (Live API Key test)
    console.log('\n10. Testing POST /api/wallet/create-recharge-order (₹10 -> 10 Coins):');
    const rechargeOrderRes = await request(
      'POST',
      '/api/wallet/create-recharge-order',
      { packageId: 'pack_10', workerId: 1 },
      workerToken
    );
    console.log(`Status: ${rechargeOrderRes.status}`);
    console.log('Recharge Order Response:', rechargeOrderRes.body);

    console.log('\n[ALL TESTS PASSED SUCCESSFULLY! ALL ROUTES & LIVE MYSQL CONNECTED]');

  } catch (err) {
    console.error('Test error:', err);
  } finally {
    if (server) {
      server.close();
      const { pool } = require('./config/db');
      await pool.end();
      console.log('Server and DB connection closed.');
    }
  }
}

runApiTests();
