// newspaperRoutes.js
const express = require('express');
const router = express.Router();
const { getLatestNewspaper, getNewspaperByDate, getNewspaperByPagination, getAvailableDates, deleteNewspaper, uploadNewspaper } = require('../controller/newspaperController');


// Public access
router.get('/', getLatestNewspaper);

router.get("/date", getNewspaperByDate);

router.get("/page", getNewspaperByPagination);

router.get("/dates", getAvailableDates);

router.delete("/:id", deleteNewspaper);

// Admin routes
router.post('/upload', uploadNewspaper);

module.exports = router;