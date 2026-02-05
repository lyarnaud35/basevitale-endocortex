'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(i: number): SpeechRecognitionResult;
  [i: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(i: number): SpeechRecognitionAlternative;
  [i: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

export interface UseSpeechRecognitionResult {
  supported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useSpeechRecognition(lang = 'fr-FR'): UseSpeechRecognitionResult {
  const [supported, setSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const finalRef = useRef('');

  useEffect(() => {
    const Recognition = typeof window !== 'undefined' && (window.SpeechRecognition ?? window.webkitSpeechRecognition);
    setSupported(Boolean(Recognition));
    if (!Recognition) return;
    const rec = new Recognition() as SpeechRecognitionInstance;
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = lang;
    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = '';
      let final = finalRef.current;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const alt = result[0];
        const text = alt?.transcript?.trim() ?? '';
        if (!text) continue;
        if (result.isFinal) {
          final += (final ? ' ' : '') + text;
        } else {
          interim += (interim ? ' ' : '') + text;
        }
      }
      finalRef.current = final;
      setTranscript(final);
      setInterimTranscript(interim);
    };
    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return;
      setError(e.message ?? e.error ?? 'Erreur reconnaissance vocale');
    };
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    return () => {
      try {
        rec.abort();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
    };
  }, [lang]);

  const start = useCallback(() => {
    setError(null);
    finalRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    const rec = recognitionRef.current;
    if (!rec) {
      setError('Reconnaissance vocale non supportée');
      return;
    }
    try {
      rec.start();
      setIsListening(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de démarrer le micro');
    }
  }, []);

  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    }
    setIsListening(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    finalRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, [stop]);

  return {
    supported,
    isListening,
    transcript,
    interimTranscript,
    error,
    start,
    stop,
    reset,
  };
}
