import test, { describe, it } from 'node:test';
import assert from 'node:assert';
import { formatSpecialty } from './specialties.ts';

describe('formatSpecialty', () => {
  it('should return "Médico General" for null, undefined, or empty string', () => {
    assert.strictEqual(formatSpecialty(null), 'Médico General');
    assert.strictEqual(formatSpecialty(undefined), 'Médico General');
    assert.strictEqual(formatSpecialty(''), 'Médico General');
  });

  it('should return the correct label for a known specialty slug', () => {
    assert.strictEqual(formatSpecialty('medicina_general'), 'Medicina general');
    assert.strictEqual(formatSpecialty('cirugia_general'), 'Cirugía General');
    assert.strictEqual(formatSpecialty('pediatria'), 'Pediatría');
    assert.strictEqual(formatSpecialty('ginecologia'), 'Ginecología y Obstetricia');
  });

  it('should title-case and replace underscores for unknown slugs', () => {
    assert.strictEqual(formatSpecialty('specialty_unknown'), 'Specialty Unknown');
    assert.strictEqual(formatSpecialty('neuro_surgery_expert'), 'Neuro Surgery Expert');
    assert.strictEqual(formatSpecialty('simple'), 'Simple');
  });

  it('should handle slugs with multiple underscores correctly', () => {
    assert.strictEqual(formatSpecialty('very_long_specialty_name_slug'), 'Very Long Specialty Name Slug');
  });

  it('should handle already title-cased unknown slugs', () => {
    assert.strictEqual(formatSpecialty('Unknown Specialty'), 'Unknown Specialty');
  });
});
