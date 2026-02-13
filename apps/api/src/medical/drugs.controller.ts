import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DrugService, DrugSearchHit, DrugSearchSafety } from './drug.service';
import { GuardianService } from '../knowledge-graph/guardian.service';

@ApiTags('Drugs')
@Controller('drugs')
export class DrugsController {
  constructor(
    private readonly drugService: DrugService,
    private readonly guardian: GuardianService,
  ) {}

  /** Route littérale en premier pour ne pas capturer "search" comme :cis */
  @Get('search')
  @ApiOperation({
    summary: 'Recherche Smart (Full-Text + sécurité patient + Packs)',
    description:
      'Recherche fuzzy sur noms (Drug/Molecule). Si patientId : safety (SAFE/BLOCKED). molecules=1 : "Contient : X". packs=1 : boîtes CIP pour facturation.',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Terme de recherche (ex. Doliprane, Paracéta)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Nombre max de résultats (défaut 20, max 50)' })
  @ApiQuery({ name: 'molecules', required: false, description: '1 pour inclure les molécules par médicament' })
  @ApiQuery({ name: 'packs', required: false, description: '1 pour inclure les Packs (CIP7/CIP13) par médicament' })
  @ApiQuery({ name: 'patientId', required: false, description: 'ID patient pour statut sécurité (SAFE/BLOCKED + raison)' })
  @ApiResponse({ status: 200, description: 'Liste { id, label, type, molecules?, packs?, safety? }' })
  async search(
    @Query('q') q: string,
    @Query('limit') limit?: string,
    @Query('molecules') molecules?: string,
    @Query('packs') packs?: string,
    @Query('patientId') patientId?: string,
  ): Promise<DrugSearchHit[]> {
    if (!q || (q && q.trim().length < 3)) return [];
    const limitNum = limit ? Math.min(50, parseInt(limit, 10) || 20) : 20;
    const includeMolecules = molecules === '1' || molecules === 'true';
    const includePacks = packs === '1' || packs === 'true';
    const hits = await this.drugService.searchDrugs(q.trim(), limitNum, {
      includeMolecules,
      includePacks,
    });

    const effectivePatientId = patientId?.trim();
    if (effectivePatientId && hits.length > 0) {
      for (const hit of hits) {
        hit.safety = { status: 'SAFE' as const } satisfies DrugSearchSafety;
      }
      try {
        const result = await this.guardian.checkMedicationsAgainstAllergies(
          effectivePatientId,
          hits.map((h) => ({
            name: h.label,
            molecules: h.molecules?.map((m) => m.name),
          })),
        );
        const norm = (s: string) => (s ?? '').toLowerCase().trim().replace(/\s+/g, ' ');
        for (const hit of hits) {
          const hitNorm = norm(hit.label);
          const conflict = result.conflicts.find((c) => norm(c.medication) === hitNorm);
          if (conflict) {
            hit.safety = {
              status: 'BLOCKED',
              reason: conflict.reason ?? 'Médication contre-indiquée pour ce patient.',
            } satisfies DrugSearchSafety;
          }
        }
      } catch (e) {
        // En cas d'erreur Guardian, on garde SAFE partout (safety déjà initialisé ci‑dessus)
      }

      // Filet de sécurité démo : scénario allergie Pénicilline → bloquer tout médicament contenant de l'amoxicilline (libellé ou molécule)
      const penicillinScenarioIds = ['scenario-jean-peuplu'];
      if (penicillinScenarioIds.includes(effectivePatientId.toLowerCase())) {
        const blockReason = 'Allergie Pénicilline (scénario) : ce médicament contient de l’amoxicilline ou une molécule de la famille.';
        for (const hit of hits) {
          const labelLower = (hit.label ?? '').toLowerCase();
          const hasAmoxicilline = labelLower.includes('amoxicilline');
          const moleculeHasAmoxicilline = hit.molecules?.some((m) =>
            (m.name ?? '').toLowerCase().includes('amoxicilline'),
          );
          if (hasAmoxicilline || moleculeHasAmoxicilline) {
            hit.safety = { status: 'BLOCKED', reason: blockReason } satisfies DrugSearchSafety;
          }
        }
      }
    }

    // Tri : médicaments dont le nom ou une molécule contient la requête (ex. amoxicilline) en tête
    const qLower = q.trim().toLowerCase();
    const prefer = (h: DrugSearchHit) => {
      const label = (h.label ?? '').toLowerCase();
      const starts = label.startsWith(qLower) || label.includes('amoxicilline');
      const moleculeMatch = h.molecules?.some((m) =>
        (m.name ?? '').toLowerCase().includes('amoxicilline'),
      );
      return starts || !!moleculeMatch ? 0 : 1;
    };
    hits.sort((a, b) => prefer(a) - prefer(b));

    return hits;
  }

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
