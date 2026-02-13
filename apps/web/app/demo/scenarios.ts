/**
 * Scénarios fixtures (sync avec seed:scenarios).
 * IDs utilisés par le backend Neo4j et le ScenarioSelector.
 */
export const SCENARIO_OPTIONS = [
  { id: '', label: 'Aucun patient (saisie manuelle)', description: 'Ne pas appliquer de contexte patient' },
  {
    id: 'scenario-jean-peuplu',
    label: 'Jean Peuplu (M. Allergique)',
    description: 'Allergie Pénicilline → Amoxicilline BLOQUÉ',
  },
  {
    id: 'scenario-marie-enceinte',
    label: 'Marie Enceinte',
    description: 'Condition Grossesse (futur : AINS bloqués)',
  },
  {
    id: 'scenario-paul-normal',
    label: 'Paul Normal (M. Standard)',
    description: 'Aucune contre-indication — test facturation',
  },
  {
    id: 'demo-patient-paracetamol',
    label: 'Démo Paracétamol',
    description: 'Allergie Paracétamol → Doliprane / Efferalgan BLOQUÉ',
  },
  {
    id: 'demo-patient-clavulanique',
    label: 'Démo Augmentin (Acide clavulanique)',
    description: 'Allergie Acide clavulanique → Augmentin BLOQUÉ',
  },
] as const;

export type ScenarioId = (typeof SCENARIO_OPTIONS)[number]['id'];
