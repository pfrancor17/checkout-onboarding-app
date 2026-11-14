import { createHash } from 'crypto';
import { buildIntegritySignature } from './integrity-signature';

describe('buildIntegritySignature', () => {
  it('hashes reference + amount + currency + secret with SHA-256', () => {
    const expected = createHash('sha256')
      .update('ref-1' + '2549000' + 'COP' + 'secret')
      .digest('hex');

    expect(buildIntegritySignature('ref-1', 2549000, 'COP', 'secret')).toBe(
      expected,
    );
  });

  it('changes when the amount changes (tamper protection)', () => {
    const original = buildIntegritySignature('ref-1', 1000, 'COP', 'secret');
    const tampered = buildIntegritySignature('ref-1', 1, 'COP', 'secret');

    expect(tampered).not.toBe(original);
    expect(original).toMatch(/^[a-f0-9]{64}$/);
  });
});
