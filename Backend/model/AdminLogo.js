const mongoose = require("mongoose");

const adminLogoSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "UserDetails",
			required: true,
			unique: true
		},
		logoUrl: {
			type: String,
			required: true
		}
	},
	{ timestamps: true }
);

const AdminLogo = mongoose.model("AdminLogo", adminLogoSchema);

module.exports = AdminLogo;