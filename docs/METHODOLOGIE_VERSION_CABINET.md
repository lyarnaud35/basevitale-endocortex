# Méthodologie Géodésique - Version Cabinet

## Diagnostic Topologique

### Point A (Situation)
- Équipe de 2 développeurs
- Utilisation de Cursor IA
- Objectif : Délivrer une version "Cabinet" de BaseVitale

### Point B (Objectif)
Système robuste où **la saisie clinique (Cortex Sémantique) alimente automatiquement la sécurité et la facturation (Socle Invariant) sans redondance**.

## Invariants de Développement (NON-NÉGOCIABLES)

### 1. Priorité à la donnée structurée
**Ne jamais stocker de texte "mort"** ; tout doit être **nœud sémantique**.

### 2. Sécurité par Construction
- **Identité (INS)** : Non-négociable dès le J1
- **Authentification (2FA)** : Non-négociable dès le J1

### 3. L'IA comme Moteur, pas comme Option
Utiliser Cursor non pas pour écrire du code, mais pour **générer la logique des modules B+ et S**.

## Le Chemin Chronologique (4 SPRINTS)

**Stratégie clé** : Bâtir le **Cortex Sémantique en premier**. Si l'IA comprend le patient, le reste du code devient une simple suite de règles déterministes.

---

## SPRINT 1 : La Fondation Invariante (Semaine 1-2)

### Objectif
Créer le **"Ground Truth"** (Vérité Terrain).

### Actions Techniques

#### 1. Base de données PostgreSQL avec pgvector
- Mise en place de PostgreSQL avec extension vectorielle (pgvector) pour le Graphe de Connaissances
- Support des embeddings pour la recherche sémantique

#### 2. Module C+ (Identité/INS)
- **Principe** : Un patient = Un Token unique
- Implémentation du système d'identification unique selon les normes INS
- Gestion du dédoublonnage strict

#### 3. Schéma Prisma
- Schéma respectant les normes INS
- Structure de Knowledge Graph (Nœuds/Liaisons)
- Support des données vectorielles

### Prompt Cursor recommandé
> "Génère un schéma Prisma pour un système de santé respectant les normes INS et incluant une structure de Knowledge Graph (Nœuds/Liaisons)."

---

## SPRINT 2 : Le Cortex Sémantique (Semaine 3-4)

### Objectif
Transformer la **voix/texte en données exploitables**.

### Actions Techniques

#### 1. Intégration Whisper (Transcription)
- API de transcription avec le Module S (Scribe)
- Traitement en temps réel

#### 2. Moteur d'Abstraction
- Utiliser un LLM (via Cursor/OpenAI) pour extraire des symptômes et antécédents
- Transformation en nœuds JSON structurés
- Identification des entités médicales (SNOMED CT)

#### 3. Stockage dans le Graphe
- Transformation de la transcription brute en structure sémantique
- Création automatique des nœuds et relations dans le Knowledge Graph

### Prompt Cursor recommandé
> "Crée un service NestJS qui prend une transcription brute, identifie les entités médicales (SNOMED CT) et retourne un objet structuré pour alimenter mon graphe."

**MÉTA-NOTE** : Si vous réussissez le Sprint 2 (Module S), le produit est déjà vendu. Le reste (Facturation, Agenda) n'est que de la tuyauterie.

---

## SPRINT 3 : L'Automatisme Déterministe (Semaine 5-6)

### Objectif
Facturer et Sécuriser **sans effort humain**.

### Actions Techniques

#### 1. Module E+ (Facturation)
- **Principe** : "Pas de Preuve = Pas de Facture"
- Verrou logique : Si le graphe contient "Acte: Consultation", le module génère le flux T2A/PMSI
- Validation automatique : Bloque si aucun compte-rendu opératoire n'est lié à l'ID de session

#### 2. Module B+ (Codage)
- Suggestion automatique des codes CIM-10 à partir du graphe
- Affichage du score de confiance
- Calibration stricte pour éviter les "erreurs confiantes"

### Prompt Cursor recommandé
> "Écris un validateur de facturation qui interroge le Graphe de Connaissances et bloque la validation si aucun compte-rendu opératoire n'est lié à l'ID de session."

---

## SPRINT 4 : La Boucle de Feedback & Outpass (Semaine 7-8)

### Objectif
Rendre le système **"Antifragile"**.

### Actions Techniques

#### 1. Module L (Feedback)
- Capturer chaque correction du médecin
- Affiner le modèle local avec les corrections
- Spécialisation automatique aux habitudes du praticien

#### 2. Mécanisme d'Outpass
- Autoriser le médecin à briser une règle (ex: prescription hors-protocole)
- Contre une justification causale dictée
- Traçabilité complète des décisions

---

## Méthodologie d'Utilisation Cursor IA

### Traiter Cursor comme un Architecte, pas un simple codeur

| Phase | Méthode Prompting | Rôle Cursor |
|-------|------------------|-------------|
| **Initialisation** | "Voici le PDF de l'architecture Neuro-Symbiotique. Analyse les relations entre Module O et Module S." | Analyseur de Spécifications |
| **Logic-First** | "Implémente la règle déterministe du Module E+ : Aucun GHM ne peut être validé sans nœud clinique de preuve." | Gardien des Invariants |
| **Refactoring** | "Optimise cette fonction pour réduire la latence entre la transcription Whisper et l'insertion dans le Graphe de Connaissances." | Optimiseur de Flux |

### Note Cruciale

Utilisez le fichier `.cursorrules` à la racine de votre projet pour y inscrire les **"Invariants Indéformables"** de BaseVitale, par exemple :

> "Toute donnée médicale doit passer par le moteur d'Abstraction avant stockage"

---

## MÉTA-NOTE IMPORTANTE

**L'effondrement causal** montre que le plus grand risque pour 2 développeurs est **la dispersion**.

En cabinet, la **"douleur" principale est la saisie**. Si vous réussissez le **Sprint 2 (Module S)**, le produit est déjà vendu. Le reste (Facturation, Agenda) n'est que de la tuyauterie que Cursor peut générer en quelques heures.

**Priorité absolue** : Concentrez-vous sur le Cortex Sémantique (Module S) avant tout.

---

*Source : VERSION CABINET METHODO.pdf - Méthodologie Géodésique (V-CABINET)*
