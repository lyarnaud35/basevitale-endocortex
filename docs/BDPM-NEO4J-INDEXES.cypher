// =============================================================================
// Contraintes et index BDPM – À exécuter dans Neo4j Browser (localhost:7474)
// =============================================================================
// Optionnel : les scripts ingest:cis et ingest:compo créent ces index au démarrage.
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

// Molecule (Substance) : unicité du code + index (schéma = Molecule, pas Substance)
CREATE CONSTRAINT molecule_code_unique IF NOT EXISTS
FOR (m:Molecule) REQUIRE m.code IS UNIQUE;

CREATE INDEX molecule_code_index IF NOT EXISTS
FOR (m:Molecule) ON (m.code);

// Vérification après exécution :
// SHOW INDEXES;
// SHOW CONSTRAINTS;
