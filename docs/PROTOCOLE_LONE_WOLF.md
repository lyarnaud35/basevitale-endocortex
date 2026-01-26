# Protocole "LONE WOLF" (v160.0)

## Philosophie

**"Code Once, Run everywhere"**. Tout le métier est en TypeScript. Le Python n'est qu'un utilitaire muet.

## Contexte

Pour un développeur seul, l'ennemi n'est pas la complexité technique, mais **la charge cognitive**. Gérer deux langages (TS/Python), trois bases de données et l'orchestration infrastructurelle peut mener au burnout avant la fin du MVP.

Cette méthodologie applique une réduction drastique de la maintenance en rendant le code Python **générique et immuable**, pour que vous n'ayez plus jamais à y toucher après le Jour 3.

## L'Architecture : Le "GENERIC SIDECAR"

Au lieu de coder des endpoints spécifiques dans le Python (ex: `extract_symptoms`, `extract_meds`) qui vous obligent à modifier le Python à chaque changement métier, nous créons un **Moteur d'Extraction Universel**.

### 1. Le Monorepo (Nx)
Toujours présent, c'est votre filet de sécurité.

### 2. Le Sidecar Python (Simplifié)

- **Un seul endpoint** : `POST /process-generic`
- **Il reçoit** : 
  ```json
  {
    "text": "string",
    "schema": "json_schema",
    "systemPrompt": "string"
  }
  ```
- **Il fait** : Appel Ollama/Instructor avec ce schéma spécifique
- **Il renvoie** : Le JSON structuré

**Gain** : Si vous ajoutez un champ "Allergie" dans votre application, vous modifiez uniquement le Zod Schema dans le TypeScript. Le Python s'adapte dynamiquement sans redéploiement ni modification de code.

## La Stack "SOLO" (Efficacité Maximale)

### Front (Next.js) & Back (NestJS)
- Restent séparés pour la propreté
- Partagent 100% du typage via les libs

### Infrastructure (Docker)
- **Postgres + Neo4j + Redis** (Invariants)
- **Ollama** : Uniquement pour la fin du projet

### Mode Développement (Le "Cheat Mode")

- Utilisez **exclusivement une API Cloud (OpenAI/Groq)** pendant tout le développement fonctionnel (`AI_MODE=CLOUD`)
- **Ne lancez jamais Ollama en local** tant que la feature n'est pas finie
- Gardez votre RAM pour votre IDE et Docker

## Le Flux de Développement (La "RÈGLE DES 3 TEMPS")

Pour ne pas vous disperser, suivez cet ordre strict pour chaque feature :

### Temps 1 : Le "Fake" (UI & Zod)

1. Définissez le Schema Zod (ex: `ConsultationSchema`) dans `libs/shared`
2. Créez le Front avec des données bouchonnées (Faker) qui respectent ce schéma
3. **Objectif** : Valider l'UX médecin sans écrire une ligne de backend

### Temps 2 : La Logique (NestJS + Postgres)

1. Créez le service NestJS qui reçoit les données (Draft) et les stocke en JSONB dans Postgres
2. Implémentez la validation (Draft -> Neo4j)
3. **Objectif** : Le système marche parfaitement avec des données manuelles

### Temps 3 : L'Intelligence (Le Branchement)

1. Connectez le service NestJS au "Generic Sidecar"
2. NestJS envoie le texte + `zodToJsonSchema(ConsultationSchema)`
3. **Objectif** : Remplacer la saisie manuelle par l'IA

## Roadmap "LONE WOLF" (10 JOURS)

Un sprint commando pour un seul développeur.

### JOUR 1 : Le Socle Invariant

- Init Nx (`apps/api`, `apps/web`)
- Docker Compose (Postgres, Neo4j, Redis)
- **Action Clé** : Créez `libs/shared/src/contracts` et mettez-y tous vos types. C'est votre seule source de vérité.

