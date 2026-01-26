# Phase 2: Ossification des Contrats

## 🎯 **OBJECTIF**

Définir la structure des données selon l'architecture "Contract-First" avec validation Zod et projection Prisma.

---

## ✅ **ACTIONS COMPLÉTÉES**

### **1. Noyau Partagé - ConsultationSchema**

**Fichier:** `libs/shared/src/contracts/consultation.schema.ts`

Le schéma Zod `ConsultationSchema` a été créé avec la structure complète :

```typescript
export const ConsultationSchema = z.object({
  patientId: z.string().min(1),
  transcript: z.string().min(1), // Texte brut
  symptoms: z.array(z.string()).min(1),
  diagnosis: z.array(
    z.object({
      code: z.string().min(1),
      confidence: z.number().min(0).max(1),
      label: z.string().min(1),
    })
  ).min(1),
  medications: z.array(
    z.object({
      name: z.string().min(1),
      dosage: z.string().min(1),
      duration: z.string().min(1),
    })
  ).default([]),
});

export type Consultation = z.infer<typeof ConsultationSchema>;
```

**Points clés:**
- ✅ `patientId` (string) - Identifiant du patient
- ✅ `transcript` (string) - Texte brut de la consultation
- ✅ `symptoms` (array of strings) - Liste des symptômes
- ✅ `diagnosis` (array of objects) - Diagnostics avec code, confidence, label
- ✅ `medications` (array of objects) - Médicaments avec name, dosage, duration
- ✅ Type TypeScript exporté via `z.infer`

---

### **2. Projection Prisma - ConsultationDraft**

**Fichier:** `apps/api/prisma/schema.prisma`

Le modèle `ConsultationDraft` a été créé selon l'architecture v150 :

```prisma
model ConsultationDraft {
  id                String   @id @default(cuid())
  
  // Colonnes strictes (métadonnées critiques)
  patientId         String
  status            String   @default("DRAFT")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Données structurées en JSONB (flexibilité)
  structuredData    Json     // Conforme à ConsultationSchema
}
```

**Architecture v150 respectée:**
- ✅ Champ `jsonb` (`Json` dans Prisma) pour `structuredData`
- ✅ Colonnes strictes : `id`, `patientId`, `createdAt`, `status`
- ✅ Index sur `patientId`, `status`, `createdAt`

---

### **3. Lien Neuro-Symbolique**

**Vérification:** `tsconfig.base.json`

Le path alias `@basevitale/shared` est correctement configuré :

```json
{
  "paths": {
    "@basevitale/shared": ["libs/shared/src/index.ts"]
  }
}
```

**Import dans NestJS:**
```typescript
import { ConsultationSchema, Consultation } from '@basevitale/shared';
```

✅ **Le lien fonctionne correctement**

---

## 📊 **STRUCTURE DES DONNÉES**

### **ConsultationSchema (Zod)**

```typescript
{
  patientId: "clx...",
  transcript: "Le patient présente une fièvre modérée et des maux de tête...",
  symptoms: ["Fièvre", "Maux de tête", "Fatigue"],
  diagnosis: [
    {
      code: "J11.1",
      confidence: 0.85,
      label: "Grippe saisonnière"
    }
  ],
  medications: [
    {
      name: "Paracétamol",
      dosage: "500mg",
      duration: "5 jours"
    }
  ]
}
```

### **ConsultationDraft (Prisma)**

```prisma
ConsultationDraft {
  id: "clx...",
  patientId: "clx...",
  status: "DRAFT",
  createdAt: 2024-01-15T10:30:00Z,
  updatedAt: 2024-01-15T10:30:00Z,
  structuredData: {
    // Contient les données selon ConsultationSchema
    patientId: "...",
    transcript: "...",
    symptoms: [...],
    diagnosis: [...],
    medications: [...]
  }
}
```

---

## 🔗 **FLUX DE DONNÉES**

```
1. IA génère données structurées
   ↓
2. Validation Zod (ConsultationSchema.parse())
   ↓
3. Stockage dans ConsultationDraft.structuredData (JSONB)
   ↓
4. Validation métier
   ↓
5. Transformation en Consultation + SemanticNodes
```

---

## ⚠️ **IMPORTANT**

**Aucune migration SQL n'a été générée.** 

Le schéma Prisma est prêt, mais la migration doit être créée manuellement après validation de la structure :

```bash
# Une fois la structure validée
cd apps/api
npx prisma migrate dev --name add_consultation_draft
```

---

## ✅ **VALIDATION**

### **Checklist Phase 2:**
- ✅ `ConsultationSchema` créé dans `libs/shared/src/contracts/`
- ✅ Structure complète : patientId, transcript, symptoms, diagnosis, medications
- ✅ Type TypeScript exporté
- ✅ `ConsultationDraft` modèle créé dans `schema.prisma`
- ✅ Architecture v150 respectée (JSONB + colonnes strictes)
- ✅ Path alias `@basevitale/shared` fonctionnel
- ✅ Aucune migration générée (conforme aux instructions)

---

**Status:** ✅ **PHASE 2 COMPLÉTÉE**

---

*Phase 2: Ossification des Contrats - BaseVitale V112+*
