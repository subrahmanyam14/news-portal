const  { createHeadLine, createMultipleHeadLine, getHeadLine, updateHeadLine, addSingleHeadLine, deleteHeadLine, clearAllHeadLine } = require('../controller/headLineController');
const {authorize, protect} = require("../middleware/auth");

const router = require('express').Router();

router.post('/create', protect, authorize("admin", "superadmin"), createHeadLine);
router.get('/get', getHeadLine);
router.put('/update/:id', protect, authorize("admin", "superadmin"), updateHeadLine);
router.post('/add', protect, authorize("admin", "superadmin"), addSingleHeadLine);
router.delete('/delete/:id', protect, authorize("admin", "superadmin"), deleteHeadLine);
router.delete('/clear', protect, authorize("admin", "superadmin"), clearAllHeadLine);
router.post('/create-multiple', protect, authorize("admin", "superadmin"), createMultipleHeadLine);

module.exports = router;


