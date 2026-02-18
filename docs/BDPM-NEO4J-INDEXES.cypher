// =============================================================================
// Contraintes et index BDPM – À exécuter dans Neo4j Browser (localhost:7474)
// =============================================================================
// Recommandé : exécuter ces commandes AVANT une injection massive (ingest:bdpm:etl)
// pour accélérer les MERGE d'un facteur ~100x. Les scripts d'ingestion peuvent
// aussi les créer au démarrage (IF NOT EXISTS).
// L'API crée au démarrage l'index fulltext "medical_search" (Drug|Molecule) pour la recherche hybride.
// =============================================================================

// Drug : unicité du code CIS (accélère MERGE d'un facteur ~100x)
CREATE CONSTRAINT drug_cis_unique IF NOT EXISTS
FOR (d:Drug) REQUIRE d.cisId IS UNIQUE;

// Drug : index sur le nom (recherche et tri)
CREATE INDEX drug_name_index IF NOT EXISTS
FOR (d:Drug) ON (d.name);

// Full-Text sur les noms Drug (recherche floue). Optionnel si medical_search existe déjà.
CREATE FULLTEXT INDEX drugNameIndex IF NOT EXISTS
FOR (d:Drug) ON EACH [d.name];

// Index Full-Text hybride Drug|Molecule (recherche type "Google", fautes de frappe, scoring).
// Prérequis pour GET /api/drugs/search < 50ms.
CREATE FULLTEXT INDEX drugSearch IF NOT EXISTS
FOR (n:Drug|Molecule)
ON EACH [n.name, n.cisId];

// Molecule (Substance) : unicité du code + index (schéma = Molecule, pas Substance)
CREATE CONSTRAINT molecule_code_unique IF NOT EXISTS
FOR (m:Molecule) REQUIRE m.code IS UNIQUE;

CREATE INDEX molecule_code_index IF NOT EXISTS
FOR (m:Molecule) ON (m.code);

// Vérification après exécution :
// SHOW INDEXES;
// SHOW CONSTRAINTS;

// =============================================================================
// Smoke test après ingestion BDPM (ingest:bdpm:etl)
// =============================================================================
// La BDPM stocke "PARACÉTAMOL" (avec accent). Utiliser l'accent ou toUpper + pattern.
// Médicaments contenant du Paracétamol :
// MATCH (d:Drug)-[r:CONTIENT]->(m:Molecule)
// WHERE m.name CONTAINS "PARACÉTAMOL"
// RETURN d, r, m LIMIT 20
