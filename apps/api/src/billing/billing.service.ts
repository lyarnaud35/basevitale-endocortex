import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { runEngine } from './rules/rule-engine';
import type { BillingContext } from './rules/rule-engine.types';
import { PatientContextService } from './patient-context.service';
import { BillingRulesService } from './billing-rules.service';
import {
  simulateInputSchema,
  billingContextSchema,
  BillingErrorCodes,
  type BillingValidationError,
} from './schemas/billing-context.schema';
import { PrismaService } from '../prisma/prisma.service';

export interface BreakdownLine {
  label: string;
  amount: number;
  ruleId?: string;
}

export interface SimulateBillingResult {
  total: number;
  breakdown: BreakdownLine[];
  amo: number;
  amc: number;
  amount_patient: number;
  message?: string;
  patient_context?: { patientId: string; age: number; coverage?: number };
}

/** Actions possibles sur le cycle de vie (FSM). Le front n'affiche que ce que le backend autorise. */
export const INVOICE_ACTIONS = ['VALIDATE', 'TRANSMIT', 'MARK_PAID', 'REJECT'] as const;
export type InvoiceAction = (typeof INVOICE_ACTIONS)[number];

/** Transitions légales : depuis un statut, quelles actions mènent à quel statut. */
const INVOICE_TRANSITIONS: Record<string, Partial<Record<InvoiceAction, string>>> = {
  DRAFT: { VALIDATE: 'VALIDATED', REJECT: 'REJECTED' },
  VALIDATED: { TRANSMIT: 'TRANSMITTED' },
  TRANSMITTED: { MARK_PAID: 'PAID', REJECT: 'REJECTED' },
  PAID: {},
  REJECTED: {},
};

/** Contexte minimal pour vérifier l'intégrité (actes, montant). */
export interface InvoiceIntegrityInput {
  acts: string[];
  totalAmount: number | { toNumber?: () => number };
}

/** Résultat du garde d'intégrité : la facture est-elle validable ? */
export interface InvoiceIntegrityResult {
  ok: boolean;
  reason?: string;
}

/**
 * Garde (Guard) : une facture ne peut passer en VALIDATED que si elle est "complète".
 * Sinon on ne renvoie pas VALIDATE dans availableActions (et on refuse la transition en PATCH).
 */
export function checkInvoiceIntegrity(invoice: InvoiceIntegrityInput): InvoiceIntegrityResult {
  const acts = invoice.acts ?? [];
  const total = Number(invoice.totalAmount);
  if (acts.length === 0) {
    return { ok: false, reason: 'Aucun acte sur la facture.' };
  }
  if (Number.isNaN(total) || total <= 0) {
    return { ok: false, reason: 'Le montant total doit être strictement positif.' };
  }
  return { ok: true };
}

/**
 * Pour un statut donné (et optionnellement la facture), liste des actions autorisées.
 * DRAFT + intégrité KO → seulement REJECT (pas VALIDATE). Ben ne verra pas le bouton "Valider".
 */
export function getAvailableActions(status: string, invoice?: InvoiceIntegrityInput | null): InvoiceAction[] {
  const next = INVOICE_TRANSITIONS[status];
  if (!next) return [];
  let actions = INVOICE_ACTIONS.filter((a) => next[a]) as InvoiceAction[];
  if (status === 'DRAFT' && invoice != null) {
    const integrity = checkInvoiceIntegrity(invoice);
    if (!integrity.ok) {
      actions = actions.filter((a) => a !== 'VALIDATE');
    }
  }
  return actions;
}

/**
 * BillingService – Interpréteur de la Loi (moteur de règles découplé).
 * Contexte validé par Zod ; règles chargées depuis la DB (BillingRulesService).
 */
@Injectable()
export class BillingService {
  constructor(
    private readonly patientContext: PatientContextService,
    private readonly billingRulesService: BillingRulesService,
    private readonly prisma: PrismaService,
  ) {}

  ping(): { status: string; module: string } {
    return { status: 'ok', module: 'billing' };
  }

  /**
   * Simule la facturation : validation Zod → contexte → moteur JSON.
   * Lance BadRequestException avec code (MISSING_CONTEXT / INVALID_CONTEXT) si données invalides.
   */
  simulate(acts: string[], patientId?: string, patientAge?: number): SimulateBillingResult {
    const inputResult = simulateInputSchema.safeParse({ acts, patientId, patientAge });
    if (!inputResult.success) {
      const first = inputResult.error.flatten().fieldErrors;
      const field = Object.keys(first)[0];
      const msg = first[field]?.[0] ?? inputResult.error.message;
      this.throwValidationError(BillingErrorCodes.VALIDATION_ERROR, field ?? 'input', msg, first);
    }

    let patient: BillingContext['patient'];
    if (patientId) {
      const resolved = this.patientContext.getEngineContext(patientId);
      if (resolved === undefined) {
        this.throwValidationError(
          BillingErrorCodes.MISSING_CONTEXT,
          'patient',
          'Patient inconnu ou données manquantes. Vérifiez l\'identifiant patient.',
        );
      }
      patient = resolved;
    } else if (patientAge != null) {
      patient = { age: patientAge };
    }

    const ctx: BillingContext = { acts, patient };
    const ctxResult = billingContextSchema.safeParse(ctx);
    if (!ctxResult.success) {
      const first = ctxResult.error.flatten().fieldErrors;
      const path = Object.keys(first)[0] ?? 'context';
      const msg = (first as Record<string, string[] | undefined>)[path]?.[0] ?? ctxResult.error.message;
      this.throwValidationError(BillingErrorCodes.INVALID_CONTEXT, path, msg, first);
    }

    const engineResult = runEngine(ctx, this.billingRulesService.getRules());

    const result: SimulateBillingResult = {
      total: engineResult.total,
      breakdown: engineResult.breakdown,
      amo: engineResult.amo,
      amc: engineResult.amc,
      amount_patient: engineResult.amount_patient,
    };

    if (engineResult.breakdown.length > 1) {
      result.message = "Tarif ajusté automatiquement selon l'âge du patient.";
    }
    if (engineResult.modifier_applied) {
      result.message = 'Tiers payant appliqué (CMU/C2S) : 0 € à payer par le patient.';
    }

    if (patientId && patient) {
      result.patient_context = {
        patientId,
        age: patient.age ?? 0,
        coverage: patient.coverage,
      };
    }

    return result;
  }

