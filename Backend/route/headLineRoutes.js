const  { createHeadLine, createMultipleHeadLine, getHeadLine, updateHeadLine, addSingleHeadLine, deleteHeadLine, clearAllHeadLine } = require('../controller/headLineController');

const router = require('express').Router();

router.post('/create', createHeadLine);
router.get('/get', getHeadLine);
router.put('/update/:id', updateHeadLine);
router.post('/add', addSingleHeadLine);
router.delete('/delete/:id', deleteHeadLine);
router.delete('/clear', clearAllHeadLine);
router.post('/create-multiple', createMultipleHeadLine);

module.exports = router;


