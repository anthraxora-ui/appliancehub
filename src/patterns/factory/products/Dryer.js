/** CONCRETE PRODUCT: Dryer */
const Appliance = require('../Appliance');

const SPEC_FIELDS = [
  { name: 'fuelType', label: 'Fuel type', type: 'select', options: ['Electric', 'Gas'], required: true },
  { name: 'capacityKg', label: 'Capacity', type: 'number', unit: 'kg', min: 2, max: 30 },
  { name: 'ventless', label: 'Ventless', type: 'select', options: ['Yes', 'No'] },
];

class Dryer extends Appliance {
  constructor(data) {
    super('dryer', data);
  }

  getTypeLabel() {
    return 'Dryer';
  }

  getSpecFields() {
    return SPEC_FIELDS;
  }

  /** e.g. "Whirlpool Gas Dryer" */
  getSummary() {
    return [this.brand, this.specs.fuelType, this.getTypeLabel()].filter(Boolean).join(' ');
  }
}

module.exports = Dryer;
