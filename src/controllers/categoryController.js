/**
 * src/controllers/categoryController.js   (CONTROLLER, and a CLIENT of the factory)
 * -------------------------------------------------------------
 * Small JSON API used by the browser. When a seller changes the category
 * dropdown on the "create listing" form, the page asks
 *   GET /api/categories/refrigerator/fields
 * and draws the inputs it receives (Style, Total capacity, Freezer...).
 *
 * Notice: this controller never mentions Refrigerator, Oven, etc.
 * It only talks to the factory, which is the point of the pattern.
 */
const ApplianceFactory = require('../patterns/factory/ApplianceFactory');
const { CATEGORIES } = require('../config/categories');
const { httpError } = require('../middleware/errorHandler');

// The client keeps a reference to its factory (Simple Factory structure).
const factory = new ApplianceFactory();

/** GET /api/categories  ->  all categories with their spec fields */
function listCategories(req, res) {
  res.json(
    CATEGORIES.map((c) => ({ ...c, fields: factory.getSpecFields(c.key) }))
  );
}

/** GET /api/categories/:key/fields  ->  spec fields of one category */
function getFields(req, res) {
  if (!factory.isSupported(req.params.key)) {
    throw httpError(404, `Unknown category "${req.params.key}".`);
  }
  res.json(factory.getSpecFields(req.params.key));
}

module.exports = { listCategories, getFields };
