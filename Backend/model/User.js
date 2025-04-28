const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true, 
    },
    password: {
      type: String,
      required: false, 
    },
    role: {
      type: String,
      enum: ["superadmin", "admin", "user"],
      default: "user",
    },
    permissions: {
      type: [String],
      enum: ["newspaper_management", "navigation_management", "headlines_management"]
    },
    otp: {
        type: String,
        default: null
    },
    lastLogin: {
        type: String,
        default: null,
    }
   
  },
  { timestamps: true }
);


userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

const UserDetails = mongoose.model("UserDetails", userSchema);

module.exports = UserDetails;

