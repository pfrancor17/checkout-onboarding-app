import { asSentence } from './text';

describe('asSentence', () => {
  it('adds a final period only when missing', () => {
    expect(asSentence('Rechazada (Sandbox)')).toBe('Rechazada (Sandbox).');
    expect(asSentence('Rechazada.')).toBe('Rechazada.');
    expect(asSentence(' ¡Listo! ')).toBe('¡Listo!');
  });
});
