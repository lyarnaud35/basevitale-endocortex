/**
 * Types pour l'ingestion BDPM → Neo4j.
 * Alignés sur docs/ONTOLOGIE_BDPM_NEO4J.md.
 */

export interface BdpmMedicamentRow {
  cis: string;
  denomination: string;
  formePharmaceutique: string;
  statutAutorisation: string;
}

export interface BdpmCompoRow {
  cis: string;
  codeSubstance: string;
  designationSubstance: string;
  dosage: string;
  referenceDosage: string;
  natureComposant: string;
}

export interface BdpmIngestStats {
  medicamentsCreated: number;
  moleculesCreated: number;
  relationsCreated: number;
  errors: string[];
  durationMs: number;
}
