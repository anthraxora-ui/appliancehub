/**
 * test/search.test.js  -  tests for the buyer search filters (no database needed)
 * Run with:  npm test
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFilters, buildQuery, escapeRegex } = require('../src/controllers/searchController');

test('no filters -> only available listings, newest first', () => {
  const { filters, notices } = readFilters({});
  assert.deepEqual(buildQuery(filters), { status: 'available' });
  assert.equal(filters.sort, 'newest');
  assert.equal(notices.length, 0);
});

test('min price above max price is swapped with a notice', () => {
  const { filters, notices } = readFilters({ minPrice: '900', maxPrice: '100' });
  assert.equal(filters.minPrice, 100);
  assert.equal(filters.maxPrice, 900);
  assert.match(notices[0], /swapped/);
});

test('non-numeric and negative prices are ignored with a notice', () => {
  const { filters, notices } = readFilters({ minPrice: 'abc', maxPrice: '-5' });
  assert.equal(filters.minPrice, null);
  assert.equal(filters.maxPrice, null);
  assert.equal(notices.length, 2);
});

test('unknown category, condition and sort values are dropped', () => {
  const { filters } = readFilters({ category: 'spaceship', condition: ['Good', 'Broken'], sort: 'hack' });
  assert.equal(filters.category, '');
  assert.deepEqual(filters.condition, ['Good']);
  assert.equal(filters.sort, 'newest');
});

test('regex special characters in the keyword are searched literally', () => {
  assert.equal(escapeRegex('a+b (c)*'), 'a\\+b \\(c\\)\\*');
  const query = buildQuery(readFilters({ q: '(+*' }).filters);
  assert.doesNotThrow(() => query.$or[0].title.test('anything'));
});

test('combined filters build the expected MongoDB query', () => {
  const query = buildQuery(readFilters({
    category: 'washer', condition: ['Good', 'New'], minPrice: '100', maxPrice: '500', city: 'Reg',
  }).filters);
  assert.equal(query.category, 'washer');
  assert.deepEqual(query.condition, { $in: ['Good', 'New'] });
  assert.deepEqual(query.price, { $gte: 100, $lte: 500 });
  assert.ok(query.city.test('Regina'));
  assert.ok(!query.city.test('Saskatoon'));
});

test('page numbers below 1 or invalid become page 1', () => {
  assert.equal(readFilters({ page: '-3' }).filters.page, 1);
  assert.equal(readFilters({ page: 'abc' }).filters.page, 1);
  assert.equal(readFilters({ page: '4' }).filters.page, 4);
});
