/**
 * String Utilities
 * 
 * Utilitaires pour la manipulation de chaînes
 */

/**
 * Tronquer une chaîne avec ellipsis
 */
export function truncate(str: string, length: number, ellipsis: string = '...'): string {
  if (str.length <= length) {
    return str;
  }
  return str.substring(0, length - ellipsis.length) + ellipsis;
}

/**
 * Capitaliser la première lettre
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Capitaliser chaque mot
 */
export function capitalizeWords(str: string): string {
  return str
    .split(/\s+/)
    .map((word) => capitalize(word))
    .join(' ');
}

/**
 * Normaliser un nom (prénom/nom de famille)
 * Exemple: "JEAN-MARIE" -> "Jean-Marie"
 */
export function normalizeName(name: string): string {
  return name
    .split(/[\s-]+/)
    .map((part) => capitalize(part))
    .join('-');
}

/**
 * Extraire les initiales d'un nom complet
 */
export function getInitials(fullName: string, maxInitials: number = 2): string {
  const parts = fullName.trim().split(/\s+/);
  return parts
    .slice(0, maxInitials)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

/**
 * Masquer une partie d'un texte (pour la confidentialité)
 */
export function maskText(text: string, visibleStart: number = 3, visibleEnd: number = 3, maskChar: string = '*'): string {
  if (text.length <= visibleStart + visibleEnd) {
    return maskChar.repeat(text.length);
  }

  const start = text.substring(0, visibleStart);
  const end = text.substring(text.length - visibleEnd);
  const masked = maskChar.repeat(Math.max(0, text.length - visibleStart - visibleEnd));

  return start + masked + end;
}

/**
 * Masquer un email (ex: j***@example.com)
 */
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!domain) return email;

  const maskedLocal = localPart.length > 2
    ? localPart.charAt(0) + '*'.repeat(Math.min(3, localPart.length - 2)) + localPart.charAt(localPart.length - 1)
    : '*'.repeat(localPart.length);

  return `${maskedLocal}@${domain}`;
}

/**
 * Masquer un numéro de téléphone
 */
export function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 6) return '*'.repeat(phone.length);

  const visible = cleaned.substring(0, 2) + cleaned.substring(cleaned.length - 2);
  const masked = '*'.repeat(cleaned.length - 4);

  return phone.replace(/\d/g, (char, index) => {
    const pos = phone.substring(0, index).replace(/\D/g, '').length;
    if (pos < 2 || pos >= cleaned.length - 2) return char;
    return '*';
  });
}
