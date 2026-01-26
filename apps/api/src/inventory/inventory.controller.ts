import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleGuard } from '../common/guards/role.guard';
import { Role } from '../common/guards/role.guard';

/**
 * InventoryController
 * 
 * Endpoints pour la gestion des stocks (ERP Hospitalier)
 * Version BaseVitale Révolutionnaire - Présentation Mars 2025
 */
@Controller('inventory')
@UseGuards(AuthGuard, RoleGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('items')
  @Roles(Role.ADMIN, Role.DOCTOR)
  async createStockItem(@Body() body: any) {
    const item = await this.inventoryService.createStockItem(body);
    return { success: true, data: item };
  }

  @Get('items')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.NURSE)
  async getStockItemsByCategory(@Query('category') category?: string) {
    const items = await this.inventoryService.getStockItemsByCategory(category);
    return { success: true, data: items };
  }

  @Get('items/:id')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.NURSE)
  async getStockItem(@Param('id') id: string) {
    const item = await this.inventoryService.getStockItem(id);
    return { success: true, data: item };
  }

  @Post('movements')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.NURSE)
  async recordStockMovement(
    @Body() body: any,
    @CurrentUserId() userId: string,
  ) {
    const result = await this.inventoryService.recordStockMovement({
      ...body,
      createdBy: userId,
    });
    return { success: true, data: result };
  }

  @Get('alerts')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.NURSE)
  async getActiveAlerts(@Query('severity') severity?: string) {
    const alerts = await this.inventoryService.getActiveAlerts(severity);
    return { success: true, data: alerts };
  }

  @Put('alerts/:id/acknowledge')
  @Roles(Role.ADMIN, Role.DOCTOR)
  async acknowledgeAlert(
    @Param('id') id: string,
    @CurrentUserId() userId: string,
  ) {
    const alert = await this.inventoryService.acknowledgeAlert(id, userId);
    return { success: true, data: alert };
  }
}
