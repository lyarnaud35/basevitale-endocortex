# @basevitale/ghost-sdk

SDK Frontend **Ghost Protocol** – Cerveau Unifié (Gardien C+ et Stratège B+) pour BaseVitale.

---

## Installation

Dans ton app React/Next.js, le SDK est consommé via l’alias du monorepo `@basevitale/ghost-sdk`. Aucune installation npm supplémentaire : le workspace Nx fournit le package.

**Configurer l’URL de l’API** (obligatoire si l’API n’est pas sur la même origine) :

```ts
import { setBaseUrl, useConsultationScanner } from '@basevitale/ghost-sdk';

// Au démarrage de l’app (ex. dans un layout ou _app)
setBaseUrl('http://localhost:3000'); // ou process.env.NEXT_PUBLIC_API_URL
```

**Utiliser le hook Scanner** :

```tsx
import { useConsultationScanner } from '@basevitale/ghost-sdk';

function MyConsultationInput() {
  const [text, setText] = useState('');
  const { securityState, suggestions, isScanning, isError, errorMessage } = useConsultationScanner(text);

  return (
    <>
      <textarea value={text} onChange={(e) => setText(e.target.value)} />
      {isError && <p role="alert">{errorMessage}</p>}
      {isScanning && <span>Analyse…</span>}
      {/* Afficher securityState (SAFE / BLOCKED / UNKNOWN) et suggestions */}
    </>
  );
}
```

---

## API Reference

### `useConsultationScanner(text, options?)`

Hook qui envoie le texte à l’orchestrateur (endpoint fusion C+ et B+) après un debounce, et expose sécurité + suggestions.

| Paramètre   | Type     | Description                                      |
|------------|----------|--------------------------------------------------|
| `text`     | `string` | Texte saisi (ex. zone médecin)                   |
| `options`  | `object` | Optionnel. Voir `UseConsultationScannerOptions`. |

**Options :**

| Propriété    | Type      | Défaut  | Description                                |
|-------------|-----------|--------|--------------------------------------------|
| `debounceMs`| `number`  | `500`  | Délai en ms avant l’appel API              |
| `patientId` | `string`  | -      | Identifiant patient pour le Gardien        |
| `enabled`   | `boolean` | `true` | Si `false`, aucun appel n’est effectué     |

**Valeur retournée (`UseConsultationScannerResult`) :**

| Propriété        | Type                    | Description |
|------------------|-------------------------|-------------|
| `securityState`  | `'SAFE' \| 'BLOCKED' \| 'UNKNOWN'` | État dérivé du Gardien (C+) : vert / rouge / gris. |
| `suggestions`    | `CodingSuggestionItem[]` | Liste des codes CIM-10 suggérés par le Stratège (B+). |
| `isScanning`     | `boolean`                | `true` pendant la requête (après debounce). |
| `error`          | `Error \| null`          | Objet erreur si échec (réseau, backend éteint, etc.). |
| `isError`        | `boolean`                | `true` si une erreur s’est produite (pratique pour l’UI). |
| `errorMessage`   | `string`                 | Message lisible (vide si pas d’erreur). |
| `data`           | `object \| null`          | Dernière réponse brute `{ security, suggestions }`. |

**Type `CodingSuggestionItem` (chaque élément de `suggestions`) :**

```ts
interface CodingSuggestionItem {
  code: string;      // ex. "R50.9"
  label: string;    // ex. "Fièvre, sans précision"
  confidence: number; // 0..1, ex. 0.9
}
```

**Sécurité (champ `security` dans `data`) :**  
Contient `value` (`'SECURE' | 'LOCKED' | 'IDLE' | 'ANALYZING'`), `context.blockReason` en cas de blocage, et `canSubmit`.

---

## Guide de démo – Mots-clés « magiques »

En mode **Smart Mocks** (sans vraie IA), le backend réagit à des mots-clés dans le texte. Utilise-les pour valider l’UI.

### Sécurité (Gardien C+)

| Entrée contenant…      | Résultat affiché      |
|------------------------|------------------------|
| **Pénicilline**, **Amoxicilline** | **BLOCKED** (rouge) – *Allergie connue aux bêtalactamines* |
| Autre (ex. Doliprane, ou rien)   | **SAFE** (vert) – Rien à signaler |

### Codage (Stratège B+)

| Entrée contenant… | Code CIM-10 suggéré |
|-------------------|----------------------|
| **Fièvre**        | R50.9 – Fièvre, sans précision |
| **Toux**          | R05 – Toux |
| **Grippe**        | J11 – Grippe avec manifestations respiratoires |
| **Migraine**, **céphalée** | G43.9 – Migraine, sans précision |
| **Diabète**       | E11 – Diabète de type 2 |

### Scénarios de test recommandés

1. **Allergie** : *"Patient présente une forte fièvre. Prescription de Pénicilline alors qu'il est allergique connu."*  
   → BLOCKED + suggestions (ex. R50.9).

2. **OK** : *"Doliprane pour céphalée."*  
   → SAFE + suggestion G43.9.

3. **Multi-symptômes** : *"Fièvre, toux et diabète."*  
   → SAFE + R50.9, R05, E11.

---

## Gestion d’erreurs

En cas de **backend éteint**, **réseau coupé** ou **réponse API invalide** :

- Le hook **ne fait pas crasher** l’app : l’erreur est capturée dans un `try/catch`.
- Tu disposes de **`isError`** (booléen) et **`errorMessage`** (string) pour afficher un bandeau ou un message dans l’UI.
- `suggestions` reste un tableau (vide) et `securityState` reste `UNKNOWN` tant qu’aucune réponse valide n’a été reçue.

Exemple d’affichage :

```tsx
{isError && (
  <div role="alert" className="text-red-600">
    {errorMessage}
  </div>
)}
```

---

## Autres exports

- **`setBaseUrl(url)`** / **`getBaseUrl()`** – Configuration de l’URL de l’API.
- **`analyzeFullContext(body)`** – Appel direct à `POST /api/orchestrator/analyze` (sans debounce).
- **`useGhostMachine`** – Hook pour les machines Ghost via SSE.
- **`useGetPatientDashboardState`** – Hook React Query pour le dashboard patient.

Types : `SecurityStatus`, `UseConsultationScannerOptions`, `UseConsultationScannerResult`, `AnalyzeFullContextResponse`, `AnalyzeFullContextBody`, etc.
