import {
  base32Decode,
  base32Encode,
  buildOtpauthUri,
  generateTotpCode,
  generateTotpSecret,
  verifyTotp,
} from './totp';

// RFC 6238 Appendix B, SHA1 seed "12345678901234567890", last 6 digits
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'));
const T0 = 1_111_111_111_000; // step 37037037

describe('totp', () => {
  it('encodes base32 like RFC 4648', () => {
    expect(RFC_SECRET).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
    expect(base32Decode(RFC_SECRET).toString()).toBe('12345678901234567890');
    expect(
      base32Decode('gezd gnbv gy3t qojq gezd gnbv gy3t qojq').toString(),
    ).toBe('12345678901234567890');
  });

  it.each([
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
    [20000000000, '353130'],
  ])('matches RFC 6238 vector at T=%i', (seconds, code) => {
    expect(generateTotpCode(RFC_SECRET, seconds * 1000)).toBe(code);
  });

  it('accepts current, previous and next step and returns the step', () => {
    const step = Math.floor(T0 / 30_000);
    expect(
      verifyTotp(RFC_SECRET, generateTotpCode(RFC_SECRET, T0), T0, null),
    ).toBe(step);
    expect(
      verifyTotp(
        RFC_SECRET,
        generateTotpCode(RFC_SECRET, T0 - 30_000),
        T0,
        null,
      ),
    ).toBe(step - 1);
    expect(
      verifyTotp(
        RFC_SECRET,
        generateTotpCode(RFC_SECRET, T0 + 30_000),
        T0,
        null,
      ),
    ).toBe(step + 1);
    expect(
      verifyTotp(
        RFC_SECRET,
        generateTotpCode(RFC_SECRET, T0 + 60_000),
        T0,
        null,
      ),
    ).toBeNull();
  });

  it('rejects a step that was already used', () => {
    const step = Math.floor(T0 / 30_000);
    const code = generateTotpCode(RFC_SECRET, T0);
    expect(verifyTotp(RFC_SECRET, code, T0, step)).toBeNull();
    expect(
      verifyTotp(
        RFC_SECRET,
        generateTotpCode(RFC_SECRET, T0 + 30_000),
        T0,
        step,
      ),
    ).toBe(step + 1);
  });

  it('accepts a code pasted with spaces', () => {
    const code = generateTotpCode(RFC_SECRET, T0);
    expect(
      verifyTotp(RFC_SECRET, `${code.slice(0, 3)} ${code.slice(3)}`, T0, null),
    ).not.toBeNull();
  });

  it('rejects garbage', () => {
    expect(verifyTotp(RFC_SECRET, '', T0, null)).toBeNull();
    expect(verifyTotp(RFC_SECRET, 'abcdef', T0, null)).toBeNull();
    expect(verifyTotp(RFC_SECRET, '1234567', T0, null)).toBeNull();
  });

  it('generates 32-char base32 secrets', () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(generateTotpSecret()).not.toBe(secret);
  });

  it('builds an otpauth URI with default parameters', () => {
    expect(buildOtpauthUri('ABC')).toBe(
      'otpauth://totp/sskd:admin?secret=ABC&issuer=sskd&algorithm=SHA1&digits=6&period=30',
    );
  });
});
