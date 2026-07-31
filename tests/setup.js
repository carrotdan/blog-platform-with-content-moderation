process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-min-32-chars-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-min-32-chars-long-different';
process.env.JWT_ACCESS_EXPIRE = '15m';
process.env.JWT_REFRESH_EXPIRE = '7d';
process.env.MONGO_URI = 'mongodb://localhost:27017/blog-platform-test';
process.env.AI_SERVICE_URL = 'http://localhost:8000';
process.env.AI_TIMEOUT_MS = '5000';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.PORT = '5000';
process.env.CLOUDINARY_CLOUD_NAME = 'test';
process.env.CLOUDINARY_API_KEY = 'test';
process.env.CLOUDINARY_API_SECRET = 'test';

// Mock mongoose connection for tests
const mongoose = require('mongoose');

beforeAll(async () => {
  // Connect to test database
  // await mongoose.connect(process.env.MONGO_URI);
});

afterAll(async () => {
  // await mongoose.connection.close();
});