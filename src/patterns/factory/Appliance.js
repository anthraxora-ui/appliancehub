/**
 * src/patterns/factory/Appliance.js
 * =============================================================
 * SIMPLE FACTORY PATTERN  -  role: «abstract» PRODUCT
 * =============================================================
 *
 *   Client ──uses──> ApplianceFactory ──creates──> Appliance (abstract)
 *   (controllers)    createAppliance(type)          ▲   ▲   ▲
 *                                                   │   │   │
 *                                     Refrigerator  WashingMachine  ...
 *
 * Appliance defines what EVERY appliance has (brand, model, condition,
 * price, specs) and what every appliance can DO (validate itself, list its
 * spec fields, describe itself). Each concrete subclass only says what is
 * special about its own category, e.g. a Refrigerator has a capacity in
 * litres and a style; an AirConditioner has BTU and coverage area.
 *
 * Clients never write `new Refrigerator(...)`: they ask the factory, so
 * they depend only on this abstract class.
 *
 * JavaScript has no `abstract` keyword, so we enforce it by hand:
 *   - the constructor throws if someone calls `new Appliance()` directly
 *   - abstract methods throw if a subclass forgot to override them
 */
const { CONDITIONS } = require('../../config/categories');

const MAX_PRICE = 100000; // CAD; anything above is almost certainly a typo

class Appliance {
  /**
   * @param {string} category  category key, e.g. 'refrigerator' (set by the subclass)
   * @param {object} data      raw values, usually straight from a submitted form
   * @param {string} [data.brand]
   * @param {string} [data.model]
   * @param {string} [data.condition]
   * @param {number|string} [data.price]
   * @param {object} [data.specs]  category-specific values, e.g. { capacityLiters: '500' }
   */
  constructor(category, data = {}) {
    if (new.target === Appliance) {
      throw new TypeError('Appliance is abstract. Use ApplianceFactory.createAppliance() instead.');
    }

    /** @type {string} */ this.category = category;
    /** @type {string} */ this.brand = String(data.brand || '').trim();
    /** @type {string} */ this.model = String(data.model || '').trim();
    /** @type {string} */ this.condition = String(data.condition || '').trim();
    // An empty price field must count as "missing", not as 0 (Number('') === 0).
    /** @type {number} */ this.price =
      data.price === undefined || data.price === null || data.price === '' ? NaN : Number(data.price);
    /** @type {object} */ this.specs = this.normalizeSpecs(data.specs || {});
  }

  // -----------------------------------------------------------------
  // ABSTRACT METHODS: every concrete product MUST override these
  // -----------------------------------------------------------------

  /**
   * Human-readable name of the type, e.g. "Refrigerator".
   * @returns {string}
   */
  getTypeLabel() {
    throw new Error(`${this.constructor.name} must implement getTypeLabel()`);
  }

  /**
   * Describes the category-specific fields. The create-listing form is
   * GENERATED from this list, so adding a field here adds it to the form.
   *
   * Field definition format:
   *   { name, label, type: 'number'|'select'|'text', unit?, min?, max?, options?, required? }
   *
   * @returns {Array<object>}
   */
  getSpecFields() {
    throw new Error(`${this.constructor.name} must implement getSpecFields()`);
  }

  // -----------------------------------------------------------------
  // CONCRETE METHODS: shared by all products (subclasses MAY override)
  // -----------------------------------------------------------------

  /**
   * Converts raw form values into clean, typed values.
   * Algorithm:
   *   for each field definition of this appliance type:
   *     take the raw value; skip it if empty
   *     if the field is a number -> convert with Number()
   *                                 (NaN is kept so validate() reports it)
   *     else                      -> convert to a trimmed string
   *   Keys that aren't defined fields are DROPPED (users can't inject extra data).
   *
   * @param {object} rawSpecs
   * @returns {object} clean specs
   */
  normalizeSpecs(rawSpecs) {
    const clean = {};
    for (const field of this.getSpecFields()) {
      const raw = rawSpecs[field.name];
      if (raw === undefined || raw === null || String(raw).trim() === '') continue;
      clean[field.name] = field.type === 'number' ? Number(raw) : String(raw).trim();
    }
    return clean;
  }

