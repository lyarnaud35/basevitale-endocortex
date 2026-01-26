import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from '../common/decorators/public.decorator';

/**
 * AppController
 * 
 * Contrôleur racine de l'application
 */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Endpoint racine
   * GET /
   */
  @Get()
  @Public()
  getData() {
    return {
      ...this.appService.getData(),
      message: 'BaseVitale API - Version Cabinet',
      endpoints: {
        health: '/api/health',
        patients: '/api/identity/patients',
        scribe: '/api/scribe',
      },
    };
  }
}
