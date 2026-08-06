-- CreateTable
CREATE TABLE "AllowanceSchedule" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "frequency" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastPaidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AllowanceSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AllowanceSchedule_childId_key" ON "AllowanceSchedule"("childId");

-- AddForeignKey
ALTER TABLE "AllowanceSchedule" ADD CONSTRAINT "AllowanceSchedule_childId_fkey" FOREIGN KEY ("childId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
