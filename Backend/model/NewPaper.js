const mongoose = require("mongoose");

const NewspaperSchema = new mongoose.Schema(
  {
    newspaperLinks: {
      type: [String],
      default: []
    },
    totalpages: {
      type: Number,
      default: 0
    },
    publicationDate: {
      type: Date,
      required: true
    },
    originalFilename: {
      type: String,
      required: true
    },
    isPublished: {
      type: Boolean,
      default: false
    }
  },
  { 
    timestamps: true,
    methods: {
      // Instance method to check if newspaper should be published
      shouldPublish() {
        const now = new Date();
        return this.publicationDate <= now;
      }
    },
    statics: {
      // Static method to find all publishable newspapers
      findPublishable() {
        const now = new Date();
        return this.find({ publicationDate: { $lte: now }, isPublished: false });
      }
    }
  }
);

// Middleware to update isPublished status before saving
NewspaperSchema.pre('save', function(next) {
  if (this.isModified('publicationDate')) {
    const now = new Date();
    this.isPublished = this.publicationDate <= now;
  }
  next();
});

// Add a virtual property for real-time publish status
NewspaperSchema.virtual('publishStatus').get(function() {
  const now = new Date();
  return {
    isPublished: this.publicationDate <= now,
    publishTime: this.publicationDate,
    currentTime: now,
    isFuture: this.publicationDate > now
  };
});

// Query helper for published newspapers
NewspaperSchema.query.published = function() {
  const now = new Date();
  return this.where('publicationDate').lte(now).where('isPublished', true);
};

// Query helper for scheduled (future) newspapers
NewspaperSchema.query.scheduled = function() {
  const now = new Date();
  return this.where('publicationDate').gt(now);
};

// Index for better performance on date queries
NewspaperSchema.index({ publicationDate: 1, isPublished: 1 });

// Add a post-save hook to handle automatic publishing
NewspaperSchema.post('save', function(doc, next) {
  const now = new Date();
  if (!doc.isPublished && doc.publicationDate <= now) {
    // Update isPublished if publication date has passed
    doc.constructor.updateOne(
      { _id: doc._id },
      { $set: { isPublished: true } }
    ).exec();
  }
  next();
});

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

