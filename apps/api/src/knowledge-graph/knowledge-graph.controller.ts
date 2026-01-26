import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { KnowledgeGraphService } from './knowledge-graph.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';

/**
 * KnowledgeGraphController
 * 
 * Controller REST pour le Knowledge Graph
 * Version BaseVitale V112
 */
@Controller('knowledge-graph')
@UseGuards(AuthGuard)
export class KnowledgeGraphController {
  constructor(private readonly knowledgeGraphService: KnowledgeGraphService) {}

  @Get('consultations/:consultationId/nodes')
  async getConsultationNodes(
    @Param('consultationId') consultationId: string,
    @CurrentUserId() userId: string,
  ) {
    const nodes = await this.knowledgeGraphService.getConsultationNodes(consultationId);
    return {
      success: true,
      data: nodes,
    };
  }

  @Get('consultations/:consultationId/graph')
  async getConsultationGraph(
    @Param('consultationId') consultationId: string,
    @CurrentUserId() userId: string,
  ) {
    const graph = await this.knowledgeGraphService.getConsultationGraph(consultationId);
    return {
      success: true,
      data: graph,
    };
  }

  @Get('patients/:patientId/nodes')
  async getPatientNodes(
    @Param('patientId') patientId: string,
    @CurrentUserId() userId: string,
  ) {
    const nodes = await this.knowledgeGraphService.getPatientNodes(patientId);
    return {
      success: true,
      data: nodes,
    };
  }
}
