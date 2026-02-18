# ✅ Checklist démo – Montrer les avancées à Ben

À faire avec l’API et le Web qui tournent (`nx serve api` + `nx serve web`). Base URL front : ex. `http://localhost:4200`.

---

## 1. Facturation (Module E+)

### 1.1 Cotation manuelle (`/demo/billing`)

| Test | Action | Résultat attendu |
|------|--------|------------------|
| 1 | Ouvrir `/demo/billing` | Page "Moteur de valorisation financière (E+)". |
| 2 | Cocher "Consultation (C)" | Total 26,50 €, Part Sécu / Reste à charge affichés. |
| 3 | Cocher "ECG" en plus | Total 40,76 € (26,50 + 14,26). |
| 4 | Activer le switch "Patient ALD (100 % Sécu)" | Reste à charge = 0 €, mention type "Tiers-Payant Intégral". |
| 5 | Désactiver ALD, choisir "Enfant (< 6 ans)" (si présent) ou patient < 6 ans | Si acte C : majoration MEG visible (total 31,50 €). |
| 6 | Cliquer "Tout effacer" | Sélection vide, total à 0 €. |

### 1.2 Fusion Clinique → Finance (`/demo/consultation-live`)

| Test | Action | Résultat attendu |
|------|--------|------------------|
| 7 | Ouvrir `/demo/consultation-live` | Deux colonnes : Zone clinique (gauche), Valorisation (droite). |
| 8 | Choisir un patient (ex. Paul Normal) | Prédiction affichée à droite (ex. 26,50 € pour C par défaut). |
| 9 | Cliquer "+ ECG" (zone clinique) | À droite : total passe à 40,76 €, détail "Consultation (C)" + "Electrocardiogramme (ECG)". |
| 10 | Cliquer "×" sur ECG dans "Actes du jour" | Total redescend à 26,50 €. |
| 11 | Profil "Enfant (< 6 ans)" + acte C | Total 31,50 €, ligne "Majoration Enfant (-6 ans) [Auto]" dans le détail. |
| 12 | Profil "ALD (100 %)" | Reste à charge 0 €, "Tiers-Payant Intégral". |
| 13 | Cliquer "Valider la Facture" | Message "Facture validée ! XX,XX €", bloc "Activité du jour" mis à jour. |
| 14 | Vérifier "Activité du jour" (en bas) | CA Journée augmenté, nouvelle ligne (heure – patient – actes – montant – VALIDATED). |
| 15 | Ne sélectionner aucun acte (total 0 €) | Bouton "Valider la Facture" désactivé. |
| 16 | (Optionnel) Forcer un POST /billing/validate avec simulation vide | Erreur 400 avec message "Impossible de valider une simulation vide ou sans montant...". |

---

## 2. Scribe & Intelligence patient

### 2.1 Scribe (`/demo/scribe` ou `/scribe`)

| Test | Action | Résultat attendu |
|------|--------|------------------|
| 17 | Ouvrir la page Scribe | Zone de saisie / widget Scribe connecté au backend. |
| 18 | Saisir du texte (ou utiliser le flux prévu) | Analyse / structure renvoyée (symptômes, diagnostics, etc. selon le mode). |

### 2.2 Intelligence / Profil patient

| Test | Action | Résultat attendu |
|------|--------|------------------|
| 19 | Appeler GET `/api/scribe/patient/:patientId/intelligence` (ex. `scenario-jean-peuplu`) | JSON avec `summary`, `timeline`, `activeAlerts`, `quickActions`, `suggestedBillingCodes` (si actes du jour). |

---

## 3. Sécurité & Ordonnance

### 3.1 Garde prescription / Allergies (`/demo/cabinet` ou `/demo/prescription-test`)

| Test | Action | Résultat attendu |
|------|--------|------------------|
| 20 | Ouvrir `/demo/cabinet` ou `/demo/prescription-test` | Page avec sélecteur de scénario patient. |
| 21 | Choisir "Jean Peuplu (M. Allergique)" (allergie Pénicilline) | Contexte patient allergique. |
| 22 | Rechercher / ajouter un médicament contre-indiqué (ex. Amoxicilline) | Alerte ou blocage (état BLOCKED, message d’interdiction). |
| 23 | Choisir un patient sans allergie, ajouter un médicament autorisé | Pas de blocage, ordonnance peut avancer. |

### 3.2 Recherche médicaments (`/demo/drugs`)

| Test | Action | Résultat attendu |
|------|--------|------------------|
| 24 | Ouvrir `/demo/drugs` | Barre de recherche médicament. |
| 25 | Taper une requête (ex. "doliprane") | Résultats issus du SDK / API (base BDPM ou mock). |

---

## 4. SDK & DX (Developer Experience)

| Test | Action | Résultat attendu |
|------|--------|------------------|
| 26 | Dans VS Code, importer `useValidateInvoice` depuis `@basevitale/ghost-sdk` | Import résolu. |
| 27 | Survoler `useValidateInvoice` (IntelliSense) | JSDoc visible : description, paramètres, retour, conseil `disabled={isPending}`. |
| 28 | Survoler `useDailyActivity` | JSDoc visible (widget CA Journée). |
| 29 | Survoler `useBillingSimulation` | JSDoc visible (simulation, actes, options). |

---

## 5. Récap "Golden Master" (à montrer en priorité)

1. **Facturation de bout en bout** : `/demo/consultation-live` → choisir patient → ajouter actes (ex. C + ECG) → voir le total se mettre à jour → profil Enfant puis ALD → Valider → CA Journée mis à jour.  
2. **Cotation manuelle** : `/demo/billing` → checkboxes actes + switch ALD + détail du calcul.  
3. **Sécurité** : scénario Jean Peuplu + médicament contre-indiqué → alerte / blocage.  
4. **SDK** : survol des hooks dans l’IDE → documentation claire.

---

## Prérequis

- Backend : `nx serve api` (ou équivalent), port API (ex. 3000).
- Frontend : `nx serve web` (ou équivalent), port (ex. 4200).
- `NEXT_PUBLIC_API_URL` (ou proxy) pointant vers l’API.
- Neo4j + Postgres si les démos utilisent le graphe / les procédures du jour.

Si une démo échoue (réseau, env), vérifier la console navigateur et les logs API.
