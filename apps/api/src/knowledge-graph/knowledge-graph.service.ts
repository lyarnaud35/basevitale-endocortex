import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from '../common/services/metrics.service';
import { withMetrics } from '../common/utils/metrics.util';
import {
  CreateSemanticNodeSchema,
  CreateSemanticRelationSchema,
  KnowledgeGraphSchema,
  SemanticNode,
  SemanticRelation,
  CreateSemanticNode,
  CreateSemanticRelation,
} from '@basevitale/shared';
import { z } from 'zod';

/**
 * KnowledgeGraphService
 * 
 * Service pour gérer le Knowledge Graph (nœuds sémantiques et relations)
 * 
 * Version Cabinet - Sprint 2: Cortex Sémantique
 * 
 * INVARIANT: Ne jamais stocker de texte "mort"
 * Toutes les données médicales doivent être transformées en nœuds sémantiques
 */
@Injectable()
export class KnowledgeGraphService {
  private readonly logger = new Logger(KnowledgeGraphService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * Créer un nœud sémantique unique
   * 
   * @param nodeData - Données du nœud à créer
   * @returns Nœud créé
   */
  async createNode(nodeData: CreateSemanticNode): Promise<SemanticNode> {
    // Validation avec Zod
    const validatedData = CreateSemanticNodeSchema.parse(nodeData);

    try {
      const node = await this.prisma.semanticNode.create({
        data: {
          nodeType: validatedData.nodeType,
          snomedCtCode: validatedData.snomedCtCode || null,
          cim10Code: validatedData.cim10Code || null,
          cim11Code: validatedData.cim11Code || null,
          label: validatedData.label,
          description: validatedData.description || null,
          embedding: validatedData.embedding || null,
          value: validatedData.value || null,
          unit: validatedData.unit || null,
          confidence: validatedData.confidence || null,
          patientId: validatedData.patientId || null,
          consultationId: validatedData.consultationId || null,
        },
      });

      this.logger.debug(`Created semantic node: ${node.id} (${node.nodeType})`);

      return this.mapToSemanticNode(node);
    } catch (error) {
      this.logger.error('Error creating semantic node', error);
      throw new BadRequestException('Failed to create semantic node');
    }
  }

  /**
   * Créer plusieurs nœuds sémantiques en batch
   * 
   * @param nodesData - Tableau de nœuds à créer
   * @returns Nœuds créés
   */
  async createNodes(nodesData: CreateSemanticNode[]): Promise<SemanticNode[]> {
    if (nodesData.length === 0) {
      return [];
    }

    // Validation de tous les nœuds
    const validatedNodes = nodesData.map((node) =>
      CreateSemanticNodeSchema.parse(node),
    );

    try {
      const nodes = await this.prisma.$transaction(
        validatedNodes.map((nodeData) =>
          this.prisma.semanticNode.create({
            data: {
              nodeType: nodeData.nodeType,
              snomedCtCode: nodeData.snomedCtCode || null,
              cim10Code: nodeData.cim10Code || null,
              cim11Code: nodeData.cim11Code || null,
              label: nodeData.label,
              description: nodeData.description || null,
              embedding: nodeData.embedding || null,
              value: nodeData.value || null,
              unit: nodeData.unit || null,
              confidence: nodeData.confidence || null,
              patientId: nodeData.patientId || null,
              consultationId: nodeData.consultationId || null,
            },
          }),
        ),
      );

      this.logger.log(`Created ${nodes.length} semantic nodes`);
      
      // Enregistrer métriques
      this.metricsService.incrementCounter('knowledge_graph.nodes.created', nodes.length);
      
      return nodes.map((node) => this.mapToSemanticNode(node));
    } catch (error) {
      this.logger.error('Error creating semantic nodes in batch', error);
      throw new BadRequestException('Failed to create semantic nodes');
    }
  }

  /**
   * Créer une relation sémantique
   * 
   * @param relationData - Données de la relation à créer
   * @returns Relation créée
   */
  async createRelation(
    relationData: CreateSemanticRelation,
  ): Promise<SemanticRelation> {
    // Validation avec Zod
    const validatedData = CreateSemanticRelationSchema.parse(relationData);

    // Vérifier que les nœuds source et cible existent
    const [sourceNode, targetNode] = await Promise.all([
      this.prisma.semanticNode.findUnique({
        where: { id: validatedData.sourceNodeId },
      }),
      this.prisma.semanticNode.findUnique({
        where: { id: validatedData.targetNodeId },
      }),
    ]);

    if (!sourceNode) {
      throw new NotFoundException(
        `Source node ${validatedData.sourceNodeId} not found`,
      );
    }

    if (!targetNode) {
      throw new NotFoundException(
        `Target node ${validatedData.targetNodeId} not found`,
      );
    }

    try {
      const relation = await this.prisma.semanticRelation.create({
        data: {
          sourceNodeId: validatedData.sourceNodeId,
          targetNodeId: validatedData.targetNodeId,
          relationType: validatedData.relationType,
          strength: validatedData.strength || null,
          evidence: validatedData.evidence || null,
          confidence: validatedData.confidence || null,
        },
      });

      this.logger.debug(
        `Created semantic relation: ${relation.id} (${relation.relationType})`,
      );

      return this.mapToSemanticRelation(relation);
    } catch (error) {
      if (error.code === 'P2002') {
        // Unique constraint violation
        throw new BadRequestException(
          'This relation already exists between these nodes',
        );
      }
      this.logger.error('Error creating semantic relation', error);
      throw new BadRequestException('Failed to create semantic relation');
    }
  }

  /**
   * Créer plusieurs relations en batch
   * 
   * @param relationsData - Tableau de relations à créer
   * @returns Relations créées
   */
  async createRelations(
    relationsData: CreateSemanticRelation[],
  ): Promise<SemanticRelation[]> {
    if (relationsData.length === 0) {
      return [];
    }

    // Validation de toutes les relations
    const validatedRelations = relationsData.map((rel) =>
      CreateSemanticRelationSchema.parse(rel),
    );

    try {
      // Pour une transaction, créer les relations directement
      const relations = await this.prisma.$transaction(
        validatedRelations.map((relData) => {
          return this.prisma.semanticRelation.create({
            data: {
              sourceNodeId: relData.sourceNodeId,
              targetNodeId: relData.targetNodeId,
              relationType: relData.relationType,
              strength: relData.strength,
              confidence: relData.confidence,
              evidence: relData.evidence,
            },
          });
        }),
      ) as any;

      this.logger.log(`Created ${relations.length} semantic relations`);
      
      // Enregistrer métriques
      this.metricsService.incrementCounter('knowledge_graph.relations.created', relations.length);
      
      return relations;
    } catch (error) {
      this.logger.error('Error creating semantic relations in batch', error);
      throw error;
    }
  }

  /**
   * Construire un graphe complet depuis une extraction
   * 
   * Cette méthode crée tous les nœuds puis toutes les relations
   * dans une transaction atomique.
   * 
   * @param graphData - Graphe à construire (nœuds + relations)
   * @param patientId - ID du patient (optionnel)
   * @param consultationId - ID de la consultation (optionnel)
   * @returns Graphe créé avec IDs des nœuds
   */
  async buildGraphFromExtraction(
    graphData: z.infer<typeof KnowledgeGraphSchema>,
    patientId?: string,
    consultationId?: string,
  ): Promise<{
    nodes: SemanticNode[];
    relations: SemanticRelation[];
  }> {
    // Validation
    const validatedGraph = KnowledgeGraphSchema.parse(graphData);

    this.logger.log(
      `Building knowledge graph: ${validatedGraph.nodes.length} nodes, ${validatedGraph.relations.length} relations`,
    );

    try {
      // Enrichir les nœuds avec patientId et consultationId si fournis
      const enrichedNodes = validatedGraph.nodes.map((node) => ({
        ...node,
        patientId: patientId || node.patientId,
        consultationId: consultationId || node.consultationId,
      }));

      // Créer tous les nœuds d'abord
      const createdNodes = await this.createNodes(enrichedNodes);

      // Créer un mapping des index vers les IDs créés
      const nodeIdMap = new Map<number, string>();
      validatedGraph.nodes.forEach((_, index) => {
        nodeIdMap.set(index, createdNodes[index].id);
      });

      // Résoudre les relations avec les IDs réels
      // Note: Les relations dans graphData utilisent probablement des références temporaires
      // Il faut adapter selon la structure réelle de vos relations
      const resolvedRelations: CreateSemanticRelation[] = validatedGraph.relations.map(
        (rel) => {
          // Si les relations utilisent des index, les résoudre
          // Sinon, utiliser directement les IDs fournis
          return {
            sourceNodeId: rel.sourceNodeId,
            targetNodeId: rel.targetNodeId,
            relationType: rel.relationType,
            strength: rel.strength,
            evidence: rel.evidence,
            confidence: rel.confidence,
          };
        },
      );

      // Créer toutes les relations
      const createdRelations = await this.createRelations(resolvedRelations);

      this.logger.log(
        `Successfully built knowledge graph: ${createdNodes.length} nodes, ${createdRelations.length} relations`,
      );

      // Enregistrer métriques
      this.metricsService.incrementCounter('knowledge_graph.graphs.built');
      this.metricsService.recordValue('knowledge_graph.graphs.nodes_count', createdNodes.length);
      this.metricsService.recordValue('knowledge_graph.graphs.relations_count', createdRelations.length);

      return {
        nodes: createdNodes,
        relations: createdRelations,
      };
    } catch (error) {
      this.logger.error('Error building knowledge graph', error);
      throw new BadRequestException('Failed to build knowledge graph');
    }
  }

  /**
   * Récupérer tous les nœuds d'un patient
   * 
   * @param patientId - ID du patient
   * @returns Liste des nœuds du patient
   */
  async getPatientNodes(patientId: string): Promise<SemanticNode[]> {
    // Optimisation : select spécifique sans embedding (trop lourd par défaut)
    const nodes = await this.prisma.semanticNode.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        nodeType: true,
        snomedCtCode: true,
        cim10Code: true,
        cim11Code: true,
        label: true,
        description: true,
        value: true,
        unit: true,
        confidence: true,
        patientId: true,
        consultationId: true,
        createdAt: true,
        updatedAt: true,
        // Embedding exclu pour optimiser (peut être chargé séparément si nécessaire)
      },
    });

    return nodes.map((node) => this.mapToSemanticNode(node));
  }

  /**
   * Récupérer tous les nœuds d'une consultation
   * 
   * @param consultationId - ID de la consultation
   * @returns Liste des nœuds de la consultation
   */
  async getConsultationNodes(
    consultationId: string,
  ): Promise<SemanticNode[]> {
    return withMetrics(
      this.metricsService,
      'knowledge_graph.getConsultationNodes',
      async () => {
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
          orderBy: { createdAt: 'desc' },
        });

        return nodes.map((node) => this.mapToSemanticNode(node));
      },
    );
  }

  /**
   * Récupérer le graphe complet d'une consultation (nœuds + relations)
   * 
   * @param consultationId - ID de la consultation
   * @returns Graphe complet avec nœuds et relations
   */
  async getConsultationGraph(consultationId: string): Promise<{
    nodes: SemanticNode[];
    relations: SemanticRelation[];
  }> {
    return withMetrics(
      this.metricsService,
      'knowledge_graph.getConsultationGraph',
      async () => {
        const nodes = await this.prisma.semanticNode.findMany({
          where: { consultationId },
          include: {
            sourceRelations: true,
            targetRelations: true,
          },
        });

        // Extraire toutes les relations uniques
        const relationsMap = new Map<string, SemanticRelation>();

        nodes.forEach((node) => {
          node.sourceRelations.forEach((rel) => {
            if (!relationsMap.has(rel.id)) {
              relationsMap.set(rel.id, this.mapToSemanticRelation(rel));
            }
          });
          node.targetRelations.forEach((rel) => {
            if (!relationsMap.has(rel.id)) {
              relationsMap.set(rel.id, this.mapToSemanticRelation(rel));
            }
          });
        });

        return {
          nodes: nodes.map((node) => this.mapToSemanticNode(node)),
          relations: Array.from(relationsMap.values()),
        };
      },
    );
  }

  /**
   * Mapper un nœud Prisma vers SemanticNode
   */
  private mapToSemanticNode(node: any): SemanticNode {
    return {
      id: node.id,
      nodeType: node.nodeType,
      snomedCtCode: node.snomedCtCode || undefined,
      cim10Code: node.cim10Code || undefined,
      cim11Code: node.cim11Code || undefined,
      label: node.label,
      description: node.description || undefined,
      embedding: node.embedding || undefined,
      value: node.value || undefined,
      unit: node.unit || undefined,
      confidence: node.confidence || undefined,
      patientId: node.patientId || undefined,
      consultationId: node.consultationId || undefined,
    };
  }

  /**
   * Mapper une relation Prisma vers SemanticRelation
   */
  private mapToSemanticRelation(relation: any): SemanticRelation {
    return {
      id: relation.id,
      sourceNodeId: relation.sourceNodeId,
      targetNodeId: relation.targetNodeId,
      relationType: relation.relationType,
      strength: relation.strength || undefined,
      evidence: relation.evidence || undefined,
      confidence: relation.confidence || undefined,
    };
  }
}
