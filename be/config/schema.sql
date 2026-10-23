-- Sastayu On-Demand Home Services Database Schema
-- Live MySQL / MariaDB Database: ecompone_sathayu

-- 1. Users Table (Customers)
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) DEFAULT NULL,
  role ENUM('customer', 'admin') DEFAULT 'customer',
  address VARCHAR(255) DEFAULT NULL,
  age INT DEFAULT NULL,
  alternate_phone VARCHAR(20) DEFAULT NULL,
  latitude DECIMAL(10,8) DEFAULT NULL,
  longitude DECIMAL(11,8) DEFAULT NULL,
  is_profile_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 1b. OTP Verification Store
CREATE TABLE IF NOT EXISTS otps (
  phone VARCHAR(20) PRIMARY KEY,
  otp VARCHAR(10) NOT NULL,
  expires_at BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Workers Table (Service Partners)
CREATE TABLE IF NOT EXISTS workers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  phone VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  trade VARCHAR(50) NOT NULL,
  custom_trade VARCHAR(100) DEFAULT NULL,
  rating DECIMAL(3,2) DEFAULT 5.00,
  total_jobs INT DEFAULT 0,
  is_online BOOLEAN DEFAULT TRUE,
  status ENUM('active', 'pending_kyc', 'suspended') DEFAULT 'active',
  address VARCHAR(255) DEFAULT NULL,
  latitude DECIMAL(10,8) DEFAULT NULL,
  longitude DECIMAL(11,8) DEFAULT NULL,
  aadhaar_number VARCHAR(20) DEFAULT NULL,
  aadhaar_card_url LONGTEXT DEFAULT NULL,
  selfie_url LONGTEXT DEFAULT NULL,
  hourly_rate DECIMAL(10,2) DEFAULT 149.00,
  is_profile_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Services Catalog
CREATE TABLE IF NOT EXISTS services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL DEFAULT 149.00,
  icon VARCHAR(20) DEFAULT '⚡',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Bookings Table (Customer Requests & Orders)
CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_number VARCHAR(30) NOT NULL UNIQUE,
  user_id INT NOT NULL,
  worker_id INT DEFAULT NULL,
  service_title VARCHAR(100) NOT NULL,
  service_type ENUM('jaldi', 'scheduled', 'list') DEFAULT 'jaldi',
  status ENUM('pending', 'accepted', 'in_progress', 'completed', 'cancelled') DEFAULT 'pending',
  otp VARCHAR(6) DEFAULT NULL,
  eta_minutes INT DEFAULT NULL,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  visit_charge DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  repair_charge DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  customer_notes TEXT,
  address VARCHAR(255) DEFAULT NULL,
  scheduled_time DATETIME DEFAULT NULL,
  voice_note_url LONGTEXT DEFAULT NULL,
  proposed_price DECIMAL(10,2) DEFAULT NULL,
  counter_price DECIMAL(10,2) DEFAULT NULL,
  negotiation_status ENUM('none', 'pending', 'countered', 'accepted', 'rejected') DEFAULT 'none',
  counter_note TEXT DEFAULT NULL,
  scheduled_date VARCHAR(30) DEFAULT NULL,
  scheduled_slot VARCHAR(50) DEFAULT NULL,
  issue_details TEXT DEFAULT NULL,
  is_emergency BOOLEAN DEFAULT FALSE,
  payment_mode ENUM('upi', 'cash', 'pending') DEFAULT 'pending',
  payment_status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
  transaction_id VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user (user_id),
  INDEX idx_worker (worker_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Extra Charge Disputes
CREATE TABLE IF NOT EXISTS disputes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  user_id INT NOT NULL,
  app_price DECIMAL(10,2) NOT NULL,
  worker_asked_amount DECIMAL(10,2) NOT NULL,
  extra_amount DECIMAL(10,2) NOT NULL,
  reason VARCHAR(100) NOT NULL,
  notes TEXT,
  photo_url VARCHAR(255) DEFAULT NULL,
  status ENUM('under_review', 'refunded', 'resolved', 'rejected') DEFAULT 'under_review',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_booking (booking_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  user_id INT NOT NULL,
  worker_id INT NOT NULL,
  rating INT NOT NULL DEFAULT 5,
  tags VARCHAR(255) DEFAULT NULL,
  comment TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_booking_rev (booking_id),
  INDEX idx_worker_rev (worker_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Worker Earnings & Transactions (Prompt 5)
CREATE TABLE IF NOT EXISTS worker_earnings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  worker_id INT NOT NULL,
  booking_id INT DEFAULT NULL,
  amount DECIMAL(10,2) NOT NULL,
  gross_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  commission_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  commission_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  net_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  order_index INT DEFAULT 1,
  type ENUM('job_payout', 'bonus', 'withdrawal') DEFAULT 'job_payout',
  status ENUM('credited', 'pending', 'paid') DEFAULT 'credited',
  payout_status ENUM('pending', 'paid') DEFAULT 'pending',
  paid_at TIMESTAMP NULL DEFAULT NULL,
  payout_reference VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_worker_earn (worker_id),
  INDEX idx_payout_stat (payout_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Worker 7-Day Payout Settlements (Prompt 5)
CREATE TABLE IF NOT EXISTS worker_payouts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  worker_id INT NOT NULL,
  cycle_start_date DATE NOT NULL,
  cycle_end_date DATE NOT NULL,
  total_orders INT DEFAULT 0,
  gross_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  commission_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  net_payout DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  payout_status ENUM('pending', 'paid') DEFAULT 'pending',
  paid_at TIMESTAMP NULL DEFAULT NULL,
  transaction_ref VARCHAR(100) DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_worker_payout (worker_id),
  INDEX idx_payout_cycle_status (payout_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Worker Wallet Coin Transactions & Razorpay Recharges
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


