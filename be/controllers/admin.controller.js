const { pool } = require('../config/db');
const liveEvents = require('../services/liveEvents');

/**
 * Sastayu Executive Admin Portal Controller
 * Manages Users, Workers, Daily Earnings, Company Profit, & 7-Day Settlement Cycles
 */

/**
 * Admin Executive Overview & Financial Metrics
 * GET /api/admin/overview
 */
async function getAdminOverview(req, res, next) {
  try {
    // 1. Company Profit (20% platform charge)
    const [profitStats] = await pool.execute(`
      SELECT 
        COALESCE(SUM(commission_amount), 0) as totalProfit,
        COALESCE(SUM(CASE WHEN DATE(created_at) = CURDATE() THEN commission_amount ELSE 0 END), 0) as todayProfit,
        COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN commission_amount ELSE 0 END), 0) as last7DaysProfit,
        COALESCE(SUM(gross_amount), 0) as totalGrossVolume,
        COALESCE(SUM(amount), 0) as totalWorkerDisbursed
      FROM worker_earnings
      WHERE type = 'job_payout'
    `);

    // 2. Counts for Users, Workers, Bookings
    const [userCount] = await pool.execute('SELECT COUNT(*) as count FROM users');
    const [workerCount] = await pool.execute('SELECT COUNT(*) as count, SUM(CASE WHEN is_online = TRUE THEN 1 ELSE 0 END) as onlineCount FROM workers');
    const [bookingStats] = await pool.execute(`
      SELECT 
        COUNT(*) as totalBookings,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completedBookings,
        SUM(CASE WHEN status IN ('pending', 'accepted', 'in_progress') THEN 1 ELSE 0 END) as activeBookings
      FROM bookings
    `);

    // 3. Pending 7-day settlements count
    const [pendingPayouts] = await pool.execute(`
      SELECT COUNT(DISTINCT worker_id) as pendingWorkers,
             COALESCE(SUM(amount), 0) as pendingAmount
      FROM worker_earnings
      WHERE payout_status = 'pending' AND type = 'job_payout'
    `);

    return res.status(200).json({
      success: true,
      metrics: {
        totalCompanyProfit: Number(profitStats[0]?.totalProfit) || 0,
        todayCompanyProfit: Number(profitStats[0]?.todayProfit) || 0,
        last7DaysProfit: Number(profitStats[0]?.last7DaysProfit) || 0,
        grossVolume: Number(profitStats[0]?.totalGrossVolume) || 0,
        workerDisbursed: Number(profitStats[0]?.totalWorkerDisbursed) || 0,
        totalUsers: Number(userCount[0]?.count) || 0,
        totalWorkers: Number(workerCount[0]?.count) || 0,
        onlineWorkers: Number(workerCount[0]?.onlineCount) || 0,
        totalBookings: Number(bookingStats[0]?.totalBookings) || 0,
        completedBookings: Number(bookingStats[0]?.completedBookings) || 0,
        activeBookings: Number(bookingStats[0]?.activeBookings) || 0,
        pendingSettlementAmount: Number(pendingPayouts[0]?.pendingAmount) || 0,
        pendingWorkersCount: Number(pendingPayouts[0]?.pendingWorkers) || 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Manage Users: List all registered customers
 * GET /api/admin/users?search=...
 */
async function getUsersList(req, res, next) {
  try {
    const { search = '' } = req.query;
    let query = `
      SELECT u.id, u.phone, u.name, u.role, u.address, u.age, u.alternate_phone,
             u.is_profile_completed, u.created_at,
             COUNT(b.id) as total_bookings,
             COALESCE(SUM(b.total_amount), 0) as total_spend
      FROM users u
      LEFT JOIN bookings b ON u.id = b.user_id
    `;
    const params = [];

    if (search.trim()) {
      query += ` WHERE u.name LIKE ? OR u.phone LIKE ? OR u.address LIKE ?`;
      const kw = `%${search.trim()}%`;
      params.push(kw, kw, kw);
    }

    query += ` GROUP BY u.id ORDER BY u.id DESC LIMIT 100`;

    const [rows] = await pool.execute(query, params);

    return res.status(200).json({
      success: true,
      count: rows.length,
      users: rows.map((u) => ({
        id: u.id,
        phone: u.phone,
        name: u.name || 'Registered Customer',
        role: u.role,
        address: u.address || 'Address not added',
        age: u.age || null,
        alternatePhone: u.alternate_phone || null,
        isProfileCompleted: Boolean(u.is_profile_completed),
        createdAt: u.created_at,
        totalBookings: Number(u.total_bookings) || 0,
        totalSpend: Number(u.total_spend) || 0,
        status: u.role === 'customer' ? 'active' : u.role,
      })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update User Status (Activate, Block)
 * PATCH /api/admin/users/:id/status
 */
async function updateUserStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { role } = req.body; // 'customer' | 'blocked'

    await pool.execute('UPDATE users SET role = ? WHERE id = ?', [role || 'customer', id]);

    return res.status(200).json({
      success: true,
      message: `User status updated to ${role}.`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Manage Workers: List all technicians & verification status
 * GET /api/admin/workers?search=...
 */
async function getWorkersList(req, res, next) {
  try {
    const { search = '' } = req.query;
    let query = `
      SELECT w.*,
             COUNT(DISTINCT b.id) as assigned_jobs,
             COALESCE(SUM(we.amount), 0) as total_net_earned,
             COALESCE(SUM(we.gross_amount), 0) as total_gross_billed,
             COALESCE(SUM(we.commission_amount), 0) as company_profit_generated
      FROM workers w
      LEFT JOIN bookings b ON w.id = b.worker_id
      LEFT JOIN worker_earnings we ON w.id = we.worker_id AND we.type = 'job_payout'
    `;
    const params = [];

    if (search.trim()) {
      query += ` WHERE w.name LIKE ? OR w.phone LIKE ? OR w.trade LIKE ? OR w.custom_trade LIKE ?`;
      const kw = `%${search.trim()}%`;
      params.push(kw, kw, kw, kw);
    }

    query += ` GROUP BY w.id ORDER BY w.id DESC LIMIT 100`;

    const [rows] = await pool.execute(query, params);

    return res.status(200).json({
      success: true,
      count: rows.length,
      workers: rows.map((w) => ({
        id: w.id,
        phone: w.phone,
        name: w.name || 'Technician',
        trade: w.custom_trade || w.trade,
        baseTrade: w.trade,
        rating: Number(w.rating) || 5.0,
        totalJobs: Number(w.total_jobs) || Number(w.assigned_jobs) || 0,
        isOnline: Boolean(w.is_online),
        status: w.status, // 'active' | 'pending_kyc' | 'suspended'
        address: w.address || 'Service Area',
        aadhaarNumber: w.aadhaar_number || 'Not submitted',
        aadhaarCardUrl: w.aadhaar_card_url || null,
        selfieUrl: w.selfie_url || null,
        hourlyRate: Number(w.hourly_rate) || 149.00,
        isProfileCompleted: Boolean(w.is_profile_completed),
        totalGrossBilled: Number(w.total_gross_billed) || 0,
        companyProfitGenerated: Number(w.company_profit_generated) || 0,
        totalNetEarned: Number(w.total_net_earned) || 0,
        createdAt: w.created_at,
      })),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Update Worker Status (Approve KYC, Suspend, Activate)
 * PATCH /api/admin/workers/:id/status
 */
async function updateWorkerStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'active' | 'pending_kyc' | 'suspended'

    if (!['active', 'pending_kyc', 'suspended'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    await pool.execute('UPDATE workers SET status = ? WHERE id = ?', [status, id]);

    return res.status(200).json({
      success: true,
      message: `Worker status updated to ${status}.`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Workers Daily & 7-Day Earnings & Company Profit ("Our Profit")
 * GET /api/admin/worker-earnings?period=today|7days|all
 */
async function getAdminWorkerEarnings(req, res, next) {
  try {
    const { period = 'today' } = req.query;

    let dateCondition = 'AND DATE(we.created_at) = CURDATE()';
    if (period === '7days') {
      dateCondition = 'AND we.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    } else if (period === 'all') {
      dateCondition = '';
    }

    // Query earnings grouped by worker
    const [rows] = await pool.execute(`
      SELECT 
        w.id as worker_id,
        w.name as worker_name,
        w.phone as worker_phone,
        w.trade as worker_trade,
        COUNT(we.id) as jobs_count,
        COALESCE(SUM(we.gross_amount), 0) as gross_amount,
        COALESCE(SUM(we.commission_amount), 0) as company_profit,
        COALESCE(SUM(we.amount), 0) as worker_net_amount,
        COALESCE(SUM(CASE WHEN we.commission_rate = 0 THEN 1 ELSE 0 END), 0) as free_orders_count,
        MAX(we.created_at) as last_job_time,
        SUM(CASE WHEN we.payout_status = 'pending' THEN 1 ELSE 0 END) as pending_settlement_count
      FROM workers w
      JOIN worker_earnings we ON w.id = we.worker_id AND we.type = 'job_payout'
      WHERE 1=1 ${dateCondition}
      GROUP BY w.id
      ORDER BY gross_amount DESC
    `);

    // Overall summary for the selected period
    let totalGross = 0;
    let totalCompanyProfit = 0;
    let totalWorkerNet = 0;
    let totalJobs = 0;

    const workerList = rows.map((r) => {
      const gross = Number(r.gross_amount) || 0;
      const profit = Number(r.company_profit) || 0;
      const net = Number(r.worker_net_amount) || 0;
      const jobs = Number(r.jobs_count) || 0;

      totalGross += gross;
      totalCompanyProfit += profit;
      totalWorkerNet += net;
      totalJobs += jobs;

      return {
        workerId: r.worker_id,
        name: r.worker_name || 'Worker',
        phone: r.worker_phone,
        trade: r.worker_trade,
        jobsCount: jobs,
        grossAmount: gross,
        companyProfit: profit, // 20% platform charge
        workerNetPayout: net, // 80% worker payout
        freeOrdersCount: Number(r.free_orders_count) || 0,
        lastJobTime: r.last_job_time,
        payoutStatus: Number(r.pending_settlement_count) === 0 ? 'paid' : 'pending',
      };
    });

    return res.status(200).json({
      success: true,
      period,
      summary: {
        totalGross,
        totalCompanyProfit, // Our Profit!
        totalWorkerNet,
        totalJobs,
        activeWorkersCount: workerList.length,
      },
      workers: workerList,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * 7-Day Settlement Management: Settle / Mark Weekly Payout as Paid
 * POST /api/admin/settle-payout
 */
async function settleWorkerPayout(req, res, next) {
  try {
    const { workerId, amount, transactionRef, status = 'paid', notes = '' } = req.body;

    if (!workerId) {
      return res.status(400).json({ success: false, message: 'Worker ID is required.' });
    }

    const txRef = transactionRef || `PAY_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    // 1. Mark all pending earnings for this worker as paid
    await pool.execute(
      `UPDATE worker_earnings
       SET payout_status = ?, paid_at = NOW(), payout_reference = ?
       WHERE worker_id = ? AND payout_status = 'pending'`,
      [status, txRef, workerId]
    );

    // 2. Record in worker_payouts table
    const cycleStartDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const cycleEndDate = new Date().toISOString().slice(0, 10);

    await pool.execute(
      `INSERT INTO worker_payouts
       (worker_id, cycle_start_date, cycle_end_date, gross_amount, net_payout, payout_status, paid_at, transaction_ref, notes)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
      [workerId, cycleStartDate, cycleEndDate, amount || 0, amount || 0, status, txRef, notes]
    );

    // Broadcast live event so worker app updates instantly
    liveEvents.broadcast('PAYOUT_SETTLED', {
      workerId: Number(workerId),
      amount: Number(amount) || 0,
      transactionRef: txRef,
      status,
    });

    return res.status(200).json({
      success: true,
      message: `Weekly payout of ₹${amount || 0} successfully marked as ${status} (Ref: ${txRef}).`,
      transactionRef: txRef,
      status,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get 7-Day Weekly Settlements List
 * GET /api/admin/payouts
 */
async function getWeeklyPayoutsList(req, res, next) {
  try {
    const [rows] = await pool.execute(`
      SELECT 
        w.id as worker_id,
        w.name as worker_name,
        w.phone as worker_phone,
        w.trade as worker_trade,
        COALESCE(SUM(CASE WHEN we.payout_status = 'pending' THEN we.amount ELSE 0 END), 0) as pending_payout,
        COALESCE(SUM(CASE WHEN we.payout_status = 'paid' THEN we.amount ELSE 0 END), 0) as settled_payout,
        COALESCE(SUM(we.commission_amount), 0) as company_profit_collected,
        COUNT(we.id) as total_completed_jobs,
        MAX(we.paid_at) as last_paid_at,
        MAX(we.payout_reference) as last_payout_ref
      FROM workers w
      LEFT JOIN worker_earnings we ON w.id = we.worker_id AND we.type = 'job_payout'
      GROUP BY w.id
      ORDER BY pending_payout DESC, settled_payout DESC
    `);

    return res.status(200).json({
      success: true,
      count: rows.length,
      payouts: rows.map((p) => ({
        workerId: p.worker_id,
        workerName: p.worker_name || 'Technician',
        workerPhone: p.worker_phone,
        workerTrade: p.worker_trade,
        pendingPayout: Number(p.pending_payout) || 0,
        settledPayout: Number(p.settled_payout) || 0,
        companyProfit: Number(p.company_profit_collected) || 0,
        totalJobs: Number(p.total_completed_jobs) || 0,
        isPaidIn7Days: Number(p.pending_payout) === 0,
        payoutStatus: Number(p.pending_payout) === 0 ? 'paid' : 'pending',
        lastPaidAt: p.last_paid_at,
        lastPayoutRef: p.last_payout_ref,
      })),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAdminOverview,
  getUsersList,
  updateUserStatus,
  getWorkersList,
  updateWorkerStatus,
  getAdminWorkerEarnings,
  settleWorkerPayout,
  getWeeklyPayoutsList,
};
