// =============================================================================
// BaseVitale – Seed pour faire « rougir » le panneau Intelligence (alertes)
// =============================================================================
// À exécuter dans Neo4j Browser (http://localhost:7474) ou via cypher-shell.
// Crée un patient avec allergie Amoxicilline. Ensuite : process-dictation
// (texte prescrivant Amoxicilline) + validate → GET intelligence → alertes.
// =============================================================================

// 1. Patient + allergie (match direct : médicament = allergie)
MERGE (p:Patient {id: "patient_alert_demo"})
MERGE (a:Condition {code: "Z88.0", name: "Amoxicilline"})
MERGE (p)-[:HAS_CONDITION {since: date()}]->(a);

// 2. (Optionnel) Classe Pénicilline pour via-class — même logique que patient-jean-dupont
MERGE (m:Medication {name: "Amoxicilline"})
MERGE (cls:Condition {name: "Pénicilline"})
MERGE (m)-[:BELONGS_TO_CLASS]->(cls);
