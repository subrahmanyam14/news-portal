// Updated PDF to image conversion using pdf.js with font handling fix
const multer = require('multer');
const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const { createCanvas } = require('canvas');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

// Set up standard font data URL for pdf.js
const PDFJS_FONT_PATH = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'standard_fonts');
pdfjsLib.GlobalWorkerOptions.workerSrc = require.resolve('pdfjs-dist/legacy/build/pdf.worker.js');

// Promisify file system functions
const unlink = promisify(fs.unlink);
const rm = promisify(fs.rm);
const mkdir = promisify(fs.mkdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

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

// Validate PDF
const validatePDF = async (pdfPath) => {
  try {
    const pdfBytes = await readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const pageCount = pdfDoc.getPageCount();
    
    if (pageCount === 0) throw new Error('PDF file has no pages');
    return pageCount;
  } catch (error) {
    console.error('PDF validation error:', error);
    throw new Error(`Invalid PDF file: ${error.message}`);
  }
};

// Convert PDF to images using pdf.js
const convertPDFToImages = async (pdfPath, outputDir) => {
  try {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) await mkdir(outputDir, { recursive: true });
    
    // Load the PDF document with standardFontDataUrl configured
    const data = new Uint8Array(await readFile(pdfPath));
    const loadingTask = pdfjsLib.getDocument({
      data,
      standardFontDataUrl: PDFJS_FONT_PATH,
      cMapUrl: path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'cmaps'),
      cMapPacked: true,
      disableFontFace: false
    });
    
    const pdfDocument = await loadingTask.promise;
    const pageCount = pdfDocument.numPages;
    
    console.log(`Converting ${pageCount} pages from PDF to images...`);
    
    const imagePaths = [];
    
    // Set rendering parameters
    const scale = 2.0; // Higher scale means better quality but larger file size
    
    // Process each page
    for (let i = 1; i <= pageCount; i++) {
      console.log(`Processing page ${i} of ${pageCount}`);
      
      // Get the page
      const page = await pdfDocument.getPage(i);
      
      // Get the viewport
      const viewport = page.getViewport({ scale });
      
      // Create a canvas for rendering
      const canvas = createCanvas(viewport.width, viewport.height);
      const context = canvas.getContext('2d');
      
      // Prepare canvas for rendering
      context.fillStyle = 'white';
      context.fillRect(0, 0, viewport.width, viewport.height);
      
      // Render the page
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      // Save the rendered page as an image
      const outputPath = path.join(outputDir, `page_${i-1}.png`);
      const pngData = canvas.toBuffer('image/png');
      await writeFile(outputPath, pngData);
      
      imagePaths.push(outputPath);
      console.log(`Successfully converted page ${i} to ${outputPath}`);
    }
    
    return imagePaths;
  } catch (error) {
    console.error('PDF conversion error:', error);
    
    // Create fallback images if conversion fails
    try {
      const pdfBytes = await readFile(pdfPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pageCount = pdfDoc.getPageCount();
      const imagePaths = [];
      
      console.log(`Creating ${pageCount} fallback images...`);
      
      for (let i = 0; i < pageCount; i++) {
        // Create fallback image
        const canvas = createCanvas(1240, 1754);
        const ctx = canvas.getContext('2d');
        
        // Fill with white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, 1240, 1754);
        
        // Add text indicating conversion failure
        ctx.fillStyle = 'black';
        ctx.font = '30px Arial';
        ctx.fillText(`Page ${i + 1} conversion failed`, 400, 400);
        ctx.font = '20px Arial';
        ctx.fillText('Using fallback image - PDF conversion error', 400, 450);
        
        const outputPath = path.join(outputDir, `page_${i}.png`);
        const buffer = canvas.toBuffer('image/png');
        await writeFile(outputPath, buffer);
        
        imagePaths.push(outputPath);
      }
      
      return imagePaths;
    } catch (fallbackError) {
      console.error('Fallback image creation failed:', fallbackError);
      throw new Error(`Failed to convert PDF to images: ${error.message}, fallback also failed: ${fallbackError.message}`);
    }
  }
};

// Optimize Images with sharp
const optimizeImages = async (imagePaths) => {
  const optimizedPaths = [];

  for (const imagePath of imagePaths) {
    const optimizedPath = imagePath.replace('.png', '_optimized.png');

    await sharp(imagePath)
      .png({ 
        quality: 90, // Slightly reduced quality for better compression
        compressionLevel: 6 // Balanced compression
      })
      .toFile(optimizedPath);

    await unlink(imagePath);
    fs.renameSync(optimizedPath, imagePath);
    optimizedPaths.push(imagePath);
  }

  return optimizedPaths;
};

// Clean up temp files after processing
const cleanupTempFiles = async (pdfPath) => {
  try {
    if (fs.existsSync(pdfPath)) {
      await unlink(pdfPath);
      console.log(`Cleaned up temporary PDF file: ${pdfPath}`);
    }
  } catch (error) {
    console.error(`Error cleaning up temp files: ${error.message}`);
  }
};

module.exports = {
  ensureDirsExist,
  validatePDF,
  convertPDFToImages,
  optimizeImages,
  cleanupTempFiles,
  upload
};