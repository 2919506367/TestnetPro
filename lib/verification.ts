const codeStore = new Map<string, { code: string; expires: number }>();
const CODE_TTL = 60_000;

export function setEmailCode(email: string, code: string) {
  codeStore.set(email, { code, expires: Date.now() + CODE_TTL });
  const now = Date.now();
  for (const [k, v] of codeStore) {
    if (now > v.expires) codeStore.delete(k);
  }
}

export function verifyEmailCode(email: string, code: string): boolean {
  const entry = codeStore.get(email);
  if (!entry || Date.now() > entry.expires) {
    codeStore.delete(email);
    return false;
  }
  if (entry.code !== code) return false;
  codeStore.delete(email);
  return true;
}

export function getEmailCodeRemaining(email: string): number {
  const entry = codeStore.get(email);
  if (!entry || Date.now() > entry.expires) return 0;
  return Math.ceil((entry.expires - Date.now()) / 1000);
}
