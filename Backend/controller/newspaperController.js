const express = require('express');
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');
const poppler = require('pdf-poppler');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util')
const cloudinary = require('../cloudinary/config');
const {NewspaperDetails} = require('../model/NewPaper');

// Promisify file system functions
const unlink = promisify(fs.unlink);
const rm = promisify(fs.rm);
const mkdir = promisify(fs.mkdir);

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
  limits: { fileSize: 100 * 1024 * 1024 }, // Increased to 100MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'), false);
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

// Convert PDF to Ultra-HD Images
const convertPDFToImages = async (pdfPath, outputDir) => {
  try {
    if (!fs.existsSync(outputDir)) await mkdir(outputDir, { recursive: true });

    const options = {
      format: 'png', 
      out_dir: outputDir,
      out_prefix: 'page',
      scale: 1200 // MAX DPI for crystal-clear images
    };

    await poppler.convert(pdfPath, options);

    const imagePaths = fs.readdirSync(outputDir)
      .filter(file => file.endsWith('.png'))
      .map(file => path.join(outputDir, file));

    return imagePaths;
  } catch (error) {
    console.error('PDF conversion error:', error);
    throw new Error(`Failed to convert PDF to images: ${error.message}`);
  }
};

// Optimize Images WITHOUT Losing Quality
const optimizeImages = async (imagePaths) => {
  const optimizedPaths = [];

  for (const imagePath of imagePaths) {
    const optimizedPath = imagePath.replace('.png', '_optimized.png');

    await sharp(imagePath)
      .png({ compressionLevel: 0 }) // No compression = 100% quality
      .toFile(optimizedPath);

    await unlink(imagePath); // Remove original file
    fs.renameSync(optimizedPath, imagePath); // Rename optimized file
    optimizedPaths.push(imagePath);
  }

  return optimizedPaths;
};

// Upload Images to Cloudinary (100% Quality)
const uploadToCloudinary = async (imagePaths) => {
  const urls = [];
  const MAX_RETRIES = 3;

  for (const imagePath of imagePaths) {
    let retries = 0;
    let uploaded = false;

    while (!uploaded && retries < MAX_RETRIES) {
      try {
        const result = await cloudinary.uploader.upload(imagePath, {
          folder: 'newspapers',
          quality: 100, // MAX quality
          format: 'png', // Lossless PNG format
          timeout: 180000 // 3 min timeout
        });

        urls.push(result.secure_url);
        uploaded = true;
      } catch (uploadError) {
        retries++;
        console.warn(`Upload retry ${retries}/${MAX_RETRIES} for ${path.basename(imagePath)}: ${uploadError.message}`);
        if (retries >= MAX_RETRIES) throw uploadError;
        await new Promise(resolve => setTimeout(resolve, 2000 * retries));
      }
    }

    await unlink(imagePath); // Cleanup local file
  }

  return urls;
};

// Controller for Newspaper Upload
const uploadNewspaper = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No PDF file uploaded' });

  const pdfPath = req.file.path;
  let pageCount = 0;

  try {
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
    const imagePaths = await convertPDFToImages(pdfPath, PAGES_DIR);
    console.log(`Generated ${imagePaths.length} ultra-HD images from PDF`);

    console.log('Optimizing images...');
    const optimizedImagePaths = await optimizeImages(imagePaths);
    console.log(`Optimized ${optimizedImagePaths.length} images successfully`);

    console.log('Uploading images to Cloudinary...');
    const imageUrls = await uploadToCloudinary(optimizedImagePaths);
    console.log(`Successfully uploaded ${imageUrls.length} images to Cloudinary`);

    const newspaper = new NewspaperDetails({
      newspaperLinks: imageUrls,
      totalpages: imageUrls.length,
      originalFilename: req.file.originalname,
      publicationDate: publicationDate,
      isPublished: isPublished
    });

    await newspaper.save();
    console.log('Newspaper saved to database');

    await unlink(pdfPath);
    await rm(PAGES_DIR, { recursive: true, force: true });

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
const deleteNewspaper = async( req, res ) => {
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
}

const uploadImage = async (req, res) => {
  try {
      const result = await cloudinary.uploader.upload(req.file.path, {
          folder: 'uploads', // Optional folder name in Cloudinary
      });

      // Delete local file after upload
      fs.unlinkSync(req.file.path);

      res.status(200).json({
          message: 'Image uploaded successfully',
          url: result.secure_url,
          public_id: result.public_id,
      });
  } catch (error) {
    console.log("Error in the uploadImage: ", error);
      res.status(500).json({ message: 'Upload failed', error: error.message });
  }
}

module.exports = {
  uploadNewspaper: [upload.single('pdf'), uploadNewspaper],
  getLatestNewspaper,
  getNewspaperByDate,
  getAvailableDates,
  getNewspaperByPagination,
  deleteNewspaper,
  getNewspapersIncludeFuture,
  uploadImage
};