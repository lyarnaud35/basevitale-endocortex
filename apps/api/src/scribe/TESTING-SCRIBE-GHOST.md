# Test de la ScribeMachine avec SSE

## Vue d'ensemble

Ce guide explique comment tester le système ScribeMachine avec Server-Sent Events (SSE) en utilisant `curl`.

## Validation du contrat de transport

NestJS sérialise l’état XState en JSON pour le SSE. Pour éviter les erreurs (références circulaires, propriétés non énumérables) :

- **Sanitization** : `toSerializableState()` dans `ScribeGhostService` produit un objet uniquement avec `value`, `context`, `updatedAt`. Le `context` est passé par `JSON.parse(JSON.stringify(context))` pour supprimer tout élément non sérialisable.
- **Fallback** : en cas d’exception lors de cette copie, un contexte minimal est renvoyé.
- **Controller** : un `try/catch` autour de `JSON.stringify(state)` envoie un message d’erreur minimal si la sérialisation échoue.

## Prérequis

1. L'API NestJS doit être démarrée : `npm run dev:api`
2. Le port par défaut est `3000` (vérifier dans votre configuration)

## Test en 2 terminaux (victoire = RECORDING dans le stream)

### Terminal 1 : Écouter le stream SSE (le "pouls" de la machine)

```bash
curl -N http://localhost:3000/api/ghost-scribe/stream/default \
  -H "Accept: text/event-stream"
```

Ou avec le script : `./scripts/test-scribe-sse.sh stream`

**Résultat attendu** : État initial (IDLE), puis après le POST START du Terminal 2, une ligne avec `"value":"RECORDING"`.

Exemple de ligne SSE :
```
data: {"value":"IDLE","context":{"patientId":"","transcript":"","entities":[],"status":"idle","consultation":null,"draftId":null,"error":null},"updatedAt":"2026-02-04T..."}
```

### Terminal 2 : Envoyer START

```bash
curl -X POST http://localhost:3000/api/ghost-scribe/events/default \
  -H "Content-Type: application/json" \
  -d '{"type":"START","payload":{"patientId":"patient-123"}}'
```

Ou : `./scripts/test-scribe-sse.sh send-start`

**Victoire** : Si le Terminal 1 affiche une ligne SSE avec `"value":"RECORDING"`, la logique backend est validée (contrat de transport + transitions).

#### 2. Mettre à jour le transcript (UPDATE_TEXT)

```bash
curl -X POST http://localhost:3000/api/ghost-scribe/events/test-session-1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "UPDATE_TEXT",
    "payload": {
      "text": "Le patient présente une fièvre et une toux."
    }
  }'
```

**Résultat attendu** : Le Terminal 1 devrait afficher une mise à jour avec le nouveau transcript.

#### 3. Arrêter l'enregistrement (STOP)

```bash
curl -X POST http://localhost:3000/api/ghost-scribe/events/test-session-1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "STOP",
    "payload": {
      "transcript": "Le patient présente une fièvre et une toux."
    }
  }'
```

**Résultat attendu** :
1. Transition immédiate vers `PROCESSING`
2. Après ~2 secondes (simulation IA), transition automatique vers `REVIEW` avec les entités extraites :
```
data: {"value":"PROCESSING","context":{...},"updatedAt":"..."}
... (attente 2 secondes) ...
data: {"value":"REVIEW","context":{"entities":["Fièvre","Toux"],"consultation":{...},"updatedAt":"..."}}
```

#### 4. Confirmer la consultation (CONFIRM)

```bash
curl -X POST http://localhost:3000/api/ghost-scribe/events/test-session-1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "CONFIRM",
    "payload": {}
  }'
```

**Résultat attendu** : Transition vers `SAVED` (état final) :
```
data: {"value":"SAVED","context":{"status":"saved",...},"updatedAt":"..."}
```

#### 5. Réinitialiser (RESET)

```bash
curl -X POST http://localhost:3000/api/ghost-scribe/events/test-session-1 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "RESET",
    "payload": {}
  }'
```

**Résultat attendu** : Retour à `IDLE` :
```
data: {"value":"IDLE","context":{...},"updatedAt":"..."}
```

## Endpoints disponibles

### GET `/api/scribe/stream/:sessionId`
Stream SSE de l'état de la machine en temps réel.

### POST `/api/scribe/events/:sessionId`
Envoie un événement à la machine. Body :
```json
{
  "type": "START" | "STOP" | "UPDATE_TEXT" | "CONFIRM" | "RESET",
  "payload": { ... }
}
```

### GET `/api/ghost-scribe/state/:sessionId`
Récupère l'état actuel de la machine (sans SSE).

### POST `/api/ghost-scribe/reset/:sessionId`
Réinitialise la machine à IDLE.

## Vérification du succès

✅ **Victoire** si :
1. Le Terminal 1 affiche les changements d'état en temps réel
2. Les transitions sont correctes (IDLE → RECORDING → PROCESSING → REVIEW → SAVED)
3. Les entités sont extraites après le STOP (simulation IA)
4. Le contexte est mis à jour correctement à chaque événement

## Dépannage

### Le stream ne se connecte pas
- Vérifier que l'API est démarrée
- Vérifier l'authentification (token valide)
- Vérifier les logs du serveur pour les erreurs

### Les événements ne déclenchent pas de transitions
- Vérifier que le body JSON est valide
- Vérifier que l'événement est accepté dans l'état actuel
- Consulter les logs du serveur pour les warnings

### Le stream se ferme immédiatement
- Vérifier que le client supporte SSE (curl -N)
- Vérifier les logs du serveur pour les erreurs de sérialisation

## Notes techniques

- Les états sont émis via `onTransition()` de XState
- Le format SSE est : `data: {JSON}\n\n`
- Les objets complexes sont sérialisés en JSON automatiquement
- Le callback `setStateChangeCallback()` émet les états dans le Subject RxJS
