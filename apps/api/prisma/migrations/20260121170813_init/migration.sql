-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "insToken" TEXT NOT NULL,
    "insHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "birthPlace" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'FR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "semantic_nodes" (
    "id" TEXT NOT NULL,
    "nodeType" TEXT NOT NULL,
    "snomedCtCode" TEXT,
    "cim10Code" TEXT,
    "cim11Code" TEXT,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "embedding" JSONB,
    "value" JSONB,
    "unit" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "confidence" DOUBLE PRECISION,
    "patientId" TEXT,
    "consultationId" TEXT,

    CONSTRAINT "semantic_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "semantic_relations" (
    "id" TEXT NOT NULL,
    "sourceNodeId" TEXT NOT NULL,
    "targetNodeId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "strength" DOUBLE PRECISION,
    "evidence" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confidence" DOUBLE PRECISION,

    CONSTRAINT "semantic_relations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultation_drafts" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "structuredData" JSONB NOT NULL,

    CONSTRAINT "consultation_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultations" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "consultationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "rawTranscript" TEXT,
    "rawText" TEXT,
    "draftData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "validatedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "consultations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_events" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "ghmCode" TEXT,
    "actCode" TEXT,
    "actType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "evidenceNodeIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transmittedAt" TIMESTAMP(3),

    CONSTRAINT "billing_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allergies" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "substance" TEXT NOT NULL,
    "snomedCtCode" TEXT,
    "severity" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT,

    CONSTRAINT "allergies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_documents" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "rawContent" TEXT,
    "documentDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "consultationId" TEXT,

    CONSTRAINT "medical_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_attachments" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT NOT NULL,

    CONSTRAINT "document_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "medicationName" TEXT NOT NULL,
    "atcCode" TEXT,
    "dosage" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "duration" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "safetyChecks" JSONB,
    "outpassReason" TEXT,
    "documentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prescribedBy" TEXT NOT NULL,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_reports" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "chiefComplaint" TEXT,
    "history" TEXT,
    "examination" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "documentId" TEXT,
    "consultationId" TEXT,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "medical_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laboratory_results" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "testName" TEXT NOT NULL,
    "testCode" TEXT,
    "resultValue" TEXT NOT NULL,
    "unit" TEXT,
    "referenceRange" TEXT,
    "status" TEXT NOT NULL,
    "testDate" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "laboratoryName" TEXT,
    "documentId" TEXT,

    CONSTRAINT "laboratory_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_images" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "studyInstanceUid" TEXT NOT NULL,
    "seriesInstanceUid" TEXT,
    "sopInstanceUid" TEXT,
    "modality" TEXT NOT NULL,
    "bodyPart" TEXT,
    "studyDescription" TEXT,
    "seriesDescription" TEXT,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "documentId" TEXT,
    "acquisitionDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medical_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedback_events" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "originalValue" JSONB NOT NULL,
    "correctedValue" JSONB NOT NULL,
    "correctionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correctedBy" TEXT NOT NULL,

    CONSTRAINT "feedback_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "doctorId" TEXT,
    "doctorName" TEXT,
    "appointmentDate" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "appointmentType" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "location" TEXT,
    "consultationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "cancellationReason" TEXT,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_reminders" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "reminderType" TEXT NOT NULL,
    "reminderTime" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_messages" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT,
    "threadId" TEXT,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "messageType" TEXT NOT NULL DEFAULT 'TEXT',
    "status" TEXT NOT NULL DEFAULT 'SENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "internal_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_threads" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "threadType" TEXT NOT NULL DEFAULT 'DIRECT',
    "description" TEXT,
    "participantIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastMessageAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "message_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_attachments" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_members" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL,
    "speciality" TEXT,
    "qualifications" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "hiredDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "staffMemberId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "shiftType" TEXT NOT NULL,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaves" (
    "id" TEXT NOT NULL,
    "staffMemberId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "leaveType" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "leaves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" TEXT NOT NULL,
    "staffMemberId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "scheduleData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sku" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subCategory" TEXT,
    "currentQuantity" INTEGER NOT NULL DEFAULT 0,
    "minQuantity" INTEGER NOT NULL DEFAULT 0,
    "maxQuantity" INTEGER,
    "unit" TEXT NOT NULL DEFAULT 'unit',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "movementType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reference" TEXT,
    "referenceType" TEXT,
    "movementDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_alerts" (
    "id" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,

    CONSTRAINT "stock_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patients_insToken_key" ON "patients"("insToken");

-- CreateIndex
CREATE UNIQUE INDEX "patients_insHash_key" ON "patients"("insHash");

-- CreateIndex
CREATE INDEX "patients_insToken_idx" ON "patients"("insToken");

-- CreateIndex
CREATE INDEX "patients_insHash_idx" ON "patients"("insHash");

-- CreateIndex
CREATE INDEX "semantic_nodes_patientId_idx" ON "semantic_nodes"("patientId");

-- CreateIndex
CREATE INDEX "semantic_nodes_consultationId_idx" ON "semantic_nodes"("consultationId");

-- CreateIndex
CREATE INDEX "semantic_nodes_nodeType_idx" ON "semantic_nodes"("nodeType");

-- CreateIndex
CREATE INDEX "semantic_nodes_snomedCtCode_idx" ON "semantic_nodes"("snomedCtCode");

-- CreateIndex
CREATE INDEX "semantic_relations_sourceNodeId_idx" ON "semantic_relations"("sourceNodeId");

-- CreateIndex
CREATE INDEX "semantic_relations_targetNodeId_idx" ON "semantic_relations"("targetNodeId");

-- CreateIndex
CREATE INDEX "semantic_relations_relationType_idx" ON "semantic_relations"("relationType");

-- CreateIndex
CREATE UNIQUE INDEX "semantic_relations_sourceNodeId_targetNodeId_relationType_key" ON "semantic_relations"("sourceNodeId", "targetNodeId", "relationType");

-- CreateIndex
CREATE INDEX "consultation_drafts_patientId_idx" ON "consultation_drafts"("patientId");

-- CreateIndex
CREATE INDEX "consultation_drafts_status_idx" ON "consultation_drafts"("status");

-- CreateIndex
CREATE INDEX "consultation_drafts_createdAt_idx" ON "consultation_drafts"("createdAt");

-- CreateIndex
CREATE INDEX "consultations_patientId_idx" ON "consultations"("patientId");

-- CreateIndex
CREATE INDEX "consultations_status_idx" ON "consultations"("status");

-- CreateIndex
CREATE INDEX "consultations_consultationDate_idx" ON "consultations"("consultationDate");

-- CreateIndex
CREATE INDEX "billing_events_consultationId_idx" ON "billing_events"("consultationId");

-- CreateIndex
CREATE INDEX "billing_events_status_idx" ON "billing_events"("status");

-- CreateIndex
CREATE INDEX "allergies_patientId_idx" ON "allergies"("patientId");

-- CreateIndex
CREATE INDEX "medical_documents_patientId_idx" ON "medical_documents"("patientId");

-- CreateIndex
CREATE INDEX "medical_documents_documentType_idx" ON "medical_documents"("documentType");

-- CreateIndex
CREATE INDEX "medical_documents_documentDate_idx" ON "medical_documents"("documentDate");

-- CreateIndex
CREATE INDEX "medical_documents_consultationId_idx" ON "medical_documents"("consultationId");

-- CreateIndex
CREATE INDEX "document_attachments_documentId_idx" ON "document_attachments"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "prescriptions_documentId_key" ON "prescriptions"("documentId");

-- CreateIndex
CREATE INDEX "prescriptions_patientId_idx" ON "prescriptions"("patientId");

-- CreateIndex
CREATE INDEX "prescriptions_status_idx" ON "prescriptions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "medical_reports_documentId_key" ON "medical_reports"("documentId");

-- CreateIndex
CREATE INDEX "medical_reports_patientId_idx" ON "medical_reports"("patientId");

-- CreateIndex
CREATE INDEX "medical_reports_reportType_idx" ON "medical_reports"("reportType");

-- CreateIndex
CREATE INDEX "medical_reports_reportDate_idx" ON "medical_reports"("reportDate");

-- CreateIndex
CREATE UNIQUE INDEX "laboratory_results_documentId_key" ON "laboratory_results"("documentId");

-- CreateIndex
CREATE INDEX "laboratory_results_patientId_idx" ON "laboratory_results"("patientId");

-- CreateIndex
CREATE INDEX "laboratory_results_testDate_idx" ON "laboratory_results"("testDate");

-- CreateIndex
CREATE INDEX "laboratory_results_status_idx" ON "laboratory_results"("status");

-- CreateIndex
CREATE UNIQUE INDEX "medical_images_documentId_key" ON "medical_images"("documentId");

-- CreateIndex
CREATE INDEX "medical_images_patientId_idx" ON "medical_images"("patientId");

-- CreateIndex
CREATE INDEX "medical_images_studyInstanceUid_idx" ON "medical_images"("studyInstanceUid");

-- CreateIndex
CREATE INDEX "medical_images_modality_idx" ON "medical_images"("modality");

-- CreateIndex
CREATE INDEX "medical_images_acquisitionDate_idx" ON "medical_images"("acquisitionDate");

-- CreateIndex
CREATE INDEX "feedback_events_entityType_entityId_idx" ON "feedback_events"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "feedback_events_createdAt_idx" ON "feedback_events"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_consultationId_key" ON "appointments"("consultationId");

-- CreateIndex
CREATE INDEX "appointments_patientId_idx" ON "appointments"("patientId");

-- CreateIndex
CREATE INDEX "appointments_doctorId_idx" ON "appointments"("doctorId");

-- CreateIndex
CREATE INDEX "appointments_appointmentDate_idx" ON "appointments"("appointmentDate");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_doctorId_startTime_endTime_key" ON "appointments"("doctorId", "startTime", "endTime");

-- CreateIndex
CREATE INDEX "appointment_reminders_appointmentId_idx" ON "appointment_reminders"("appointmentId");

-- CreateIndex
CREATE INDEX "appointment_reminders_reminderTime_idx" ON "appointment_reminders"("reminderTime");

-- CreateIndex
CREATE INDEX "appointment_reminders_status_idx" ON "appointment_reminders"("status");

-- CreateIndex
CREATE INDEX "internal_messages_senderId_idx" ON "internal_messages"("senderId");

-- CreateIndex
CREATE INDEX "internal_messages_recipientId_idx" ON "internal_messages"("recipientId");

-- CreateIndex
CREATE INDEX "internal_messages_threadId_idx" ON "internal_messages"("threadId");

-- CreateIndex
CREATE INDEX "internal_messages_status_idx" ON "internal_messages"("status");

-- CreateIndex
CREATE INDEX "internal_messages_createdAt_idx" ON "internal_messages"("createdAt");

-- CreateIndex
CREATE INDEX "message_threads_threadType_idx" ON "message_threads"("threadType");

-- CreateIndex
CREATE INDEX "message_threads_lastMessageAt_idx" ON "message_threads"("lastMessageAt");

-- CreateIndex
CREATE INDEX "message_attachments_messageId_idx" ON "message_attachments"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_members_email_key" ON "staff_members"("email");

-- CreateIndex
CREATE INDEX "staff_members_role_idx" ON "staff_members"("role");

-- CreateIndex
CREATE INDEX "staff_members_status_idx" ON "staff_members"("status");

-- CreateIndex
CREATE INDEX "shifts_staffMemberId_idx" ON "shifts"("staffMemberId");

-- CreateIndex
CREATE INDEX "shifts_startDate_idx" ON "shifts"("startDate");

-- CreateIndex
CREATE INDEX "shifts_status_idx" ON "shifts"("status");

-- CreateIndex
CREATE INDEX "leaves_staffMemberId_idx" ON "leaves"("staffMemberId");

-- CreateIndex
CREATE INDEX "leaves_startDate_idx" ON "leaves"("startDate");

-- CreateIndex
CREATE INDEX "leaves_status_idx" ON "leaves"("status");

-- CreateIndex
CREATE INDEX "schedules_staffMemberId_idx" ON "schedules"("staffMemberId");

-- CreateIndex
CREATE INDEX "schedules_startDate_idx" ON "schedules"("startDate");

-- CreateIndex
CREATE UNIQUE INDEX "stock_items_sku_key" ON "stock_items"("sku");

-- CreateIndex
CREATE INDEX "stock_items_category_idx" ON "stock_items"("category");

-- CreateIndex
CREATE INDEX "stock_items_sku_idx" ON "stock_items"("sku");

-- CreateIndex
CREATE INDEX "stock_movements_stockItemId_idx" ON "stock_movements"("stockItemId");

-- CreateIndex
CREATE INDEX "stock_movements_movementDate_idx" ON "stock_movements"("movementDate");

-- CreateIndex
CREATE INDEX "stock_movements_movementType_idx" ON "stock_movements"("movementType");

-- CreateIndex
CREATE INDEX "stock_alerts_stockItemId_idx" ON "stock_alerts"("stockItemId");

-- CreateIndex
CREATE INDEX "stock_alerts_status_idx" ON "stock_alerts"("status");

-- CreateIndex
CREATE INDEX "stock_alerts_alertType_idx" ON "stock_alerts"("alertType");

-- AddForeignKey
ALTER TABLE "semantic_nodes" ADD CONSTRAINT "semantic_nodes_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semantic_nodes" ADD CONSTRAINT "semantic_nodes_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semantic_relations" ADD CONSTRAINT "semantic_relations_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "semantic_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semantic_relations" ADD CONSTRAINT "semantic_relations_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "semantic_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultations" ADD CONSTRAINT "consultations_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_events" ADD CONSTRAINT "billing_events_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allergies" ADD CONSTRAINT "allergies_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_documents" ADD CONSTRAINT "medical_documents_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_documents" ADD CONSTRAINT "medical_documents_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_attachments" ADD CONSTRAINT "document_attachments_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "medical_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "medical_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_reports" ADD CONSTRAINT "medical_reports_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_reports" ADD CONSTRAINT "medical_reports_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "medical_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_reports" ADD CONSTRAINT "medical_reports_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laboratory_results" ADD CONSTRAINT "laboratory_results_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "laboratory_results" ADD CONSTRAINT "laboratory_results_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "medical_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_images" ADD CONSTRAINT "medical_images_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_images" ADD CONSTRAINT "medical_images_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "medical_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "consultations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_reminders" ADD CONSTRAINT "appointment_reminders_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_messages" ADD CONSTRAINT "internal_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "message_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "internal_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "staff_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "staff_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedules" ADD CONSTRAINT "schedules_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "staff_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_alerts" ADD CONSTRAINT "stock_alerts_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
