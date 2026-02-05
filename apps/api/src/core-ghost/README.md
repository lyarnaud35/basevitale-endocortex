# GHOST PROTOCOL v999 - CoreGhostModule

## Vue d'ensemble

Le **CoreGhostModule** est le moteur générique qui fait tourner toutes les machines à états finis (State Machines) du système BaseVitale.

### Architecture

```
Backend (Le Cerveau)          Frontend (Le Terminal)
┌─────────────────────┐        ┌─────────────────────┐
│  GhostMachine       │        │  useGhostMachine    │
│  (XState)           │◄──SSE──┤  (React Hook)       │
│                     │        │                     │
│  GhostController    │        │  Composants React   │
│  (SSE Stream)       │        │  (Stateless)        │
└─────────────────────┘        └─────────────────────┘
```

## Les 3 Lois du Ghost Protocol

### LOI I : SOUVERAINETÉ DE L'ÉTAT
- Le Backend est l'**UNIQUE source de vérité**
- Le Frontend envoie des **INTENTIONS** (événements)
- Le Backend répond avec le **NOUVEL ÉTAT**

### LOI II : TRANSITIONS STRICTES
- Chaque machine définit ses états et événements acceptés
- Les événements invalides sont ignorés

### LOI III : TYPAGE INVIOLABLE
- Tout échange Back/Front repose sur des schémas Zod
- Le SDK Frontend est strictement typé

## Utilisation Backend

### 1. Créer une machine métier

```typescript
import { GhostMachine } from '../core-ghost/ghost-machine.abstract';
import { z } from 'zod';
import { createMachine, MachineConfig } from 'xstate';

// Définir le contexte avec Zod
const MyContextSchema = z.object({
  data: z.string(),
  error: z.string().nullable(),
});

type MyContext = z.infer<typeof MyContextSchema>;

// Définir les événements
type MyEvent = 
  | { type: 'START'; payload: { data: string } }
  | { type: 'STOP' };

// Créer la machine
export class MyMachine extends GhostMachine<MyContext, MyEvent, { value: string }> {
  readonly contextSchema = MyContextSchema;
  
  readonly machineConfig: MachineConfig<MyContext, { value: string }, MyEvent> = {
    id: 'myMachine',
    initial: 'IDLE',
    context: {
      data: '',
      error: null,
    },
    states: {
      IDLE: {
        on: {
          START: {
            target: 'RUNNING',
            actions: ({ event, context }) => {
              context.data = event.payload.data;
            },
          },
        },
      },
      RUNNING: {
        on: {
          STOP: 'IDLE',
        },
      },
    },
  };

  setError(error: string): void {
    const context = this.getContext();
    context.error = error;
  }
}
```

### 2. Enregistrer la machine dans le service

```typescript
import { GhostMachineService } from '../core-ghost/ghost-machine.service';

@Injectable()
export class MyModuleService {
  constructor(private readonly ghostMachineService: GhostMachineService) {
    // Créer et enregistrer une instance de machine
    const machine = new MyMachine('my-machine-123', { data: 'initial' });
    this.ghostMachineService.registerMachine('my-machine-123', machine);
  }
}
```

## Utilisation Frontend

### 1. Utiliser le hook `useGhostMachine`

```typescript
import { useGhostMachine } from '@basevitale/ghost-sdk';

function MyComponent() {
  const { state, send, isConnected, error } = useGhostMachine('my-machine-123');

  if (!state) {
    return <div>Chargement...</div>;
  }

  if (error) {
    return <div>Erreur: {error.message}</div>;
  }

  return (
    <div>
      <p>État: {state.value}</p>
      <p>Données: {state.context.data}</p>
      <button onClick={() => send({ type: 'START', payload: { data: 'test' } })}>
        Démarrer
      </button>
    </div>
  );
}
```

## Endpoints API

### GET `/api/ghost/stream/:machineId`
Stream SSE de l'état de la machine en temps réel.

### POST `/api/ghost/machine/:machineId/event`
Envoie un événement à la machine.

**Body:**
```json
{
  "type": "START",
  "payload": { "data": "test" }
}
```

### GET `/api/ghost/machine/:machineId/state`
Récupère l'état actuel de la machine.

### POST `/api/ghost/machine/:machineId/reset`
Réinitialise la machine à son état initial.

## Structure des fichiers

```
apps/api/src/core-ghost/
├── ghost-machine.abstract.ts    # Classe abstraite GhostMachine
├── ghost-machine.service.ts     # Service de gestion des machines
├── ghost.controller.ts          # Controller SSE/REST
├── core-ghost.module.ts         # Module NestJS
└── README.md                     # Cette documentation

libs/ghost-sdk/
├── src/
│   ├── useGhostMachine.ts       # Hook React
│   ├── types.ts                 # Types TypeScript
│   └── index.ts                 # Exports
└── project.json                 # Configuration Nx
```

## Prochaines étapes

1. Migrer le module Scribe pour utiliser `GhostMachine`
2. Créer d'autres machines métier (SecurityMachine, BillingMachine, etc.)
3. Améliorer l'intégration XState avec les actions et guards
