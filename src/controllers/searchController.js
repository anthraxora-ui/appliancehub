/**
 * src/controllers/searchController.js   (CONTROLLER)
 * -------------------------------------------------------------
 * GET /listings  -  buyer search with filters, sorting and pages.
 *
 * Filters (all optional, all combinable, sent as URL query parameters so a
 * search can be bookmarked or shared):
 *   q          keyword in title, brand, model or description
 *   category   e.g. refrigerator
 *   brand      exact brand (dropdown of brands currently for sale)
 *   condition  one or more of New / Like New / Good / Fair / For Parts
 *   minPrice / maxPrice
 *   city       city name (prefix match: "Reg" finds "Regina")
 *   sort       newest | price_asc | price_desc
 *   page       1, 2, 3...
 *
 * ROBUSTNESS: bad input never breaks the search. Invalid values are
 * ignored or corrected and the buyer gets a notice explaining what we did.
 * TIME-EFFICIENCY: the time spent in the database is measured and shown on
 * the page ("Found 8 appliances in 4 ms").
 */
const Listing = require('../models/Listing');
const { CATEGORIES, CONDITIONS, findCategory } = require('../config/categories');

const PAGE_SIZE = 12;
const SORTS = {
  newest: { label: 'Newest first', order: { createdAt: -1 } },
  price_asc: { label: 'Price: low to high', order: { price: 1, createdAt: -1 } },
  price_desc: { label: 'Price: high to low', order: { price: -1, createdAt: -1 } },
};

/**
 * Escapes characters that have a special meaning in regular expressions,
 * so typing "a+b" or "(" searches for those characters literally instead
 * of crashing the query (robustness).
 */
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Query value -> trimmed string (arrays and missing values become ''). */
function str(value, maxLength = 100) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

/** '' -> null (no filter), '250' -> 250, 'abc' or '-5' -> NaN (invalid) */
function parsePrice(value) {
  const s = str(value, 20);
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

/**
 * Reads and cleans the filters from the URL.
 * @returns {{ filters: object, notices: string[] }}
 */
function readFilters(query) {
  const notices = [];

  let minPrice = parsePrice(query.minPrice);
  let maxPrice = parsePrice(query.maxPrice);
  if (Number.isNaN(minPrice)) { notices.push('Minimum price must be a positive number, so it was ignored.'); minPrice = null; }
  if (Number.isNaN(maxPrice)) { notices.push('Maximum price must be a positive number, so it was ignored.'); maxPrice = null; }
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    notices.push(`Minimum price was higher than maximum, so we swapped them ($${maxPrice} – $${minPrice}).`);
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }

  const category = findCategory(query.category);
  const page = Math.max(1, parseInt(query.page, 10) || 1);

  return {
    notices,
    filters: {
      q: str(query.q),
      category: category ? category.key : '',
      brand: str(query.brand, 40),
      // Several checkboxes with the same name arrive as an array.
      condition: [].concat(query.condition || []).filter((c) => CONDITIONS.includes(c)),
      minPrice,
      maxPrice,
      city: str(query.city, 60),
      sort: SORTS[query.sort] ? query.sort : 'newest',
      page,
    },
  };
}

/** Converts the cleaned filters into a MongoDB query object. */
function buildQuery(f) {
  const query = { status: 'available' }; // buyers only see items for sale

  if (f.q) {
    const rx = new RegExp(escapeRegex(f.q), 'i'); // 'i' = case-insensitive
    query.$or = [{ title: rx }, { brand: rx }, { model: rx }, { description: rx }];
  }
  if (f.category) query.category = f.category;
  if (f.brand) query.brand = new RegExp(`^${escapeRegex(f.brand)}$`, 'i');
  if (f.condition.length) query.condition = { $in: f.condition };
  if (f.minPrice !== null || f.maxPrice !== null) {
    query.price = {};
    if (f.minPrice !== null) query.price.$gte = f.minPrice;
    if (f.maxPrice !== null) query.price.$lte = f.maxPrice;
  }
  if (f.city) query.city = new RegExp(`^${escapeRegex(f.city)}`, 'i');

  return query;
}

/** Builds "/listings?..." keeping every active filter, for sort and page links. */
function urlWith(filters, changes) {
  const merged = { ...filters, ...changes };
  const params = new URLSearchParams();
  ['q', 'category', 'brand', 'city', 'sort'].forEach((k) => { if (merged[k]) params.set(k, merged[k]); });
  if (merged.minPrice !== null) params.set('minPrice', merged.minPrice);
  if (merged.maxPrice !== null) params.set('maxPrice', merged.maxPrice);
  merged.condition.forEach((c) => params.append('condition', c));
  if (merged.page > 1) params.set('page', merged.page);
  const qs = params.toString();
  return qs ? `/listings?${qs}` : '/listings';
}

/** GET /listings */
async function index(req, res) {
  const { filters, notices } = readFilters(req.query);
  const query = buildQuery(filters);

  // ---- Time the database work (time-efficiency evidence) ----
  const started = process.hrtime.bigint();

  const [total, brands] = await Promise.all([
    Listing.countDocuments(query),
    Listing.distinct('brand', { status: 'available' }), // brands for the dropdown
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (filters.page > totalPages) filters.page = totalPages; // robustness: page 99 -> last page

  const listings = await Listing.find(query)
    .sort(SORTS[filters.sort].order)
    .skip((filters.page - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .lean();

  const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

  const category = findCategory(filters.category);
  res.render('pages/listings/index', {
    title: filters.q ? `"${filters.q}"` : category ? category.label : 'Browse appliances',
    listings,
    total,
    totalPages,
    filters,
    notices,
    elapsedMs: elapsedMs.toFixed(0),
    categories: CATEGORIES,
    conditions: CONDITIONS,
    brands: brands.sort((a, b) => a.localeCompare(b)),
    sorts: SORTS,
    urlWith: (changes) => urlWith(filters, changes),
    hasFilters: Boolean(filters.q || filters.category || filters.brand || filters.city ||
      filters.condition.length || filters.minPrice !== null || filters.maxPrice !== null),
  });
}

module.exports = { index, escapeRegex, readFilters, buildQuery };
