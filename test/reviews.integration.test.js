/**
 * test/reviews.integration.test.js  -  rating rules against a REAL (in-memory) MongoDB
 * Run with:  npm test
 *
 * Checks the correctness rules that unit tests can't: the unique index
 * (one review per purchase) and the seller's average being recalculated
 * from the stored reviews.
 */
process.env.MONGODB_URI = '';
process.env.LOG_EVENTS = 'false';
process.env.MEMORY_DB_NAME = 'test'; // own temp DB folder, separate from the dev server's

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Review = require('../src/models/Review');

let seller;
let buyer;

test.before(async () => {
  await connectDB();
  await Review.syncIndexes(); // make sure the unique index exists before testing it
  seller = await User.create({ name: 'Test Seller', email: 'ts@demo.test', role: 'seller', passwordHash: 'x' });
  buyer = await User.create({ name: 'Test Buyer', email: 'tb@demo.test', role: 'buyer', passwordHash: 'x' });
});

test.after(async () => {
  await disconnectDB();
});

const review = (rating) => ({
  request: new mongoose.Types.ObjectId(), // a different purchase each time
  seller: seller._id,
  buyer: buyer._id,
  listingTitle: 'Test item',
  rating,
});

test('seller rating is the exact average of all reviews (rounded to 1 decimal)', async () => {
  await Review.create([review(5), review(4), review(4)]);
  const stats = await Review.recalculateSellerRating(seller._id);
  assert.deepEqual(stats, { ratingAverage: 4.3, ratingCount: 3 });

  const saved = await User.findById(seller._id).lean();
  assert.equal(saved.ratingAverage, 4.3);
  assert.equal(saved.ratingCount, 3);
});

test('only one review per purchase (unique index)', async () => {
  const first = review(5);
  await Review.create(first);
  await assert.rejects(Review.create({ ...first, rating: 1 }), (err) => err.code === 11000);
});

test('ratings outside 1–5 or with decimals are rejected by the model', async () => {
  await assert.rejects(Review.create(review(0)), /between 1 and 5/);
  await assert.rejects(Review.create(review(6)), /between 1 and 5/);
  await assert.rejects(Review.create(review(3.5)), /whole number/);
});

test('a seller with no reviews has rating 0 and count 0', async () => {
  const fresh = await User.create({ name: 'New Seller', email: 'ns@demo.test', role: 'seller', passwordHash: 'x' });
  assert.deepEqual(await Review.recalculateSellerRating(fresh._id), { ratingAverage: 0, ratingCount: 0 });
});
