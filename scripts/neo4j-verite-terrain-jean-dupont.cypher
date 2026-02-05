// =============================================================================
// BASEVITALE – Vérité terrain + Graphe des classes médicamenteuses
// =============================================================================
// À exécuter dans Neo4j Browser (http://localhost:7474).
// Démo Gardien C+ : Jean Dupont, allergie Pénicilline ; Amoxicilline → alerte
// via classe (pas de string "Amoxicilline" en dur dans le code).
// =============================================================================

// --- 1. Patient + allergie (HAS_CONDITION) ---
MERGE (p:Patient {id: "patient-jean-dupont", name: "Jean Dupont"})
MERGE (c:Condition {name: "Allergie Pénicilline", severity: "CRITICAL"})
MERGE (p)-[:HAS_CONDITION {since: date('2020-01-01')}]->(c);

// --- 2. Médicament Amoxicilline + classe Pénicilline (BELONGS_TO_CLASS) ---
MERGE (med:Medication {name: "Amoxicilline"})
MERGE (classe:Condition {name: "Pénicilline"})
MERGE (med)-[:BELONGS_TO_CLASS]->(classe);

// --- 3. (Optionnel) Autres pénicillines pour démo "nouveau médicament sans toucher le code" ---
MERGE (a2:Medication {name: "Ampicilline"})
MERGE (classe2:Condition {name: "Pénicilline"})
MERGE (a2)-[:BELONGS_TO_CLASS]->(classe2);

// =============================================================================
// TEST – Requête Cypher transitive (même logique que ScribeGuardianService)
// =============================================================================
// Copier-coller dans Neo4j Browser avec patientId / drugName ci‑dessous.
// Résultat attendu : 1 ligne, allergyName = "Allergie Pénicilline", viaClass = true.
// =============================================================================

// Paramètres (à adapter si besoin) :
// :param patientId => "patient-jean-dupont"
// :param drugName => "Amoxicilline"

MATCH (p:Patient {id: "patient-jean-dupont"})-[:HAS_CONDITION]->(allergie:Condition)
WHERE allergie.name IS NOT NULL
OPTIONAL MATCH (med:Medication {name: "Amoxicilline"})-[:BELONGS_TO_CLASS]->(classe)
WITH allergie, classe,
  (allergie.name = "Amoxicilline") AS directMatch,
  (classe IS NOT NULL AND (allergie.name = classe.name OR allergie.name CONTAINS classe.name)) AS viaClassMatch
WHERE directMatch OR viaClassMatch
RETURN allergie.name AS allergyName, viaClassMatch AS viaClass;
