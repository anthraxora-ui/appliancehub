/** CONCRETE PRODUCT: AirConditioner */
const Appliance = require('../Appliance');

const SPEC_FIELDS = [
  { name: 'acType', label: 'Type', type: 'select', options: ['Window', 'Portable', 'Mini-Split', 'Central'], required: true },
  { name: 'btu', label: 'Cooling power', type: 'number', unit: 'BTU', min: 5000, max: 60000, required: true },
  { name: 'coverageSqFt', label: 'Coverage area', type: 'number', unit: 'sq ft', min: 100, max: 3000 },
];

class AirConditioner extends Appliance {
  constructor(data) {
    super('air_conditioner', data);
  }

  getTypeLabel() {
    return 'Air Conditioner';
  }

  getSpecFields() {
    return SPEC_FIELDS;
  }

  /** e.g. "Frigidaire 10,000 BTU Window Air Conditioner" */
  getSummary() {
    const btu = this.specs.btu ? `${this.specs.btu.toLocaleString('en-CA')} BTU` : '';
    return [this.brand, btu, this.specs.acType, this.getTypeLabel()].filter(Boolean).join(' ');
  }
}

module.exports = AirConditioner;
