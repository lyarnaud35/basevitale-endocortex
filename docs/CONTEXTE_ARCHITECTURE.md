# BaseVitale : Architecture Neuro-Symbiotique

## Vue d'Ensemble

BaseVitale est un système de gestion hospitalière qui se définit **non plus par ses fonctionnalités** (DPI, Facturation, PACS), mais par **ses modes de raisonnement**. C'est un système vivant qui alterne dynamiquement entre **rigueur absolue (sécurité)** et **intuition assistée (diagnostic)**, piloté par une orchestration centrale.

## Le Cerveau Central : L'Orchestrateur Contextuel (Module O)

**Fonction Méta-Logique** : Il ne produit pas de soin, il gère la friction cognitive.

### Mécanisme de Plasticité Cognitive

Le module O analyse le contexte en temps réel pour activer différents modes :

#### Mode "Choc / Urgence" (Mode Fluide)
- Inhibe les alertes administratives non-critiques (Module E)
- Inhibe l'IA probabiliste bavarde (Module B)
- Priorité absolue à l'action immédiate
- Libère la bande passante cognitive du médecin

#### Mode "Visite / Codage" (Mode Analytique)
- Verrouille les contraintes de facturation
- Exige des justifications causales
- Active la détection d'anomalies de fond
- Priorité à la cohérence et à la sécurité

### Fonctionnalités Intégrées

- **Gestion des Ressources Humaines & Planning (ERP RH)**
  - Gestion des plannings du personnel et formation
  - Gestion de l'agenda et prise de rendez-vous
  - Arbitrage des priorités (Urgence vs Routine)

- **Pilotage des Flux (Workflow)**
  - Orchestration du parcours patient de l'admission à la sortie
  - Gestion de l'attribution des salles
  - Organisation du bloc opératoire

## Les Deux Hémisphères Cognitifs

### Hémisphère Gauche : Le Socle Invariant (Déterminisme & Sécurité)

Ce bloc gère le **"Certain"**. Il est hermétique aux hallucinations de l'IA.

#### Module E+ : Le Verrou de Cohérence Factuelle
**Fusion Facturation/Médical**

- **Principe** : Remplace la simple saisie T2A par une preuve logique
- **Fonctionnement** : 
  - Scanne le graphe sémantique du patient
  - Règle inviolable : *"Aucun acte ne peut être facturé s'il n'est pas relié causalement à une preuve clinique existante (résultat labo, note opératoire, constante)"*
- **Résultat** : Élimination structurelle des rejets de l'Assurance Maladie et des fraudes involontaires

**Fonctionnalités** :
- Facturation T2A/PMSI & Comptabilité
- Génération des factures et suivi des remboursements
- Croisement systématique acte facturé / dossier médical
- Validation impossible sans justificatifs cliniques dans le Graphe de Connaissances
- Télétransmission sécurisée (Normes B2, NOEMIE)

#### Module C+ : Le Gardien Causal
**Fusion Alertes/Pharmacie**

- **Principe** : Dépasse l'alerte binaire ("Interdit") pour offrir une simulation causale
- **Fonctionnement** : 
  - Au lieu de bloquer une prescription hors-protocole, simule l'impact
  - Exemple : *"Si vous forcez cette association, le risque d'insuffisance rénale augmente de 35% chez CE patient (à cause de son historique créatinine)"*
- **Résultat** : Redonne le pouvoir de décision (Outpass) au médecin, mais une décision "éclairée" et tracée

**Fonctionnalités** :
- Identité Patient (INS) : identification unique et dédoublonnage strict
- Sécurité Médicamenteuse Stricte : bloque les prescriptions en cas de contre-indications absolues (Allergies, Interactions lourdes) référencées dans la base Claude Bernard/Vidal
- Sécurité des Données : conformité HDS/RGPD, authentification forte (2FA), traçabilité des accès

#### Module "Logistique & Maintenance" (Le Gestionnaire de Stocks)

- **Inventaire & Approvisionnement** :
  - Suit les stocks de médicaments (dates de péremption, lots) et de matériel médical en temps réel
  - Déclenche les commandes de réassort automatique selon des seuils définis (Déterminisme)

- **Maintenance Biomédicale** :
  - Gère le cycle de vie des équipements (IRM, Scanners)
  - Planifie la maintenance préventive

### Hémisphère Droit : L'Intuition Calibrée (Probabilisme & Exploration)

Ce bloc gère le **"Probable"**. Il explore, suggère, mais doute toujours.

#### Module B+ : L'Éclaireur Bayésien
**Fusion Codage/Aide au Diagnostic**

- **Principe** : Lutte contre les "erreurs confiantes" par une calibration stricte
- **Fonctionnement** : 
  - Ne suggère jamais un code CIM-11 ou un diagnostic seul
  - Fournit toujours un **Intervalle de Confiance**
  - Exemple : *"Suggestion : Embolie Pulmonaire (Confiance 65% - Donnée manquante : D-Dimères)"*
  - Si la confiance est sous un seuil (ex: 40%), se tait pour ne pas polluer l'attention (Silence Attentionnel)

