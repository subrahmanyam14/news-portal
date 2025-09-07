const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const unlink = promisify(fs.unlink);

// Base URL for the server
const BASE_URL = process.env.BASE_URL || 'http://localhost:5002';

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory:', uploadsDir);
} else {
  console.log('Uploads directory exists:', uploadsDir);
}

// Configure multer storage to save directly to uploads directory
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    console.log('Saving file to:', uploadDir);
    
    // Double check the directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log('Created uploads directory during upload:', uploadDir);
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Create a safe filename with timestamp
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const timestamp = Date.now();
    const finalFilename = `${timestamp}-${safeName}`;
    console.log('Generated filename:', finalFilename);
    cb(null, finalFilename);
  }
});

// Create multer instance
const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    console.log('File filter check - mimetype:', file.mimetype, 'originalname:', file.originalname);
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
    console.log('File upload handler called');
    console.log('Request file:', req.file);
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { filename, originalname, mimetype, path: filePath, size } = req.file;
    
    console.log('File details:', {
      filename,
      originalname,
      mimetype,
      filePath,
      size
    });
    
    // Verify file was actually saved
    if (!fs.existsSync(filePath)) {
      throw new Error('File was not saved properly');
    }
    
    // Create the relative path
    const relativePath = `/uploads/${filename}`;
    
    // Create the full URL
    const fullUrl = `${BASE_URL}${relativePath}`;
    
    console.log('File successfully uploaded:', {
      relativePath,
      fullUrl,
      fileExists: fs.existsSync(filePath)
    });

    res.json({
      success: true,
      message: 'File uploaded successfully',
      url: fullUrl,
      relativePath: relativePath,
      fileName: filename,
      originalName: originalname,
      mimeType: mimetype,
      size: size
    });

  } catch (error) {
    console.error('Upload failed:', error);
    
    // Clean up file if upload failed and file exists
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