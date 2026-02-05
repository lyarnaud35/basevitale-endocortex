import { z } from 'zod';

/**
 * Schéma "Intelligence" – Réponse Human-Ready pour l'Application Hôte (Ben).
 * Utilisé par GET /api/scribe/patient/:patientId/intelligence.
 *
 * Law I: Contract-First — source de vérité pour l'agrégation Profil + Guardian.
 */

export const IntelligenceTimelineItemSchema = z.object({
  date: z.string(),
  type: z.string(),
  summary: z.string(),
});

export const IntelligenceAlertSchema = z.object({
  level: z.enum(['HIGH', 'MEDIUM']),
  message: z.string(),
});

export const IntelligenceResponseSchema = z.object({
  summary: z.string(),
  timeline: z.array(IntelligenceTimelineItemSchema),
  activeAlerts: z.array(IntelligenceAlertSchema),
  quickActions: z.array(z.string()),
});

export type IntelligenceTimelineItem = z.infer<typeof IntelligenceTimelineItemSchema>;
export type IntelligenceAlert = z.infer<typeof IntelligenceAlertSchema>;
export type IntelligenceResponse = z.infer<typeof IntelligenceResponseSchema>;
