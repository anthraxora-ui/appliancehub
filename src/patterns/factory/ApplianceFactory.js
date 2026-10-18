/**
 * src/patterns/factory/ApplianceFactory.js
 * =============================================================
 * SIMPLE FACTORY PATTERN  -  role: FACTORY
 * =============================================================
 *
 * PROBLEM IT SOLVES IN OUR APP
 *   When a seller creates or edits a listing, when a listing is displayed,
 *   and when buyers compare listings, the code needs the RIGHT appliance
 *   object for the category (a Refrigerator validates litres and freezer
 *   size; an AirConditioner validates BTU...). Without a factory, every one
 *   of those places would repeat the same big if/else on the category
 *   and call `new Refrigerator()` etc. directly.
 *
 * SOLUTION
 *   All "which class do I instantiate?" decisions live in ONE method:
 *   createAppliance(type, data). Clients (controllers) only know:
 *     - this factory
 *     - the abstract Appliance interface
 *   To add a new category (e.g. 'freezer') we write one new product class and
 *   add one `case` here; no controller or view changes.
 *
 * As in the lecture notes (Head First / GoF style), the client HOLDS a
 * reference to a factory object and calls its create method:
 *     const factory = new ApplianceFactory();
 *     const fridge  = factory.createAppliance('refrigerator', formData);
 */
const Refrigerator = require('./products/Refrigerator');
const WashingMachine = require('./products/WashingMachine');
const Dryer = require('./products/Dryer');
const Microwave = require('./products/Microwave');
const Oven = require('./products/Oven');
const Dishwasher = require('./products/Dishwasher');
const AirConditioner = require('./products/AirConditioner');
const OtherAppliance = require('./products/OtherAppliance');

/** Thrown when asked for a category the factory can't build. */
class UnknownApplianceTypeError extends Error {
  /** @param {string} type */
  constructor(type) {
    super(`Unknown appliance category: "${type}".`);
    this.name = 'UnknownApplianceTypeError';
    this.status = 400; // the error handler shows this as "Bad request", not a crash
  }
}

class ApplianceFactory {
  /**
   * THE FACTORY METHOD: creates the concrete product for a category.
   *
   * Algorithm:
   *   1. switch on the category key
   *   2. matching case  -> return new <ConcreteProduct>(data)
   *   3. no match       -> throw UnknownApplianceTypeError
   *
   * @param {string} type  category key, e.g. 'refrigerator', 'washer'
   * @param {object} [data]  { brand, model, condition, price, specs }
   * @returns {import('./Appliance')} a concrete Appliance subclass instance
   * @throws {UnknownApplianceTypeError}
   */
  createAppliance(type, data = {}) {
    switch (type) {
      case 'refrigerator':    return new Refrigerator(data);
      case 'washer':          return new WashingMachine(data);
      case 'dryer':           return new Dryer(data);
      case 'microwave':       return new Microwave(data);
      case 'oven':            return new Oven(data);
      case 'dishwasher':      return new Dishwasher(data);
      case 'air_conditioner': return new AirConditioner(data);
      case 'other':           return new OtherAppliance(data);
      default:
        throw new UnknownApplianceTypeError(type);
    }
  }

  /**
   * Convenience: the spec-field definitions for a category, without the
   * client having to create the object itself. Used to build the
   * category-specific part of the "create listing" form.
   *
   * Algorithm: create an empty product of that type, return getSpecFields().
   *
   * @param {string} type
   * @returns {Array<object>}
   * @throws {UnknownApplianceTypeError}
   */
  getSpecFields(type) {
    return this.createAppliance(type).getSpecFields();
  }

  /**
   * @param {string} type
   * @returns {boolean} true if createAppliance(type) would succeed
   */
  isSupported(type) {
    try {
      this.createAppliance(type);
      return true;
    } catch (err) {
      if (err instanceof UnknownApplianceTypeError) return false;
      throw err;
    }
  }
}

module.exports = ApplianceFactory;
module.exports.UnknownApplianceTypeError = UnknownApplianceTypeError;
