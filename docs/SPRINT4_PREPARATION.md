# Sprint 4 : Boucle de Feedback & Outpass - PRÉPARÉ

## 🎯 Objectif

**Rendre le système "Antifragile"** : le système s'améliore grâce aux erreurs et corrections.

## ✅ Préparations Effectuées

### 1. Schémas Zod Créés ✅

#### Feedback (Module L)
**Fichier** : `libs/shared/src/contracts/feedback.schema.ts`

- ✅ `FeedbackEventSchema` : Événement de feedback complet
- ✅ `CreateFeedbackEventSchema` : Création d'événement
- ✅ `CodingFeedbackSchema` : Spécialisé pour corrections de codage
- ✅ `TranscriptionFeedbackSchema` : Spécialisé pour corrections de transcription
- ✅ Support de tous les types d'entités

#### Outpass
**Fichier** : `libs/shared/src/contracts/outpass.schema.ts`

- ✅ `OutpassRequestSchema` : Demande d'outpass
- ✅ `OutpassSchema` : Outpass approuvé/rejeté
- ✅ Types de règles supportées
- ✅ Justification causale obligatoire

### 2. Service Feedback (Module L) - COMPLET ✅

**Fichier** : `apps/api/src/feedback/feedback.service.ts`

#### Fonctionnalités implémentées

1. **`createFeedbackEvent()`**
   - Enregistre un événement de feedback
   - Validation Zod
   - Déclenche analyse pour apprentissage

2. **`recordCodingCorrection()`**
   - Spécialisé pour corrections de codage CIM
   - Capture la valeur originale et corrigée
   - Contexte complet (consultation, patient)

3. **`getFeedbacksForEntity()`**
   - Récupère tous les feedbacks pour une entité
   - Utile pour voir l'historique des corrections

4. **`getFeedbackStats()`**
   - Statistiques de feedback
   - Patterns de correction
   - Par type d'entité

#### Contrôleur REST
**Fichier** : `apps/api/src/feedback/feedback.controller.ts`

- ✅ `POST /api/feedback/events` - Créer feedback
- ✅ `POST /api/feedback/coding` - Correction de codage
- ✅ `GET /api/feedback/entities/:id` - Feedbacks d'une entité
- ✅ `GET /api/feedback/stats` - Statistiques

---

## 🚧 À Implémenter dans Sprint 4

### Module L - Amélioration Continue

1. **Analyse des Patterns**
   - Identifier les corrections fréquentes
   - Calculer les deltas (écarts)
   - Créer des règles d'apprentissage

2. **Fine-tuning des Modèles**
   - Ajuster les poids des modèles locaux
   - Personnaliser selon le praticien/service
   - Améliorer les scores de confiance

3. **Dashboard de Feedback**
   - Visualiser les corrections
   - Identifier les patterns
   - Mesurer l'amélioration

### Mécanisme d'Outpass

1. **Service Outpass**
   - Créer demande d'outpass
   - Validation de justification
   - Workflow d'approbation

2. **Intégration avec Modules**
   - Outpass pour prescription bloquée
   - Outpass pour facturation bloquée
   - Traçabilité complète

---

## 📋 Structure Prisma ✅

Le schéma Prisma contient déjà :
- ✅ Table `FeedbackEvent` avec tous les champs
- ✅ Support des types d'entités
- ✅ Stockage des valeurs originales/corrigées

---

## 🎯 Concept "Antifragile"

### Principe

Le système s'améliore grâce aux erreurs :

1. **L'IA suggère** un code/diagnostic (confiance 70%)
2. **Le médecin corrige** → Feedback capturé
3. **Le système apprend** → Prochaines suggestions améliorées
4. **Spécialisation locale** → Adapté au service/praticien

### Exemple

```typescript
// Semaine 1 : IA suggère "Grippe" (confiance 70%)
// Médecin corrige → "Covid long"

// Semaine 2 : Mêmes symptômes
// IA suggère "Covid long" (confiance 85%) grâce au feedback

// Résultat : Le système s'est spécialisé
```

---

## ✅ Avantages de cette Préparation

1. **Schémas Zod prêts** : Types stricts et validation
2. **Service Feedback fonctionnel** : Capture des corrections
3. **Structure Prisma existante** : Tables prêtes
4. **Endpoints REST** : API prête pour utilisation

---

## 🎯 Prochaines Étapes Sprint 4

1. Implémenter l'analyse des patterns
2. Implémenter le fine-tuning des modèles
3. Créer le service Outpass complet
4. Intégrer avec tous les modules
5. Créer dashboard de feedback

---

*Préparation Sprint 4 - Base solide pour apprentissage continu*
