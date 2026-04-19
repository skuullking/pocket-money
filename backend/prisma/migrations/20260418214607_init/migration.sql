/*
  Warnings:

  - You are about to drop the column `submittedAt` on the `Chore` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Chore` table. All the data in the column will be lost.
  - You are about to drop the column `rejectionReason` on the `ExpenseRequest` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `ExpenseRequest` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Goal` table. All the data in the column will be lost.
  - You are about to drop the column `choreId` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `User` table. All the data in the column will be lost.
  - Made the column `icon` on table `Goal` required. This step will fail if there are existing NULL values in that column.
  - Made the column `password` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ChildSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "childId" TEXT NOT NULL,
    "maxExpensePerRequest" REAL,
    "maxExpensePerWeek" REAL,
    "frozen" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ChildSettings_childId_fkey" FOREIGN KEY ("childId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ChildSettings" ("childId", "frozen", "id", "maxExpensePerRequest", "maxExpensePerWeek") SELECT "childId", "frozen", "id", "maxExpensePerRequest", "maxExpensePerWeek" FROM "ChildSettings";
DROP TABLE "ChildSettings";
ALTER TABLE "new_ChildSettings" RENAME TO "ChildSettings";
CREATE UNIQUE INDEX "ChildSettings_childId_key" ON "ChildSettings"("childId");
CREATE TABLE "new_Chore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "reward" REAL NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "deadline" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "proofImageUrl" TEXT,
    "note" TEXT,
    "rejectionReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Chore_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Chore" ("assigneeId", "createdAt", "deadline", "description", "id", "note", "proofImageUrl", "rejectionReason", "reward", "status", "title") SELECT "assigneeId", "createdAt", "deadline", "description", "id", "note", "proofImageUrl", "rejectionReason", "reward", "status", "title" FROM "Chore";
DROP TABLE "Chore";
ALTER TABLE "new_Chore" RENAME TO "Chore";
CREATE TABLE "new_ExpenseRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "childId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" REAL NOT NULL,
    "expenseType" TEXT NOT NULL,
    "reference" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedAmount" REAL,
    "parentNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExpenseRequest_childId_fkey" FOREIGN KEY ("childId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ExpenseRequest" ("amount", "approvedAmount", "childId", "createdAt", "description", "expenseType", "id", "parentNote", "reference", "status", "title") SELECT "amount", "approvedAmount", "childId", "createdAt", "description", "expenseType", "id", "parentNote", "reference", "status", "title" FROM "ExpenseRequest";
DROP TABLE "ExpenseRequest";
ALTER TABLE "new_ExpenseRequest" RENAME TO "ExpenseRequest";
CREATE TABLE "new_Goal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "familyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "target" REAL NOT NULL,
    "current" REAL NOT NULL DEFAULT 0,
    "icon" TEXT NOT NULL,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    CONSTRAINT "Goal_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Goal" ("current", "familyId", "icon", "id", "isShared", "status", "target", "title") SELECT "current", "familyId", "icon", "id", "isShared", "status", "target", "title" FROM "Goal";
DROP TABLE "Goal";
ALTER TABLE "new_Goal" RENAME TO "Goal";
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "childId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expenseId" TEXT,
    "goalId" TEXT,
    CONSTRAINT "Transaction_childId_fkey" FOREIGN KEY ("childId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("amount", "childId", "date", "description", "expenseId", "goalId", "id", "type") SELECT "amount", "childId", "date", "description", "expenseId", "goalId", "id", "type" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "age" INTEGER,
    "avatar" TEXT,
    "color" TEXT,
    "balance" REAL NOT NULL DEFAULT 0,
    "monthDelta" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "User_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_User" ("age", "avatar", "balance", "color", "email", "familyId", "id", "monthDelta", "name", "password", "role") SELECT "age", "avatar", "balance", "color", "email", "familyId", "id", "monthDelta", "name", "password", "role" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
