// Wraps async route handlers so thrown errors become JSON responses
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((e) =>
    res.status(e.status || 500).json({ message: e.message })
  );

const httpError = (status, message) => Object.assign(new Error(message), { status });

module.exports = { asyncHandler, httpError };