/**
 * Constantes API
 */

// Prefix global
export const API_PREFIX = 'api';

// Versions API
export const API_VERSION = 'v1';

// Rate limiting
export const RATE_LIMIT_TTL = 60; // seconds
export const RATE_LIMIT_MAX = 100; // requests per TTL

// Pagination
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// File upload
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'audio/mpeg',
  'audio/wav',
  'audio/webm',
];

// Validation
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_STRING_LENGTH = 1000;
