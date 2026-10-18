/** CONCRETE PRODUCT: WashingMachine */
const Appliance = require('../Appliance');

const SPEC_FIELDS = [
  { name: 'loadType', label: 'Load type', type: 'select', options: ['Front Load', 'Top Load'], required: true },
  { name: 'capacityKg', label: 'Capacity', type: 'number', unit: 'kg', min: 2, max: 30, required: true },
  { name: 'maxSpinRpm', label: 'Max spin speed', type: 'number', unit: 'rpm', min: 400, max: 2000 },
];

class WashingMachine extends Appliance {
  constructor(data) {
    super('washer', data);
  }

  getTypeLabel() {
    return 'Washing Machine';
  }

  getSpecFields() {
    return SPEC_FIELDS;
  }

  /** e.g. "LG Front Load Washing Machine, 10 kg" */
  getSummary() {
    const base = [this.brand, this.specs.loadType, this.getTypeLabel()].filter(Boolean).join(' ');
    return this.specs.capacityKg ? `${base}, ${this.specs.capacityKg} kg` : base;
  }
}

module.exports = WashingMachine;
