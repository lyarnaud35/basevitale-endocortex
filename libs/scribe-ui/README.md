# @basevitale/scribe-ui

Librairie du widget **Medical Scribe** (Protocole Symbiote, Phase 2 Widgetization). Aucune dépendance Next.js ; utilisable dans toute app React (ex. chez Ben).

## Usage minimal

```tsx
import { MedicalScribe, type ConsultationAnalysis } from '@basevitale/scribe-ui';

<MedicalScribe
  patientId="patient_123"
  apiUrl="/api"
  onComplete={(data: ConsultationAnalysis) => { /* ... */ }}
/>
```

`onCancel` est **optionnel** ; API stricte du plan : `{ patientId, apiUrl, onComplete }`.

## Échafaudage du composant maître

Le widget est **autonome** (State, API, UI) et exportable chez l'hôte.

| Module | Rôle |
|--------|------|
| **`MedicalScribe`** | Composant maître. Props : `patientId`, `apiUrl`, `onComplete` (requis), `onCancel?`, `getToken?`, `showIntelligence?`, `className?`. Construit la config, orchestre Intelligence + Workflow. |
| **`MedicalScribeWorkflow`** | Flux dictée → analyse → correction → validation. State local (phases, draft, ordonnance, codes actes). Recorder + textarea, appels API (process-dictation, patch, validate). |
| **`IntelligencePanel`** | Résumé patient, alertes, timeline (données `GET /scribe/patient/:id/intelligence`). |
| **`usePatientIntelligence`** | Hook fetch intelligence ; skip si pas de `patientId`. |
| **`useSpeechRecognition`** | Hook Web Speech API (micro, streaming texte). |
| **`scribe-client`** | Client fetch vers l'API Scribe (auth via `getToken`). |
| **`config`** | `ScribeConfig` (apiBaseUrl, getToken). |

**Exports publics** : `MedicalScribe`, `MedicalScribeProps`, `ConsultationAnalysis`, `ConsultationData`.

## Documentation

Voir **[INTEGRATION.md](./INTEGRATION.md)** pour :

- Exemple complet et props
- Structure du JSON `onComplete` (`ConsultationAnalysis`)
- Prérequis Tailwind
- Référence des types exportés
