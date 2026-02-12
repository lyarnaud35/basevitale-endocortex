# Golden Master v1.0 – Protocole de livraison

**Objectif :** Valider que le socle (Backend + SDK + Showroom facturation) est **autonome** après un redémarrage à froid (Tabula Rasa), puis livrer à Ben avec un message structuré.

---

## Phase 1 : Tabula Rasa (crash test)

Simuler l’expérience de Ben : environnement propre, aucune donnée persistante.

### Ce qui a été exécuté

1. **Purge Docker**
   ```bash
   docker compose down -v
   ```
   Les volumes (Postgres, Neo4j, Redis, MinIO, etc.) sont supprimés.

2. **Relance stack**
   ```bash
   docker compose up -d
   ```
   Tous les services repartent avec des données vides.

3. **Migrations sur base fraîche (si API en local)**
   Si tu lances l’API en local (et non dans Docker), applique les migrations sur la base Docker :
   ```bash
   cd apps/api && npx prisma migrate deploy
   ```

### Deux modes de démarrage

| Mode | Quand l’utiliser | Commandes |
|------|-------------------|-----------|
| **Full Docker** | API + données dans Docker | `docker compose up -d` puis ouvrir le showroom (voir ci‑dessus pour l’URL du front). L’API est sur le port **3000**. Le front doit pointer vers `http://localhost:3000` (variable `API_BACKEND_URL` ou proxy Next). |
| **Hybride (recommandé pour dev)** | Données dans Docker, API + Web en local | `docker compose up -d` (ou seulement `postgres redis neo4j minio nats`), puis `cd apps/api && npx prisma migrate deploy`, puis `npm run dev:api` (port 3001), puis `npm run dev:web`. Ouvrir `http://localhost:4200/demo/billing-flow` (ou le port indiqué par Nx). |

**Note :** Si le build Docker de l’API échoue (ex. credentials), utiliser le mode **Hybride** : données dans Docker, API et Web depuis le repo.

---

## Phase 2 : Test de vérité (billing-flow)

Après un redémarrage à froid (Tabula Rasa ou clone du repo) :

1. Ouvrir **`/demo/billing-flow`** (URL complète selon ton setup, ex. `http://localhost:4200/demo/billing-flow`).
2. **Créer une facture 0 €** : cliquer sur « Créer facture 0 € (acte inconnu) ».
3. Vérifier :
   - Le bouton **« Valider »** est **absent** (seul « Rejeter » est proposé).
   - Le message d’intégrité s’affiche (ex. « Le montant total doit être strictement positif »).
4. **Créer une facture valide** : « Créer facture (Consultation 26,50 €) ».
5. Vérifier :
   - Le bouton **« Valider »** est **présent**.
   - Après clic sur « Valider », le bouton disparaît et « Télétransmettre » apparaît.

Si tout cela est OK → le système est **autonome** et prêt pour la livraison.

---

## Phase 3 : Gel (code freeze & tag)

Quand le Test de vérité est vert :

```bash
git add -A
git status   # vérifier les fichiers
git commit -m "chore(release): Golden Master v1.0 - Ready for Integration"
git tag v1.0.0
git push origin main
git push origin v1.0.0
```

En cas de régression côté Ben : *« Reviens sur le tag v1.0.0, ça fonctionnait. »*

---

## Phase 4 : Message de remise à Ben

Copier-coller (ou adapter) le message ci‑dessous (email / Slack).

---

**Objet :** Livraison du socle technique « Endocortex » (v1.0) – Prêt pour intégration UI

Salut Ben,

La phase « Architecte Silencieux » est terminée. Le moteur backend et la couche de liaison (SDK) sont opérationnels, testés et isolés.

**Ce qui est livré (tag v1.0.0) :**

1. **Le Cerveau (Backend)**  
   Stack NestJS (et services associés) qui gère la sécurité, l’IA et la **facturation** (règles NGAP, cycle de vie des factures, gardes d’intégrité).

2. **Le Système Nerveux (`@basevitale/ghost-sdk`)**  
   SDK React typé qui expose l’intelligence sans gérer les appels API à la main (hooks facturation, lifecycle, etc.).

3. **Le Showroom (`/demo/billing-flow`)**  
   Page de démo qui montre le flux facturation et les gardes (facture 0 € non validable, boutons pilotés par le backend).

**Comment démarrer :**

1. Pull la branche `main` (ou checkout le tag `v1.0.0`).
2. À la racine : `docker compose up -d` (ou, en hybride, lancer uniquement les services data puis l’API en local – voir `docs/RELEASE-v1.0.md`).
3. Lire **`libs/ghost-sdk/README.md`** : installation, hooks, scénarios de test.

**Outils pour tester ton UI (« magic words ») :**

- **« Créer facture Consultation »** → facture valide (bouton Valider actif).
- **« Créer facture 0 € (acte inconnu) »** → facture non validable (bouton Valider absent, message d’intégrité).
- Le reste du flux (Valider → Télétransmettre → Marquer payée / Rejeter) est entièrement piloté par le backend.

**Important :** Toute la logique est **Server-Driven**. Pour changer le comportement d’une alerte ou d’un bouton, ne pas modifier le JS côté front : me le dire et j’ajuste la machine à états côté serveur.

À toi de jouer pour l’UI.

---

*Document Release Manager – Golden Master v1.0.*
