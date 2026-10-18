/**
 * scripts/benchmark-search.js   -   SEARCH PERFORMANCE BENCHMARK
 * -------------------------------------------------------------
 * Run with:  npm run benchmark
 *
 * Measures how long the buyer SEARCH takes with a realistic amount of data.
 *
 * Method:
 *   1. start a fresh in-memory MongoDB and the real Express app
 *   2. insert 1,000 listings (random categories, brands, prices, cities)
 *   3. send each search URL 20 times over real HTTP (like a browser)
 *   4. time each request with performance.now() (from sending the request
 *      until the whole HTML page is received), report average / 95th
 *      percentile / max, and compare with the requirement:
 *        "Search and filter results load within 2 seconds"
 *
 * Nothing touches the real database: everything happens in memory.
 */
process.env.MONGODB_URI = '';           // force the in-memory database
process.env.NODE_ENV = 'development';
process.env.LOG_REQUESTS = 'false';    // keep the output readable
process.env.LOG_EVENTS = 'false';
process.env.MEMORY_DB_NAME = 'benchmark'; // own temp DB folder, so it can run next to the dev server

const { performance } = require('node:perf_hooks');
const { connectDB, disconnectDB } = require('../src/config/db');
const createApp = require('../src/app');
const User = require('../src/models/User');
const Listing = require('../src/models/Listing');
const { CATEGORIES, CONDITIONS } = require('../src/config/categories');

const LISTING_COUNT = 1000;
const RUNS_PER_SEARCH = 20;
const REQUIREMENT_MS = 2000;

const BRANDS = ['Samsung', 'LG', 'Whirlpool', 'GE', 'Bosch', 'Frigidaire', 'Maytag', 'Panasonic', 'KitchenAid', 'Electrolux'];
const CITIES = ['Regina', 'Saskatoon', 'Moose Jaw', 'Prince Albert', 'Swift Current', 'Yorkton'];

// The searches a buyer is most likely to make, from simple to complex.
const SEARCHES = [
  ['Browse all (page 1)', '/listings'],
  ['Keyword "samsung"', '/listings?q=samsung'],
  ['Category + price range + sort', '/listings?category=refrigerator&minPrice=200&maxPrice=1500&sort=price_asc'],
  ['All filters combined', '/listings?q=a&category=washer&brand=LG&condition=Good&condition=Like%20New&minPrice=100&maxPrice=2000&city=Reg'],
  ['Page 10 of results', '/listings?page=10'],
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function seed() {
  const seller = new User({ name: 'Bench Seller', email: 'bench@demo.test', role: 'seller', city: 'Regina' });
  await seller.setPassword('benchmark1');
  await seller.save();

  // Specs are not needed for search, so listings are inserted directly.
  const docs = [];
  for (let i = 0; i < LISTING_COUNT; i++) {
    const category = pick(CATEGORIES).key;
    const brand = pick(BRANDS);
    docs.push({
      seller: seller._id,
      title: `${brand} ${category.replace('_', ' ')} #${i}`,
      description: 'Benchmark listing in good working order.',
      category,
      brand,
      model: `M${i}`,
      condition: pick(CONDITIONS),
      price: Math.round(50 + Math.random() * 2500),
      city: pick(CITIES),
      status: Math.random() < 0.85 ? 'available' : 'sold',
      createdAt: new Date(Date.now() - i * 60000),
    });
  }
  await Listing.insertMany(docs);
  await Listing.syncIndexes(); // make sure indexes are built before timing
}

async function main() {
  await connectDB();
  await seed();

  const server = createApp().listen(0); // port 0 = any free port
  const base = `http://localhost:${server.address().port}`;

  console.log(`\nSearch time-efficiency test: ${LISTING_COUNT} listings, ${RUNS_PER_SEARCH} runs per search\n`);
  console.log('Search'.padEnd(34) + 'avg ms'.padStart(8) + 'p95 ms'.padStart(8) + 'max ms'.padStart(8) + '  result');
  console.log('-'.repeat(68));

  let allPassed = true;
  for (const [name, path] of SEARCHES) {
    await fetch(base + path).then((r) => r.text()); // warm-up (not counted)

    const times = [];
    for (let i = 0; i < RUNS_PER_SEARCH; i++) {
      const t0 = performance.now();
      const res = await fetch(base + path);
      await res.text();                       // wait for the full page
      times.push(performance.now() - t0);
      if (!res.ok) throw new Error(`${path} returned ${res.status}`);
    }

    times.sort((a, b) => a - b);
    const avg = times.reduce((s, t) => s + t, 0) / times.length;
    const p95 = times[Math.ceil(times.length * 0.95) - 1];
    const max = times[times.length - 1];
    const pass = max < REQUIREMENT_MS;
    allPassed = allPassed && pass;

    console.log(name.padEnd(34) + avg.toFixed(1).padStart(8) + p95.toFixed(1).padStart(8) +
      max.toFixed(1).padStart(8) + (pass ? '  PASS' : '  FAIL'));
  }

  console.log('-'.repeat(68));
  console.log(`Requirement: every search under ${REQUIREMENT_MS} ms -> ${allPassed ? 'PASSED' : 'FAILED'}\n`);

  server.close();
  await disconnectDB();
  process.exit(allPassed ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await disconnectDB();
  process.exit(1);
});
