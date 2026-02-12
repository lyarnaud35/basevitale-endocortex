import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { RuleDef } from './rules/rule-engine.types';
import ngap2024Fallback from './rules/ngap_2024.json';

const DEFAULT_VERSION = 'NGAP_2024';

/**
 * Charge les règles de facturation depuis la DB (Data over Code).
 * Au démarrage : charge la dernière version en mémoire ; si table vide, seed depuis le JSON.
 * POST /admin/rules/reload : vide le cache et recharge depuis la DB.
 */
@Injectable()
export class BillingRulesService implements OnModuleInit {
  private readonly logger = new Logger(BillingRulesService.name);
  private cache: { version: string; rules: RuleDef[] } | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.reloadRules();
  }

  /** Règles en mémoire (version + payload). Ne jamais renvoyer undefined en production. */
  getRules(): RuleDef[] {
    if (this.cache) return this.cache.rules;
    return (ngap2024Fallback as RuleDef[]);
  }

  /** Version des règles actuellement chargées (pour audit factures). */
  getRulesVersion(): string {
    if (this.cache) return this.cache.version;
    return DEFAULT_VERSION;
  }

  /** Vide le cache et recharge depuis la DB. Si DB vide, seed depuis le fichier JSON. */
  async reloadRules(): Promise<{ version: string; rulesCount: number }> {
    this.cache = null;
    try {
      const row = await this.prisma.billingRules.findFirst({
        orderBy: { updatedAt: 'desc' },
      });
      if (row && Array.isArray(row.payload)) {
        this.cache = { version: row.version, rules: row.payload as unknown as RuleDef[] };
        this.logger.log(`Règles chargées depuis la DB: ${row.version} (${this.cache.rules.length} règles)`);
        return { version: row.version, rulesCount: this.cache.rules.length };
      }
    } catch (e) {
      this.logger.warn('Impossible de charger les règles depuis la DB, fallback JSON', e);
    }
    const fallback = ngap2024Fallback as RuleDef[];
    try {
      const payloadJson = JSON.parse(JSON.stringify(fallback));
      await this.prisma.billingRules.upsert({
        where: { version: DEFAULT_VERSION },
        create: { version: DEFAULT_VERSION, payload: payloadJson },
        update: { payload: payloadJson },
      });
      this.cache = { version: DEFAULT_VERSION, rules: fallback };
      this.logger.log(`Règles seedées depuis le JSON: ${DEFAULT_VERSION} (${fallback.length} règles)`);
      return { version: DEFAULT_VERSION, rulesCount: fallback.length };
    } catch (e) {
      this.logger.warn('Seed des règles en DB échoué, utilisation du fallback en mémoire', e);
      this.cache = { version: DEFAULT_VERSION, rules: fallback };
      return { version: DEFAULT_VERSION, rulesCount: fallback.length };
    }
  }
}
