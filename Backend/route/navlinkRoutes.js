const  { createNavLinks, createMultipleNavLinks, getNavLinks, updateNavLinks, addSingleNavLink, deleteNavLink, clearAllNavLinks } = require('../controller/navlinkController');
const {authorize, protect} = require("../middleware/auth");

const router = require('express').Router();

router.post('/create',  protect, authorize("admin", "superadmin"), createNavLinks);
router.get('/get', getNavLinks);
router.put('/update/:id',  protect, authorize("admin", "superadmin"), updateNavLinks);
router.post('/add',  protect, authorize("admin", "superadmin"),addSingleNavLink);
router.delete('/delete/:id',  protect, authorize("admin", "superadmin"), deleteNavLink);
router.delete('/clear',  protect, authorize("admin", "superadmin"), clearAllNavLinks);
router.post('/create-multiple',  protect, authorize("admin", "superadmin"), createMultipleNavLinks);

module.exports = router;


