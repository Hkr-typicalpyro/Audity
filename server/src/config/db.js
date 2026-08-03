import mongoose from 'mongoose';
import dns from 'node:dns';

/**
 * Connect to MongoDB using the URI from environment variables.
 * Must be called before the server starts accepting traffic.
 * Terminates the process on failure so the app never runs without a database.
 */
const connectDB = async () => {
  try {
    if (process.env.DISABLE_DNS_WORKAROUND !== 'true') {
      dns.setServers(['8.8.8.8', '8.8.4.4']);
    }
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`✓ MongoDB connected — host: ${conn.connection.host}`);
  } catch (error) {
    console.error(`✗ MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
