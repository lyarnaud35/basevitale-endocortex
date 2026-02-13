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

**Ta mission :**  
Tu peux supprimer mes pages `/demo` (elles sont moches, c'est fait exprès) et construire la vraie UI par-dessus les hooks du SDK.

*Exemple pour la facture :*
```ts
const { total, partSecu, partPatient, rulesApplied } = useBillingSimulation(['C', 'V'], { patientId: 'scenario-jean-peuplu' });
```
→ Tu n'as plus qu'à styliser le résultat.

Le code est propre, les logs sont nettoyés, la version est taguée.

À toi la main !
