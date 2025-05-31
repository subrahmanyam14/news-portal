const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Logo = require('../model/Logo');
const { promisify } = require('util');
const { PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const s3Client = require("../config/s3Client");

// Promisify file system functions
const unlink = promisify(fs.unlink);

// Debug the s3Client import
console.log('Imported s3Client type:', typeof s3Client);
console.log('s3Client.send type:', typeof s3Client?.send);

// @desc    Get logo
// @route   GET /api/v1/logo
// @access  Public
exports.getLogo = async (req, res) => {
    try {
        const logo = await Logo.findOne();

        if (!logo) {
            return res.status(404).json({ 
                success: false, 
                message: 'No logo found' 
            });
        }

        res.status(200).json({
            success: true,
            data: logo
        });
    } catch (error) {
        console.error('Error fetching logo:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching logo',
            error: error.message
        });
    }
};

// @desc    Add/Update logo
// @route   POST /api/v1/logo
// @access  Private (superadmin)
exports.addLogo = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ 
            success: false, 
            message: 'Please upload a logo image' 
        });
    }

    let tempFilePath = req.file.path;

    try {
        // Validate s3Client before using
        if (!s3Client || typeof s3Client.send !== 'function') {
            throw new Error('S3 client is not properly initialized. Check your s3Client configuration.');
        }

        // Find existing logo to delete from Contabo if it exists
        const existingLogo = await Logo.findOne();

        if (existingLogo && existingLogo.filePath) {
            try {
                // Delete old logo from Contabo S3
                const deleteParams = {
                    Bucket: process.env.CONTABO_BUCKET_NAME || "ezypress",
                    Key: existingLogo.filePath
                };

                const deleteCommand = new DeleteObjectCommand(deleteParams);
                await s3Client.send(deleteCommand);
                console.log('Old logo deleted from Contabo S3');
                
            } catch (deleteErr) {
                console.error('Error deleting old logo from Contabo:', deleteErr);
                // Don't fail the operation if deletion fails
            }
        }

        // Upload new logo to Contabo S3
        const fileName = path.basename(req.file.path);
        const fileBuffer = fs.readFileSync(req.file.path);
        const timestamp = Date.now();
        const filePath = `epaper/logos/${timestamp}-${fileName}`;
        
        const uploadParams = {
            Bucket: process.env.CONTABO_BUCKET_NAME || "ezypress",
            Key: filePath,
            Body: fileBuffer,
            ContentType: req.file.mimetype,
        };

        console.log('Attempting to upload to S3 with params:', {
            Bucket: uploadParams.Bucket,
            Key: uploadParams.Key,
            ContentType: uploadParams.ContentType
        });

        const uploadCommand = new PutObjectCommand(uploadParams);
        const uploadResult = await s3Client.send(uploadCommand);
        console.log('Logo uploaded to Contabo S3:', uploadResult);

        // Generate public URL - FIXED FORMAT FOR CONTABO
        const bucketName = process.env.CONTABO_BUCKET_NAME || "ezypress";
        const endpoint = process.env.CONTABO_ENDPOINT;
        const accountId = process.env.CONTABO_ACCOUNT_ID; // You need to add this env variable
        
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
        
        console.log('Generated public URL:', publicUrl);

        // Create or update logo in database
        const logoData = {
            url: publicUrl,
            filePath: filePath,
            publicId: filePath
        };

        let logo;
        if (existingLogo) {
            logo = await Logo.findByIdAndUpdate(
                existingLogo._id, 
                logoData, 
                { new: true, runValidators: true }
            );
        } else {
            logo = await Logo.create(logoData);
        }

        // Only delete temp file after successful upload and database operation
        await unlink(tempFilePath).catch(err => 
            console.error('Warning: Temp file deletion failed:', err)
        );

        res.status(200).json({
            success: true,
            data: logo
        });

    } catch (error) {
        // Enhanced error logging
        console.error('Logo upload error details:', {
            message: error.message,
            statusCode: error.$metadata?.httpStatusCode,
            requestId: error.$metadata?.requestId,
            stack: error.stack
        });

        // Remove temporary file if it exists
        if (fs.existsSync(tempFilePath)) {
            await unlink(tempFilePath).catch(err => 
                console.error('Error deleting temp file during cleanup:', err)
            );
        }

        res.status(500).json({
            success: false,
            message: 'Error uploading logo',
            error: error.message,
            details: error.$metadata?.httpStatusCode ? `HTTP ${error.$metadata.httpStatusCode}` : 'S3 Client Error'
        });
    }
};