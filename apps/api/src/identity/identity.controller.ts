import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { IdentityService } from './identity.service';
import {
  CreatePatientSchema,
  SearchPatientSchema,
  CreatePatient,
  SearchPatient,
} from '@basevitale/shared';
import {
  CurrentUserId,
  ZodValidationPipe,
  Pagination,
  normalizePagination,
  createPaginationResult,
} from '../common';
import { AuthGuard } from '../common/guards/auth.guard';
import { PaginationParams } from '../common/utils/pagination.util';

/**
 * IdentityController - Module C+ (Identité/INS)
 * 
 * Version Cabinet - Sprint 1: Fondation Invariante
 * 
 * Endpoints REST pour la gestion des patients avec INS
 * 
 * INVARIANT: Sécurité par Construction (INS + 2FA)
 */
@Controller('identity/patients')
@UseGuards(AuthGuard) // Protection par authentification (développement: mode permissif)
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  /**
   * Créer un nouveau patient
   * POST /identity/patients
   * 
   * Validation automatique avec Zod via ZodValidationPipe
   * L'utilisateur est extrait automatiquement via @CurrentUserId()
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createPatient(
    @Body(new ZodValidationPipe(CreatePatientSchema)) createPatientDto: CreatePatient,
    @CurrentUserId() createdBy: string,
  ) {
    return this.identityService.createPatient(createPatientDto, createdBy);
  }

  /**
   * Rechercher un patient par token INS
   * GET /identity/patients/by-ins/:insToken
   */
  @Get('by-ins/:insToken')
  async findByINS(@Param('insToken') insToken: string) {
    const patient = await this.identityService.findPatientByINS(insToken);
    if (!patient) {
      return null;
    }
    return patient;
  }

  /**
   * Rechercher des patients selon plusieurs critères
   * GET /identity/patients/search?firstName=...&lastName=...&birthDate=...
   */
  @Get('search')
  async searchPatients(
    @Query(new ZodValidationPipe(SearchPatientSchema)) searchCriteria: SearchPatient,
    @Pagination() pagination: PaginationParams,
  ) {
    const { skip, take, page, limit } = normalizePagination(
      pagination.page,
      pagination.limit,
    );

    const results = await this.identityService.searchPatients(searchCriteria, skip, take);
    
    return {
      success: true,
      data: results,
      pagination: {
        page,
        limit,
        total: results.length,
        totalPages: Math.ceil(results.length / limit),
        hasNext: results.length === limit,
        hasPrevious: page > 1,
      },
    };
  }

  /**
   * Obtenir un patient par ID
   * GET /identity/patients/:id
   */
  @Get(':id')
  async getPatientById(@Param('id') id: string) {
    return this.identityService.getPatientById(id);
  }
}
