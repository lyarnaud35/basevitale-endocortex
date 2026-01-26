import { z } from 'zod';
import { ConsultationSchema } from '@basevitale/shared';

/**
 * DTOs pour les endpoints du Module Scribe
 * 
 * Utilisent les schémas Zod comme source de vérité unique (Law I)
 */

/**
 * DTO pour process-dictation
 */
export const ProcessDictationDto = z.object({
  text: z.string().min(1, 'Le texte est requis'),
  patientId: z.string().min(1, 'Le patientId est requis'),
});

export type ProcessDictationDtoType = z.infer<typeof ProcessDictationDto>;

/**
 * DTO pour analyze-consultation
 */
export const AnalyzeConsultationDto = z.object({
  text: z.string().min(1, 'Le texte est requis'),
  patientId: z.string().min(1).optional(),
});

export type AnalyzeConsultationDtoType = z.infer<typeof AnalyzeConsultationDto>;

/**
 * Response DTO pour process-dictation
 */
export interface ProcessDictationResponse {
  success: boolean;
  draft: {
    id: string;
    patientId: string;
    status: string;
    createdAt: Date;
  };
  consultation: z.infer<typeof ConsultationSchema>;
}

/**
 * Response DTO pour validate
 */
export interface ValidateDraftResponse {
  success: boolean;
  draft: {
    id: string;
    patientId: string;
    status: string;
  };
  nodesCreated: number;
  neo4jRelationsCreated: number;
  nodes: any[];
}
