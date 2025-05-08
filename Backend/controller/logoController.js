const multer = require('multer');
const fs = require('fs');
const path = require('path');
const Logo = require('../model/Logo');
const { promisify } = require('util');
const supabase = require("../supabase/config");

// Promisify file system functions
const unlink = promisify(fs.unlink);

// @desc    Get logo
// @route   GET /api/v1/logo
// @access  Public
exports.getLogo = async (req, res) => {
    try {
        const logo = await Logo.findOne();

        if (!logo) {
            return res.status(404).json({ 
                success: false, 
                message: 'No logo found' 
            });
        }

        res.status(200).json({
            success: true,
            data: logo
        });
    } catch (error) {
        console.error('Error fetching logo:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching logo',
            error: error.message
        });
    }
};

// @desc    Add/Update logo
// @route   POST /api/v1/logo
// @access  Private (superadmin)
exports.addLogo = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ 
            success: false, 
            message: 'Please upload a logo image' 
        });
    }

    let tempFilePath = req.file.path;

    try {
        // Find existing logo to delete from Supabase if it exists
        const existingLogo = await Logo.findOne();

        if (existingLogo && existingLogo.filePath) {
            try {
                // Delete old logo from Supabase
                const { error: deleteError } = await supabase.storage
                    .from(process.env.SUPABASE_BUCKET)
                    .remove([existingLogo.filePath]);
                
                if (deleteError) {
                    console.error('Error deleting old logo:', deleteError.message);
                    // Don't fail the operation if deletion fails
                }
            } catch (deleteErr) {
                console.error('Error in old logo deletion:', deleteErr);
            }
        }

        // Upload new logo to Supabase
        const fileName = path.basename(req.file.path);
        const fileBuffer = fs.readFileSync(req.file.path);
        const filePath = `epaper/logos/${Date.now()}-${fileName}`;
        
        const { data, error: uploadError } = await supabase.storage
            .from(process.env.SUPABASE_BUCKET)
            .upload(filePath, fileBuffer, {
                contentType: req.file.mimetype,
                upsert: false
            });

        if (uploadError) {
            throw new Error(`Failed to upload logo: ${uploadError.message}`);
        }

        // Generate public URL
        const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/${process.env.SUPABASE_BUCKET}/${filePath}`;

        // Create or update logo in database
        const logoData = {
            url: publicUrl,
            filePath: filePath,
            publicId: filePath // Using filePath as publicId since we're not using Cloudinary
        };

        let logo;
        if (existingLogo) {
            logo = await Logo.findByIdAndUpdate(
                existingLogo._id, 
                logoData, 
                { new: true, runValidators: true }
            );
        } else {
            logo = await Logo.create(logoData);
        }

        // Only delete temp file after successful upload and database operation
        await unlink(tempFilePath).catch(err => 
            console.error('Warning: Temp file deletion failed:', err)
        );

        res.status(200).json({
            success: true,
            data: logo
        });

    } catch (error) {
        // Remove temporary file if it exists
        if (fs.existsSync(tempFilePath)) {
            await unlink(tempFilePath).catch(err => 
                console.error('Error deleting temp file during cleanup:', err)
            );
        }

        console.error('Logo upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading logo',
            error: error.message
        });
    }
};