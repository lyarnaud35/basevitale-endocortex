import { z } from 'zod';
import { Injectable, Logger } from '@nestjs/common';
import type { PatientContextData } from '../patient-context-machine.schema';
import { ConfigService } from '../../common/services/config.service';
import { getRawPatientContext, type RawPatientGraphData } from '../patient-graph.mock';
import type { OracleContextStrategy } from './oracle-context.strategy';

/** Format date attendu (YYYY-MM-DD ou début ISO). Champs inconnus strip par défaut Zod. */
const DATE_ISO_PATTERN = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/;

/**
 * Schéma strict pour la sortie Gemini : strip des champs inconnus, rejet si champ obligatoire
 * manquant ou format invalide (ex. date non ISO). Utilisé avant injection dans la State Machine.
 */
const StrictTimelineItemSchema = z.object({
  date: z.string().regex(DATE_ISO_PATTERN, 'date au format ISO (YYYY-MM-DD)'),
  type: z.string().min(1),
  summary: z.string(),
}).strict();

const StrictAlertSchema = z.object({
  level: z.enum(['HIGH', 'MEDIUM']),
  message: z.string(),
}).strict();

const StrictPatientContextDataSchema = z.object({
  patientId: z.string().min(1),
  timeline: z.array(StrictTimelineItemSchema),
  alertes: z.array(StrictAlertSchema),
}).strict();

/** System Instruction stricte pour forcer un JSON valide (Gemini peut être bavard). */
const ORACLE_SYSTEM_INSTRUCTION = `Tu es un Oracle Médical. Tu réponds UNIQUEMENT par un objet JSON valide, sans aucun texte avant ou après, sans markdown.

Format obligatoire:
{"timeline":[{"date":"YYYY-MM-DD","type":"string","summary":"string"}],"alertes":[{"level":"HIGH" ou "MEDIUM","message":"string"}]}

Règles:
- timeline: extraire les faits des consultations, diagnostics, médicaments (date ISO, type, résumé concis).
- alertes: allergies, interactions, points de vigilance (level HIGH ou MEDIUM uniquement).
- Aucun commentaire, aucune explication: uniquement le JSON.`;

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Strategy LIVE : Mock Graph + API Google Gemini.
 * Utilise System Instruction + responseMimeType pour forcer le format JSON strict.
 */
@Injectable()
export class LiveOracleStrategy implements OracleContextStrategy {
  private readonly logger = new Logger(LiveOracleStrategy.name);

  constructor(private readonly configService: ConfigService) {}

  async fetchContext(patientId: string): Promise<PatientContextData> {
    const apiKey = this.configService.geminiApiKey;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY requise pour ORACLE_MODE=LIVE');
    }

    const raw = await getRawPatientContext(patientId);
    const userPrompt = buildUserPrompt(raw);
    const model = this.configService.geminiModel;
    const url = `${GEMINI_BASE}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const body = {
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: ORACLE_SYSTEM_INSTRUCTION }] },
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    };

    this.logger.debug(`Gemini request model=${model}`);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API ${res.status}: ${errText}`);
    }

    const json = (await res.json()) as GeminiGenerateContentResponse;
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text || typeof text !== 'string') {
      throw new Error('Réponse Gemini sans texte');
    }

    const parsed = parseOracleResponse(text, patientId);
    if (!parsed) {
      throw new Error('Réponse Gemini : JSON invalide ou format non conforme');
    }
    return parsed;
  }
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

function buildUserPrompt(raw: RawPatientGraphData): string {
  return `Données brutes patient (patientId: ${raw.patientId}):

Consultations:
${JSON.stringify(raw.consultations, null, 2)}

Conditions:
${JSON.stringify(raw.conditions, null, 2)}

Médicaments:
${JSON.stringify(raw.medications, null, 2)}

Symptômes récurrents: ${raw.symptomsRecurrent.join(', ')}

Notes brutes: ${raw.rawNotes ?? '—'}

Génère le JSON { "timeline": [...], "alertes": [...] } à partir de ces données.`;
}

/**
 * Parse et valide la réponse Gemini avec Zod strict :
 * - Champs inconnus : strip (ignorés).
 * - Champ obligatoire manquant ou format invalide (ex. date bizarre) : rejet → retour null
 *   (le caller throw → fallback MOCK dans processState).
 */
function parseOracleResponse(
  content: string,
  patientId: string,
): PatientContextData | null {
  const trimmed = content.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : trimmed;
  try {
    const obj = JSON.parse(jsonStr) as { timeline?: unknown[]; alertes?: unknown[] };
    const parsed = StrictPatientContextDataSchema.safeParse({
      patientId,
      timeline: Array.isArray(obj.timeline) ? obj.timeline : [],
      alertes: Array.isArray(obj.alertes) ? obj.alertes : [],
    });
    if (!parsed.success) return null;
    return parsed.data as PatientContextData;
  } catch {
    return null;
  }
}
