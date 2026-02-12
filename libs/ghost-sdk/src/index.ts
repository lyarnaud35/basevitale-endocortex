/**
 * GHOST PROTOCOL v999 - Ghost SDK
 *
 * SDK Frontend pour interagir avec les machines Ghost.
 *
 * Exports :
 * - useGhostMachine : Hook React pour se connecter à une machine via SSE
 * - useGetPatientDashboardState : Hook React Query pour le dashboard agrégé (Oracle + Security + Coding)
 * - Types : Types TypeScript pour les états et événements
 */

export { useGhostMachine } from './useGhostMachine';
export { useConsultationScanner } from './useConsultationScanner';
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
  getDrugSearchQueryKey,
} from './lib/drugSearch';
export type { DrugSearchHit } from './lib/drugSearch';
export {
  simulateBilling,
  useFiscalPrediction,
  getFiscalPredictionQueryKey,
  fetchInvoiceLifecycle,
  transitionInvoiceStatus,
  getInvoiceLifecycleQueryKey,
  useInvoiceLifecycle,
} from './lib/billing';
export type {
  FiscalPredictionResult,
  InvoiceLifecycleResponse,
  InvoiceIntegrityCheck,
  InvoiceAction,
  BreakdownLine,
} from './lib/billing';
export type { PatientDashboardStateApiResponse } from './lib/generated/model/patientDashboard';
export type { AnalyzeFullContextResponse, AnalyzeFullContextBody } from './lib/generated/model/orchestratorAnalyze';
export { analyzeFullContext } from './lib/generated/base-vitale';
