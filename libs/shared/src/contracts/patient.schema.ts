import { z } from 'zod';

/**
 * Patient Schema - Module C+ (Identité/INS)
 * 
 * Version Cabinet - Sprint 1: Fondation Invariante
 * 
 * INVARIANT: Un patient = Un Token unique (INS)
 * - INS (Identité Nationale de Santé) est non-négociable dès J1
 * - Sécurité par Construction : INS + 2FA
 */

/**
 * Schéma pour l'adresse du patient
 */
const AddressSchema = z.object({
  addressLine1: z.string().min(1).optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().regex(/^\d{5}$/, 'Code postal doit être 5 chiffres').optional(),
  country: z.string().default('FR'),
});

/**
 * Schéma de création d'un patient
 * Utilisé lors de la création d'un nouveau patient
 */
export const CreatePatientSchema = z.object({
  // INS - Identité Nationale de Santé
  insToken: z
    .string()
    .min(1, 'Le token INS est requis')
    .describe('Token INS unique identifiant le patient'),
  
  // Identité
  firstName: z.string().min(1, 'Le prénom est requis'),
  lastName: z.string().min(1, 'Le nom est requis'),
  birthDate: z.coerce.date({
    required_error: 'La date de naissance est requise',
    invalid_type_error: 'La date de naissance doit être une date valide',
  }),
  birthPlace: z.string().optional(),
  
  // Contact
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  phone: z
    .string()
    .regex(/^[0-9+\s()-]+$/, 'Numéro de téléphone invalide')
    .optional()
    .or(z.literal('')),
  
  // Adresse
  address: AddressSchema.optional(),
});

/**
 * Schéma de patient complet (lecture)
 */
export const PatientSchema = CreatePatientSchema.extend({
  id: z.string().cuid(),
  insHash: z.string().describe('Hash INS pour dédoublonnage'),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdBy: z.string().describe('User ID qui a créé le patient'),
});

/**
 * Schéma pour la recherche de patient (dédoublonnage INS)
 */
export const SearchPatientByINSSchema = z.object({
  insToken: z.string().min(1),
});

/**
 * Schéma pour la recherche de patient (critères multiples)
 */
export const SearchPatientSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  birthDate: z.coerce.date().optional(),
  insToken: z.string().optional(),
}).refine(
  (data) => data.firstName || data.lastName || data.birthDate || data.insToken,
  'Au moins un critère de recherche doit être fourni'
);

/**
 * Types TypeScript dérivés
 */
export type CreatePatient = z.infer<typeof CreatePatientSchema>;
export type Patient = z.infer<typeof PatientSchema>;
export type Address = z.infer<typeof AddressSchema>;
export type SearchPatient = z.infer<typeof SearchPatientSchema>;
export type SearchPatientByINS = z.infer<typeof SearchPatientByINSSchema>;
