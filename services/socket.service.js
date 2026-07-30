const socketIo = require('socket.io');

let io;

module.exports = {
  io: null,
  init: (server) => {
    io = socketIo(server, {
      cors: { origin: '*' }
    });

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('join_user_room', (userId) => {
        socket.join(userId.toString());
        console.log(`User ${userId} joined room`);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });
    
    module.exports.io = io;
    return io;
  },
  
  getIO: () => {
    if (!io) {
      console.warn('Socket.io is not initialized yet!');
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
