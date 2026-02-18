# 📘 HANDOVER v1.0.0 - Guide d'Intégration Frontend

Salut Ben,

Le moteur Backend et le SDK Frontend sont prêts. Tout est câblé pour que tu puisses te concentrer sur l'UI/UX.

---

## 1. L'Architecture "Ghost Protocol"

Nous ne faisons pas du fetch de données classique. **Nous écoutons des Machines à États.**

* **Tu ne décides pas** si un bouton est grisé. La Machine te l'envoie (`state: 'LOCKED'`).
* **Tu ne calcules pas** le prix. Le SDK te le donne (`context.price`).

Le frontend affiche ce que le backend dicte. Tu envoies des **intentions** (`send('VALIDATE')`), le backend répond par un nouvel état.

---

## 2. Ton Outil : Le SDK (@basevitale/ghost-sdk)

Tout se passe ici. **N'appelle jamais l'API directement.**

### Exemple : Sécurité Prescription

```typescript
const { state, context, send } = usePrescriptionSession(patientId);

// Si le backend dit STOP (garde prescription)
if (state.matches('BLOCKED')) {
  return <AlertBox message={context.reason} onOverride={() => send('FORCE')} />;
}
```

Tu consommes `state` et `context` ; tu envoies des événements avec `send()`. Le backend t'indique les actions autorisées (boutons à afficher, champs désactivés, etc.).

---

## 3. Ce que tu as à disposition

### Les Super-Pouvoirs (Hooks)

* **`useDailyActivity()`** : Widget CA en haut à droite (factures du jour + total).
* **`useDrugSearch(query)`** : Barre de recherche médicament (base officielle).
* **`useBillingSimulation(acts, options)`** : Prix en temps réel quand tu ajoutes des actes (cotation manuelle).
* **`useFiscalPredictionFromContext(patientId, { age, ald })`** : Prédiction dérivée des actes du jour (consultation live).
* **`useValidateInvoice()`** : Envoyer la facture en un clic. `mutate({ patientId, overrides })`, et `disabled={isPending}` sur le bouton.
* **`usePrescriptionSession(patientId)`** : État et contexte de la machine (sécurité ordonnance, garde prescription).

### Sécurité & DX

* Passe ta souris sur n'importe quel hook pour voir la documentation (JSDoc).
* Si `isError`, affiche le `error.message` à l'utilisateur.
* Le backend refuse de valider une simulation vide (400 avec message explicite).

---

## 4. Pour démarrer

1. Checkout le tag `v1.0.0` : `git checkout v1.0.0`
2. `docker-compose up -d` (si Docker pour Neo4j / Postgres)
3. `nx serve api` puis `nx serve web` (ou `npm run dev` selon le monorepo)
4. Va sur `/demo/consultation-live` pour voir l'exemple d'intégration brut (actes du jour, profil patient, validation, CA Journée).

Bon code !
