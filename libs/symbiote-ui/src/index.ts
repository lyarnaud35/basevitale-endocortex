/**
 * @basevitale/symbiote-ui – Widgets Symbiote (Scribe, Billing, Coding).
 * Aucune dépendance Next.js. Utiliser <MedicalScribe /> etc. dans le Host.
 */

export { MedicalScribe, type MedicalScribeProps } from './components/MedicalScribe';
export { ScribeTestView, type ScribeTestViewProps } from './components/ScribeTestView';
export { KnowledgeGraphVisualizer, type KnowledgeGraphVisualizerProps } from './components/KnowledgeGraphVisualizer';
export { useDebouncedCallback } from './hooks/useDebounce';
export type { ScribeConfig } from './config';
export { DEFAULT_API_BASE, resolveToken } from './config';
export { formatApiError } from './utils/format-api-error';
