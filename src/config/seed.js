/**
 * src/config/seed.js
 * -------------------------------------------------------------
 * Demo data for DEVELOPMENT and the demo video.
 *
 * The in-memory database is empty after every restart, so we create a few
 * accounts automatically. server.js only runs this when the in-memory DB
 * is used: it never touches the real (Atlas) database.
 *
 * Demo logins (test values only, never real passwords):
 *   Buyer : buyer@demo.test   / demo1234
 *   Seller: seller@demo.test  / demo1234
 *   Seller: seller2@demo.test / demo1234
 *   Buyer : buyer2@demo.test  / demo1234
 * Plus demo listings, a conversation, purchase requests and a completed sale.
 */
const User = require('../models/User');
const Listing = require('../models/Listing');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const PurchaseRequest = require('../models/PurchaseRequest');
const Review = require('../models/Review');
const ApplianceFactory = require('../patterns/factory/ApplianceFactory');
const events = require('../patterns/observer/marketplaceEvents');
const { attachDemoPhotos } = require('./demoPhotos');

const DEMO_PASSWORD = 'demo1234';

const DEMO_USERS = [
  { name: 'Bella Buyer', email: 'buyer@demo.test', role: 'buyer', city: 'Regina' },
  { name: 'Sam Seller', email: 'seller@demo.test', role: 'seller', city: 'Regina',
    phone: '306-555-0101', bio: 'Selling quality used appliances since 2018. Pickup in south Regina.' },
  { name: 'Priya Appliances', email: 'seller2@demo.test', role: 'seller', city: 'Saskatoon',
    bio: 'Refurbished fridges and washers with a 30-day guarantee.' },
  { name: 'Ben Buyer', email: 'buyer2@demo.test', role: 'buyer', city: 'Saskatoon' },
];

// Demo listings: `seller` is the index in DEMO_USERS. No photos: cards show
// the category icon instead. Upload real photos through the site to test.
const DEMO_LISTINGS = [
  { seller: 1, category: 'refrigerator', brand: 'Samsung', model: 'RF28R7351SR', condition: 'Like New', price: 1450, city: 'Regina',
    description: '3 years old, no dents. Ice maker works perfectly. Moving and it does not fit the new kitchen.',
    specs: { style: 'French Door', capacityLiters: 790, freezerLiters: 250, energyStar: 'Yes' } },
  { seller: 1, category: 'washer', brand: 'LG', model: 'WM3400CW', condition: 'Good', price: 520, city: 'Regina',
    description: 'Front loader, works great. Small scratch on the left side (see photos).',
    specs: { loadType: 'Front Load', capacityKg: 10, maxSpinRpm: 1300 } },
  { seller: 1, category: 'microwave', brand: 'Panasonic', model: 'NN-SN686S', condition: 'New', price: 160, city: 'Regina',
    description: 'Brand new in box. Unwanted gift.',
    specs: { installation: 'Countertop', powerWatts: 1200, capacityLiters: 34 } },
  { seller: 1, category: 'oven', brand: 'GE', model: 'JGBS66REKSS', condition: 'Good', price: 650, city: 'Regina',
    description: 'Gas range, 5 burners, self-cleaning oven.',
    specs: { ovenType: 'Range (oven + cooktop)', fuelType: 'Gas', burners: 5 } },
  { seller: 2, category: 'refrigerator', brand: 'Whirlpool', model: 'WRT311FZDW', condition: 'Good', price: 480, city: 'Saskatoon',
    description: 'Refurbished top-freezer fridge. 30-day guarantee.',
    specs: { style: 'Top Freezer', capacityLiters: 580, freezerLiters: 150, energyStar: 'No' } },
  { seller: 2, category: 'dishwasher', brand: 'Bosch', model: 'SHX78CM5N', condition: 'Like New', price: 890, city: 'Saskatoon',
    description: 'Very quiet, used for 1 year. Stainless steel tub.',
    specs: { installation: 'Built-in', placeSettings: 16, noiseDb: 44 } },
  { seller: 2, category: 'air_conditioner', brand: 'Frigidaire', model: 'FFRE103WAE', condition: 'Good', price: 280, city: 'Saskatoon',
    description: 'Window AC with remote. Cools a large bedroom easily.',
    specs: { acType: 'Window', btu: 10000, coverageSqFt: 450 } },
  { seller: 2, category: 'dryer', brand: 'Maytag', model: 'MED6230HW', condition: 'Fair', price: 300, city: 'Saskatoon',
    description: 'Electric dryer, older but reliable. Refurbished drum belt.',
    specs: { fuelType: 'Electric', capacityKg: 9, ventless: 'No' } },
];

/**
 * Creates the demo accounts and listings if the database has no users yet.
 * Listings go through the SIMPLE FACTORY exactly like the real form, so a
 * demo listing can never be invalid.
 * @returns {Promise<number>} number of users created
 */
