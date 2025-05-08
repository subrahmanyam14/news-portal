const express = require("express");
const cors = require('cors');
const dotenv = require('dotenv');


const connectDB = require('./config/db.js');
const userRoute = require("./route/userRoutes.js");
const newspaperRoute = require("./route/newspaperRoutes.js");
const navlinkRoute = require("./route/navlinkRoutes.js");
const HeadLineRoute = require("./route/headLineRoutes.js");
const logoRoutes = require('./route/logoRoutes.js');
const { createDefaultAdmin } = require("./controller/userController.js")
const setupNewspaperPublishing = require("./utils/cron.js");


const port = process.env.PORT || 3000;

dotenv.config();

const app = express();

app.use(cors({ origin: ["https://epaper-three.vercel.app", "http://localhost:3000"] }));


app.use(express.json());

app.use("/user", userRoute);

app.use("/newspaper", newspaperRoute);

app.use("/navlink", navlinkRoute);

app.use("/headline", HeadLineRoute);

app.use('/logo', logoRoutes);

app.listen(port, async () => {
  console.log(`Server Started on port ${port}`);
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