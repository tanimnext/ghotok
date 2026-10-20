import { env } from './config/env.js';
import { connectDb } from './config/db.js';
import { createApp } from './app.js';

await connectDb(env.mongoUri);
const app = createApp();
app.listen(env.port, () => console.log(`Ghotok API listening on :${env.port}`));
