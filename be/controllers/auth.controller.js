const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth.middleware');
const { formatWorkerPhoto } = require('../services/image.helper');

/**
 * Customer: Send OTP
 * POST /api/auth/customer/send-otp
 */
async function customerSendOtp(req, res, next) {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required.' });
    }

    const rawDigits = phone.replace(/\D/g, '');
    const isAdminNumber = rawDigits === '999999999' || rawDigits === '9999999999';
    const cleanPhone = isAdminNumber ? '999999999' : rawDigits.slice(-10);

    if (!isAdminNumber && cleanPhone.length !== 10) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number.' });
    }

    // Generate 4-digit OTP (1234 for test accounts, 9999 for Admin)
    const isTestNumber = cleanPhone === '8910710493' || cleanPhone === '9433554008';
    const generatedOtp = isAdminNumber ? '9999' : (isTestNumber ? '1234' : String(Math.floor(1000 + Math.random() * 9000)));
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store in MySQL otps table
    await pool.execute(
      `INSERT INTO otps (phone, otp, expires_at)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE otp = VALUES(otp), expires_at = VALUES(expires_at)`,
      [cleanPhone, generatedOtp, expiresAt]
    );

    console.log(`[AUTH] Generated live OTP for +91 ${cleanPhone}: ${generatedOtp}`);

    return res.status(200).json({
      success: true,
      message: isAdminNumber ? 'Admin authentication initialized.' : 'OTP sent successfully to registered mobile number.',
      otp: generatedOtp,
      isAdmin: isAdminNumber,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Customer / Admin: Verify OTP & Login
 * POST /api/auth/customer/verify-otp
 */
async function customerVerifyOtp(req, res, next) {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Phone and OTP are required.' });
    }

    const rawDigits = String(phone).replace(/\D/g, '');
    const isAdminNumber = rawDigits === '999999999' || rawDigits === '9999999999';
    const cleanPhone = isAdminNumber ? '999999999' : rawDigits.slice(-10);

    // Prompt 5: Admin Login with 999999999 & OTP 9999
    if (isAdminNumber && String(otp).trim() === '9999') {
      const token = jwt.sign(
        { id: 999999, phone: '999999999', role: 'admin', type: 'admin', name: 'Sastayu Super Admin' },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      return res.status(200).json({
        success: true,
        message: 'Welcome to Sastayu Executive Admin Portal.',
        token,
        role: 'admin',
        userType: 'admin',
        isProfileCompleted: true,
        user: {
          id: 999999,
          phone: '999999999',
          name: 'Sastayu Super Admin',
          role: 'admin',
          isProfileCompleted: true,
        },
      });
    }

    // Check stored OTP from MySQL
    const [otpRows] = await pool.execute('SELECT * FROM otps WHERE phone = ?', [cleanPhone]);
    const stored = otpRows[0];

    // Allow OTP 1234 for testing (especially for 8910710493 and 9433554008) or verified stored OTP
    const isTestNumber = cleanPhone === '8910710493' || cleanPhone === '9433554008';
    const isTestOtp = String(otp).trim() === '1234';
    const isValidOtp = (isTestNumber && isTestOtp) || isTestOtp || (stored && stored.otp === String(otp).trim() && Number(stored.expires_at) > Date.now());

    if (!isValidOtp) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP code. Use 1234 for testing.' });
    }

    // Clear used OTP from database if present
    if (stored) {
      await pool.execute('DELETE FROM otps WHERE phone = ?', [cleanPhone]);
    }

    // Query or create user in MySQL with clean defaults
    const [rows] = await pool.execute('SELECT * FROM users WHERE phone = ?', [cleanPhone]);

    let user;
    if (rows.length === 0) {
      const [insertResult] = await pool.execute(
        'INSERT INTO users (phone, name, role, is_profile_completed) VALUES (?, NULL, ?, FALSE)',
        [cleanPhone, 'customer']
      );
      const [newUser] = await pool.execute('SELECT * FROM users WHERE id = ?', [insertResult.insertId]);
      user = newUser[0];
    } else {
      user = rows[0];
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, phone: user.phone, role: user.role, type: 'customer' },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      isProfileCompleted: Boolean(user.is_profile_completed),
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        address: user.address,
        age: user.age,
        alternatePhone: user.alternate_phone,
        latitude: user.latitude,
        longitude: user.longitude,
        isProfileCompleted: Boolean(user.is_profile_completed),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Worker: Login / Register by Mobile Number & OTP
 * POST /api/auth/worker/login
 */
async function workerLogin(req, res, next) {
  try {
    const { phone, otp = '1234', trade = 'Electrician' } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Registered mobile number is required.' });
    }

    const rawDigits = String(phone).replace(/\D/g, '');
    const isAdminNumber = rawDigits === '999999999' || rawDigits === '9999999999';
    const cleanPhone = isAdminNumber ? '999999999' : rawDigits.slice(-10);

    // Prompt 5: Admin Login with 999999999 & OTP 9999
    if (isAdminNumber && String(otp).trim() === '9999') {
      const token = jwt.sign(
        { id: 999999, phone: '999999999', role: 'admin', type: 'admin', name: 'Sastayu Super Admin' },
        JWT_SECRET,
        { expiresIn: '30d' }
      );

      return res.status(200).json({
        success: true,
        message: 'Welcome to Sastayu Executive Admin Portal.',
        token,
        role: 'admin',
        userType: 'admin',
        isProfileCompleted: true,
        user: {
          id: 999999,
          phone: '999999999',
          name: 'Sastayu Super Admin',
          role: 'admin',
          isProfileCompleted: true,
        },
      });
    }

    // Verify OTP for worker (accept 1234 for testing)
    const [otpRows] = await pool.execute('SELECT * FROM otps WHERE phone = ?', [cleanPhone]);
    const stored = otpRows[0];

    const isTestNumber = cleanPhone === '9433554008' || cleanPhone === '8910710493';
    const isTestOtp = String(otp).trim() === '1234';
    const isValidOtp = (isTestNumber && isTestOtp) || isTestOtp || (stored && stored.otp === String(otp).trim() && Number(stored.expires_at) > Date.now());

    if (!isValidOtp) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP code. Use 1234 for testing.' });
    }

    // Query worker in MySQL
    const [rows] = await pool.execute('SELECT * FROM workers WHERE phone = ?', [cleanPhone]);

    let worker;
    if (rows.length === 0) {
      // Create first-time uncompleted worker profile so they can fill setup profile popup
      const [insertResult] = await pool.execute(
        `INSERT INTO workers (phone, name, trade, rating, total_jobs, is_online, status, is_profile_completed)
         VALUES (?, ?, ?, ?, ?, ?, ?, FALSE)`,
        [cleanPhone, '', trade || 'Electrician', 5.00, 0, true, 'active']
      );
      const [newWorker] = await pool.execute('SELECT * FROM workers WHERE id = ?', [insertResult.insertId]);
      worker = newWorker[0];
    } else {
      worker = rows[0];
    }

    const token = jwt.sign(
      { id: worker.id, phone: worker.phone, trade: worker.trade, type: 'worker' },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Worker logged in successfully.',
      token,
      isProfileCompleted: Boolean(worker.is_profile_completed),
      worker: {
        id: worker.id,
        phone: worker.phone,
        name: worker.name,
        trade: worker.trade,
        customTrade: worker.custom_trade,
        rating: Number(worker.rating) || 5.0,
        totalJobs: Number(worker.total_jobs) || 0,
        isOnline: Boolean(worker.is_online),
        status: worker.status,
        address: worker.address,
        selfieUrl: formatWorkerPhoto(worker.selfie_url, req),
        aadhaarNumber: worker.aadhaar_number,
        hourlyRate: Number(worker.hourly_rate) || 149.00,
        isProfileCompleted: Boolean(worker.is_profile_completed),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Customer: Setup Profile (First time popup)
 * POST /api/auth/customer/setup-profile
 */
async function customerSetupProfile(req, res, next) {
  try {
    const userId = req.user.id;
    const { name, address, latitude, longitude, age, alternatePhone } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'First name is required.' });
    }
    if (!address || !address.trim()) {
      return res.status(400).json({ success: false, message: 'Address is required.' });
    }

    await pool.execute(
      `UPDATE users
       SET name = ?, address = ?, latitude = ?, longitude = ?, age = ?, alternate_phone = ?, is_profile_completed = TRUE
       WHERE id = ?`,
      [
        name.trim(),
        address.trim(),
        latitude || null,
        longitude || null,
        age ? Number(age) : null,
        alternatePhone ? String(alternatePhone).trim() : null,
        userId,
      ]
    );

    const [rows] = await pool.execute('SELECT * FROM users WHERE id = ?', [userId]);

    return res.status(200).json({
      success: true,
      message: 'Profile setup completed successfully.',
      user: rows[0],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Worker: Setup Profile (First time partner onboarding popup)
 * POST /api/auth/worker/setup-profile
 */
async function workerSetupProfile(req, res, next) {
  try {
    const workerId = req.user.id;
    const {
      name,
      address,
      latitude,
      longitude,
      aadhaarNumber,
      aadhaarCardUrl,
      selfieUrl,
      trade,
      customTrade,
      hourlyRate,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Worker name is required.' });
    }
    if (!aadhaarNumber || !aadhaarNumber.trim()) {
      return res.status(400).json({ success: false, message: 'Aadhaar Card number is required.' });
    }

    const effectiveTrade = trade === 'Other' && customTrade ? customTrade.trim() : (trade || 'Electrician');

    // Convert base64 selfie or aadhaar into accessible public HTTP file URLs
    let publicSelfieUrl = selfieUrl || null;
    let publicAadhaarUrl = aadhaarCardUrl || null;

    const uploadDir = path.join(__dirname, '..', 'uploads', 'selfies');
    fs.mkdirSync(uploadDir, { recursive: true });

    if (selfieUrl && typeof selfieUrl === 'string' && selfieUrl.startsWith('data:image')) {
      try {
        const matches = selfieUrl.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
          const filename = `selfie_${workerId}_${Date.now()}.${ext}`;
          fs.writeFileSync(path.join(uploadDir, filename), matches[2], 'base64');
          const host = req.get('host') || '192.168.0.102:5000';
          publicSelfieUrl = `${req.protocol}://${host}/uploads/selfies/${filename}`;
        }
      } catch (err) {
        console.warn('[AUTH] Error saving selfie file:', err.message);
      }
    }

    if (aadhaarCardUrl && typeof aadhaarCardUrl === 'string' && aadhaarCardUrl.startsWith('data:image')) {
      try {
        const matches = aadhaarCardUrl.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
          const filename = `aadhaar_${workerId}_${Date.now()}.${ext}`;
          fs.writeFileSync(path.join(uploadDir, filename), matches[2], 'base64');
          const host = req.get('host') || '192.168.0.102:5000';
          publicAadhaarUrl = `${req.protocol}://${host}/uploads/selfies/${filename}`;
        }
      } catch (err) {
        console.warn('[AUTH] Error saving aadhaar file:', err.message);
      }
    }

    await pool.execute(
      `UPDATE workers
       SET name = ?, address = ?, latitude = ?, longitude = ?, aadhaar_number = ?, aadhaar_card_url = ?, selfie_url = ?, trade = ?, custom_trade = ?, hourly_rate = ?, is_profile_completed = TRUE
       WHERE id = ?`,
      [
        name.trim(),
        address ? address.trim() : null,
        latitude || null,
        longitude || null,
        aadhaarNumber.trim(),
        publicAadhaarUrl,
        publicSelfieUrl,
        effectiveTrade,
        customTrade ? customTrade.trim() : null,
        hourlyRate ? Number(hourlyRate) : 149.00,
        workerId,
      ]
    );

    const [rows] = await pool.execute('SELECT * FROM workers WHERE id = ?', [workerId]);
    const worker = rows[0];
    if (worker) {
      worker.selfie_url = formatWorkerPhoto(worker.selfie_url, req);
    }

    return res.status(200).json({
      success: true,
      message: 'Partner profile setup completed successfully.',
      worker,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Worker: Register as a Professional
 * POST /api/auth/worker/register
 */
async function workerRegister(req, res, next) {
  try {
    const { phone, name, trade } = req.body;
    if (!phone || !name || !trade) {
      return res.status(400).json({
        success: false,
        message: 'Phone, full name, and specialty trade are required.',
      });
    }

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    // Check if worker already exists
    const [existing] = await pool.execute('SELECT id FROM workers WHERE phone = ?', [cleanPhone]);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A professional with this mobile number is already registered. Please login.',
      });
    }

    const [insertResult] = await pool.execute(
      `INSERT INTO workers (phone, name, trade, rating, total_jobs, is_online, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [cleanPhone, name, trade, 4.90, 0, true, 'active']
    );

    const [created] = await pool.execute('SELECT * FROM workers WHERE id = ?', [insertResult.insertId]);
    const worker = created[0];

    const token = jwt.sign(
      { id: worker.id, phone: worker.phone, trade: worker.trade, type: 'worker' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Partner registration completed successfully.',
      token,
      worker,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get Current Profile (Customer or Worker)
 * GET /api/auth/me
 */
async function getMe(req, res, next) {
  try {
    const { id, type } = req.user;

    if (type === 'worker') {
      const [rows] = await pool.execute('SELECT * FROM workers WHERE id = ?', [id]);
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Worker profile not found.' });
      }
      const worker = rows[0];
      worker.selfie_url = formatWorkerPhoto(worker.selfie_url, req);
      return res.status(200).json({ success: true, type: 'worker', data: worker });
    }

    const [rows] = await pool.execute('SELECT id, phone, name, role, address, created_at FROM users WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User profile not found.' });
    }
    return res.status(200).json({ success: true, type: 'customer', data: rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  customerSendOtp,
  customerVerifyOtp,
  workerLogin,
  workerRegister,
  customerSetupProfile,
  workerSetupProfile,
  getMe,
};
