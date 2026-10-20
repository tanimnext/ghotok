import mongoose from 'mongoose';
import { logger } from './logger.js';

mongoose.set('strictQuery', true);

export async function connectDb(uri) {
  await mongoose.connect(uri, { autoIndex: true, serverSelectionTimeoutMS: 10000 });
  logger.info({ db: mongoose.connection.name }, 'MongoDB connected');
  return mongoose.connection;
}

export async function disconnectDb() {
  await mongoose.disconnect();
}

export const dbReady = () => mongoose.connection.readyState === 1;
