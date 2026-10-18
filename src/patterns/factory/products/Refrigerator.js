/**
 * CONCRETE PRODUCT: Refrigerator
 * Shows the full pattern: own fields + an EXTRA validation rule
 * (freezer can't be bigger than the whole fridge) + a richer summary.
 */
const Appliance = require('../Appliance');

const SPEC_FIELDS = [
  { name: 'style', label: 'Style', type: 'select', required: true,
    options: ['French Door', 'Side-by-Side', 'Top Freezer', 'Bottom Freezer', 'Mini Fridge'] },
  { name: 'capacityLiters', label: 'Total capacity', type: 'number', unit: 'L', min: 30, max: 1500, required: true },
  { name: 'freezerLiters', label: 'Freezer capacity', type: 'number', unit: 'L', min: 0, max: 800 },
  { name: 'energyStar', label: 'ENERGY STAR certified', type: 'select', options: ['Yes', 'No'] },
];

class Refrigerator extends Appliance {
  /** @param {object} data  see Appliance constructor */
  constructor(data) {
    super('refrigerator', data);
  }

  getTypeLabel() {
    return 'Refrigerator';
  }

  getSpecFields() {
    return SPEC_FIELDS;
  }

  /** Generic checks + one rule only a fridge has. */
  validateSpecs() {
    const errors = super.validateSpecs();
    const { capacityLiters, freezerLiters } = this.specs;
    if (capacityLiters > 0 && freezerLiters > capacityLiters) {
      errors.push('Freezer capacity cannot be larger than the total capacity.');
    }
    return errors;
  }

  /** e.g. "Samsung French Door Refrigerator, 790 L" */
  getSummary() {
    const base = [this.brand, this.specs.style, this.getTypeLabel()].filter(Boolean).join(' ');
    return this.specs.capacityLiters ? `${base}, ${this.specs.capacityLiters} L` : base;
  }
}

module.exports = Refrigerator;
