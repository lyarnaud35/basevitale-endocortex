# Optimisations Résilience - BaseVitale

## 🎯 **AMÉLIORATIONS OPTIMALES IMPLÉMENTÉES**

### **1. Health Check Avancé**

**Fichier:** `apps/api/src/common/utils/health-check.util.ts`

Utilitaires pour vérifications de santé robustes :

- ✅ `measureLatency()` - Mesure précise de la latence
- ✅ `createHealthResult()` - Résultats standardisés
- ✅ `determineOverallStatus()` - Statut global intelligent

**Usage:**
```typescript
const { result, latency } = await measureLatency(() => prisma.patient.findMany());
const health = createHealthResult('healthy', latency);
```

---

### **2. Circuit Breaker Pattern**

**Fichier:** `apps/api/src/common/utils/circuit-breaker.util.ts`

Protection contre les cascades de défaillances :

- ✅ États : CLOSED, OPEN, HALF_OPEN
- ✅ Timeout configurable
- ✅ Auto-réinitialisation après resetTimeout
- ✅ Détection automatique des échecs

**Usage:**
```typescript
const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  successThreshold: 2,
  timeout: 5000,
  resetTimeout: 30000,
});

const result = await circuitBreaker.execute(() => externalService.call());
```

---

### **3. Retry avec Backoff Exponentiel**

**Fichier:** `apps/api/src/common/utils/retry.util.ts`

Retry intelligent avec backoff exponentiel :

- ✅ `retryWithBackoff()` - Retry avec backoff exponentiel
- ✅ `retryWithCondition()` - Retry conditionnel
- ✅ Configuration flexible (maxAttempts, delays, etc.)

**Usage:**
```typescript
const result = await retryWithBackoff(
  () => apiCall(),
  {
    maxAttempts: 3,
    initialDelay: 100,
    maxDelay: 5000,
    backoffMultiplier: 2,
  }
);
```

---

### **4. Rate Limiter Intelligent**

**Fichier:** `apps/api/src/common/services/rate-limiter.service.ts`

Rate limiting avec sliding window :

- ✅ Sliding window pour rate limiting précis
- ✅ Support multi-clés (par utilisateur, IP, etc.)
- ✅ Nettoyage automatique des fenêtres expirées
- ✅ Métriques de requêtes restantes

**Usage:**
```typescript
@Injectable()
export class MyService {
  constructor(private readonly rateLimiter: RateLimiterService) {}

  async processRequest(userId: string) {
    if (!this.rateLimiter.isAllowed(userId, 100, 60000)) {
      throw new TooManyRequestsException();
    }
    // Traiter la requête
  }
}
```

---

### **5. Circuit Breaker Interceptor**

**Fichier:** `apps/api/src/common/interceptors/circuit-breaker.interceptor.ts`

Protection automatique au niveau des intercepteurs :

- ✅ Appliqué automatiquement aux méthodes
- ✅ Protection par méthode/classe
- ✅ Gestion d'erreurs ServiceUnavailableException

**Usage:**
```typescript
@UseInterceptors(CircuitBreakerInterceptor)
@Controller('api')
export class MyController {
  // Automatiquement protégé
}
```

---

## 🏆 **BÉNÉFICES**

### **Résilience**
- ✅ Protection contre les cascades de défaillances
- ✅ Auto-récupération automatique
- ✅ Retry intelligent avec backoff

### **Performance**
- ✅ Rate limiting précis
- ✅ Prévention de surcharge
- ✅ Monitoring avancé de la santé

### **Observabilité**
- ✅ Métriques de latence
- ✅ Statut de santé détaillé
- ✅ Logging des événements critiques

---

## 📊 **INTÉGRATION**

Tous les utilitaires sont exportés via `@basevitale/common` et peuvent être utilisés dans tout le système.

**Exports disponibles:**
```typescript
import {
  CircuitBreaker,
  retryWithBackoff,
  measureLatency,
  createHealthResult,
} from '../common';
```

---

**Status:** ✅ **OPTIMISATIONS RÉSILIENCE COMPLÉTÉES**

---

*Optimisations Résilience - BaseVitale V112+*
