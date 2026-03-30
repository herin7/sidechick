const test = require('node:test');
const assert = require('node:assert');
test('Fail intentionally', () => assert.strictEqual(1,0));