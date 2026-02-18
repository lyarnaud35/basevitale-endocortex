-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "consultationId" TEXT,
ADD COLUMN     "contextSnapshot" JSONB,
ADD COLUMN     "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "invoices_consultationId_idx" ON "invoices"("consultationId");

-- CreateIndex
CREATE INDEX "invoices_performedAt_idx" ON "invoices"("performedAt");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
