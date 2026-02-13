import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import type { Consultation } from '@basevitale/shared';
import { Neo4jService } from '../neo4j/neo4j.service';
import { DrugService } from '../medical/drug.service';

/**
 * Module C+ Gardien – Boucle de feedback (Wow Effect)
 *
 * Utilise le graphe Neo4j (allergies du patient) pour bloquer ou alerter
 * lorsqu'une médication proposée est contre-indiquée (ex. Amoxicilline + allergie Pénicilline).
 */

/** Médicament → allergènes (famille). Normalisation lowercase. */
const DRUG_TO_ALLERGENS: Record<string, string[]> = {
  amoxicilline: ['pénicilline', 'penicillin'],
  amoxicillin: ['pénicilline', 'penicillin'],
  ampicilline: ['pénicilline', 'penicillin'],
  ampicillin: ['pénicilline', 'penicillin'],
  penicillin: ['pénicilline', 'penicillin'],
  pénicilline: ['pénicilline', 'penicillin'],
  augmentin: ['pénicilline', 'penicillin', 'amoxicilline'],
  coamoxiclav: ['pénicilline', 'penicillin', 'amoxicilline'],
};

/** Allergies des scénarios démo (fallback si Neo4j non seedé). Jean = Pénicilline + AMOXICILLINE pour match direct molécule (showstopper sécurité). */
const SCENARIO_ALLERGIES: Record<string, string[]> = {
  'scenario-jean-peuplu': ['pénicilline', 'amoxicilline'],
  'demo-patient-paracetamol': ['paracétamol'],
  'demo-patient-clavulanique': ['acide clavulanique'],
};

export interface MedicationInput {
  name?: string;
  dosage?: string;
  duration?: string;
  /** Noms des molécules (ex. AMOXICILLINE TRIHYDRATÉE) pour bloquer par famille même si le libellé ne contient pas le principe actif. */
  molecules?: string[];
}

export interface GuardianConflict {
  medication: string;
  allergy: string;
  reason: string;
}

export interface GuardianResult {
  safe: boolean;
  conflicts: GuardianConflict[];
}

@Injectable()
export class GuardianService {
  private readonly logger = new Logger(GuardianService.name);

  constructor(
    private readonly neo4j: Neo4jService,
    private readonly drugService: DrugService,
  ) {}

  /**
   * Récupère les allergies connues du patient.
   * - HAS_ALLERGY → Allergy.name (extraction diagnostics "Allergie à X")
   * - HAS_CONDITION → Condition.name lorsque type allergie (vérité terrain, ex. "Allergie Pénicilline")
   */
  async getPatientAllergies(patientId: string): Promise<string[]> {
    if (!patientId?.trim()) return [];

    const names: string[] = [];

    try {
      const allergyQuery = `
        MATCH (p:Patient {id: $patientId})-[:HAS_ALLERGY]->(a:Allergy)
        RETURN DISTINCT a.name AS name
      `;
      const allergyResult = await this.neo4j.executeQuery(allergyQuery, { patientId });
      for (const record of allergyResult.records) {
        const raw = record.get('name');
        const name = typeof raw === 'string' ? raw : raw != null ? String(raw) : '';
        if (name.trim()) names.push(name.toLowerCase().trim());
      }

      const conditionQuery = `
        MATCH (p:Patient {id: $patientId})-[:HAS_CONDITION]->(c:Condition)
        WHERE c.name IS NOT NULL AND toLower(toString(c.name)) CONTAINS 'allergie'
        RETURN DISTINCT c.name AS name
      `;
      const conditionResult = await this.neo4j.executeQuery(conditionQuery, { patientId });
      for (const record of conditionResult.records) {
        const raw = record.get('name');
        const str = typeof raw === 'string' ? raw : raw != null ? String(raw) : '';
        const extracted = this.extractAllergenFromCondition(str);
        if (extracted) names.push(extracted);
      }

      const unique = [...new Set(names)];
      if (unique.length > 0) return unique;

      // Fallback : scénarios démo sans seed Neo4j (ex. Jean Peuplu → pénicilline)
      const scenarioAllergies = SCENARIO_ALLERGIES[patientId.trim()];
      if (scenarioAllergies?.length) return scenarioAllergies.map((a) => a.toLowerCase());
      return [];
    } catch (err) {
      this.logger.warn(
        '[Gardien] Neo4j indisponible, impossible de charger les allergies',
        err instanceof Error ? err.message : String(err),
      );
      const scenarioAllergies = SCENARIO_ALLERGIES[patientId?.trim() ?? ''];
      if (scenarioAllergies?.length) return scenarioAllergies.map((a) => a.toLowerCase());
      return [];
    }
  }

