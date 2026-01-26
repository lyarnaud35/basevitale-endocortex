# Guide d'Intégration - BaseVitale

## 🔄 Intégration des Modules

### Workflow Typique

```
Patient → Consultation → Knowledge Graph → Codes CIM → Facturation
```

---

## 📝 Exemples d'Intégration

### Exemple 1 : Consultation Complète

```typescript
// 1. Créer patient
const patient = await identityService.createPatient({
  insToken: 'INS123',
  firstName: 'Jean',
  lastName: 'Dupont',
  birthDate: new Date('1980-01-15'),
}, userId);

// 2. Traiter consultation
const result = await scribeService.extractKnowledgeGraph(
  'Le patient présente une fièvre...',
  patient.id,
);

// 3. Stocker dans Knowledge Graph
const graph = await knowledgeGraphService.buildGraphFromExtraction(
  result,
  patient.id,
  consultationId,
);

// 4. Obtenir codes CIM
const codes = await codingService.getCodesFromConsultation(
  consultationId,
  0.6, // minConfidence
);

// 5. Facturer (si preuves OK)
const billingEvent = await billingService.createBillingEvent({
  consultationId,
  actType: 'CONSULTATION',
  evidence: {
    nodeIds: graph.nodes.map((n) => n.id),
    evidenceType: 'CONSULTATION_NOTE',
  },
});
```

---

## 🔗 Relations entre Modules

### Module C+ ↔ Module S
- Le Module S utilise le `patientId` du Module C+
- Les nœuds sémantiques sont liés au patient

### Module S ↔ Module E+
- Le Module E+ vérifie les nœuds créés par le Module S
- Les preuves cliniques proviennent du Knowledge Graph

### Module S ↔ Module B+
- Le Module B+ analyse les nœuds créés par le Module S
- Les codes CIM sont extraits des nœuds DIAGNOSIS

### Module E+ ↔ Knowledge Graph
- Le Module E+ lit uniquement le Knowledge Graph (via Prisma)
- Vérifie l'existence des preuves avant facturation

---

## 📊 Patterns d'Intégration

### Pattern 1 : Validation en Cascade

```typescript
// Consultation → Validation → Facturation
const consultation = await createConsultation(...);
const graph = await extractAndStoreGraph(...);

// Valider que la consultation peut être facturée
const canBill = await billingValidation.canBillAct(
  consultation.id,
  'CONSULTATION',
);

if (canBill.allowed) {
  await billingService.createBillingEvent({...});
}
```

### Pattern 2 : Extraction avec Codes

```typescript
// Extraction → Codes → Validation
const graph = await scribeService.extractKnowledgeGraph(text, patientId);
const codes = await codingService.suggestCodes({
  context: { nodeIds: graph.nodes.map((n) => n.id) },
});

// Filtrer les codes à haute confiance
const highConfidenceCodes = codes.suggestions.filter(
  (c) => c.confidence >= 0.7,
);
```

---

*Guide d'Intégration - Patterns et exemples*
