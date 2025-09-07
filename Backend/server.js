const express = require("express");
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

const connectDB = require('./config/db.js');
const userRoute = require("./route/userRoutes.js");
const newspaperRoute = require("./route/newspaperRoutes.js");
const navlinkRoute = require("./route/navlinkRoutes.js");
const HeadLineRoute = require("./route/headLineRoutes.js");
const logoRoutes = require('./route/logoRoutes.js');
const uploadRoutes = require("./route/uploadRoutes.js")
const { createDefaultAdmin } = require("./controller/userController.js")
const setupNewspaperPublishing = require("./utils/cron.js");

// Load environment variables first
dotenv.config();

const port = process.env.PORT || 5002; // Changed default port to 5002

const app = express();

app.use(cors({ 
  origin: [
    "http://localhost:3000", 
    "http://localhost:5002",
    "https://epaper.thesiddipettimes.in"
  ] 
}));

app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use("/user", userRoute);
app.use("/newspaper", newspaperRoute);
app.use("/navlink", navlinkRoute);
app.use("/headline", HeadLineRoute);
app.use('/logo', logoRoutes);
app.use("/image", uploadRoutes);

app.listen(port, async () => {
  console.log(`Server Started on port ${port}`);
  console.log(`Base URL: http://localhost:${port}`);
  await connectDB();
  await createDefaultAdmin();
  const currentDate = new Date();
  currentDate.setMinutes(currentDate.getMinutes() + 5);
  console.log(currentDate);
  setupNewspaperPublishing((err, job) => {
    if (err) {
      console.error('Failed to initialize newspaper publishing:', err);
      // Handle error (maybe exit process?)
    } else {
      console.log('Newspaper publishing job successfully scheduled');

      // You can store the job reference if needed
      app.locals.newspaperPublishJob = job;
    }
  });
});