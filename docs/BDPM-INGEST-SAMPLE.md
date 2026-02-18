# Ingestion BDPM – Samples & Smoke Test (Stratégie Molecule Mesh)

## 1. Fichiers échantillons

À la racine du projet (ou dans `libs/data/samples/`) :

- **`CIS_sample.txt`** : 10–11 premières lignes de `CIS_bdpm.txt` (ANSM)
- **`CIS_COMPO_sample.txt`** : 10 premières lignes de `CIS_COMPO_bdpm.txt` (ANSM)

Création manuelle :

```bash
head -n 11 CIS_bdpm.txt > CIS_sample.txt
head -n 11 CIS_COMPO_bdpm.txt > CIS_COMPO_sample.txt
```

## 2. Mapping des colonnes & DTOs

### CIS_bdpm.txt (tab `\t`, encodage Latin-1 côté ANSM)

| Index | Colonne          | DTO / Neo4j     | Exemple                    |
|-------|------------------|-----------------|----------------------------|
| 0     | Code CIS         | `cisId`         | 61266250                   |
| 1     | Dénomination     | `name`          | A 313 200 000 UI…          |
| 2     | Forme pharma     | `form`          | pommade                    |
| 3     | Voie(s)          | `administration`| cutanée;orale              |
| 4     | Statut AMM       | —               | Autorisation active        |
| 5     | Procédure        | —               | Procédure nationale        |
| 6     | Commercialisation| `status`        | Commercialisée             |
| 7–9   | Dates / BDM      | —               |                            |
| 10    | Titulaire        | `holder`        | PHARMA DEVELOPPEMENT       |
| 11    | Surveillance     | —               | Non                        |

**TypeScript (aligné `ingest-cis.ts`) :**

```ts
interface DrugRow {
  cisId: string;
  name: string;
  form: string;
  administration: string[];
  holder: string;
  status: string;
}
```

**Neo4j :** `(:Drug {cisId, name, form, administration, holder, status})`

---

### CIS_COMPO_bdpm.txt (tab `\t`, Latin-1)

| Index | Colonne        | DTO / Neo4j       | Exemple        |
|-------|----------------|-------------------|----------------|
| 0     | Code CIS       | `cisId`           | 60002283       |
| 1     | Forme          | —                 | comprimé       |
| 2     | Code substance | `substanceCode`   | 42215          |
| 3     | Dénomination substance | `substanceName` | ANASTROZOLE |
| 4     | Dosage         | `dosage`          | 1,00 mg        |
| 5     | Référence      | —                 | un comprimé    |
| 6     | Nature (SA/FT) | filtre SA         | SA             |
| 7     | Lien / rang    | —                 | 1             |

**TypeScript (aligné `ingest-compo.ts`) :**

```ts
interface CompoRow {
  cisId: string;
  substanceCode: string;
  substanceName: string;
  dosage: string;
}
```

**Neo4j :** `(:Molecule {code: substanceCode, name: substanceName})`, `(Drug)-[:CONTIENT {dosage}]->(Molecule)`. Seules les lignes **SA** (substance active) sont importées.

## 3. Exécution sur les samples

Prérequis : Neo4j démarré, `.env` avec `NEO4J_URI`, `NEO4J_USER`, `NEO4J_PASSWORD`.

1. **Ingérer les médicaments (CIS sample) :**

   ```bash
   npm run ingest:cis:sample
   ```

2. **Ingérer les compositions (COMPO sample) :**

   ```bash
   npm run ingest:compo:sample
   ```

   Peut être exécuté seul : les `Drug` absents sont créés avec uniquement `cisId` (les noms/formes viennent du CIS complet). Pour un graphe cohérent, lancer d’abord `ingest:cis:sample` (ou `ingest:cis` en base complète).

Variables d’environnement optionnelles (depuis `apps/api`) :

- `BDPM_CIS_FILE=../../CIS_sample.txt` (déjà utilisé par `ingest:cis:sample`)
- `BDPM_COMPO_FILE=../../CIS_COMPO_sample.txt` (déjà utilisé par `ingest:compo:sample`)

## 4. Smoke test (Neo4j)

Dans Neo4j Browser (`http://localhost:7474`) :

```cypher
MATCH (d:Drug)-[r:CONTIENT]->(m:Molecule)
RETURN d.cisId AS cis, d.name AS medicament, m.name AS substance, r.dosage
LIMIT 10
```

**Succès :** des lignes avec vrais noms (ex. ANASTROZOLE, METFORMINE, FAMOTIDINE). Le graphe Drug → Molecule est opérationnel.

## 5. Passage à la base complète

Quand les samples sont validés :

- Placer `CIS_bdpm.txt` et `CIS_COMPO_bdpm.txt` dans `apps/api/src/scripts/ingestion/data/`
- Lancer sans variables d’environnement :

  ```bash
  npm run ingest:cis
  npm run ingest:compo
  ```

Les scripts utilisent le flux (stream), l’encodage Latin-1 et des batch UNWIND pour limiter la RAM. Contraintes et index sont créés au **début** de chaque script ; pour création manuelle, voir `docs/BDPM-NEO4J-INDEXES.cypher`. Sanitization (caractères de contrôle) appliquée sur le flux.
