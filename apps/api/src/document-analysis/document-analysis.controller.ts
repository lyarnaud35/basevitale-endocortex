import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentAnalysisService } from './document-analysis.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleGuard } from '../common/guards/role.guard';
import { Role } from '../common/guards/role.guard';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';

/**
 * DocumentAnalysisController
 * 
 * Endpoints pour l'analyse de documents
 * Version BaseVitale Révolutionnaire
 */
@Controller('document-analysis')
@UseGuards(AuthGuard, RoleGuard)
export class DocumentAnalysisController {
  constructor(private readonly documentAnalysisService: DocumentAnalysisService) {}

  /**
   * Analyser le PDF ECOSYSTEME BASEVITALE uploadé
   * POST /document-analysis/ecosystem
   */
  @Post('ecosystem')
  @Roles(Role.ADMIN, Role.DOCTOR)
  @UseInterceptors(FileInterceptor('pdf'))
  async analyzeEcosystem(
    @UploadedFile() file: any,
    @CurrentUserId() userId: string,
  ) {
    if (!file) {
      throw new Error('PDF file is required');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new Error('File must be a PDF');
    }

    const result = await this.documentAnalysisService.analyzeEcosystemPDF(
      file.buffer,
      file.originalname,
    );

    return {
      success: true,
      data: result,
    };
  }
}
