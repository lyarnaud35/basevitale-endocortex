import {
  Controller,
  Post,
  Get,
  UseGuards,
} from '@nestjs/common';
import { BackupService } from './backup.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleGuard } from '../common/guards/role.guard';
import { Role } from '../common/guards/role.guard';

/**
 * BackupController
 * 
 * Endpoints pour les sauvegardes
 * Version BaseVitale Révolutionnaire - Présentation Mars 2025
 */
@Controller('backup')
@UseGuards(AuthGuard, RoleGuard)
export class BackupController {
  constructor(private readonly backupService: BackupService) {}

  /**
   * Créer un backup manuel
   * POST /backup/create
   */
  @Post('create')
  @Roles(Role.ADMIN)
  async createBackup() {
    const backup = await this.backupService.createBackup();
    return {
      success: true,
      data: backup,
    };
  }
}
