const mongoose = require("mongoose");

const NewspaperSchema = new mongoose.Schema(
  {
    newspaperLinks: {
        type: [ String ],
        default: []
    },
    totalpages: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

const NavLinksSchema = new mongoose.Schema({
  links: {
    type: [{
      name: {
        type: String,
        required: true
      },
      path: {
        type: String,
        required: true
      }
    }],
    default: []
  },
}, { timestamps: true });




const NewspaperDetails = mongoose.model("NewspaperDetails", NewspaperSchema);
const NavLinks = mongoose.model("NavLinks", NavLinksSchema);

module.exports = { NewspaperDetails, NavLinks };

