import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScribeService } from '../scribe/scribe.service';
import { MetricsService } from '../common/services/metrics.service';
import { withMetrics } from '../common/utils/metrics.util';
import {
  CodingRequestSchema,
  CodingResponseSchema,
  CodingSuggestion,
  CodingRequest,
  CodingResponse,
  CreateSemanticNode,
} from '@basevitale/shared';
import { z } from 'zod';

/**
 * CodingService - Module B+ (Codage)
 * 
 * Version Cabinet - Sprint 3: Automatisme Déterministe
 * 
 * Suggestion automatique de codes CIM-10/11 avec scores de confiance
 * Calibration stricte pour éviter les "erreurs confiantes"
 */
@Injectable()
export class CodingService {
  private readonly logger = new Logger(CodingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scribeService: ScribeService,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * Suggérer des codes CIM pour une consultation
   * 
   * Analyse le Knowledge Graph de la consultation et suggère
   * des codes CIM-10/11 avec scores de confiance
   * 
   * @param request - Demande de codage
   * @returns Réponse avec suggestions de codes
   */
  async suggestCodes(
    request: z.infer<typeof CodingRequestSchema>,
  ): Promise<CodingResponse> {
    return withMetrics(
      this.metricsService,
      'coding.suggestCodes',
      async () => {
        const validatedRequest = CodingRequestSchema.parse(request);
        const minConfidence = validatedRequest.minConfidence || 0.4;

        this.logger.log(
          `Suggesting codes for consultation ${validatedRequest.consultationId || 'unknown'} (minConfidence: ${minConfidence})`,
        );

        try {
      // Récupérer les nœuds du Knowledge Graph
      let nodes: CreateSemanticNode[] = [];

      if (validatedRequest.consultationId) {
        // Récupérer depuis la consultation
        const consultationNodes = await this.prisma.semanticNode.findMany({
          where: { consultationId: validatedRequest.consultationId },
        });
        nodes = consultationNodes.map((n) => ({
          nodeType: n.nodeType as any,
          label: n.label,
          snomedCtCode: n.snomedCtCode || undefined,
          cim10Code: n.cim10Code || undefined,
          cim11Code: n.cim11Code || undefined,
          description: n.description || undefined,
          confidence: n.confidence || undefined,
        }));
      } else if (typeof validatedRequest.context === 'object' && 'nodeIds' in validatedRequest.context) {
        // Récupérer depuis les IDs de nœuds
        const semanticNodes = await this.prisma.semanticNode.findMany({
          where: { id: { in: validatedRequest.context.nodeIds } },
        });
        nodes = semanticNodes.map((n) => ({
          nodeType: n.nodeType as any,
          label: n.label,
          snomedCtCode: n.snomedCtCode || undefined,
          cim10Code: n.cim10Code || undefined,
          cim11Code: n.cim11Code || undefined,
          description: n.description || undefined,
          confidence: n.confidence || undefined,
        }));
      } else if (typeof validatedRequest.context === 'string') {
        // Analyser le texte directement
        const graph = await this.scribeService.extractKnowledgeGraph(
          validatedRequest.context,
          validatedRequest.patientId,
        );
        nodes = graph.nodes;
      }

      // Extraire les codes existants des nœuds DIAGNOSIS
      const diagnosisNodes = nodes.filter((n) => n.nodeType === 'DIAGNOSIS');

      // Construire les suggestions
      const suggestions: CodingSuggestion[] = diagnosisNodes
        .map((node) => {
          if (!node.cim10Code && !node.cim11Code) {
            return null; // Pas de code disponible
          }

          const confidence = node.confidence || 0.5;

          const suggestion: CodingSuggestion = {
            code: (node.cim10Code || node.cim11Code)!,
            codeType: node.cim10Code ? 'CIM10' : 'CIM11',
            label: node.label,
            description: node.description,
            confidence,
            ...(confidence < 0.7 && { missingData: ['Données cliniques supplémentaires requises'] }),
          };
          
          return suggestion;
        })
        .filter((s): s is CodingSuggestion => s !== null)
        .filter((s) => s.confidence >= minConfidence)
        .sort((a, b) => b.confidence - a.confidence); // Tri par confiance décroissante

      // Générer des warnings si nécessaire
      const warnings: string[] = [];
      if (suggestions.length === 0) {
        warnings.push('Aucun code suggéré avec la confiance requise');
      } else if (suggestions.some((s) => s.confidence < 0.6)) {
        warnings.push(
          'Certaines suggestions ont une confiance faible. Vérifiez les codes manuellement.',
        );
      }

      // Données recommandées pour améliorer la confiance
      const recommendedData: string[] = [];
      if (nodes.filter((n) => n.nodeType === 'LAB_RESULT').length === 0) {
        recommendedData.push('Résultats de laboratoire');
      }
      if (nodes.filter((n) => n.nodeType === 'SYMPTOM').length < 2) {
        recommendedData.push('Plus de détails sur les symptômes');
      }

      const response: CodingResponse = {
        suggestions,
        warnings: warnings.length > 0 ? warnings : undefined,
        recommendedData: recommendedData.length > 0 ? recommendedData : undefined,
      };

          this.logger.log(
            `Generated ${suggestions.length} coding suggestions (minConfidence: ${minConfidence})`,
          );

          // Enregistrer métriques
          this.metricsService.incrementCounter('coding.suggestions.generated');
          this.metricsService.recordValue('coding.suggestions.count', suggestions.length);
          this.metricsService.recordValue('coding.suggestions.avgConfidence', 
            suggestions.length > 0
              ? suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length
              : 0
          );

          return CodingResponseSchema.parse(response);
        } catch (error) {
          this.logger.error('Error suggesting codes', error);
          this.metricsService.incrementCounter('coding.suggestions.errors');
          throw error;
        }
      },
    );
  }

  /**
   * Obtenir les codes CIM d'une consultation existante
   * 
   * @param consultationId - ID de la consultation
   * @returns Codes CIM extraits du Knowledge Graph
   */
  async getCodesFromConsultation(
    consultationId: string,
    minConfidence: number = 0.4,
  ): Promise<CodingResponse> {
    return this.suggestCodes({
      consultationId,
      minConfidence,
    });
  }
}
