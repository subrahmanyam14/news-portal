const fs = require('fs');
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const s3Client = require("../config/s3Client");
const { promisify } = require('util');
const unlink = promisify(fs.unlink);

// Generate proper Contabo S3 public URL (same as logo controller)
const generateContaboPublicUrl = (filePath) => {
  const bucketName = process.env.CONTABO_BUCKET_NAME || "ezypress";
  const endpoint = process.env.CONTABO_ENDPOINT;
  const accountId = process.env.CONTABO_ACCOUNT_ID;
  let publicUrl;
  
  if (accountId) {
    // Format: https://sin1.contabostorage.com/ACCOUNT_ID:BUCKET_NAME/path/to/file
    const cleanEndpoint = endpoint.replace('https://', '');
    publicUrl = `https://${cleanEndpoint}/${accountId}:${bucketName}/${filePath}`;
  } else {
    // Fallback to the format you were using (but this might not work)
    console.warn('CONTABO_ACCOUNT_ID not set. Using fallback URL format which may not work.');
    const cleanEndpoint = endpoint.replace('https://', '');
    publicUrl = `https://${bucketName}.${cleanEndpoint}/${filePath}`;
  }
  
  return publicUrl;
};

// Upload single file to Contabo S3 - FIXED VERSION
const uploadToContaboS3 = async (filePath, fileName, contentType, folder = 'epaper/newspapers') => {
  try {
    // Validate s3Client before using
    if (!s3Client || typeof s3Client.send !== 'function') {
      throw new Error('S3 client is not properly initialized. Check your s3Client configuration.');
    }

    // Read the file from filesystem - THIS WAS MISSING!
    const fileBuffer = fs.readFileSync(filePath);
    
    const timestamp = Date.now();
    const s3FilePath = `${folder}/${timestamp}-${fileName}`;
    
    const uploadParams = {
      Bucket: process.env.CONTABO_BUCKET_NAME || "ezypress",
      Key: s3FilePath,
      Body: fileBuffer,
      ContentType: contentType,
      // Add ACL for public read access
      ACL: 'public-read'
    };

    console.log('Attempting to upload to S3 with params:', {
      Bucket: uploadParams.Bucket,
      Key: uploadParams.Key,
      ContentType: uploadParams.ContentType
    });

    const uploadCommand = new PutObjectCommand(uploadParams);
    const uploadResult = await s3Client.send(uploadCommand);
    
    console.log('File uploaded to Contabo S3:', uploadResult);

    // Generate public URL using the same method as logo controller
    const publicUrl = generateContaboPublicUrl(s3FilePath);
    console.log('Generated public URL:', publicUrl);

    return {
      publicUrl,
      s3FilePath,
      uploadResult
    };
  } catch (error) {
    console.error('Contabo S3 upload error:', error);
    throw new Error(`Failed to upload to Contabo S3: ${error.message}`);
  }
};

module.exports = {
  generateContaboPublicUrl,
  uploadToContaboS3,
  unlink
};