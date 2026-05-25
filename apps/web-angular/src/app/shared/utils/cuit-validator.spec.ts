import { formatCuit, isFutureDate, isPastDate, isValidEmail, validateCuit } from './cuit-validator';

describe('cuit-validator utils', () => {
  it('accepts a valid CUIT', () => expect(validateCuit('20-12345678-6').valid).toBeTrue());
  it('rejects invalid length', () => expect(validateCuit('2012').valid).toBeFalse());
  it('rejects invalid prefix', () => expect(validateCuit('11-12345678-6').valid).toBeFalse());
  it('rejects invalid verifier digit', () => expect(validateCuit('20-12345678-0').valid).toBeFalse());
  it('formats cuit with hyphens', () => expect(formatCuit('20123456786')).toBe('20-12345678-6'));
  it('validates email syntax', () => { expect(isValidEmail('a@b.com')).toBeTrue(); expect(isValidEmail('bad')).toBeFalse(); });
  it('detects future/past dates', () => {
    expect(isFutureDate('2026-06-01', new Date('2026-05-25'))).toBeTrue();
    expect(isPastDate('2026-05-01', new Date('2026-05-25'))).toBeTrue();
  });
});
