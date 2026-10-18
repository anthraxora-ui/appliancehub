/**
 * scripts/seed-database.js   -   fill the REAL database with demo data
 * -------------------------------------------------------------
 * Run with:  npm run seed
 *
 * Uses MONGODB_URI from your .env file (MongoDB Atlas). Adds the demo
 * accounts, listings, conversation, requests and reviews from
 * src/config/seed.js, but ONLY if the database has no users yet,
 * so it can never overwrite real data.
 */
require('dotenv').config();
process.env.LOG_EVENTS = 'false';

const { connectDB, disconnectDB } = require('../src/config/db');
const { seedDemoData } = require('../src/config/seed');

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('✘ MONGODB_URI is empty. Put your MongoDB Atlas connection string in the .env file first.');
    process.exit(1);
  }

  const label = await connectDB();
  console.log(`✔ Connected to ${label}`);

  const created = await seedDemoData();
  console.log(created
    ? `✔ Demo data added (${created} users with listings, messages, requests and reviews).`
    : 'ℹ The database already has users, so nothing was added.');

  await disconnectDB();
}

main().catch(async (err) => {
  console.error('✘ Seeding failed:', err.message);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
