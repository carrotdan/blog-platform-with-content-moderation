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
  sanitizeHtml: (html) => String(html || '').replace(/<script[\s\S]*?<\/script>/gi, '')
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

  test('H31: refresh works with only the httpOnly cookie (no body token)', async () => {
    const login = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });
    expect(login.status).toBe(200);
    const cookies = login.headers['set-cookie'];
    expect(Array.isArray(cookies)).toBe(true);

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', cookies);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
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

describe('Sprint 12 fixes (C20-C25)', () => {
  let userAToken;
  let userAId;

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

  const createFlaggedPost = async (token, content, label = 'SPAM') => {
    const aiService = require('../../services/ai.service');
    aiService.analyze.mockResolvedValueOnce({
      spam_score: label === 'SPAM' ? 0.9 : 0.1,
      toxicity_score: label === 'TOXIC' ? 0.9 : 0.1,
      label
    });
    const res = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ content_html: `<p>${content}</p>` });
    return res;
  };

  beforeAll(async () => {
    const userA = await createUser('sprint12a@example.com', 'sprint12a');
    userAToken = mintToken(userA._id.toString());
    userAId = userA._id.toString();
  });

  test('C23: createPost persists the AI moderation result', async () => {
    const res = await createFlaggedPost(userAToken, 'flagged spam', 'SPAM');
    expect(res.status).toBe(201);
    expect(res.body.data.label).toBe('SPAM');
    expect(res.body.data.spam_score).toBe(0.9);
    expect(res.body.data.visibility).toBe('HIDDEN');
  });

  test('C21: a PRIVATE post is not readable by other users', async () => {
    const Post = mongoose.model('Post');
    const privatePost = await Post.create({
      author: userAId,
      slug: `sprint12-private-${Date.now()}`,
      content_json: {},
      content_html: '<p>secret</p>',
      visibility: 'PRIVATE',
      status: 'PUBLISHED'
    });
    const other = await createUser('sprint12b@example.com', 'sprint12b');
    const otherToken = mintToken(other._id.toString());

    const otherRes = await request(app)
      .get(`/api/v1/posts/${privatePost._id.toString()}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(otherRes.status).toBe(404);

    const ownerRes = await request(app)
      .get(`/api/v1/posts/${privatePost._id.toString()}`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(ownerRes.status).toBe(200);
  });

  test('C22: public profile only exposes PUBLIC posts', async () => {
    const Post = mongoose.model('Post');
    await Post.create({
      author: userAId,
      slug: `sprint12-pub-${Date.now()}`,
      content_json: {},
      content_html: '<p>public</p>',
      visibility: 'PUBLIC',
      status: 'PUBLISHED'
    });
    await Post.create({
      author: userAId,
      slug: `sprint12-priv-${Date.now()}`,
      content_json: {},
      content_html: '<p>private</p>',
      visibility: 'PRIVATE',
      status: 'PUBLISHED'
    });
    await Post.create({
      author: userAId,
      slug: `sprint12-hid-${Date.now()}`,
      content_json: {},
      content_html: '<p>hidden</p>',
      visibility: 'HIDDEN',
      status: 'PUBLISHED'
    });

    const res = await request(app).get('/api/v1/users/sprint12a');
    expect(res.status).toBe(200);
    expect(res.body.data.posts.length).toBeGreaterThan(0);
    expect(res.body.data.posts.every(p => p.visibility === 'PUBLIC')).toBe(true);
  });

  test('C24: a user cannot appeal another user content', async () => {
    const owner = await createUser('sprint12owner@example.com', 'sprint12owner');
    const ownerToken = mintToken(owner._id.toString());

    const flagged = await createFlaggedPost(ownerToken, 'owners spam', 'SPAM');
    expect(flagged.status).toBe(201);
    const flaggedPostId = flagged.body.data._id;

    const res = await request(app)
      .post('/api/v1/appeals')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ target_id: flaggedPostId, target_model: 'Post', reason: 'not mine' });
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/own content/i);
  });

  test('C20+C24: owner appeal is created with server-derived label and approval succeeds', async () => {
    const owner = await createUser('sprint12owner2@example.com', 'sprint12owner2');
    const ownerToken = mintToken(owner._id.toString());

    const flagged = await createFlaggedPost(ownerToken, 'appeal me', 'SPAM');
    const flaggedPostId = flagged.body.data._id;

    // Attacker-supplied ai_label is ignored -> server derives SPAM from the queue
    const appealRes = await request(app)
      .post('/api/v1/appeals')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        target_id: flaggedPostId,
        target_model: 'Post',
        reason: 'it is not spam',
        ai_label: 'TOXIC',
        ai_spam_score: 0,
        ai_toxicity_score: 1
      });
    expect(appealRes.status).toBe(201);
    expect(appealRes.body.data.ai_label).toBe('SPAM');
    expect(appealRes.body.data.ai_spam_score).toBe(0.9);
    const appealId = appealRes.body.data._id;

    // C20: approval no longer crashes (UNHIDE now in ModerationLog.action enum)
    const adminToken = mintToken(owner._id.toString(), 'ADMIN');
    const approveRes = await request(app)
      .put(`/api/v1/appeals/${appealId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ admin_note: 'ok' });
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.status).toBe('APPROVED');

    // Content is restored to PUBLIC
    const postRes = await request(app)
      .get(`/api/v1/posts/${flaggedPostId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(postRes.status).toBe(200);
    expect(postRes.body.data.visibility).toBe('PUBLIC');
  });

  test('C25: admin user listing does not leak refresh tokens', async () => {
    const User = mongoose.model('User');
    const victim = await createUser('sprint12victim@example.com', 'sprint12victim');

    // Give the victim a stored refresh token (simulates a login session)
    const crypto = require('crypto');
    victim.refreshTokens = [{
      tokenHash: crypto.createHash('sha256').update('fake-token').digest('hex'),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }];
    await victim.save();

    const adminToken = mintToken(victim._id.toString(), 'ADMIN');
    const res = await request(app)
      .get('/api/v1/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    res.body.data.forEach(u => {
      expect(u.refreshTokens).toBeUndefined();
      expect(u.password).toBeUndefined();
    });
  });
});

describe('Sprint 13 fixes (H31-H41)', () => {
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

  const createFlaggedPost = async (token, content, label = 'SPAM') => {
    const aiService = require('../../services/ai.service');
    aiService.analyze.mockResolvedValueOnce({
      spam_score: label === 'SPAM' ? 0.9 : 0.1,
      toxicity_score: label === 'TOXIC' ? 0.9 : 0.1,
      label
    });
    const res = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ content_html: `<p>${content}</p>` });
    return res;
  };

  test('H32: a title-only update re-runs AI moderation', async () => {
    const aiService = require('../../services/ai.service');
    const owner = await createUser('sprint13a@example.com', 'sprint13a');
    const token = mintToken(owner._id.toString());

    const created = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ content_html: '<p>clean body</p>', title: 'Safe title' });
    expect(created.status).toBe(201);

    aiService.analyze.mockResolvedValueOnce({ spam_score: 0.9, toxicity_score: 0.1, label: 'SPAM' });
    const res = await request(app)
      .put(`/api/v1/posts/${created.body.data._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Toxic new title' });
    expect(res.status).toBe(200);
    expect(res.body.data.label).toBe('SPAM');
    expect(res.body.data.visibility).toBe('HIDDEN');
  });

  test('H33: editing a hidden post does not auto-unhide it', async () => {
    const owner = await createUser('sprint13b@example.com', 'sprint13b');
    const token = mintToken(owner._id.toString());

    const hidden = await createFlaggedPost(token, 'initial spam', 'SPAM');
    expect(hidden.body.data.visibility).toBe('HIDDEN');

    const res = await request(app)
      .put(`/api/v1/posts/${hidden.body.data._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content_html: '<p>totally clean now</p>' });
    expect(res.status).toBe(200);
    expect(res.body.data.visibility).toBe('HIDDEN');
  });

  test('H34: MODERATOR cannot ban or change roles but can review content', async () => {
    const target = await createUser('sprint13c@example.com', 'sprint13c');
    const mod = await createUser('sprint13mod@example.com', 'sprint13mod');
    const modToken = mintToken(mod._id.toString(), 'MODERATOR');

    const banRes = await request(app)
      .put(`/api/v1/admin/users/${target._id.toString()}/ban`)
      .set('Authorization', `Bearer ${modToken}`);
    expect(banRes.status).toBe(403);

    const roleRes = await request(app)
      .put(`/api/v1/admin/users/${target._id.toString()}/role`)
      .set('Authorization', `Bearer ${modToken}`)
      .send({ role: 'ADMIN' });
    expect(roleRes.status).toBe(403);

    const Post = mongoose.model('Post');
    const post = await Post.create({
      author: target._id,
      slug: `sprint13-mod-post-${Date.now()}`,
      content_json: {},
      content_html: '<p>x</p>',
      visibility: 'PUBLIC',
      status: 'PUBLISHED'
    });
    const hideRes = await request(app)
      .put(`/api/v1/admin/posts/${post._id.toString()}/hide`)
      .set('Authorization', `Bearer ${modToken}`);
    expect(hideRes.status).toBe(200);
  });

  test('H35: a banned admin cannot list reports', async () => {
    const bannedAdmin = await createUser('sprint13bannedadmin@example.com', 'bannedadmin');
    bannedAdmin.status = 'BANNED';
    await bannedAdmin.save();
    const bannedAdminToken = mintToken(bannedAdmin._id.toString(), 'ADMIN');

    const res = await request(app)
      .get('/api/v1/reports')
      .set('Authorization', `Bearer ${bannedAdminToken}`);
    expect(res.status).toBe(403);
  });

  test('H36: comments under a PRIVATE post are not publicly readable', async () => {
    const owner = await createUser('sprint13priv@example.com', 'sprint13priv');
    const ownerToken = mintToken(owner._id.toString());
    const Post = mongoose.model('Post');
    const privatePost = await Post.create({
      author: owner._id,
      slug: `sprint13-priv-post-${Date.now()}`,
      content_json: {},
      content_html: '<p>private</p>',
      visibility: 'PRIVATE',
      status: 'PUBLISHED'
    });

    const commentRes = await request(app)
      .post('/api/v1/comments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ post_id: privatePost._id.toString(), content: 'owner comment' });
    expect(commentRes.status).toBe(201);

    const guestRes = await request(app)
      .get(`/api/v1/comments/post/${privatePost._id.toString()}`);
    expect(guestRes.status).toBe(404);

    const ownerRes = await request(app)
      .get(`/api/v1/comments/post/${privatePost._id.toString()}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(ownerRes.status).toBe(200);
  });

  test('H37: a reply to a hidden comment is rejected', async () => {
    const owner = await createUser('sprint13h37@example.com', 'sprint13h37');
    const ownerToken = mintToken(owner._id.toString());
    const Post = mongoose.model('Post');
    const post = await Post.create({
      author: owner._id,
      slug: `sprint13-h37-post-${Date.now()}`,
      content_json: {},
      content_html: '<p>x</p>',
      visibility: 'PUBLIC',
      status: 'PUBLISHED'
    });
    const Comment = mongoose.model('Comment');
    const hiddenParent = await Comment.create({
      post_id: post._id,
      author: owner._id,
      content: 'hidden parent',
      is_hidden: true
    });

    const res = await request(app)
      .post('/api/v1/comments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ post_id: post._id.toString(), parent_id: hiddenParent._id.toString(), content: 'reply' });
    expect(res.status).toBe(400);
  });

  test('H38: cannot message yourself or a non-existent user', async () => {
    const user = await createUser('sprint13msg@example.com', 'sprint13msg');
    const token = mintToken(user._id.toString());

    const selfRes = await request(app)
      .post('/api/v1/messages/send')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipientId: user._id.toString(), content: 'hi me' });
    expect(selfRes.status).toBe(400);

    const ghostRes = await request(app)
      .post('/api/v1/messages/send')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipientId: '000000000000000000000000', content: 'hi ghost' });
    expect(ghostRes.status).toBe(404);

    const convRes = await request(app)
      .post('/api/v1/messages/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipientId: user._id.toString() });
    expect(convRes.status).toBe(400);
  });

  test('H39: getMessages is paginated and oldest-first', async () => {
    const a = await createUser('sprint13ma@example.com', 'sprint13ma');
    const b = await createUser('sprint13mb@example.com', 'sprint13mb');
    const tokenA = mintToken(a._id.toString());
    const tokenB = mintToken(b._id.toString());

    const conv = await request(app)
      .post('/api/v1/messages/conversations')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ recipientId: b._id.toString() });
    expect(conv.status).toBe(200);
    const convId = conv.body.data._id;

    await request(app)
      .post('/api/v1/messages/send')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ recipientId: b._id.toString(), content: 'first' });
    await request(app)
      .post('/api/v1/messages/send')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ recipientId: b._id.toString(), content: 'second' });
    await request(app)
      .post('/api/v1/messages/send')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ recipientId: a._id.toString(), content: 'third' });

    const res = await request(app)
      .get(`/api/v1/messages/${convId}?skip=0&limit=2`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.meta.limit).toBe(2);
    expect(res.body.data.length).toBe(2);
    expect(res.body.data[0].content).toBe('first');
    expect(res.body.data[1].content).toBe('second');
  });
});

