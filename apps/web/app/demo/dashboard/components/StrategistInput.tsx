'use client';

import { useState } from 'react';

/**
 * Champ de test : envoie le texte au Cortex via WebSocket (text_input) ou fallback HTTP.
 * Ex. "Grippe" → widget apparaît ; "fatigue" → widget disparaît (SILENT).
 */
export function StratègeInput({
  submitText,
  disabled,
}: {
  submitText?: (text: string) => void;
  disabled?: boolean;
} = {}) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const send = () => {
    if (submitText) {
      submitText(text || '');
      setText('');
      return;
    }
    setSending(true);
    fetch('/api/coding/strategist/input', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text || '' }),
    })
      .then((res) => { if (!res.ok) throw new Error(res.statusText); setText(''); })
      .catch((e) => console.error('Stratège input failed', e))
      .finally(() => setSending(false));
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        placeholder="Ex: Grippe, fatigue, error"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && send()}
        className="flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
      />
      <button
        type="button"
        onClick={send}
        disabled={disabled ?? sending}
        className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {sending ? '…' : 'Envoyer'}
      </button>
    </div>
  );
}
