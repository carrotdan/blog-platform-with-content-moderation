const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

let io;

module.exports = {
  io: null,
  init: (server) => {
    io = socketIo(server, {
      cors: { origin: process.env.CLIENT_URL || 'http://localhost:3000' },
      pingInterval: 25000,
      pingTimeout: 20000
    });

    // Auth middleware for socket connections
    io.use((socket, next) => {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
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
