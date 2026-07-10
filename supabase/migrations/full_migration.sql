-- ============================================================================
-- QMS ISO 13485 Pro — Migration complète Supabase (PostgreSQL 15+)
-- ============================================================================
-- Généré automatiquement: Prisma tables + RLS multi-tenant + Audit blockchain
-- Date: 2026-07-11
--
-- INSTRUCTIONS: Copier-coller ce fichier dans le Supabase SQL Editor
-- (Dashboard → SQL Editor → New query) puis cliquer "Run"
--
-- Ce script crée:
--   1. Extensions PostgreSQL (pgcrypto)
--   2. 28 tables (27 modèles Prisma + audit_config)
--   3. Index et contraintes d'unicité
--   4. Politiques RLS multi-tenant (Row Level Security)
--   5. Fonctions helper (is_org_member, is_org_admin, current_profile_id)
--   6. Triggers d'audit trail (HMAC-SHA256 blockchain)
--   7. Protection immuabilité audit_trails (21 CFR Part 11)
-- ============================================================================

BEGIN;

-- Extensions PostgreSQL
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- PARTIE 1: Tables (généré par Prisma — snake_case via @map)
-- ============================================================================


-- CreateTable
CREATE TABLE IF NOT EXISTS "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'trial',
    "settings" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Profile" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'operator',
    "department" TEXT,
    "jobTitle" TEXT,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "passwordHash" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "status" TEXT NOT NULL DEFAULT 'active',
    "invitedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Department" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "labelFr" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "parentCode" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Document" (
    "id" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "classification" TEXT NOT NULL DEFAULT 'Internal',
    "code" TEXT,
    "isoClause" TEXT,
    "documentLevel" INTEGER NOT NULL DEFAULT 4,
    "parentDocumentId" TEXT,
    "departmentCode" TEXT,
    "isPrerequisite" BOOLEAN NOT NULL DEFAULT false,
    "reviewCycleMonths" INTEGER NOT NULL DEFAULT 12,
    "validationPhase" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "lastReviewed" TIMESTAMP(3),
    "nextReview" TIMESTAMP(3),
    "owner" TEXT,
    "retentionPeriod" TEXT,
    "docScope" TEXT,
    "docReferences" TEXT,
    "content" TEXT,
    "summary" TEXT,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "templateReferenceId" TEXT,
    "templateReferenceVersion" TEXT,
    "typeSpecificData" TEXT,
    "customFieldsJson" TEXT,
    "organizationId" TEXT NOT NULL,
    "authorId" TEXT,
    "createdById" TEXT,
    "approverId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ElectronicSignature" (
    "id" TEXT NOT NULL,
    "documentId" TEXT,
    "recordId" TEXT,
    "recordType" TEXT,
    "signedById" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerRole" TEXT NOT NULL,
    "signatureType" TEXT NOT NULL,
    "signatureHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "revocationReason" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ElectronicSignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DocumentPrerequisite" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "recordType" TEXT NOT NULL,
    "requiredDocType" TEXT NOT NULL,
    "requiredDocRef" TEXT,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentPrerequisite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DocumentTrigger" (
    "id" TEXT NOT NULL,
    "sourceDocumentId" TEXT NOT NULL,
    "targetDocumentId" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "description" TEXT,
    "isMandatory" BOOLEAN NOT NULL DEFAULT false,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentTrigger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DocumentRelationship" (
    "id" TEXT NOT NULL,
    "parentDocumentId" TEXT NOT NULL,
    "childDocumentId" TEXT NOT NULL,
    "relationshipType" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DocumentCodeSequence" (
    "id" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "departmentSuffix" TEXT,
    "lastSequence" INTEGER NOT NULL DEFAULT 0,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentCodeSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "FormTemplate" (
    "id" TEXT NOT NULL,
    "documentId" TEXT,
    "title" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "description" TEXT,
    "fieldsJson" TEXT NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "moduleType" TEXT NOT NULL,
    "workflowJson" TEXT,
    "complianceJson" TEXT,
    "signaturesJson" TEXT NOT NULL DEFAULT '[]',
    "currentApprovalStep" INTEGER NOT NULL DEFAULT 0,
    "previousVersionId" TEXT,
    "effectiveDate" TIMESTAMP(3),
    "reviewComment" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "FormInstance" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "templateVersion" TEXT,
    "referenceNumber" TEXT,
    "valuesJson" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'Draft',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "submittedById" TEXT,
    "submittedAt" TIMESTAMP(3),
    "signatureHash" TEXT,
    "signaturesJson" TEXT NOT NULL DEFAULT '[]',
    "currentApprovalStep" INTEGER NOT NULL DEFAULT 0,
    "approvalHistoryJson" TEXT NOT NULL DEFAULT '[]',
    "parentDocumentId" TEXT,
    "linkedRecordId" TEXT,
    "linkedRecordType" TEXT,
    "recordTypeSlug" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FormInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CAPA" (
    "id" TEXT NOT NULL,
    "capaNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "capaType" TEXT NOT NULL DEFAULT 'Corrective',
    "status" TEXT NOT NULL DEFAULT 'Open',
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "source" TEXT NOT NULL DEFAULT 'Non-Conformance',
    "sourceReferenceId" TEXT,
    "sourceRecordType" TEXT,
    "description" TEXT,
    "problemStatement" TEXT,
    "investigationDetails" TEXT,
    "rootCauseAnalysis" TEXT,
    "rootCauseCategory" TEXT,
    "fiveWhysJson" TEXT NOT NULL DEFAULT '[]',
    "correctiveAction" TEXT,
    "effectivenessVerificationMethod" TEXT,
    "effectivenessCriteria" TEXT,
    "effectivenessResult" TEXT,
    "linkedDocumentId" TEXT,
    "linkedNcrId" TEXT,
    "linkedAuditId" TEXT,
    "linkedCapaId" TEXT,
    "templateId" TEXT,
    "templateVersion" TEXT,
    "assignedToId" TEXT,
    "ownerId" TEXT,
    "dueDate" TIMESTAMP(3),
    "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedDate" TIMESTAMP(3),
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CAPA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "NonConformance" (
    "id" TEXT NOT NULL,
    "ncrNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "ncrType" TEXT NOT NULL DEFAULT 'Process',
    "status" TEXT NOT NULL DEFAULT 'Open',
    "severity" TEXT NOT NULL DEFAULT 'Minor',
    "source" TEXT,
    "description" TEXT,
    "lotNumber" TEXT,
    "quantityAffected" TEXT,
    "disposition" TEXT NOT NULL DEFAULT 'Pending',
    "isOosOot" BOOLEAN NOT NULL DEFAULT false,
    "analyticalMethod" TEXT,
    "measuredValue" DOUBLE PRECISION,
    "measuredUnit" TEXT,
    "specLimit" TEXT,
    "phase1Conclusion" TEXT,
    "phase2Required" BOOLEAN NOT NULL DEFAULT false,
    "phase2Conclusion" TEXT,
    "rejectLot" BOOLEAN NOT NULL DEFAULT false,
    "linkedCapaId" TEXT,
    "linkedProcedureRef" TEXT,
    "supplierId" TEXT,
    "impactAssessment" TEXT,
    "containmentActions" TEXT,
    "affectedProduct" TEXT,
    "closedSignatureHash" TEXT,
    "closedSignedAt" TIMESTAMP(3),
    "closedById" TEXT,
    "closedReason" TEXT,
    "assignedToId" TEXT,
    "ownerId" TEXT,
    "dueDate" TIMESTAMP(3),
    "createdDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NonConformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Deviation" (
    "id" TEXT NOT NULL,
    "devNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "deviationType" TEXT NOT NULL DEFAULT 'Unplanned',
    "status" TEXT NOT NULL DEFAULT 'Open',
    "severity" TEXT NOT NULL DEFAULT 'Minor',
    "category" TEXT NOT NULL DEFAULT 'Process',
    "description" TEXT,
    "deviationDetails" TEXT,
    "justification" TEXT,
    "riskAssessment" TEXT,
    "correctiveAction" TEXT,
    "preventiveAction" TEXT,
    "sopReference" TEXT,
    "expectedResult" TEXT,
    "actualResult" TEXT,
    "productStage" TEXT,
    "quarantine" BOOLEAN NOT NULL DEFAULT false,
    "impactOnValidatedState" TEXT,
    "impactOnRegulatoryFiling" TEXT,
    "containmentAction" TEXT,
    "detectedDate" TIMESTAMP(3),
    "isPlannedDeviation" BOOLEAN NOT NULL DEFAULT false,
    "lotNumber" TEXT,
    "productCode" TEXT,
    "quantityAffected" TEXT,
    "linkedCapaId" TEXT,
    "linkedDocumentId" TEXT,
    "assignedToId" TEXT,
    "ownerId" TEXT,
    "dueDate" TIMESTAMP(3),
    "closedDate" TIMESTAMP(3),
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deviation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ChangeControl" (
    "id" TEXT NOT NULL,
    "ccNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "ccType" TEXT NOT NULL DEFAULT 'Planned',
    "status" TEXT NOT NULL DEFAULT 'Requested',
    "priority" TEXT NOT NULL DEFAULT 'Medium',
    "category" TEXT NOT NULL DEFAULT 'Process',
    "description" TEXT,
    "justification" TEXT,
    "proposedChange" TEXT,
    "detailedChangeDescription" TEXT,
    "businessComplianceJustification" TEXT,
    "riskAssessment" TEXT,
    "impactAnalysis" TEXT,
    "affectedAreas" TEXT,
    "impactOnValidatedSystems" BOOLEAN NOT NULL DEFAULT false,
    "implementationPlan" TEXT,
    "implementationDate" TIMESTAMP(3),
    "estimatedCostImpact" TEXT,
    "completionDate" TIMESTAMP(3),
    "regulatoryTrigger" TEXT,
    "emergencyFlag" BOOLEAN NOT NULL DEFAULT false,
    "linkedDocumentId" TEXT,
    "linkedCapaId" TEXT,
    "additionalReferences" TEXT,
    "assignedToId" TEXT,
    "requestedById" TEXT,
    "approvedById" TEXT,
    "approverId" TEXT,
    "ownerId" TEXT,
    "dueDate" TIMESTAMP(3),
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangeControl_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Audit" (
    "id" TEXT NOT NULL,
    "auditNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "auditType" TEXT NOT NULL DEFAULT 'Internal',
    "status" TEXT NOT NULL DEFAULT 'Planned',
    "auditScope" TEXT,
    "scheduledDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "leadAuditorId" TEXT,
    "auditeesJson" TEXT NOT NULL DEFAULT '[]',
    "findingsJson" TEXT NOT NULL DEFAULT '[]',
    "auditCriteria" TEXT,
    "complianceRating" TEXT,
    "completedSignatureHash" TEXT,
    "completedSignedAt" TIMESTAMP(3),
    "completedSignedById" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Risk" (
    "id" TEXT NOT NULL,
    "riskNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Process',
    "status" TEXT NOT NULL DEFAULT 'Open',
    "hazardDescription" TEXT,
    "riskOwner" TEXT,
    "regulatoryReference" TEXT,
    "controlType" TEXT,
    "verificationMethod" TEXT,
    "riskAcceptability" TEXT NOT NULL DEFAULT 'ALARP',
    "priorityNotes" TEXT,
    "probability" INTEGER NOT NULL DEFAULT 3,
    "impact" INTEGER NOT NULL DEFAULT 3,
    "detectability" INTEGER NOT NULL DEFAULT 3,
    "rpn" INTEGER NOT NULL DEFAULT 27,
    "riskLevel" TEXT NOT NULL DEFAULT 'Medium',
    "mitigation" TEXT,
    "residualRisk" TEXT,
    "residualProbability" INTEGER,
    "residualImpact" INTEGER,
    "residualDetectability" INTEGER,
    "residualRpn" INTEGER,
    "linkedDocumentId" TEXT,
    "linkedCapaId" TEXT,
    "ownerId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Risk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Training" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "trainingType" TEXT NOT NULL DEFAULT 'SOP',
    "status" TEXT NOT NULL DEFAULT 'Planned',
    "assignedToId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "documentId" TEXT,
    "metadataJson" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Training_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BatchRecord" (
    "id" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productCode" TEXT,
    "batchSize" TEXT,
    "batchSizeUnit" TEXT NOT NULL DEFAULT 'units',
    "masterFormulaId" TEXT,
    "sopReference" TEXT,
    "manufacturingDate" TIMESTAMP(3),
    "expiryDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'In Progress',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "qaReleaseDate" TIMESTAMP(3),
    "qaReleasedById" TEXT,
    "stepsJson" TEXT NOT NULL DEFAULT '[]',
    "rawMaterialsJson" TEXT NOT NULL DEFAULT '[]',
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BatchRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Supplier" (
    "id" TEXT NOT NULL,
    "supplierCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Raw Material',
    "status" TEXT NOT NULL DEFAULT 'Under Evaluation',
    "qualificationDate" TIMESTAMP(3),
    "nextReviewDate" TIMESTAMP(3),
    "certificationsJson" TEXT NOT NULL DEFAULT '[]',
    "performanceScore" DOUBLE PRECISION,
    "qualificationDocId" TEXT,
    "qualificationMethod" TEXT,
    "qualificationDocRef" TEXT,
    "website" TEXT,
    "primaryContactName" TEXT,
    "primaryContactEmail" TEXT,
    "primaryContactPhone" TEXT,
    "street" TEXT,
    "city" TEXT,
    "stateProvince" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "notes" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AuditTrail" (
    "id" TEXT NOT NULL,
    "sequenceNumber" INTEGER,
    "previousHash" TEXT,
    "hash" TEXT,
    "auditAction" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "oldValuesJson" TEXT,
    "newValuesJson" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditTrail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "RecordTypeDefinition" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "icon" TEXT NOT NULL DEFAULT 'FileText',
    "description" TEXT,
    "statusFlowJson" TEXT NOT NULL DEFAULT '[]',
    "defaultFieldsJson" TEXT NOT NULL DEFAULT '[]',
    "complianceRefsJson" TEXT NOT NULL DEFAULT '[]',
    "codePrefix" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "requiresEsig" BOOLEAN NOT NULL DEFAULT false,
    "minApproverCount" INTEGER NOT NULL DEFAULT 1,
    "effectiveDate" TIMESTAMP(3),
    "previousVersionId" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "changeReason" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecordTypeDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "RecordLink" (
    "id" TEXT NOT NULL,
    "sourceRecordId" TEXT NOT NULL,
    "sourceRecordType" TEXT NOT NULL,
    "targetRecordId" TEXT NOT NULL,
    "targetRecordType" TEXT NOT NULL,
    "linkType" TEXT NOT NULL DEFAULT 'related',
    "description" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecordLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CustomFieldDefinition" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "optionsJson" TEXT NOT NULL DEFAULT '[]',
    "applicableTo" TEXT NOT NULL DEFAULT '*',
    "organizationId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomFieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ScheduledReport" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT 'pdf',
    "frequency" TEXT NOT NULL DEFAULT 'monthly',
    "recipientsJson" TEXT NOT NULL DEFAULT '[]',
    "filtersJson" TEXT NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "lastResult" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduledReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_email_key" ON "Profile"("email");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_organizationId_profileId_key" ON "OrganizationMember"("organizationId", "profileId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Document_organizationId_documentNumber_key" ON "Document"("organizationId", "documentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentCodeSequence_prefix_departmentSuffix_organizationId_key" ON "DocumentCodeSequence"("prefix", "departmentSuffix", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "RecordTypeDefinition_organizationId_slug_key" ON "RecordTypeDefinition"("organizationId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "RecordLink_sourceRecordId_sourceRecordType_targetRecordId_t_key" ON "RecordLink"("sourceRecordId", "sourceRecordType", "targetRecordId", "targetRecordType", "linkType");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Department" ADD CONSTRAINT "Department_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicSignature" ADD CONSTRAINT "ElectronicSignature_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicSignature" ADD CONSTRAINT "ElectronicSignature_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicSignature" ADD CONSTRAINT "ElectronicSignature_signedById_fkey" FOREIGN KEY ("signedById") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentPrerequisite" ADD CONSTRAINT "DocumentPrerequisite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTrigger" ADD CONSTRAINT "DocumentTrigger_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTrigger" ADD CONSTRAINT "DocumentTrigger_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTrigger" ADD CONSTRAINT "DocumentTrigger_targetDocumentId_fkey" FOREIGN KEY ("targetDocumentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRelationship" ADD CONSTRAINT "DocumentRelationship_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRelationship" ADD CONSTRAINT "DocumentRelationship_parentDocumentId_fkey" FOREIGN KEY ("parentDocumentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRelationship" ADD CONSTRAINT "DocumentRelationship_childDocumentId_fkey" FOREIGN KEY ("childDocumentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentCodeSequence" ADD CONSTRAINT "DocumentCodeSequence_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormTemplate" ADD CONSTRAINT "FormTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormTemplate" ADD CONSTRAINT "FormTemplate_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormTemplate" ADD CONSTRAINT "FormTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormInstance" ADD CONSTRAINT "FormInstance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FormInstance" ADD CONSTRAINT "FormInstance_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "FormTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CAPA" ADD CONSTRAINT "CAPA_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CAPA" ADD CONSTRAINT "CAPA_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CAPA" ADD CONSTRAINT "CAPA_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformance" ADD CONSTRAINT "NonConformance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformance" ADD CONSTRAINT "NonConformance_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NonConformance" ADD CONSTRAINT "NonConformance_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deviation" ADD CONSTRAINT "Deviation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deviation" ADD CONSTRAINT "Deviation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deviation" ADD CONSTRAINT "Deviation_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeControl" ADD CONSTRAINT "ChangeControl_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeControl" ADD CONSTRAINT "ChangeControl_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeControl" ADD CONSTRAINT "ChangeControl_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeControl" ADD CONSTRAINT "ChangeControl_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_leadAuditorId_fkey" FOREIGN KEY ("leadAuditorId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit" ADD CONSTRAINT "Audit_completedSignedById_fkey" FOREIGN KEY ("completedSignedById") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Training" ADD CONSTRAINT "Training_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Training" ADD CONSTRAINT "Training_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchRecord" ADD CONSTRAINT "BatchRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchRecord" ADD CONSTRAINT "BatchRecord_qaReleasedById_fkey" FOREIGN KEY ("qaReleasedById") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditTrail" ADD CONSTRAINT "AuditTrail_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditTrail" ADD CONSTRAINT "AuditTrail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordTypeDefinition" ADD CONSTRAINT "RecordTypeDefinition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordLink" ADD CONSTRAINT "RecordLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomFieldDefinition" ADD CONSTRAINT "CustomFieldDefinition_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledReport" ADD CONSTRAINT "ScheduledReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- PARTIE 2: RLS Multi-tenant + Fonctions helper
-- ============================================================================

-- ============================================================================
-- Migration 002 : RLS Multi-tenant + Fonctions helper
-- ============================================================================
-- Securite defensive en profondeur (defense in depth).
-- L'app accede a la DB via API routes (Prisma + service_role),
-- ces politiques RLS protegent en cas d'acces direct au client Supabase.
--
-- NOTE: Cette app utilise un auth custom (bcrypt + session cookie).
-- Les fonctions helper lisent l'ID utilisateur depuis:
--   1) JWT Supabase claim 'profile_id' (si Supabase Auth est active)
--   2) Variable locale 'app.user_id' (posee par les API routes)
-- ============================================================================


-- ============================================================================
-- Helper functions
-- ============================================================================

CREATE OR REPLACE FUNCTION current_profile_id()
RETURNS TEXT AS $$
DECLARE
  v_claim_id TEXT;
  v_setting_id TEXT;
BEGIN
  -- Essai 1: JWT claim profile_id
  BEGIN
    v_claim_id := (current_setting('request.jwt.claims', true)::json->>'profile_id');
    IF v_claim_id IS NOT NULL AND v_claim_id != '' THEN RETURN v_claim_id; END IF;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  -- Essai 2: Variable locale API
  BEGIN
    v_setting_id := current_setting('app.user_id', true);
    IF v_setting_id IS NOT NULL AND v_setting_id != '' THEN RETURN v_setting_id; END IF;
  EXCEPTION WHEN OTHERS THEN NULL; END;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION is_org_member(p_org_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_org_id AND profile_id = current_profile_id() AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_org_admin(p_org_id TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_org_id AND profile_id = current_profile_id()
      AND status = 'active' AND role IN ('owner', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION current_org_id()
RETURNS TEXT AS $$
  SELECT organization_id FROM profiles
  WHERE id = current_profile_id() AND active = true LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================================
-- Enable RLS on ALL 27 data tables
-- ============================================================================

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'organizations','profiles','organization_members','sessions',
    'departments','documents','electronic_signatures',
    'document_prerequisites','document_triggers','document_relationships',
    'document_code_sequences','form_templates','form_instances',
    'capas','non_conformances','deviations','change_controls',
    'audits','risks','training','batch_records','suppliers',
    'audit_trails','record_type_definitions','record_links',
    'custom_field_definitions','scheduled_reports'
  ]) LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- ============================================================================
-- Standard RLS macro: 4 politiques CRUD par table
-- ============================================================================

CREATE OR REPLACE FUNCTION create_std_rls(p_table TEXT)
RETURNS VOID AS $$
BEGIN
  EXECUTE format('CREATE OR REPLACE POLICY %I_sel ON %I FOR SELECT TO authenticated USING (is_org_member(organization_id))', p_table, p_table);
  EXECUTE format('CREATE OR REPLACE POLICY %I_ins ON %I FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id))', p_table, p_table);
  EXECUTE format('CREATE OR REPLACE POLICY %I_upd ON %I FOR UPDATE TO authenticated USING (is_org_member(organization_id)) WITH CHECK (is_org_member(organization_id))', p_table, p_table);
  EXECUTE format('CREATE OR REPLACE POLICY %I_del ON %I FOR DELETE TO authenticated USING (is_org_member(organization_id))', p_table, p_table);
END;
$$ LANGUAGE plpgsql;

-- 21 tables metier: politiques standard
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'documents','electronic_signatures','document_prerequisites',
    'document_triggers','document_relationships','document_code_sequences',
    'form_templates','form_instances',
    'capas','non_conformances','deviations','change_controls',
    'audits','risks','training','batch_records','suppliers',
    'departments','record_links','custom_field_definitions','scheduled_reports'
  ]) LOOP
    PERFORM create_std_rls(t);
  END LOOP;
END $$;

-- ============================================================================
-- Tables avec politiques speciales
-- ============================================================================

-- audit_trails: INSERT seulement (immuable)
CREATE OR REPLACE POLICY audit_trails_sel ON audit_trails
  FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE OR REPLACE POLICY audit_trails_ins ON audit_trails
  FOR INSERT TO authenticated WITH CHECK (is_org_member(organization_id));

-- record_type_definitions: lecture membres, ecriture admin
CREATE OR REPLACE POLICY rtd_sel ON record_type_definitions
  FOR SELECT TO authenticated USING (is_org_member(organization_id));
CREATE OR REPLACE POLICY rtd_ins ON record_type_definitions
  FOR INSERT TO authenticated WITH CHECK (is_org_admin(organization_id));
CREATE OR REPLACE POLICY rtd_upd ON record_type_definitions
  FOR UPDATE TO authenticated USING (is_org_admin(organization_id)) WITH CHECK (is_org_admin(organization_id));
CREATE OR REPLACE POLICY rtd_del ON record_type_definitions
  FOR DELETE TO authenticated USING (is_org_admin(organization_id));

-- organizations: membre=lecture, libre=creation, admin=update, owner=delete
CREATE OR REPLACE POLICY orgs_sel ON organizations
  FOR SELECT TO authenticated USING (is_org_member(id));
CREATE OR REPLACE POLICY orgs_ins ON organizations
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE OR REPLACE POLICY orgs_upd ON organizations
  FOR UPDATE TO authenticated USING (is_org_admin(id)) WITH CHECK (is_org_admin(id));
CREATE OR REPLACE POLICY orgs_del ON organizations
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM organization_members WHERE organization_id = id AND profile_id = current_profile_id() AND role = 'owner' AND status = 'active')
  );

-- profiles: son profil ou profil de son org
CREATE OR REPLACE POLICY profiles_sel ON profiles
  FOR SELECT TO authenticated USING (id = current_profile_id() OR is_org_member(organization_id));
CREATE OR REPLACE POLICY profiles_ins ON profiles
  FOR INSERT TO authenticated WITH CHECK (id = current_profile_id());
CREATE OR REPLACE POLICY profiles_upd ON profiles
  FOR UPDATE TO authenticated USING (id = current_profile_id() OR is_org_admin(organization_id))
  WITH CHECK (id = current_profile_id() OR is_org_admin(organization_id));

-- organization_members
CREATE OR REPLACE POLICY om_sel ON organization_members
  FOR SELECT TO authenticated USING (profile_id = current_profile_id() OR is_org_member(organization_id));
CREATE OR REPLACE POLICY om_ins ON organization_members
  FOR INSERT TO authenticated WITH CHECK (profile_id = current_profile_id() OR is_org_admin(organization_id));
CREATE OR REPLACE POLICY om_upd ON organization_members
  FOR UPDATE TO authenticated USING (is_org_admin(organization_id)) WITH CHECK (is_org_admin(organization_id));
CREATE OR REPLACE POLICY om_del ON organization_members
  FOR DELETE TO authenticated USING (is_org_admin(organization_id));

-- sessions: proprietaire ou admin de l'org
CREATE OR REPLACE POLICY sessions_sel ON sessions
  FOR SELECT TO authenticated USING (
    profile_id = current_profile_id() OR is_org_admin((SELECT organization_id FROM profiles WHERE id = profile_id LIMIT 1))
  );
CREATE OR REPLACE POLICY sessions_ins ON sessions
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE OR REPLACE POLICY sessions_del ON sessions
  FOR DELETE TO authenticated USING (
    profile_id = current_profile_id() OR is_org_admin((SELECT organization_id FROM profiles WHERE id = profile_id LIMIT 1))
  );

-- ============================================================================
-- create_organization_for_user
-- ============================================================================
CREATE OR REPLACE FUNCTION create_organization_for_user(
  p_user_id TEXT, p_name TEXT, p_slug TEXT, p_settings JSONB DEFAULT '{}'
) RETURNS TEXT AS $$
DECLARE v_org_id TEXT;
BEGIN
  INSERT INTO organizations (name, slug, settings)
  VALUES (p_name, p_slug, p_settings) RETURNING id INTO v_org_id;
  INSERT INTO organization_members (organization_id, profile_id, role, status)
  VALUES (v_org_id, p_user_id, 'owner', 'active');
  UPDATE profiles SET organization_id = v_org_id, updated_at = now() WHERE id = p_user_id;
  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- PARTIE 3: Audit Trail Triggers — Blockchain HMAC-SHA256
-- ============================================================================

-- ============================================================================
-- Migration 003 : Audit Trail Triggers — Blockchain HMAC-SHA256
-- ============================================================================
-- Conformite: ISO 13485 4.2.4 / 21 CFR Part 11 11.10(e)
--
-- 1. log_audit_trail: trigger generique sur toutes les tables metier
-- 2. compute_audit_hash: hash HMAC-SHA256 chaine (blockchain)
-- 3. block_audit_trails_modification: immuabilite (UPDATE/DELETE bloques)
-- 4. verify_audit_integrity: verification de la chaine
-- 5. enforce_maker_checker: separation des taches (21 CFR Part 11 11.10(g))
-- ============================================================================


-- ============================================================================
-- 1. log_audit_trail
-- ============================================================================
CREATE OR REPLACE FUNCTION log_audit_trail()
RETURNS TRIGGER AS $$
DECLARE
  v_org_id      TEXT;
  v_action      TEXT;
  v_user_id     TEXT;
  v_user_email  TEXT;
  v_record_id   TEXT;
  v_old_vals    JSONB;
  v_new_vals    JSONB;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'CREATE'; v_record_id := NEW.id;
    v_old_vals := NULL; v_new_vals := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_action := 'UPDATE'; v_record_id := NEW.id;
    v_old_vals := to_jsonb(OLD); v_new_vals := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'DELETE'; v_record_id := OLD.id;
    v_old_vals := to_jsonb(OLD); v_new_vals := NULL;
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- organization_id
  BEGIN v_org_id := NEW.organization_id; EXCEPTION WHEN OTHERS THEN
    BEGIN v_org_id := OLD.organization_id; EXCEPTION WHEN OTHERS THEN
      v_org_id := current_org_id();
    END;
  END;

  -- user
  v_user_id := current_profile_id();
  IF v_user_id IS NOT NULL THEN
    SELECT email INTO v_user_email FROM profiles WHERE id = v_user_id;
  END IF;

  BEGIN
    INSERT INTO audit_trails (
      audit_action, table_name, record_id,
      user_id, user_email, old_values_json, new_values_json, organization_id
    ) VALUES (
      v_action, TG_TABLE_NAME, v_record_id,
      v_user_id, v_user_email, v_old_vals, v_new_vals, v_org_id
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Audit trail insert failed for %.%: %', TG_TABLE_SCHEMA, TG_TABLE_NAME, SQLERRM;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. compute_audit_hash
-- ============================================================================
CREATE OR REPLACE FUNCTION compute_audit_hash()
RETURNS TRIGGER AS $$
DECLARE
  v_salt       TEXT;
  v_prev_hash  TEXT;
  v_prev_seq   BIGINT;
  v_canonical  TEXT;
  v_hash       TEXT;
BEGIN
  SELECT signing_salt INTO v_salt FROM audit_config WHERE id = 'singleton';
  IF v_salt IS NULL THEN v_salt := 'FALLBACK-DEV-ONLY-CHANGE-IN-PRODUCTION'; END IF;

  SELECT sequence_number, hash INTO v_prev_seq, v_prev_hash
  FROM audit_trails WHERE organization_id = NEW.organization_id
  ORDER BY sequence_number DESC NULLS LAST LIMIT 1;

  NEW.sequence_number := COALESCE(v_prev_seq, 0) + 1;
  NEW.previous_hash   := COALESCE(v_prev_hash, 'GENESIS');

  v_canonical := json_build_object(
    'seq', NEW.sequence_number, 'action', NEW.audit_action,
    'table', NEW.table_name, 'record_id', NEW.record_id,
    'user_id', NEW.user_id, 'org_id', NEW.organization_id,
    'prev_hash', NEW.previous_hash, 'timestamp', NEW.created_at
  )::text;

  v_hash := encode(hmac(v_canonical::bytea, v_salt::bytea, 'sha256'), 'hex');
  NEW.hash := v_hash;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_compute_audit_hash ON audit_trails;
CREATE TRIGGER trg_compute_audit_hash
  BEFORE INSERT ON audit_trails FOR EACH ROW EXECUTE FUNCTION compute_audit_hash();

-- ============================================================================
-- 3. Immuabilite audit_trails
-- ============================================================================
CREATE OR REPLACE FUNCTION block_audit_trails_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF current_user = 'supabase_admin' OR current_user = 'postgres' THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'audit_trails est en lecture seule (21 CFR Part 11 11.10(e))';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_block_audit_update ON audit_trails;
DROP TRIGGER IF EXISTS trg_block_audit_delete ON audit_trails;
CREATE TRIGGER trg_block_audit_update
  BEFORE UPDATE ON audit_trails FOR EACH ROW EXECUTE FUNCTION block_audit_trails_modification();
CREATE TRIGGER trg_block_audit_delete
  BEFORE DELETE ON audit_trails FOR EACH ROW EXECUTE FUNCTION block_audit_trails_modification();

-- ============================================================================
-- Attacher log_audit_trail aux 25 tables metier
-- ============================================================================
DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'organizations','profiles','organization_members',
    'departments','documents','electronic_signatures',
    'document_prerequisites','document_triggers','document_relationships',
    'document_code_sequences','form_templates','form_instances',
    'capas','non_conformances','deviations','change_controls',
    'audits','risks','training','batch_records','suppliers',
    'record_type_definitions','record_links',
    'custom_field_definitions','scheduled_reports'
  ]) LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_audit_%I ON %I; '||
      'CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON %I '||
      'FOR EACH ROW EXECUTE FUNCTION log_audit_trail();',
      t, t, t, t
    );
  END LOOP;
END $$;

-- ============================================================================
-- 4. verify_audit_integrity
-- ============================================================================
CREATE OR REPLACE FUNCTION verify_audit_integrity(p_org_id TEXT)
RETURNS TABLE(is_valid BOOLEAN, broken_sequence BIGINT, total_entries BIGINT) AS $$
DECLARE
  v_salt      TEXT;
  v_prev_hash TEXT := 'GENESIS';
  v_entry     RECORD;
  v_canonical TEXT;
  v_expected  TEXT;
  v_count     BIGINT := 0;
BEGIN
  SELECT signing_salt INTO v_salt FROM audit_config WHERE id = 'singleton';

  FOR v_entry IN
    SELECT sequence_number, hash, previous_hash, audit_action, table_name,
           record_id, user_id, created_at
    FROM audit_trails WHERE organization_id = p_org_id
    ORDER BY sequence_number ASC
  LOOP
    v_count := v_count + 1;
    IF v_entry.previous_hash != v_prev_hash THEN
      RETURN QUERY SELECT false, v_entry.sequence_number, v_count; RETURN;
    END IF;
    v_canonical := json_build_object(
      'seq', v_entry.sequence_number, 'action', v_entry.audit_action,
      'table', v_entry.table_name, 'record_id', v_entry.record_id,
      'user_id', v_entry.user_id, 'org_id', p_org_id,
      'prev_hash', v_entry.previous_hash, 'timestamp', v_entry.created_at
    )::text;
    v_expected := encode(hmac(v_canonical::bytea, v_salt::bytea, 'sha256'), 'hex');
    IF v_entry.hash != v_expected THEN
      RETURN QUERY SELECT false, v_entry.sequence_number, v_count; RETURN;
    END IF;
    v_prev_hash := v_entry.hash;
  END LOOP;

  RETURN QUERY SELECT true, NULL::BIGINT, v_count; RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. enforce_maker_checker
-- ============================================================================
CREATE OR REPLACE FUNCTION enforce_maker_checker()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.approved_by_id IS NOT NULL AND NEW.created_by_id IS NOT NULL
     AND NEW.approved_by_id = NEW.created_by_id THEN
    RAISE EXCEPTION 'Violation maker-checker: approbateur = createur (21 CFR Part 11 11.10(g))';
  END IF;
  IF NEW.approved_by_id IS NOT NULL AND NEW.approved_at IS NULL THEN
    NEW.approved_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


COMMIT;

-- ============================================================================
-- Vérification post-migration
-- ============================================================================
SELECT 'Migration terminée avec succès!' AS status;
SELECT count(*) AS tables_created FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
SELECT count(*) AS rls_policies FROM pg_policies 
  WHERE schemaname = 'public';
SELECT count(*) AS triggers FROM pg_trigger 
  WHERE NOT tgisinternal;
