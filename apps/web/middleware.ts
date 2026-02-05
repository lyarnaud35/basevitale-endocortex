import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware minimal – évite l'erreur "Cannot find module middleware-manifest.json"
 * avec Nx + Next 14 en dev. Transparent : laisse passer toutes les requêtes.
 */
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
