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

  /**
   * Vide le cache et recharge les règles.
   * Synchronise toujours la DB avec le fichier JSON (code = source de vérité) puis charge en cache.
   * Ainsi C, V, MD, G, etc. restent à jour après un déploiement.
   */
  async reloadRules(): Promise<{ version: string; rulesCount: number }> {
    this.cache = null;
    const fallback = ngap2024Fallback as RuleDef[];
    try {
      const payloadJson = JSON.parse(JSON.stringify(fallback));
      await this.prisma.billingRules.upsert({
        where: { version: DEFAULT_VERSION },
        create: { version: DEFAULT_VERSION, payload: payloadJson },
        update: { payload: payloadJson },
      });
    } catch (e) {
      this.logger.warn('Sync des règles en DB échouée, utilisation du fallback en mémoire', e);
    }
    this.cache = { version: DEFAULT_VERSION, rules: fallback };
    this.logger.log(`Règles chargées: ${DEFAULT_VERSION} (${fallback.length} règles)`);
    return { version: DEFAULT_VERSION, rulesCount: fallback.length };
  }
}
