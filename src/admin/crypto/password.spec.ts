import { hashPassword, verifyPassword } from './password';

describe('password', () => {
  it('hashes into the scrypt format', async () => {
    const hash = await hashPassword('admin123');
    expect(hash).toMatch(
      /^scrypt\$16384\$8\$1\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/,
    );
  });

  it('uses a fresh salt each time', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'));
  });

  it('verifies the right password and rejects a wrong one', async () => {
    const hash = await hashPassword('correct horse');
    await expect(verifyPassword('correct horse', hash)).resolves.toBe(true);
    await expect(verifyPassword('wrong horse', hash)).resolves.toBe(false);
  });

  it('rejects a stored value with an empty key', async () => {
    await expect(
      verifyPassword('x', 'scrypt$16384$8$1$c2FsdA==$'),
    ).resolves.toBe(false);
    await expect(
      verifyPassword('x', 'scrypt$16384$8$1$c2FsdA==$='),
    ).resolves.toBe(false);
  });

  it('rejects malformed stored values', async () => {
    await expect(verifyPassword('x', '')).resolves.toBe(false);
    await expect(verifyPassword('x', 'bcrypt$1$2$3$4$5')).resolves.toBe(false);
    await expect(
      verifyPassword('x', 'scrypt$abc$8$1$c2FsdA==$a2V5'),
    ).resolves.toBe(false);
  });
});
