const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { getLogo, addLogo } = require('../controller/logoController');
const { protect, authorize } = require('../middleware/auth');

// Configure multer for logo uploads
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, path.join(__dirname, '..', 'temp'));
	},
	filename: (req, file, cb) => {
		const safeName = file.originalname.replace(/[^a-zA-Z0-9.]/g, '_');
		cb(null, `logo-${Date.now()}-${safeName}`);
	}
});

const upload = multer({
	storage,
	limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for logo files
	fileFilter: (req, file, cb) => {
		// Accept only image files
		const filetypes = /jpeg|jpg|png|gif|svg|webp/;
		const mimetype = filetypes.test(file.mimetype);
		const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

		if (mimetype && extname) {
			return cb(null, true);
		}
		cb(new Error('Only image files are allowed'), false);
	}
});

// Public route to get logo
router.get('/', getLogo);

// Protected route to upload/update logo (superadmin only)
router.post('/', protect, authorize("superadmin"), upload.single('logo'), addLogo);

module.exports = router;