describe('Sprint 14 fixes (M32-M42)', () => {
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

  const createFlaggedPost = async (token, content, label = 'SPAM') => {
    const aiService = require('../../services/ai.service');
    aiService.analyze.mockResolvedValueOnce({
      spam_score: label === 'SPAM' ? 0.9 : 0.1,
      toxicity_score: label === 'TOXIC' ? 0.9 : 0.1,
      label
    });
    const res = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ content_html: `<p>${content}</p>` });
    return res;
  };

  test('M32: guest feed window cannot reach beyond the first 5 posts', async () => {
    const owner = await createUser('m32@example.com', 'm32user');
    const token = mintToken(owner._id.toString());
    for (let i = 0; i < 7; i++) {
      const res = await request(app)
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({ content_html: `<p>m32 post ${i}</p>` });
      expect(res.status).toBe(201);
    }

    // skip=5&limit=5 used to return posts at index 5-9 (bypassing the cap)
    const res = await request(app).get('/api/v1/posts?skip=5&limit=5');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
    expect(res.body.meta.isLimited).toBe(true);
    expect(res.body.meta.total).toBeLessThanOrEqual(5);

    // a window straddling the cap is truncated to stay within the first 5
    const straddle = await request(app).get('/api/v1/posts?skip=3&limit=5');
    expect(straddle.status).toBe(200);
    expect(straddle.body.data.length).toBeLessThanOrEqual(2);
    expect(straddle.body.meta.limit).toBe(2);
  });

  test('M33: guest profile posts are capped to the first 3 regardless of skip', async () => {
    const owner = await createUser('m33@example.com', 'm33user');
    const token = mintToken(owner._id.toString());
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${token}`)
        .send({ content_html: `<p>m33 post ${i}</p>` });
    }

    // arbitrary skip used to enumerate every post via slice() after the query
    const res = await request(app).get('/api/v1/users/m33user?skip=100&limit=20');
    expect(res.status).toBe(200);
    expect(res.body.data.posts.length).toBeLessThanOrEqual(3);
    expect(res.body.data.meta.isLimited).toBe(true);
  });

  test('M34: stored refresh-token expiry follows JWT_REFRESH_EXPIRE', async () => {
    const authService = require('../../services/auth.service');
    const User = mongoose.model('User');
    const user = await createUser('m34@example.com', 'm34user');

    const original = process.env.JWT_REFRESH_EXPIRE;
    process.env.JWT_REFRESH_EXPIRE = '1d';
    try {
      await authService.login('m34@example.com', 'password123');
      const fresh = await User.findOne({ email: 'm34@example.com' }).select('+refreshTokens');
      const stored = fresh.refreshTokens[fresh.refreshTokens.length - 1];
      const diffMs = stored.expiresAt.getTime() - Date.now();
      expect(diffMs).toBeGreaterThan(23 * 60 * 60 * 1000);
      expect(diffMs).toBeLessThan(25 * 60 * 60 * 1000);
    } finally {
      if (original !== undefined) process.env.JWT_REFRESH_EXPIRE = original;
      else delete process.env.JWT_REFRESH_EXPIRE;
    }
  });

  test('M35: register/login treat emails case-insensitively', async () => {
    const authService = require('../../services/auth.service');
    const User = mongoose.model('User');

    await authService.register({ email: '  MixedCase@Example.com ', password: 'password123', username: 'm35user' });

    // login with a differently-cased/padded email resolves to the same account
    const result = await authService.login('mixedcase@example.com', 'password123');
    expect(result.user.email).toBe('mixedcase@example.com');

    // only one account was created
    const count = await User.countDocuments({ email: 'mixedcase@example.com' });
    expect(count).toBe(1);
  });

  test('M36: usernames are restricted to [a-zA-Z0-9_]', async () => {
    const { registerSchema, updateProfileSchema } = require('../../validators/schemas');

    // register route schema rejects hostile usernames
    expect(registerSchema.safeParse({ body: { email: 'a@b.com', password: 'password123', username: '<img src=x onerror=alert(1)>' } }).success).toBe(false);
    expect(registerSchema.safeParse({ body: { email: 'a@b.com', password: 'password123', username: 'valid_name' } }).success).toBe(true);
    expect(updateProfileSchema.safeParse({ body: { username: 'bad user!' } }).success).toBe(false);

    // profile update endpoint (no rate limiter) enforces it too
    const user = await createUser('m36@example.com', 'm36user');
    const token = mintToken(user._id.toString());
    const res = await request(app)
      .put('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: '<script>alert(1)</script>' });
    expect(res.status).toBe(400);
  });

  test('M37: deleting a post cascades comments, interactions, queue, reports, appeals', async () => {
    const owner = await createUser('m37a@example.com', 'm37a');
    const other = await createUser('m37b@example.com', 'm37b');
    const token = mintToken(owner._id.toString());
    const otherToken = mintToken(other._id.toString());

    const created = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ content_html: '<p>m37 post</p>' });
    const postId = created.body.data._id;

    const commentRes = await request(app)
      .post('/api/v1/comments')
      .set('Authorization', `Bearer ${token}`)
      .send({ post_id: postId, content: 'a comment' });
    expect(commentRes.status).toBe(201);
    const commentId = commentRes.body.data._id;

    await request(app)
      .post('/api/v1/interactions')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ target_id: postId, target_model: 'Post', type: 'LIKE' });

    const reportRes = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ target_id: postId, target_model: 'Post', reason: 'spam' });
    expect(reportRes.status).toBe(201);

    const ModerationQueue = mongoose.model('ModerationQueue');
    const Appeal = mongoose.model('Appeal');
    await ModerationQueue.create({ target_id: postId, target_model: 'Post', target_type: 'SPAM', reason: 'x', status: 'PENDING' });
    await Appeal.create({ user_id: owner._id, target_id: postId, target_model: 'Post', ai_label: 'SPAM', reason: 'not spam', status: 'PENDING' });

    const del = await request(app)
      .delete(`/api/v1/posts/${postId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);

    const Post = mongoose.model('Post');
    const Comment = mongoose.model('Comment');
    const Interaction = mongoose.model('Interaction');
    const Report = mongoose.model('Report');

    expect(await Post.findById(postId)).toBeNull();
    expect(await Comment.countDocuments({ post_id: postId })).toBe(0);
    expect(await Interaction.countDocuments({ target_model: 'Post', target_id: postId })).toBe(0);
    expect(await Interaction.countDocuments({ target_model: 'Comment', target_id: commentId })).toBe(0);
    expect(await ModerationQueue.countDocuments({ target_model: 'Post', target_id: postId })).toBe(0);
    expect(await Report.countDocuments({ target_model: 'Post', target_id: postId })).toBe(0);
    expect(await Appeal.countDocuments({ target_model: 'Post', target_id: postId })).toBe(0);
  });

  test('M38: report validates target existence and blocks self/duplicate reports', async () => {
    const owner = await createUser('m38a@example.com', 'm38a');
    const other = await createUser('m38b@example.com', 'm38b');
    const ownerToken = mintToken(owner._id.toString());
    const otherToken = mintToken(other._id.toString());

    const missing = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ target_id: '000000000000000000000000', target_model: 'Post', reason: 'x' });
    expect(missing.status).toBe(404);

    const ownPost = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ content_html: '<p>m38 own</p>' });
    const self = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ target_id: ownPost.body.data._id, target_model: 'Post', reason: 'myself' });
    expect(self.status).toBe(400);

    const first = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ target_id: ownPost.body.data._id, target_model: 'Post', reason: 'first' });
    expect(first.status).toBe(201);

    const dup = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ target_id: ownPost.body.data._id, target_model: 'Post', reason: 'second' });
    expect(dup.status).toBe(400);
  });

  test('M39: cannot follow a non-existent user', async () => {
    const user = await createUser('m39@example.com', 'm39user');
    const token = mintToken(user._id.toString());
    const res = await request(app)
      .post('/api/v1/follows')
      .set('Authorization', `Bearer ${token}`)
      .send({ following_id: '000000000000000000000000' });
    expect(res.status).toBe(404);
  });

  test('M40: an empty message is rejected', async () => {
    const a = await createUser('m40a@example.com', 'm40a');
    const b = await createUser('m40b@example.com', 'm40b');
    const tokenA = mintToken(a._id.toString());

    const res = await request(app)
      .post('/api/v1/messages/send')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ recipientId: b._id.toString(), content: '   ' });
    expect(res.status).toBe(400);
  });

  test('M41: moderation queue populates targets in batch', async () => {
    const owner = await createUser('m41@example.com', 'm41user');
    const modToken = mintToken(owner._id.toString(), 'MODERATOR');

    const flagged1 = await createFlaggedPost(modToken, 'm41 spam one', 'SPAM');
    const flagged2 = await createFlaggedPost(modToken, 'm41 spam two', 'SPAM');
    expect(flagged1.status).toBe(201);
    expect(flagged2.status).toBe(201);

    const res = await request(app)
      .get('/api/v1/moderation/queue')
      .set('Authorization', `Bearer ${modToken}`);
    expect(res.status).toBe(200);
    const populatedIds = new Set(
      res.body.data.filter(i => i.target_id && i.target_id._id).map(i => i.target_id._id.toString())
    );
    expect(populatedIds.has(flagged1.body.data._id)).toBe(true);
    expect(populatedIds.has(flagged2.body.data._id)).toBe(true);
  });

  test('M42: admin user/violation listings are paginated', async () => {
    const admin = await createUser('m42admin@example.com', 'm42admin');
    const adminToken = mintToken(admin._id.toString(), 'ADMIN');

    const usersRes = await request(app)
      .get('/api/v1/admin/users?skip=0&limit=1')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(usersRes.status).toBe(200);
    expect(usersRes.body.data.length).toBeLessThanOrEqual(1);
    expect(typeof usersRes.body.meta.total).toBe('number');
    expect(usersRes.body.meta.limit).toBe(1);

    const violRes = await request(app)
      .get('/api/v1/admin/violations?skip=0&limit=1')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(violRes.status).toBe(200);
    expect(violRes.body.data.length).toBeLessThanOrEqual(1);
    expect(typeof violRes.body.meta.total).toBe('number');
  });
});

