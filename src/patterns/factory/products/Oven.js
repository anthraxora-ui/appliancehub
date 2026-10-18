/**
 * CONCRETE PRODUCT: Oven (ovens, ranges and stoves)
 * Extra rule: a wall oven has no cooktop, so it can't have burners.
 */
const Appliance = require('../Appliance');

const SPEC_FIELDS = [
  { name: 'ovenType', label: 'Type', type: 'select', options: ['Range (oven + cooktop)', 'Wall Oven', 'Cooktop Only'], required: true },
  { name: 'fuelType', label: 'Fuel type', type: 'select', options: ['Electric', 'Gas', 'Induction', 'Dual Fuel'], required: true },
  { name: 'burners', label: 'Number of burners', type: 'number', min: 0, max: 8 },
];

class Oven extends Appliance {
  constructor(data) {
    super('oven', data);
  }

  getTypeLabel() {
    return 'Oven';
  }

  getSpecFields() {
    return SPEC_FIELDS;
  }

  validateSpecs() {
    const errors = super.validateSpecs();
    if (this.specs.ovenType === 'Wall Oven' && this.specs.burners > 0) {
      errors.push('A wall oven has no cooktop, so it cannot have burners.');
    }
    return errors;
  }

  /** e.g. "GE Gas Range" */
  getSummary() {
    const type = this.specs.ovenType ? this.specs.ovenType.split(' (')[0] : this.getTypeLabel();
    return [this.brand, this.specs.fuelType, type].filter(Boolean).join(' ');
  }
}

module.exports = Oven;
