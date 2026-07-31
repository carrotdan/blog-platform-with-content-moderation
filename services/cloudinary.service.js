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

// M18: Destroy a list of Cloudinary assets by public_id. Best-effort —
// missing/invalid ids are skipped and never reject the caller.
const destroyAssets = async (publicIds = []) => {
  if (!Array.isArray(publicIds) || publicIds.length === 0) return;

  configureCloudinary();

  const results = await Promise.allSettled(
    publicIds
      .filter(id => typeof id === 'string' && id.length > 0)
      .map(id => cloudinary.uploader.destroy(id))
  );

  return results.map(r => r.status === 'fulfilled' ? r.value : null);
};

module.exports = { uploadToCloudinary, destroyAssets, cloudinary, configureCloudinary };