  /**
   * Extrait la substance allergène depuis un libellé Condition (ex. "Allergie Pénicilline" → "pénicilline").
   */
  private extractAllergenFromCondition(label: string): string | null {
    const trimmed = label.trim();
    if (!trimmed) return null;
    const m = trimmed.match(/allergie\s+(?:à\s+(?:la\s+)?|a\s+(?:la\s+)?)?(.+)/i);
    const substance = (m ? m[1] : trimmed).trim();
    return substance ? substance.toLowerCase() : null;
  }

  /**
   * Intercepteur Ghost Protocol : lance ForbiddenException si au moins un médicament
   * est contre-indiqué pour le patient. À utiliser avant toute persistance (ex. POST /prescriptions).
   */
  async assertSafeForPatient(patientId: string, medications: MedicationInput[]): Promise<void> {
    const result = await this.checkMedicationsAgainstAllergies(patientId, medications);
    if (!result.safe && result.conflicts.length > 0) {
      const msg = result.conflicts[0].reason ?? 'Médication contre-indiquée pour ce patient.';
      throw new ForbiddenException(msg);
    }
  }

  /**
   * Vérifie les médicaments proposés contre les allergies du patient.
   * Retourne { safe: false, conflicts } si au moins un conflit.
   * SYNAPSE v201 : graphe Drug -[:CONTIENT]-> Molecule ; si molécule allergène → BLOCAGE.
   */
  async checkMedicationsAgainstAllergies(
    patientId: string,
    medications: MedicationInput[],
  ): Promise<GuardianResult> {
    const allergies = await this.getPatientAllergies(patientId);
    if (allergies.length === 0) {
      return { safe: true, conflicts: [] };
    }

    const graphConflicts: GuardianConflict[] = [];
    const allergyCodes = await this.resolveAllergyNamesToMoleculeCodes(allergies);

    if (allergyCodes.size > 0) {
      const cisIds: string[] = [];
      const nameByCis = new Map<string, string>();
      for (const med of medications ?? []) {
        const name = (med.name ?? '').trim();
        if (!name) continue;
        const hits = await this.drugService.searchDrugs(name, 1);
        const cisId = hits[0]?.id;
        if (cisId) {
          cisIds.push(cisId);
          nameByCis.set(cisId, name);
        }
      }
      if (cisIds.length > 0) {
        const codes = [...allergyCodes];
        try {
          const result = await this.neo4j.executeQuery(
            `MATCH (d:Drug)-[r:CONTIENT]->(m:Molecule)
             WHERE d.cisId IN $cisIds AND m.code IN $codes
             RETURN d.cisId AS cisId, d.name AS drugName, m.name AS moleculeName`,
            { cisIds, codes }
          );
          const seen = new Set<string>();
          for (const record of result.records) {
            const cisId = String(record.get('cisId') ?? '');
            const drugName = String(record.get('drugName') ?? nameByCis.get(cisId) ?? cisId);
            const moleculeName = String(record.get('moleculeName') ?? '');
            const key = `${cisId}|${moleculeName}`;
            if (seen.has(key)) continue;
            seen.add(key);
            graphConflicts.push({
              medication: drugName,
              allergy: moleculeName,
              reason: `INTERDICTION : ${drugName} contient ${moleculeName} (allergie connue).`,
            });
          }
        } catch (err) {
          this.logger.warn(
            '[Gardien] Graphe Drug/Molecule indisponible',
            err instanceof Error ? err.message : String(err),
          );
        }
      }
    }

    // Toujours exécuter le fallback (familles : pénicilline → amoxicilline, etc.) et fusionner les conflits
    const fallback = await this.checkMedicationsAgainstAllergiesFallback(medications, allergies);
    const seenKey = new Set<string>();
    const merged: GuardianConflict[] = [...graphConflicts];
    for (const c of fallback.conflicts) {
      const key = `${c.medication.toLowerCase()}|${c.allergy.toLowerCase()}`;
      if (seenKey.has(key)) continue;
      seenKey.add(key);
      merged.push(c);
    }
    return { safe: merged.length === 0, conflicts: merged };
  }

