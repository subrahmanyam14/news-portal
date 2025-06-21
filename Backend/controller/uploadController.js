const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadToContaboS3, unlink } = require("../utils/storageUtils");

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(__dirname, '../temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `upload-${Date.now()}-${safeName}`);
  }
});

// Create multer instance
const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    // Accept only certain file types if needed
    if (file.mimetype === 'application/pdf' || 
        file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

const handleFileUpload = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { path: tempFilePath, filename, originalname, mimetype } = req.file;
    
    // Use the sanitized filename from multer instead of originalname
    // Extract the safe name from the multer filename (remove the "upload-timestamp-" prefix)
    const safeName = filename.replace(/^upload-\d+-/, '');
    
    const { publicUrl, s3FilePath } = await uploadToContaboS3(
      tempFilePath,
      safeName, // Use sanitized name instead of originalname
      mimetype
    );

    await unlink(tempFilePath);

    res.json({
      success: true,
      message: 'File uploaded successfully',
      publicUrl,
      s3FilePath,
      originalName: originalname,
      sanitizedName: safeName
    });

  } catch (error) {
    console.error('Upload failed:', error);
    
    if (req.file?.path && fs.existsSync(req.file.path)) {
      await unlink(req.file.path).catch(e => console.error('Cleanup failed:', e));
    }

    res.status(500).json({
      success: false,
      message: 'File upload failed',
      error: error.message
    });
  }
};

module.exports = {
  upload,
  handleFileUpload
};