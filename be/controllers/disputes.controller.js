const { pool } = require('../config/db');

/**
 * Report Extra Charge Dispute (Screenshot 3)
 * POST /api/disputes/report-extra
 */
async function reportExtraCharge(req, res, next) {
  try {
    const {
      bookingId,
      appPrice,
      workerAskedAmount,
      reason,
      notes = '',
      photoUrl = null,
    } = req.body;

    if (!bookingId || appPrice === undefined || workerAskedAmount === undefined || !reason) {
      return res.status(400).json({
        success: false,
        message: 'bookingId, appPrice, workerAskedAmount, and reason are required.',
      });
    }

    const userId = req.user ? req.user.id : 1;
    const extraAmount = Math.max(0, Number(workerAskedAmount) - Number(appPrice));

    const [result] = await pool.execute(
      `INSERT INTO disputes
       (booking_id, user_id, app_price, worker_asked_amount, extra_amount, reason, notes, photo_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'under_review')`,
      [bookingId, userId, appPrice, workerAskedAmount, extraAmount, reason, notes, photoUrl]
    );

    const [created] = await pool.execute('SELECT * FROM disputes WHERE id = ?', [result.insertId]);

    return res.status(201).json({
      success: true,
      message: 'Dispute submitted. Trust & safety team will review within 2 hours.',
      dispute: created[0],
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get disputes list
 * GET /api/disputes
 */
async function getMyDisputes(req, res, next) {
  try {
    const userId = req.user ? req.user.id : 1;

    const [rows] = await pool.execute(
      `SELECT d.*, b.booking_number, b.service_title
       FROM disputes d
       LEFT JOIN bookings b ON d.booking_id = b.id
       WHERE d.user_id = ?
       ORDER BY d.id DESC`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      count: rows.length,
      disputes: rows,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  reportExtraCharge,
  getMyDisputes,
};
