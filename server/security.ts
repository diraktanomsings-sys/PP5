import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export const digest = (value: string | Uint8Array) =>
  createHash('sha256').update(value).digest('hex');
export const opaqueToken = () => randomBytes(32).toString('hex');
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
export function requireThat(test: unknown, status: number, message: string): asserts test {
  if (!test) throw new ApiError(status, message);
}
export function text(value: unknown, label: string, max = 200): string {
  requireThat(
    typeof value === 'string' && value.trim().length > 0 && value.length <= max,
    400,
    `กรุณาระบุ${label}ให้ถูกต้อง`,
  );
  return value.trim();
}
export function validatePassword(value: unknown): asserts value is string {
  requireThat(
    typeof value === 'string' && value.length >= 12 && value.length <= 128,
    400,
    'รหัสผ่านต้องยาว 12–128 ตัวอักษร',
  );
}
export async function hashPassword(password: string) {
  validatePassword(password);
  const salt = randomBytes(16).toString('hex');
  return `scrypt:${salt}:${((await scrypt(password, salt, 64)) as Buffer).toString('hex')}`;
}
export async function checkPassword(password: string, encoded: string) {
  const [, salt, hex] = encoded.split(':');
  const actual = (await scrypt(password.slice(0, 129), salt || 'pp5-dummy-salt', 64)) as Buffer;
  const expected = Buffer.from(hex || '00'.repeat(64), 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export function sameSecret(left: string, right: string) {
  return timingSafeEqual(Buffer.from(digest(left)), Buffer.from(digest(right)));
}
