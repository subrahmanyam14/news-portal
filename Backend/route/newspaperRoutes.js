// newspaperRoutes.js
const express = require('express');
const router = express.Router();
const { getLatestNewspaper, getNewspaperByDate, uploadNewspaper } = require('../controller/newspaperController');


// Public access
router.get('/', getLatestNewspaper);

router.get("/date", getNewspaperByDate);



// Admin routes
router.post('/upload', uploadNewspaper);

module.exports = router;