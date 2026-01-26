import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
// Prisma.sql et Prisma.empty sont nécessaires comme valeurs
import { Prisma } from '../prisma/client';

/**
 * PgVectorService
 * 
 * Service pour la recherche sémantique avec pgvector
 * 
 * Note: Nécessite l'extension pgvector activée dans PostgreSQL
 * 
 * Version BaseVitale V112
 */
@Injectable()
export class PgVectorService implements OnModuleInit {
  private readonly logger = new Logger(PgVectorService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Vérifier que pgvector est activé
    try {
      const result = await this.prisma.$queryRaw<Array<{ extname: string }>>`
        SELECT extname FROM pg_extension WHERE extname = 'vector';
      `;

      if (result.length === 0) {
        this.logger.warn(
          'pgvector extension not found. Please run: CREATE EXTENSION vector;',
        );
      } else {
        this.logger.log('pgvector extension is active');
      }
    } catch (error) {
      this.logger.error('Failed to check pgvector extension', error);
    }
  }

  /**
   * Recherche sémantique par similarité
   * 
   * Note: Prisma stocke embedding en JSON, donc on convertit pour pgvector
   * 
   * @param embedding - Vecteur d'embedding à chercher
   * @param limit - Nombre de résultats
   * @param threshold - Seuil de similarité (0-1)
   */
  async semanticSearch(params: {
    embedding: number[];
    limit?: number;
    threshold?: number;
    nodeType?: string;
  }): Promise<any[]> {
    const limit = params.limit || 10;
    const threshold = params.threshold || 0.7;

    try {
      // Convertir le tableau en string pour pgvector
      const embeddingString = `[${params.embedding.join(',')}]`;

      // Recherche avec cosine similarity
      // Note: Requiert que la colonne embedding soit convertie en vector
      const results = await this.prisma.$queryRaw<any[]>`
        SELECT 
          id,
          "nodeType",
          label,
          description,
          1 - (CAST(embedding::text AS vector) <=> ${embeddingString}::vector) as similarity
        FROM "SemanticNode"
        WHERE embedding IS NOT NULL
          AND (1 - (CAST(embedding::text AS vector) <=> ${embeddingString}::vector)) >= ${threshold}
          ${params.nodeType ? Prisma.sql`AND "nodeType" = ${params.nodeType}` : Prisma.empty}
        ORDER BY CAST(embedding::text AS vector) <=> ${embeddingString}::vector
        LIMIT ${limit}
      `;

      this.logger.log(`Semantic search returned ${results.length} results`);
      return results;
    } catch (error) {
      this.logger.error('Semantic search failed', error);
      // Si pgvector n'est pas disponible, retourner recherche basique
      this.logger.warn('Falling back to basic search');
      return [];
    }
  }

  /**
   * Générer un embedding (placeholder - à implémenter avec modèle)
   */
  async generateEmbedding(text: string): Promise<number[]> {
    // TODO: Intégrer avec service d'embeddings (OpenAI, local, etc.)
    // Pour l'instant, retourner un vecteur vide
    this.logger.warn('generateEmbedding not implemented - returning empty vector');
    return [];
  }

  /**
   * Indexer un nœud sémantique avec embedding
   */
  async indexNode(nodeId: string, embedding: number[]): Promise<void> {
    try {
      // Stocker en JSON (compatible Prisma)
      await this.prisma.semanticNode.update({
        where: { id: nodeId },
        data: {
          embedding: embedding as any, // Stocké en JSON dans Prisma
        },
      });

      this.logger.log(`Indexed node ${nodeId} with embedding`);
    } catch (error) {
      this.logger.error(`Failed to index node ${nodeId}`, error);
      throw error;
    }
  }
}
