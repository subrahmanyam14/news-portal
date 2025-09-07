const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config(); // Ensure dotenv is invoked

const DB_NAME = process.env.DB_NAME || 'thorini';
const MONGO_URI = `${process.env.MONGO_URI}/${DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;

const connectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);

    mongoose.connection.on('connected', () => {
      console.log('Mongoose connected to DB');
    });

    mongoose.connection.on('error', (err) => {
      console.error(`Mongoose connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('Mongoose disconnected. Attempting to reconnect...');
      reconnectDB();
    });

  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const reconnectDB = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Mongoose reconnected to DB');
  } catch (error) {
    console.error(`Reconnection error: ${error.message}`);
    setTimeout(reconnectDB, 5000);
  }
};

module.exports = connectDB;
