// =============================================================================
// SEED DÉMO – BaseVitale / Endocortex (Neo4j vierge)
// =============================================================================
// Usage : Neo4j Browser (http://localhost:7474) → Coller ce script et exécuter.
// Après docker-compose down -v, la base est vide : ce seed recrée les scénarios
// pour /demo/scribe, /demo/drugs (sécurité), /demo/billing.
// =============================================================================

// ----- 1. Jean Peuplu (M. Allergique) – Sécurité + Scribe -----
MERGE (p:Patient {id: 'scenario-jean-peuplu'})
SET p.displayName = 'Jean Peuplu', p.firstName = 'Jean', p.lastName = 'Peuplu'
WITH p
MERGE (a1:Allergy {name: 'pénicilline'})
MERGE (p)-[:HAS_ALLERGY]->(a1)
WITH p
MERGE (a2:Allergy {name: 'amoxicilline'})
MERGE (p)-[:HAS_ALLERGY]->(a2)
WITH p
MERGE (c:Condition {name: 'Hypertension', code: 'I10'})
MERGE (p)-[:HAS_CONDITION]->(c)
WITH p
MERGE (cons:Consultation {id: 'cons-jean-1', date: '2023-10-01'})
MERGE (p)-[:HAS_CONSULTATION]->(cons)
RETURN p.id AS patient;

// ----- 2. Marie Enceinte – Condition Grossesse -----
MERGE (p2:Patient {id: 'scenario-marie-enceinte'})
SET p2.displayName = 'Marie Enceinte'
WITH p2
MERGE (c2:Condition {name: 'Grossesse'})
MERGE (p2)-[:HAS_CONDITION]->(c2)
RETURN p2.id AS patient;

// ----- 3. Paul Normal (M. Standard) -----
MERGE (p3:Patient {id: 'scenario-paul-normal'})
SET p3.displayName = 'Paul Normal'
RETURN p3.id AS patient;
