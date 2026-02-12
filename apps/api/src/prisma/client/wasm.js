
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.PatientScalarFieldEnum = {
  id: 'id',
  insToken: 'insToken',
  insHash: 'insHash',
  firstName: 'firstName',
  lastName: 'lastName',
  birthDate: 'birthDate',
  birthPlace: 'birthPlace',
  email: 'email',
  phone: 'phone',
  addressLine1: 'addressLine1',
  addressLine2: 'addressLine2',
  city: 'city',
  postalCode: 'postalCode',
  country: 'country',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  createdBy: 'createdBy'
};

exports.Prisma.SemanticNodeScalarFieldEnum = {
  id: 'id',
  nodeType: 'nodeType',
  snomedCtCode: 'snomedCtCode',
  cim10Code: 'cim10Code',
  cim11Code: 'cim11Code',
  label: 'label',
  description: 'description',
  embedding: 'embedding',
  value: 'value',
  unit: 'unit',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  confidence: 'confidence',
  patientId: 'patientId',
  consultationId: 'consultationId'
};

exports.Prisma.SemanticRelationScalarFieldEnum = {
  id: 'id',
  sourceNodeId: 'sourceNodeId',
  targetNodeId: 'targetNodeId',
  relationType: 'relationType',
  strength: 'strength',
  evidence: 'evidence',
  createdAt: 'createdAt',
  confidence: 'confidence'
};

exports.Prisma.ConsultationDraftScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  structuredData: 'structuredData'
};

exports.Prisma.ConsultationScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  consultationDate: 'consultationDate',
  startTime: 'startTime',
  endTime: 'endTime',
  status: 'status',
  rawTranscript: 'rawTranscript',
  rawText: 'rawText',
  draftData: 'draftData',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  validatedAt: 'validatedAt',
  createdBy: 'createdBy'
};

exports.Prisma.BillingRulesScalarFieldEnum = {
  id: 'id',
  version: 'version',
  payload: 'payload',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.InvoiceScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  totalAmount: 'totalAmount',
  breakdown: 'breakdown',
  acts: 'acts',
  status: 'status',
  rulesVersion: 'rulesVersion',
  fseToken: 'fseToken',
  fseGeneratedAt: 'fseGeneratedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BillingEventScalarFieldEnum = {
  id: 'id',
  consultationId: 'consultationId',
  ghmCode: 'ghmCode',
  actCode: 'actCode',
  actType: 'actType',
  status: 'status',
  evidenceNodeIds: 'evidenceNodeIds',
  createdAt: 'createdAt',
  transmittedAt: 'transmittedAt'
};

exports.Prisma.AllergyScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  substance: 'substance',
  snomedCtCode: 'snomedCtCode',
  severity: 'severity',
  createdAt: 'createdAt',
  source: 'source'
};

exports.Prisma.MedicalDocumentScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  documentType: 'documentType',
  title: 'title',
  content: 'content',
  rawContent: 'rawContent',
  documentDate: 'documentDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  createdBy: 'createdBy',
  consultationId: 'consultationId'
};

exports.Prisma.DocumentAttachmentScalarFieldEnum = {
  id: 'id',
  documentId: 'documentId',
  fileName: 'fileName',
  filePath: 'filePath',
  mimeType: 'mimeType',
  fileSize: 'fileSize',
  uploadedAt: 'uploadedAt',
  uploadedBy: 'uploadedBy'
};

exports.Prisma.PrescriptionScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  medicationName: 'medicationName',
  atcCode: 'atcCode',
  dosage: 'dosage',
  frequency: 'frequency',
  duration: 'duration',
  status: 'status',
  safetyChecks: 'safetyChecks',
  outpassReason: 'outpassReason',
  documentId: 'documentId',
  createdAt: 'createdAt',
  prescribedBy: 'prescribedBy'
};

exports.Prisma.MedicalReportScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  reportType: 'reportType',
  title: 'title',
  chiefComplaint: 'chiefComplaint',
  history: 'history',
  examination: 'examination',
  assessment: 'assessment',
  plan: 'plan',
  documentId: 'documentId',
  consultationId: 'consultationId',
  reportDate: 'reportDate',
  createdAt: 'createdAt',
  createdBy: 'createdBy'
};

exports.Prisma.LaboratoryResultScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  testName: 'testName',
  testCode: 'testCode',
  resultValue: 'resultValue',
  unit: 'unit',
  referenceRange: 'referenceRange',
  status: 'status',
  testDate: 'testDate',
  receivedAt: 'receivedAt',
  laboratoryName: 'laboratoryName',
  documentId: 'documentId'
};

exports.Prisma.MedicalImageScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  studyInstanceUid: 'studyInstanceUid',
  seriesInstanceUid: 'seriesInstanceUid',
  sopInstanceUid: 'sopInstanceUid',
  modality: 'modality',
  bodyPart: 'bodyPart',
  studyDescription: 'studyDescription',
  seriesDescription: 'seriesDescription',
  filePath: 'filePath',
  fileSize: 'fileSize',
  documentId: 'documentId',
  acquisitionDate: 'acquisitionDate',
  createdAt: 'createdAt'
};

exports.Prisma.FeedbackEventScalarFieldEnum = {
  id: 'id',
  entityType: 'entityType',
  entityId: 'entityId',
  originalValue: 'originalValue',
  correctedValue: 'correctedValue',
  correctionReason: 'correctionReason',
  createdAt: 'createdAt',
  correctedBy: 'correctedBy'
};

