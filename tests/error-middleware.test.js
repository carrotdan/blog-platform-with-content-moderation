const express = require('express');
const request = require('supertest');
const { errorMiddleware } = require('../middlewares/error.middleware');

describe('H40: Multer upload error mapping', () => {
  const makeApp = (err) => {
    const app = express();
    app.get('/boom', (req, res, next) => next(err));
    app.use(errorMiddleware);
    return app;
  };

  test('LIMIT_FILE_SIZE maps to 413', async () => {
    const err = new Error('File too large');
    err.name = 'MulterError';
    err.code = 'LIMIT_FILE_SIZE';
    const res = await request(makeApp(err)).get('/boom');
    expect(res.status).toBe(413);
    expect(res.body.message).toBe('File too large');
  });

  test('LIMIT_UNEXPECTED_FILE maps to 400', async () => {
    const err = new Error('Unexpected field');
    err.name = 'MulterError';
    err.code = 'LIMIT_UNEXPECTED_FILE';
    const res = await request(makeApp(err)).get('/boom');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Unexpected file field');
  });
});
