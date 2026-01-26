/**
 * Format Utilities
 * 
 * Utilitaires pour formater les données
 */

/**
 * Formater un nombre en montant (euros)
 */
export function formatCurrency(amount: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(amount / 100); // Montant en centimes
}

/**
 * Formater une date
 */
export function formatDate(
  date: Date | string,
  format: 'short' | 'long' | 'iso' = 'short',
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (format === 'iso') {
    return dateObj.toISOString();
  }

  const options: Intl.DateTimeFormatOptions =
    format === 'long'
      ? {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }
      : {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        };

  return dateObj.toLocaleDateString('fr-FR', options);
}

/**
 * Formater une date avec heure
 */
export function formatDateTime(
  date: Date | string,
  format: 'short' | 'long' = 'short',
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const options: Intl.DateTimeFormatOptions =
    format === 'long'
      ? {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }
      : {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        };

  return dateObj.toLocaleString('fr-FR', options);
}

/**
 * Formater un numéro de téléphone français
 */
export function formatFrenchPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 10 && cleaned.startsWith('0')) {
    // Format: 01 23 45 67 89
    return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  }

  if (cleaned.length === 13 && cleaned.startsWith('0033')) {
    // Format: +33 1 23 45 67 89
    const withoutPrefix = cleaned.substring(4);
    return `+33 ${withoutPrefix.replace(/(\d)(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5')}`;
  }

  return phone;
}

/**
 * Formater un code postal français
 */
export function formatFrenchPostalCode(postalCode: string): string {
  const cleaned = postalCode.replace(/\D/g, '');
  if (cleaned.length === 5) {
    return cleaned;
  }
  return postalCode;
}
