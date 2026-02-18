# ROLE : DATA ENGINEER (ENDOCORTEX - CHANTIER DEEP ROOTS)

Nous avons validé le MVP Scribe. Le système lit le graphe correctement.
Nous passons maintenant à l'industrialisation des données (Stratégie "Molecule Mesh").

## OBJECTIF

Remplacer les mocks de médicaments par l'ingestion réelle de la base ANSM (BDPM).

## TÂCHE 1 : L'ARCHITECTURE DU GRAPHE

Nous devons faire évoluer le schéma Neo4j pour supporter l'ontologie médicamenteuse.

1. Crée un script ou un service `DrugSeederService` dans NestJS.
2. Ce service doit être capable de parser le format texte tabulé de l'ANSM (encodage souvent ISO-8859-1, attention à l'UTF-8).
3. Modélise l'insertion pour créer :
   - Des nœuds `Drug` (Propriétés : code CIS, dénomination, forme pharma).
   - Des nœuds `Substance` (Propriétés : code substance, dénomination).
   - Une relation `(:Drug)-[:CONTAINS]->(:Substance)`.

## CONTRAINTE

Commence petit. Ne télécharge pas tout Internet.
Crée d'abord une fonction qui lit un fichier local `CIS_sample.txt` (contenant 10 lignes copiées de l'ANSM) pour valider la création des nœuds dans Neo4j sans casser la base existante.

**Action :** Analyse la structure nécessaire pour `DrugSeederService`.

---

*Référence : BDPM ANSM — CIS_bdpm.txt, CIS_COMPO_bdpm.txt*
