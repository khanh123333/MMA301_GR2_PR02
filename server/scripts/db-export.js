import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { MONGODB_URI } from '../src/config.js';

const { EJSON } = mongoose.mongo.BSON;
const outDir = path.join(import.meta.dirname, '../migration');

await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
try {
  const { db } = mongoose.connection;
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });

  for (const { name } of await db.listCollections({ type: 'collection' }).toArray()) {
    const docs = await db.collection(name).find().toArray();
    // Canonical Extended JSON keeps ObjectId and Date types, and mongoimport --jsonArray can read it
    await writeFile(path.join(outDir, `${name}.json`), `${EJSON.stringify(docs, { relaxed: false }, 2)}\n`);
    console.log(`${db.databaseName}.${name}: ${docs.length}`);
  }
} finally {
  await mongoose.disconnect();
}
