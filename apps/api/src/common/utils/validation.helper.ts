/**
 * Validation Helpers
 * 
 * Utilitaires pour valider et transformer les données
 */

/**
 * Valider qu'une chaîne est un email valide
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valider qu'une chaîne est un numéro de téléphone français valide
 */
export function isValidFrenchPhone(phone: string): boolean {
  // Format français : +33 ou 0 suivi de 9 chiffres
  const phoneRegex = /^(\+33|0)[1-9](\d{2}){4}$/;
  const cleaned = phone.replace(/[\s.-]/g, '');
  return phoneRegex.test(cleaned);
}

/**
 * Valider qu'une chaîne est un code postal français valide
 */
export function isValidFrenchPostalCode(postalCode: string): boolean {
  // Code postal français : 5 chiffres
  const postalCodeRegex = /^\d{5}$/;
  return postalCodeRegex.test(postalCode);
}

/**
 * Valider qu'une date est dans le passé
 */
export function isPastDate(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj < new Date();
}

/**
 * Valider qu'une date est dans le futur
 */
export function isFutureDate(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj > new Date();
}

/**
 * Valider qu'une date est dans une plage raisonnable
 */
export function isDateInReasonableRange(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const minDate = new Date(1900, 0, 1); // 1er janvier 1900
  const maxDate = new Date(now.getFullYear() + 1, 11, 31); // 31 décembre année prochaine

  return dateObj >= minDate && dateObj <= maxDate;
}

/**
 * Valider qu'un CUID est valide
 */
export function isValidCUID(cuid: string): boolean {
  const cuidRegex = /^c[a-z0-9]{25}$/;
  return cuidRegex.test(cuid);
}

/**
 * Valider qu'un token INS est valide
 */
export function isValidINSToken(token: string): boolean {
  const insRegex = /^\d{13}$/;
  return insRegex.test(token);
}

/**
 * Normaliser un email (minuscules, trim)
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Normaliser un numéro de téléphone français
 */
export function normalizeFrenchPhone(phone: string): string {
  // Supprimer les espaces, points, tirets
  const cleaned = phone.replace(/[\s.-]/g, '');
  
  // Remplacer +33 par 0
  if (cleaned.startsWith('+33')) {
    return '0' + cleaned.substring(3);
  }
  
  return cleaned;
}
