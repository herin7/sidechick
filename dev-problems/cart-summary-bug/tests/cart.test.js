const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateCartTotal } = require('../src/cart');

test('sums all line totals using price times quantity', () => {
  const total = calculateCartTotal([
    { price: 10, quantity: 2 },
    { price: 5, quantity: 3 }
  ]);

  assert.equal(total, 35);
});

test('defaults quantity to one when missing', () => {
  const total = calculateCartTotal([
    { price: 12 },
    { price: 8, quantity: 2 }
  ]);

  assert.equal(total, 28);
});
