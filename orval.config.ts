import { defineConfig } from 'orval';

/**
 * GHOST PROTOCOL - Usine à SDK (Semaine 4 - Golden Master)
 * Génère le client TypeScript + React Query depuis le Swagger.
 *
 * Workflow recommandé (Orval exige Node 20 LTS, pas Node 24) :
 *   1. npm run dev:api
 *   2. npm run openapi:fetch     → enregistre openapi/base-vitale.json
 *   3. nvm use 20 && npm run sdk:gen:file   → génère libs/ghost-sdk/.../base-vitale.ts
 *
 * Sinon (API up + Node 20) : npm run sdk:gen (lit directement l'URL).
 */
export default defineConfig({
  /** Source : URL live (API doit tourner). */
  baseVitale: {
    input: {
      target: 'http://localhost:3000/api-json',
      validation: false, // évite Spectral/AJV (incompat Node 24)
    },
    output: {
      mode: 'single',
      target: 'libs/ghost-sdk/src/lib/generated/base-vitale.ts',
      schemas: 'libs/ghost-sdk/src/lib/generated/model',
      client: 'react-query',
    },
  },
  /** Source : fichier (après openapi:fetch). Permet de générer sans API. */
  baseVitaleFromFile: {
    input: {
      target: './openapi/base-vitale.json',
      validation: false, // évite Spectral/AJV (incompat Node 24)
    },
    output: {
      mode: 'single',
      target: 'libs/ghost-sdk/src/lib/generated/base-vitale.ts',
      schemas: 'libs/ghost-sdk/src/lib/generated/model',
      client: 'react-query',
    },
  },
});
