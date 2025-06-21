const express = require('express');
const router = express.Router();
const { upload, handleFileUpload } = require("../controller/uploadController");

router.post('/upload', upload.single('file'), handleFileUpload);

module.exports = router;