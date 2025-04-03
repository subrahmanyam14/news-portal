const express = require('express');
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');
const poppler = require('pdf-poppler');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const cloudinary = require('../cloudinary/config');
const NewPaperModel = require('../model/NewPaper');

const unlink = promisify(fs.unlink);
const rm = promisify(fs.rm);
const mkdir = promisify(fs.mkdir);

const TEMP_DIR = path.join(__dirname, '..', 'temp');
const PAGES_DIR = path.join(TEMP_DIR, 'pages');

const ensureDirsExist = async () => {
  if (!fs.existsSync(TEMP_DIR)) await mkdir(TEMP_DIR, { recursive: true });
  if (!fs.existsSync(PAGES_DIR)) await mkdir(PAGES_DIR, { recursive: true });
};

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
  limits: { fileSize: 100 * 1024 * 1024 }, 
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'), false);
  }
});

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

// Convert PDF to Lossless PNG Images
const convertPDFToImages = async (pdfPath, outputDir) => {
  try {
    if (!fs.existsSync(outputDir)) await mkdir(outputDir, { recursive: true });

    const options = {
      format: 'png', 
      out_dir: outputDir,
      out_prefix: 'page',
      scale: 1200 // Keep ultra-HD resolution
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

// Upload Images to Cloudinary with Max Quality
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
          format: 'png', // Keep lossless format
          quality: '100', // 100% quality, no compression
          flags: 'lossless', // Ensure no loss in clarity
          timeout: 180000
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

    await unlink(imagePath);
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

    console.log('Converting PDF to lossless PNG images...');
    const imagePaths = await convertPDFToImages(pdfPath, PAGES_DIR);
    console.log(`Generated ${imagePaths.length} ultra-HD images from PDF`);

    console.log('Uploading images to Cloudinary (100% Quality)...');
    const imageUrls = await uploadToCloudinary(imagePaths);
    console.log(`Successfully uploaded ${imageUrls.length} images to Cloudinary`);

    const newspaper = new NewPaperModel({
      newspaperLinks: imageUrls,
      totalpages: imageUrls.length,
      originalFilename: req.file.originalname,
      publicationDate: publicationDate
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
        date: publicationDate
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
    const latestNewspaper = await NewPaperModel.findOne().sort({ createdAt: -1 });

    if (!latestNewspaper) {
      return res.status(404).json({ 
        success: false,
        message: 'No newspapers available'
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


// Get newspaper by specific date
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

    const newspaper = await NewPaperModel.findOne({
      createdAt: { $gte: startDate, $lte: endDate }
    });

    if (!newspaper) {
      return res.status(404).json({ 
        success: false,
        message: 'No newspaper found for this date' 
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

// Get available dates (for calendar)
const getAvailableDates = async (req, res) => {
  try {
    const { month, year } = req.query;
    
    let query = {};
    
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      
      query = {
        publicationDate: { $gte: startDate, $lte: endDate }
      };
    }
    
    const dates = await NewPaperModel.find(query)
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

module.exports = {
  uploadNewspaper: [upload.single('pdf'), uploadNewspaper],
  getLatestNewspaper,
  getNewspaperByDate,
  getAvailableDates
};