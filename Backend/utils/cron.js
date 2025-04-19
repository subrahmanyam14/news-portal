const cron = require('node-cron');
const { NewspaperDetails } = require('../model/NewPaper');

function setupNewspaperPublishing(callback) {
  // Reusable publishing function
  const publishDueNewspapers = async (cb) => {
    try {
      const now = new Date();
      console.log(`Running publish check at ${now}`);
      
      const result = await NewspaperDetails.updateMany(
        { publicationDate: { $lte: now }, isPublished: false },
        { $set: { isPublished: true } }
      );
      
      console.log(`Published ${result.modifiedCount} newspapers.`);
      if (cb) cb(null, result);
    } catch (err) {
      if (cb) cb(err);
      else console.error('Publish error:', err);
    }
  };

  // Set up daily job (change to '0 0 * * *' for midnight)
  const job = cron.schedule('0 0 * * *', () => {
    console.log("Starting newspaper publishing...");
    publishDueNewspapers((err, result) => {
      if (err) {
        console.error('Publish job failed:', err);
      } else {
        console.log('Publish job completed successfully');
      }
    });
  }, {
    scheduled: true,
    timezone: process.env.TZ || "Asia/Kolkata"
  });

  // Run immediately on startup
  publishDueNewspapers((err) => {
    if (err) {
      console.error('Startup publish failed:', err);
      if (callback) callback(err);
    } else {
      console.log('Startup publish check complete');
      if (callback) callback(null, job);
    }
  });

  return job;
}

module.exports = setupNewspaperPublishing ;