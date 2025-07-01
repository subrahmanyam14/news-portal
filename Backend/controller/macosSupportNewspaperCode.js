const express = require('express');
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const s3Client = require("../config/s3Client");
const {NewspaperDetails} = require('../model/NewPaper');
const { exec } = require('child_process');

// Promisify file system functions
const unlink = promisify(fs.unlink);
const rm = promisify(fs.rm);
const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);

// Debug the s3Client import (same as logo controller)
console.log('Imported s3Client type:', typeof s3Client);
console.log('s3Client.send type:', typeof s3Client?.send);

// Configure temp directories
const TEMP_DIR = path.join(__dirname, '..', 'temp');
const PAGES_DIR = path.join(TEMP_DIR, 'pages');

// Ensure temp directories exist
const ensureDirsExist = async () => {
  if (!fs.existsSync(TEMP_DIR)) await mkdir(TEMP_DIR, { recursive: true });
  if (!fs.existsSync(PAGES_DIR)) await mkdir(PAGES_DIR, { recursive: true });
};

// Enhanced multer configuration with better error handling
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
    cb(null, `upload-${Date.now()}-${safeName}`);
  }
});

// Enhanced multer configuration with better limits and error handling
const upload = multer({
  storage,
  limits: { 
    fileSize: 100 * 1024 * 1024, // 100MB
    fieldSize: 25 * 1024 * 1024,  // 25MB for field data
    fields: 10,                   // Maximum number of fields
    files: 1                      // Maximum number of files
  },
  fileFilter: (req, file, cb) => {
    console.log('File filter - mimetype:', file.mimetype, 'originalname:', file.originalname);
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Enhanced image upload configuration
const imageStorage = multer.diskStorage({
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
    cb(null, `image-${Date.now()}-${safeName}`);
  }
});

const imageUpload = multer({
  storage: imageStorage,
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB for images
    fieldSize: 2 * 1024 * 1024,  // 2MB for field data
    fields: 5,                   // Maximum number of fields
    files: 1                     // Maximum number of files
  },
  fileFilter: (req, file, cb) => {
    console.log('Image filter - mimetype:', file.mimetype, 'originalname:', file.originalname);
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Validate PDF
const validatePDF = async (pdfPath) => {
  try {
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const pageCount = pdfDoc.getPageCount();

    if (pageCount === 0) throw new Error('PDF file has no pages');
    return pageCount;
  } catch (error) {
    console.error('PDF validation error:', error);
    throw new Error(`Invalid PDF file: ${error.message}`);
  }
};

// Function to execute a command and return its stdout
const execCmd = async (cmd) => {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error(`Command execution error: ${error.message}`);
        console.error(`stderr: ${stderr}`);
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
};

// Check if command exists on macOS
const commandExists = async (command) => {
  try {
    await execCmd(`which ${command}`);
    return true;
  } catch (error) {
    return false;
  }
};

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

// Upload single file to Contabo S3 (updated to match logo controller)
const uploadToContaboS3 = async (fileBuffer, fileName, contentType, folder = 'epaper/newspapers') => {
  try {
    // Validate s3Client before using (same as logo controller)
    if (!s3Client || typeof s3Client.send !== 'function') {
      throw new Error('S3 client is not properly initialized. Check your s3Client configuration.');
    }

    const timestamp = Date.now();
    const filePath = `${folder}/${timestamp}-${fileName}`;

    const uploadParams = {
      Bucket: process.env.CONTABO_BUCKET_NAME || "ezypress",
      Key: filePath,
      Body: fileBuffer,
      ContentType: contentType,
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
    const publicUrl = generateContaboPublicUrl(filePath);
    console.log('Generated public URL:', publicUrl);

    return {
      publicUrl,
      filePath,
      uploadResult
    };
  } catch (error) {
    console.error('Contabo S3 upload error:', error);
    throw new Error(`Failed to upload to Contabo S3: ${error.message}`);
  }
};

// macOS-specific PDF to Images conversion using native tools and Homebrew alternatives
const convertPDFToImages = async (pdfPath, outputDir) => {
  try {
    if (!fs.existsSync(outputDir)) await mkdir(outputDir, { recursive: true });

    // Get the page count from the PDF
    const pageCount = await validatePDF(pdfPath);
    console.log(`PDF has ${pageCount} pages`);

    const outputPrefix = path.join(outputDir, 'page');
    const dpi = 150; // Good balance of quality and speed

    // Method 1: Try Homebrew's poppler (pdftoppm) - most reliable on macOS
    console.log('Checking for Homebrew poppler (pdftoppm)...');
    if (await commandExists('pdftoppm')) {
      console.log('Converting PDF using pdftoppm (Homebrew poppler)...');
      
      try {
        // Use JPEG for faster processing and smaller files
        await execCmd(`pdftoppm -jpeg -jpegopt quality=85 -r ${dpi} "${pdfPath}" "${outputPrefix}"`);
        
        const files = await readdir(outputDir);
        const images = files
          .filter(file => file.startsWith('page-') && (file.endsWith('.jpg') || file.endsWith('.jpeg')))
          .sort((a, b) => {
            const numA = parseInt(a.match(/\d+/)[0]);
            const numB = parseInt(b.match(/\d+/)[0]);
            return numA - numB;
          })
          .map(file => path.join(outputDir, file));

        if (images.length > 0) {
          console.log(`Successfully converted ${images.length} pages with pdftoppm`);
          return images;
        }
      } catch (error) {
        console.error('pdftoppm conversion failed:', error);
      }
    }

    // Method 2: Try sips (macOS native image conversion tool)
    console.log('Trying macOS native sips tool...');
    try {
      // sips can't directly convert PDF to images, but we can use it with Preview's textutil
      // First, try using qlmanage (QuickLook manager) - macOS native
      await execCmd(`qlmanage -t -s ${dpi * 4} -o "${outputDir}" "${pdfPath}"`);
      
      const files = await readdir(outputDir);
      const qlImages = files
        .filter(file => file.endsWith('.png'))
        .sort()
        .map(file => path.join(outputDir, file));

      if (qlImages.length > 0) {
        console.log(`Successfully converted ${qlImages.length} pages with qlmanage`);
        return qlImages;
      }
    } catch (error) {
      console.error('qlmanage conversion failed:', error);
    }

    // Method 3: Try Homebrew ImageMagick
    console.log('Checking for Homebrew ImageMagick...');
    if (await commandExists('magick') || await commandExists('convert')) {
      console.log('Converting PDF using ImageMagick...');
      
      try {
        const convertCmd = await commandExists('magick') ? 'magick' : 'convert';
        await execCmd(`${convertCmd} -density ${dpi} "${pdfPath}" "${outputPrefix}-%03d.png"`);
        
        const files = await readdir(outputDir);
        const magickImages = files
          .filter(file => file.startsWith('page-') && file.endsWith('.png'))
          .sort()
          .map(file => path.join(outputDir, file));

        if (magickImages.length > 0) {
          console.log(`Successfully converted ${magickImages.length} pages with ImageMagick`);
          return magickImages;
        }
      } catch (error) {
        console.error('ImageMagick conversion failed:', error);
      }
    }

    // Method 4: Try Homebrew Ghostscript
    console.log('Checking for Homebrew Ghostscript...');
    if (await commandExists('gs')) {
      console.log('Converting PDF using Ghostscript...');
      
      try {
        await execCmd(`gs -dSAFER -dBATCH -dNOPAUSE -sDEVICE=png16m -r${dpi} -dTextAlphaBits=4 -dGraphicsAlphaBits=4 -o "${outputPrefix}-%03d.png" "${pdfPath}"`);
        
        const files = await readdir(outputDir);
        const gsImages = files
          .filter(file => file.startsWith('page-') && file.endsWith('.png'))
          .sort()
          .map(file => path.join(outputDir, file));

        if (gsImages.length > 0) {
          console.log(`Successfully converted ${gsImages.length} pages with Ghostscript`);
          return gsImages;
        }
      } catch (error) {
        console.error('Ghostscript conversion failed:', error);
      }
    }

    // Method 5: Pure JavaScript fallback using pdf2pic (requires installation)
    console.log('Attempting pure JavaScript conversion fallback...');
    try {
      // This requires pdf2pic package: npm install pdf2pic
      const pdf2pic = require('pdf2pic');
      
      const convert = pdf2pic.fromPath(pdfPath, {
        density: dpi,
        saveFilename: 'page',
        savePath: outputDir,
        format: 'png',
        width: 1240,
        height: 1754
      });

      const results = await convert.bulk(-1); // Convert all pages
      
      const jsImages = results.map(result => result.path);
      
      if (jsImages.length > 0) {
        console.log(`Successfully converted ${jsImages.length} pages with pdf2pic`);
        return jsImages;
      }
    } catch (error) {
      console.error('pdf2pic conversion failed (may not be installed):', error);
    }

    // If all methods fail, provide helpful error message
    throw new Error(`
      Failed to convert PDF to images. Please install one of the following tools on macOS:

      1. Homebrew poppler: brew install poppler
      2. Homebrew ImageMagick: brew install imagemagick
      3. Homebrew Ghostscript: brew install ghostscript
      4. Or install pdf2pic: npm install pdf2pic

      Alternatively, ensure your macOS system has the necessary permissions for qlmanage.
    `);

  } catch (error) {
    console.error('PDF conversion error:', error);
    throw error;
  }
};

// Upload Images to Contabo S3 with optimized batch processing (updated)
const uploadToContabo = async (imagePaths) => {
  const urls = [];
  const batchSize = 2; // Upload 2 images at a time for better parallel processing

  // Process images in batches
  for (let i = 0; i < imagePaths.length; i += batchSize) {
    const batch = imagePaths.slice(i, i + batchSize);
    const batchPromises = batch.map(async (imagePath) => {
      const fileName = path.basename(imagePath);
      const fileBuffer = fs.readFileSync(imagePath);
      const contentType = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') ? 'image/jpeg' : 'image/png';

      try {
        const result = await uploadToContaboS3(fileBuffer, fileName, contentType, 'epaper/newspapers');

        // Clean up the image file after successful upload
        await unlink(imagePath).catch(err => console.warn(`Image cleanup error for ${fileName}:`, err));

        console.log(`Successfully uploaded: ${fileName}`);
        return result.publicUrl;
      } catch (error) {
        console.error(`Upload failed for ${fileName}:`, error.message);
        throw new Error(`Failed to upload ${fileName}: ${error.message}`);
      }
    });

    // Wait for this batch to complete
    const batchUrls = await Promise.all(batchPromises);
    urls.push(...batchUrls);

    console.log(`Uploaded batch ${i/batchSize + 1} of ${Math.ceil(imagePaths.length/batchSize)}`);
  }

  return urls;
};

// Enhanced Controller for Newspaper Upload with better error handling
const uploadNewspaper = async (req, res) => {
  console.log('Upload request received');
  console.log('Headers:', req.headers);
  console.log('Body fields:', Object.keys(req.body || {}));
  console.log('File:', req.file ? 'File present' : 'No file');

  if (!req.file) {
    console.log('No file uploaded');
    return res.status(400).json({ 
      success: false,
      message: 'No PDF file uploaded' 
    });
  }

  const pdfPath = req.file.path;
  let pageCount = 0;

  try {
    console.log('Processing PDF:', req.file.originalname);
    console.log('File size:', req.file.size);
    console.log('File path:', pdfPath);

    // Clean up previous files if they exist
    await rm(PAGES_DIR, { recursive: true, force: true }).catch(() => {});
    await mkdir(PAGES_DIR, { recursive: true });

    pageCount = await validatePDF(pdfPath);
    console.log(`PDF validated. Contains ${pageCount} pages.`);

    let publicationDate = req.body.publicationDate || new Date();
    if (typeof publicationDate === 'string') publicationDate = new Date(publicationDate);

    // Set isPublished based on publication date
    const now = new Date();
    const isPublished = publicationDate <= now;

    console.log('Converting PDF to images...');
    const startTime = Date.now();
    const imagePaths = await convertPDFToImages(pdfPath, PAGES_DIR);
    const conversionTime = (Date.now() - startTime) / 1000;
    console.log(`Generated ${imagePaths.length} images from PDF in ${conversionTime} seconds`);

    console.log('Uploading images to Contabo S3...');
    const uploadStartTime = Date.now();
    const imageUrls = await uploadToContabo(imagePaths);
    const uploadTime = (Date.now() - uploadStartTime) / 1000;
    console.log(`Successfully uploaded ${imageUrls.length} images to Contabo S3 in ${uploadTime} seconds`);

    const newspaper = new NewspaperDetails({
      newspaperLinks: imageUrls,
      totalpages: imageUrls.length,
      originalFilename: req.file.originalname,
      publicationDate: publicationDate,
      isPublished: isPublished,
      youtubeLink: (req.body.youtubeLink !== (undefined || null) ? req.body.youtubeLink : null)
    });

    await newspaper.save();
    console.log('Newspaper saved to database');

    // Clean up temporary files
    await unlink(pdfPath).catch(err => console.warn('PDF cleanup error:', err));
    await rm(PAGES_DIR, { recursive: true, force: true }).catch(err => console.warn('Pages dir cleanup error:', err));

    return res.json({
      success: true,
      message: 'Newspaper uploaded successfully',
      newspaperDetails: {
        id: newspaper._id,
        title: req.body.title || req.file.originalname,
        pageCount: imageUrls.length,
        date: publicationDate,
        isPublished: isPublished
      }
    });
  } catch (error) {
    console.error('Upload process error:', error);
    // Clean up in case of error
    await unlink(pdfPath).catch(err => console.warn('PDF cleanup error:', err));
    await rm(PAGES_DIR, { recursive: true, force: true }).catch(err => console.warn('Pages dir cleanup error:', err));

    return res.status(500).json({
      success: false,
      message: 'Failed to process newspaper upload',
      error: error.message
    });
  }
};

const getLatestNewspaper = async (req, res) => {
  try {
    const now = new Date();
    const latestNewspaper = await NewspaperDetails.findOne({
      isPublished: true,
      publicationDate: { $lte: now }
    }).sort({ publicationDate: -1 });

    if (!latestNewspaper) {
      return res.status(404).json({
        success: false,
        message: 'No published newspapers available'
      });
    }

    res.json({
      success: true,
      data: latestNewspaper
    });
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch the latest newspaper',
      error: error.message
    });
  }
};

const getNewspaperByDate = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }

    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const newspaper = await NewspaperDetails.findOne({
      publicationDate: { $gte: startDate, $lte: endDate },
      isPublished: true
    });

    if (!newspaper) {
      return res.status(404).json({
        success: false,
        message: 'No published newspaper found for this date'
      });
    }

    res.json({
      success: true,
      data: newspaper
    });
  } catch (error) {
    console.error('Date fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch newspaper by date',
      error: error.message
    });
  }
};

