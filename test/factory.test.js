/**
 * test/factory.test.js  -  automated tests for the Simple Factory
 * -------------------------------------------------------------
 * Run with:  npm test
 * Uses Node's built-in test runner (node:test), so no extra library.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const ApplianceFactory = require('../src/patterns/factory/ApplianceFactory');
const { UnknownApplianceTypeError } = require('../src/patterns/factory/ApplianceFactory');
const Appliance = require('../src/patterns/factory/Appliance');
const Refrigerator = require('../src/patterns/factory/products/Refrigerator');
const AirConditioner = require('../src/patterns/factory/products/AirConditioner');
const { CATEGORIES } = require('../src/config/categories');

const factory = new ApplianceFactory();

// A valid fridge, reused (and modified) by several tests.
const validFridge = {
  brand: 'Samsung',
  model: 'RF28R7351SR',
  condition: 'Like New',
  price: '1450',
  specs: { style: 'French Door', capacityLiters: '790', freezerLiters: '250', energyStar: 'Yes' },
};

test('creates the right concrete class for each category', () => {
  assert.ok(factory.createAppliance('refrigerator') instanceof Refrigerator);
  assert.ok(factory.createAppliance('air_conditioner') instanceof AirConditioner);
});

test('every category on the website is supported by the factory', () => {
  for (const c of CATEGORIES) {
    const product = factory.createAppliance(c.key);
    assert.ok(product instanceof Appliance, `${c.key} should be an Appliance`);
    assert.equal(product.category, c.key);
  }
});

test('unknown category throws UnknownApplianceTypeError', () => {
  assert.throws(() => factory.createAppliance('spaceship'), UnknownApplianceTypeError);
  assert.equal(factory.isSupported('spaceship'), false);
  assert.equal(factory.isSupported('oven'), true);
});

test('the abstract Appliance class cannot be instantiated', () => {
  assert.throws(() => new Appliance('x', {}), TypeError);
});

test('form strings are converted to numbers and unknown spec keys are dropped', () => {
  const fridge = factory.createAppliance('refrigerator', {
    ...validFridge,
    specs: { ...validFridge.specs, hackerField: 'drop me' },
  });
  assert.equal(fridge.price, 1450);
  assert.equal(fridge.specs.capacityLiters, 790);
  assert.equal(fridge.specs.hackerField, undefined);
});

test('a valid listing has no validation errors', () => {
  assert.deepEqual(factory.createAppliance('refrigerator', validFridge).validate(), []);
});

test('shared rules: brand, condition and price are checked for every type', () => {
  const errors = factory.createAppliance('microwave', { price: '-5', condition: 'Broken' }).validate();
  assert.ok(errors.includes('Brand is required.'));
  assert.ok(errors.includes('Price cannot be negative.'));
  assert.ok(errors.some((e) => e.startsWith('Condition must be one of')));
  assert.ok(errors.includes('Power is required.')); // microwave-specific required field
});

test('empty price counts as missing, not as $0', () => {
  const errors = factory.createAppliance('dryer', { ...validFridge, price: '' }).validate();
  assert.ok(errors.includes('Price is required and must be a number.'));
});

test('category-specific rule: freezer larger than fridge is rejected', () => {
  const fridge = factory.createAppliance('refrigerator', {
    ...validFridge,
    specs: { ...validFridge.specs, capacityLiters: '200', freezerLiters: '300' },
  });
  assert.ok(fridge.validate().includes('Freezer capacity cannot be larger than the total capacity.'));
});

test('category-specific rule: wall oven cannot have burners', () => {
  const oven = factory.createAppliance('oven', {
    brand: 'GE', condition: 'Good', price: 500,
    specs: { ovenType: 'Wall Oven', fuelType: 'Electric', burners: '4' },
  });
  assert.ok(oven.validate().includes('A wall oven has no cooktop, so it cannot have burners.'));
});

test('number limits and select options are enforced', () => {
  const ac = factory.createAppliance('air_conditioner', {
    brand: 'LG', condition: 'New', price: 300,
    specs: { acType: 'Rooftop', btu: '999999' },
  });
  const errors = ac.validate();
  assert.ok(errors.some((e) => e.startsWith('Type must be one of')));
  assert.ok(errors.includes('Cooling power must be at most 60000 BTU.'));
});

test('polymorphic summaries: each type describes itself differently', () => {
  assert.equal(
    factory.createAppliance('refrigerator', validFridge).getSummary(),
    'Samsung French Door Refrigerator, 790 L'
  );
  assert.equal(
    factory.createAppliance('air_conditioner', { brand: 'Frigidaire', specs: { acType: 'Window', btu: 10000 } }).getSummary(),
    'Frigidaire 10,000 BTU Window Air Conditioner'
  );
  assert.equal(
    factory.createAppliance('other', { brand: 'Breville', specs: { applianceType: 'Toaster' } }).getSummary(),
    'Breville Toaster'
  );
});

test('display specs include units and skip empty fields', () => {
  const fridge = factory.createAppliance('refrigerator', {
    ...validFridge,
    specs: { style: 'Top Freezer', capacityLiters: 500 },
  });
  assert.deepEqual(fridge.getDisplaySpecs(), [
    { label: 'Style', value: 'Top Freezer' },
    { label: 'Total capacity', value: '500 L' },
  ]);
});
