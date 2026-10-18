/**
 * scripts/add-demo-photos.js   -   put the demo photos on the demo listings
 * -------------------------------------------------------------
 * Run with:  npm run demo-photos
 *
 * Uses MONGODB_URI from .env (MongoDB Atlas). Listings that already have
 * photos are left alone, so running it twice changes nothing.
 */
require('dotenv').config();
process.env.LOG_EVENTS = 'false';

const { connectDB, disconnectDB } = require('../src/config/db');
const { attachDemoPhotos } = require('../src/config/demoPhotos');

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('✘ MONGODB_URI is empty. (The local in-memory database gets the photos automatically when it starts.)');
    process.exit(1);
  }
  console.log(`✔ Connected to ${await connectDB()}`);

  const { updated, skipped } = await attachDemoPhotos();
  updated.forEach((t) => console.log(`  ✔ ${t}`));
  skipped.forEach((t) => console.log(`  - skipped: ${t}`));
  console.log(`Done: ${updated.length} listing(s) got photos.`);

  await disconnectDB();
}

main().catch(async (err) => {
  console.error('✘ Failed:', err.message);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
