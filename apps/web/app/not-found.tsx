import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">404</h1>
      <p className="text-gray-600 mb-4">Page introuvable.</p>
      <Link href="/" className="text-blue-600 hover:underline">
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
