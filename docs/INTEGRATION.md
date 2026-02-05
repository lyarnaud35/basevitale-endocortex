# Documentation d’intégration – BaseVitale (Ben)

Guide pour démarrer la stack, initialiser l’IA locale et intégrer le widget **Medical Scribe** dans l’app hôte.

---

## Pourquoi cette approche ?

- **Transparence :** Système **Cloud-Ready** (`AI_MODE=CLOUD` + clé API pour aller vite) tout en étant **Local-Native par défaut** : le conteneur Ollama est inclus, aucun appel externe en mode LOCAL.
- **Autonomie :** Volume `ollama_data` pour les modèles. Une fois téléchargés (script ou manuel), ils restent disponibles. Le logiciel fonctionne **hors-ligne**.
- **Flexibilité :** Sur un serveur sans GPU trop lent, modifier **une ligne** dans le `.env` (`AI_MODE=CLOUD` + clé) suffit pour basculer en Cloud, sans changement de code.

---

## A. Démarrage (Docker)

### Prérequis

- Docker et Docker Compose
- Fichiers : `docker-compose.prod.yml`, `env.prod.example` (à la racine du dépôt)

### 1. Configuration

```bash
cp env.prod.example .env
# Ajuster si besoin : mots de passe, CORS, modèle Ollama (OLLAMA_MODEL).
```

Par défaut : `AI_MODE=LOCAL`, `OLLAMA_BASE_URL=http://ollama:11434/v1`, `OLLAMA_MODEL=mistral`.

### 2. Lancer la stack

```bash
docker compose -f docker-compose.prod.yml up -d
```

Services : **api**, **ai-cortex**, **postgres**, **neo4j**, **redis**, **ollama**, **nats**.

### 3. Vérifications

| Ressource | URL |
|-----------|-----|
| API | `http://localhost:3000` |
| Swagger | `http://localhost:3000/api-docs` |
| Santé Scribe | `GET http://localhost:3000/api/scribe/health` |
| Neo4j Browser | `http://localhost:7474` |
| Ollama | `http://localhost:11434` |

---

## B. Initialisation IA (charger les modèles la première fois)

Ollama démarre **sans modèle**. Il faut les télécharger une fois.

### Brain Loader (recommandé)

```bash
./scripts/init-ai.sh
```

Le script :

1. Lance le conteneur **ollama** (compose prod).
2. Attend qu’Ollama réponde.
3. Exécute `ollama pull mistral` (ou le modèle défini par `OLLAMA_MODEL` / argument).
4. Affiche **« Cerveau chargé avec succès »**.

Modèle personnalisé :

```bash
./scripts/init-ai.sh llama3
```

Ou définir `OLLAMA_MODEL=llama3` dans `.env`, puis `./scripts/init-ai.sh`.

### Persistance

Les modèles sont stockés dans le volume **`ollama_data`** (`/root/.ollama` dans le conteneur). Après un `docker compose down`, ils restent disponibles au prochain `up`. Aucun re-téléchargement nécessaire.

### Basculer en Cloud

Dans `.env` : `AI_MODE=CLOUD`, puis `GROQ_API_KEY` ou `OPENAI_API_KEY`. Voir `env.prod.example` pour les variables optionnelles (modèles, provider).

---

## C. Intégration du widget UI (Medical Scribe)

Le widget **Medical Scribe** est une librairie React (**sans dépendance Next.js**). L’app hôte fournit l’URL de l’API et, si besoin, un token.

### Installation

Depuis le monorepo (ou package publié) :

```bash
# Depuis le monorepo : dépendance interne
# Dans package.json de l’app hôte, ou via workspace
"@basevitale/scribe-ui": "workspace:*"
```

### Import et rendu minimal

```tsx
import { MedicalScribe } from '@basevitale/scribe-ui';

const API_BASE = 'http://localhost:3000/api'; // ou variable d’env

export default function MyPage() {
  return (
    <MedicalScribe
      config={{ apiBaseUrl: API_BASE }}
      mode="test"
    />
  );
}
```

### Configuration (`config`)

| Propriété | Description |
|-----------|-------------|
| `apiBaseUrl` | Base URL de l’API (ex. `http://localhost:3000/api`). **Requis.** |
| `getToken` | `() => string \| null` — token fourni par l’Host. Si absent, le widget utilise `Bearer test-token` (sandbox). |

