-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_AiProvider" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "apiUrl" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "avatar" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_AiProvider" ("apiKey", "apiUrl", "createdAt", "id", "isActive", "model", "name", "updatedAt") SELECT "apiKey", "apiUrl", "createdAt", "id", "isActive", "model", "name", "updatedAt" FROM "AiProvider";
DROP TABLE "AiProvider";
ALTER TABLE "new_AiProvider" RENAME TO "AiProvider";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
