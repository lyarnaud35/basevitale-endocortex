# 🚀 Bienvenue sur Endocortex (v1.0.0)

Salut Ben,

Le moteur Backend et le SDK Frontend sont prêts. Tout est câblé pour que tu puisses te concentrer sur l'UI/UX.

## 📦 Ce que tu as à disposition

Tout se trouve dans `@basevitale/ghost-sdk`. Tu n'as pas besoin de toucher au Backend.

### Les Super-Pouvoirs (Hooks)

* **`useDailyActivity()`** : Pour afficher le widget de CA en haut à droite (factures du jour + total).
* **`useDrugSearch(query)`** : Pour ta barre de recherche médicament (connecté à la base officielle).
* **`useBillingSimulation(acts, options)`** : Pour calculer le prix en temps réel quand tu ajoutes des actes (page cotation manuelle).
* **`useFiscalPredictionFromContext(patientId, { age, ald })`** : Prédiction dérivée des actes du jour (consultation live).
* **`useValidateInvoice()`** : Pour envoyer la facture en un clic (gère la sécurité et le stock tout seul). Utilise `mutate({ patientId, overrides })`, et `disabled={isPending}` sur le bouton.

## 🛡️ Sécurité & DX

* Passe ta souris sur n'importe quel hook pour voir la documentation (JSDoc).
* Les erreurs sont typées. Si tu vois `isError`, affiche le `error.message` à l'utilisateur.
* Le backend refuse de valider une simulation vide (400 : *"Impossible de valider une simulation vide ou sans montant"*).

## 🏁 Pour démarrer

1. Checkout le tag `v1.0.0` : `git checkout v1.0.0`
2. `docker-compose up -d` (si tu utilises Docker pour Neo4j / Postgres)
3. `nx serve api` puis `nx serve web` (ou `npm run dev` selon le monorepo)
4. Va sur `/demo/consultation-live` pour voir l'exemple d'intégration brut (actes du jour, profil patient, validation, CA Journée).

Bon code !
