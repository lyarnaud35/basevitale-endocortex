/**
 * Date Range Utilities
 * 
 * Utilitaires pour gérer les plages de dates
 */

/**
 * Obtenir le début et la fin d'un jour
 */
export function getDayRange(date: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Obtenir le début et la fin d'une semaine
 */
export function getWeekRange(date: Date = new Date()): { start: Date; end: Date } {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Lundi

  const start = new Date(date.setDate(diff));
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Obtenir le début et la fin d'un mois
 */
export function getMonthRange(date: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Obtenir le début et la fin d'une année
 */
export function getYearRange(date: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), 0, 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date.getFullYear(), 11, 31);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * Vérifier si une date est dans une plage
 */
export function isDateInRange(date: Date, start: Date, end: Date): boolean {
  return date >= start && date <= end;
}

/**
 * Obtenir tous les jours entre deux dates
 */
export function getDaysBetween(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(start);

  while (current <= end) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
}
