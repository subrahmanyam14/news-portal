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

// Configure multer for PDF uploads
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
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, `upload-${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'), false);
  }
});

// Configure multer for image uploads (for uploadImage function)
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
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
    cb(null, `image-${Date.now()}-${safeName}`);
  }
});

const imageUpload = multer({
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB for images
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'), false);
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

// Optimized PDF to Images conversion
const convertPDFToImages = async (pdfPath, outputDir) => {
  try {
    if (!fs.existsSync(outputDir)) await mkdir(outputDir, { recursive: true });
    
    // Get the page count from the PDF
    const pageCount = await validatePDF(pdfPath);
    console.log(`PDF has ${pageCount} pages`);
    
    // Use pdftoppm with parallel processing
    console.log('Converting PDF to images with optimized settings...');
    const outputPrefix = path.join(outputDir, 'page');
    
    // First, determine optimal DPI setting based on page count
    // Use 150 DPI for standard quality but faster conversion
    const dpi = 150;
    
    // Use pdftoppm with optimized settings for speed
    // -r sets resolution (DPI)
    // -jpeg uses JPEG format which is faster to process than PNG
    // -jpegopt quality=85 provides good quality with faster processing
    // -l and -f parameters to process pages in parallel batches
    const batchSize = Math.min(pageCount, 4); // Process up to 4 pages at once
    const batches = [];
    
    for (let i = 0; i < pageCount; i += batchSize) {
      const startPage = i + 1;
      const endPage = Math.min(startPage + batchSize - 1, pageCount);
      
      // Create a batch for these pages
      batches.push({
        start: startPage,
        end: endPage,
        cmd: `pdftoppm -jpeg -jpegopt quality=85 -r ${dpi} -f ${startPage} -l ${endPage} "${pdfPath}" "${outputPrefix}"`
      });
    }
    
    // Run conversion batches in parallel
    await Promise.all(batches.map(batch => 
      execCmd(batch.cmd)
        .then(() => console.log(`Converted pages ${batch.start}-${batch.end}`))
        .catch(err => console.error(`Error converting pages ${batch.start}-${batch.end}:`, err))
    ));
    
    // Look for generated images
    const files = await readdir(outputDir);
    const generatedImages = files
      .filter(file => file.startsWith('page-') && (file.endsWith('.jpg') || file.endsWith('.jpeg')))
      .sort((a, b) => {
        // Sort by page number for correct ordering
        const numA = parseInt(a.match(/\d+/g)[0]);
        const numB = parseInt(b.match(/\d+/g)[0]);
        return numA - numB;
      })
      .map(file => path.join(outputDir, file));
    
    if (generatedImages.length === 0) {
      // Fallback to the original method if no images were generated
      console.log('Fast conversion failed, falling back to standard method...');
      // Use the original method as fallback
      return await convertPDFToImagesFallback(pdfPath, outputDir);
    }
    
    console.log(`Successfully converted ${generatedImages.length} pages with optimized pdftoppm`);
    return generatedImages;
  } catch (error) {
    console.error('Optimized PDF conversion error:', error);
    console.log('Falling back to standard conversion method...');
    // Use the original method as fallback
    return await convertPDFToImagesFallback(pdfPath, outputDir);
  }
};

// Original fallback method for PDF to image conversion
const convertPDFToImagesFallback = async (pdfPath, outputDir) => {
  try {
    // Method 1: Try pdftoppm (from poppler-utils)
    console.log('Trying standard pdftoppm conversion...');
    await execCmd(`pdftoppm -png -r 300 "${pdfPath}" "${path.join(outputDir, 'page')}"`);
    
    // Look for generated images
    const files = fs.readdirSync(outputDir);
    const pdftoppmImages = files
      .filter(file => file.startsWith('page-') && file.endsWith('.png'))
      .map(file => path.join(outputDir, file));
    
    if (pdftoppmImages.length > 0) {
      console.log(`Successfully converted ${pdftoppmImages.length} pages with standard pdftoppm`);
      return pdftoppmImages;
    }
    
    // Method 2: Try ImageMagick
    console.log('Trying ImageMagick conversion...');
    await execCmd(`convert -density 300 "${pdfPath}" "${path.join(outputDir, 'page')}-%d.png"`);
    
    // Look for generated images
    const imageMagickImages = files
      .filter(file => file.startsWith('page-') && file.endsWith('.png'))
      .map(file => path.join(outputDir, file));
    
    if (imageMagickImages.length > 0) {
      console.log(`Successfully converted ${imageMagickImages.length} pages with ImageMagick`);
      return imageMagickImages;
    }
    
    // Method 3: Try GhostScript
    console.log('Trying GhostScript conversion...');
    await execCmd(`gs -dSAFER -dBATCH -dNOPAUSE -sDEVICE=png16m -r300 -dTextAlphaBits=4 -dGraphicsAlphaBits=4 -o "${path.join(outputDir, 'page')}-%d.png" "${pdfPath}"`);
    
    // Look for generated images
    const ghostScriptImages = files
      .filter(file => file.startsWith('page-') && file.endsWith('.png'))
      .map(file => path.join(outputDir, file));
    
    if (ghostScriptImages.length > 0) {
      console.log(`Successfully converted ${ghostScriptImages.length} pages with GhostScript`);
      return ghostScriptImages;
    }
    
    throw new Error('No images were generated from the PDF with any method');
  } catch (error) {
    console.error('PDF fallback conversion error:', error);
    throw new Error(`Failed to convert PDF to images: ${error.message}`);
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

// Controller for Newspaper Upload
const uploadNewspaper = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No PDF file uploaded' });

  const pdfPath = req.file.path;
  let pageCount = 0;

  try {
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

// Updated uploadImage function to match logo controller approach
const uploadImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ 
      success: false, 
      message: 'No file uploaded' 
    });
  }

  let tempFilePath = req.file.path;

  try {
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

module.exports = {
  uploadNewspaper: [upload.single('pdf'), uploadNewspaper],
  getLatestNewspaper,
  getNewspaperByDate,
  getAvailableDates,
  getNewspaperByPagination,
  deleteNewspaper,
  getNewspapersIncludeFuture,
  uploadImage: [imageUpload.single('image'), uploadImage]
};