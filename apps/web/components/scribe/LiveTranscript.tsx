'use client';

export interface LiveTranscriptProps {
  text: string;
  isRecording: boolean;
}

/**
 * Zone de transcript en direct.
 * Si isRecording, affiche une indication "(Écoute...)" avec pulse.
 * Composant dumb : affichage uniquement.
 */
export function LiveTranscript({ text, isRecording }: LiveTranscriptProps) {
  return (
    <div className="border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 min-h-[120px] bg-zinc-50 dark:bg-zinc-900">
      <div className="text-xs text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wide">
        Transcript
      </div>
      {text ? (
        <p className="text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">
          {text}
        </p>
      ) : (
        <p className="text-zinc-400 dark:text-zinc-500 italic">
          {isRecording ? (
            <span className="inline-flex items-center gap-2">
              <span
                className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse"
                aria-hidden
              />
              Écoute…
            </span>
          ) : (
            '—'
          )}
        </p>
      )}
    </div>
  );
}
