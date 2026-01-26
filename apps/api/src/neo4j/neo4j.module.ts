import { Global, Module } from '@nestjs/common';
import { Neo4jService } from './neo4j.service';
import { Neo4jIndexesService } from './neo4j.indexes.service';

/**
 * Neo4jModule
 * 
 * Module global pour Neo4j
 * Fournit Neo4jService à tous les modules de l'application
 * 
 * @Global() - Permet d'injecter Neo4jService partout sans importer le module
 */
@Global()
@Module({
  providers: [Neo4jService, Neo4jIndexesService],
  exports: [Neo4jService, Neo4jIndexesService],
})
export class Neo4jModule {}
