/**
 * File Utilities
 * 
 * Utilitaires pour la manipulation de fichiers
 */

/**
 * Obtenir l'extension d'un fichier
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Obtenir le nom du fichier sans extension
 */
export function getFileNameWithoutExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  return lastDot !== -1 ? filename.substring(0, lastDot) : filename;
}

/**
 * Vérifier si un fichier est d'un type autorisé
 */
export function isAllowedFileType(
  filename: string,
  allowedExtensions: string[],
): boolean {
  const extension = getFileExtension(filename);
  return allowedExtensions
    .map((ext) => ext.toLowerCase())
    .includes(extension.toLowerCase());
}

/**
 * Formater une taille de fichier (bytes → human readable)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Valider la taille d'un fichier
 */
export function validateFileSize(
  size: number,
  maxSizeBytes: number,
): { valid: boolean; message?: string } {
  if (size > maxSizeBytes) {
    return {
      valid: false,
      message: `File size exceeds maximum allowed size of ${formatFileSize(maxSizeBytes)}`,
    };
  }
  return { valid: true };
}
