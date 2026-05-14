import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";

const db = createClient({ url: "file:./prisma/dev.db" });

const email = "admin@cloud.com";
const password = "admin123";
const nickname = "系统管理员_" + Date.now().toString(36);

const hash = await bcrypt.hash(password, 12);

const existing = await db.execute({ sql: "SELECT id, nickname FROM User WHERE email = ?", args: [email] });

if (existing.rows.length > 0) {
  await db.execute({
    sql: "UPDATE User SET password = ?, role = 'ADMIN', banned = 0 WHERE email = ?",
    args: [hash, email],
  });
  console.log("管理员已更新: " + email + " / " + password);
} else {
  await db.execute({
    sql: "INSERT INTO User (email, password, nickname, role) VALUES (?, ?, ?, 'ADMIN')",
    args: [email, hash, nickname],
  });
  console.log("管理员已创建: " + email + " / " + password);
}
