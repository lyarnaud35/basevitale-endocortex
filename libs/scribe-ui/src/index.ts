/**
 * @basevitale/scribe-ui – Widget Medical Scribe (Symbiote Protocol).
 * Aucune dépendance Next.js. Utiliser <MedicalScribe /> dans le Host.
 *
 * Architecture headless : useScribeLogic (logique) + MedicalScribeUI (UI).
 */

export { MedicalScribe, type MedicalScribeProps } from './components/MedicalScribe';
export { MedicalScribeUI, type MedicalScribeUIProps, type ScribeTheme } from './components/MedicalScribeUI';
export {
  useScribeLogic,
  type UseScribeLogicOptions,
  type UseScribeLogicReturn,
  type ScribePhase,
  type PrescriptionRow,
  type BillingRow,
} from './hooks/useScribeLogic';
export { cn, scribeId, BV_SCRIBE_ID_PREFIX } from './utils/cn';
export type { ConsultationAnalysis, ConsultationData } from './types/consultation-result';
