# @basevitale/ghost-sdk

SDK Frontend **Ghost Protocol** – Cerveau Unifié (Gardien C+ et Stratège B+) pour BaseVitale.

---

## Concepts clés

**Le Backend décide, le Frontend affiche.**  
Le SDK ne fait qu'exposer l'état et les intentions. Toute logique métier (sécurité, facturation, règles NGAP) est côté serveur. Tu envoies une intention (ex. valider une facture), le backend répond par un nouvel état.

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

## Facturation (NGAP) – Module Billing

### Concept

Le moteur de facturation est **Server-Driven** (Ghost Protocol). Le backend calcule les montants et les parts (AMO / AMC / patient) ; règles ALD et arrondis à 2 décimales côté API.

### `useBillingSimulation(acts, options?)`

Hook pour afficher en temps réel le total et le détail Sécu/Mutuelle à partir d’une liste de codes actes (C, V, MD, G, etc.).

```tsx
import { setBaseUrl, useBillingSimulation } from '@basevitale/ghost-sdk';

setBaseUrl(process.env.NEXT_PUBLIC_API_URL ?? '');

function Caisse() {
  const [acts, setActs] = useState<string[]>(['C', 'K']);
  const { total, partSecu, partPatient, rulesApplied, loading, error } = useBillingSimulation(
    acts,
    { patientId: 'scenario-jean-peuplu' }
  );

  return (
    <>
      {loading && <span>Calcul…</span>}
      {!loading && (
        <>
          <p>Total : {total.toFixed(2)} €</p>
          <p>Part Sécu : {(partSecu ?? 0).toFixed(2)} €</p>
          <p>Reste à charge : {(partPatient ?? 0).toFixed(2)} €</p>
          <p>Règles : {rulesApplied?.join(', ')}</p>
        </>
      )}
    </>
  );
}
```

**Retour :** `{ total, partSecu, partMutuelle, partPatient, rulesApplied, loading, error, data, refetch }`. Ex. scénario Jean + C : `amount_patient: 0`, `rulesApplied: ["ALD 100%"]`.

**Scénarios de démo :** `scenario-jean-peuplu` (ALD 100 %), `scenario-paul-normal` (70 % Sécu / 30 % patient). Actes : C, V, K.

**Mise à jour des règles NGAP :** Modifier `apps/api/src/billing/rules/ngap_2024.json`, puis redémarrer l’API (ou appeler `POST /api/admin/rules/reload`). Le service réinjecte le JSON au chargement.

---

## Médicaments (Deep Roots / BDPM)

### `useDrugSearch()`

Hook avec debounce (300 ms) pour la recherche hybride (nom commercial + substance). Idéal pour un champ de saisie type “Caisse”.

```tsx
import { useDrugSearch } from '@basevitale/ghost-sdk';

function MedicamentInput() {
  const { search, results, isLoading, error } = useDrugSearch({ limit: 20 });

  return (
    <>
      <input placeholder="Doliprane, Paracéta…" onChange={(e) => search(e.target.value)} />
      {isLoading && <span>Recherche…</span>}
      <ul>
        {results.map((d) => (
          <li key={d.id}>
            {d.label} <span className="badge">{d.type === 'Brand' ? 'Marque' : 'Générique'}</span>
          </li>
        ))}
      </ul>
    </>
  );
}
```

**Retour :** `{ search, query, debouncedQuery, results, isLoading, error, options }`. `options` = `{ value: id, label }[]` pour un `<Select />`.

### `usePosologyTemplate(cis)`

Template de posologie (unité, défaut, instructions) pour un CIS donné. À utiliser quand l’utilisateur a sélectionné un médicament.

```tsx
const { data } = usePosologyTemplate(selectedCis);
// data: { unit: 'cp', default: '1 matin, 1 soir', max: '4/j', instructions: '…' }
```

---

## Cookbook (Recettes)

### Comment chercher un médicament ?

```tsx
import { useDrugSearch, formatDrugPrice, formatDrugRefundRate } from '@basevitale/ghost-sdk';

function SearchDrug() {
  const { search, results, isLoading } = useDrugSearch({ limit: 20 });
  return (
    <>
      <input placeholder="Doliprane…" onChange={(e) => search(e.target.value)} />
      {results.map((d) => (
        <li key={d.id}>{d.label} – {formatDrugPrice(d.price)}</li>
      ))}
    </>
  );
}
```

### Comment calculer un devis ?

```tsx
import { useBillingQuote } from '@basevitale/ghost-sdk';

const mutate = useBillingQuote();
mutate.mutate({ patientId: 'scenario-paul-normal', acts: ['C'], modifiers: ['NUIT'] });
// onSuccess: data.total, data.lines
```

### Comment valider une facture ?

```tsx
import { useValidateInvoice } from '@basevitale/ghost-sdk';

const { mutate, isPending } = useValidateInvoice();
mutate({ patientId: 'scenario-paul-normal', acts: ['C'], modifiers: ['NUIT'] });
// onSuccess: facture { id, totalAmount, status: 'VALIDATED' }
```

---

## Glossaire

| Terme | Description |
|-------|-------------|
| **Quote** | Devis – calcul temporaire (actes + majorations). Non persisté. |
| **Invoice** | Facture – entité persistée après validation. Statuts : DRAFT, VALIDATED, TRANSMITTED, PAID. |
| **Snapshot** | Contexte figé (âge, actes) au moment de la validation. Immuable (Ledger). |
| **AMO** | Part obligatoire – montant Sécu. |
| **MEG** | Majoration Enfant (< 6 ans). |
| **NUIT** | Modificateur consultation de nuit. |

---

## Autres exports

- **`setBaseUrl(url)`** / **`getBaseUrl()`** – Configuration de l’URL de l’API.
- **`analyzeFullContext(body)`** – Appel direct à `POST /api/orchestrator/analyze` (sans debounce).
- **`useGhostMachine`** – Hook pour les machines Ghost via SSE.
- **`useGetPatientDashboardState`** – Hook React Query pour le dashboard patient.
- **`useFiscalPrediction(acts, options?)`** – Prédiction fiscale (détail complet) ; `useBillingSimulation` en est un alias simplifié.
- **`useInvoiceLifecycle(invoiceId)`** – Cycle de vie facture (FSM) : statut, `availableActions`, `transition(action)`.
- **`useValidateInvoice`** – Mutation pour valider une facture (Ledger).
- **`useBillingQuote`** – Mutation pour calculer un devis.
- **`useDailyActivity`** – Liste des factures du jour + CA.

Types : `BillingQuote`, `ValidateInvoiceInput`, `ValidateInvoiceResult`, `DrugResult`, `FiscalPredictionResult`, etc.
