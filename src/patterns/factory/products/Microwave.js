/** CONCRETE PRODUCT: Microwave */
const Appliance = require('../Appliance');

const SPEC_FIELDS = [
  { name: 'installation', label: 'Installation', type: 'select', options: ['Countertop', 'Over-the-Range', 'Built-in'], required: true },
  { name: 'powerWatts', label: 'Power', type: 'number', unit: 'W', min: 500, max: 2000, required: true },
  { name: 'capacityLiters', label: 'Capacity', type: 'number', unit: 'L', min: 10, max: 60 },
];

class Microwave extends Appliance {
  constructor(data) {
    super('microwave', data);
  }

  getTypeLabel() {
    return 'Microwave';
  }

  getSpecFields() {
    return SPEC_FIELDS;
  }

  /** e.g. "Panasonic 1200 W Countertop Microwave" */
  getSummary() {
    const watts = this.specs.powerWatts ? `${this.specs.powerWatts} W` : '';
    return [this.brand, watts, this.specs.installation, this.getTypeLabel()].filter(Boolean).join(' ');
  }
}

module.exports = Microwave;
