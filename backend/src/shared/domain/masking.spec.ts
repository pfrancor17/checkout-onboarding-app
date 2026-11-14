import { maskEmail, maskPhone } from './masking';

describe('masking', () => {
  it.each([
    ['jane.doe@example.com', 'j***@example.com'],
    ['a@b.co', 'a***@b.co'],
    ['not-an-email', '***'],
  ])('maskEmail(%s) -> %s', (input, expected) => {
    expect(maskEmail(input)).toBe(expected);
  });

  it.each([
    ['3001234567', '******4567'],
    ['+573001234567', '*********4567'],
    ['123', '****'],
  ])('maskPhone(%s) -> %s', (input, expected) => {
    expect(maskPhone(input)).toBe(expected);
  });
});
