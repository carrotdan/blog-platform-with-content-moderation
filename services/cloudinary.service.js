const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

let isConfigured = false;

function configureCloudinary() {
  if (isConfigured) return;
  
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error('Cloudinary credentials not configured');
  }
  
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  
  isConfigured = true;
}

const uploadToCloudinary = (fileBuffer, folder, resourceType = 'auto') => {
  configureCloudinary();
  
  return new Promise((resolve, reject) => {
    let stream = cloudinary.uploader.upload_stream(
      { folder: folder, resource_type: resourceType },
      (error, result) => {
        if (result) { resolve(result); }
        else { reject(error); }
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

module.exports = { uploadToCloudinary, cloudinary, configureCloudinary };
