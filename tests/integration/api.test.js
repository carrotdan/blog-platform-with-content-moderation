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
    expect(res.body.data.user.id).toBeDefined();
    expect(res.body.data.user.email).toBe('test@example.com');
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    // Password must never be exposed
    expect(res.body.data.user.password).toBeUndefined();
    user = res.body.data.user;
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

describe('Sprint 10 security fixes', () => {
  let userAToken;
  let userBToken;
  let userBId;
  let postId;
  let notificationId;

  const mintToken = (userId, role = 'USER') => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { userId, role, jti: require('crypto').randomUUID() },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );
  };

  const createUser = async (email, username) => {
    const User = mongoose.model('User');
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash('password123', 10);
    const doc = await User.create({
      email,
      username,
      password: hash,
      role: 'USER'
    });
    return doc;
  };

  beforeAll(async () => {
    const User = mongoose.model('User');

    // User A = the user created in the Auth flow tests
    const userA = await User.findOne({ email: 'test@example.com' });
    userAToken = mintToken(userA._id.toString());

    // User B
    const userB = await createUser('other@example.com', 'otheruser');
    userBToken = mintToken(userB._id.toString());
    userBId = userB._id.toString();

    // User C (non-participant)
    await createUser('third@example.com', 'thirduser');

    // User A creates a post
    const postRes = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ content_html: '<p>Sprint 10 test post</p>' });
    postId = postRes.body.data._id;
  });

  test('H25: posts are created with status PUBLISHED', async () => {
    const res = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ content_html: '<p>Published check</p>' });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('PUBLISHED');
  });

  test('H26: comments are rejected on a non-existent post', async () => {
    const fakeId = '000000000000000000000000';
    const res = await request(app)
      .post('/api/v1/comments')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ post_id: fakeId, content: 'orphan comment' });
    expect(res.status).toBe(404);
  });

  test('H26: comments are rejected on a hidden post', async () => {
    const meA = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${userAToken}`);
    const userIdA = meA.body.data.id;

    const Post = mongoose.model('Post');
    const hidden = await Post.create({
      author: userIdA,
      slug: `hidden-${Date.now()}`,
      content_json: {},
      content_html: '<p>hidden</p>',
      visibility: 'HIDDEN',
      status: 'PUBLISHED'
    });
    const res = await request(app)
      .post('/api/v1/comments')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ post_id: hidden._id.toString(), content: 'leak' });
    expect(res.status).toBe(403);
  });

  test('H24: REPOST interaction type is rejected', async () => {
    const res = await request(app)
      .post('/api/v1/interactions')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ target_id: postId, target_model: 'Post', type: 'REPOST' });
    expect(res.status).toBe(400);
  });

  test('H20: conversation deletion requires participation', async () => {
    // User A and B start a conversation, A sends a message
    await request(app)
      .post('/api/v1/messages/conversations')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ recipientId: userBId });

    const msgRes = await request(app)
      .post('/api/v1/messages/send')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ recipientId: userBId, content: 'hi' });
    expect(msgRes.status).toBe(201);
    const conversationId = msgRes.body.data.conversation_id;

    // Third user is not a participant
    const User = mongoose.model('User');
    const userC = await User.findOne({ email: 'third@example.com' });
    const userCToken = mintToken(userC._id.toString());

    const deleteRes = await request(app)
      .delete(`/api/v1/messages/${conversationId}`)
      .set('Authorization', `Bearer ${userCToken}`);
    expect(deleteRes.status).toBe(403);
  });

  test('H21: a user cannot mark another users notification as read', async () => {
    // User A follows user B so B receives a FOLLOW notification
    await request(app)
      .post('/api/v1/follows')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ following_id: userBId });

    const notifList = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${userBToken}`);
    expect(notifList.status).toBe(200);
    expect(notifList.body.data.length).toBeGreaterThan(0);
    notificationId = notifList.body.data[0]._id;

    // User A (not the recipient) must not mark it read
    const res = await request(app)
      .patch(`/api/v1/notifications/${notificationId}/read`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(res.status).toBe(403);
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

describe('Sprint 11 fixes (M16-M31, L17-L26)', () => {
  let userAToken;
  let userAId;
  let postId;

  const mintToken = (userId, role = 'USER') => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { userId, role, jti: require('crypto').randomUUID() },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );
  };

  const createUser = async (email, username) => {
    const User = mongoose.model('User');
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash('password123', 10);
    const doc = await User.create({ email, username, password: hash, role: 'USER' });
    return doc;
  };

  beforeAll(async () => {
    const userA = await createUser('sprint11a@example.com', 'sprint11a');
    userAToken = mintToken(userA._id.toString());
    userAId = userA._id.toString();

    const postRes = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ content_html: '<p>Sprint 11 post</p>' });
    postId = postRes.body.data._id;
  });

  test('M16: unknown routes return a JSON 404', async () => {
    const res = await request(app).get('/api/v1/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Route not found');
    expect(res.body.requestId).toBeDefined();
  });

  test('M25: /uploads is no longer served publicly', async () => {
    const res = await request(app).get('/uploads/media_test.png');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('M27: duplicate /moderation/report endpoint is removed', async () => {
    const res = await request(app)
      .post('/api/v1/moderation/report')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ target_id: postId, target_model: 'Post', reason: 'test' });
    expect(res.status).toBe(404);
  });

  test('M20: interaction route validates body (bad type -> 400)', async () => {
    const res = await request(app)
      .post('/api/v1/interactions')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ target_id: postId, target_model: 'Post', type: 'NOT_A_TYPE' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('M20: follow route validates body (missing following_id -> 400)', async () => {
    const res = await request(app)
      .post('/api/v1/follows')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  test('M31: liking a hidden post is rejected', async () => {
    const Post = mongoose.model('Post');
    const hidden = await Post.create({
      author: userAId,
      slug: `sprint11-hidden-${Date.now()}`,
      content_json: {},
      content_html: '<p>hidden</p>',
      visibility: 'HIDDEN',
      status: 'PUBLISHED'
    });
    const res = await request(app)
      .post('/api/v1/interactions')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ target_id: hidden._id.toString(), target_model: 'Post', type: 'LIKE' });
    expect(res.status).toBe(403);
  });

  test('M21: AI moderation fields persist on the post', async () => {
    const res = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ content_html: '<p>AI fields</p>' });
    expect(res.status).toBe(201);
    expect(res.body.data.label).toBe('NORMAL');
    expect(typeof res.body.data.spam_score).toBe('number');
    expect(typeof res.body.data.toxicity_score).toBe('number');
  });

  test('M29: duplicate conversation creation returns the same conversation', async () => {
    const userB = await createUser('sprint11b@example.com', 'sprint11b');
    const userBToken = mintToken(userB._id.toString());

    const first = await request(app)
      .post('/api/v1/messages/conversations')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ recipientId: userB._id.toString() });
    const second = await request(app)
      .post('/api/v1/messages/conversations')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ recipientId: userB._id.toString() });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body.data._id).toBe(second.body.data._id);
  });

  test('M19: getMyPosts supports pagination meta', async () => {
    const res = await request(app)
      .get('/api/v1/posts/me/posts?skip=0&limit=2')
      .set('Authorization', `Bearer ${userAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.limit).toBe(2);
    expect(typeof res.body.meta.total).toBe('number');
  });
});