### JOUR 2 : Le Sidecar Universel (Python)

- Setup FastAPI simple
- Implémentez l'endpoint unique qui prend un `json_schema` en entrée et utilise `instructor` pour contraindre la sortie
- Testez-le avec curl et un schéma simple
- **Figez le code Python. N'y touchez plus.**

### JOUR 3 : L'Orchestrateur (NestJS)

- Service `AiGateway` dans NestJS
- **Logique** :
  - Si `AI_MODE=MOCK` -> Return Mock
  - Si `AI_MODE=CLOUD` -> Appel OpenAI (via SDK Node direct, pas besoin de passer par Python pour le Cloud)
  - Si `AI_MODE=LOCAL` -> Appel Sidecar Python (le seul moment où on l'utilise)

### JOUR 4-6 : Le Cœur "Scribe" (UI First)

- **J4** : Front Audio (Stream brut). Stockage du texte brut dans Postgres
- **J5** : Interface de correction (Shadcn Form généré depuis le Zod Schema)
- **J6** : Le "Commit". Bouton Valider -> Transaction Postgres (Status Validated) + Écriture Neo4j

### JOUR 7 : La Facturation (Gardien)

- Une seule requête Cypher : *"Est-ce que le patient a un nœud Consultation aujourd'hui ?"*
- Si oui -> OK. Sinon -> Bloque.

### JOUR 8-9 : L'Intégration IA

- Activez le `AI_MODE=CLOUD`
- Testez le flux réel : Audio -> Texte -> Structuration -> JSON
- Réglez les prompts (System Prompt) directement dans NestJS (que vous envoyez au Python/OpenAI)

### JOUR 10 : La "Souveraineté" (Switch Local)

- Lancez Ollama
- Passez `AI_MODE=LOCAL`
- Vérifiez que le Sidecar Python reçoit bien le schéma et qu'Ollama obéit

## Principes Architecturaux (Invariants)

### 1. UNIVERSAL PYTHON WORKER

- Le service Python (`apps/ai-cortex`) est un **DUMB GENERIC WORKER**
- Il expose **UN SEUL endpoint** : `POST /process-generic`
- Il accepte : `{ text: string, schema: JSONSchema, systemPrompt: string }`
- Il **NE CONTIENT JAMAIS de logique métier**. Toute la logique reste dans NestJS

### 2. LOGIC CENTRALIZATION (NestJS)

- Tous les schémas Zod vivent dans `libs/shared`
- NestJS convertit Zod to JSON Schema à l'exécution avant d'appeler Python
- Les System Prompts sont définis dans les services NestJS, **pas** dans le code Python

### 3. DEV VELOCITY (MOCK FIRST)

- Toujours implémenter un `MockAiService` en premier
- Utiliser `process.env.AI_MODE` ('MOCK', 'CLOUD', 'LOCAL')
- En mode 'CLOUD', bypass Python et appeler OpenAI directement depuis Node.js pour économiser la RAM
- Utiliser le Service Python uniquement en mode 'LOCAL'

### 4. DATA FLOW

- **Drafts** sont JSONB dans Postgres (No migration fatigue)
- **Neo4j** est **UNIQUEMENT** mis à jour sur l'événement "Validation"
- **Billing** ne lit **QUE** Neo4j

## Pourquoi c'est Optimal ?

1. **Zéro Maintenance Python** : Une fois le script générique écrit (J2), vous ne codez plus qu'en TypeScript
2. **Flexibilité Totale** : Vous changez les champs du dossier médical dans Zod, et l'IA locale s'adapte immédiatement sans redémarrer le container Python
3. **Vitesse** : En utilisant le mode CLOUD (OpenAI) via Node.js direct en dev, vous économisez la complexité du pont Python/Docker au quotidien. Vous ne l'activez qu'à la fin pour valider la promesse "Local"

---

*Source : PROTOCOLE D'exécution version cabinet (2).pdf (v160.0)*
