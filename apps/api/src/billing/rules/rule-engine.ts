/**
 * Moteur d'inférence générique – Interpréteur de la Loi (JSON).
 * Aucune logique métier ici : on charge les règles, on évalue les conditions, on applique.
 */

import * as path from 'path';
import * as fs from 'fs';
import type {
  RuleDef,
  RuleCondition,
  ConditionOperator,
  BillingContext,
  RuleEngineResult,
  BreakdownLine,
} from './rule-engine.types';

import ngap2024 from './ngap_2024.json';

function getFact(ctx: BillingContext, factPath: string): unknown {
  const parts = factPath.split('.');
  let current: unknown = ctx;
  for (const key of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function evaluateCondition(ctx: BillingContext, cond: RuleCondition): boolean {
  const actual = getFact(ctx, cond.fact);
  const expected = cond.value;
  const op = cond.operator as ConditionOperator;

  switch (op) {
    case 'equal':
      return actual === expected;
    case 'notEqual':
      return actual !== expected;
    case 'lessThan':
      return typeof actual === 'number' && typeof expected === 'number' && actual < expected;
    case 'lessThanOrEqual':
      return typeof actual === 'number' && typeof expected === 'number' && actual <= expected;
    case 'greaterThan':
      return typeof actual === 'number' && typeof expected === 'number' && actual > expected;
    case 'greaterThanOrEqual':
      return typeof actual === 'number' && typeof expected === 'number' && actual >= expected;
    default:
      return false;
  }
}

function allConditionsMatch(ctx: BillingContext, conditions: RuleCondition[]): boolean {
  return conditions.every((c) => evaluateCondition(ctx, c));
}

/**
 * Charge les règles depuis un fichier JSON (déclaratif).
 */
export function loadRulesFromFile(filePath: string): RuleDef[] {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(__dirname, filePath);
  const raw = fs.readFileSync(absolutePath, 'utf-8');
  const data = JSON.parse(raw);
  return Array.isArray(data) ? data : [data];
}

/**
 * Charge les règles NGAP 2024 (déclaratif, importé au build).
 * Pour tests ou multi-version, runEngine(ctx, loadRulesFromFile(...)) reste possible.
 */
export function getNgap2024Rules(): RuleDef[] {
  return ngap2024 as RuleDef[];
}

/**
 * Exécute le moteur : contexte + actes → total, breakdown, amount_patient.
 */
export function runEngine(
  ctx: BillingContext,
  rules: RuleDef[] = getNgap2024Rules(),
): RuleEngineResult {
  let total = 0;
  let amo = 0;
  let amc = 0;
  const breakdown: BreakdownLine[] = [];
  let modifierPatientPaysZero = false;

  for (const rule of rules) {
    if (rule.type === 'line') {
      if (!ctx.acts.includes(rule.trigger)) continue;
      if (!allConditionsMatch(ctx, rule.conditions)) continue;
      total += rule.price;
      amo += rule.price * rule.part_secu;
      amc += rule.price * (1 - rule.part_secu);
      breakdown.push({
        label: rule.label,
        amount: rule.price,
        ruleId: rule.ruleId,
      });
    } else if (rule.type === 'modifier') {
      if (!allConditionsMatch(ctx, rule.conditions)) continue;
      if (rule.effect === 'patient_pays_zero') modifierPatientPaysZero = true;
    }
  }

  let amount_patient = Math.round((total - amo) * 100) / 100;
  if (modifierPatientPaysZero) amount_patient = 0;

  return {
    total: Math.round(total * 100) / 100,
    amo: Math.round(amo * 100) / 100,
    amc: Math.round(amc * 100) / 100,
    amount_patient,
    breakdown,
    modifier_applied: modifierPatientPaysZero,
  };
}
