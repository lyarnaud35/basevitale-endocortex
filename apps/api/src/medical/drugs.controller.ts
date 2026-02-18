import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DrugService } from './drug.service';

@ApiTags('Drugs')
@Controller('drugs')
export class DrugsController {
  constructor(private readonly drugService: DrugService) {}

  @Get(':cis/template')
  @ApiOperation({
    summary: 'Template de posologie par CIS',
    description: 'Retourne unité, posologie par défaut et instructions selon la forme pharmaceutique (comprimé, sirop, pommade…).',
  })
  @ApiParam({ name: 'cis', description: 'Code CIS (7 ou 8 chiffres)' })
  @ApiResponse({ status: 200, description: '{ unit, default, max?, instructions? }' })
  async getTemplate(@Param('cis') cis: string) {
    return this.drugService.getPosologyTemplate(cis);
  }
}
