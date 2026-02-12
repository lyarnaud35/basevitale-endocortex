import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DrugService, DrugSearchHit } from './drug.service';

@ApiTags('Drugs')
@Controller('drugs')
export class DrugsController {
  constructor(private readonly drugService: DrugService) {}

  @Get('search')
  @ApiOperation({
    summary: 'Recherche de médicaments (BDPM)',
    description: 'Recherche par dénomination dans l’ontologie Neo4j (données ANSM).',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Terme de recherche (ex. Doliprane)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Nombre max de résultats (défaut 50)' })
  @ApiResponse({ status: 200, description: 'Liste de spécialités (cis, denomination, formePharmaceutique)' })
  async search(
    @Query('q') q: string,
    @Query('limit') limit?: string,
  ): Promise<DrugSearchHit[]> {
    const limitNum = limit ? Math.min(100, parseInt(limit, 10) || 50) : 50;
    return this.drugService.searchDrugs(q ?? '', limitNum);
  }
}
