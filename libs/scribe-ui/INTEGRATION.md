# Intégration du widget Medical Scribe

Guide d’intégration du widget **Medical Scribe** (`@basevitale/scribe-ui`) dans une application hôte (React).  
À destination des développeurs tiers (ex. Ben).

---

## Notice de montage (résumé Ben)

### 1. Lancer l’API en Docker

Depuis la racine du dépôt BaseVitale (ou après avoir reçu l’image) :

```bash
# Build de l’image
docker build -f apps/api/Dockerfile -t basevitale-api:latest .

# Lancer le conteneur (Postgres, Neo4j, Redis, etc. doivent être accessibles via DATABASE_URL, NEO4J_*, etc.)
docker run -p 3001:3000 -e DATABASE_URL="postgresql://..." -e NEO4J_URI="bolt://..." basevitale-api:latest
```

L’API Scribe est exposée sur `http://localhost:3001/api` (ex. `/api/scribe/health`, `/api/scribe/process-dictation`, `/api/scribe/validate/:draftId`). En production, Ben configure son reverse-proxy vers ce service.

### 2. Installer le widget et importer `<MedicalScribe />`

**Option A – Fichier .tgz (livrable)**  
Si tu as reçu `basevitale-scribe-ui-0.0.1.tgz` :

```bash
npm install ./basevitale-scribe-ui-0.0.1.tgz
```

**Option B – Monorepo / workspace**

```json
"@basevitale/scribe-ui": "workspace:*"
```

Puis dans ton app React :

```tsx
import { MedicalScribe, type ConsultationAnalysis } from '@basevitale/scribe-ui';

<MedicalScribe
  patientId="patient_123"
  apiUrl="/api"
  onComplete={handleComplete}
  onCancel={handleCancel}
/>
```

`apiUrl` peut être une URL relative (ex. `/api`) si ton front fait proxy vers l’API, ou l’URL absolue du backend (ex. `http://localhost:3001/api`).

### 3. Gérer `onComplete` pour remplir tes champs

`onComplete` est appelé **après** que le médecin a corrigé l’ordonnance / les codes actes et cliqué sur **Valider**. Tu reçois toutes les données structurées ; c’est **là** que tu remplis tes champs (ordonnance, facturation, synthèse, etc.) :

```tsx
const handleComplete = (data: ConsultationAnalysis) => {
  const { draftId, consultation } = data;

  // Ordonnance (prioriser prescription, sinon medications)
  const meds = (consultation.prescription ?? consultation.medications ?? []).map((m) => ({
    name: m.drug ?? m.name,
    dosage: m.dosage,
    duration: m.duration,
  }));
  setOrdonnance(meds);

  // Actes facturables (CCAM/NGAP)
  const actes = (consultation.billingCodes ?? []).map((b) => ({ code: b.code, label: b.label }));
  setActesFacturables(actes);

  // Synthèse (ex. pour la fiche patient)
  const resume = [consultation.symptoms, consultation.diagnosis].flat().filter(Boolean).join(' ; ');
  setSynthèse(resume);

  setScreen('result');
};
```

Détails en **§ 4** (structure JSON) et **§ 7** (exemple complet).

---

## 1. Installation

Depuis le monorepo BaseVitale, un registre privé, ou le **fichier .tgz** livré :

```bash
# Option 1 : fichier .tgz (livrable Ben)
npm install ./basevitale-scribe-ui-0.0.1.tgz

# Option 2 : dépendance workspace (monorepo)
"@basevitale/scribe-ui": "workspace:*"

# Option 3 : registre npm (si publié)
npm install @basevitale/scribe-ui
```

---

## 2. Exemple minimal

```tsx
import { MedicalScribe, type ConsultationAnalysis } from '@basevitale/scribe-ui';

function App() {
  const handleComplete = (data: ConsultationAnalysis) => {
    console.log('Consultation validée', data);
    // data.draftId, data.consultation (symptoms, diagnosis, medications, billingCodes, prescription)
  };

  const handleCancel = () => {
    // Retour liste / fermeture du flux
  };

  return (
    <MedicalScribe
      patientId="patient_123"
      apiUrl="/api"
      onComplete={handleComplete}
      onCancel={handleCancel}
    />
  );
}
```

- **`patientId`** : identifiant patient fourni par l’hôte (`externalPatientId`).
- **`apiUrl`** : base de l’API Scribe (ex. `https://api.example.com/api` ou `/api` si proxy).
- **`onComplete`** : appelé après validation finale (correction puis « Valider »). Reçoit `ConsultationAnalysis`.
- **`onCancel`** : appelé quand l’utilisateur annule (ex. retour liste).

---

## 3. Props – Tableau des types

