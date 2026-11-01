import mongoose from 'mongoose';
import { app } from './app.js';
import { MONGODB_URI } from './config.js';

const { PORT = 3000, JWT_SECRET } = process.env;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET is required and must be at least 32 characters');
}

await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
