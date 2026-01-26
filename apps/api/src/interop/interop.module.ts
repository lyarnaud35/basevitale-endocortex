import { Module } from '@nestjs/common';
import { InteropService } from './interop.service';
import { InteropController } from './interop.controller';

/**
 * InteropModule
 * 
 * Module pour l'interopérabilité HL7/FHIR
 * Version BaseVitale V112
 */
@Module({
  controllers: [InteropController],
  providers: [InteropService],
  exports: [InteropService],
})
export class InteropModule {}