| Prop | Type | Requis | Description |
|------|------|--------|-------------|
| `patientId` | `string` | Oui | Identifiant patient (externalPatientId). |
| `apiUrl` | `string` | Oui | URL du backend Scribe (ex. `/api` ou `http://localhost:3001/api`). |
| `onComplete` | `(data: ConsultationAnalysis) => void` | Oui | Callback de succès après validation finale. |
| `onCancel` | `() => void` | Non | Callback annulation. Optionnel ; no-op si absent (API stricte plan : `{ patientId, apiUrl, onComplete }`). |
| `getToken` | `() => string \| null` | Non | JWT ou API Key pour les appels API. Défaut : `Bearer test-token` en sandbox. |
| `showIntelligence` | `boolean` | Non | Afficher le panneau Intelligence (résumé, timeline). Défaut : `true`. |
| `className` | `string` | Non | ClassName appliquée au conteneur racine. |

---

## 4. Structure du JSON renvoyé par `onComplete` (`ConsultationAnalysis`)

`onComplete` reçoit un objet de type **`ConsultationAnalysis`** :

```ts
interface ConsultationAnalysis {
  draftId: string;
  consultation: ConsultationData;
}

interface ConsultationData {
  transcript?: string;
  symptoms?: string[];
  diagnosis?: Array<{ code?: string; label?: string; confidence?: number }>;
  medications?: Array<{ name?: string; dosage?: string; duration?: string }>;
  billingCodes?: Array<{ code?: string; label?: string; confidence?: number }>;
  prescription?: Array<{ drug?: string; dosage?: string; duration?: string }>;
  alerts?: string[];
}
```

| Champ | Type | Description |
|-------|------|-------------|
| `draftId` | `string` | ID du brouillon validé (draft). |
| `consultation.transcript` | `string` | Transcription brute. |
| `consultation.symptoms` | `string[]` | Symptômes extraits. |
| `consultation.diagnosis` | `object[]` | Diagnostics (code, label, confidence). |
| `consultation.medications` | `object[]` | Médicaments (name, dosage, duration). |
| `consultation.billingCodes` | `object[]` | Actes facturables CCAM/NGAP (code, label, confidence). |
| `consultation.prescription` | `object[]` | Ordonnance structurée (drug, dosage, duration). |
| `consultation.alerts` | `string[]` | Alertes sécurité (ex. contre-indications). |

---

## 5. Prérequis CSS (Tailwind)

Le widget utilise **Tailwind CSS**. L’application hôte doit :

1. **Configurer Tailwind** pour inclure les sources de la lib :

   ```js
   // tailwind.config.js
   module.exports = {
     content: [
       './src/**/*.{js,ts,jsx,tsx}',
       './node_modules/@basevitale/scribe-ui/src/**/*.{js,ts,jsx,tsx}',
     ],
     // ...
   };
   ```

2. **Importer la feuille Tailwind** (base, components, utilities) dans l’app.

Sans Tailwind, les classes du widget (ex. `rounded-lg`, `border`, `bg-white`) ne seront pas appliquées.

---

## 6. Responsabilités

| Acteur | Rôle |
|--------|------|
| **Widget** | Micro, streaming texte, formulaire correction/validation (ordonnance, codes actes), appel `onComplete` puis reset. |
| **Hôte** | Afficher le widget, gérer navigation (ex. liste → dictée → résultat), afficher le JSON reçu après `onComplete`. |

---

## 7. Exemple complet (liste → dictée → fiche résultat)

```tsx
import { useState } from 'react';
import { MedicalScribe, type ConsultationAnalysis } from '@basevitale/scribe-ui';

const API_URL = '/api'; // ou URL absolue du backend

export default function CabinetPage() {
  const [screen, setScreen] = useState<'list' | 'dictation' | 'result'>('list');
  const [patientId, setPatientId] = useState<string | null>(null);
  const [result, setResult] = useState<ConsultationAnalysis | null>(null);

  const handleStart = (id: string) => {
    setPatientId(id);
    setResult(null);
    setScreen('dictation');
  };

  const handleComplete = (data: ConsultationAnalysis) => {
    setResult(data);
    setScreen('result');
  };

  const handleCancel = () => {
    setScreen('list');
    setPatientId(null);
    setResult(null);
  };

  return (
    <>
      {screen === 'list' && (
        <button type="button" onClick={() => handleStart('patient_123')}>
          Nouvelle consultation
        </button>
      )}

      {screen === 'dictation' && patientId && (
        <>
          <button type="button" onClick={handleCancel}>← Annuler</button>
          <MedicalScribe
            patientId={patientId}
            apiUrl={API_URL}
            onComplete={handleComplete}
            onCancel={handleCancel}
          />
        </>
      )}

      {screen === 'result' && result && (
        <>
          <button type="button" onClick={handleCancel}>← Nouvelle consultation</button>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </>
      )}
    </>
  );
}
```

---

## 8. Référence des types exportés

```ts
import {
  MedicalScribe,
  type MedicalScribeProps,
  type ConsultationAnalysis,
  type ConsultationData,
} from '@basevitale/scribe-ui';
```

- **`MedicalScribe`** : composant à rendre.
- **`MedicalScribeProps`** : type des props du composant.
- **`ConsultationAnalysis`** : payload de `onComplete` (`draftId` + `consultation`).
- **`ConsultationData`** : structure de `consultation` (symptoms, diagnosis, medications, billingCodes, prescription, etc.).
