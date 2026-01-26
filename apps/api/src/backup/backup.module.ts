import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BackupService } from './backup.service';
import { BackupController } from './backup.controller';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * BackupModule
 * 
 * Module pour les sauvegardes automatiques
 * Version BaseVitale Révolutionnaire - Présentation Mars 2025
 */
@Module({
  imports: [PrismaModule, ScheduleModule.forRoot()],
  controllers: [BackupController],
  providers: [BackupService],
  exports: [BackupService],
})
export class BackupModule {}
