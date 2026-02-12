import type { SecurityLevel, GhostActiveOverride } from '../ghost-types';

export function SecurityMonitor({
  status,
  reasons,
  allowed_actions = [],
  active_override,
  confirmation_message,
  onOverride,
  onValidatePrescription,
  onReset,
}: {
  status: SecurityLevel;
  reasons: string[];
  allowed_actions?: ('OVERRIDE' | 'ACKNOWLEDGE' | 'VALIDATE_PRESCRIPTION' | 'RESET')[];
  active_override?: GhostActiveOverride;
  confirmation_message?: string;
  onOverride?: () => void;
  onValidatePrescription?: () => void;
  onReset?: () => void;
}) {
  const isCritical = status === 'DEFCON_3';
  const isOverrideActive = status === 'OVERRIDE_ACTIVE';
  const isSuccess = status === 'SUCCESS';

  const borderClass = isCritical
    ? 'border-red-500 bg-red-50'
    : isOverrideActive
      ? 'border-amber-500 bg-amber-50'
      : isSuccess
        ? 'border-emerald-600 bg-emerald-50'
        : 'border-green-500 bg-green-50';

  const badgeClass = isCritical
    ? 'bg-red-500 text-white'
    : isOverrideActive
      ? 'bg-amber-500 text-white'
      : isSuccess
        ? 'bg-emerald-600 text-white'
        : 'bg-green-500 text-white';

  return (
    <div className={`border-l-4 p-4 rounded shadow-sm ${borderClass}`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-lg uppercase tracking-wider">
          Système Immunitaire
        </h3>
        <span className={`px-2 py-1 rounded text-xs font-bold ${badgeClass}`}>
          {status}
        </span>
      </div>

      {isSuccess && (
        <div className="mb-3 p-3 rounded bg-emerald-100 border border-emerald-400">
          <p className="text-sm font-semibold text-emerald-900">
            Prescription envoyée. L&apos;incident a été archivé pour
            l&apos;apprentissage du système.
          </p>
          {confirmation_message && (
            <p className="text-xs text-emerald-800 mt-1">{confirmation_message}</p>
          )}
        </div>
      )}

      {isOverrideActive && active_override && (
        <div className="mb-3 p-3 rounded bg-amber-100 border border-amber-300">
          <p className="text-sm font-semibold text-amber-900">
            Dérogation Active : {active_override.reason}
          </p>
          {active_override.author && (
            <p className="text-xs text-amber-800 mt-1">
              Sous responsabilité : {active_override.author}
            </p>
          )}
        </div>
      )}

      {!isSuccess && reasons.length > 0 ? (
        <ul className="space-y-1">
          {reasons.map((reason, idx) => (
            <li
              key={idx}
              className={`flex items-center text-sm font-medium ${
                isOverrideActive ? 'text-amber-800' : 'text-red-700'
              }`}
            >
              🚫 {reason}
            </li>
          ))}
        </ul>
      ) : (
        !isOverrideActive &&
        !isSuccess && (
          <p className="text-sm text-green-700">Aucune contrainte active.</p>
        )
      )}

      {allowed_actions.includes('OVERRIDE') && onOverride && (
        <button
          type="button"
          onClick={onOverride}
          className="mt-3 w-full bg-red-600 text-white text-xs font-bold py-2 rounded hover:bg-red-700 transition"
        >
          ⚠ FORCER LE PASSAGE (JUSTIFICATION REQUISE)
        </button>
      )}

      {allowed_actions.includes('VALIDATE_PRESCRIPTION') && onValidatePrescription && (
        <button
          type="button"
          onClick={onValidatePrescription}
          className="mt-3 w-full bg-amber-600 text-white text-xs font-bold py-2 rounded hover:bg-amber-700 transition"
        >
          ✓ Confirmer l&apos;ordonnance
        </button>
      )}

      {allowed_actions.includes('RESET') && onReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-3 w-full bg-emerald-600 text-white text-xs font-bold py-2 rounded hover:bg-emerald-700 transition"
        >
          Nouvelle prescription
        </button>
      )}
    </div>
  );
}
