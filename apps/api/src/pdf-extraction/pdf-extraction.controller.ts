import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PDFExtractionService } from './pdf-extraction.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleGuard } from '../common/guards/role.guard';
import { Role } from '../common/guards/role.guard';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';

/**
 * PDFExtractionController
 * 
 * Endpoints pour l'extraction de PDFs médicaux
 * Version BaseVitale Révolutionnaire - Présentation Mars 2025
 */
@Controller('pdf-extraction')
@UseGuards(AuthGuard, RoleGuard)
export class PDFExtractionController {
  constructor(private readonly pdfExtractionService: PDFExtractionService) {}

  /**
   * Extraire un PDF uploadé
   * POST /pdf-extraction/extract
   */
  @Post('extract')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.SECRETARY)
  @UseInterceptors(FileInterceptor('pdf'))
  async extractPDF(
    @CurrentUserId() userId: string,
    @UploadedFile() file: any,
    @Body('extractTables') extractTables?: string,
    @Body('extractImages') extractImages?: string,
  ) {
    if (!file) {
      throw new Error('PDF file is required');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new Error('File must be a PDF');
    }

    const result = await this.pdfExtractionService.extractPDF(
      file.buffer,
      file.originalname,
      {
        extractTables: extractTables === 'true',
        extractImages: extractImages === 'true',
      },
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * Extraire uniquement le texte
   * POST /pdf-extraction/extract-text
   */
  @Post('extract-text')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.SECRETARY)
  @UseInterceptors(FileInterceptor('pdf'))
  async extractTextOnly(
    @UploadedFile() file: any,
    @CurrentUserId() userId: string,
  ) {
    if (!file) {
      throw new Error('PDF file is required');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new Error('File must be a PDF');
    }

    const text = await this.pdfExtractionService.extractTextOnly(
      file.buffer,
      file.originalname,
    );

    return {
      success: true,
      data: {
        text,
        filename: file.originalname,
      },
    };
  }
}
