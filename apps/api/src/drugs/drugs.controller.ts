import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DrugsService, DrugSearchResultItem } from './drugs.service';

@ApiTags('Drugs')
@Controller('drugs')
export class DrugsController {
  constructor(private readonly drugsService: DrugsService) {}

  @Get('search')
  @ApiOperation({
    summary: 'Recherche médicaments (Full-Text, type Google)',
    description:
      'Recherche fuzzy sur noms commerciaux et molécules. Min 3 caractères. Retourne code, label, forme, substances, score.',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Terme de recherche (ex. Doliprane, Paracéta)' })
  @ApiResponse({ status: 200, description: 'Liste { code, label, forme, substances, score }' })
  async search(@Query('q') q: string): Promise<DrugSearchResultItem[]> {
    if (!q || q.trim().length < 3) return [];
    return this.drugsService.search(q.trim());
  }
}
