import {
  randomBytes,
  scrypt,
  timingSafeEqual,
  type ScryptOptions,
} from 'node:crypto';

const N = 16384;
const R = 8;
const P = 1;
const KEY_LENGTH = 64;

function derive(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, keyLength, options, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(password, salt, KEY_LENGTH, { N, r: R, p: P });
  return [
    'scrypt',
    N,
    R,
    P,
    salt.toString('base64'),
    key.toString('base64'),
  ].join('$');
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [algorithm, n, r, p, salt, key] = stored.split('$');
  const params = [n, r, p].map(Number);
  if (
    algorithm !== 'scrypt' ||
    !salt ||
    !key ||
    params.some((v) => !Number.isInteger(v))
  ) {
    return false;
  }
  const expected = Buffer.from(key, 'base64');
  if (expected.length === 0) return false;
  try {
    const actual = await derive(
      password,
      Buffer.from(salt, 'base64'),
      expected.length,
      {
        N: params[0],
        r: params[1],
        p: params[2],
      },
    );
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
