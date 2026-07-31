/**
 * Integration tests for critical API paths.
 * Uses mongodb-memory-server for an isolated database and mocks the AI
 * microservice so tests are deterministic and do not require the Python
 * service to be running.
 */
jest.setTimeout(120000);

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

jest.mock('../../services/ai.service', () => {
  const analyze = jest.fn().mockResolvedValue({
    spam_score: 0.05,
    toxicity_score: 0.05,
    label: 'NORMAL'
  });
  return {
    analyze,
    analyzeAsync: jest.fn().mockResolvedValue({
      spam_score: 0.05,
      toxicity_score: 0.05,
      label: 'PENDING_AI_REVIEW'
    }),
    isHealthy: jest.fn().mockResolvedValue(true),
    getCircuitBreakerState: jest.fn().mockResolvedValue({ state: 'CLOSED', failures: 0, lastFailure: 0 }),
    recordFailure: jest.fn(),
    resetCircuitBreaker: jest.fn(),
    checkAndUpdateCircuitBreaker: jest.fn().mockResolvedValue({ allowRequest: true, state: 'CLOSED' })
  };
});

// jsdom (a transitive dep of DOMPurify) uses ESM-only packages that Jest's
// CJS runtime cannot load. Mock sanitize here; real behavior is covered by
// tests/sanitize.test.js.
jest.mock('../../utils/sanitize', () => ({
  sanitizeHtml: (html) => String(html || '').replace(/<script[\s\S]*?<\/script>/gi, ''),
  sanitizeText: (text) => String(text || '').replace(/<[^>]*>/g, '')
}));

let mongoServer;
let app;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongoServer.getUri();

  // Load the Express app (does not auto-start server in test mode)
  app = require('../../app');

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 30000
  });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongoServer) await mongoServer.stop();
});

describe('Health check', () => {
  test('GET /api/health reports database and AI service status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.checks.database.status).toBe('up');
    expect(res.body.checks.aiService.status).toBe('up');
    expect(res.body.version).toBe('1.0.0');
  });
});

describe('Auth flow', () => {
  let user;

  test('POST /api/v1/auth/register creates a user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'test@example.com', password: 'password123', username: 'testuser' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBeDefined();
    expect(res.body.data.email).toBe('test@example.com');
    // Password must never be exposed
    expect(res.body.data.password).toBeUndefined();
    user = res.body.data;
  });

  test('POST /api/v1/auth/register rejects duplicate email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'test@example.com', password: 'password123', username: 'otheruser' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/v1/auth/register rejects invalid input', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'short', username: 'x' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });

  test('POST /api/v1/auth/login returns tokens', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.email).toBe('test@example.com');
  });

  test('POST /api/v1/auth/login rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'wrong-password' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/v1/auth/refresh rotates the refresh token', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });
    const { refreshToken } = login.body.data;

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.refreshToken).not.toBe(refreshToken);
  });
});

describe('Post flow', () => {
  let authToken;
  let postId;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });
    authToken = res.body.data.accessToken;
  });

  test('POST /api/v1/posts requires authentication', async () => {
    const res = await request(app)
      .post('/api/v1/posts')
      .send({ content_html: '<p>hello</p>' });
    expect(res.status).toBe(401);
  });

  test('POST /api/v1/posts creates a post with auth', async () => {
    const res = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ content_html: '<p>Hello world</p>', tags: 'intro' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data._id).toBeDefined();
    expect(res.body.data.content_html).toBe('<p>Hello world</p>');
    postId = res.body.data._id;
  });

  test('POST /api/v1/posts sanitizes malicious HTML', async () => {
    const res = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ content_html: '<p>safe</p><script>alert(1)</script>' });
    expect(res.status).toBe(201);
    expect(res.body.data.content_html).not.toContain('<script>');
  });

  test('GET /api/v1/posts lists public posts for guests', async () => {
    const res = await request(app).get('/api/v1/posts');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.meta.isLimited).toBe(true);
  });

  test('GET /api/v1/posts/:id returns a single post', async () => {
    const res = await request(app).get(`/api/v1/posts/${postId}`);
    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(postId);
  });

  test('GET /api/v1/posts/:id rejects invalid ObjectId', async () => {
    const res = await request(app).get('/api/v1/posts/not-an-object-id');
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('PUT /api/v1/posts/:id updates a post', async () => {
    const res = await request(app)
      .put(`/api/v1/posts/${postId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ content_html: '<p>Updated content</p>' });
    expect(res.status).toBe(200);
    expect(res.body.data.content_html).toBe('<p>Updated content</p>');
  });

  test('DELETE /api/v1/posts/:id deletes a post', async () => {
    const res = await request(app)
      .delete(`/api/v1/posts/${postId}`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('Security headers', () => {
  test('GET /api/health includes Helmet security headers', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-frame-options']).toBeDefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['referrer-policy']).toBeDefined();
  });
});

describe('Rate limiting', () => {
  test('auth endpoints are rate limited', async () => {
    const attempts = [];
    for (let i = 0; i < 11; i++) {
      attempts.push(
        request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'nobody@example.com', password: 'wrong' })
      );
    }
    const responses = await Promise.all(attempts);
    const limited = responses.find(r => r.status === 429);
    expect(limited).toBeDefined();
  });
});
