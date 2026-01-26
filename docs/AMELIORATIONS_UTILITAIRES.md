# Améliorations - Utilitaires Avancés

## 🔧 Nouvelles Fonctionnalités

### 1. Validators Personnalisés ✅

#### CUID Validator
**Fichier** : `apps/api/src/common/validators/cuid.validator.ts`

Valide qu'une chaîne est un CUID valide (format: `c` + 25 caractères alphanumériques).

**Utilisation** :
```typescript
import { IsCuid } from '@api/common';

class MyDto {
  @IsCuid()
  id: string;
}
```

#### INS Token Validator
**Fichier** : `apps/api/src/common/validators/ins-token.validator.ts`

Valide qu'un token INS est valide (13 chiffres).

**Utilisation** :
```typescript
import { IsInsToken } from '@api/common';

class CreatePatientDto {
  @IsInsToken()
  insToken: string;
}
```

---

### 2. Middleware Request ID ✅

**Fichier** : `apps/api/src/common/middleware/request-id.middleware.ts`

Ajoute un ID unique à chaque requête pour le tracing et le debugging.

**Fonctionnalités** :
- Génère un ID unique par requête
- Ajoute `X-Request-Id` dans les headers de réponse
- Accessible via `@RequestId()` decorator

**Utilisation** :
```typescript
@Get()
async getData(@RequestId() requestId: string) {
  this.logger.log(`Processing request ${requestId}`);
}
```

**Intégration** : Déjà intégré dans `AppModule` (appliqué en premier).

---

### 3. Decorator Pagination ✅

**Fichier** : `apps/api/src/common/decorators/pagination.decorator.ts`

Récupère automatiquement les paramètres de pagination depuis la query string.

**Utilisation** :
```typescript
import { Pagination, normalizePagination, createPaginationResult } from '@api/common';

@Get()
async getPatients(
  @Pagination() pagination: PaginationParams,
) {
  const { skip, take, page, limit } = normalizePagination(
    pagination.page,
    pagination.limit,
  );
  
  const [data, total] = await this.prisma.$transaction([
    this.prisma.patient.findMany({ skip, take }),
    this.prisma.patient.count(),
  ]);
  
  return createPaginationResult(data, total, page, limit);
}
```

**Query Parameters** :
- `?page=1` - Numéro de page (défaut: 1)
- `?limit=20` - Nombre d'éléments par page (défaut: 20, max: 100)
- `?skip=10` - Nombre d'éléments à sauter (alternative à page)

---

### 4. Utilitaires UUID ✅

**Fichier** : `apps/api/src/common/utils/uuid.util.ts`

Fonctions pour générer des IDs uniques légers.

**Fonctions** :
- `generateShortId()` - 8 caractères hex
- `generateMediumId()` - 16 caractères hex
- `simpleHash(str)` - Hash simple d'une chaîne

---

### 5. Utilitaires Pagination ✅

**Fichier** : `apps/api/src/common/utils/pagination.util.ts`

Fonctions pour gérer la pagination.

**Types** :
```typescript
interface PaginationParams {
  page?: number;
  limit?: number;
  skip?: number;
}

interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}
```

**Fonctions** :
- `normalizePagination(page, limit)` - Normalise et valide les paramètres
- `createPaginationResult(data, total, page, limit)` - Crée la réponse paginée

---

## 📋 Exemple Complet : Endpoint Paginé

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { Pagination, normalizePagination, createPaginationResult } from '@api/common';
import { AuthGuard } from '@api/common';
import { IdentityService } from '../identity/identity.service';

@Controller('identity/patients')
@UseGuards(AuthGuard)
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Get()
  async getPatients(
    @Pagination() pagination: PaginationParams,
  ) {
    const { skip, take, page, limit } = normalizePagination(
      pagination.page,
      pagination.limit,
    );

    const [patients, total] = await Promise.all([
      this.prisma.patient.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.patient.count(),
    ]);

    return createPaginationResult(patients, total, page, limit);
  }
}
```

**Réponse** :
```json
{
  "success": true,
  "data": [
    { "id": "...", "firstName": "Jean", ... }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrevious": false
  }
}
```

---

## ✅ Avantages

1. **Validation** : Validators personnalisés pour INS et CUID
2. **Tracing** : Request ID pour suivre les requêtes
3. **Pagination** : Standardisée et réutilisable
4. **Utilitaires** : UUID légers et hash simples

---

*Améliorations Utilitaires - Fonctionnalités avancées ajoutées*
