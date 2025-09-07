const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const unlink = promisify(fs.unlink);
const multer = require('multer');

// Base URL for the server
const BASE_URL = process.env.BASE_URL || 'http://localhost:5002';

// Configure local storage for uploaded files
const configureLocalStorage = (basePath = 'uploads') => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, `../${basePath}`);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log('Created directory:', uploadDir);
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      const timestamp = Date.now();
      cb(null, `${timestamp}-${safeName}`);
    }
  });

  return storage;
};

// Save file to local server storage
const saveToLocalStorage = async (filePath, fileName, contentType, folder = 'epaper/newspapers') => {
  try {
    // Create the target directory if it doesn't exist
    const targetDir = path.join(__dirname, `../uploads/${folder}`);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      console.log('Created directory:', targetDir);
    }

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const targetFileName = `${timestamp}-${safeName}`;
    const targetFilePath = path.join(targetDir, targetFileName);

    // Handle both file path (string) and buffer input
    let fileBuffer;
    if (Buffer.isBuffer(filePath)) {
      fileBuffer = filePath;
    } else {
      // Read the source file
      fileBuffer = fs.readFileSync(filePath);
    }

    // Write to target location
    fs.writeFileSync(targetFilePath, fileBuffer);
    console.log('File saved to:', targetFilePath);

    // Generate public URL (relative to your server)
    const publicUrl = `${BASE_URL}/uploads/${folder}/${targetFileName}`;

    return {
      publicUrl,
      filePath: targetFilePath,
      fileName: targetFileName
    };
  } catch (error) {
    console.error('Local storage save error:', error);
    throw new Error(`Failed to save to local storage: ${error.message}`);
  }
};

// Create multer instance for local storage
const upload = multer({ 
  storage: configureLocalStorage('temp'), // Use temp folder for initial upload
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
    const safeName = filename.replace(/^upload-\d+-/, '').replace(/^\d+-/, '');
    
    // Save to local storage instead of Contabo S3
    const { publicUrl, filePath } = await saveToLocalStorage(
      tempFilePath,
      safeName,
      mimetype
    );

    // Clean up temporary file
    await unlink(tempFilePath);

    res.json({
      success: true,
      message: 'File uploaded successfully',
      url: publicUrl,
      filePath,
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
  handleFileUpload,
  saveToLocalStorage,
  unlink,
  configureLocalStorage
};