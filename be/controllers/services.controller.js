const { pool } = require('../config/db');

/**
 * Get all available services & categories
 * GET /api/services
 */
async function getServices(req, res, next) {
  try {
    const { category } = req.query;

    let sql = 'SELECT * FROM services WHERE is_active = TRUE';
    const params = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY id ASC';

    const [rows] = await pool.execute(sql, params);

    return res.status(200).json({
      success: true,
      count: rows.length,
      services: rows,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get distinct categories
 * GET /api/services/categories
 */
async function getCategories(req, res, next) {
  try {
    const [rows] = await pool.execute(
      'SELECT DISTINCT category, icon FROM services WHERE is_active = TRUE'
    );

    return res.status(200).json({
      success: true,
      categories: rows,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getServices,
  getCategories,
};