  /**
   * Checks the fields shared by all appliances, then the category-specific
   * ones (validateSpecs, which subclasses can extend).
   * @returns {string[]} error messages; an empty array means valid
   */
  validate() {
    const errors = [];

    if (!this.brand) errors.push('Brand is required.');
    else if (this.brand.length > 40) errors.push('Brand must be at most 40 characters.');

    if (this.model.length > 60) errors.push('Model must be at most 60 characters.');

    if (!CONDITIONS.includes(this.condition)) {
      errors.push(`Condition must be one of: ${CONDITIONS.join(', ')}.`);
    }

    if (Number.isNaN(this.price)) errors.push('Price is required and must be a number.');
    else if (this.price < 0) errors.push('Price cannot be negative.');
    else if (this.price > MAX_PRICE) errors.push(`Price cannot exceed $${MAX_PRICE.toLocaleString()}.`);

    return errors.concat(this.validateSpecs());
  }

  /**
   * Generic rule check driven by getSpecFields().
   * Algorithm:
   *   for each field:
   *     value missing  -> error if field.required
   *     number field   -> error if NaN, below min or above max
   *     select field   -> error if value isn't one of field.options
   *     text field     -> error if longer than 60 characters
   * Subclasses override this to ADD cross-field rules, calling
   * super.validateSpecs() first (see Refrigerator).
   *
   * @returns {string[]}
   */
  validateSpecs() {
    const errors = [];
    for (const field of this.getSpecFields()) {
      const value = this.specs[field.name];

      if (value === undefined) {
        if (field.required) errors.push(`${field.label} is required.`);
        continue;
      }

      if (field.type === 'number') {
        if (Number.isNaN(value)) errors.push(`${field.label} must be a number.`);
        else if (field.min !== undefined && value < field.min) errors.push(`${field.label} must be at least ${field.min}${field.unit ? ' ' + field.unit : ''}.`);
        else if (field.max !== undefined && value > field.max) errors.push(`${field.label} must be at most ${field.max}${field.unit ? ' ' + field.unit : ''}.`);
      } else if (field.type === 'select') {
        if (!field.options.includes(value)) errors.push(`${field.label} must be one of: ${field.options.join(', ')}.`);
      } else if (value.length > 60) {
        errors.push(`${field.label} must be at most 60 characters.`);
      }
    }
    return errors;
  }

  /**
   * Specs formatted for display, e.g. [{ label: 'Capacity', value: '500 L' }].
   * Only fields that have a value are returned.
   * @returns {Array<{label: string, value: string}>}
   */
  getDisplaySpecs() {
    return this.getSpecFields()
      .filter((field) => this.specs[field.name] !== undefined)
      .map((field) => ({
        label: field.label,
        value: field.unit ? `${this.specs[field.name]} ${field.unit}` : String(this.specs[field.name]),
      }));
  }

  /**
   * One-line description used as the default listing title, e.g.
   * "Samsung RF28 Refrigerator". Subclasses override it to add their most
   * important spec ("Samsung French Door Refrigerator, 790 L").
   * @returns {string}
   */
  getSummary() {
    return [this.brand, this.model, this.getTypeLabel()].filter(Boolean).join(' ');
  }

  /**
   * Plain data to store in the database (the Listing model).
   * @returns {{category: string, brand: string, model: string, condition: string, price: number, specs: object}}
   */
  toData() {
    return {
      category: this.category,
      brand: this.brand,
      model: this.model,
      condition: this.condition,
      price: this.price,
      specs: { ...this.specs },
    };
  }
}

module.exports = Appliance;
