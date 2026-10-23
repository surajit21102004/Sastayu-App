/**
 * Global 404 Route Not Found Handler
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Global Error Handler
 * Sanitizes errors so internal DB traces or secrets are not leaked to clients
 */
function errorHandler(err, req, res, next) {
  console.error('[SERVER ERROR]', err);

  const statusCode = err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'An internal server error occurred.'
      : err.message || 'Server error';

  res.status(statusCode).json({
    success: false,
    message,
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
