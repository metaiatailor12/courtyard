const { v2: cloudinary } = require('cloudinary');
const { env } = require('./config');

let configured = false;

function ensureConfigured() {
  if (configured) {
    return;
  }

  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    throw new Error('Cloudinary credentials are required: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
  }

  cloudinary.config({
    cloud_name: env.cloudinaryCloudName,
    api_key: env.cloudinaryApiKey,
    api_secret: env.cloudinaryApiSecret,
    secure: true,
  });

  configured = true;
}

async function uploadGalleryImage({ imageDataUrl, fileName }) {
  ensureConfigured();

  const result = await cloudinary.uploader.upload(imageDataUrl, {
    folder: env.cloudinaryFolder,
    resource_type: 'image',
    public_id: fileName
      ? fileName
          .replace(/\.[^.]+$/, '')
          .replace(/[^a-zA-Z0-9_-]+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
      : undefined,
    unique_filename: true,
    overwrite: false,
  });

  return {
    secureUrl: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
  };
}

module.exports = {
  uploadGalleryImage,
};