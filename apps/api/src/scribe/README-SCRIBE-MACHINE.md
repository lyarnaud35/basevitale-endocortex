# ScribeMachine - Implémentation XState v5

## Vue d'ensemble

La `ScribeMachine` est implémentée avec **XState v5** en utilisant `setup()` pour un typage strict. Elle étend `GhostMachine` et s'intègre avec le système Ghost Protocol.

## Architecture

```
scribe.machine.ts          scribe-ghost-machine.ts
┌──────────────────┐      ┌──────────────────────┐
│ setup()          │      │ ScribeGhostMachine   │
│ - States         │─────▶│ extends GhostMachine │
│ - Actions        │      │                      │
│ - Actors         │      │ - initializeMachine()│
│ - Guards         │      │ - setError()         │
└──────────────────┘      └──────────────────────┘
```

## États et Transitions

### IDLE
- **Entrée** : État initial de la machine
- **Événements acceptés** :
  - `START` → Transition vers `RECORDING`
  - `RESET` → Reste en `IDLE` (déjà en IDLE)

### RECORDING
- **Entrée** : Après événement `START`
- **Événements acceptés** :
  - `UPDATE_TEXT` → Met à jour `context.transcript` (pas de changement d'état)
  - `STOP` → Transition vers `PROCESSING`
  - `RESET` → Transition vers `IDLE`

### PROCESSING
- **Entrée** : Après événement `STOP`
- **Comportement** : 
  - **CRITIQUE** : Invoke un Actor (`fromPromise`) qui simule l'analyse NLP
  - Délai de 2 secondes (simulation du temps de traitement IA)
  - Extraction d'entités médicales du transcript
- **Transitions automatiques** :
  - `onDone` → Transition vers `REVIEW` avec entités assignées
  - `onError` → Transition vers `IDLE` avec erreur assignée
- **Événements acceptés** :
  - `RESET` → Transition vers `IDLE`

### REVIEW
- **Entrée** : Après traitement NLP réussi
- **Événements acceptés** :
  - `UPDATE_TEXT` → Permet correction manuelle (pas de changement d'état)
  - `CONFIRM` → Transition vers `SAVED`
  - `RESET` → Transition vers `IDLE`

### SAVED
- **Entrée** : Après événement `CONFIRM`
- **Type** : `final` (état terminal)
- **Événements acceptés** :
  - `RESET` → Transition vers `IDLE` (pour nouveau cycle)

## Simulation IA (Mock Robuste)

L'état `PROCESSING` utilise un Actor `fromPromise` qui simule :

1. **Délai de 2 secondes** : Simule le temps de traitement
2. **Extraction d'entités** : Analyse simple du transcript pour détecter :
   - Fièvre
   - Toux
   - Maux de tête
   - Fatigue
   - Douleur
3. **Création d'une consultation structurée** : Génère un objet `Consultation` conforme au schéma Zod

```typescript
const simulateNlpAnalysis = fromPromise(async ({ input }) => {
  await new Promise(resolve => setTimeout(resolve, 2000));
  // ... extraction d'entités et création consultation
  return { entities, consultation };
});
```

## Utilisation

### Création d'une instance

```typescript
import { ScribeGhostMachine } from './scribe-ghost-machine';
import { GhostMachineService } from '../core-ghost/ghost-machine.service';

// Dans un service NestJS
const machine = new ScribeGhostMachine('scribe-session-123', {
  patientId: 'patient-456',
});

// Enregistrer dans le service
ghostMachineService.registerMachine('scribe-session-123', machine);
```

### Envoi d'événements

```typescript
// Démarrer l'enregistrement
await ghostMachineService.sendEvent('scribe-session-123', {
  type: 'START',
  payload: { patientId: 'patient-456' },
});

// Mettre à jour le transcript
await ghostMachineService.sendEvent('scribe-session-123', {
  type: 'UPDATE_TEXT',
  payload: { text: 'Le patient présente une fièvre et une toux.' },
});

// Arrêter et déclencher l'analyse
await ghostMachineService.sendEvent('scribe-session-123', {
  type: 'STOP',
  payload: { transcript: 'Le patient présente une fièvre et une toux.' },
});

// La machine transitionne automatiquement : PROCESSING -> REVIEW

// Confirmer la consultation
await ghostMachineService.sendEvent('scribe-session-123', {
  type: 'CONFIRM',
  payload: { structuredData: { /* corrections optionnelles */ } },
});
```

### Récupération de l'état

```typescript
const state = ghostMachineService.getState('scribe-session-123');
console.log(state.value); // 'REVIEW'
console.log(state.context.entities); // ['Fièvre', 'Toux']
console.log(state.context.consultation); // Consultation structurée
```

## Avantages de XState v5 avec setup()

1. **Typage strict** : TypeScript valide les transitions à la compilation
2. **Actions typées** : Les actions `assign` sont typées selon le contexte
3. **Actors typés** : Les Actors (comme `fromPromise`) sont typés
4. **Événements discriminés** : Les événements sont validés selon leur type
5. **IntelliSense complet** : Autocomplétion dans l'IDE

## Migration depuis l'ancienne implémentation

L'ancienne `ScribeMachine` (dans `scribe-machine.ts`) utilisait une implémentation manuelle. La nouvelle `ScribeGhostMachine` :

- ✅ Utilise XState v5 avec `setup()`
- ✅ S'intègre avec `GhostMachineService`
- ✅ Supporte le streaming SSE automatiquement
- ✅ Respecte les 3 lois du Ghost Protocol
- ✅ Simulation IA robuste (mock) pour les tests

## Prochaines étapes

1. **Remplacer l'appel mock par l'appel réel** : Remplacer `simulateNlpAnalysis` par un appel à l'API Python (ai-cortex)
2. **Ajouter la gestion du draftId** : Créer le draft dans Postgres lors de la transition vers REVIEW
3. **Intégrer avec le contrôleur** : Utiliser `ScribeGhostMachine` dans `ScribeController`
