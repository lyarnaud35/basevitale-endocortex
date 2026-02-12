/**
 * Types pour le moteur de règles déclaratif (NGAP/CCAM).
 * La loi est dans le JSON ; le code ne fait qu'interpréter.
 */

export type ConditionOperator =
  | 'equal'
  | 'notEqual'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'greaterThan'
  | 'greaterThanOrEqual';

export interface RuleCondition {
  fact: string; // chemin dans le contexte, ex: "patient.age", "patient.coverage"
  operator: ConditionOperator;
  value: number | string | boolean;
}

export interface LineRuleDef {
  id: string;
  type: 'line';
  trigger: string; // code acte (ex: "C")
  price: number;
  part_secu: number; // 0–1
  conditions: RuleCondition[];
  label: string;
  ruleId?: string; // ex: "MEG" pour affichage
}

export interface ModifierRuleDef {
  id: string;
  type: 'modifier';
  conditions: RuleCondition[];
  effect: 'patient_pays_zero';
}

export type RuleDef = LineRuleDef | ModifierRuleDef;

export interface BillingContext {
  acts: string[];
  patient?: {
    age?: number;
    coverage?: number; // 0–1 (1 = 100 % CMU/C2S)
  };
}

export interface BreakdownLine {
  label: string;
  amount: number;
  ruleId?: string;
}

export interface RuleEngineResult {
  total: number;
  amo: number;
  amc: number;
  amount_patient: number; // part à la charge du patient (0 si CMU)
  breakdown: BreakdownLine[];
  modifier_applied: boolean; // true si tiers payant (patient_pays_zero)
}
