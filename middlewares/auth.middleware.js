const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/user.repo');

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        data: null,
        message: 'No token provided or invalid format'
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    
    // Attach user to request
    req.user = {
      id: decoded.userId || decoded.id,
      role: decoded.role
    };
    
    next();
  } catch (error) {
    // Handle expired token specifically if needed, otherwise general 401
    const message = error.name === 'TokenExpiredError' 
      ? 'Access token expired' 
      : 'Invalid token';
      
    res.status(401).json({
      success: false,
      data: null,
      message
    });
  }
};

const optionalAuthenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { id: decoded.userId || decoded.id, role: decoded.role };
    next();
  } catch (error) {
    // Even if token is invalid, we treat them as guest instead of throwing 401
    next();
  }
};

const authorize = (roles = []) => {
  return (req, res, next) => {
    const rolesArray = Array.isArray(roles) ? roles : [roles];
    if (!req.user || !rolesArray.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        data: null,
        message: 'Forbidden: Insufficient permissions'
      });
    }
    next();
  };
};

const checkStatus = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: No user credentials found'
      });
    }

    const user = await userRepository.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.status === 'BANNED') {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản của bạn đã bị khóa.'
      });
    }

    if (user.status === 'MUTED') {
      const writeMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
      if (writeMethods.includes(req.method)) {
        return res.status(403).json({
          success: false,
          message: 'Tài khoản của bạn đang bị hạn chế tương tác và đăng nội dung.'
        });
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authMiddleware,
  authenticate: authMiddleware,
  optionalAuthenticate,
  authorize,
  checkStatus
};
