# Scénarios d’usage (Use Cases) – BaseVitale

Documentation des parcours de test pour Ben (frontend) et pour les démos. **Deep Roots** : on valide la donnée et la sécurité, pas seulement l’API.

---

## Prérequis

- API : `npm run dev:api` (ou `nx serve api`)
- Neo4j + données BDPM : `npm run import:bdpm` (CIS + COMPO + CIS_CIP si présent)
- Prix (optionnel) : `npm run hydrate:pack-prices -- --api` pour hydrater les Packs avec prix/taux
- Patients de démo : `npm run seed:demo-allergy` et `npm run seed:demo-clavulanique`

---

## Scénario 1 : Prescription sécurisée (allergies)

**Objectif** : Vérifier que le Guardian bloque un médicament contre-indiqué pour un patient allergique.

### Étapes

1. **Charger le patient « M. Allergique » (Paracétamol)**  
   - Patient de démo : `demo-patient-paracetamol` (allergie « paracétamol »).  
   - Dans le cabinet démo : bouton **« Scénario Paracétamol »** (ou sélectionner ce patient).

2. **Rechercher un médicament contenant du paracétamol**  
   - Recherche : `doli` ou `doliprane` ou `efferalgan`.  
   - API : `GET /api/drugs/search?q=doli&patientId=demo-patient-paracetamol&molecules=1`

3. **Vérifier le résultat**  
   - Les médicaments à base de paracétamol doivent avoir  
     `safety: { status: "BLOCKED", reason: "..." }`.  
   - L’UI doit afficher **rouge** (bloqué), pas vert.

4. **Scénario Augmentin (allergie acide clavulanique)**  
   - Patient : `demo-patient-clavulanique`.  
   - Recherche : `augmentin`.  
   - Attendu : **BLOCKED** (Augmentin contient de l’acide clavulanique).

### Points techniques

- Le Guardian s’appuie sur le graphe Neo4j : `(Patient)-[:HAS_ALLERGY]->(Allergy)` et `(Drug)-[:CONTIENT]->(Molecule)`.  
- Recherche fulltext déjà tolérante aux fautes (« doliplane » → Doliprane).  
- Si un futur `POST /prescriptions` existe, le Guardian doit **intercepter** et renvoyer `403 Forbidden` si le médicament est contre-indiqué (règle métier, pas seulement info).

---

## Scénario 2 : Facturation simple (prix et Packs)

**Objectif** : Vérifier que les Packs (CIP13) sont exposés et, après hydratation, que les prix sont disponibles pour une facturation démo.

### Étapes

1. **Importer les Packs (si pas déjà fait)**  
   - L’import BDPM avec `CIS_CIP_bdpm.txt` crée les nœuds `Pack` et la relation `(Drug)-[:VENDU_SOUS]->(Pack)`.

2. **Hydrater les prix**  
   - `npm run hydrate:pack-prices -- --api`  
   - Ou fichier local : `npm run hydrate:pack-prices -- --file=data/bdpm/prix.csv`  
   - Format CSV attendu : `cip13,prix,taux` (taux en décimal 0.65 ou en % 65%).

3. **Recherche avec Packs**  
   - `GET /api/drugs/search?q=doliprane&packs=1&limit=5`  
   - Chaque hit doit contenir `packs: [{ cip7, cip13, libelle?, prix?, tauxRemboursement? }]`.

4. **Vérifier la valeur**  
   - Au moins quelques Packs avec `prix` non null (après hydratation API).  
   - L’UI peut afficher « Boîte 16 cp – 3,85 € (65 % sécu) » pour démontrer la facturation.

### Points techniques

- Sans hydratation, `prix` et `tauxRemboursement` restent souvent `null` (fichier ANSM CIS_CIP sans prix).  
- Le script `hydrate-pack-prices` ne crée pas de Packs : il fait uniquement `MATCH (p:Pack) SET p.prix, p.tauxRemboursement`.  
- Une fois les prix en base, un futur `PriceEstimator` (liste de cip13 → total, part sécu, reste à charge) pourra s’appuyer sur ces données.

---

## Scénarios fixtures (bac à sable Ben)

- **M. Allergique** (Jean Peuplu) : `scenario-jean-peuplu` – allergie Pénicilline → Amoxicilline BLOQUÉ.  
- **Mme Enceinte** (Marie Enceinte) : `scenario-marie-enceinte` – Condition Grossesse (futur : AINS bloqués).  
- **M. Standard** (Paul Normal) : `scenario-paul-normal` – aucun risque, test facturation. (M. Riche / reste à charge : à créer plus tard.)

Exécuter `npm run seed:scenarios` pour créer les 3 profils (M. Allergique, Mme Enceinte, M. Standard). IDs : `scenario-jean-peuplu`, `scenario-marie-enceinte`, `scenario-paul-normal`. En complément : `seed:demo-allergy`, `seed:demo-clavulanique`.

---

## Résumé des commandes utiles

| Commande | Rôle |
|----------|------|
| `npm run import:bdpm` | Import CIS + COMPO + CIS_CIP (Packs) dans Neo4j |
| `npm run hydrate:pack-prices -- --api` | Hydratation des prix Packs depuis l’API médicaments |
| `npm run hydrate:pack-prices -- --file=...` | Hydratation depuis un CSV cip13,prix,taux |
| `npm run seed:demo-allergy` | Patient allergique Paracétamol |
| `npm run seed:demo-clavulanique` | Patient allergique Acide clavulanique (test Augmentin) |
| `npm run seed:scenarios` | Injecte M. Allergique, Mme Enceinte, M. Standard (fixtures) |
| `npm run sanity-check:bdpm` | Contrôle orphelins et santé du graphe BDPM |
