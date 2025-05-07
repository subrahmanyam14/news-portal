const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const supabase = require("../supabase/config");
const { NewspaperDetails } = require('../model/NewPaper');
const pdfConverter = require('../utils/pdfConverter'); // Import our new PDF conversion utility

// Promisify file system functions
const unlink = promisify(fs.unlink);
const rm = promisify(fs.rm);
const mkdir = promisify(fs.mkdir);
const readFile = promisify(fs.readFile);

// Configure temp directories
const TEMP_DIR = path.join(__dirname, '..', 'temp');
const PAGES_DIR = path.join(TEMP_DIR, 'pages');

// Upload Images to Supabase
const uploadToSupabase = async (imagePaths) => {
  const urls = [];

  for (const imagePath of imagePaths) {
    const fileName = path.basename(imagePath);
    const fileBuffer = await readFile(imagePath);

    const { data, error } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .upload(`uploads/${Date.now()}-${fileName}`, fileBuffer, {
        contentType: 'image/png',
        upsert: false
      });

    if (error) throw new Error(`Failed to upload ${fileName}: ${error.message}`);

    const publicUrl = `${supabase.supabaseUrl}/storage/v1/object/public/${process.env.SUPABASE_BUCKET}/${data.path}`;
    urls.push(publicUrl);
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

    pageCount = await pdfConverter.validatePDF(pdfPath);
    console.log(`PDF validated. Contains ${pageCount} pages.`);

    let publicationDate = req.body.publicationDate || new Date();
    if (typeof publicationDate === 'string') publicationDate = new Date(publicationDate);

    // Set isPublished based on publication date
    const now = new Date();
    const isPublished = publicationDate <= now;

    console.log('Converting PDF to images...');
    const imagePaths = await pdfConverter.convertPDFToImages(pdfPath, PAGES_DIR);
    console.log(`Generated ${imagePaths.length} images from PDF`);

    console.log('Optimizing images...');
    const optimizedImagePaths = await pdfConverter.optimizeImages(imagePaths);
    console.log(`Optimized ${optimizedImagePaths.length} images successfully`);

    console.log('Uploading images to Supabase...');
    const imageUrls = await uploadToSupabase(optimizedImagePaths);
    console.log(`Successfully uploaded ${imageUrls.length} images to Supabase`);

    const newspaper = new NewspaperDetails({
      newspaperLinks: imageUrls,
      totalpages: imageUrls.length,
      originalFilename: req.file.originalname,
      publicationDate: publicationDate,
      isPublished: isPublished,
      youtubeLink: (req.body.youtubeLink !== (undefined || null)? req.body.youtubeLink: null)
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
        isPublished: true,  
        publicationDate: { $lte: now }  
      };
    }

    // Get total count of newspapers
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
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Upload image to Supabase
    const fileName = path.basename(req.file.path);
    const fileBuffer = await readFile(req.file.path);

    const { data, error } = await supabase.storage
      .from(process.env.SUPABASE_BUCKET)
      .upload(`uploads/${Date.now()}-${fileName}`, fileBuffer, {
        contentType: req.file.mimetype,
        upsert: false
      });

    if (error) throw new Error(`Failed to upload ${fileName}: ${error.message}`);

    const publicUrl = `${supabase.supabaseUrl}/storage/v1/object/public/${process.env.SUPABASE_BUCKET}/${data.path}`;

    // Delete local file after successful upload
    fs.unlink(req.file.path, (err) => {
      if (err) console.error('Error deleting temp file:', err);
    });

    res.status(200).json({
      message: 'Image uploaded successfully',
      url: publicUrl,
      public_id: data.path,
    });
  } catch (error) {
    console.error("Error in the uploadImage:", error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
};

module.exports = {
  uploadNewspaper: [pdfConverter.upload.single('pdf'), uploadNewspaper],
  getLatestNewspaper,
  getNewspaperByDate,
  getAvailableDates,
  getNewspaperByPagination,
  deleteNewspaper,
  getNewspapersIncludeFuture,
  uploadImage
};