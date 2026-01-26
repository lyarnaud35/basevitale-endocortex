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
import { StaffService } from './staff.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleGuard } from '../common/guards/role.guard';
import { Role } from '../common/guards/role.guard';

/**
 * StaffController
 * 
 * Endpoints pour la gestion des équipes (ERP RH)
 * Version BaseVitale Révolutionnaire - Présentation Mars 2025
 */
@Controller('staff')
@UseGuards(AuthGuard, RoleGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post('members')
  @Roles(Role.ADMIN)
  async createStaffMember(@Body() body: any) {
    const member = await this.staffService.createStaffMember(body);
    return { success: true, data: member };
  }

  @Get('members')
  @Roles(Role.ADMIN, Role.DOCTOR)
  async getStaffByRole(@Query('role') role?: string) {
    const staff = await this.staffService.getStaffByRole(role);
    return { success: true, data: staff };
  }

  @Post('shifts')
  @Roles(Role.ADMIN, Role.DOCTOR)
  async createShift(@Body() body: any, @CurrentUserId() userId: string) {
    const shift = await this.staffService.createShift({
      ...body,
      createdBy: userId,
    });
    return { success: true, data: shift };
  }

  @Post('leaves')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.NURSE)
  async requestLeave(@Body() body: any, @CurrentUserId() userId: string) {
    const leave = await this.staffService.requestLeave({
      ...body,
      requestedBy: userId,
    });
    return { success: true, data: leave };
  }

  @Put('leaves/:id/:action')
  @Roles(Role.ADMIN, Role.DOCTOR)
  async processLeaveRequest(
    @Param('id') id: string,
    @Param('action') action: 'APPROVE' | 'REJECT',
    @CurrentUserId() userId: string,
  ) {
    const leave = await this.staffService.processLeaveRequest(
      id,
      action,
      userId,
    );
    return { success: true, data: leave };
  }

  @Get('members/:id/schedule')
  @Roles(Role.ADMIN, Role.DOCTOR)
  async getStaffSchedule(
    @Param('id') id: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const schedule = await this.staffService.getStaffSchedule(
      id,
      new Date(startDate),
      new Date(endDate),
    );
    return { success: true, data: schedule };
  }
}
