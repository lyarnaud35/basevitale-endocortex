import type { ScribeConfig } from '../config';
import { resolveToken } from '../config';
import { formatApiError } from '../utils/format-api-error';

function baseUrl(cfg: ScribeConfig) {
  const u = cfg.apiBaseUrl.replace(/\/$/, '');
  return u.endsWith('/api') ? u : `${u}/api`;
}

function auth(cfg: ScribeConfig) {
  return resolveToken(cfg.getToken);
}

export async function processDictation(
  cfg: ScribeConfig,
  payload: { text: string; patientId: string }
): Promise<{ draft?: { id: string }; draftId?: string; consultation?: unknown; data?: unknown }> {
  const res = await fetch(`${baseUrl(cfg)}/scribe/process-dictation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth(cfg) },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({ message: `HTTP ${res.status}` }));
    const e = new Error((d as { message?: string }).message || (d as { error?: string }).error || 'Erreur') as Error & {
      status?: number;
      data?: unknown;
    };
    e.status = res.status;
    e.data = d;
    throw e;
  }
  const raw = await res.json();
  const data = (raw as { data?: unknown }).data ?? raw;
  const id = (data as { draft?: { id: string }; draftId?: string; consultation?: { draftId?: string } }).draft?.id
    ?? (data as { draftId?: string }).draftId
    ?? (data as { consultation?: { draftId?: string } }).consultation?.draftId;
  if (id && typeof data === 'object') (data as { draftId?: string }).draftId = id;
  return data as { draft?: { id: string }; draftId?: string; consultation?: unknown; data?: unknown };
}

export async function getDraft(
  cfg: ScribeConfig,
  draftId: string
): Promise<{ draft?: { id: string; status?: string }; consultation?: unknown }> {
  const res = await fetch(`${baseUrl(cfg)}/scribe/draft/${draftId}`, {
    headers: { Authorization: auth(cfg) },
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    const e = new Error((d as { message?: string }).message || (d as { error?: string }).error || 'Erreur') as Error & {
      status?: number;
      data?: unknown;
    };
    e.status = res.status;
    e.data = d;
    throw e;
  }
  const json = await res.json();
  const payload = (json as { data?: unknown }).data ?? json;
  return payload as { draft?: { id: string; status?: string }; consultation?: unknown };
}

export async function patchDraft(
  cfg: ScribeConfig,
  draftId: string,
  structuredData: unknown
): Promise<{ consultation?: unknown }> {
  const res = await fetch(`${baseUrl(cfg)}/scribe/draft/${draftId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: auth(cfg) },
    body: JSON.stringify({ structuredData }),
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    const e = new Error((d as { message?: string }).message || (d as { error?: string }).error || 'Erreur') as Error & {
      status?: number;
      data?: unknown;
    };
    e.status = res.status;
    e.data = d;
    throw e;
  }
  const json = await res.json();
  return (json as { data?: unknown }).data ?? json;
}

export async function validateDraft(cfg: ScribeConfig, draftId: string): Promise<{ nodesCreated?: number; neo4jRelationsCreated?: number }> {
  const res = await fetch(`${baseUrl(cfg)}/scribe/draft/${draftId}/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth(cfg) },
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    const e = new Error((d as { message?: string }).message || (d as { error?: string }).error || 'Erreur') as Error & {
      status?: number;
      data?: unknown;
    };
    e.status = res.status;
    e.data = d;
    throw e;
  }
  const json = await res.json();
  const payload = (json as { data?: unknown }).data ?? json;
  return payload as { nodesCreated?: number; neo4jRelationsCreated?: number };
}

/** Endpoint alternatif utilisé par la page test : POST /scribe/validate/:id */
export async function validateDraftAlt(cfg: ScribeConfig, draftId: string): Promise<unknown> {
  const res = await fetch(`${baseUrl(cfg)}/scribe/validate/${draftId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth(cfg) },
  });
  if (!res.ok) {
    const d = await res.json().catch(() => ({}));
    const e = new Error((d as { message?: string }).message || (d as { error?: string }).error || 'Erreur') as Error & {
      status?: number;
      data?: unknown;
    };
    e.status = res.status;
    e.data = d;
    throw e;
  }
  return res.json();
}

export async function health(cfg: ScribeConfig): Promise<{ status?: string; data?: { status?: string } }> {
  const res = await fetch(`${baseUrl(cfg)}/scribe/health`);
  if (!res.ok) return { status: 'unhealthy' };
  const json = await res.json();
  const data = (json as { data?: unknown }).data ?? json;
  const s = (data as { status?: string }).status;
  return { status: s ?? 'unhealthy', data: data as { status?: string } };
}

export async function listDrafts(
  cfg: ScribeConfig,
  params: { patientId?: string; limit?: number }
): Promise<{ items: Array<{ id: string; patientId: string; status: string; createdAt: string }> }> {
  const q = new URLSearchParams();
  if (params.patientId) q.set('patientId', params.patientId);
  q.set('limit', String(params.limit ?? 10));
  const res = await fetch(`${baseUrl(cfg)}/scribe/drafts?${q}`, {
    headers: { Authorization: auth(cfg) },
  });
  if (!res.ok) return { items: [] };
  const json = await res.json();
  const items = (json as { data?: { items?: unknown[] } }).data?.items ?? [];
  return { items: items as Array<{ id: string; patientId: string; status: string; createdAt: string }> };
}

export { formatApiError };
