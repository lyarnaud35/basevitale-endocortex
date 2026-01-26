import './global.css';
import { Providers } from './providers';
import { ErrorBoundary } from '../lib/components/ErrorBoundary';

export const metadata = {
  title: 'BaseVitale',
  description: 'BaseVitale Application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <ErrorBoundary>
          <Providers>{children}</Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
