# Architecture : CodingStrategistService multi-tenant (Registry)

## Objectif

Un **cerveau XState par session** : isolation stricte, zéro fuite de données entre utilisateurs (Docteur A / Docteur B).

---

## 1. Registry (Map)

```
┌─────────────────────────────────────────────────────────────────┐
│  CodingStrategistService                                         │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  registry: Map<sessionId, SessionEntry>                      │ │
│  │                                                              │ │
│  │  session-abc  →  { actor, createdAt, lastActivityAt }       │ │
│  │  session-xyz  →  { actor, createdAt, lastActivityAt }       │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

- **Clé** : `sessionId` (string, fourni par le client ou par l’auth). Doit être validé (non vide, pas de caractères interdits).
- **Valeur** : `SessionEntry` = `{ actor, createdAt, lastActivityAt }` pour éventuel TTL / éviction des sessions inactives.

---

## 2. Cycle de vie

| Méthode | Rôle |
|--------|------|
| `getOrCreateActor(sessionId)` | Si absent → créer machine + actor, `start()`, enregistrer dans la Map. Retourne l’actor. |
| `updateInput(sessionId, text)` | `getOrCreateActor(sessionId)` puis `actor.send({ type: 'INPUT_UPDATED', text })`. Met à jour `lastActivityAt`. |
| `getSnapshot(sessionId)` | Récupère l’actor pour ce `sessionId` ; si absent → retourner état “vide” (IDLE, pas de suggestions). Sinon `actor.getSnapshot()` et formater en DTO. |
| `destroySession(sessionId)` (optionnel) | `actor.stop()`, supprimer de la Map. Pour déconnexion / logout. |

**Règle d’isolation** : Aucune méthode ne prend ou ne retourne de données sans `sessionId`. Aucune requête ne peut accéder à la session d’un autre.

---

## 3. Contraintes de sécurité

- **Validation** : Rejeter `sessionId` vide ou non conforme (ex. alphanum + tirets, longueur max).
- **Pas de liste globale** : Pas d’API “lister toutes les sessions” en prod (réservé au debug/admin si besoin).
- **Logs** : Ne jamais logger de contenu métier (texte saisi, suggestions) avec le sessionId ; au plus “sessionId utilisé” ou “session créée / détruite”.

---

## 4. Évolutions possibles

- **TTL** : Tâche périodique qui supprime les entrées où `lastActivityAt` > seuil (ex. 30 min).
- **Cap** : Nombre max de sessions par instance ; refuser nouvelle session si dépassement.
- **WebSocket** : Chaque entrée peut garder un `Subject` ou une liste de listeners pour pousser les `STATE_CHANGE` à ce seul client (identifié par le même `sessionId`).

---

## 5. API HTTP (rétrocompat)

- `POST /coding/strategist/input` : body `{ sessionId, text }` (si absent, `sessionId` = valeur par défaut pour le lab, ex. `"default"`).
- `GET /coding/strategist/state?sessionId=xxx` : état de la machine pour cette session uniquement.

Le contrôleur valide `sessionId` et délègue au service toutes les opérations par session.
