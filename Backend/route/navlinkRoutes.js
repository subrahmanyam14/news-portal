const  { createNavLinks, createMultipleNavLinks, getNavLinks, updateNavLinks, addSingleNavLink, deleteNavLink, clearAllNavLinks } = require('../controller/navlinkController');

const router = require('express').Router();

router.post('/create', createNavLinks);
router.get('/get', getNavLinks);
router.put('/update/:id', updateNavLinks);
router.post('/add', addSingleNavLink);
router.delete('/delete/:id', deleteNavLink);
router.delete('/clear', clearAllNavLinks);
router.post('/create-multiple', createMultipleNavLinks);

module.exports = router;


