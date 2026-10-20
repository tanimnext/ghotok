import mongoose from 'mongoose';

mongoose.set('strictQuery', true);

export async function connectDb(uri) {
  await mongoose.connect(uri, { autoIndex: true });
  return mongoose.connection;
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
