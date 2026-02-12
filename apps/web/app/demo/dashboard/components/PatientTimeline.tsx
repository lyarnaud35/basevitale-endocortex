import type { GhostTimelineEvent } from '../ghost-types';

export function PatientTimeline({ events }: { events: GhostTimelineEvent[] }) {
  return (
    <div className="bg-white p-4 rounded border shadow-sm h-full">
      <h3 className="font-bold text-gray-700 mb-4 border-b pb-2">
        Chronologie Clinique
      </h3>
      <div className="space-y-4 relative pl-4 border-l-2 border-gray-200">
        {events.map((evt, idx) => (
          <div key={idx} className="relative">
            <div className="absolute -left-[21px] top-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white" />
            <p className="text-xs text-gray-500 font-mono">{evt.date}</p>
            <p className="text-sm font-medium text-gray-800">{evt.summary}</p>
            <span className="text-xs bg-gray-100 px-1 rounded text-gray-500">
              {evt.type}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
