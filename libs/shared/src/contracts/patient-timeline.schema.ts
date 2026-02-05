import { z } from 'zod';

/**
 * Schéma "Patient Timeline" / Profil médical (Total Recall).
 * Utilisé par GET /scribe/patient/:patientId/profile pour l’affichage
 * dans l’application hôte (ex. Ben).
 *
 * Law I: Contract-First — source de vérité pour la restitution du graphe.
 */

export const ConsultationTimelineItemSchema = z.object({
  id: z.string(),
  date: z.string().nullable(),
});

export const ConditionTimelineItemSchema = z.object({
  code: z.string(),
  name: z.string(),
  since: z.string().nullable(),
});

export const MedicationTimelineItemSchema = z.object({
  name: z.string(),
  dosage: z.string().optional().nullable(),
});

export const PatientMedicalProfileSchema = z.object({
  patientId: z.string(),
  consultations: z.array(ConsultationTimelineItemSchema),
  conditions: z.array(ConditionTimelineItemSchema),
  medications: z.array(MedicationTimelineItemSchema),
  symptomsRecurrent: z.array(z.string()),
});

export type ConsultationTimelineItem = z.infer<typeof ConsultationTimelineItemSchema>;
export type ConditionTimelineItem = z.infer<typeof ConditionTimelineItemSchema>;
export type MedicationTimelineItem = z.infer<typeof MedicationTimelineItemSchema>;
export type PatientMedicalProfile = z.infer<typeof PatientMedicalProfileSchema>;
