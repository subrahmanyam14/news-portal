const multer = require('multer');
const { PDFDocument } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const {NewspaperDetails} = require('../model/NewPaper');
const { exec } = require('child_process');

// Promisify file system functions
const unlink = promisify(fs.unlink);
const rm = promisify(fs.rm);
const mkdir = promisify(fs.mkdir);
const readdir = promisify(fs.readdir);

// Configure directories
const TEMP_DIR = path.join(__dirname, '..', 'temp');
const PAGES_DIR = path.join(TEMP_DIR, 'pages');
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
const NEWSPAPERS_DIR = path.join(UPLOADS_DIR, 'newspapers');
const IMAGES_DIR = path.join(UPLOADS_DIR, 'images');

// Ensure directories exist
const ensureDirsExist = async () => {
  if (!fs.existsSync(TEMP_DIR)) await mkdir(TEMP_DIR, { recursive: true });
  if (!fs.existsSync(PAGES_DIR)) await mkdir(PAGES_DIR, { recursive: true });
  if (!fs.existsSync(UPLOADS_DIR)) await mkdir(UPLOADS_DIR, { recursive: true });
  if (!fs.existsSync(NEWSPAPERS_DIR)) await mkdir(NEWSPAPERS_DIR, { recursive: true });
  if (!fs.existsSync(IMAGES_DIR)) await mkdir(IMAGES_DIR, { recursive: true });
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

// Generate local server URL for images
const generateLocalImageUrl = (filePath) => {
  const relativePath = filePath.replace(path.join(__dirname, '..'), '');
  return `${process.env.BASE_URL || 'http://localhost:3000'}${relativePath.replace(/\\/g, '/')}`;
};

// Save file to local server storage
const saveToLocalStorage = async (fileBuffer, fileName, folder = 'newspapers') => {
  try {
    const timestamp = Date.now();
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = path.join(UPLOADS_DIR, folder, `${timestamp}-${safeFileName}`);
    
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
    
    // Write file to disk
    await fs.promises.writeFile(filePath, fileBuffer);
    
    // Generate public URL
    const publicUrl = generateLocalImageUrl(filePath);
    
    console.log('File saved to local storage:', filePath);
    
    return {
      publicUrl,
      filePath,
      fileName: `${timestamp}-${safeFileName}`
    };
  } catch (error) {
    console.error('Local storage save error:', error);
    throw new Error(`Failed to save file to local storage: ${error.message}`);
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

// Save Images to Local Storage with optimized batch processing
const saveImagesToLocal = async (imagePaths) => {
  const urls = [];
  const batchSize = 2; // Process 2 images at a time for better parallel processing

  // Process images in batches
  for (let i = 0; i < imagePaths.length; i += batchSize) {
    const batch = imagePaths.slice(i, i + batchSize);
    const batchPromises = batch.map(async (imagePath) => {
      const fileName = path.basename(imagePath);
      const fileBuffer = fs.readFileSync(imagePath);

      try {
        const result = await saveToLocalStorage(fileBuffer, fileName, 'newspapers');

        // Clean up the temporary image file after successful save
        await unlink(imagePath).catch(err => console.warn(`Image cleanup error for ${fileName}:`, err));

        console.log(`Successfully saved: ${fileName}`);
        return result.publicUrl;
      } catch (error) {
        console.error(`Save failed for ${fileName}:`, error.message);
        throw new Error(`Failed to save ${fileName}: ${error.message}`);
      }
    });

    // Wait for this batch to complete
    const batchUrls = await Promise.all(batchPromises);
    urls.push(...batchUrls);

    console.log(`Saved batch ${i/batchSize + 1} of ${Math.ceil(imagePaths.length/batchSize)}`);
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

    console.log('Saving images to local storage...');
    const saveStartTime = Date.now();
    const imageUrls = await saveImagesToLocal(imagePaths);
    const saveTime = (Date.now() - saveStartTime) / 1000;
    console.log(`Successfully saved ${imageUrls.length} images to local storage in ${saveTime} seconds`);

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
    
    // First find the newspaper to get the file paths
    const newspaper = await NewspaperDetails.findById(id);
    
    if(!newspaper) {
      return res.status(404).send({
        success: false,
        message: `Newspaper details not found with id : ${id}`,
      });
    }

    // Delete all image files from server storage by extracting paths from URLs
    if (newspaper.newspaperLinks && newspaper.newspaperLinks.length > 0) {
      for (const imageUrl of newspaper.newspaperLinks) {
        try {
          // Parse the URL to extract the path
          const urlObj = new URL(imageUrl);
          const urlPath = urlObj.pathname;
          
          // Remove the base URL part to get the relative path
          const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
          let relativePath = urlPath;
          
          if (urlPath.startsWith('/uploads/')) {
            relativePath = urlPath.substring(1); // Remove leading slash
          }
          
          const fullPath = path.join(__dirname, '..', relativePath);
          
          // Check if file exists and delete it
          if (fs.existsSync(fullPath)) {
            await unlink(fullPath);
            console.log(`Deleted file: ${fullPath}`);
          }
        } catch (fileError) {
          console.error(`Error deleting file from URL ${imageUrl}:`, fileError);
          // Continue with other files even if one fails
        }
      }
    }

    // Now delete the database record
    const deleteNewspaperDetails = await NewspaperDetails.findByIdAndDelete(id);
    
    if(!deleteNewspaperDetails) {
      return res.status(404).send({
        success: false,
        message: `Newspaper details not found with id : ${id}`,
      });
    }

    res.status(200).send({
      success: true,
      message: `Newspaper details and associated files deleted with id : ${id}`
    });

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

    // Save to local storage
    const result = await saveToLocalStorage(fileBuffer, fileName, 'images');

    // Delete temporary file after successful save
    await unlink(tempFilePath).catch(err =>
      console.error('Warning: Temp file deletion failed:', err)
    );

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      url: result.publicUrl,
      filePath: result.filePath,
      data: {
        url: result.publicUrl,
        filePath: result.filePath
      }
    });

  } catch (error) {
    console.error('Image upload error details:', {
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
      message: 'Error uploading image',
      error: error.message
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