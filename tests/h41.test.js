jest.mock('../services/cloudinary.service', () => {
  const uploadToCloudinary = jest.fn();
  const destroyAssets = jest.fn().mockResolvedValue([]);
  return { uploadToCloudinary, destroyAssets, cloudinary: {}, configureCloudinary: jest.fn() };
});

jest.mock('../services/post.service', () => ({
  createPost: jest.fn().mockResolvedValue({ _id: 'mockpost', visibility: 'PUBLIC' })
}));

jest.mock('../services/message.service', () => ({
  sendMessage: jest.fn().mockResolvedValue({ _id: 'mockmessage' })
}));

jest.mock('../utils/sanitize', () => ({
  sanitizeHtml: (html) => String(html || '')
}));

jest.mock('../services/socket.service', () => ({ getIO: () => null }));

const { uploadToCloudinary, destroyAssets } = require('../services/cloudinary.service');
const postService = require('../services/post.service');
const messageService = require('../services/message.service');
const postController = require('../controllers/post.controller');
const messageController = require('../controllers/message.controller');

describe('H41: partial Cloudinary upload failure cleans up uploaded assets', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('failed second upload destroys the first upload public_id and rethrows', async () => {
    const req = {
      user: { id: 'u1' },
      body: { content_html: '<p>x</p>' },
      files: [
        { buffer: Buffer.from('a'), mimetype: 'image/png' },
        { buffer: Buffer.from('b'), mimetype: 'image/png' }
      ]
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    uploadToCloudinary
      .mockResolvedValueOnce({ secure_url: 'http://cdn/p1', public_id: 'p1' })
      .mockRejectedValueOnce(new Error('upload failed'));

    await postController.createPost(req, res, next);

    expect(uploadToCloudinary).toHaveBeenCalledTimes(2);
    expect(destroyAssets).toHaveBeenCalledWith(['p1']);
    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'upload failed' }));
  });

  test('successful uploads never trigger cleanup', async () => {
    const req = {
      user: { id: 'u1' },
      body: { content_html: '<p>x</p>' },
      files: [{ buffer: Buffer.from('a'), mimetype: 'image/png' }]
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    uploadToCloudinary.mockResolvedValueOnce({ secure_url: 'http://cdn/p1', public_id: 'p1' });

    await postController.createPost(req, res, next);

    expect(uploadToCloudinary).toHaveBeenCalledTimes(1);
    expect(destroyAssets).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('C27: DB failure after a successful upload destroys uploaded media', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('post create failure cleans up all uploaded public_ids and rethrows', async () => {
    const req = {
      user: { id: 'u1' },
      body: { content_html: '<p>x</p>' },
      files: [{ buffer: Buffer.from('a'), mimetype: 'image/png' }]
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    uploadToCloudinary.mockResolvedValueOnce({ secure_url: 'http://cdn/p1', public_id: 'p1' });
    postService.createPost.mockRejectedValueOnce(new Error('db failure'));

    await postController.createPost(req, res, next);

    expect(uploadToCloudinary).toHaveBeenCalledTimes(1);
    expect(destroyAssets).toHaveBeenCalledWith(['p1']);
    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'db failure' }));
  });

  test('message send failure after upload cleans up media and rethrows', async () => {
    const req = {
      user: { id: 'u1' },
      body: { recipientId: 'u2', content: 'hello' },
      files: [{ buffer: Buffer.from('a'), mimetype: 'image/png' }]
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    uploadToCloudinary.mockResolvedValueOnce({ secure_url: 'http://cdn/m1', public_id: 'm1' });
    messageService.sendMessage.mockRejectedValueOnce(new Error('db failure'));

    await messageController.sendMessage(req, res, next);

    expect(uploadToCloudinary).toHaveBeenCalledTimes(1);
    expect(destroyAssets).toHaveBeenCalledWith(['m1']);
    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'db failure' }));
  });

  test('message send success does not destroy uploaded media', async () => {
    const req = {
      user: { id: 'u1' },
      body: { recipientId: 'u2', content: 'hello' },
      files: [{ buffer: Buffer.from('a'), mimetype: 'image/png' }]
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    uploadToCloudinary.mockResolvedValueOnce({ secure_url: 'http://cdn/m1', public_id: 'm1' });

    await messageController.sendMessage(req, res, next);

    expect(uploadToCloudinary).toHaveBeenCalledTimes(1);
    expect(destroyAssets).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
  });
});
