const { pool } = require('../config/db');

async function migrate() {
  const alterQueries = [
    `ALTER TABLE bookings ADD COLUMN voice_note_url LONGTEXT DEFAULT NULL`,
    `ALTER TABLE bookings ADD COLUMN proposed_price DECIMAL(10,2) DEFAULT NULL`,
    `ALTER TABLE bookings ADD COLUMN counter_price DECIMAL(10,2) DEFAULT NULL`,
    `ALTER TABLE bookings ADD COLUMN negotiation_status ENUM('none', 'pending', 'countered', 'accepted', 'rejected') DEFAULT 'none'`,
    `ALTER TABLE bookings ADD COLUMN counter_note TEXT DEFAULT NULL`,
    `ALTER TABLE bookings ADD COLUMN scheduled_date VARCHAR(30) DEFAULT NULL`,
    `ALTER TABLE bookings ADD COLUMN scheduled_slot VARCHAR(50) DEFAULT NULL`,
    `ALTER TABLE bookings ADD COLUMN issue_details TEXT DEFAULT NULL`,
    `ALTER TABLE bookings ADD COLUMN is_emergency BOOLEAN DEFAULT FALSE`
  ];

  for (const q of alterQueries) {
    try {
      await pool.execute(q);
      console.log('Success:', q);
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('Field already exists, skipping.');
      } else {
        console.warn('Migration warning:', err.message);
      }
    }
  }
  console.log('Migration finished successfully!');
  process.exit(0);
}

migrate();
