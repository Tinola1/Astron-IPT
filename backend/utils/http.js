// Wraps async route handlers so thrown errors become JSON responses.
// Our own httpError messages are safe to show; unexpected errors are logged and hidden in production.
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((e) => {
    const status = e.status || 500;
    if (status >= 500) console.error(e);
    const hide = process.env.NODE_ENV === 'production' && !e.status;
    res.status(status).json({ message: hide ? 'Something went wrong' : e.message });
  });

const httpError = (status, message) => Object.assign(new Error(message), { status });

module.exports = { asyncHandler, httpError };