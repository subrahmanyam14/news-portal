const mongoose = require("mongoose");

const HeadLineSchema = new mongoose.Schema({
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

const HeadLine = mongoose.model("HeadLines", HeadLineSchema);

module.exports = HeadLine;