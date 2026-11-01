import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { MONGODB_URI } from '../src/config.js';
import { parseEmail, parsePassword } from '../src/lib/validate.js';
import { User } from '../src/models/User.js';

const email = parseEmail(process.env.ADMIN_EMAIL);
const password = parsePassword(process.env.ADMIN_PASSWORD);

await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
try {
  const existing = await User.findOne({ email });
  if (existing?.role === 'ADMIN') {
    console.log(`Admin ${email} already exists, nothing changed`);
  } else if (existing) {
    throw new Error(`${email} already belongs to a ${existing.role} account`);
  } else {
    await User.create({ name: 'Admin', email, passwordHash: await bcrypt.hash(password, 10), role: 'ADMIN' });
    console.log(`Admin ${email} created`);
  }
} finally {
  await mongoose.disconnect();
}
