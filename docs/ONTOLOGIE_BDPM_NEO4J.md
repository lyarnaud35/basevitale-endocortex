# Ontologie pharmaceutique BDPM dans Neo4j (Deep Roots)

Référentiel : **BDPM** (Base de Données Publique des Médicaments – ANSM).  
Modèle de graphe pour remplacer les mocks par des données réelles.

---

## 1. Sources de données (ANSM)

| Fichier | Description | Lien officiel |
|--------|--------------|----------------|
| **CIS_bdpm.txt** | Spécialités (dénomination, forme pharmaceutique, statut…) | [bdpmt.ansm.sante.fr](https://bdpmt.ansm.sante.fr/download/file/CIS_bdpm.txt) |
| **CIS_COMPO_bdpm.txt** | Compositions (CIS ↔ code substance, dosage, type SA/FT) | [bdpmt.ansm.sante.fr](https://bdpmt.ansm.sante.fr/download/file/CIS_COMPO_bdpm.txt) |
| **CIS_CIP_bdpm.txt** | Présentations / conditionnements (optionnel pour étape 1) | idem |

Format : **texte tabulé (TSV)**, encodage **UTF-8**.  
Référence exacte des colonnes : document ANSM *« Contenu et format des fichiers téléchargeables dans la BDM »* (PDF sur [bdpmt.ansm.sante.fr/telechargement](https://bdpmt.ansm.sante.fr/telechargement)).

---

## 2. Modèle de graphe Neo4j

### 2.1 Nœuds

#### `:Medicament`
Représente une **spécialité pharmaceutique** (une ligne du fichier CIS).

| Propriété | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `cis` | string | oui | Code Identifiant de Spécialité (7 chiffres) – **identifiant unique** |
| `denomination` | string | oui | Dénomination du médicament |
| `formePharmaceutique` | string | non | Forme galénique (comprimé, gélule, solution…) |
| `statutAutorisation` | string | non | Statut de commercialisation |
| `source` | string | oui | Toujours `"BDPM"` |
| `updatedAt` | string (ISO date) | non | Date de dernière mise à jour (ingestion) |

**Contrainte d’unicité :** un nœud par `cis`.

---

#### `:Molecule`
Représente une **substance active** (principe actif) issue des compositions (type SA dans CIS_COMPO).

| Propriété | Type | Obligatoire | Description |
|-----------|------|-------------|-------------|
| `codeSubstance` | string | oui | Code de la désignation de l’élément (référentiel BDPM) – **identifiant unique** |
| `designation` | string | oui | Désignation / libellé de la substance |
| `source` | string | oui | Toujours `"BDPM"` |
| `updatedAt` | string (ISO date) | non | Date de dernière mise à jour (ingestion) |

**Contrainte d’unicité :** un nœud par `codeSubstance`.

---

### 2.2 Relations

#### `(Medicament)-[:A_POUR_SUBSTANCE]->(Molecule)`

Lien **une spécialité → une substance active** (une ligne de composition de type SA).

| Propriété | Type | Description |
|-----------|------|-------------|
| `dosage` | string | Dosage tel que dans la BDPM (ex. "500 mg", "10 mg/ml") |
| `referenceDosage` | string | Unité ou référence du dosage |
| `createdAt` | string (ISO date) | Date de création de la relation (ingestion) |

- Un même **Medicament** peut avoir **plusieurs** `A_POUR_SUBSTANCE` (polythérapie / association).
- Un même **Molecule** peut être liée à **plusieurs** Medicaments (génériques, spécialités différentes).

---

### 2.3 Schéma visuel

```
(Medicament { cis, denomination, formePharmaceutique, ... })
         │
         │ A_POUR_SUBSTANCE { dosage, referenceDosage }
         │
         ▼
(Molecule { codeSubstance, designation })
```

---

## 3. Index et contraintes recommandés

- **Contrainte d’unicité** (recommandé Neo4j 5+) :
  - `CREATE CONSTRAINT medicament_cis IF NOT EXISTS FOR (m:Medicament) REQUIRE m.cis IS UNIQUE;`
  - `CREATE CONSTRAINT molecule_code IF NOT EXISTS FOR (m:Molecule) REQUIRE m.codeSubstance IS UNIQUE;`
- **Index** (recherche / jointures) :
  - `CREATE INDEX medicament_denomination IF NOT EXISTS FOR (m:Medicament) ON (m.denomination);`
  - `CREATE INDEX molecule_designation IF NOT EXISTS FOR (m:Molecule) ON (m.designation);`

---

## 4. Exemples Cypher

- Tous les médicaments contenant une substance donnée :
  ```cypher
  MATCH (mol:Molecule { codeSubstance: "xxx" })<-[:A_POUR_SUBSTANCE]-(med:Medicament)
  RETURN med.cis, med.denomination
  ```
- Toutes les substances d’un médicament :
  ```cypher
  MATCH (med:Medicament { cis: "1234567" })-[r:A_POUR_SUBSTANCE]->(mol:Molecule)
  RETURN mol.codeSubstance, mol.designation, r.dosage, r.referenceDosage
  ```

---

## 5. Convention de nommage

- **Labels** : `Medicament`, `Molecule` (singulier).
- **Relation** : `A_POUR_SUBSTANCE` (français, cohérent avec le domaine métier et les règles du projet).

Ce document sert de référence pour le script d’ingestion et pour toute évolution du graphe (ex. ajout de CIP, groupes génériques, etc.).
