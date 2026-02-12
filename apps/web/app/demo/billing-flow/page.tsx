'use client';

import { useState } from 'react';
import {
  setBaseUrl,
  getBaseUrl,
  useInvoiceLifecycle,
  type InvoiceAction,
} from '@basevitale/ghost-sdk';

const API_BASE =
  typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : '';
setBaseUrl(API_BASE);

const ACTION_LABELS: Record<InvoiceAction, string> = {
  VALIDATE: 'Valider',
  TRANSMIT: 'Télétransmettre',
  MARK_PAID: 'Marquer payée',
  REJECT: 'Rejeter',
};

export default function BillingFlowDemoPage() {
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const lifecycle = useInvoiceLifecycle(invoiceId, { enabled: !!invoiceId });

  const createInvoice = async (acts: string[]) => {
    setCreateError(null);
    setCreateLoading(true);
    try {
      const base = getBaseUrl();
      const res = await fetch(`${base}/api/billing/invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ acts }),
      });
      if (!res.ok) throw new Error(res.statusText || 'Création facture échouée');
      const data = await res.json().then((b) => b?.data ?? b);
      setInvoiceId(data.id);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-sans">
      <h1 className="text-xl font-semibold mb-2">
        Cycle de vie facture (FSM)
      </h1>
      <p className="text-zinc-400 text-sm mb-6">
        Le backend pilote les boutons : tu ne vois que les actions autorisées.
        Valider → Télétransmettre → Marquer payée. Aucune logique côté front.
      </p>

      {!invoiceId ? (
        <section className="max-w-md space-y-3">
          <p className="text-zinc-500 text-sm">
            Crée une facture brouillon puis enchaîne les transitions. Test des gardes : une facture 0 € ne peut pas être validée (bouton « Valider » absent).
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => createInvoice(['C'])}
              disabled={createLoading}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-sm"
            >
              {createLoading ? 'Création…' : 'Créer facture (Consultation 26,50 €)'}
            </button>
            <button
              type="button"
              onClick={() => createInvoice(['X'])}
              disabled={createLoading}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-medium text-sm"
            >
              Créer facture 0 € (acte inconnu)
            </button>
          </div>
          {createError && (
            <p className="text-red-400 text-sm">{createError}</p>
          )}
        </section>
      ) : (
        <section className="max-w-lg space-y-4">
          {lifecycle.isLoading && (
            <p className="text-zinc-500 text-sm">Chargement de la facture…</p>
          )}
          {lifecycle.isError && (
            <p className="text-red-400 text-sm">
              Erreur : {lifecycle.error?.message}
            </p>
          )}
          {lifecycle.data && (
            <>
              <div className="p-4 rounded-lg bg-zinc-900 border border-zinc-700">
                <p className="text-xs text-zinc-500 mb-1">Facture {lifecycle.data.id.slice(0, 8)}…</p>
                <p className="text-sm font-medium text-zinc-300">
                  Statut :{' '}
                  <span
                    className={
                      lifecycle.data.status === 'DRAFT'
                        ? 'text-amber-400'
                        : lifecycle.data.status === 'PAID'
                          ? 'text-emerald-400'
                          : lifecycle.data.status === 'REJECTED'
                            ? 'text-red-400'
                            : 'text-blue-400'
                    }
                  >
                    {lifecycle.data.status}
                  </span>
                </p>
                <p className="text-lg font-bold text-emerald-400 mt-1">
                  {lifecycle.data.totalAmount.toFixed(2)} €
                </p>
                {lifecycle.data.fseToken && (
                  <p className="text-xs text-zinc-500 mt-2">
                    FSE : {lifecycle.data.fseToken.slice(0, 20)}…
                    {lifecycle.data.fseGeneratedAt && (
                      <span> — Généré le {new Date(lifecycle.data.fseGeneratedAt).toLocaleString()}</span>
                    )}
                  </p>
                )}
                {lifecycle.integrityCheck && !lifecycle.integrityCheck.ok && (
                  <p className="text-amber-400 text-xs mt-2">
                    Non validable : {lifecycle.integrityCheck.reason}
                  </p>
                )}
                {lifecycle.data.status === 'DRAFT' && (
                  <p className="text-xs text-zinc-500 mt-1">
                    {lifecycle.canValidate ? 'Prête à valider.' : 'Bouton « Valider » masqué par le backend (garde).'}
                  </p>
                )}
              </div>

              <div>
                <p className="text-sm text-zinc-500 mb-2">Actions autorisées (par le backend) :</p>
                <div className="flex flex-wrap gap-2">
                  {lifecycle.availableActions.length === 0 ? (
                    <span className="text-zinc-500 text-sm">
                      Aucune transition possible (facture finale).
                    </span>
                  ) : (
                    lifecycle.availableActions.map((action) => (
                      <button
                        key={action}
                        type="button"
                        onClick={() => lifecycle.transition(action)}
                        disabled={lifecycle.isTransitioning}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium"
                      >
                        {ACTION_LABELS[action]}
                      </button>
                    ))
                  )}
                </div>
                {lifecycle.isTransitioning && (
                  <p className="text-zinc-500 text-xs mt-2">Transition en cours…</p>
                )}
              </div>

              <p className="text-xs text-zinc-500">
                Facture 0 € → pas de bouton « Valider » (garde d’intégrité). Facture avec montant → Valider puis Télétransmettre.
              </p>
            </>
          )}
        </section>
      )}
    </div>
  );
}
