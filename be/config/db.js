const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Create connection pool to live MySQL database
const pool = mysql.createPool({
  host: process.env.DB_HOST || 's1-nnvp.crazzydns.com',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'ecompone_sasthayu',
  password: process.env.DB_PASSWORD || 'Surajit@21',
  database: process.env.DB_NAME || 'ecompone_sathayu',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 15000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});

/**
 * Automatically creates all required tables in MySQL if they do not exist
 * and verifies system schema.
 */
async function initDatabase() {
  console.log('[DB] Checking database connection and initializing tables...');

  try {
    const connection = await pool.getConnection();
    console.log('[DB] Successfully connected to live MySQL database.');

    // Read schema.sql and strip comments
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    const cleanSql = schemaSql.replace(/--.*$/gm, '');

    // Split statements by semicolon
    const statements = cleanSql
      .split(';')
      .map((st) => st.trim())
      .filter((st) => st.length > 0);

    for (const statement of statements) {
      await connection.query(statement);
    }
    console.log('[DB] All MySQL tables verified / created successfully.');

    // Ensure new columns in bookings table exist
    const bookingColumns = [
      "ALTER TABLE bookings ADD COLUMN voice_note_url LONGTEXT DEFAULT NULL",
      "ALTER TABLE bookings ADD COLUMN proposed_price DECIMAL(10,2) DEFAULT NULL",
      "ALTER TABLE bookings ADD COLUMN counter_price DECIMAL(10,2) DEFAULT NULL",
      "ALTER TABLE bookings ADD COLUMN negotiation_status ENUM('none', 'pending', 'countered', 'accepted', 'rejected') DEFAULT 'none'",
      "ALTER TABLE bookings ADD COLUMN counter_note TEXT DEFAULT NULL",
      "ALTER TABLE bookings ADD COLUMN scheduled_date VARCHAR(30) DEFAULT NULL",
      "ALTER TABLE bookings ADD COLUMN scheduled_slot VARCHAR(50) DEFAULT NULL",
      "ALTER TABLE bookings ADD COLUMN issue_details TEXT DEFAULT NULL",
      "ALTER TABLE bookings ADD COLUMN is_emergency BOOLEAN DEFAULT FALSE",
      "ALTER TABLE bookings ADD COLUMN payment_mode ENUM('upi', 'cash', 'pending') DEFAULT 'pending'",
      "ALTER TABLE bookings ADD COLUMN payment_status ENUM('pending', 'paid', 'failed') DEFAULT 'pending'",
      "ALTER TABLE bookings ADD COLUMN transaction_id VARCHAR(100) DEFAULT NULL",
      "ALTER TABLE bookings ADD COLUMN is_rated BOOLEAN DEFAULT FALSE",
      "ALTER TABLE bookings ADD COLUMN user_rating INT DEFAULT NULL",
      "ALTER TABLE bookings ADD COLUMN review_comment TEXT DEFAULT NULL",
      "ALTER TABLE bookings ADD COLUMN review_tags VARCHAR(255) DEFAULT NULL",
      "ALTER TABLE worker_earnings ADD COLUMN gross_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00",
      "ALTER TABLE worker_earnings ADD COLUMN commission_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00",
      "ALTER TABLE worker_earnings ADD COLUMN commission_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00",
      "ALTER TABLE worker_earnings ADD COLUMN net_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00",
      "ALTER TABLE worker_earnings ADD COLUMN order_index INT DEFAULT 1",
      "ALTER TABLE worker_earnings ADD COLUMN payout_status ENUM('pending', 'paid') DEFAULT 'pending'",
      "ALTER TABLE worker_earnings ADD COLUMN paid_at TIMESTAMP NULL DEFAULT NULL",
      "ALTER TABLE worker_earnings ADD COLUMN payout_reference VARCHAR(100) DEFAULT NULL",
      "ALTER TABLE workers ADD COLUMN coin_balance INT NOT NULL DEFAULT 0",
      "ALTER TABLE workers ADD COLUMN free_bookings_used INT NOT NULL DEFAULT 0",
      "ALTER TABLE bookings ADD COLUMN coins_deducted INT DEFAULT 0",
      "ALTER TABLE bookings ADD COLUMN is_free_booking BOOLEAN DEFAULT FALSE",
    ];

    for (const colQuery of bookingColumns) {
      try {
        await connection.query(colQuery);
      } catch (colErr) {
        // Ignore ER_DUP_FIELDNAME if column already exists
      }
    }

    // Ensure worker_wallet_transactions table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS worker_wallet_transactions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        worker_id INT NOT NULL,
        type ENUM('recharge', 'booking_fee', 'bonus', 'refund', 'adjustment') NOT NULL,
        coins INT NOT NULL,
        balance_after INT NOT NULL,
        amount_paid DECIMAL(10,2) DEFAULT 0.00,
        booking_id INT DEFAULT NULL,
        booking_amount DECIMAL(10,2) DEFAULT NULL,
        razorpay_order_id VARCHAR(100) DEFAULT NULL,
        razorpay_payment_id VARCHAR(100) DEFAULT NULL,
        description VARCHAR(255) DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_worker_wallet (worker_id),
        INDEX idx_wallet_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('[DB] Bookings, Workers Wallet, and Earnings schema columns verified.');


    // Services catalog can be populated from admin or database, no fake users/workers/bookings seeded
    connection.release();
    return true;
  } catch (err) {
    console.error('[DB ERROR] Failed to initialize database tables:', err.message);
    throw err;
  }
}

module.exports = {
  pool,
  initDatabase,
};
