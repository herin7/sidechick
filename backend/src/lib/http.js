class ApiError extends Error {
  constructor(statusCode, code) {
    super(code);
    this.statusCode = statusCode;
    this.code = code;
  }
}

function asyncHandler(handler) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function notFoundHandler(_req, _res, next) {
  next(new ApiError(404, 'not_found'));
}

function errorHandler(error, _req, res, _next) {
  void _next;
  const statusCode = Number(error?.statusCode) || 500;
  const code = String(error?.code || 'internal_server_error');

  if (statusCode >= 500) {
    console.error(error);
  }

  return res.status(statusCode).json({ error: code });
}

module.exports = {
  ApiError,
  asyncHandler,
  errorHandler,
  notFoundHandler
};
