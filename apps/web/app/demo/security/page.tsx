'use client';

import dynamic from 'next/dynamic';

const SecurityDemoClient = dynamic(
  () => import('./security-demo-client'),
  { ssr: false }
);

export default function SecurityDemoPage() {
  return <SecurityDemoClient />;
}
