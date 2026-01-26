import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { InteropService } from './interop.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RoleGuard } from '../common/guards/role.guard';
import { Role } from '../common/guards/role.guard';

/**
 * InteropController
 * 
 * Endpoints pour l'interopérabilité HL7/FHIR
 * Version BaseVitale V112
 */
@Controller('interop')
@UseGuards(AuthGuard, RoleGuard)
export class InteropController {
  constructor(private readonly interopService: InteropService) {}

  @Post('fhir/patient/to')
  @Roles(Role.ADMIN, Role.DOCTOR)
  async toFHIR(@Body() patient: any) {
    return {
      success: true,
      data: await this.interopService.toFHIRPatient(patient),
    };
  }

  @Post('fhir/patient/from')
  @Roles(Role.ADMIN, Role.DOCTOR)
  async fromFHIR(@Body() fhirPatient: any) {
    return {
      success: true,
      data: await this.interopService.fromFHIRPatient(fhirPatient),
    };
  }

  @Post('hl7/parse')
  @Roles(Role.ADMIN)
  async parseHL7(@Body() body: { message: string }) {
    return {
      success: true,
      data: await this.interopService.parseHL7(body.message),
    };
  }

  @Post('hl7/generate')
  @Roles(Role.ADMIN)
  async generateHL7(@Body() data: any) {
    return {
      success: true,
      data: await this.interopService.generateHL7(data),
    };
  }
}
