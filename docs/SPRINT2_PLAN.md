# Sprint 2 : Le Cortex Sémantique (Semaine 3-4)

## 🎯 Objectif

Transformer la **voix/texte en données exploitables** (Knowledge Graph).

**MÉTA-NOTE CRITIQUE** : Si vous réussissez le Sprint 2 (Module S), le produit est déjà vendu. Le reste (Facturation, Agenda) n'est que de la tuyauterie.

## 📋 Actions Techniques

### 1. Intégration Whisper (Transcription)

#### Objectif
Intégrer l'API Whisper pour la transcription audio en temps réel.

#### Implémentation
- Service de transcription dans le Module S (Scribe)
- Support du streaming audio
- Stockage de la transcription brute dans `Consultation.rawTranscript`

#### Fichiers à créer
- `apps/api/src/scribe/transcription.service.ts`
- Intégration avec OpenAI Whisper API ou modèle local

### 2. Moteur d'Abstraction (Extraction sémantique)

#### Objectif
Utiliser un LLM pour extraire des symptômes et antécédents et les transformer en nœuds JSON structurés.

#### Workflow
1. Recevoir transcription brute (Whisper)
2. Envoyer au LLM avec le schéma `KnowledgeGraphSchema`
3. Recevoir nœuds sémantiques structurés
4. Créer les nœuds et relations dans PostgreSQL

#### Schéma Zod à utiliser
- `KnowledgeGraphSchema` (déjà créé dans `libs/shared/src/contracts/knowledge-graph.schema.ts`)

#### Service à créer/améliorer
- Améliorer `apps/api/src/scribe/scribe.service.ts` :
  - Ajouter méthode `extractKnowledgeGraph(text: string, patientId: string)`
  - Utiliser le schéma `KnowledgeGraphSchema` pour l'extraction
  - Créer les nœuds dans la base via Prisma

### 3. Stockage dans le Knowledge Graph

#### Objectif
Transformer la transcription brute en structure sémantique dans PostgreSQL.

#### Implémentation
- Service pour créer les nœuds sémantiques
- Service pour créer les relations
- Validation avec Zod avant insertion

#### Services à créer
- `apps/api/src/knowledge-graph/knowledge-graph.service.ts`
- Méthodes :
  - `createNodes(nodes: CreateSemanticNode[])`
  - `createRelations(relations: CreateSemanticRelation[])`
  - `buildGraphFromExtraction(extraction: KnowledgeGraph, consultationId: string)`

### 4. Endpoint de traitement complet

#### Endpoint à créer
```
POST /scribe/transcribe-and-extract
```

#### Flux
1. Recevoir audio (ou texte)
2. Si audio : transcrire avec Whisper → `rawTranscript`
3. Extraire Knowledge Graph depuis le texte
4. Créer Consultation (status: DRAFT)
5. Créer les nœuds sémantiques
6. Créer les relations
7. Retourner Consultation avec Knowledge Graph

## 📁 Structure de fichiers

```
apps/api/src/
├── scribe/
│   ├── scribe.module.ts (existant, à améliorer)
│   ├── scribe.service.ts (existant, à améliorer)
│   ├── transcription.service.ts (nouveau)
│   └── knowledge-graph.service.ts (nouveau)
└── knowledge-graph/
    ├── knowledge-graph.module.ts (nouveau)
    ├── knowledge-graph.service.ts (nouveau)
    └── knowledge-graph.controller.ts (optionnel)
```

## 🔧 Technologies

### Transcription
- **Option 1 (Recommandée pour dev)** : OpenAI Whisper API via SDK Node.js
- **Option 2 (Production)** : Whisper local avec modèle optimisé

### Extraction sémantique
- Utiliser le service existant `ScribeService` qui supporte déjà :
  - MOCK (Faker)
  - CLOUD (OpenAI)
  - LOCAL (Python Sidecar)

### Prompt système recommandé
```
Vous êtes un assistant médical expert. Votre tâche est d'extraire les informations médicales d'une transcription de consultation et de les structurer en un graphe de connaissances.

Extrayez :
- Symptômes mentionnés
- Diagnostics suggérés ou posés
- Médicaments prescrits ou mentionnés
- Antécédents médicaux
- Constantes vitales ou résultats de laboratoire
- Actes médicaux effectués

Pour chaque entité, fournissez :
- Un libellé clair
- Un code SNOMED CT si vous pouvez l'identifier
- Un code CIM-10/11 si applicable
- Des relations entre les entités (causes, précède, associé avec, etc.)

Retournez strictement un objet JSON conforme au schéma KnowledgeGraph fourni.
```

## ✅ Checklist Sprint 2

### Phase 1 : Transcription
- [ ] Service de transcription créé
- [ ] Intégration Whisper (OpenAI API ou local)
- [ ] Test avec fichier audio simple
- [ ] Stockage `rawTranscript` dans Consultation

### Phase 2 : Extraction sémantique
- [ ] Amélioration de `ScribeService` pour utiliser `KnowledgeGraphSchema`
- [ ] Prompt système optimisé
- [ ] Test d'extraction depuis transcription exemple
- [ ] Validation Zod des nœuds extraits

### Phase 3 : Stockage Knowledge Graph
- [ ] Service `KnowledgeGraphService` créé
- [ ] Méthodes pour créer nœuds et relations
- [ ] Intégration avec Prisma
- [ ] Tests de création de graphe complet

### Phase 4 : Intégration complète
- [ ] Endpoint `/scribe/transcribe-and-extract` créé
- [ ] Flux complet testé (audio → transcription → extraction → graphe)
- [ ] Gestion des erreurs
- [ ] Logging approprié

## 🎯 Prompt Cursor recommandé (Phase 2)

> "Crée un service NestJS qui prend une transcription brute, identifie les entités médicales (SNOMED CT) et retourne un objet structuré pour alimenter mon graphe."

## 📊 Métriques de succès

Le Sprint 2 est réussi si :
- ✅ Une transcription audio peut être convertie en nœuds sémantiques
- ✅ Les nœuds sont correctement liés avec des relations
- ✅ Le graphe peut être interrogé pour retrouver les informations
- ✅ Le système fonctionne en mode MOCK, CLOUD et LOCAL

## 🔗 Références

- Schéma Zod : `libs/shared/src/contracts/knowledge-graph.schema.ts`
- Architecture : `docs/CONTEXTE_ARCHITECTURE.md`
- Méthodologie : `docs/METHODOLOGIE_VERSION_CABINET.md`
