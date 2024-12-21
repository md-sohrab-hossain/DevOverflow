import mongoose, { Mongoose } from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI not defined');
}

interface MongooseCache {
  connect: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache;
}

// Initialize the cache if not already present
const cached = global.mongoose || (global.mongoose = { connect: null, promise: null });

/**
 * Establishes a MongoDB connection.
 * The connection is cached, so multiple calls will return the same connection.
 */
const dbConnect = async (): Promise<Mongoose> => {
  // Return cached connection if already established
  if (cached.connect) {
    return cached.connect;
  }

  // If there's no connection in progress, initiate a new connection
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, { dbName: 'devFlow' })
      .then(mongooseInstance => {
        console.log('Connected to MongoDB');
        cached.connect = mongooseInstance; // Cache the connection instance
        return mongooseInstance;
      })
      .catch(error => {
        console.error('Error connecting to MongoDB:', error);
        throw error; // Rethrow error for further handling
      });
  }

  // Wait for the connection promise to resolve/reject
  return cached.promise;
};

export default dbConnect;
