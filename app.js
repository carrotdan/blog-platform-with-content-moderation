require('dotenv').config();
const { validateEnv } = require('./config/env');
validateEnv();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const { errorMiddleware } = require('./middlewares/error.middleware');
const routes = require('./routes');
const { swaggerUi, specs } = require('./config/swagger');
const { requestIdMiddleware, addRequestIdToLogger, errorLoggerMiddleware } = require('./middlewares/request-id.middleware');

const app = express();

// H45: rate limits are keyed on req.ip. Behind a reverse proxy (Nginx,
// Cloudflare) req.ip is the proxy IP unless trust proxy is set — every client
// would share one limit bucket and real IPs would be indistinguishable.
// Env-gated: TRUST_PROXY=1 for a single proxy hop, TRUST_PROXY=true to trust all.
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : Number(process.env.TRUST_PROXY));
}

// Middlewares
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
// H49: CLIENT_URL may be a comma-separated allow-list (e.g.
// "http://localhost:3000,http://localhost:5173"). The cors package takes a
// single origin or an array; passing the raw comma string would echo it back
// verbatim in Access-Control-Allow-Origin and break every preflight.
const allowedOrigins = String(process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length === 1
    ? allowedOrigins[0]
    : allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());
app.use(morgan('dev'));

// Request ID & Tracing
app.use(requestIdMiddleware);
app.use(addRequestIdToLogger);

// Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Blog Platform API Documentation'
}));

// Routes
app.use('/api', routes);

// M16: JSON 404 handler for unknown routes (consistent with the JSON API contract)
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    requestId: req.requestId,
    data: null
  });
});

// Error Handling
app.use(errorMiddleware);

// Database connection & Server start
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGO_URI;

const http = require('http');
const server = http.createServer(app);
const socketService = require('./services/socket.service');
socketService.init(server);

// Graceful shutdown
let isShuttingDown = false;

async function gracefulShutdown(signal) {
  if (isShuttingDown) {
    console.log('Force shutting down...');
    process.exit(1);
  }
  isShuttingDown = true;
  
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
  
  // Stop accepting new connections
  server.close(() => {
    console.log('HTTP server closed');
  });
  
  // Close Socket.io connections
  try {
    if (socketService.io) {
      socketService.io.close();
      console.log('Socket.io connections closed');
    }
  } catch (err) {
    console.error('Error closing Socket.io:', err);
  }
  
  // Close MongoDB connection
  try {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  } catch (err) {
    console.error('Error closing MongoDB:', err);
  }
  
  console.log('Graceful shutdown complete');
  process.exit(0);
}

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

async function startServer() {
  await mongoose.connect(MONGODB_URI, {
    maxPoolSize: 10,
    minPoolSize: 2,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 5000
  });
  console.log('Connected to MongoDB');
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });
}

module.exports = app;
