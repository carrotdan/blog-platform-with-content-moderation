const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const requestIdMiddleware = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || uuidv4();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

const addRequestIdToLogger = (req, res, next) => {
  const originalJson = res.json.bind(res);
  
  res.json = (data) => {
    const logData = {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      userId: req.user?.id,
      userRole: req.user?.role,
      ip: req.ip,
      userAgent: req.get('user-agent')
    };
    
    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.info('HTTP Request', logData);
    }
    
    return originalJson(data);
  };
  
  next();
};

const errorLoggerMiddleware = (err, req, res, next) => {
  logger.error('Request Error', {
    requestId: req.requestId,
    method: req.method,
    url: req.originalUrl,
    error: err.message,
    stack: err.stack,
    userId: req.user?.id,
    ip: req.ip
  });
  
  next(err);
};

module.exports = {
  requestIdMiddleware,
  addRequestIdToLogger,
  errorLoggerMiddleware
};