# Utilitaires Avancés - BaseVitale

## 🔧 Services et Helpers Supplémentaires

### 1. CacheService ✅

**Fichier** : `apps/api/src/common/services/cache.service.ts`

Service de cache en mémoire pour optimiser les performances.

**Fonctionnalités** :
- ✅ Cache avec TTL (Time To Live)
- ✅ Nettoyage automatique des entrées expirées
- ✅ Méthodes : `get()`, `set()`, `delete()`, `has()`, `clear()`

**Note** : En production, remplacer par Redis (via BullMQ)

**Utilisation** :
```typescript
constructor(private readonly cache: CacheService) {}

async getPatient(id: string) {
  const cached = this.cache.get<Patient>(`patient:${id}`);
  if (cached) {
    return cached;
  }

  const patient = await this.prisma.patient.findUnique({...});
  this.cache.set(`patient:${id}`, patient, 3600 * 1000); // 1h
  return patient;
}
```

### 2. Date Helpers ✅

**Fichier** : `apps/api/src/common/helpers/date.helper.ts`

**Fonctions** :
- `formatDate()` - Formatage de dates
- `calculateAge()` - Calcul d'âge depuis date de naissance
- `isPast()` / `isFuture()` - Vérifications temporelles
- `isValidConsultationDate()` - Validation date consultation

### 3. Error Helpers ✅

**Fichier** : `apps/api/src/common/helpers/error.helper.ts`

**Fonctions** :
- `createBadRequestError()` - Erreur 400
- `createNotFoundError()` - Erreur 404
- `createConflictError()` - Erreur 409
- `createUnauthorizedError()` - Erreur 401
- `createForbiddenError()` - Erreur 403

**Utilisation** :
```typescript
import { createNotFoundError } from '@api/common';

if (!patient) {
  throw createNotFoundError('Patient', id);
}
```

### 4. Cache Decorator ✅

**Fichier** : `apps/api/src/common/decorators/cache.decorator.ts`

Decorator pour mettre en cache automatiquement les méthodes.

**Note** : Nécessite un interceptor pour fonctionner (à implémenter)

---

## 📚 Helpers Knowledge Graph

**Fichier** : `apps/api/src/common/helpers/knowledge-graph.helper.ts`

**Fonctions disponibles** :
- `findNodeByTypeAndLabel()` - Trouver un nœud spécifique
- `findNodesByType()` - Filtrer par type
- `findNodeRelations()` - Relations d'un nœud
- `hasClinicalEvidence()` - Vérifier preuve clinique
- `calculateAverageConfidence()` - Confiance moyenne
- `buildRelationGraph()` - Construire graphe de relations

---

## 🎯 Patterns Recommandés

### Pattern 1 : Cache + Fallback

```typescript
async getWithCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 3600 * 1000,
): Promise<T> {
  const cached = this.cache.get<T>(key);
  if (cached) {
    return cached;
  }

  const value = await fetchFn();
  this.cache.set(key, value, ttl);
  return value;
}
```

### Pattern 2 : Validation + Erreurs Standardisées

```typescript
import { createNotFoundError, createBadRequestError } from '@api/common';

const patient = await this.prisma.patient.findUnique({ where: { id } });
if (!patient) {
  throw createNotFoundError('Patient', id);
}

if (patient.insToken !== expectedToken) {
  throw createBadRequestError('INS token mismatch');
}
```

---

*Utilitaires Avancés - Outils pour développement efficace*
