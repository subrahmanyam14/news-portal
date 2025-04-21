// newspaperRoutes.js
const express = require('express');
const router = express.Router();
const multer = require("multer");
const { getNewspapersIncludeFuture, getLatestNewspaper, getNewspaperByDate, getNewspaperByPagination, getAvailableDates, deleteNewspaper, uploadNewspaper, uploadImage } = require('../controller/newspaperController');

const upload = multer({ dest: 'temp/' }); // Temporary storage

router.post('/upload', upload.single('image'), uploadImage);

// Public access
router.get('/', getLatestNewspaper);

router.get("/date", getNewspaperByDate);

router.get("/page", getNewspaperByPagination);

router.get("/dates", getAvailableDates);

router.get("/future", getNewspapersIncludeFuture);

router.delete("/:id", deleteNewspaper);

// Admin routes
router.post('/upload', uploadNewspaper);

module.exports = router;