export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let status = error.status || 500;
  let code = error.code || 'INTERNAL_ERROR';
  let message = error.message;
  if (error.type === 'entity.parse.failed') {
    status = 400; code = 'INVALID_JSON'; message = 'Request body must be valid JSON.';
  } else if (error.type === 'entity.too.large') {
    status = 413; code = 'BODY_TOO_LARGE'; message = 'Request body exceeds 4 KB.';
  } else if (!(error instanceof HttpError) && !error.type) {
    // Never return driver errors, stack traces, URIs or secrets to clients.
    console.error(`[api] ${error.name || 'Error'} during ${req.method} ${req.path}`);
    status = 500; code = 'INTERNAL_ERROR'; message = 'An unexpected server error occurred.';
  }
  res.status(status).json({ error: { code, message, ...(error.details && { details: error.details }) } });
}