describe('Sprint 15 fixes (L27-L32)', () => {
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

  test('L27: dead code is removed', () => {
    const sanitize = require('../../utils/sanitize');
    expect(sanitize.sanitizeText).toBeUndefined();
    expect(sanitize.sanitizeHtml).toBeDefined();

    const userController = require('../../controllers/user.controller');
    expect(userController.register).toBeUndefined();
    expect(userController.login).toBeUndefined();
    expect(userController.refreshToken).toBeUndefined();
    expect(userController.logout).toBeDefined();
    expect(userController.updateProfile).toBeDefined();
    expect(userController.getMe).toBeDefined();
    expect(userController.getPublicProfile).toBeDefined();
    expect(userController.getBookmarks).toBeDefined();
  });

  test('L28: swagger Notification.entity_model enum includes User', () => {
    const { specs } = require('../../config/swagger');
    const entityModel = specs.components.schemas.Notification.properties.entity_model.enum;
    expect(entityModel).toEqual(['Post', 'Comment', 'User', 'Appeal']);
  });

  test('L29: repeated edits of a flagged post do not duplicate moderation-queue entries', async () => {
    const owner = await createUser('l29@example.com', 'l29user');
    const aiService = require('../../services/ai.service');
    const postService = require('../../services/post.service');

    // Exercised at the service level (not HTTP) to stay clear of the shared
    // content-create rate limiter; the queue upsert is what L29 covers.
    aiService.analyze.mockResolvedValueOnce({ spam_score: 0.9, toxicity_score: 0.1, label: 'SPAM' });
    const created = await postService.createPost(owner._id, { content_html: '<p>l29 initial spam</p>', content_json: {} });
    const postId = created._id;

    aiService.analyze.mockResolvedValueOnce({ spam_score: 0.9, toxicity_score: 0.1, label: 'SPAM' });
    await postService.updatePost(postId, { content_html: '<p>l29 still spam</p>' }, owner._id);

    aiService.analyze.mockResolvedValueOnce({ spam_score: 0.9, toxicity_score: 0.1, label: 'SPAM' });
    await postService.updatePost(postId, { content_html: '<p>l29 spam again</p>' }, owner._id);

    const ModerationQueue = mongoose.model('ModerationQueue');
    const count = await ModerationQueue.countDocuments({
      target_model: 'Post',
      target_id: postId,
      status: 'PENDING'
    });
    expect(count).toBe(1);
  });

  test('L31: share counts exclude hidden/private reposts', async () => {
    const author = await createUser('l31a@example.com', 'l31a');
    const reposter = await createUser('l31b@example.com', 'l31b');
    const authorToken = mintToken(author._id.toString());
    const Post = mongoose.model('Post');

    const original = await Post.create({
      author: author._id,
      slug: `l31-original-${Date.now()}`,
      content_json: {},
      content_html: '<p>L31 original</p>',
      visibility: 'PUBLIC',
      status: 'PUBLISHED'
    });
    const postId = original._id;

    // A PUBLIC repost counts as a share
    await Post.create({
      author: reposter._id,
      slug: `l31-public-repost-${Date.now()}`,
      content_json: {},
      content_html: '<p>public repost</p>',
      visibility: 'PUBLIC',
      status: 'PUBLISHED',
      original_post: postId
    });

    // A HIDDEN (moderated) repost of the same post must not be counted
    await Post.create({
      author: reposter._id,
      slug: `l31-hidden-repost-${Date.now()}`,
      content_json: {},
      content_html: '<p>hidden repost</p>',
      visibility: 'HIDDEN',
      status: 'PUBLISHED',
      original_post: postId
    });

    const res = await request(app)
      .get(`/api/v1/posts/${postId.toString()}`)
      .set('Authorization', `Bearer ${authorToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.sharesCount).toBe(1);
  });

  test('L31: bookmark list total excludes hidden targets', async () => {
    const user = await createUser('l31c@example.com', 'l31c');
    const token = mintToken(user._id.toString());
    const Post = mongoose.model('Post');

    const p1 = await Post.create({
      author: user._id,
      slug: `l31-bm-1-${Date.now()}`,
      content_json: {},
      content_html: '<p>l31 visible bookmark</p>',
      visibility: 'PUBLIC',
      status: 'PUBLISHED'
    });
    const p2 = await Post.create({
      author: user._id,
      slug: `l31-bm-2-${Date.now()}`,
      content_json: {},
      content_html: '<p>l31 hidden bookmark</p>',
      visibility: 'PUBLIC',
      status: 'PUBLISHED'
    });

    for (const pid of [p1._id.toString(), p2._id.toString()]) {
      const bm = await request(app)
        .post('/api/v1/interactions')
        .set('Authorization', `Bearer ${token}`)
        .send({ target_id: pid, target_model: 'Post', type: 'BOOKMARK' });
      expect(bm.status).toBe(200);
    }

    await Post.findByIdAndUpdate(p2._id, { visibility: 'HIDDEN' });

    const res = await request(app)
      .get('/api/v1/users/me/bookmarks')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.meta.total).toBe(1);
    const ids = res.body.data.map(p => p._id);
    expect(ids).toContain(p1._id.toString());
    expect(ids).not.toContain(p2._id.toString());
  });
});

describe('Sprint 16 fixes (C26-C27)', () => {
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

  test('C26: reposting a HIDDEN post is rejected with 404 and creates no repost', async () => {
    const author = await createUser('c26a@example.com', 'c26a');
    const reposter = await createUser('c26b@example.com', 'c26b');
    const reposterToken = mintToken(reposter._id.toString());
    const Post = mongoose.model('Post');

    // A HIDDEN (AI-flagged / moderated) post whose id the attacker has obtained
    const hidden = await Post.create({
      author: author._id,
      slug: `c26-hidden-${Date.now()}`,
      content_json: {},
      content_html: '<p>hidden toxic content</p>',
      visibility: 'HIDDEN',
      status: 'PUBLISHED'
    });

    const res = await request(app)
      .post(`/api/v1/posts/${hidden._id.toString()}/repost`)
      .set('Authorization', `Bearer ${reposterToken}`)
      .send({});
    expect(res.status).toBe(404);

    // No repost row may reference the hidden post
    const repostCount = await Post.countDocuments({
      original_post: hidden._id,
      author: reposter._id
    });
    expect(repostCount).toBe(0);
  });

  test('C26: a PUBLIC post can still be reposted normally', async () => {
    const author = await createUser('c26c@example.com', 'c26c');
    const reposter = await createUser('c26d@example.com', 'c26d');
    const reposterToken = mintToken(reposter._id.toString());
    const Post = mongoose.model('Post');

    const pub = await Post.create({
      author: author._id,
      slug: `c26-public-${Date.now()}`,
      content_json: {},
      content_html: '<p>public post</p>',
      visibility: 'PUBLIC',
      status: 'PUBLISHED'
    });

    const res = await request(app)
      .post(`/api/v1/posts/${pub._id.toString()}/repost`)
      .set('Authorization', `Bearer ${reposterToken}`)
      .send({});
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

describe('Sprint 17 fixes (H42-H49)', () => {
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

  test('H42: GET /comments/:id enforces parent-post visibility', async () => {
    const owner = await createUser('h42owner@example.com', 'h42owner');
    const other = await createUser('h42other@example.com', 'h42other');
    const ownerToken = mintToken(owner._id.toString());
    const otherToken = mintToken(other._id.toString());
    const Post = mongoose.model('Post');
    const Comment = mongoose.model('Comment');

    const privatePost = await Post.create({
      author: owner._id,
      slug: `h42-priv-${Date.now()}`,
      content_json: {},
      content_html: '<p>private</p>',
      visibility: 'PRIVATE',
      status: 'PUBLISHED'
    });
    const comment = await Comment.create({
      post_id: privatePost._id,
      author: owner._id,
      content: 'private comment',
      is_hidden: false
    });
    const commentId = comment._id.toString();

    // Other authenticated user (not the author) → 404
    const otherRes = await request(app)
      .get(`/api/v1/comments/${commentId}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(otherRes.status).toBe(404);

    // Guest → 404
    const guestRes = await request(app).get(`/api/v1/comments/${commentId}`);
    expect(guestRes.status).toBe(404);

    // Author of the private post → 200
    const ownerRes = await request(app)
      .get(`/api/v1/comments/${commentId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(ownerRes.status).toBe(200);
  });

  test('H43: reusing a rotated refresh token revokes the family', async () => {
    // Exercised at the service level: the HTTP auth routes share a 10/15min
    // rate limiter across the whole suite. The atomic rotation lives in
    // authService.refreshToken, which is what H43 fixes.
    await createUser('h43race@example.com', 'h43race');
    const authService = require('../../services/auth.service');
    const { refreshToken: rt } = await authService.login('h43race@example.com', 'password123');

    // First refresh rotates the token
    const r1 = await authService.refreshToken(rt);
    expect(r1.refreshToken).not.toBe(rt);

    // Reusing the OLD token must now be rejected (reuse detection)
    await expect(authService.refreshToken(rt)).rejects.toThrow('Invalid or expired refresh token');

    // And the family is revoked: even the freshly-rotated token is dead
    await expect(authService.refreshToken(r1.refreshToken)).rejects.toThrow('Invalid or expired refresh token');
  });

  test('H46: reply to a non-existent parent returns 404 (no orphan comment)', async () => {
    const author = await createUser('h46author@example.com', 'h46author');
    const token = mintToken(author._id.toString());
    const Post = mongoose.model('Post');
    const post = await Post.create({
      author: author._id,
      slug: `h46-post-${Date.now()}`,
      content_json: {},
      content_html: '<p>x</p>',
      visibility: 'PUBLIC',
      status: 'PUBLISHED'
    });

    const res = await request(app)
      .post('/api/v1/comments')
      .set('Authorization', `Bearer ${token}`)
      .send({ post_id: post._id.toString(), parent_id: '000000000000000000000000', content: 'orphan reply' });
    expect(res.status).toBe(404);

    // No top-level comment may have been created either
    const Comment = mongoose.model('Comment');
    const count = await Comment.countDocuments({ post_id: post._id });
    expect(count).toBe(0);
  });

  test('H48: resolving a report with an invalid status is rejected (400)', async () => {
    const admin = await createUser('h48admin@example.com', 'h48admin');
    await mongoose.model('User').findByIdAndUpdate(admin._id, { role: 'ADMIN' });
    const adminToken = mintToken(admin._id.toString(), 'ADMIN');

    const reporter = await createUser('h48rep@example.com', 'h48rep');
    const reporterToken = mintToken(reporter._id.toString());
    const Post = mongoose.model('Post');
    const post = await Post.create({
      author: admin._id,
      slug: `h48-post-${Date.now()}`,
      content_json: {},
      content_html: '<p>x</p>',
      visibility: 'PUBLIC',
      status: 'PUBLISHED'
    });

    const reportRes = await request(app)
      .post('/api/v1/reports')
      .set('Authorization', `Bearer ${reporterToken}`)
      .send({ target_id: post._id.toString(), target_model: 'Post', reason: 'spam' });
    expect(reportRes.status).toBe(201);
    const reportId = reportRes.body.data._id;

    // Unknown status → 400 (previously any string was accepted)
    const badRes = await request(app)
      .put(`/api/v1/reports/${reportId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'DELETE_EVERYTHING' });
    expect(badRes.status).toBe(400);

    // Valid DISMISSED → 200
    const okRes = await request(app)
      .put(`/api/v1/reports/${reportId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'DISMISSED' });
    expect(okRes.status).toBe(200);
    expect(okRes.body.data.status).toBe('DISMISSED');
  });

  test('H47: editing a flagged post does not double-count violations', async () => {
    const author = await createUser('h47author@example.com', 'h47author');
    const aiService = require('../../services/ai.service');
    const postService = require('../../services/post.service');

    // Create as SPAM → +1 spam violation
    aiService.analyze.mockResolvedValueOnce({ spam_score: 0.9, toxicity_score: 0.1, label: 'SPAM' });
    const created = await postService.createPost(author._id, { content_html: '<p>spam 1</p>', content_json: {} });

    // Edit, still SPAM → must NOT increment again (label unchanged)
    aiService.analyze.mockResolvedValueOnce({ spam_score: 0.95, toxicity_score: 0.1, label: 'SPAM' });
    await postService.updatePost(created._id, { content_html: '<p>spam 2</p>' }, author._id);

    const User = mongoose.model('User');
    const fresh = await User.findById(author._id);
    expect(fresh.spamCount).toBe(1);
  });
});

describe('Sprint 18 fixes (M43-M51)', () => {
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

  test('M43: avatar rejects javascript:/data: URLs at the schema and API levels', async () => {
    const { registerSchema, updateProfileSchema } = require('../../validators/schemas');

    // z.url() alone passes these; the new http(s)-only refine must reject them.
    for (const bad of ['javascript:alert(1)', 'data:text/html,<script>1</script>', 'ftp://host/x.png']) {
      expect(registerSchema.safeParse({ body: { email: 'a@b.com', password: 'password123', username: 'm43u', avatar: bad } }).success).toBe(false);
      expect(updateProfileSchema.safeParse({ body: { avatar: bad } }).success).toBe(false);
    }
    // http(s) URLs still pass
    expect(registerSchema.safeParse({ body: { email: 'a@b.com', password: 'password123', username: 'm43u', avatar: 'https://cdn.example.com/a.png' } }).success).toBe(true);

    // API: register with a javascript: avatar → 400 (service-level, since the
    // /auth/* HTTP limiter is exhausted by the "Rate limiting" test above)
    const authService = require('../../services/auth.service');
    await expect(authService.register({
      email: 'm43@example.com',
      password: 'password123',
      username: 'm43user',
      avatar: 'javascript:alert(1)'
    })).rejects.toThrow('Avatar must be an http(s) URL');

    // API: updateProfile with a data: avatar → 400 (service-level guard)
    const owner = await createUser('m43profile@example.com', 'm43profile');
    const token = mintToken(owner._id.toString());
    const up = await request(app)
      .put('/api/v1/users/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ avatar: 'data:text/html,<svg onload=alert(1)>' });
    expect(up.status).toBe(400);
  });

  test('M44 + M47: hiding a comment hides its reply subtree and writes a HIDE log', async () => {
    const admin = await createUser('m44admin@example.com', 'm44admin');
    await mongoose.model('User').findByIdAndUpdate(admin._id, { role: 'MODERATOR' });
    const adminToken = mintToken(admin._id.toString(), 'MODERATOR');

    const author = await createUser('m44author@example.com', 'm44author');
    const Post = mongoose.model('Post');
    const Comment = mongoose.model('Comment');

    const post = await Post.create({
      author: author._id,
      slug: `m44-${Date.now()}`,
      content_json: {},
      content_html: '<p>x</p>',
      visibility: 'PUBLIC',
      status: 'PUBLISHED'
    });
    const c1 = await Comment.create({ post_id: post._id, author: author._id, content: 'parent', is_hidden: false });
    const c2 = await Comment.create({ post_id: post._id, author: author._id, parent_id: c1._id, content: 'reply', is_hidden: false });
    const c3 = await Comment.create({ post_id: post._id, author: author._id, parent_id: c2._id, content: 'reply reply', is_hidden: false });

    // M44: enqueue the parent comment then hide it via the moderation queue.
    const moderationRepository = require('../../repositories/moderation.repo');
    const queueItem = await moderationRepository.addToQueue({
      target_type: 'TOXIC',
      target_id: c1._id,
      target_model: 'Comment',
      reason: 'toxic',
      spam_score: 0.1,
      toxicity_score: 0.9,
      status: 'PENDING',
      reporter_id: null
    });

    const res = await request(app)
      .put(`/api/v1/moderation/hide/${queueItem._id.toString()}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);

    // The whole subtree is hidden
    for (const c of await Comment.find({ post_id: post._id })) {
      expect(c.is_hidden).toBe(true);
    }

    // M47: the hide decision is in ModerationLog with the acting moderator
    const ModerationLog = mongoose.model('ModerationLog');
    const log = await ModerationLog.findOne({ target_id: c1._id, action: 'HIDE' });
    expect(log).toBeTruthy();
    expect(log.moderator_id.toString()).toBe(admin._id.toString());
  });

  test('M45: getBookmarkedPosts filters hidden targets BEFORE paginating', async () => {
    const owner = await createUser('m45@example.com', 'm45user');
    const token = mintToken(owner._id.toString());
    const Post = mongoose.model('Post');
    const Interaction = mongoose.model('Interaction');

    const p1 = await Post.create({ author: owner._id, slug: `m45a-${Date.now()}`, content_json: {}, content_html: '<p>a</p>', visibility: 'PUBLIC', status: 'PUBLISHED' });
    const p2 = await Post.create({ author: owner._id, slug: `m45b-${Date.now()}`, content_json: {}, content_html: '<p>b</p>', visibility: 'PUBLIC', status: 'PUBLISHED' });
    const hidden = await Post.create({ author: owner._id, slug: `m45c-${Date.now()}`, content_json: {}, content_html: '<p>c</p>', visibility: 'HIDDEN', status: 'PUBLISHED' });

    for (const p of [p1, p2, hidden]) {
      await Interaction.create({ user_id: owner._id, target_id: p._id, target_model: 'Post', type: 'BOOKMARK' });
    }

    const res = await request(app)
      .get('/api/v1/posts/me/bookmarks?limit=2')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    // total excludes the hidden target, and the page still returns 2 PUBLIC posts
    expect(res.body.meta.total).toBe(2);
    expect(res.body.data.length).toBe(2);
  });

  test('M46: createPost and createComment return a populated author', async () => {
    const owner = await createUser('m46@example.com', 'm46user');
    const token = mintToken(owner._id.toString());

    const postRes = await request(app)
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ content_html: '<p>m46</p>' });
    expect(postRes.status).toBe(201);
    const author = postRes.body.data.author;
    expect(author).toBeTruthy();
    expect(typeof author).toBe('object');
    expect(author.username).toBe('m46user');

    const commentRes = await request(app)
      .post('/api/v1/comments')
      .set('Authorization', `Bearer ${token}`)
      .send({ post_id: postRes.body.data._id, content: 'a comment' });
    expect(commentRes.status).toBe(201);
    expect(commentRes.body.data.author.username).toBe('m46user');
  });

  test('M47: approving a flagged post clears the stale label and writes an UNHIDE log', async () => {
    const admin = await createUser('m47admin@example.com', 'm47admin');
    await mongoose.model('User').findByIdAndUpdate(admin._id, { role: 'MODERATOR' });
    const adminToken = mintToken(admin._id.toString(), 'MODERATOR');

    const author = await createUser('m47author@example.com', 'm47author');

    // Create the flagged post at the service level (avoids the content-create
    // HTTP rate limiter, which is nearly exhausted by earlier suites).
    const aiService = require('../../services/ai.service');
    const postService = require('../../services/post.service');
    aiService.analyze.mockResolvedValueOnce({ spam_score: 0.9, toxicity_score: 0.1, label: 'SPAM' });
    const created = await postService.createPost(author._id, { content_html: '<p>m47 spam</p>', content_json: {} });
    expect(created.visibility).toBe('HIDDEN');
    expect(created.label).toBe('SPAM');

    const ModerationQueue = mongoose.model('ModerationQueue');
    const queueItem = await ModerationQueue.findOne({ target_id: created._id, status: 'PENDING' });
    expect(queueItem).toBeTruthy();

    const res = await request(app)
      .put(`/api/v1/moderation/approve/${queueItem._id.toString()}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);

    const Post = mongoose.model('Post');
    const fresh = await Post.findById(created._id);
    expect(fresh.visibility).toBe('PUBLIC');
    expect(fresh.label).toBe('NORMAL');

    const ModerationLog = mongoose.model('ModerationLog');
    const log = await ModerationLog.findOne({ target_id: created._id, action: 'UNHIDE' });
    expect(log).toBeTruthy();
    expect(log.moderator_id.toString()).toBe(admin._id.toString());
  });

  test('M48: a content_json-only edit analyzes extracted text, never the raw JSON', async () => {
    const aiService = require('../../services/ai.service');
    const postService = require('../../services/post.service');
    const owner = await createUser('m48@example.com', 'm48user');

    const created = await postService.createPost(owner._id, { content_html: '<p>initial body</p>', content_json: {} });
    expect(created).toBeTruthy();

    const analyzeTexts = [];
    aiService.analyze.mockImplementation(async (text) => {
      analyzeTexts.push(text);
      return { spam_score: 0.05, toxicity_score: 0.05, label: 'NORMAL' };
    });

    // Edit with a text-bearing content_json → AI gets the extracted text only
    await postService.updatePost(created._id, { content_json: { text: 'the actual new body text' } }, owner._id);
    const last = analyzeTexts[analyzeTexts.length - 1];
    expect(last).toContain('the actual new body text');
    expect(last).not.toContain('{');

    // Edit with a content_json carrying no analyzable text → AI must NOT run
    const before = analyzeTexts.length;
    await postService.updatePost(created._id, { content_json: { styles: { color: 'red' } } }, owner._id);
    expect(analyzeTexts.length).toBe(before);
  });

  test('M49: admin user/post actions return 404 on a missing target', async () => {
    const admin = await createUser('m49admin@example.com', 'm49admin');
    await mongoose.model('User').findByIdAndUpdate(admin._id, { role: 'ADMIN' });
    const adminToken = mintToken(admin._id.toString(), 'ADMIN');

    const cases = [
      ['/api/v1/admin/users/000000000000000000000000/role', { role: 'ADMIN' }],
      ['/api/v1/admin/users/000000000000000000000000/mute', {}],
      ['/api/v1/admin/users/000000000000000000000000/ban', {}],
      ['/api/v1/admin/users/000000000000000000000000/reset-score', {}],
      ['/api/v1/admin/posts/000000000000000000000000/hide', {}],
      ['/api/v1/admin/posts/000000000000000000000000/unhide', {}],
      ['/api/v1/admin/posts/000000000000000000000000/mark-sensitive', {}]
    ];
    for (const [path, body] of cases) {
      const res = await request(app)
        .put(path)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(body);
      expect(res.status).toBe(404);
    }
  });

  test('M50: an oversize image is a 413, not a 400', async () => {
    const { validateFileSize } = require('../../middlewares/upload.middleware');
    const req = { files: [{ originalname: 'big.png', mimetype: 'image/png', size: 11 * 1024 * 1024 }] };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await validateFileSize(req, res, () => { throw new Error('should not call next'); });
    expect(res.status).toHaveBeenCalledWith(413);
  });

  test('M51: register issues tokens atomically with the account', async () => {
    const authService = require('../../services/auth.service');
    const result = await authService.register({ email: 'm51@example.com', password: 'password123', username: 'm51user' });
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.user).toBeDefined();

    // The account already holds a stored refresh-token hash → no fragile
    // register-then-login second step can strand it without tokens.
    const User = mongoose.model('User');
    const fresh = await User.findOne({ email: 'm51@example.com' }).select('+refreshTokens');
    expect(fresh.refreshTokens.length).toBe(1);

    // And that token is immediately usable for a refresh
    const refreshed = await authService.refreshToken(result.refreshToken);
    expect(refreshed.accessToken).toBeDefined();
  });
});

