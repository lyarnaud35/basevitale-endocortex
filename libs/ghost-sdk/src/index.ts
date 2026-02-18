/**
 * GHOST PROTOCOL v999 - Ghost SDK
 *
 * SDK Frontend pour interagir avec les machines Ghost.
 *
 * Exports principaux :
 * - useGhostMachine, useConsultationScanner : Scribe & machines
 * - usePrescriptionSession, usePatientPrescriptionHistory : Ordonnance
 * - useFiscalPrediction, useBillingSimulation, useFiscalPredictionFromContext : Facturation (simulation)
 * - useValidateInvoice, useDailyActivity : Validation facture + CA Journée
 * - useInvoiceLifecycle : Cycle de vie facture (FSM)
 * - Types : FiscalPredictionResult, ValidateInvoiceResult, DailyActivityResponse, etc.
 */

export { useGhostMachine } from './useGhostMachine';
export { useConsultationScanner } from './useConsultationScanner';
export {
  usePrescriptionSession,
  getPrescriptionDraftQueryKey,
} from './usePrescriptionSession';
export {
  usePatientPrescriptionHistory,
  getPrescriptionHistoryQueryKey,
} from './usePatientPrescriptionHistory';
export type {
  PrescriptionDraftSession,
  DraftDrugItem,
  DraftSafetyReport,
  ValidatePrescriptionResponse,
} from './usePrescriptionSession';
export type {
  PrescriptionHistoryItem,
  PrescriptionHistoryDrugItem,
  PrescriptionHistoryResponse,
} from './usePatientPrescriptionHistory';
export type {
  SecurityStatus,
  UseConsultationScannerOptions,
  UseConsultationScannerResult,
} from './useConsultationScanner';
export type {
  GhostMachineState,
  GhostEvent,
  UseGhostMachineOptions,
} from './types';

export {
  setBaseUrl,
  getBaseUrl,
  getPatientDashboardState,
  getGetPatientDashboardStateQueryKey,
  useGetPatientDashboardState,
} from './lib/generated/base-vitale';
export {
  searchDrugs,
  useDrugSearch,
  useDrugSearchByQuery,
  getDrugSearchQueryKey,
  formatDrugPrice,
  formatDrugRefundRate,
} from './lib/drugSearch';
export type { DrugSearchHit, DrugResult } from './lib/drugSearch';
export type { DrugSearchResult } from '@basevitale/shared';
export {
  getPosologyTemplate,
  getPosologyTemplateQueryKey,
  usePosologyTemplate,
} from './lib/posology';
export type { PosologyTemplate } from './lib/posology';
export {
  simulateBilling,
  fetchBillingQuote,
  useBillingQuote,
  getBillingQuoteQueryKey,
  useFiscalPrediction,
  useBillingSimulation,
  getFiscalPredictionQueryKey,
  fetchFiscalPredictionFromContext,
  getFiscalPredictionFromContextQueryKey,
  useFiscalPredictionFromContext,
  addPatientProcedure,
  removePatientProcedure,
  validateInvoice,
  useValidateInvoice,
  fetchDailyActivity,
  getDailyActivityQueryKey,
  useDailyActivity,
  fetchInvoiceLifecycle,
  transitionInvoiceStatus,
  getInvoiceLifecycleQueryKey,
  useInvoiceLifecycle,
} from './lib/billing';
export type {
  BillingQuote,
  QuoteLine,
  BillingQuoteInput,
  ValidateInvoiceInput,
  FiscalPredictionResult,
  FiscalPredictionFromContextResult,
  FiscalPredictionContextOverrides,
  ValidateInvoiceResult,
  DailyActivityItem,
  DailyActivityResponse,
  InvoiceLifecycleResponse,
  InvoiceIntegrityCheck,
  InvoiceAction,
  BreakdownLine,
} from './lib/billing';
export type { PatientDashboardStateApiResponse } from './lib/generated/model/patientDashboard';
export type { AnalyzeFullContextResponse, AnalyzeFullContextBody } from './lib/generated/model/orchestratorAnalyze';
export { analyzeFullContext } from './lib/generated/base-vitale';
