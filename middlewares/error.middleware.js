const { errorLoggerMiddleware } = require('./request-id.middleware');

const errorMiddleware = (err, req, res, next) => {
  // Default to 500 for unhandled errors, use error's statusCode if available
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';

  // Mongoose bad ObjectId
  if (err.name === 'CastError' && err.kind === 'ObjectId') {
    statusCode = 404;
    message = 'Resource not found';
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 400;
    message = 'Duplicate field value entered';
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
  }

  res.status(statusCode).json({
    success: false,
    message,
    requestId: req.requestId,
    data: process.env.NODE_ENV === 'production' ? null : err.stack
  });
};

// Log errors before sending response
const errorHandlerWithLogging = [errorLoggerMiddleware, errorMiddleware];

module.exports = { errorMiddleware: errorHandlerWithLogging };