  /**
   * Synonymes pour résoudre les noms d'allergie vers les molécules BDPM (libellés variables ANSM).
   * Ex. "acide clavulanique" → aussi "clavulanate", "clavulanique" (CLAVULANATE DE POTASSIUM, etc.).
   */
  private getAllergySearchTerms(name: string): string[] {
    const n = (name || '').trim().toLowerCase();
    if (!n) return [];
    const terms = [n];
    if (n.includes('acide clavulanique') || n === 'acide clavulanique') {
      terms.push('clavulanique', 'clavulanate');
    }
    if (n.includes('paracétamol') || n === 'paracétamol') {
      terms.push('paracetamol');
    }
    return [...new Set(terms)];
  }

  private async resolveAllergyNamesToMoleculeCodes(allergyNames: string[]): Promise<Set<string>> {
    const codes = new Set<string>();
    for (const name of allergyNames) {
      const terms = this.getAllergySearchTerms(name);
      for (const term of terms) {
        if (!term) continue;
        try {
          const q = `
            MATCH (m:Molecule)
            WHERE toLower(m.name) CONTAINS toLower($term)
            RETURN m.code AS code
          `;
          const result = await this.neo4j.executeQuery(q, { term });
          for (const record of result.records) {
            const code = record.get('code');
            if (code != null) codes.add(String(code));
          }
        } catch {
          // ignore
        }
      }
    }
    return codes;
  }

  private async checkMedicationsAgainstAllergiesFallback(
    medications: MedicationInput[],
    allergies: string[],
  ): Promise<GuardianResult> {
    const conflicts: GuardianConflict[] = [];
    const seen = new Set<string>();
    for (const med of medications ?? []) {
      const name = (med.name ?? '').trim();
      if (!name) continue;

      const normalized = name.toLowerCase();
      const namesToCheck = [normalized];
      for (const m of med.molecules ?? []) {
        const n = (m ?? '').trim().toLowerCase();
        if (n) namesToCheck.push(n);
      }

      for (const toCheck of namesToCheck) {
        // Correspondance directe (MVP) : médicament = allergie ou l’un contient l’autre
      for (const a of allergies) {
          const match =
            a === toCheck || a.includes(toCheck) || toCheck.includes(a);
          if (!match) continue;
          const key = `${name.toLowerCase()}|${a}`;
          if (seen.has(key)) continue;
          seen.add(key);
          conflicts.push({
            medication: name,
            allergy: a,
            reason: `Médication contre-indiquée : ${name} (allergie connue : ${a})`,
          });
        }

        if (this.isPenicillinFamilyMatch(allergies, toCheck)) {
          const keyPen = `${name.toLowerCase()}|pénicilline`;
          if (!seen.has(keyPen)) {
            seen.add(keyPen);
            conflicts.push({
              medication: name,
              allergy: 'pénicilline',
              reason: `Allergie croisée détectée (famille Pénicilline) : ${name} contient une molécule de cette famille.`,
            });
          }
        }

        const drugAllergens = this.getAllergensForDrug(toCheck);
        for (const allergen of drugAllergens) {
          const matches = allergies.some(
            (a) => a === allergen || a.includes(allergen) || allergen.includes(a),
          );
          if (!matches) continue;
          const key = `${name.toLowerCase()}|${allergen}`;
          if (seen.has(key)) continue;
          seen.add(key);
          conflicts.push({
            medication: name,
            allergy: allergen,
            reason: `Médication contre-indiquée : ${name} (allergie connue : ${allergen})`,
          });
        }
      }
    }

    return {
      safe: conflicts.length === 0,
      conflicts,
    };
  }

