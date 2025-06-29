// authController.js
const UserDetails = require("../model/User"); // Adjust path as needed
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

require("dotenv").config();


// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
};

// Auth Middleware
const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await UserDetails.findById(decoded.id);

    if (!user || user.role !== "superadmin") {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Login Controller
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Find user
    const user = await UserDetails.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        fullname: user.fullname,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Add Admin
const addAdmin = async (req, res) => {
  try {
    const { fullname, email, password, role, permissions } = req.body;

    if (!fullname || !email || !password || !role || !(permissions.length > 0)) {
      return res.status(400).send({ error: "All fields are required..." });
    }
    
    const isEmailExisting = await UserDetails.findOne({ email });
    if (isEmailExisting) {
      return res.status(400).send({ error: `${email} email already exists. Please try with another email.` });
    }
    
    const saveAdmin = new UserDetails({ fullname, email, password, role, permissions });
    await saveAdmin.save();
    res.status(201).send({ message: `Admin details added with email: ${email}` });
  } catch (error) {
    console.log("Error in addAdmin: ", error);
    res.status(500).send({ error: "Internal server error..." });
  }
};

// Get All Admins
const getAdmins = async (req, res) => {
  try {
    // Exclude regular users and superadmins if needed
    const admins = await UserDetails.find({ 
      role: 'admin' } 
    ).select('-password -otp'); // Exclude sensitive fields
    
    res.status(200).send(admins);
  } catch (error) {
    console.log("Error in getAdmins: ", error);
    res.status(500).send({ error: "Internal server error..." });
  }
};

// Update Admin Permissions
const updateAdminPermissions = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
      return res.status(400).send({ error: "Valid permissions array is required" });
    }

    const updatedAdmin = await UserDetails.findByIdAndUpdate(
      id,
      { $set: { permissions } },
      { new: true }
    ).select('-password -otp');

    if (!updatedAdmin) {
      return res.status(404).send({ error: "Admin not found" });
    }

    res.status(200).send({
      message: "Permissions updated successfully",
      admin: updatedAdmin
    });
  } catch (error) {
    console.log("Error in updateAdminPermissions: ", error);
    res.status(500).send({ error: "Internal server error..." });
  }
};

// Delete Admin
const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deletion of superadmin if needed
    const adminToDelete = await UserDetails.findById(id);
    if (!adminToDelete) {
      return res.status(404).send({ error: "Admin not found" });
    }

    if (adminToDelete.role === 'superadmin') {
      return res.status(403).send({ error: "Cannot delete superadmin" });
    }

    await UserDetails.findByIdAndDelete(id);
    res.status(200).send({ message: "Admin deleted successfully" });
  } catch (error) {
    console.log("Error in deleteAdmin: ", error);
    res.status(500).send({ error: "Internal server error..." });
  }
};




// Update Password Controller
const updatePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = req.user;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Verify old password
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid current password" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Forgot Password Controller
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await UserDetails.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate OTP (6 digits)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    await user.save();

    // In real app: Send OTP via email
    console.log(`OTP for ${email}: ${otp}`);

    res.json({ message: "OTP sent to registered email" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Reset Password Controller
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await UserDetails.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.otp !== otp) {
      return res.status(401).json({ message: "Invalid OTP" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.otp = null;
    await user.save();

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// Create Default Admin (Run once at startup)
const createDefaultAdmin = async () => {
  try {
    const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      console.error("ADMIN_EMAIL or ADMIN_PASSWORD not set in environment.");
      return;
    }

    const adminExists = await UserDetails.findOne({ email: ADMIN_EMAIL });

    if (!adminExists) {
      const admin = new UserDetails({
        fullname: "Admin User",
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: "superadmin",
        permissions: ["newspaper_management", "navigation_management", "headlines_management"]
      });

      await admin.save();
      console.log("✅ Default admin created successfully");
    } else {
      console.log("ℹ️ Admin user already exists");
    }
  } catch (error) {
    console.error("❌ Error creating default admin:", error);
  }
};


module.exports = {
  auth,
  login,
  updatePassword,
  forgotPassword,
  resetPassword,
  createDefaultAdmin,
  addAdmin,
  getAdmins,
  updateAdminPermissions,
  deleteAdmin
};