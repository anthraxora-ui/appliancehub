/**
 * src/config/categories.js
 * -------------------------------------------------------------
 * The appliance categories the marketplace supports.
 *
 * This list is the single source of truth: the home page, the search
 * filters, the "create listing" form and the Simple Factory
 * all read from it. To add a new category, add one entry here and one
 * product class in src/patterns/factory/.
 *
 * key   - value stored in the database and used in URLs
 * label - text shown to users
 * icon  - emoji used as a lightweight picture (no image files needed)
 */
const CATEGORIES = [
  { key: 'refrigerator',    label: 'Refrigerators',     icon: '🧊' },
  { key: 'washer',          label: 'Washing Machines',  icon: '🫧' },
  { key: 'dryer',           label: 'Dryers',            icon: '🌀' },
  { key: 'microwave',       label: 'Microwaves',        icon: '📡' },
  { key: 'oven',            label: 'Ovens & Stoves',    icon: '🔥' },
  { key: 'dishwasher',      label: 'Dishwashers',       icon: '🍽️' },
  { key: 'air_conditioner', label: 'Air Conditioners',  icon: '❄️' },
  { key: 'other',           label: 'Other Appliances',  icon: '🔌' },
];

// Conditions a seller can choose for an item.
const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'For Parts'];

/** Returns the category object for a key, or undefined if unknown. */
function findCategory(key) {
  return CATEGORIES.find((c) => c.key === key);
}

module.exports = { CATEGORIES, CONDITIONS, findCategory };
