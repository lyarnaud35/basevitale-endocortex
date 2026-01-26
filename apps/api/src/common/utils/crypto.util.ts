import * as crypto from 'crypto';

/**
 * Crypto Utilities
 * 
 * Utilitaires pour le hachage et le chiffrement
 */

/**
 * Créer un hash SHA-256
 */
export function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Créer un hash SHA-512
 */
export function sha512(data: string): string {
  return crypto.createHash('sha512').update(data).digest('hex');
}

/**
 * Générer un token aléatoire sécurisé
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Générer un code numérique aléatoire
 */
export function generateNumericCode(length: number = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
}

/**
 * Comparer deux hash de manière sécurisée (protection timing attack)
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Créer un hash HMAC
 */
export function hmac(key: string, data: string, algorithm: string = 'sha256'): string {
  return crypto.createHmac(algorithm, key).update(data).digest('hex');
}
