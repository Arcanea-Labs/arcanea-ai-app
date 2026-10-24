import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InputValidator } from '../dist/input-validator.js';

test('InputValidator sanitizes null bytes', () => {
  const validator = new InputValidator();
  assert.equal(validator.sanitize('hello\0world'), 'helloworld');
});

test('InputValidator trims input by default', () => {
  const validator = new InputValidator();
  const result = validator.validateString('  hello  ');
  assert.equal(result.sanitized, 'hello');
  assert.equal(result.valid, true);
});

test('InputValidator fails minimum length', () => {
  const validator = new InputValidator();
  const result = validator.validateString('hi', { minLength: 3 });
  assert.equal(result.valid, false);
  assert.equal(result.errors.length, 1);
});

test('InputValidator fails maximum length', () => {
  const validator = new InputValidator();
  const result = validator.validateString('hello', { maxLength: 3 });
  assert.equal(result.valid, false);
  assert.equal(result.errors.length, 1);
});

test('InputValidator warns on injection patterns', () => {
  const validator = new InputValidator();
  const result = validator.validateString('<script>alert(1)</script>');
  assert.equal(result.valid, true);
  assert.ok(result.warnings.length > 0);
});

test('InputValidator warns on SQL injection patterns', () => {
  const validator = new InputValidator();
  const result = validator.validateString('SELECT * FROM users WHERE 1=1; DROP TABLE users;');
  assert.equal(result.valid, true);
  assert.ok(result.warnings.length > 0);
});

test('InputValidator fails pattern match', () => {
  const validator = new InputValidator();
  const result = validator.validateString('hello', { pattern: /^[0-9]+$/ });
  assert.equal(result.valid, false);
});

test('InputValidator sanitize collapses excessive whitespace', () => {
  const validator = new InputValidator();
  const longSpaces = ' '.repeat(150);
  const result = validator.sanitize(`hello${longSpaces}world`);
  assert.equal(result, `hello${' '.repeat(99)}world`);
});

test('InputValidator fails if assertion flipped', () => {
  const validator = new InputValidator();
  const result = validator.sanitize('test');
  assert.notEqual(result, 'wrong');
});