const getAvailableDates = async (req, res) => {
  try {
    const { month, year } = req.query;
    const now = new Date();

    let query = {
      isPublished: true,
      publicationDate: { $lte: now }
    };

    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);

      query.publicationDate.$gte = startDate;
      query.publicationDate.$lte = endDate;
    }

    const dates = await NewspaperDetails.find(query)
      .select('publicationDate')
      .sort({ publicationDate: 1 });

    const formattedDates = dates.map(item => {
      const date = new Date(item.publicationDate);
      return {
        date: date.toISOString().split('T')[0],
        id: item._id
      };
    });

    res.json({
      success: true,
      data: formattedDates
    });
  } catch (error) {
    console.error('Available dates fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch available dates',
      error: error.message
    });
  }
};

const getNewspaperByPagination = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 1;
    const skip = (page - 1) * limit;
    const now = new Date();

    // Get total count of published newspapers
    const totalNewspapers = await NewspaperDetails.countDocuments({
      isPublished: true,
      publicationDate: { $lte: now }
    });

    const totalPages = Math.ceil(totalNewspapers / limit);

    // Get the newspaper for the current page
    const newspaper = await NewspaperDetails.findOne({
      isPublished: true,
      publicationDate: { $lte: now }
    })
    .sort({ publicationDate: -1 })
    .skip(skip)
    .limit(limit);

    if (!newspaper) {
      return res.status(404).json({
        success: false,
        message: 'No published newspapers found',
      });
    }

    res.status(200).json({
      success: true,
      data: newspaper,
      pagination: {
        currentPage: page,
        totalPages,
        totalNewspapers,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });

  } catch (error) {
    console.error('getNewspaperByPagination:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch newspaper',
      error: error.message
    });
  }
};

