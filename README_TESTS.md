# Guide des Tests et Interface - BaseVitale

## 🧪 Tests Unitaire

### Installation des Dépendances

Les dépendances Jest sont déjà configurées dans Nx. Si nécessaire, installez les dépendances de test :

```bash
npm install --save-dev @nestjs/testing jest @types/jest ts-jest
```

### Exécution des Tests

#### Tous les tests
```bash
npm test
```

#### Tests de l'API uniquement
```bash
nx test api
```

#### Tests avec couverture de code
```bash
nx test api --coverage
```

#### Test d'un fichier spécifique
```bash
nx test api --testPathPattern=identity.service.spec
```

### Tests Disponibles

- ✅ `identity.service.spec.ts` - Tests du service Identity
- ✅ `billing.service.spec.ts` - Tests du service Billing
- ✅ `coding.service.spec.ts` - Tests du service Coding
- ✅ `knowledge-graph.service.spec.ts` - Tests du service Knowledge Graph

---

## 🌐 Interface Web

### Configuration

L'interface utilise la variable d'environnement `NEXT_PUBLIC_API_URL` pour se connecter à l'API.

Créer un fichier `.env.local` dans `apps/web/` :

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### Démarrage

#### Interface Web (Next.js)
```bash
npm run dev:web
```

Ou avec Nx directement :
```bash
nx serve web
```

L'interface sera accessible sur : `http://localhost:4200` (ou le port configuré)

#### API Backend
```bash
npm run dev:api
```

L'API sera accessible sur : `http://localhost:3000`

### Pages Disponibles

- **`/`** - Page d'accueil avec navigation vers tous les modules
- **`/identity`** - Module C+ : Gestion des patients
- **`/scribe`** - Module S : Transcription et analyse
- **`/coding`** - Module B+ : Suggestions de codes CIM-10/11
- **`/billing`** - Module E+ : Facturation
- **`/knowledge-graph`** - Knowledge Graph sémantique
- **`/feedback`** - Module L : Feedback et corrections
- **`/health`** - Health check et métriques

---

## 🎨 Fonctionnalités de l'Interface

### Design
- Interface moderne avec Tailwind CSS
- Design responsive (mobile-friendly)
- Gestion des états de chargement
- Affichage des erreurs

### Fonctionnalités par Module

#### Module C+ - Identité
- ✅ Création de patient
- ✅ Recherche par critères
- ✅ Affichage des résultats

#### Module S - Scribe
- ✅ Analyse de consultation
- ✅ Extraction de Knowledge Graph
- ✅ Affichage structuré des résultats

#### Module B+ - Codage
- ✅ Suggestions depuis consultation ID
- ✅ Suggestions depuis texte libre
- ✅ Slider pour confiance minimale
- ✅ Affichage visuel des suggestions

#### Module E+ - Facturation
- ✅ Création d'événement
- ✅ Validation
- ✅ Transmission
- ✅ Workflow complet

#### Knowledge Graph
- ✅ Récupération des nœuds d'une consultation
- ✅ Affichage structuré

#### Module L - Feedback
- ✅ Soumission de feedback
- ✅ Support pour différents types d'entités
- ✅ Feedback spécialisé pour codage

#### Health & Métriques
- ✅ Statut de santé de l'application
- ✅ Statut de la base de données
- ✅ Affichage des métriques
- ✅ Actualisation en temps réel

---

## 🔧 Développement

### Structure des Tests

Les tests suivent le pattern NestJS standard :

```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [ServiceName, ...mocks],
    }).compile();
    
    service = module.get<ServiceName>(ServiceName);
  });
  
  it('should do something', async () => {
    // Test implementation
  });
});
```

### Structure de l'Interface

L'interface utilise Next.js 14 avec App Router :

```
apps/web/
├── app/
│   ├── layout.tsx          # Layout principal
│   ├── page.tsx            # Page d'accueil
│   ├── identity/
│   │   └── page.tsx        # Page Identity
│   ├── billing/
│   │   └── page.tsx        # Page Billing
│   └── ...
```

---

## 📝 Notes Importantes

### Authentification

L'interface utilise actuellement un token de test : `Bearer test-token`

**Pour la production**, il faudra :
1. Implémenter un système d'authentification réel
2. Stocker le token de manière sécurisée
3. Gérer le refresh token

### Gestion des Erreurs

L'interface affiche les erreurs de manière basique. Pour la production :
- Améliorer les messages d'erreur
- Ajouter un système de notifications
- Gérer les erreurs réseau (timeout, etc.)

---

## ✅ Checklist

- [x] Tests unitaires pour les services principaux
- [x] Interface web avec pages pour tous les modules
- [x] Design responsive et moderne
- [x] Gestion des erreurs
- [x] États de chargement
- [ ] Tests d'intégration E2E
- [ ] Authentification réelle
- [ ] Gestion des erreurs avancée
- [ ] Tests pour les controllers
- [ ] Tests pour les guards/interceptors

---

**Status** : ✅ **Tests et Interface Basiques Fonctionnels**

---

*Guide des Tests et Interface - BaseVitale Version Cabinet*
