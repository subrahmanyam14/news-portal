const express = require("express");
const router = express.Router();
const {
  login,
  updatePassword,
  forgotPassword,
  resetPassword,
  addAdmin,
  getAdmins,
  updateAdminPermissions,
  deleteAdmin
} = require("../controller/userController");
const {authorize, protect} = require("../middleware/auth");
// Public routes
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Protected routes

router.patch("/update-password", protect, updatePassword);


// Add new admin
router.post('/admins', protect, authorize("superadmin"), addAdmin);

// Get all admins
router.get('/admins', protect, authorize("superadmin"), getAdmins);

// Update admin permissions
router.put('/admins/:id/permissions', protect, authorize("superadmin"), updateAdminPermissions);

// Delete admin
router.delete('/admins/:id', protect, authorize("superadmin"), deleteAdmin);

module.exports = router;