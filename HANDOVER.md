# Backend MVP Cabinet : LIVRÉ

**Date :** Phase Deep Roots – Consolidation terminée  
**Destinataire :** Ben (Frontend) / Équipe

---

## Statut : PRÊT

Le backend Headless est **fonctionnel, validé et documenté**. Vous pouvez intégrer l'UI immédiatement.

### 4 Piliers opérationnels

| Pilier | Module | Fonctionnalité |
|--------|--------|----------------|
| **Patient** | Identity / Neo4j | Identité, scénarios démo |
| **Médicament** | Drugs (BDPM) | Recherche, sécurité, prix |
| **Acte** | Billing (NGAP) | Tarification, règles (C, V, MEG, NUIT) |
| **Transaction** | Ledger | Facture immuable, snapshot, historique |

### Preuve de vie

- **Tests E2E :** Scénario complet "Jean Peuplu a la Grippe" (6 étapes)
- **Commande :** `npx nx run api:test-e2e --testPathPattern=full-consultation`

---

## Intégration Frontend

### SDK

- **Package :** `@basevitale/ghost-sdk` (monorepo, pas d'`npm install` externe)
- **Config :** `setBaseUrl(process.env.NEXT_PUBLIC_API_URL ?? '')`
- **Documentation :** `libs/ghost-sdk/README.md`

### Hooks principaux

- `useDrugSearch` – Recherche médicaments
- `useBillingQuote` – Devis
- `useValidateInvoice` – Validation facture (Ledger)
- `useDailyActivity` – CA du jour

---

## Documentation API (Swagger)

- **URL :** `http://localhost:3000/api/docs` (quand l'API tourne)
- **OpenAPI JSON :** `/api/api-json`

---

## Données démo (Golden State)

### Neo4j (Guardian / Sécurité)

```bash
npm run seed:scenarios
```

Patients : `scenario-jean-peuplu`, `scenario-marie-enceinte`, `scenario-paul-normal`.

### Prisma (Postgres – Patients + Factures)

```bash
cd apps/api && npx prisma db seed
# ou
npm run prisma:seed
```

- 5 patients types (M. Allergique, Mme Enceinte, M. Standard, enfant, poly-médiqué)
- 5 factures validées (historique comptable)

---

## Freeze Zone (API)

À partir de cette version, tout changement de signature (DTO, endpoint) doit être **rétro-compatible** ou documenté en migration.

**Tag Git suggéré :** `v1.0-mvp-backend`

---

*"Le Backend décide, le Frontend affiche."* – Ghost Protocol
