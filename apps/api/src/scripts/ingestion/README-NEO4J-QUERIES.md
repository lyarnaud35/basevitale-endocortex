# Requêtes Neo4j – Ontologie Drug / Molecule

Les noms de substances dans la BDPM sont **en français avec accents**. Utilise le libellé exact ANSM.

---

## Index Full-Text Hybride (à exécuter une fois)

Pour le moteur de recherche hybride (Drug + Molecule, fuzzy), créer l’index dans Neo4j Browser (http://localhost:7474) :

```cypher
CREATE FULLTEXT INDEX medical_search IF NOT EXISTS
FOR (n:Drug|Molecule)
ON EACH [n.name]
```

*(Nos nœuds utilisent la propriété `name`, pas `denomination`.)*

Test rapide (recherche floue) :

```cypher
CALL db.index.fulltext.queryNodes("medical_search", "amoxicilin~")
YIELD node, score
RETURN node.name, labels(node), score
ORDER BY score DESC
LIMIT 10
```

---

## Exemple : Paracétamol

En base le nom est stocké **PARACÉTAMOL** (avec accent sur le E).

### Tous les médicaments contenant du Paracétamol

```cypher
MATCH (m:Molecule {name: "PARACÉTAMOL"})<-[r:CONTIENT]-(d:Drug)
RETURN d.cisId, d.name, r.dosage
LIMIT 50
```

### Top molécules par nombre de médicaments

```cypher
MATCH (m:Molecule)<-[r:CONTIENT]-(d:Drug)
WHERE m.name CONTAINS 'PARACÉTAMOL'
RETURN m.code, m.name, count(d) AS nbMedicaments
ORDER BY nbMedicaments DESC
LIMIT 10
```

### Autres exemples (noms exacts ANSM)

- `PARACÉTAMOL` (pas PARACETAMOL)
- `IBUPROFÈNE` (pas IBUPROFENE)
- `CHLORHYDRATE DE METFORMINE`
- `ACIDE ACÉTYLSALICYLIQUE` (aspirine)

Pour explorer les libellés présents en base :

```cypher
MATCH (m:Molecule) RETURN m.code, m.name LIMIT 20
```
