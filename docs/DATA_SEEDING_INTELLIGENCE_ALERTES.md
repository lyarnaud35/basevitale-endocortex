# Data Seeding – Intelligence & Alertes (panneau rouge)

Objectif : obtenir des **alertes** (panneau Intelligence en rouge) en chargeant un patient avec antécédent/allergie et une consultation qui prescrit un médicament contre-indiqué.

---

## 1. Endpoints utilisés

| Endpoint | Rôle |
|----------|------|
| `POST /api/scribe/process-dictation` | Crée un draft à partir d’un texte de consultation (analyse IA). |
| `POST /api/scribe/draft/:id/validate` | Valide le draft → projection Neo4j (Patient, Consultation, médicaments, etc.). |
| `GET /api/scribe/patient/:id/intelligence` | Retourne résumé, timeline, **activeAlerts**, quickActions. |

Il n’existe pas d’endpoint qui accepte un **JSON de consultation brute** (symptômes, diagnostics, médicaments) pour créer un draft. On passe par **process-dictation** (texte → IA → draft) puis **validate**.

---

## 2. Prérequis

- **Neo4j** : patient + allergie déjà en base (script Cypher ci‑dessous).
- **AI_MODE** : `CLOUD` ou `LOCAL` pour que l’IA extraie **Amoxicilline** du texte. En `MOCK`, la consultation est figée (ex. Doliprane) → pas d’alerte sur Amoxicilline.

---

## 3. Seed Neo4j (allergie)

Exécuter dans **Neo4j Browser** (http://localhost:7474) ou via `cypher-shell` :

```cypher
// scripts/seed-intelligence-alerts.cypher
MERGE (p:Patient {id: "patient_alert_demo"})
MERGE (a:Condition {code: "Z88.0", name: "Amoxicilline"})
MERGE (p)-[:HAS_CONDITION {since: date()}]->(a);

MERGE (m:Medication {name: "Amoxicilline"})
MERGE (cls:Condition {name: "Pénicilline"})
MERGE (m)-[:BELONGS_TO_CLASS]->(cls);
```

Cela crée le patient `patient_alert_demo` avec une allergie **Amoxicilline** (match direct) et la classe **Pénicilline** pour les alertes via classe.

---

## 4. Payloads Swagger / CURL

### 4.1 `POST /api/scribe/process-dictation`

Crée un draft. Le texte doit décrire une prescription d’**Amoxicilline** pour que l’IA l’extraie (mode CLOUD/LOCAL).

**Body (JSON) :**

```json
{
  "text": "Le patient présente une angine. Je prescris Amoxicilline 1 g deux fois par jour pendant 5 jours.",
  "patientId": "patient_alert_demo"
}
```

**CURL :**

```bash
curl -X POST "http://localhost:3000/api/scribe/process-dictation" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d @scripts/payloads/process-dictation-alertes.json
```

Réponse : `data.draft.id` (ex. `cmkxem8780000f0tpod3wxy4c`). **Copier cet `id`** pour l’étape suivante.

### 4.2 `POST /api/scribe/draft/:id/validate`

**Important :** remplacez `VOTRE_DRAFT_ID` par l’`id` **exact** retourné dans `data.draft.id` par process-dictation. Ne pas coller littéralement "DRAFT_ID" ou "&lt;DRAFT_ID&gt;".

**CURL (exemple) :**

```bash
# Exemple avec l'id cmkxem8780000f0tpod3wxy4c — utilisez VOTRE id !
curl -X POST "http://localhost:3000/api/scribe/draft/cmkxem8780000f0tpod3wxy4c/validate" \
  -H "Authorization: Bearer test-token"
```

### 4.3 `GET /api/scribe/patient/patient_alert_demo/intelligence`

**CURL :**

```bash
curl "http://localhost:3000/api/scribe/patient/patient_alert_demo/intelligence" \
  -H "Authorization: Bearer test-token"
```

Réponse attendue : `activeAlerts` non vide, avec des messages du type  
`"Attention : Amoxicilline détectée (médicament contre-indiqué)."`  
→ le panneau Intelligence s’affiche en **rouge**.

---

## 5. `POST /api/scribe/analyze` (sans alertes)

**Analyze** prend uniquement `text` (et optionnellement `patientId` / `externalPatientId`). Il ne permet pas d’envoyer une consultation structurée (symptômes, diagnostics, médicaments) en JSON. En **MOCK**, la sortie est figée → pas d’Amoxicilline, pas d’alerte.

Payload exemple pour un simple test **sans** viser les alertes :

```json
{
  "text": "Le patient tousse et a de la fièvre. Diagnostic : rhinopharyngite. Paracétamol 500 mg.",
  "patientId": "patient_demo_phase3"
}
```

Pour **voir le panneau rouge**, utiliser le flux **process-dictation** → **validate** → **intelligence** avec le seed Cypher et un texte prescrivant Amoxicilline (CLOUD/LOCAL).

**Fichier JSON prêt à l’emploi (CURL / Swagger) :** `scripts/payloads/process-dictation-alertes.json`

---

## 6. Vérifier côté UI (widget)

Une fois le flux API OK (seed + process-dictation + validate → `activeAlerts` non vide), vérifier que le bandeau d’alertes s’affiche en **rouge** dans le widget.

1. **Démarrer l’API** (si ce n’est pas déjà fait) :
   ```bash
   npx nx run api:serve
   ```
   L’API écoute sur `http://localhost:3000`.

2. **Démarrer le front** (autre terminal) :
   ```bash
   npx nx run web:serve
   ```
   Le front tourne en général sur `http://localhost:4200` (ou le port indiqué dans la console).

3. **Ouvrir la page de test avec le patient à alertes** :
   ```
   http://localhost:4200/scribe/test?patientId=patient_alert_demo
   ```
   Sans `?patientId=...`, la page utilise le patient démo par défaut (`patient_demo_phase3`) → pas d’alertes.

4. **Contrôler** : le panneau **Intelligence** en haut de la page doit afficher le bandeau **rouge** avec le message *« Attention : Amoxicilline détectée (médicament contre-indiqué). »*.
