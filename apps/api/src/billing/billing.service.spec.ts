import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, HttpException, NotFoundException } from '@nestjs/common';
import { BillingService, getAvailableActions } from './billing.service';
import { PatientContextService } from './patient-context.service';
import { BillingRulesService } from './billing-rules.service';
import { PrismaService } from '../prisma/prisma.service';
import { BillingErrorCodes } from './schemas/billing-context.schema';
import ngap2024 from './rules/ngap_2024.json';
import type { RuleDef } from './rules/rule-engine.types';

describe('BillingService', () => {
  let service: BillingService;

  const mockBillingRulesService = {
    getRules: () => ngap2024 as RuleDef[],
    getRulesVersion: () => 'NGAP_2024',
  };

  const mockInvoiceRecord = (overrides: Record<string, unknown> = {}) => ({
    id: 'inv-uuid-1',
    patientId: null,
    totalAmount: 26.5,
    breakdown: { lines: [{ label: 'Consultation (C)', amount: 26.5 }], amo: 18.55, amc: 7.95, amount_patient: 7.95 },
    acts: ['C'],
    status: 'DRAFT',
    rulesVersion: 'NGAP_2024',
    fseToken: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const mockPrismaService = {
    patient: { findUnique: jest.fn().mockResolvedValue(null) },
    invoice: {
      create: jest.fn().mockResolvedValue(mockInvoiceRecord()),
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockImplementation(({ where, data }) => Promise.resolve(mockInvoiceRecord({ ...data, id: where.id }))),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        PatientContextService,
        { provide: BillingRulesService, useValue: mockBillingRulesService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get(BillingService);
  });

  describe('ping', () => {
    it('retourne ok et module billing', () => {
      expect(service.ping()).toEqual({ status: 'ok', module: 'billing' });
    });
  });

  describe('simulate – validation & cas limites', () => {
    it('rejette un âge négatif avec VALIDATION_ERROR', () => {
      expect(() => service.simulate(['C'], undefined, -1)).toThrow(BadRequestException);
      try {
        service.simulate(['C'], undefined, -1);
      } catch (e) {
        expect(e.getResponse()).toMatchObject({
          code: BillingErrorCodes.VALIDATION_ERROR,
          field: 'patientAge',
          message: expect.stringContaining('négatif'),
        });
      }
    });

    it('rejette un âge > 120 avec VALIDATION_ERROR', () => {
      expect(() => service.simulate(['C'], undefined, 121)).toThrow(BadRequestException);
      try {
        service.simulate(['C'], undefined, 121);
      } catch (e) {
        expect(e.getResponse()).toMatchObject({
          code: BillingErrorCodes.VALIDATION_ERROR,
          field: 'patientAge',
        });
      }
    });

    it('sans patient (null / aucun contexte) : acte C → total 26,50 €', () => {
      const result = service.simulate(['C']);
      expect(result.total).toBe(26.5);
      expect(result.breakdown).toHaveLength(1);
      expect(result.breakdown[0].label).toContain('Consultation');
      expect(result.amount_patient).toBeGreaterThanOrEqual(0);
    });

    it('acte inconnu : aucun rule match → total 0, breakdown vide', () => {
      const result = service.simulate(['X']);
      expect(result.total).toBe(0);
      expect(result.breakdown).toHaveLength(0);
      expect(result.amo).toBe(0);
      expect(result.amc).toBe(0);
      expect(result.amount_patient).toBe(0);
    });

    it('patient inconnu (patientId inexistant) → MISSING_CONTEXT', () => {
      expect(() => service.simulate(['C'], 'unknown_patient_id')).toThrow(BadRequestException);
      try {
        service.simulate(['C'], 'unknown_patient_id');
      } catch (e) {
        expect(e.getResponse()).toMatchObject({
          code: BillingErrorCodes.MISSING_CONTEXT,
          field: 'patient',
          message: expect.stringMatching(/Patient inconnu|identifiant/),
        });
      }
    });

    it('Patient B (enfant < 6) + C → 31,50 € et ligne MEG', () => {
      const result = service.simulate(['C'], 'patient_b');
      expect(result.total).toBe(31.5);
      expect(result.breakdown).toHaveLength(2);
      const meg = result.breakdown.find((l) => l.ruleId === 'MEG');
      expect(meg).toBeDefined();
      expect(meg?.amount).toBe(5);
    });

    it('Patient C (CMU) + C → total 26,50 € mais 0 € à payer par le patient', () => {
      const result = service.simulate(['C'], 'patient_c');
      expect(result.total).toBe(26.5);
      expect(result.amount_patient).toBe(0);
      expect(result.message).toMatch(/Tiers payant|CMU/);
    });

    it('accepte patientAge 0 (nouveau-né) sans crash', () => {
      const result = service.simulate(['C'], undefined, 0);
      expect(result.total).toBe(31.5); // MEG car âge < 6
      expect(result.breakdown.some((l) => l.ruleId === 'MEG')).toBe(true);
    });

    it('accepte patientAge 120 (limite) sans erreur', () => {
      const result = service.simulate(['C'], undefined, 120);
      expect(result.total).toBe(26.5);
      expect(result.breakdown).toHaveLength(1);
    });
  });

  describe('createInvoice', () => {
    it('cristallise le calcul en facture DRAFT avec rulesVersion', async () => {
      const out = await service.createInvoice(['C'], undefined, 35);
      expect(out.id).toBe('inv-uuid-1');
      expect(out.status).toBe('DRAFT');
      expect(out.rulesVersion).toBe('NGAP_2024');
      expect(out.totalAmount).toBe(26.5);
      expect(out.breakdown).toHaveLength(1);
      expect(mockPrismaService.invoice.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          acts: ['C'],
          status: 'DRAFT',
          rulesVersion: 'NGAP_2024',
          totalAmount: 26.5,
        }),
      });
    });
  });

  describe('FSM – cycle de vie facture', () => {
    it('getAvailableActions(DRAFT) retourne VALIDATE et REJECT', () => {
      expect(getAvailableActions('DRAFT')).toEqual(['VALIDATE', 'REJECT']);
    });
    it('getAvailableActions(PAID) retourne []', () => {
      expect(getAvailableActions('PAID')).toEqual([]);
    });
    it('getAvailableActions(DRAFT, facture 0€) ne retourne pas VALIDATE (garde)', () => {
      expect(getAvailableActions('DRAFT', { acts: ['X'], totalAmount: 0 })).toEqual(['REJECT']);
      expect(getAvailableActions('DRAFT', { acts: [], totalAmount: 26.5 })).toEqual(['REJECT']);
      expect(getAvailableActions('DRAFT', { acts: ['C'], totalAmount: 26.5 })).toEqual(['VALIDATE', 'REJECT']);
    });
    it('getInvoice lance NotFoundException si facture absente', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValueOnce(null);
      await expect(service.getInvoice('missing')).rejects.toThrow(NotFoundException);
    });
    it('getInvoiceLifecycle retourne availableActions', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValueOnce(mockInvoiceRecord());
      const out = await service.getInvoiceLifecycle('inv-uuid-1');
      expect(out.status).toBe('DRAFT');
      expect(out.availableActions).toContain('VALIDATE');
      expect(out.availableActions).toContain('REJECT');
    });
    it('transitionInvoice DRAFT -> VALIDATED', async () => {
      mockPrismaService.invoice.findUnique
        .mockResolvedValueOnce(mockInvoiceRecord({ status: 'DRAFT' }))
        .mockResolvedValueOnce(mockInvoiceRecord({ status: 'VALIDATED' }));
      mockPrismaService.invoice.update.mockResolvedValue(mockInvoiceRecord({ status: 'VALIDATED' }));
      const updated = await service.transitionInvoice('inv-uuid-1', 'VALIDATE');
      expect(updated.status).toBe('VALIDATED');
    });
    it('transitionInvoice PAID -> VALIDATE lance BadRequestException', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValueOnce(mockInvoiceRecord({ status: 'PAID' }));
      await expect(service.transitionInvoice('inv-uuid-1', 'VALIDATE')).rejects.toThrow(BadRequestException);
    });
    it('transitionInvoice VALIDATE sur facture 0€ lance HttpException 412 (garde)', async () => {
      const zeroInvoice = mockInvoiceRecord({ status: 'DRAFT', totalAmount: 0, acts: ['X'] });
      mockPrismaService.invoice.findUnique.mockImplementationOnce(() => Promise.resolve(zeroInvoice));
      try {
        await service.transitionInvoice('inv-uuid-1', 'VALIDATE');
        expect(true).toBe(false);
      } catch (e) {
        expect(e).toBeInstanceOf(HttpException);
        expect((e as HttpException).getStatus()).toBe(412);
      }
    });
  });
});
