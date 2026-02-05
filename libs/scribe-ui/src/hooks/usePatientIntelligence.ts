import { useEffect, useState } from 'react';
import type { ScribeConfig } from '../config';
import { getPatientIntelligence } from '../api/scribe-client';
import type { IntelligenceResponse } from '@basevitale/shared';

export interface UsePatientIntelligenceResult {
  data: IntelligenceResponse | null;
  loading: boolean;
  error: string | null;
  /** true when fetch was attempted (patientId set) and failed */
  disconnected: boolean;
}

/**
 * Fetch GET /api/scribe/patient/:patientId/intelligence.
 * Skip fetch when patientId is missing. Robust: no throw, error → disconnected.
 */
export function usePatientIntelligence(
  patientId: string | undefined,
  config: ScribeConfig
): UsePatientIntelligenceResult {
  const [data, setData] = useState<IntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientId?.trim()) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    getPatientIntelligence(config, patientId.trim())
      .then((res) => {
        if (!cancelled) {
          setData(res);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg);
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [patientId, config.apiBaseUrl]);

  const hasPatient = Boolean(patientId?.trim());
  const disconnected = hasPatient && Boolean(error);

  return {
    data,
    loading,
    error,
    disconnected,
  };
}
