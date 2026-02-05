# Phase 3 : Démonstration de puissance

Test réel : Dicter → IA structure → Afficher Symptômes / Médicaments → Cristalliser → Neo4j.

## Configuration (.env)

**Option rapide (CLOUD)**  
- `AI_MODE=CLOUD`  
- `GROQ_API_KEY=gsk_...` ou `OPENAI_API_KEY=sk-...`  

**Option 100 % local**  
- `AI_MODE=LOCAL`  
- Ollama installé sur la machine  
- Python (ai-cortex) configuré pour `OLLAMA_BASE_URL=http://host.docker.internal:11434` (ou équivalent)

## Étapes

1. Démarrer l’API : `npx nx serve api`  
2. Démarrer le frontend : `npx nx serve web`  
3. Ouvrir : **http://localhost:4200/scribe/test** (ou le port Next.js affiché)  
4. **Dicter** : le texte par défaut est  
   `Le patient présente une toux sèche depuis 3 jours, pas de fièvre. Je prescris du sirop Toplexil.`  
   (modifiable dans la zone de texte)  
5. Cliquer **DICTER / VALIDER**  
6. Vérifier dans l’interface :  
   - **Symptôme(s)** : ex. `Toux sèche`  
   - **Médicament(s)** : ex. `Toplexil`  
7. Cliquer **CRISTALLISER**  
8. **Vérifier dans Neo4j** : exécuter la requête Cypher indiquée sur la page (section « Vérifier dans Neo4j »).

## Requête Cypher type

```cypher
MATCH (p:Patient {id: "patient_demo_phase3"})-[:HAS_CONSULTATION]->(c:Consultation)
OPTIONAL MATCH (c)-[:REVEALS]->(s:Symptom)
WITH p, c, collect(DISTINCT s.name) AS syms
OPTIONAL MATCH (c)-[:PRESCRIBES]->(m:Medication)
RETURN p.id AS patient, c.id AS consultation, syms AS symptoms, collect(DISTINCT m.name) AS medications;
```

Résultat attendu : `symptoms` contenant « Toux sèche », `medications` contenant « Toplexil » (ou libellé proche).
