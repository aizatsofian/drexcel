const enc = new TextEncoder();
const hex = bytes => [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, '0')).join('');
export const digest = async value => hex(await crypto.subtle.digest('SHA-256', enc.encode(value)));
export async function hashPassword(password, salt = crypto.getRandomValues(new Uint8Array(16)), iterations = 100000) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return `pbkdf2$${iterations}$${hex(salt)}$${hex(bits)}`;
}
export async function verifyPassword(password, stored) {
  try {
    const [algo, count, salt, hash] = stored.split('$');
    if (algo !== 'pbkdf2' || !/^[a-f0-9]{32}$/.test(salt) || !/^[a-f0-9]{64}$/.test(hash) || Number(count) !== 100000) return false;
    const candidate = await hashPassword(password, Uint8Array.from(salt.match(/../g), x => parseInt(x, 16)), Number(count));
    const a = enc.encode(candidate), b = enc.encode(stored);
    return crypto.subtle.timingSafeEqual(a, b);
  } catch { return false; }
}
export function token(request) { return /(?:^|;\s*)session=([a-f0-9]{64})(?:;|$)/.exec(request.headers.get('Cookie') || '')?.[1]; }
export async function session(db, request) {
  const value = token(request);
  if (!value) return false;
  return !!await db.prepare('SELECT 1 FROM sessions WHERE token_hash=? AND expires>?').bind(await digest(value), Date.now()).first();
}
export function cookie(request, value, age = 43200) {
  return `session=${value}; Path=/; Max-Age=${age}; HttpOnly; SameSite=Strict${new URL(request.url).protocol === 'https:' ? '; Secure' : ''}`;
}
