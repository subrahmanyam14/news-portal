// config/s3Client.js
const { S3Client } = require("@aws-sdk/client-s3");

// Log configuration for debugging
console.log('S3 Configuration:');
console.log('Endpoint:', process.env.CONTABO_ENDPOINT);
console.log('Region:', process.env.CONTABO_REGION);
console.log('Bucket:', process.env.CONTABO_BUCKET_NAME);
console.log('Access Key:', process.env.CONTABO_ACCESS_KEY?.substring(0, 8) + '...');

const s3Client = new S3Client({
  region: process.env.CONTABO_REGION || "auto",
  endpoint: process.env.CONTABO_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CONTABO_ACCESS_KEY,
    secretAccessKey: process.env.CONTABO_SECRET_KEY,
  },
  forcePathStyle: true,
  maxAttempts: 3,
  retryMode: "adaptive",

});

// Test that the client was created properly
console.log('S3 Client created:', typeof s3Client);
console.log('S3 Client send method:', typeof s3Client.send);

module.exports = s3Client;