/**
 * Sanitization Utilities
 * 
 * Utilitaires pour nettoyer et sanitizer les données utilisateur
 */

/**
 * Nettoyer une chaîne de caractères (supprimer caractères dangereux)
 * 
 * @param input - Chaîne à nettoyer
 * @param maxLength - Longueur maximale (défaut: 50000 pour textes médicaux)
 */
export function sanitizeString(input: string, maxLength: number = 50000): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Supprimer les caractères de contrôle et caractères spéciaux dangereux
  return input
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Caractères de contrôle
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Espaces invisibles (Zero Width)
    .replace(/[<>]/g, '') // Protéger contre XSS (supprimer < >)
    .trim()
    .substring(0, maxLength); // Limiter la longueur
}

/**
 * Nettoyer un email
 */
export function sanitizeEmail(email: string): string {
  if (typeof email !== 'string') {
    return '';
  }

  return email
    .toLowerCase()
    .trim()
    .replace(/[^\w.@+-]/g, '')
    .substring(0, 254); // Limite RFC 5321
}

/**
 * Nettoyer un numéro de téléphone
 */
export function sanitizePhone(phone: string): string {
  if (typeof phone !== 'string') {
    return '';
  }

  // Garder uniquement les chiffres, +, espaces, parenthèses, tirets
  return phone.replace(/[^\d+\s()-]/g, '').trim().substring(0, 20);
}

/**
 * Nettoyer un code INS
 */
export function sanitizeINSToken(token: string): string {
  if (typeof token !== 'string') {
    return '';
  }

  // Garder uniquement les chiffres
  return token.replace(/\D/g, '').substring(0, 13);
}

/**
 * Nettoyer un objet récursivement
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj };

  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeString(sanitized[key]) as any;
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key]);
    }
  }

  return sanitized;
}