async function seedDemoData() {
  if ((await User.countDocuments()) > 0) return 0;

  const users = [];
  for (const data of DEMO_USERS) {
    const user = new User(data);
    await user.setPassword(DEMO_PASSWORD);
    users.push(await user.save());
  }

  const factory = new ApplianceFactory();
  const listings = [];
  for (const [i, item] of DEMO_LISTINGS.entries()) {
    const appliance = factory.createAppliance(item.category, item);
    const errors = appliance.validate();
    if (errors.length) throw new Error(`Invalid demo listing #${i}: ${errors.join(' ')}`);

    listings.push(await Listing.create({
      ...appliance.toData(),
      title: appliance.getSummary(),
      description: item.description,
      city: item.city,
      seller: users[item.seller]._id,
      // Spread the dates out so "newest first" ordering is visible.
      createdAt: new Date(Date.now() - i * 3600 * 1000),
    }));
  }

  await seedActivity(users, listings);
  await attachDemoPhotos(); // real-looking photos from design/listing-photos/ (if present)
  return users.length;
}

/**
 * Demo activity so every page has something to show:
 *   - Bella asked Sam about the Samsung fridge (conversation, 2 messages)
 *   - Bella and Ben both requested the LG washer (2 pending requests)
 *   - Bella bought the Panasonic microwave (completed, NOT reviewed yet: try it!)
 *   - Ben bought Priya's dryer and gave her a 5★ review
 */
async function seedActivity(users, listings) {
  const [bella, sam, , ben] = users;
  const [fridge, washer, microwave] = listings;
  const minutesAgo = (m) => new Date(Date.now() - m * 60000);

  const convo = await Conversation.create({
    listing: fridge._id, buyer: bella._id, seller: sam._id,
    lastMessageAt: minutesAgo(30), lastMessagePreview: 'Yes! It is still available. Saturday works.', buyerUnread: 1,
  });
  await Message.create([
    { conversation: convo._id, sender: bella._id, body: 'Hi Sam, is the fridge still available? Could I see it Saturday?', createdAt: minutesAgo(45) },
    { conversation: convo._id, sender: sam._id, body: 'Yes! It is still available. Saturday works.', createdAt: minutesAgo(30) },
  ]);

  const request = (listing, buyer, offerPrice, message, extra = {}) => PurchaseRequest.create({
    listing: listing._id, buyer: buyer._id, seller: listing.seller,
    listingTitle: listing.title, listingPrice: listing.price, offerPrice, message, ...extra,
  });
  const r1 = await request(washer, bella, 480, 'Would you take $480? I can pick it up this week.');
  const r2 = await request(washer, ben, 520, 'Full price, I can come tomorrow.');
  const r3 = await request(microwave, bella, 150, 'Can I pick it up tonight?', {
    status: 'completed', respondedAt: minutesAgo(3000), completedAt: minutesAgo(2900),
  });
  await Listing.updateOne({ _id: microwave._id }, { status: 'sold' });

  const dryer = listings[7];
  const r4 = await request(dryer, ben, 290, 'Can you deliver to Saskatoon east side?', {
    status: 'completed', respondedAt: minutesAgo(9000), completedAt: minutesAgo(8800),
  });
  await Listing.updateOne({ _id: dryer._id }, { status: 'sold' });
  await Review.create({
    request: r4._id, seller: dryer.seller, buyer: ben._id, listingTitle: r4.listingTitle, rating: 5,
    comment: 'Dryer works perfectly and Priya even helped me load it into the truck. Recommended!',
  });
  await Review.recalculateSellerRating(dryer.seller);

  // Bella saved two fridges: try "mark as sold" on one as Sam/Priya and
  // watch Bella's 🔔 bell (FavoriteWatcherObserver).
  await User.updateOne({ _id: bella._id }, { $set: { favorites: [fridge._id, listings[4]._id] } });

  // Publish the same events the controllers would, so the OBSERVERS create
  // the demo notifications (nothing is written to Notification directly).
  for (const r of [r1, r2]) {
    const buyer = String(r.buyer) === String(bella._id) ? bella : ben;
    await events.publish('request.created', {
      requestId: r._id, sellerId: sam._id, buyerName: buyer.name, listingTitle: r.listingTitle, offerPrice: r.offerPrice,
    });
  }
  await events.publish('message.sent', {
    conversationId: convo._id, recipientId: bella._id, senderName: sam.name, preview: 'Yes! It is still available. Saturday works.',
  });
  await events.publish('request.completed', {
    requestId: r3._id, buyerId: bella._id, sellerName: sam.name, listingTitle: r3.listingTitle,
  });
}

module.exports = { seedDemoData };
