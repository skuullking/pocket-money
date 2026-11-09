-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_familyId_fkey";

-- DropForeignKey
ALTER TABLE "Chore" DROP CONSTRAINT "Chore_assigneeId_fkey";

-- DropForeignKey
ALTER TABLE "ChoreTemplate" DROP CONSTRAINT "ChoreTemplate_familyId_fkey";

-- DropForeignKey
ALTER TABLE "ChoreTemplate" DROP CONSTRAINT "ChoreTemplate_assigneeId_fkey";

-- DropForeignKey
ALTER TABLE "ExpenseRequest" DROP CONSTRAINT "ExpenseRequest_childId_fkey";

-- DropForeignKey
ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_childId_fkey";

-- DropForeignKey
ALTER TABLE "Goal" DROP CONSTRAINT "Goal_familyId_fkey";

-- DropForeignKey
ALTER TABLE "GoalParticipant" DROP CONSTRAINT "GoalParticipant_goalId_fkey";

-- DropForeignKey
ALTER TABLE "GoalParticipant" DROP CONSTRAINT "GoalParticipant_childId_fkey";

-- DropForeignKey
ALTER TABLE "Rule" DROP CONSTRAINT "Rule_familyId_fkey";

-- DropForeignKey
ALTER TABLE "ChildSettings" DROP CONSTRAINT "ChildSettings_childId_fkey";

-- DropForeignKey
ALTER TABLE "PasswordResetToken" DROP CONSTRAINT "PasswordResetToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "AllowanceSchedule" DROP CONSTRAINT "AllowanceSchedule_childId_fkey";

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chore" ADD CONSTRAINT "Chore_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreTemplate" ADD CONSTRAINT "ChoreTemplate_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreTemplate" ADD CONSTRAINT "ChoreTemplate_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseRequest" ADD CONSTRAINT "ExpenseRequest_childId_fkey" FOREIGN KEY ("childId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_childId_fkey" FOREIGN KEY ("childId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalParticipant" ADD CONSTRAINT "GoalParticipant_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalParticipant" ADD CONSTRAINT "GoalParticipant_childId_fkey" FOREIGN KEY ("childId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rule" ADD CONSTRAINT "Rule_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChildSettings" ADD CONSTRAINT "ChildSettings_childId_fkey" FOREIGN KEY ("childId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllowanceSchedule" ADD CONSTRAINT "AllowanceSchedule_childId_fkey" FOREIGN KEY ("childId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
