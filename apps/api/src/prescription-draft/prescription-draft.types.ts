import type { DraftSafetyReport } from '../knowledge-graph/guardian.service';

export interface DraftDrugItem {
  cisId: string;
  name: string;
  form: string;
  /** Posologie (ex: "1 matin et soir") */
  posology?: string;
}

export interface PrescriptionDraftState {
  patientId: string;
  cisIds: string[];
  drugs: DraftDrugItem[];
  safetyReport: DraftSafetyReport;
  updatedAt: string;
}

export interface AddDrugBody {
  patientId: string;
  cisId: string;
  /** Posologie optionnelle (ex: "1 matin et soir") */
  posology?: string;
}

export interface RemoveDrugBody {
  patientId: string;
  cisId: string;
}

export interface ValidateDraftBody {
  patientId: string;
}

export interface ValidateDraftResponse {
  prescriptionId: string;
}

/** Ligne médicament dans une ordonnance validée (historique) */
export interface PrescriptionHistoryDrugItem {
  cisId: string;
  name: string;
  posologie: string;
}

/** Ordonnance validée (pour timeline / historique) */
export interface PrescriptionHistoryItem {
  id: string;
  date: string;
  status: string;
  drugs: PrescriptionHistoryDrugItem[];
}

export interface PrescriptionHistoryResponse {
  prescriptions: PrescriptionHistoryItem[];
}
