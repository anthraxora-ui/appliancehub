/**
 * src/config/assets.js
 * -------------------------------------------------------------
 * Optional brand images (logo, hero picture, category pictures...).
 *
 * The site works WITHOUT any of them (it shows emoji instead). When a
 * file with the expected name is placed into public/images/,
 * the views use it automatically: no code change needed.
 *
 * Example: public/images/logo.png exists -> header shows it instead of "⚡ ApplianceHub".
 *
 * In development the folder is re-checked on every page load (so a new
 * image shows up after a refresh); in production it is checked once.
 */
const fs = require('fs');
const path = require('path');
const config = require('./index');
const { CATEGORIES } = require('./categories');

const IMAGES_DIR = path.join(__dirname, '..', '..', 'public', 'images');
const EXTENSIONS = ['svg', 'png', 'webp', 'jpg', 'jpeg'];
const TEAM = ['ilyan', 'jaspreet', 'anu', 'jayant'];

/**
 * Looks for public/images/<name>.<svg|png|webp|jpg|jpeg>.
 * @param {string} name  e.g. 'logo' or 'categories/washer'
 * @returns {string|null} the URL ("/images/logo.png") or null if not found
 */
function find(name) {
  for (const ext of EXTENSIONS) {
    if (fs.existsSync(path.join(IMAGES_DIR, `${name}.${ext}`))) return `/images/${name}.${ext}`;
  }
  return null;
}

/** Builds the full map of which optional images exist. */
function scan() {
  return {
    logo: find('logo'),                       // header
    logoLight: find('logo-light'),            // footer (dark background)
    favicon: find('favicon'),                 // browser tab icon
    appleTouchIcon: find('apple-touch-icon'), // phone home-screen icon
    hero: find('hero'),                       // home page banner
    placeholder: find('placeholder-listing'), // listing without photos
    ogImage: find('og-image'),                // preview when the link is shared
    categories: Object.fromEntries(CATEGORIES.map((c) => [c.key, find(`categories/${c.key}`)])),
    team: Object.fromEntries(TEAM.map((name) => [name, find(`team/${name}`)])),
  };
}

let cached = null;

/** @returns {ReturnType<typeof scan>} */
function getAssets() {
  if (!config.isProduction || !cached) cached = scan();
  return cached;
}

module.exports = { getAssets };