  /**
   * Cristallise le calcul en facture (Grand Livre).
   * Même validation que simulate ; persiste en base avec status DRAFT et rulesVersion pour l'audit.
   */
  async createInvoice(
    acts: string[],
    patientId?: string,
    patientAge?: number,
  ): Promise<{
    id: string;
    patientId: string | null;
    totalAmount: number;
    breakdown: SimulateBillingResult['breakdown'];
    amo: number;
    amc: number;
    amount_patient: number;
    status: string;
    rulesVersion: string;
    createdAt: Date;
  }> {
    const result = this.simulate(acts, patientId, patientAge);
    const rulesVersion = this.billingRulesService.getRulesVersion();
    const breakdownPayload = JSON.parse(
      JSON.stringify({
        lines: result.breakdown,
        amo: result.amo,
        amc: result.amc,
        amount_patient: result.amount_patient,
      }),
    );
    let prismaPatientId: string | null = null;
    if (patientId) {
      const exists = await this.prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } });
      if (exists) prismaPatientId = patientId;
    }
    const invoice = await this.prisma.invoice.create({
      data: {
        patientId: prismaPatientId,
        totalAmount: result.total,
        breakdown: breakdownPayload,
        acts,
        status: 'DRAFT',
        rulesVersion,
      },
    });
    return {
      id: invoice.id,
      patientId: invoice.patientId,
      totalAmount: Number(invoice.totalAmount),
      breakdown: result.breakdown,
      amo: result.amo,
      amc: result.amc,
      amount_patient: result.amount_patient,
      status: invoice.status,
      rulesVersion: invoice.rulesVersion,
      createdAt: invoice.createdAt,
    };
  }

  /** Récupère une facture par id. Lance NotFoundException si absente. */
  async getInvoice(id: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException(`Facture ${id} introuvable.`);
    const breakdown = invoice.breakdown as { lines?: BreakdownLine[]; amo?: number; amc?: number; amount_patient?: number };
    return {
      id: invoice.id,
      patientId: invoice.patientId,
      totalAmount: Number(invoice.totalAmount),
      breakdown: breakdown?.lines ?? [],
      amo: breakdown?.amo ?? 0,
      amc: breakdown?.amc ?? 0,
      amount_patient: breakdown?.amount_patient ?? 0,
      status: invoice.status,
      rulesVersion: invoice.rulesVersion,
      fseToken: invoice.fseToken,
      fseGeneratedAt: invoice.fseGeneratedAt ?? undefined,
      acts: invoice.acts,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    };
  }

  /** État + actions autorisées (avec gardes : pas de VALIDATE si intégrité KO). */
  async getInvoiceLifecycle(id: string) {
    const invoice = await this.getInvoice(id);
    const integrity = checkInvoiceIntegrity({ acts: invoice.acts, totalAmount: invoice.totalAmount });
    return {
      ...invoice,
      availableActions: getAvailableActions(invoice.status, { acts: invoice.acts, totalAmount: invoice.totalAmount }),
      integrityCheck: integrity,
    };
  }

  /**
   * Transition FSM : exécute une action si elle est légale et si les gardes passent.
   * Garde VALIDATE : intégrité (actes, montant > 0) → sinon PreconditionFailed 412.
   * TRANSMIT → génère fseToken + fseGeneratedAt (traçabilité).
   */
  async transitionInvoice(id: string, action: InvoiceAction) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException(`Facture ${id} introuvable.`);
    const nextStatus = INVOICE_TRANSITIONS[invoice.status]?.[action];
    if (!nextStatus) {
      throw new BadRequestException(
        `Transition interdite : impossible de faire "${action}" depuis le statut "${invoice.status}".`,
      );
    }
    if (action === 'VALIDATE') {
      const integrity = checkInvoiceIntegrity({
        acts: invoice.acts,
        totalAmount: invoice.totalAmount,
      });
      if (!integrity.ok) {
        throw new HttpException(
          { code: 'PRECONDITION_FAILED', message: integrity.reason ?? 'Facture non validable.' },
          HttpStatus.PRECONDITION_FAILED,
        );
      }
    }
    const update: { status: string; fseToken?: string; fseGeneratedAt?: Date } = { status: nextStatus };
    if (action === 'TRANSMIT') {
      update.fseToken = `FSE-${randomUUID()}`;
      update.fseGeneratedAt = new Date();
    }
    const updated = await this.prisma.invoice.update({
      where: { id },
      data: update,
    });
    return this.getInvoice(updated.id);
  }

  private throwValidationError(
    code: BillingValidationError['code'],
    field: string | undefined,
    message: string,
    details?: unknown,
  ): never {
    const body: BillingValidationError = { code, field, message };
    if (details !== undefined) body.details = details;
    throw new BadRequestException(body);
  }
}
