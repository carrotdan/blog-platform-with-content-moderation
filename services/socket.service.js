const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

let io;

const ALLOWED_ORIGINS = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

function isOriginAllowed(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  return ALLOWED_ORIGINS.includes('*');
}

module.exports = {
  io: null,
  init: (server) => {
    io = socketIo(server, {
      cors: {
        origin: (origin, callback) => {
          if (isOriginAllowed(origin)) {
            callback(null, true);
          } else {
            logger.warn('[Socket] Connection rejected from disallowed origin', { origin });
            callback(new Error('Origin not allowed'));
          }
        },
        credentials: true
      },
      pingInterval: 25000,
      pingTimeout: 20000
    });

    // Auth middleware for socket connections
    io.use((socket, next) => {
      // L21: Only accept the token via handshake.auth — never via query string,
      // which would leak the access token into logs/history.
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication required'));
      }
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        socket.userId = decoded.userId || decoded.id;
        socket.userRole = decoded.role;
        next();
      } catch (err) {
        next(new Error('Invalid token'));
      }
    });

    io.on('connection', (socket) => {
      logger.info('Client connected', { socketId: socket.id, userId: socket.userId });

      // L30: Auto-join the per-user room on connection so real-time events
      // (notifications, messages) are not dropped when the client never emits
      // join_user_room or emits it after an event fires.
      if (socket.userId) {
        socket.join(socket.userId.toString());
      }

      // Kept for backward compatibility; joining again is a no-op.
      socket.on('join_user_room', () => {
        if (socket.userId) {
          socket.join(socket.userId.toString());
          logger.info('User joined room', { userId: socket.userId });
        }
      });

      socket.on('disconnect', () => {
        logger.info('Client disconnected', { socketId: socket.id });
      });
    });
    
    module.exports.io = io;
    return io;
  },
  
  getIO: () => {
    if (!io) {
      logger.warn('Socket.io is not initialized yet!');
      return null;
    }
    return io;
  },

  sendNotification: (receiverId, notificationData) => {
    if (io) {
      io.to(receiverId.toString()).emit('new_notification', notificationData);
    }
  },

  sendToUser: (userId, event, data) => {
    if (io) {
      io.to(userId.toString()).emit(event, data);
    }
  }
};
