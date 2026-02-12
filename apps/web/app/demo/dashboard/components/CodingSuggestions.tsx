import type { GhostCodingSuggestion } from '../ghost-types';

export function CodingSuggestions({
  suggestions,
}: {
  suggestions: GhostCodingSuggestion[];
}) {
  return (
    <div className="bg-slate-50 p-4 rounded border border-slate-200">
      <h3 className="font-bold text-slate-700 mb-3 text-sm">
        🧠 Suggestions IA (CIM-10)
      </h3>
      <div className="space-y-2">
        {suggestions.map((sugg, idx) => (
          <div
            key={idx}
            className="flex justify-between items-center bg-white p-2 rounded shadow-sm border border-slate-100"
          >
            <div>
              <span className="font-mono font-bold text-blue-600 mr-2">
                {sugg.code}
              </span>
              <span className="text-sm text-gray-700">{sugg.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${sugg.confidence * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-400">
                {(sugg.confidence * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
