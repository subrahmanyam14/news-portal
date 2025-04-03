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



const NewspaperDetails = mongoose.model("NewspaperDetails", NewspaperSchema);

module.exports = NewspaperDetails;