const getNewspapersIncludeFuture = async (req, res) => {
  try {
    console.log(req.query);
    const page = parseInt(req.query.page) || 1;
    const includeFuture = req.query.includeFuture === 'true'; // Convert string to boolean
    const limit = 1;
    const skip = (page - 1) * limit;
    const now = new Date();

    // Build the query conditionally
    let query = {};
    if (!includeFuture) {
      query = {
        isPublished: true,  // Only include published newspapers
        publicationDate: { $lte: now }  // Additional safety check
      };
    }

    // Get total count of newspapers (with or without future ones)
    const totalNewspapers = await NewspaperDetails.countDocuments(query);

    const totalPages = Math.ceil(totalNewspapers / limit);

    // Get the newspaper for the current page
    const newspaper = await NewspaperDetails.findOne(query)
      .sort({ publicationDate: -1 })
      .skip(skip)
      .limit(limit);

    if (!newspaper) {
      return res.status(404).json({
        success: false,
        message: includeFuture
          ? 'No newspapers found'
          : 'No published newspapers found',
      });
    }

    res.status(200).json({
      success: true,
      data: newspaper,
      pagination: {
        currentPage: page,
        totalPages,
        totalNewspapers,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      includeFuture: includeFuture
    });

  } catch (error) {
    console.error('getNewspapersIncludeFuture:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch newspapers',
      error: error.message
    });
  }
};

