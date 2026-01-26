import { z } from 'zod';

/**
 * Validation Utilities
 * 
 * Utilitaires de validation réutilisables pour BaseVitale
 */

/**
 * Valider un ID CUID
 */
export function isValidCuid(id: string): boolean {
  const cuidPattern = /^c[a-z0-9]{24}$/;
  return cuidPattern.test(id);
}

/**
 * Valider un token INS
 * Format basique (peut être amélioré selon les spécifications INS réelles)
 */
export function isValidINSToken(token: string): boolean {
  // Format basique : au moins 8 caractères alphanumériques
  // À adapter selon les spécifications INS réelles
  return /^[A-Z0-9]{8,}$/.test(token);
}

/**
 * Valider une date de naissance
 * Vérifie que la date est dans le passé et raisonnable (pas trop ancienne)
 */
export function isValidBirthDate(date: Date): boolean {
  const now = new Date();
  const minDate = new Date(1900, 0, 1); // 1er janvier 1900
  const maxDate = new Date(now.getFullYear(), now.getMonth(), now.getDay());
  
  return date >= minDate && date <= maxDate;
}

/**
 * Créer un schéma Zod avec validation custom
 */
export function createValidatedSchema<T extends z.ZodTypeAny>(
  schema: T,
  customValidations?: Array<(value: z.infer<T>) => boolean | string>,
): T {
  if (!customValidations || customValidations.length === 0) {
    return schema;
  }

  return schema.refine(
    (value) => {
      for (const validation of customValidations) {
        const result = validation(value);
        if (result === false || typeof result === 'string') {
          return false;
        }
      }
      return true;
    },
    {
      message: 'Validation personnalisée échouée',
    },
  ) as unknown as T;
}

/**
 * Sanitizer pour les entrées utilisateur
 */
export function sanitizeInput(input: string): string {
  return input.trim().replace(/\s+/g, ' ');
}

/**
 * Formater un code INS pour affichage
 */
export function formatINSToken(token: string): string {
  // Format: INS-XXXX-XXXX-XXXX
  const cleaned = token.replace(/[^A-Z0-9]/g, '');
  if (cleaned.length >= 12) {
    return `INS-${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}-${cleaned.slice(8, 12)}`;
  }
  return token;
}
