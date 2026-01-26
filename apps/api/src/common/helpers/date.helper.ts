/**
 * Date Helpers
 * 
 * Utilitaires pour la manipulation de dates
 */

/**
 * Formater une date pour affichage
 */
export function formatDate(date: Date, format: 'short' | 'long' = 'short'): string {
  if (format === 'short') {
    return date.toLocaleDateString('fr-FR');
  }
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Vérifier si une date est dans le passé
 */
export function isPast(date: Date): boolean {
  return date < new Date();
}

/**
 * Vérifier si une date est dans le futur
 */
export function isFuture(date: Date): boolean {
  return date > new Date();
}

/**
 * Calculer l'âge à partir d'une date de naissance
 */
export function calculateAge(birthDate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Vérifier si une date est valide pour une consultation
 */
export function isValidConsultationDate(date: Date): boolean {
  const now = new Date();
  const maxPastDate = new Date(now.getFullYear() - 10, 0, 1); // 10 ans dans le passé max
  const maxFutureDate = new Date(now.getFullYear() + 1, 11, 31); // 1 an dans le futur max
  
  return date >= maxPastDate && date <= maxFutureDate;
}