const deleteNewspaper = async(req, res) => {
  try {
    const {id} = req.params;
    const deleteNewspaperDetails = await NewspaperDetails.findByIdAndDelete(id);
    if(!deleteNewspaperDetails)
    {
      return res.status(404).send({
      success: false,
      message: `Newspaper details not found with id : ${id}`,
      })
    }
    res.status(200).send({
      success: true,
      message: `Newspaper details deleted with id : ${id}`
    })
  } catch (error) {
    console.error('deleteNewspaper:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete the requested data',
      error: error.message
    });
  }
};

// Enhanced uploadImage function with better error handling
const uploadImage = async (req, res) => {
  console.log('Image upload request received');
  console.log('Headers:', req.headers);
  console.log('File:', req.file ? 'File present' : 'No file');

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }

  let tempFilePath = req.file.path;

  try {
    console.log('Processing image:', req.file.originalname);
    console.log('File size:', req.file.size);
    console.log('File path:', tempFilePath);

    // Read file buffer
    const fileBuffer = fs.readFileSync(tempFilePath);
    const fileName = path.basename(tempFilePath);

    // Upload to Contabo S3 using the same method as logo controller
    const result = await uploadToContaboS3(fileBuffer, fileName, req.file.mimetype, 'epaper/images');

    // Delete temporary file after successful upload
    await unlink(tempFilePath).catch(err =>
      console.error('Warning: Temp file deletion failed:', err)
    );

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      url: result.publicUrl,
      public_id: result.filePath,
      data: {
        url: result.publicUrl,
        filePath: result.filePath,
        publicId: result.filePath
      }
    });

  } catch (error) {
    // Enhanced error logging (same as logo controller)
    console.error('Image upload error details:', {
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
      message: 'Error uploading image',
      error: error.message,
      details: error.$metadata?.httpStatusCode ? `HTTP ${error.$metadata.httpStatusCode}` : 'S3 Client Error'
    });
  }
};

// Enhanced error handling middleware
const handleMulterError = (error, req, res, next) => {
  console.error('Multer error:', error);
  
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 100MB for PDFs and 10MB for images.'
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

module.exports = {
  uploadNewspaper: [upload.single('pdf'), handleMulterError, uploadNewspaper],
  getLatestNewspaper,
  getNewspaperByDate,
  getAvailableDates,
  getNewspaperByPagination,
  deleteNewspaper,
  getNewspapersIncludeFuture,
  uploadImage: [imageUpload.single('image'), handleMulterError, uploadImage]
};