'use client';

import dynamic from 'next/dynamic';

/**
 * Page démo Ghost Scribe — chargée sans SSR pour éviter tout mismatch d'hydratation.
 * Le contenu (useGhostScribe, machineState avec updatedAt) est uniquement rendu côté client.
 */
const GhostScribeDemoClient = dynamic(
  () => import('./ghost-scribe-demo-client'),
  { ssr: false }
);

export default function GhostScribeDemoPage() {
  return <GhostScribeDemoClient />;
}
