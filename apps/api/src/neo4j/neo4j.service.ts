import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import neo4j, { Driver, Session, Result } from 'neo4j-driver';

/**
 * Neo4jService
 * 
 * Service réutilisable pour interagir avec Neo4j
 * Gère la connexion, les sessions et les requêtes Cypher
 * 
 * Law IV: Data Safety - Read: Neo4j (Projected Views)
 * 
 * Architecture "Lone Wolf" :
 * - Service générique, aucune logique métier
 * - Configuration depuis variables d'environnement
 * - Gestion d'erreurs robuste
 * - Connection pooling géré par le driver
 */
@Injectable()
export class Neo4jService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(Neo4jService.name);
  private driver: Driver | null = null;

  /**
   * Initialiser la connexion Neo4j au démarrage du module
   */
  async onModuleInit() {
    try {
      const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
      const user = process.env.NEO4J_USER || 'neo4j';
      const password = process.env.NEO4J_PASSWORD || 'neo4j';

      // En production (Docker), utiliser l'URI telle quelle (ex: bolt://neo4j:7687)
      // En dev local, le default bolt://localhost:7687 convient
      const normalizedUri = uri;

      this.logger.log(`Connecting to Neo4j at ${normalizedUri.replace(/\/\/[^@]+@/, '//***@')}`);

      // Créer le driver Neo4j
      this.driver = neo4j.driver(normalizedUri, neo4j.auth.basic(user, password), {
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 2000,
        connectionTimeout: 30000,
        disableLosslessIntegers: true, // Utiliser Number au lieu de Integer
      });

      // Vérifier la connexion
      await this.driver.verifyConnectivity();

      this.logger.log('✅ Neo4j connection established successfully');
    } catch (error) {
      // En développement, ne pas bloquer le démarrage si Neo4j n'est pas disponible
      if (process.env.NODE_ENV === 'development') {
        this.logger.warn('⚠️ Neo4j not available, continuing without it (development mode)');
        this.logger.warn('Neo4j error:', error instanceof Error ? error.message : error);
        this.driver = null;
      } else {
        this.logger.error('❌ Failed to connect to Neo4j', error);
        this.driver = null;
        throw error;
      }
    }
  }

  /**
   * Fermer la connexion Neo4j à l'arrêt du module
   */
  async onModuleDestroy() {
    if (this.driver) {
      try {
        await this.driver.close();
        this.logger.log('Neo4j connection closed');
      } catch (error) {
        this.logger.error('Error closing Neo4j connection', error);
      }
    }
  }

  /**
   * Obtenir le driver Neo4j
   * @throws Error si la connexion n'est pas établie
   */
  getDriver(): Driver {
    if (!this.driver) {
      throw new Error('Neo4j driver not initialized. Check connection.');
    }
    return this.driver;
  }

  /**
   * Exécuter une requête Cypher
   * 
   * @param query - Requête Cypher à exécuter
   * @param parameters - Paramètres de la requête (optionnel)
   * @param database - Nom de la base de données (optionnel, défaut: 'neo4j')
   * @returns Résultat de la requête
   * 
   * @example
   * const result = await neo4jService.executeQuery(
   *   'MATCH (n) RETURN count(n) as count',
   *   {},
   *   'neo4j'
   * );
   */
  async executeQuery<T = any>(
    query: string,
    parameters: Record<string, any> = {},
    database: string = 'neo4j',
  ): Promise<Result<T>> {
    if (!this.driver) {
      throw new Error('Neo4j driver not initialized');
    }

    const session = this.getDriver().session({ database });

    try {
      this.logger.debug(`Executing Cypher query: ${query.substring(0, 100)}...`);
      const result = await session.run(query, parameters);
      this.logger.debug(`Query executed successfully (${result.records.length} records)`);
      return result;
    } catch (error) {
      this.logger.error(`Error executing Cypher query: ${query}`, error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Exécuter plusieurs requêtes dans une transaction
   * 
   * @param queries - Tableau de requêtes Cypher avec paramètres
   * @param database - Nom de la base de données (optionnel)
   * @returns Résultats de toutes les requêtes
   */
  async executeTransaction(
    queries: Array<{ query: string; parameters?: Record<string, any> }>,
    database: string = 'neo4j',
  ): Promise<Result[]> {
    if (!this.driver) {
      throw new Error('Neo4j driver not initialized');
    }

    const session = this.getDriver().session({ database });

    try {
      const results: Result[] = [];

      await session.executeWrite(async (tx) => {
        for (const { query, parameters = {} } of queries) {
          this.logger.debug(`Executing transaction query: ${query.substring(0, 100)}...`);
          const result = await tx.run(query, parameters);
          // Type assertion nécessaire car QueryResult et Result ont des signatures différentes
          results.push(result as any);
        }
      });

      this.logger.debug(`Transaction executed successfully (${results.length} queries)`);
      return results;
    } catch (error) {
      this.logger.error('Error executing transaction', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Vérifier la santé de la connexion Neo4j
   * 
   * @returns Status de la connexion
   */
  async checkHealth(): Promise<{ status: 'ok' | 'error'; message: string; latency?: number }> {
    try {
      const startTime = Date.now();
      await this.executeQuery('RETURN 1 as health');
      const latency = Date.now() - startTime;

      return {
        status: 'ok',
        message: 'Neo4j connection healthy',
        latency,
      };
    } catch (error) {
      this.logger.error('Neo4j health check failed', error);
      return {
        status: 'error',
        message: `Neo4j connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Obtenir les statistiques de connexion
   */
  getConnectionStats(): { connected: boolean; driverVersion?: string } {
    return {
      connected: this.driver !== null,
      // Accès direct à la version du driver via une propriété accessible
      driverVersion: (this.driver as any)?.version || undefined,
    };
  }
}
