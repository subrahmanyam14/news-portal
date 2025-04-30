const mongoose = require('mongoose');

const LogoSchema = new mongoose.Schema({
	url: {
		type: String,
		required: [true, 'Logo URL is required']
	},
	publicId: {
		type: String,
		required: [true, 'Cloudinary public ID is required']
	},
	createdAt: {
		type: Date,
		default: Date.now
	},
	updatedAt: {
		type: Date,
		default: Date.now
	}
});

// We only want one logo at a time, so we'll use a static method to create/update
LogoSchema.statics.updateLogo = async function (logoData) {
	// Find the first logo (there should only be one)
	const existingLogo = await this.findOne();

	if (existingLogo) {
		// Update the existing logo
		existingLogo.url = logoData.url;
		existingLogo.publicId = logoData.publicId;
		existingLogo.updatedAt = Date.now();
		return await existingLogo.save();
	} else {
		// Create a new logo
		return await this.create(logoData);
	}
};

module.exports = mongoose.model('Logo', LogoSchema);