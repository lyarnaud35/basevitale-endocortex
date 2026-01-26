# Sprint 3 : Préparation - Automatisme Déterministe

## 🎯 Objectif

**Facturer et Sécuriser sans effort humain**

## ✅ Préparations Effectuées

### 1. Schémas Zod Créés ✅

#### Billing (Module E+)
**Fichier** : `libs/shared/src/contracts/billing.schema.ts`

- ✅ `BillingEventSchema` : Événement de facturation complet
- ✅ `CreateBillingEventSchema` : Création d'événement
- ✅ `ClinicalEvidenceSchema` : Preuve clinique justificative
- ✅ `BillingValidationSchema` : Validation de facturation
- ✅ Support GHM, CCAM, types d'actes
- ✅ Statuts de facturation (PENDING, VALIDATED, TRANSMITTED, REJECTED)

**RÈGLE INVARIANTE** : `evidence` est **OBLIGATOIRE** dans `CreateBillingEventSchema`

#### Coding (Module B+)
**Fichier** : `libs/shared/src/contracts/coding.schema.ts`

- ✅ `CodingSuggestionSchema` : Suggestion avec score de confiance
- ✅ `CodingRequestSchema` : Demande de codage
- ✅ `CodingResponseSchema` : Réponse avec suggestions
- ✅ `CodingCorrectionSchema` : Correction pour Module L (Feedback)
- ✅ Support CIM-10 et CIM-11
- ✅ Gestion des données manquantes
- ✅ Alternatives si confiance faible

**RÈGLE** : Toujours fournir un `confidence` score (0-1)

### 2. Service de Validation (Module E+) ✅

**Fichier** : `apps/api/src/billing/billing-validation.service.ts`

#### Fonctionnalités implémentées

1. **`validateClinicalEvidence()`**
   - Vérifie que tous les nœuds de preuve existent dans le Knowledge Graph
   - Vérifie que les nœuds appartiennent à la consultation
   - Valide le type de preuve selon les règles métier

2. **`hasEvidenceForAct()`**
   - Vérifie qu'une consultation a une preuve pour un type d'acte
   - Mapping intelligent acte → types de nœuds requis

3. **`canBillAct()`** ⭐ **RÈGLE PRINCIPALE**
   - Implémente "Pas de Preuve = Pas de Facture"
   - Bloque la facturation si aucune preuve trouvée

#### Règles de validation

- **OPÉRATIVE_REPORT** : Doit avoir au moins un nœud `PROCEDURE` ou `ACT`
- **LAB_RESULT** : Doit avoir un nœud `LAB_RESULT` ou `CONSTANT`
- **CONSULTATION_NOTE** : Doit avoir au moins un `SYMPTOM` ou `DIAGNOSIS`

### 3. Structure Prisma ✅

Le schéma Prisma contient déjà :
- ✅ Table `BillingEvent` avec `evidenceNodeIds`
- ✅ Relation avec `Consultation`
- ✅ Support des statuts de facturation

---

## 🚧 À Implémenter dans Sprint 3

### Module E+ (Facturation) - À FAIRE

1. **Service Billing** (`billing.service.ts`)
   - Créer événement de facturation
   - Valider avec `BillingValidationService`
   - Générer flux T2A/PMSI
   - Télétransmission

2. **Contrôleur Billing** (`billing.controller.ts`)
   - `POST /billing/events` - Créer événement
   - `POST /billing/events/:id/validate` - Valider (vérifie preuve)
   - `POST /billing/events/:id/transmit` - Transmettre
   - `GET /billing/consultations/:id/events` - Lister événements

3. **Intégration avec Knowledge Graph**
   - Auto-détection des preuves lors de la création
   - Suggestion automatique des codes GHM/CCAM depuis les nœuds

### Module B+ (Codage) - À FAIRE

1. **Service Coding** (`coding.service.ts`)
   - Analyser Knowledge Graph d'une consultation
   - Suggérer codes CIM-10/11 avec confiance
   - Filtrer par seuil de confiance minimum
   - Améliorer avec données manquantes

2. **Amélioration ScribeService**
   - Intégrer suggestions de codage dans l'extraction
   - Ajouter codes CIM aux nœuds DIAGNOSIS automatiquement

3. **Contrôleur Coding** (`coding.controller.ts`)
   - `POST /coding/suggest` - Suggérer codes
   - `POST /coding/validate` - Valider/corriger code

---

## 📋 Workflow Préparé

### Facturation (Module E+)

```typescript
// 1. Créer événement de facturation
const billingEvent = await billingService.create({
  consultationId,
  actType: 'CONSULTATION',
  ghmCode: '02A01',
  evidence: {
    nodeIds: ['node1', 'node2'],
    evidenceType: 'CONSULTATION_NOTE',
  },
});

// 2. Valider (vérifie automatiquement les preuves)
const validation = await billingValidationService.validateClinicalEvidence(
  billingEvent.evidence,
  consultationId,
);

if (!validation.valid) {
  // Blocage : pas de preuve = pas de facture
  throw new Error(validation.message);
}

// 3. Marquer comme validé
await billingService.validate(billingEvent.id);
```

### Codage (Module B+)

```typescript
// 1. Demander suggestions
const response = await codingService.suggest({
  consultationId,
  context: { nodeIds: ['node1', 'node2'] },
  minConfidence: 0.4,
});

// 2. Filtrer par confiance
const highConfidence = response.suggestions.filter(
  (s) => s.confidence >= 0.7,
);

// 3. Si confiance faible, afficher warning
if (response.warnings) {
  console.warn('Confiance faible:', response.warnings);
}
```

---

## ✅ Avantages de cette Préparation

1. **Schémas Zod prêts** : Types stricts et validation
2. **Service de validation fonctionnel** : Règle "Pas de Preuve = Pas de Facture" implémentée
3. **Structure Prisma existante** : Tables prêtes dans le schéma
4. **Architecture claire** : Séparation des responsabilités

---

## 🎯 Prochaines Étapes Sprint 3

1. Implémenter `BillingService` complet
2. Implémenter `CodingService` avec IA
3. Créer les contrôleurs REST
4. Intégrer avec le Knowledge Graph existant
5. Tester le workflow complet

---

*Préparation Sprint 3 - Base solide pour démarrer*
