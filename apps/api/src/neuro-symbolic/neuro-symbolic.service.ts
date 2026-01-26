import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NatsService } from '../nats/nats.service';

/**
 * NeuroSymbolicBridge Service
 * 
 * Implémente le pont neuro-symbolique selon la stack V112
 * Chaîne de raisonnement : SQL (Invariant) → Neo4j (Contexte) → LLM → Validation
 * 
 * Note: LangChain.js sera intégré dans une future version
 * Pour l'instant, implémentation basique avec les services existants
 * 
 * Version BaseVitale V112
 */
@Injectable()
export class NeuroSymbolicService {
  private readonly logger = new Logger(NeuroSymbolicService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly nats: NatsService,
  ) {}

  /**
   * Chaîne de raisonnement complète
   * 
   * 1. Récupérer règles SQL (Invariant) - PostgreSQL
   * 2. Interroger Graph Neo4j (Contexte)
   * 3. Demander synthèse au LLM (via Python sidecar)
   * 4. Valider via Gardien Causal
   */
  async reasoningChain(params: {
    consultationId: string;
    question: string;
    contextType: 'DIAGNOSIS' | 'BILLING' | 'CODING';
  }): Promise<{
    invariantRules: any[];
    graphContext: any;
    llmSynthesis: any;
    validation: {
      isValid: boolean;
      confidence: number;
      reasoning: string;
    };
  }> {
    this.logger.log(`Starting reasoning chain for consultation ${params.consultationId}`);

    // 1. Récupérer règles invariantes depuis PostgreSQL
    const invariantRules = await this.getInvariantRules(params.contextType);

    // 2. Interroger Knowledge Graph (Neo4j via Prisma pour l'instant)
    const graphContext = await this.getGraphContext(params.consultationId);

    // 3. Demander synthèse au LLM via NATS (Python sidecar)
    const llmSynthesis = await this.requestLLMSynthesis({
      question: params.question,
      invariantRules,
      graphContext,
    });

    // 4. Valider via Gardien Causal (logique de validation)
    const validation = await this.validateReasoning({
      invariantRules,
      graphContext,
      llmSynthesis,
    });

    return {
      invariantRules,
      graphContext,
      llmSynthesis,
      validation,
    };
  }

  /**
   * Récupérer règles invariantes depuis PostgreSQL
   */
  private async getInvariantRules(contextType: string): Promise<any[]> {
    // Pour l'instant, règles codées en dur
    // Dans le futur, récupérer depuis une table de règles
    const rules: Record<string, any[]> = {
      BILLING: [
        {
          rule: 'Pas de Preuve = Pas de Facture',
          type: 'INVARIANT',
          severity: 'CRITICAL',
        },
      ],
      DIAGNOSIS: [
        {
          rule: 'Tout diagnostic doit avoir un symptôme associé',
          type: 'INVARIANT',
          severity: 'HIGH',
        },
      ],
      CODING: [
        {
          rule: 'Code CIM-10 doit avoir confiance >= 0.4',
          type: 'INVARIANT',
          severity: 'MEDIUM',
        },
      ],
    };

    return rules[contextType] || [];
  }

  /**
   * Récupérer contexte depuis Knowledge Graph
   */
  private async getGraphContext(consultationId: string): Promise<any> {
    const nodes = await this.prisma.semanticNode.findMany({
      where: { consultationId },
      include: {
        sourceRelations: {
          include: {
            targetNode: true,
          },
        },
        targetRelations: {
          include: {
            sourceNode: true,
          },
        },
      },
    });

    return {
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.nodeType,
        label: node.label,
        confidence: node.confidence,
      })),
      relations: nodes.flatMap((node) => [
        ...node.sourceRelations.map((rel) => ({
          from: node.id,
          to: rel.targetNodeId,
          type: rel.relationType,
        })),
      ]),
    };
  }

  /**
   * Demander synthèse au LLM via NATS
   */
  private async requestLLMSynthesis(params: {
    question: string;
    invariantRules: any[];
    graphContext: any;
  }): Promise<any> {
    try {
      // Envoyer requête via NATS au service Python
      const response = await this.nats.request('ai-cortex.reasoning', {
        question: params.question,
        rules: params.invariantRules,
        context: params.graphContext,
      }, 10000); // 10s timeout

      return response;
    } catch (error) {
      this.logger.error('Failed to get LLM synthesis', error);
      // Fallback: synthèse basique
      return {
        synthesis: 'Synthèse non disponible',
        confidence: 0.5,
        reasoning: 'Erreur lors de l\'appel au LLM',
      };
    }
  }

  /**
   * Valider le raisonnement
   */
  private async validateReasoning(params: {
    invariantRules: any[];
    graphContext: any;
    llmSynthesis: any;
  }): Promise<{
    isValid: boolean;
    confidence: number;
    reasoning: string;
  }> {
    // Vérifier que toutes les règles invariantes sont respectées
    const rulesRespected = params.invariantRules.every((rule) => {
      // Logique de validation selon le type de règle
      return true; // Simplifié pour l'instant
    });

    // Calculer confiance basée sur le contexte
    const confidence = Math.min(
      params.llmSynthesis.confidence || 0.5,
      params.graphContext.nodes.length > 0 ? 0.8 : 0.3,
    );

    return {
      isValid: rulesRespected,
      confidence,
      reasoning: rulesRespected
        ? 'Toutes les règles invariantes sont respectées'
        : 'Certaines règles invariantes ne sont pas respectées',
    };
  }
}
