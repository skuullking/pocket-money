-- Familles de démonstration jetables (POST /api/demo).
ALTER TABLE "Family" ADD COLUMN "demoExpiresAt" TIMESTAMP(3);

CREATE INDEX "Family_demoExpiresAt_idx" ON "Family"("demoExpiresAt");
