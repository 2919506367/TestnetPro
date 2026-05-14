export function getStorageLimit(role: string): number {
  const GOLD_LIMIT = 10 * 1024 * 1024 * 1024; // 10GB
  const NORMAL_LIMIT = 5 * 1024 * 1024 * 1024; // 5GB
  return role === "GOLD" ? GOLD_LIMIT : NORMAL_LIMIT;
}

export function formatLimit(role: string): string {
  return role === "GOLD" ? "10 GB" : "5 GB";
}

export function isAdmin(role: string): boolean {
  return role === "ADMIN";
}
