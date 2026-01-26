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
import { MessagingService } from './messaging.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUserId } from '../common/decorators/current-user-id.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleGuard } from '../common/guards/role.guard';
import { Role } from '../common/guards/role.guard';

/**
 * MessagingController
 * 
 * Endpoints pour la messagerie interne sécurisée
 * Version BaseVitale Révolutionnaire - Présentation Mars 2025
 */
@Controller('messaging')
@UseGuards(AuthGuard, RoleGuard)
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  /**
   * Envoyer un message
   * POST /messaging/messages
   */
  @Post('messages')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.SECRETARY)
  async sendMessage(@Body() body: any, @CurrentUserId() userId: string) {
    const message = await this.messagingService.sendMessage({
      ...body,
      senderId: userId,
    });
    return {
      success: true,
      data: message,
    };
  }

  /**
   * Obtenir les messages d'un utilisateur
   * GET /messaging/messages
   */
  @Get('messages')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.SECRETARY)
  async getUserMessages(
    @CurrentUserId() userId: string,
    @Query('threadId') threadId?: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
  ) {
    const messages = await this.messagingService.getUserMessages(userId, {
      threadId,
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit) : undefined,
    });
    return {
      success: true,
      data: messages,
    };
  }

  /**
   * Obtenir les threads d'un utilisateur
   * GET /messaging/threads
   */
  @Get('threads')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.SECRETARY)
  async getUserThreads(@CurrentUserId() userId: string) {
    const threads = await this.messagingService.getUserThreads(userId);
    return {
      success: true,
      data: threads,
    };
  }

  /**
   * Marquer un message comme lu
   * PUT /messaging/messages/:id/read
   */
  @Put('messages/:id/read')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.SECRETARY)
  async markAsRead(@Param('id') id: string, @CurrentUserId() userId: string) {
    const message = await this.messagingService.markAsRead(id, userId);
    return {
      success: true,
      data: message,
    };
  }

  /**
   * Créer un thread de groupe
   * POST /messaging/threads
   */
  @Post('threads')
  @Roles(Role.ADMIN, Role.DOCTOR)
  async createGroupThread(@Body() body: any, @CurrentUserId() userId: string) {
    const thread = await this.messagingService.createGroupThread({
      ...body,
      createdBy: userId,
    });
    return {
      success: true,
      data: thread,
    };
  }

  /**
   * Obtenir le nombre de messages non lus
   * GET /messaging/unread-count
   */
  @Get('unread-count')
  @Roles(Role.ADMIN, Role.DOCTOR, Role.NURSE, Role.SECRETARY)
  async getUnreadCount(@CurrentUserId() userId: string) {
    const result = await this.messagingService.getUnreadCount(userId);
    return {
      success: true,
      data: result,
    };
  }
}
