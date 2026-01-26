# Utilitaires Complets - BaseVitale

## 📚 Tous les Utilitaires Disponibles

### Utilitaires de Base (21)

#### Date & Time
1. **date.helper.ts** - Formatage dates, calcul âge, validation dates
2. **date-range.util.ts** - Plages de dates (jour, semaine, mois, année)

#### String
3. **string.util.ts** - Truncate, capitalize, masquage données sensibles

#### Array
4. **array.util.ts** - groupBy, unique, partition, chunk, flatten
5. **batch.util.ts** - Traitement par lots (séquentiel et parallèle)

#### Validation
6. **validation.helper.ts** - Validation email, téléphone, dates, CUID, INS

#### Sanitization
7. **sanitize.util.ts** - Nettoyage chaînes, emails, téléphones, objets

#### Prisma & Database
8. **prisma.helper.ts** - Optimisations requêtes, pagination, recherche
9. **query.util.ts** - Construction filtres Prisma (recherche, dates, IN)

#### Pagination
10. **pagination.util.ts** - Normalisation, création résultats paginés

#### Cache
11. **cache.helper.ts** - getOrSetCache, génération clés cache

#### Error Handling
12. **error.helper.ts** - Erreurs standardisées (BadRequest, NotFound, etc.)

#### Performance
13. **performance.util.ts** - measureExecutionTime, debounce, throttle, memoize

#### Async
14. **async.util.ts** - retry, withTimeout, debounceAsync, pLimit, batch

#### Crypto
15. **crypto.util.ts** - sha256/512, generateSecureToken, secureCompare, hmac

#### Format
16. **format.util.ts** - formatCurrency, formatDate, formatFrenchPhone

#### Environment
17. **env.util.ts** - getEnv, getEnvBoolean, getEnvNumber, validateRequiredEnv

#### Logger
18. **logger.util.ts** - createLogger, formatLog, logError, logPerformance

#### Transform
19. **transform.util.ts** - mapObject, omit, pick, nullToUndefined, cleanObject

#### File
20. **file.util.ts** - getFileExtension, formatFileSize, validateFileSize

#### Type Checking
21. **type.util.ts** - isDefined, isObject, isNonEmptyArray, getOrDefault

#### Context
22. **context.util.ts** - getRequest, getResponse, getParams, getUser, etc.

#### Response
23. **response.helper.ts** - sendSuccess, sendError, sendCreated, sendPaginated

#### Deep Merge
24. **deep-merge.util.ts** - deepMerge, deepMergeAll

#### Delay
25. **delay.util.ts** - delayMs, timeout, retryWithBackoff

#### UUID
26. **uuid.util.ts** - generateShortId, generateMediumId, simpleHash

#### Metrics
27. **metrics.util.ts** - withMetrics, recordOperation

---

## 🎯 Utilisation Recommandée

### Pattern: Get or Set Cache
```typescript
import { getOrSetCache } from '@api/common';

const patient = await getOrSetCache(
  this.cacheService,
  `patient:${id}`,
  () => this.prisma.patient.findUnique({ where: { id } }),
  3600 * 1000, // 1 heure
);
```

### Pattern: Retry avec Backoff
```typescript
import { retryWithBackoff } from '@api/common';

const result = await retryWithBackoff(
  () => this.externalApi.call(),
  3, // maxAttempts
  1000, // initialDelay
  10000, // maxDelay
);
```

### Pattern: Traitement par Lots
```typescript
import { processBatch } from '@api/common';

const results = await processBatch(
  items,
  100, // batchSize
  async (batch) => {
    return this.service.processBatch(batch);
  },
);
```

### Pattern: Metrics Wrapper
```typescript
import { withMetrics } from '@api/common';

const result = await withMetrics(
  this.metricsService,
  'database.query',
  () => this.prisma.patient.findMany(),
);
```

---

## ✅ Résultat

**28+ utilitaires** complets et réutilisables pour tous les cas d'usage !

---

*Utilitaires Complets - BaseVitale*