Exemple avec token :

```tsx
<MedicalScribe
  config={{
    apiBaseUrl: process.env.NEXT_PUBLIC_API_URL + '/api',
    getToken: () => localStorage.getItem('accessToken'),
  }}
  mode="dictation"
  patientId="patient_123"
/>
```

### Props principales

| Prop | Type | Description |
|------|------|-------------|
| `patientId` | `string?` | Identifiant patient (ex. `externalPatientId`). En mode `test`, un défaut est utilisé si absent. |
| `mode` | `'test' \| 'dictation' \| 'edit'` | `test` = sandbox démo, `dictation` = dictée, `edit` = édition d’un draft. Défaut : `test`. |
| `draftId` | `string?` | En mode `edit`, ID du draft à éditer. |
| `config` | `Partial<ScribeConfig>` | `apiBaseUrl` et optionnellement `getToken`. |
| `onValidated` | `() => void` | Callback après validation d’un draft. |
| `onBack` | `() => void` | Callback retour (ex. liste des drafts). |
| `onDraftCreated` | `(draftId: string) => void` | Callback quand un draft est créé (ex. navigation vers la page d’édition). |
| `className` | `string` | Classe CSS racine du widget. |

### Exemple : dictée + édition

```tsx
import { MedicalScribe } from '@basevitale/scribe-ui';

const API_BASE = 'http://localhost:3000/api';

export default function ScribeFlow() {
  const navigate = (path: string) => { /* ... */ };

  return (
    <MedicalScribe
      mode="dictation"
      patientId="patient_abc"
      config={{ apiBaseUrl: API_BASE }}
      onDraftCreated={(id) => navigate(`/scribe/${id}`)}
      onBack={() => navigate('/')}
      onValidated={() => navigate('/')}
    />
  );
}
```

En mode **edit**, utiliser la même config et passer `draftId` + `onBack` / `onValidated`.

### Panneau Intelligence

Si `patientId` est fourni, le widget affiche en haut un **panneau Intelligence** (résumé, alertes, timeline) via `GET /api/scribe/patient/:patientId/intelligence`. En cas d’erreur API, un mode « Déconnecté » est affiché sans bloquer l’UI.

### `onComplete` (POC Cabinet)

Après **dictée + cristallisation** (mode `test`), le widget peut appeler `onComplete` avec `{ draftId, consultation }`. Utile pour une **Fiche Résultat** (ordonnance, synthèse, codes actes). Voir la page **`/cabinet-demo`** : liste patients → dictée → Fiche Résultat.

### Extraction Facturation et Ordonnance

La réponse **`consultation`** (process-dictation, onComplete) inclut :

- **`billingCodes`** : actes facturables (CCAM/NGAP) extraits ou déduits — `{ code, label, confidence }[]`.
- **`prescription`** : ordonnance structurée — `{ drug, dosage, duration }[]`.

En l’absence de codes extraits, la Fiche Résultat peut afficher des **codes simulés** (CIM/CCAM déduits du diagnostic). L’IA (MOCK/CLOUD/LOCAL) est instruite pour extraire explicitement ces champs ; voir le system prompt partagé (backend) et le schéma Zod `ConsultationSchema`.

### Contraintes

- **React** uniquement ; pas de `next/image`, Server Actions, etc. Utilisable dans toute app React.
- L’Host gère **auth** et **routing**. Le widget reçoit `apiBaseUrl` et `getToken` et ne fait aucun login/signup.

---

## Récapitulatif

1. **Démarrage :** `cp env.prod.example .env` puis `docker compose -f docker-compose.prod.yml up -d`.
2. **IA :** `./scripts/init-ai.sh` (première fois) → « Cerveau chargé avec succès ».
3. **Widget :** `import { MedicalScribe } from '@basevitale/scribe-ui'`, configurer `apiBaseUrl` (et `getToken` si besoin), choisir `mode` et `patientId`.

Voir aussi : `docs/KIT_LIVRAISON_SOUVERAIN.md`, `docs/CHECKLIST_EXPORT_BEN.md`, `docs/INTEGRATION_GUIDE.md`, `libs/scribe-ui/README.md`.