  /**
   * Force Match (Showstopper) : lien ontologique Pénicilline → Amoxicilline.
   * Si le patient a une allergie à la Pénicilline et que le nom/molécule contient AMOX(ICILLINE) → conflit.
   */
  private isPenicillinFamilyMatch(allergies: string[], nameOrMoleculeNormalized: string): boolean {
    const hasPenicillin = allergies.some(
      (a) => a === 'pénicilline' || a === 'penicillin' || (a && a.toLowerCase().includes('pénicilline')),
    );
    const upper = nameOrMoleculeNormalized.toUpperCase();
    return !!hasPenicillin && (upper.includes('AMOX') || upper.includes('AMOXICILLINE'));
  }

  /**
   * Retourne les allergènes potentiels pour un médicament (normalisé).
   */
  private getAllergensForDrug(normalized: string): string[] {
    const out = new Set<string>();

    if (DRUG_TO_ALLERGENS[normalized]) {
      DRUG_TO_ALLERGENS[normalized].forEach((a) => out.add(a));
    }

    for (const [drug, allergens] of Object.entries(DRUG_TO_ALLERGENS)) {
      if (normalized.includes(drug) || drug.includes(normalized)) {
        allergens.forEach((a) => out.add(a));
      }
    }

    return [...out];
  }

  /**
   * Gardien Causal (MVP) – Alertes non bloquantes.
   * Interroge Neo4j (:Condition) du patient, compare aux médicaments du draft.
   * Si "Pénicilline" dans les conditions et "Amoxicilline" ou "Pénicilline" dans le draft → ALERTE.
   * Les alertes sont injectées dans le draft avant sauvegarde.
   */
  async checkSafety(patientId: string, draft: Consultation): Promise<{ alerts: string[] }> {
    const alerts: string[] = [];

    try {
      const query = `
        MATCH (p:Patient {id: $patientId})-[:HAS_CONDITION]->(c:Condition)
        WHERE c.name IS NOT NULL
        RETURN DISTINCT c.name AS name
      `;
      const result = await this.neo4j.executeQuery(query, { patientId });
      const conditions: string[] = [];
      for (const record of result.records) {
        const raw = record.get('name');
        const str = typeof raw === 'string' ? raw : raw != null ? String(raw) : '';
        if (str.trim()) conditions.push(str.toLowerCase().trim());
      }

      const allergicToPenicillin = conditions.some(
        (c) => c.includes('pénicilline') || c.includes('penicilline'),
      );
      if (!allergicToPenicillin) return { alerts };

      const meds = draft.medications ?? [];
      for (const m of meds) {
        const name = (m?.name ?? '').trim();
        if (!name) continue;
        const n = name.toLowerCase();
        const isPenicillinType =
          n.includes('amoxicilline') || n.includes('amoxicillin') ||
          n.includes('pénicilline') || n.includes('penicilline') ||
          n.includes('ampicilline') || n.includes('ampicillin');
        if (isPenicillinType) {
          alerts.push(
            `Contre-indication : ${name} (allergie Pénicilline connue). Vérifier avant prescription.`,
          );
        }
      }
    } catch (err) {
      this.logger.warn(
        '[Gardien] checkSafety: Neo4j indisponible, pas d’alertes Condition',
        err instanceof Error ? err.message : String(err),
      );
    }

    return { alerts };
  }
}
