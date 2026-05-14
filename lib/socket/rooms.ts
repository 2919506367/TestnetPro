export function buildUserRoom(userId: number) { return `user:${userId}`; }
export function buildPrivateRoom(userIdA: number, userIdB: number) {
  return `private:${Math.min(userIdA, userIdB)}:${Math.max(userIdA, userIdB)}`;
}
export function buildGroupRoom(groupId: number) { return `group:${groupId}`; }
