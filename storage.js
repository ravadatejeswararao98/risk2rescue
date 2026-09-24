const Minio = require('minio');

// Initialize the MinIO client
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || process.env.MINIO_HOST || 'localhost',
  port: parseInt(process.env.MINIO_PORT, 10) || 9000,
  useSSL: process.env.MINIO_USE_SSL === 'true', // false for local development
  accessKey: process.env.MINIO_ACCESS_KEY || process.env.MINIO_ROOT_USER || 'admin',
  secretKey: process.env.MINIO_SECRET_KEY || process.env.MINIO_ROOT_PASSWORD || 'secret_minio_password'
});

const BUCKET_NAME = 'satellite-data';

/**
 * Check if the target bucket exists, and create it if it doesn't.
 */
async function initBucket() {
  try {
    const exists = await minioClient.bucketExists(BUCKET_NAME);
    if (!exists) {
      await minioClient.makeBucket(BUCKET_NAME, 'us-east-1');
      console.log(`[MinIO] Created bucket "${BUCKET_NAME}".`);
    } else {
      console.log(`[MinIO] Bucket "${BUCKET_NAME}" ready.`);
    }
  } catch (err) {
    console.error(`[MinIO] Error initializing bucket: ${err.message}`);
  }
}

// Ensure the bucket is ready when this module is required
initBucket();

/**
 * Upload a file buffer (or string) to MinIO
 * @param {string} path - The destination object name/path in the bucket
 * @param {Buffer|string} buffer - The file content
 */
async function uploadFile(path, buffer) {
  try {
    // metadata and headers can be supplied as the third argument if needed
    await minioClient.putObject(BUCKET_NAME, path, buffer);
    console.log(`[MinIO] Successfully uploaded object: ${path}`);
  } catch (err) {
    console.error(`[MinIO] Error uploading ${path}: ${err.message}`);
    throw err;
  }
}

/**
 * Generate a presigned URL to access an object
 * @param {string} path - The object name/path in the bucket
 * @param {number} expiry - Expiration time in seconds (default is 24 hours)
 * @returns {Promise<string>} The presigned URL
 */
async function getSignedUrl(path, expiry = 24 * 60 * 60) {
  try {
    const url = await minioClient.presignedGetObject(BUCKET_NAME, path, expiry);
    return url;
  } catch (err) {
    console.error(`[MinIO] Error generating signed URL for ${path}: ${err.message}`);
    throw err;
  }
}

module.exports = {
  minioClient,
  uploadFile,
  getSignedUrl
};
