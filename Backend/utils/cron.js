const cron = require('node-cron');
const NewspaperDetails = require('./your-model-file'); // Adjust path

// Runs every day at 00:00 (midnight)
cron.schedule('0 0 * * *', async () => {
  try {
    const now = new Date();
    console.log(`Running midnight publish check at ${now}`);

    // Find newspapers that should be published today or earlier but aren't yet
    const newspapersToPublish = await NewspaperDetails.find({
      publicationDate: { $lte: now },
      isPublished: false,
    });

    if (newspapersToPublish.length > 0) {
      console.log(`Publishing ${newspapersToPublish.length} newspapers...`);
      
      // Bulk update to mark them as published
      await NewspaperDetails.updateMany(
        { _id: { $in: newspapersToPublish.map(n => n._id) } },
        { $set: { isPublished: true } }
      );
    } else {
      console.log('No newspapers to publish today.');
    }
  } catch (error) {
    console.error('Midnight publish job failed:', error);
  }
}, {
  scheduled: true,
  timezone: "Asia/Kolkata" // Set your timezone (optional)
});