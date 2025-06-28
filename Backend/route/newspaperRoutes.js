// newspaperRoutes.js
const express = require('express');
const router = express.Router();
const multer = require("multer");
const { getNewspapersIncludeFuture, getLatestNewspaper, getNewspaperByDate, getNewspaperByPagination, getAvailableDates, deleteNewspaper, uploadNewspaper, uploadImage } = require('../controller/newspaperController');
const {authorize, protect} = require("../middleware/auth");

const upload = multer({ dest: 'temp/' }); // Temporary storage

router.post('/upload', upload.single('image'), uploadImage);

// Public access
router.get('/', getLatestNewspaper);

router.get("/date", getNewspaperByDate);

router.get("/page", getNewspaperByPagination);

router.get("/dates", getAvailableDates);

router.get("/future", protect, authorize("admin", "superadmin"), getNewspapersIncludeFuture);

router.delete("/:id", protect, authorize("admin", "superadmin"), deleteNewspaper);

// Admin routes
router.post('/upload-pdf',  protect, authorize("admin", "superadmin"), uploadNewspaper);

module.exports = router;
