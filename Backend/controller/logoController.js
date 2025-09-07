const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Logo = require('../model/Logo');
const { promisify } = require('util');

// Promisify file system functions
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);

// Configure directories
const TEMP_DIR = path.join(__dirname, '..', 'temp');
const LOGOS_DIR = path.join(__dirname, '..', 'uploads', 'logos');

// Ensure directories exist
const ensureDirsExist = async () => {
  if (!fs.existsSync(TEMP_DIR)) await mkdir(TEMP_DIR, { recursive: true });
  if (!fs.existsSync(LOGOS_DIR)) await mkdir(LOGOS_DIR, { recursive: true });
};

// Multer configuration for logo upload
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await ensureDirsExist();
      cb(null, TEMP_DIR);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `logo-${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { 
    fileSize: 5 * 1024 * 1024, // 5MB for logos
    fieldSize: 2 * 1024 * 1024,
    fields: 5,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    console.log('Logo filter - mimetype:', file.mimetype, 'originalname:', file.originalname);
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Generate local server URL for logos
const generateLocalLogoUrl = (filePath) => {
  const relativePath = filePath.replace(path.join(__dirname, '..'), '');
  return `${process.env.BASE_URL || 'http://localhost:3000'}${relativePath.replace(/\\/g, '/')}`;
};

// Extract file path from URL
const extractFilePathFromUrl = (url) => {
  try {
    // Remove the base URL to get the relative path
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const relativePath = url.replace(baseUrl, '');
    
    // Convert back to absolute file path
    const absolutePath = path.join(__dirname, '..', relativePath.replace(/\//g, path.sep));
    
    return absolutePath;
  } catch (error) {
    console.error('Error extracting file path from URL:', error);
    return null;
  }
};

// Delete old logo file from server
const deleteOldLogoFile = async (logoUrl) => {
  try {
    let filePath;
    
    // Check if we have a full URL or just a file path
    if (logoUrl.startsWith('http')) {
      filePath = extractFilePathFromUrl(logoUrl);
    } else {
      // Assume it's already a file path
      filePath = logoUrl;
    }
    
    if (!filePath) {
      console.log('Could not determine file path from:', logoUrl);
      return false;
    }
    
    // Check if file exists before trying to delete
    if (fs.existsSync(filePath)) {
      await unlink(filePath);
      console.log('Old logo deleted successfully:', filePath);
      return true;
    } else {
      console.log('Old logo file not found:', filePath);
      return false;
    }
  } catch (error) {
    console.error('Error deleting old logo file:', error);
    return false;
  }
};

// Save logo to local server storage
const saveLogoToLocalStorage = async (fileBuffer, fileName) => {
  try {
    const timestamp = Date.now();
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = path.join(LOGOS_DIR, `${timestamp}-${safeFileName}`);
    
    // Ensure directory exists
    if (!fs.existsSync(LOGOS_DIR)) {
      await mkdir(LOGOS_DIR, { recursive: true });
    }
    
    // Write file to disk
    await fs.promises.writeFile(filePath, fileBuffer);
    
    // Generate public URL
    const publicUrl = generateLocalLogoUrl(filePath);
    
    console.log('Logo saved to local storage:', filePath);
    
    return {
      publicUrl,
      filePath,
      fileName: `${timestamp}-${safeFileName}`
    };
  } catch (error) {
    console.error('Local storage save error:', error);
    throw new Error(`Failed to save logo to local storage: ${error.message}`);
  }
};

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
        // Ensure directories exist
        await ensureDirsExist();

        // Find existing logo to delete from local storage if it exists
        const existingLogo = await Logo.findOne();

        // Delete old logo file if it exists
        if (existingLogo) {
            // Try to delete using filePath first (if stored), then fall back to URL
            const fileToDelete = existingLogo.filePath || existingLogo.url;
            if (fileToDelete) {
                await deleteOldLogoFile(fileToDelete);
            }
        }

        // Save new logo to local storage
        const fileName = path.basename(req.file.path);
        const fileBuffer = fs.readFileSync(req.file.path);
        
        const result = await saveLogoToLocalStorage(fileBuffer, fileName);

        // Create or update logo in database
        const logoData = {
            url: result.publicUrl,
            filePath: result.filePath, // Store actual file path for easier deletion
            publicId: result.fileName
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

        // Delete temp file after successful save and database operation
        await unlink(tempFilePath).catch(err => 
            console.error('Warning: Temp file deletion failed:', err)
        );

        res.status(200).json({
            success: true,
            data: logo,
            message: 'Logo uploaded successfully'
        });

    } catch (error) {
        // Enhanced error logging
        console.error('Logo upload error details:', {
            message: error.message,
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
            error: error.message
        });
    }
};

// @desc    Delete logo
// @route   DELETE /api/v1/logo
// @access  Private (superadmin)
exports.deleteLogo = async (req, res) => {
    try {
        const logo = await Logo.findOne();

        if (!logo) {
            return res.status(404).json({
                success: false,
                message: 'No logo found to delete'
            });
        }

        // Delete file from server
        const fileToDelete = logo.filePath || logo.url;
        if (fileToDelete) {
            await deleteOldLogoFile(fileToDelete);
        }

        // Delete from database
        await Logo.findByIdAndDelete(logo._id);

        res.status(200).json({
            success: true,
            message: 'Logo deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting logo:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting logo',
            error: error.message
        });
    }
};

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  console.error('Multer error:', error);
  
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 5MB for logos.'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many files. Only one file allowed.'
        });
      case 'LIMIT_FIELD_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many fields in the form.'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Unexpected file field.'
        });
      default:
        return res.status(400).json({
          success: false,
          message: `Upload error: ${error.message}`
        });
    }
  }
  
  if (error.message === 'Unexpected end of form') {
    return res.status(400).json({
      success: false,
      message: 'Upload interrupted or form data corrupted. Please try again.'
    });
  }
  
  return res.status(400).json({
    success: false,
    message: error.message || 'Upload failed'
  });
};

// Export the upload middleware and error handler
exports.uploadLogo = [upload.single('logo'), handleMulterError, exports.addLogo];