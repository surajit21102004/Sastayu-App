const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { initDatabase, pool } = require('./config/db');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');

// Import modular routes
const authRoutes = require('./routes/auth.routes');
const bookingsRoutes = require('./routes/bookings.routes');
const workersRoutes = require('./routes/workers.routes');
const disputesRoutes = require('./routes/disputes.routes');
const servicesRoutes = require('./routes/services.routes');
const adminRoutes = require('./routes/admin.routes');
const walletRoutes = require('./routes/wallet.routes');


const app = express();
const PORT = process.env.PORT || 5000;

const path = require('path');
const fs = require('fs');

// Ensure uploads directories exist
const uploadsDir = path.join(__dirname, 'uploads');
const selfiesDir = path.join(uploadsDir, 'selfies');
fs.mkdirSync(selfiesDir, { recursive: true });

// Security & Parsing Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use('/uploads', express.static(uploadsDir));
app.use(morgan('dev'));

// API Health Check & Database Ping
app.get('/api/health', async (req, res) => {
  try {
    const [result] = await pool.query('SELECT 1 as connected');
    res.status(200).json({
      success: true,
      service: 'Sastayu Backend API',
      status: 'UP',
      database: {
        status: 'CONNECTED',
        host: process.env.DB_HOST,
        name: process.env.DB_NAME,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      service: 'Sastayu Backend API',
      status: 'DEGRADED',
      database: {
        status: 'DISCONNECTED',
        error: err.message,
      },
    });
  }
});

// Root Welcome / Documentation Route
app.get('/', (req, res) => {
  res.json({
    name: 'Sastayu On-Demand Home Services API',
    tagline: 'Superfast Home Services • 30-Min Arrival Guarantee',
    version: '1.0.0',
    database: 'Live MySQL (ecompone_sathayu)',
    documentation: {
      health: 'GET /api/health',
      auth: {
        customerSendOtp: 'POST /api/auth/customer/send-otp',
        customerVerifyOtp: 'POST /api/auth/customer/verify-otp',
        workerLogin: 'POST /api/auth/worker/login',
        workerRegister: 'POST /api/auth/worker/register',
        profile: 'GET /api/auth/me',
      },
      bookings: {
        create: 'POST /api/bookings',
        list: 'GET /api/bookings',
        details: 'GET /api/bookings/:id',
        updateStatus: 'PATCH /api/bookings/:id/status',
        complete: 'POST /api/bookings/:id/complete',
      },
      workers: {
        nearby: 'GET /api/workers/nearby?trade=Electrician',
        dashboard: 'GET /api/workers/dashboard',
        toggleStatus: 'PATCH /api/workers/status',
        earnings: 'GET /api/workers/earnings',
      },
      disputes: {
        reportExtraCharge: 'POST /api/disputes/report-extra',
        list: 'GET /api/disputes',
      },
      services: {
        list: 'GET /api/services',
        categories: 'GET /api/services/categories',
      },
    },
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/workers', workersRoutes);
app.use('/api/disputes', disputesRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/wallet', walletRoutes);


// Error Handling Middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Start server after verifying database
async function startServer() {
  try {
    await initDatabase();

    const HOST = process.env.HOST || '0.0.0.0';
    const server = app.listen(PORT, HOST, () => {
      const os = require('os');
      const nets = os.networkInterfaces();
      let netIp = '127.0.0.1';
      for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
          if (net.family === 'IPv4' && !net.internal) {
            if (!netIp || net.address.startsWith('192.168.') || name.toLowerCase().includes('wi-fi') || name.toLowerCase().includes('wifi')) {
              netIp = net.address;
            }
          }
        }
      }

      console.log(`\n======================================================`);
      console.log(`🚀 Sastayu Backend Server is running!`);
      console.log(`📡 Local:   http://localhost:${PORT}`);
      console.log(`📱 Network: http://${netIp}:${PORT}`);
      console.log(`🗄️  Database: Live MySQL (${process.env.DB_NAME})`);
      console.log(`⚡ Health Check: http://localhost:${PORT}/api/health`);
      console.log(`======================================================\n`);
    });

    return server;
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// If invoked directly, start server
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
