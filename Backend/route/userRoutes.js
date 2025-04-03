const express = require("express");
const router = express.Router();
const {
  auth,
  login,
  updatePassword,
  forgotPassword,
  resetPassword
} = require("../controller/userController");

// Public routes
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// Protected routes
router.use(auth);
router.patch("/update-password", updatePassword);

module.exports = router;