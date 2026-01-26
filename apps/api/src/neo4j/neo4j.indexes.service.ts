import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Neo4jService } from './neo4j.service';

/**
 * Neo4jIndexesService
 * 
 * Service pour créer et gérer les index Neo4j optimisant les requêtes
 * 
 * Les index permettent d'améliorer significativement les performances
 * des requêtes sur les nœuds et relations
 */
@Injectable()
export class Neo4jIndexesService implements OnModuleInit {
  private readonly logger = new Logger(Neo4jIndexesService.name);

  constructor(private readonly neo4jService: Neo4jService) {}

  /**
   * Créer les index au démarrage du module
   */
  async onModuleInit() {
    // Ne pas bloquer le démarrage si les index échouent
    this.createIndexes().catch((error) => {
      this.logger.warn('Failed to create Neo4j indexes (non-blocking)', error);
    });
  }

  /**
   * Créer tous les index nécessaires
   */
  async createIndexes(): Promise<void> {
    this.logger.log('Creating Neo4j indexes for optimal performance...');

    const indexes = [
      // Index sur Patient.id pour recherche rapide
      {
        name: 'patient_id_index',
        query: 'CREATE INDEX patient_id_index IF NOT EXISTS FOR (p:Patient) ON (p.id)',
      },
      // Index sur Symptom.label pour recherche rapide
      {
        name: 'symptom_label_index',
        query: 'CREATE INDEX symptom_label_index IF NOT EXISTS FOR (s:Symptom) ON (s.label)',
      },
      // Index sur Diagnosis.code pour recherche rapide (CIM10)
      {
        name: 'diagnosis_code_index',
        query: 'CREATE INDEX diagnosis_code_index IF NOT EXISTS FOR (d:Diagnosis) ON (d.code)',
      },
      // Index sur Medication.name pour recherche rapide
      {
        name: 'medication_name_index',
        query: 'CREATE INDEX medication_name_index IF NOT EXISTS FOR (m:Medication) ON (m.name)',
      },
    ];

    for (const index of indexes) {
      try {
        await this.neo4jService.executeQuery(index.query);
        this.logger.debug(`✅ Index created: ${index.name}`);
      } catch (error) {
        // Si l'index existe déjà, ignorer l'erreur
        if (error instanceof Error && error.message.includes('already exists')) {
          this.logger.debug(`Index already exists: ${index.name}`);
        } else {
          this.logger.warn(`Failed to create index ${index.name}`, error);
        }
      }
    }

    this.logger.log('✅ Neo4j indexes created successfully');
  }

  /**
   * Obtenir les statistiques des index
   */
  async getIndexStats(): Promise<any[]> {
    try {
      const result = await this.neo4jService.executeQuery(
        'SHOW INDEXES YIELD name, type, state, properties',
      );
      return result.records.map((record) => ({
        name: record.get('name'),
        type: record.get('type'),
        state: record.get('state'),
        properties: record.get('properties'),
      }));
    } catch (error) {
      this.logger.error('Failed to get index stats', error);
      return [];
    }
  }
}
