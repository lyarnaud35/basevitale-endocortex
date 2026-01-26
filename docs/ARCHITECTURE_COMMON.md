# Architecture Common - BaseVitale

## 📁 Structure des Utilitaires Communs

```
apps/api/src/common/
├── decorators/
│   └── current-user.decorator.ts     # @CurrentUser(), @CurrentUserId()
├── interceptors/
│   └── transform.interceptor.ts      # Formatage standardisé des réponses
├── pipes/
│   └── zod-validation.pipe.ts        # Validation Zod personnalisée
├── filters/
│   └── http-exception.filter.ts      # Formatage standardisé des erreurs
├── middleware/
│   └── logging.middleware.ts         # Logging HTTP structuré
├── guards/
│   └── auth.guard.ts                 # Garde d'authentification
├── dto/
│   └── api-response.dto.ts           # DTOs pour réponses API
├── services/
│   └── logger.service.ts             # Service de logging personnalisé
├── constants/
│   └── api.constants.ts              # Constantes API
├── helpers/
│   └── knowledge-graph.helper.ts     # Helpers pour Knowledge Graph
└── index.ts                          # Exports centralisés
```

## 🔧 Utilisation

### Decorators

```typescript
import { CurrentUser, CurrentUserId } from '@api/common';

@Controller('patients')
export class PatientController {
  @Post()
  async create(
    @Body() data: CreatePatientDto,
    @CurrentUserId() userId: string, // Extrait l'ID utilisateur
  ) {
    return this.service.create(data, userId);
  }
}
```

### Interceptors

Déjà appliqué globalement dans `main.ts` :
- Toutes les réponses sont formatées : `{ success: true, data: ..., timestamp: ... }`

### Pipes (Validation Zod)

```typescript
import { ZodValidationPipe } from '@api/common';
import { CreatePatientSchema } from '@basevitale/shared';

@Post()
async create(
  @Body(new ZodValidationPipe(CreatePatientSchema)) data: CreatePatient,
) {
  // data est validé et typé automatiquement
}
```

### Filters

Déjà appliqué globalement dans `main.ts` :
- Toutes les erreurs sont formatées : `{ success: false, error: ..., statusCode: ... }`

### Middleware (Logging)

À ajouter dans `AppModule` :

```typescript
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes('*');
  }
}
```

### Guards (Authentification)

```typescript
import { AuthGuard } from '@api/common';

@Controller('patients')
@UseGuards(AuthGuard)
export class PatientController {
  // Routes protégées
}
```

### Helpers Knowledge Graph

```typescript
import {
  findNodeByTypeAndLabel,
  findNodesByType,
  hasClinicalEvidence,
  calculateAverageConfidence,
} from '@api/common';

// Trouver un diagnostic spécifique
const diagnosis = findNodeByTypeAndLabel(nodes, 'DIAGNOSIS', 'Grippe');

// Vérifier la confiance moyenne
const avgConfidence = calculateAverageConfidence(nodes);

// Vérifier si un nœud est une preuve clinique
if (hasClinicalEvidence(node)) {
  // Utilisable pour la facturation
}
```

## 🎯 Avantages

1. **Cohérence** : Format standardisé pour toutes les réponses
2. **Validation** : Validation Zod intégrée automatiquement
3. **Logging** : Logs structurés pour le debug
4. **Réutilisabilité** : Helpers disponibles partout
5. **Type Safety** : Tout est typé avec TypeScript

## 📝 Exemples d'Utilisation

### Exemple complet avec validation

```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { ZodValidationPipe } from '@api/common';
import { CurrentUserId } from '@api/common';
import { CreatePatientSchema } from '@basevitale/shared';

@Controller('patients')
export class PatientController {
  @Post()
  async create(
    @Body(new ZodValidationPipe(CreatePatientSchema)) data: CreatePatient,
    @CurrentUserId() userId: string,
  ) {
    // data est validé et typé
    // userId est extrait automatiquement
    return this.service.create(data, userId);
  }
}
```

### Exemple avec helpers Knowledge Graph

```typescript
import { findNodesByType, calculateAverageConfidence } from '@api/common';

// Dans un service
const symptoms = findNodesByType(nodes, 'SYMPTOM');
const avgConfidence = calculateAverageConfidence(symptoms);

if (avgConfidence < 0.5) {
  logger.warn('Confiance faible dans les symptômes extraits');
}
```

---

*Architecture Common - Réutilisable et cohérent*
