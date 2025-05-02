const multer = require('multer');
const fs = require('fs');
const Logo = require('../model/Logo');
const { promisify } = require('util');
const cloudinary = require('../cloudinary/config');

// Promisify file system functions
const unlink = promisify(fs.unlink);

// @desc    Get logo
// @route   GET /api/v1/logo
// @access  Public
exports.getLogo = async (req, res) => {
	const logo = await Logo.findOne();

	if (!logo) {
		return res.status(404).json({ success: false, message: 'No logo found' });
	}

	res.status(200).json({
		success: true,
		data: logo
	});
};

// @desc    Add/Update logo
// @route   POST /api/v1/logo
// @access  Private (superadmin)
exports.addLogo = async (req, res) => {
	if (!req.file) {
		return res.status(400).json({ success: false, message: 'Please upload a logo image' });
	}

	try {
		// Find existing logo to delete from cloudinary if it exists
		const existingLogo = await Logo.findOne();

		if (existingLogo) {
			// Delete old logo from cloudinary
			await cloudinary.uploader.destroy(existingLogo.publicId);
		}

		// Upload new logo to cloudinary
		const result = await cloudinary.uploader.upload(req.file.path, {
			folder: 'epaper/logos',
			resource_type: 'image'
		});

		// Remove temporary file
		await unlink(req.file.path);

		// Create or update logo in database
		const logo = await Logo.updateLogo({
			url: result.secure_url,
			publicId: result.public_id
		});

		res.status(200).json({
			success: true,
			data: logo
		});
	} catch (error) {
		// Remove temporary file if it exists
		if (req.file && req.file.path) {
			await unlink(req.file.path).catch(err => console.error('Error deleting temp file:', err));
		}

		console.error('Logo upload error:', error);
		return res.status(500).json({
			success: false,
			message: 'Error uploading logo',
			error: error.message
		});
	}
};