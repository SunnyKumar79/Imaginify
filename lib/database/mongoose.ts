import mongoose, { Mongoose } from 'mongoose';

// Load the MongoDB URL from environment variables
const MONGODB_URL = process.env.MONGODB_URL;

interface MongooseConnection {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

// Cached connection to avoid multiple connections in development
let cached: MongooseConnection = (globalThis as any).mongoose || { conn: null, promise: null };

// Function to connect to the MongoDB database
export const connectToDatabase = async (): Promise<Mongoose> => {
  // Return the cached connection if it exists
  if (cached.conn) return cached.conn;

  // Ensure that the MongoDB URL is defined
  if (!MONGODB_URL) {
    throw new Error('Missing MONGODB_URL');
  }

  // Initialize the connection promise if it does not exist
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URL, { 
      dbName: 'imaginify', 
      bufferCommands: false 
    })
    .then(mongooseInstance => {
      console.log('Database connected');
      return mongooseInstance;
    })
    .catch(error => {
      console.error('Database connection error:', error);
      throw new Error('Unable to connect to the database');
    });
  }

  // Wait for the connection promise to resolve and cache it
  cached.conn = await cached.promise;

  return cached.conn;
};
