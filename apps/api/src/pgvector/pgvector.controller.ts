import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { PgVectorService } from './pgvector.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleGuard } from '../common/guards/role.guard';
import { Role } from '../common/guards/role.guard';

/**
 * PgVectorController
 * 
 * Endpoints pour la recherche sémantique
 * Version BaseVitale V112
 */
@Controller('pgvector')
@UseGuards(AuthGuard, RoleGuard)
export class PgVectorController {
  constructor(private readonly pgVectorService: PgVectorService) {}

  @Post('search')
  @Roles(Role.ADMIN, Role.DOCTOR)
  async semanticSearch(@Body() body: { embedding: number[]; limit?: number; threshold?: number; nodeType?: string }) {
    const results = await this.pgVectorService.semanticSearch({
      embedding: body.embedding,
      limit: body.limit,
      threshold: body.threshold,
      nodeType: body.nodeType,
    });

    return {
      success: true,
      data: results,
    };
  }

  @Post('embedding/generate')
  @Roles(Role.ADMIN, Role.DOCTOR)
  async generateEmbedding(@Body() body: { text: string }) {
    const embedding = await this.pgVectorService.generateEmbedding(body.text);

    return {
      success: true,
      data: { embedding },
    };
  }

  @Post('index/:nodeId')
  @Roles(Role.ADMIN)
  async indexNode(@Body() body: { embedding: number[] }, @Query('nodeId') nodeId: string) {
    await this.pgVectorService.indexNode(nodeId, body.embedding);

    return {
      success: true,
      message: 'Node indexed successfully',
    };
  }
}