exports.Prisma.AppointmentScalarFieldEnum = {
  id: 'id',
  patientId: 'patientId',
  doctorId: 'doctorId',
  doctorName: 'doctorName',
  appointmentDate: 'appointmentDate',
  startTime: 'startTime',
  endTime: 'endTime',
  duration: 'duration',
  appointmentType: 'appointmentType',
  title: 'title',
  description: 'description',
  status: 'status',
  location: 'location',
  consultationId: 'consultationId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  createdBy: 'createdBy',
  cancelledAt: 'cancelledAt',
  cancelledBy: 'cancelledBy',
  cancellationReason: 'cancellationReason'
};

exports.Prisma.AppointmentReminderScalarFieldEnum = {
  id: 'id',
  appointmentId: 'appointmentId',
  reminderType: 'reminderType',
  reminderTime: 'reminderTime',
  status: 'status',
  sentAt: 'sentAt',
  createdAt: 'createdAt'
};

exports.Prisma.InternalMessageScalarFieldEnum = {
  id: 'id',
  senderId: 'senderId',
  recipientId: 'recipientId',
  threadId: 'threadId',
  subject: 'subject',
  content: 'content',
  messageType: 'messageType',
  status: 'status',
  createdAt: 'createdAt',
  readAt: 'readAt',
  archivedAt: 'archivedAt'
};

exports.Prisma.MessageThreadScalarFieldEnum = {
  id: 'id',
  name: 'name',
  threadType: 'threadType',
  description: 'description',
  participantIds: 'participantIds',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  lastMessageAt: 'lastMessageAt',
  createdBy: 'createdBy'
};

exports.Prisma.MessageAttachmentScalarFieldEnum = {
  id: 'id',
  messageId: 'messageId',
  fileName: 'fileName',
  filePath: 'filePath',
  mimeType: 'mimeType',
  fileSize: 'fileSize',
  uploadedAt: 'uploadedAt'
};

exports.Prisma.StaffMemberScalarFieldEnum = {
  id: 'id',
  firstName: 'firstName',
  lastName: 'lastName',
  email: 'email',
  phone: 'phone',
  role: 'role',
  speciality: 'speciality',
  qualifications: 'qualifications',
  status: 'status',
  hiredDate: 'hiredDate',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ShiftScalarFieldEnum = {
  id: 'id',
  staffMemberId: 'staffMemberId',
  startDate: 'startDate',
  endDate: 'endDate',
  startTime: 'startTime',
  endTime: 'endTime',
  shiftType: 'shiftType',
  location: 'location',
  status: 'status',
  createdAt: 'createdAt',
  createdBy: 'createdBy'
};

exports.Prisma.LeaveScalarFieldEnum = {
  id: 'id',
  staffMemberId: 'staffMemberId',
  startDate: 'startDate',
  endDate: 'endDate',
  leaveType: 'leaveType',
  reason: 'reason',
  status: 'status',
  createdAt: 'createdAt',
  requestedBy: 'requestedBy',
  approvedBy: 'approvedBy',
  approvedAt: 'approvedAt'
};

exports.Prisma.ScheduleScalarFieldEnum = {
  id: 'id',
  staffMemberId: 'staffMemberId',
  startDate: 'startDate',
  endDate: 'endDate',
  scheduleData: 'scheduleData',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  createdBy: 'createdBy'
};

exports.Prisma.StockItemScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  sku: 'sku',
  category: 'category',
  subCategory: 'subCategory',
  currentQuantity: 'currentQuantity',
  minQuantity: 'minQuantity',
  maxQuantity: 'maxQuantity',
  unit: 'unit',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StockMovementScalarFieldEnum = {
  id: 'id',
  stockItemId: 'stockItemId',
  movementType: 'movementType',
  quantity: 'quantity',
  reference: 'reference',
  referenceType: 'referenceType',
  movementDate: 'movementDate',
  createdAt: 'createdAt',
  createdBy: 'createdBy'
};

exports.Prisma.StockAlertScalarFieldEnum = {
  id: 'id',
  stockItemId: 'stockItemId',
  alertType: 'alertType',
  severity: 'severity',
  message: 'message',
  status: 'status',
  createdAt: 'createdAt',
  acknowledgedAt: 'acknowledgedAt',
  acknowledgedBy: 'acknowledgedBy'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};


exports.Prisma.ModelName = {
  Patient: 'Patient',
  SemanticNode: 'SemanticNode',
  SemanticRelation: 'SemanticRelation',
  ConsultationDraft: 'ConsultationDraft',
  Consultation: 'Consultation',
  BillingRules: 'BillingRules',
  Invoice: 'Invoice',
  BillingEvent: 'BillingEvent',
  Allergy: 'Allergy',
  MedicalDocument: 'MedicalDocument',
  DocumentAttachment: 'DocumentAttachment',
  Prescription: 'Prescription',
  MedicalReport: 'MedicalReport',
  LaboratoryResult: 'LaboratoryResult',
  MedicalImage: 'MedicalImage',
  FeedbackEvent: 'FeedbackEvent',
  Appointment: 'Appointment',
  AppointmentReminder: 'AppointmentReminder',
  InternalMessage: 'InternalMessage',
  MessageThread: 'MessageThread',
  MessageAttachment: 'MessageAttachment',
  StaffMember: 'StaffMember',
  Shift: 'Shift',
  Leave: 'Leave',
  Schedule: 'Schedule',
  StockItem: 'StockItem',
  StockMovement: 'StockMovement',
  StockAlert: 'StockAlert'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
