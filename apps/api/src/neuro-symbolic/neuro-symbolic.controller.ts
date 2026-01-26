import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { NeuroSymbolicService } from './neuro-symbolic.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleGuard } from '../common/guards/role.guard';
import { Role } from '../common/guards/role.guard';

/**
 * NeuroSymbolicController
 * 
 * Endpoints pour le raisonnement neuro-symbolique
 * Version BaseVitale V112
 */
@Controller('neuro-symbolic')
@UseGuards(AuthGuard, RoleGuard)
export class NeuroSymbolicController {
  constructor(private readonly neuroSymbolicService: NeuroSymbolicService) {}

  @Post('reasoning')
  @Roles(Role.ADMIN, Role.DOCTOR)
  async reasoning(@Body() body: { consultationId: string; question: string; contextType: string }) {
    return this.neuroSymbolicService.reasoningChain({
      consultationId: body.consultationId,
      question: body.question,
      contextType: body.contextType as any,
    });
  }
}
