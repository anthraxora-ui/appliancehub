/**
 * src/config/demoPhotos.js
 * -------------------------------------------------------------
 * Attaches the real-looking photos in design/listing-photos/ to the 8
 * demo listings (2 photos each), exactly as if the seller had uploaded them
 * with "Edit listing": each file becomes a Photo document owned by the
 * listing's seller.
 *
 * Used by:
 *   - seed.js            -> new demo databases get photos automatically
 *   - npm run demo-photos -> adds photos to an EXISTING database (e.g. Atlas)
 *
 * Safe to run more than once: listings that already have photos are skipped,
 * so a seller's own uploads are never replaced.
 */
const fs = require('fs');
const path = require('path');
const Listing = require('../models/Listing');
const Photo = require('../models/Photo');

const PHOTOS_DIR = path.join(__dirname, '..', '..', 'design', 'listing-photos');

// Start of the demo listing title -> photo file prefix (files are <prefix>-1.jpg, <prefix>-2.jpg)
const DEMO_PHOTOS = [
  { title: 'Samsung French Door Refrigerator', prefix: 'samsung-french-door-refrigerator' },
  { title: 'LG Front Load Washing Machine', prefix: 'lg-front-load-washer' },
  { title: 'Panasonic 1200 W Countertop Microwave', prefix: 'panasonic-countertop-microwave' },
  { title: 'GE Gas Range', prefix: 'ge-gas-range' },
  { title: 'Whirlpool Top Freezer Refrigerator', prefix: 'whirlpool-top-freezer-refrigerator' },
  { title: 'Bosch Built-in Dishwasher', prefix: 'bosch-built-in-dishwasher' },
  { title: 'Frigidaire 10,000 BTU Window Air Conditioner', prefix: 'frigidaire-window-air-conditioner' },
  { title: 'Maytag Electric Dryer', prefix: 'maytag-electric-dryer' },
];

/** "a+b (c)" -> "a\+b \(c\)" so a title can be used inside a regular expression */
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Algorithm:
 *   for each demo entry:
 *     find the (not removed) listing whose title starts with entry.title
 *     skip it if not found or if it already has photos
 *     read <prefix>-1.jpg, <prefix>-2.jpg (whichever exist)
 *     save them as Photo documents owned by the seller, set listing.photos
 *
 * @returns {Promise<{updated: string[], skipped: string[]}>}
 */
async function attachDemoPhotos() {
  const result = { updated: [], skipped: [] };
  if (!fs.existsSync(PHOTOS_DIR)) return result;

  for (const entry of DEMO_PHOTOS) {
    const listing = await Listing.findOne({
      title: new RegExp(`^${escapeRegex(entry.title)}`),
      status: { $ne: 'removed' },
    });
    if (!listing) { result.skipped.push(`${entry.title} (listing not found)`); continue; }
    if (listing.photos.length > 0) { result.skipped.push(`${entry.title} (already has photos)`); continue; }

    const files = [1, 2]
      .map((n) => path.join(PHOTOS_DIR, `${entry.prefix}-${n}.jpg`))
      .filter((file) => fs.existsSync(file));
    if (files.length === 0) { result.skipped.push(`${entry.title} (no photo files)`); continue; }

    const photos = await Photo.insertMany(files.map((file) => {
      const data = fs.readFileSync(file);
      return { data, contentType: 'image/jpeg', size: data.length, owner: listing.seller };
    }));
    listing.photos = photos.map((p) => p._id);
    await listing.save();
    result.updated.push(`${listing.title} (${photos.length} photos)`);
  }
  return result;
}

module.exports = { attachDemoPhotos };
