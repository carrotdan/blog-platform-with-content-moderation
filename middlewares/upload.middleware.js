const multer = require('multer');

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    return cb(new Error(`Invalid file type. Allowed types: ${ALLOWED_TYPES.join(', ')}`), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_VIDEO_SIZE,
    files: 10
  }
});

const validateFileSize = (req, res, next) => {
  const files = req.files || [];
  
  for (const file of files) {
    const isVideo = file.mimetype.startsWith('video/');
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    
    if (file.size > maxSize) {
      return res.status(400).json({
        success: false,
        message: `File ${file.originalname} exceeds maximum size of ${isVideo ? '100MB' : '10MB'} for ${isVideo ? 'video' : 'image'}`
      });
    }
  }
  next();
};

module.exports = { upload, validateFileSize, ALLOWED_TYPES, MAX_IMAGE_SIZE, MAX_VIDEO_SIZE };
