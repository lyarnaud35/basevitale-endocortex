# Message de passation – Endocortex v1.0 (pour Ben)

Copier-coller ce message (Slack / mail) pour la passation.

---

**Objet :** Architecture Endocortex v1.0 - Prêt pour l'UI

Salut Ben,

J'ai finalisé la structure Backend et le SDK. Toute la logique complexe (Calculs T2A/NGAP, Sécurité Médicament, Graphe Patient) est encapsulée.

**L'architecture est "Server-Driven".** Le Frontend n'a aucune décision métier à prendre, il affiche l'état calculé par le Back.

**Ce que tu récupères (Tag `v1.0-ready-for-ben`) :**

1. **Le Cerveau (`apps/api`) :** Moteur NestJS qui gère les règles et la donnée.
2. **Le SDK (`libs/ghost-sdk`) :** Tes outils React. Documentation à jour dans `libs/ghost-sdk/README.md`.
3. **Les Preuves (`/demo`) :** J'ai créé 3 pages brutes pour te montrer comment utiliser les hooks :
   - **`/demo/billing`** : Le simulateur de facturation (Jean Peuplu vs Paul Normal). **Teste-le en premier, c'est bluffant.**
   - **`/demo/drugs`** : Recherche médicament + sécurité (Amoxicilline BLOQUÉ pour Jean Peuplu).
   - **`/demo/scribe`** : La donnée patient structurée.

**Comment démarrer :**

1. `docker-compose up -d` (Neo4j + API si besoin).
2. `npm run dev` (ou `nx serve web` + `nx serve api`).
3. **Note importante sur la Data :** Au premier démarrage (ou après un `docker-compose down -v`), la base Neo4j est vide. Pour que les démos fonctionnent (Jean Peuplu, alerte Amoxicilline, facturation) :
   - **Option A :** Ouvrir Neo4j Browser (`http://localhost:7474`), se connecter (neo4j / test), puis copier-coller le contenu du fichier **`seed.cypher`** à la racine du projet et exécuter les requêtes.
   - **Option B :** Lancer le seed NestJS : `npm run seed:scenarios` (après avoir démarré l’API une fois pour que Neo4j soit joignable).

**Dépannage Scribe 500 :** Le front appelle toujours l'ID `scenario-jean-peuplu` (voir `apps/web/app/demo/scribe/page.tsx`). Pas d'ID mismatch. Si 500 persiste : vérifier l'URL dans Network ; appeler en direct `http://localhost:3001/api/scribe/patient/scenario-jean-peuplu/intelligence` et regarder le terminal Backend ; vérifier `NEO4J_PASSWORD` dans `apps/api/.env` (identique à Neo4j Browser).

**Ta mission :**  
Tu peux supprimer mes pages `/demo` (elles sont moches, c'est fait exprès) et construire la vraie UI par-dessus les hooks du SDK.

*Exemple pour la facture :*
```ts
const { total, partSecu, partPatient, rulesApplied } = useBillingSimulation(['C', 'V'], { patientId: 'scenario-jean-peuplu' });
```
→ Tu n'as plus qu'à styliser le résultat.

Le code est propre, les logs sont nettoyés, la version est taguée.

À toi la main !
