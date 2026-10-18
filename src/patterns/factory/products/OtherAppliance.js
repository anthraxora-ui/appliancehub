/**
 * CONCRETE PRODUCT: OtherAppliance
 * Catch-all for appliances without their own category (toasters, freezers,
 * vacuums...). The seller types what it is.
 */
const Appliance = require('../Appliance');

const SPEC_FIELDS = [
  { name: 'applianceType', label: 'What is it?', type: 'text', required: true },
];

class OtherAppliance extends Appliance {
  constructor(data) {
    super('other', data);
  }

  getTypeLabel() {
    return this.specs.applianceType || 'Appliance';
  }

  getSpecFields() {
    return SPEC_FIELDS;
  }
}

module.exports = OtherAppliance;
