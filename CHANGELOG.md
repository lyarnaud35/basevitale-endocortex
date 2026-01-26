# Changelog - BaseVitale

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

## [Unreleased]

### ✨ Ajouté
- **Module C+ (Identité)** : Gestion complète des patients avec INS
- **Module S (Scribe)** : Extraction Knowledge Graph depuis texte
- **Module E+ (Facturation)** : Service de facturation avec validation automatique
- **Module B+ (Codage)** : Codage automatique CIM-10/11 avec scores de confiance
- **Module L (Feedback)** : Capture des corrections pour apprentissage
- **Sécurité Enterprise** : Rate limiting, RBAC, Sanitization, Security headers
- **Monitoring Complet** : Logging, Métriques, Performance tracking, Health checks
- **Utilitaires Complets** : 28+ helpers réutilisables
- **Scripts Automatisés** : Setup, validation, tests
- **Documentation Exhaustive** : 50+ documents

### 🔒 Sécurité
- Rate limiting (100 req/min global, 10/min création)
- RBAC avec 5 rôles
- Sanitization complète
- Security HTTP headers
- Crypto utilities sécurisés

### 📊 Monitoring
- Logging structuré avec Request ID
- Métriques complètes
- Performance tracking
- Health checks (App + DB)

### ⚡ Performance
- Cache service et interceptor
- Optimisations Prisma
- Pagination standardisée
- Timeout protection

### 🛠️ Robustesse
- 3 exception filters (HTTP, DB, Global)
- Retry automatique
- Timeout protection
- Validation multi-niveaux

---

## [1.0.0] - Version Initiale

### Architecture
- Architecture Neuro-Symbiotique
- Modules C+, S, E+, B+, L
- Knowledge Graph structuré
- PostgreSQL + pgvector

### Fonctionnalités
- Gestion patients (INS)
- Extraction sémantique
- Facturation avec validation
- Codage automatique
- Feedback system

---

*Changelog - BaseVitale Version Cabinet*