**Fonctionnalités** :
- Codage Automatique (CIM-10/11 & CCAM)
  - Analyse le Graphe de Connaissances (issu du Scribe) pour proposer les codes PMSI
  - Affiche toujours un Score de Confiance
- Aide au Diagnostic & Protocoles
  - Suggère des protocoles de soins basés sur les données du patient
  - Analyse les résultats du LIS (Laboratoire) pour détecter des tendances pathologiques

#### Module D+ : Le Scribe Sémantique
**Fusion Dictée/DPI**

- **Principe** : Transforme la donnée brute (voix/texte) en Abstraction (Knowledge Graph)
- **Fonctionnement** : 
  - Ne se contente pas de transcrire la voix ("Audio Calibré")
  - Structure l'information en temps réel
  - Relie le symptôme "Douleur thoracique" (dit aujourd'hui) à l'antécédent "Infarctus père" (noté il y a 10 ans)
  - Construit la timeline du patient à la volée

**Fonctionnalités** :
- Captation Multimodale (Audio/Texte)
  - Assistant Vocal pour la dictée en temps réel
  - Reconnaissance vocale ambiante lors de la consultation
  - Saisie classique et modèles de courriers
- Traitement de l'Incertitude (La Transcription Calibrée)
  - Souligne les mots douteux (bruit de fond, homonymes)
  - Demande confirmation, évitant l'hallucination acoustique
- Révolution Structurelle (Abstraction & Graphe de Connaissances)
  - Transforme la consultation en Graphe de Connaissances
  - "Abstrait" les données : une douleur poitrine devient un nœud sémantique relié à "Risque Cardio" et "Antécédent Père"
  - Permet au système de "comprendre" l'histoire du patient sur le long terme

#### Module F : L'Observateur de Fond (Indéterminisme Contrôlé)

- **Principe** : L'exploration passive des données froides ("Vision Active")
- **Fonctionnement** : 
  - Pendant que le médecin dort, ce module teste des corrélations sur le PACS et le LIS
  - Cherche des anomalies "invisibles" à l'œil nu (signaux faibles)
  - Ne lève une alerte que si une divergence grave est confirmée

**Fonctionnalités** :
- PACS Intelligent (Imagerie)
  - Archive les images
  - Détection de lésions par IA avec segmentation avancée
- Prédictions Logistiques (L'IA de Stock)
  - Utilise l'IA prédictive pour anticiper les besoins
  - Exemple : pic de grippe imminent = pré-commande d'antibiotiques et masques

## La Boucle d'Apprentissage : Le Feedback Actif (Module L)

**Le Concept "Antifragile"** : Le système s'améliore grâce aux erreurs et corrections.

### Mécanisme

1. L'IA (Module B+) propose un code "Grippe"
2. Le Médecin corrige pour "Covid long"
3. Le Module L capture cette différence (Delta)
4. Déclenche une rétroaction (Backpropagation) sur le modèle local de l'hôpital
5. Ajuste les poids des symptômes futurs
6. Conséquence : L'IA se spécialise automatiquement aux pathologies spécifiques du service ou de la région

**Fonctionnalités** :
- Correction & Fine-tuning
  - Enregistre les écarts lorsque le médecin corrige un code CIM proposé ou modifie une transcription
  - Utilise ces données pour ré-entraîner les modèles locaux
  - Personnalise l'IA aux habitudes spécifiques du service ou du praticien
- Qualité des Soins
  - Intègre la gestion des événements indésirables
  - Nourrit les plans d'amélioration continue

## Synthèse de la Valeur

Cette architecture répond point par point aux exigences de qualité :

1. **Contre l'Incohérence** : Le Socle Invariant (E+) empêche physiquement les contradictions entre le médical et l'administratif
2. **Contre l'Hallucination** : L'Éclaireur Bayésien (B+) et son calibrage de confiance empêchent le système d'affirmer le faux
3. **Contre la Rigidité** : L'Orchestrateur (O) assure que la sécurité ne tue pas l'efficacité en situation d'urgence
4. **Contre l'Opacité** : Le Gardien Causal (C+) explique le "pourquoi" des règles, favorisant l'adhésion des médecins

## Points Clés Architecturels

### Le Cortex Sémantique : Le Scribe Fusionné (Module S)
Fusion complète des modules "Audio", "DPI" et "Saisie". C'est l'interface d'entrée intelligente qui transforme la donnée brute en graphe de connaissances.

### Le Gardien Causal : L'Explicabilité
Il fait le lien entre les règles et l'utilisateur :
- Si le Socle Invariant bloque une prescription ou une facture, explique **Pourquoi**
- Permet au médecin de simuler l'impact d'un traitement avant de le valider

### Architecture de Données

- **Write** : Postgres (JSONB Drafts) - Permet la flexibilité sans migration fatigue
- **Read** : Neo4j (Projected Views) - Graphe de connaissances pour les requêtes complexes
- **Sync** : Seulement écriture Neo4j via transaction synchrone sur "Validation"

---

*Source : ECOSYSTEME BASEVITALE.pdf (Version Finale - Architecture Neuro-Symbiotique)*
