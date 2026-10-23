const { pool, initDatabase } = require('./config/db');

async function runTest() {
  try {
    console.log('Testing live connection and automatic table creation...');
    await initDatabase();

    const [tables] = await pool.query('SHOW TABLES');
    console.log('\n[SUCCESS] Tables created in MySQL database:');
    tables.forEach((row) => console.log(' • ' + Object.values(row)[0]));

    // Query seeded data counts
    const [users] = await pool.query('SELECT COUNT(*) as count FROM users');
    const [workers] = await pool.query('SELECT COUNT(*) as count FROM workers');
    const [services] = await pool.query('SELECT COUNT(*) as count FROM services');
    const [bookings] = await pool.query('SELECT COUNT(*) as count FROM bookings');

    console.log('\n[RECORD COUNTS]');
    console.log(` • Users: ${users[0].count}`);
    console.log(` • Workers: ${workers[0].count}`);
    console.log(` • Services: ${services[0].count}`);
    console.log(` • Bookings: ${bookings[0].count}`);

    await pool.end();
    console.log('\nAll checks passed successfully!');
  } catch (err) {
    console.error('[TEST FAILED]', err);
    process.exit(1);
  }
}

runTest();
