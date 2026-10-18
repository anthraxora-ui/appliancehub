/** CONCRETE PRODUCT: Dishwasher */
const Appliance = require('../Appliance');

const SPEC_FIELDS = [
  { name: 'installation', label: 'Installation', type: 'select', options: ['Built-in', 'Portable', 'Countertop'], required: true },
  { name: 'placeSettings', label: 'Place settings', type: 'number', min: 4, max: 18 },
  { name: 'noiseDb', label: 'Noise level', type: 'number', unit: 'dB', min: 30, max: 70 },
];

class Dishwasher extends Appliance {
  constructor(data) {
    super('dishwasher', data);
  }

  getTypeLabel() {
    return 'Dishwasher';
  }

  getSpecFields() {
    return SPEC_FIELDS;
  }

  /** e.g. "Bosch Built-in Dishwasher, 44 dB" (quietness is the key selling point) */
  getSummary() {
    const base = [this.brand, this.specs.installation, this.getTypeLabel()].filter(Boolean).join(' ');
    return this.specs.noiseDb ? `${base}, ${this.specs.noiseDb} dB` : base;
  }
}

module.exports = Dishwasher;
