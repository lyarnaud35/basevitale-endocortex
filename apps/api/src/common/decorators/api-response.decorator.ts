import { applyDecorators, Type } from '@nestjs/common';
// @nestjs/swagger non installé (incompatible avec NestJS 10)
// import { ApiResponse, ApiExtraModels, getSchemaPath } from '@nestjs/swagger';
import { ApiSuccessResponse } from '../dto/api-response.dto';

/**
 * Decorator pour documenter les réponses API (Swagger/OpenAPI)
 * Désactivé temporairement - @nestjs/swagger non disponible
 * 
 * @example
 * @ApiSuccessResponse(PatientSchema)
 * @Get(':id')
 * async getPatient(@Param('id') id: string) {
 *   return this.service.getById(id);
 * }
 */
export const ApiSuccessResponseDecorator = <DataDto extends Type<unknown>>(
  dataDto: DataDto,
) => {
  // Retourner un decorator vide pour l'instant
  return applyDecorators();
  
  /* Code désactivé - réactiver quand @nestjs/swagger sera disponible
  applyDecorators(
    ApiExtraModels(ApiSuccessResponse, dataDto),
    ApiResponse({
      status: 200,
      description: 'Success',
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiSuccessResponse) },
          {
            properties: {
              data: {
                $ref: getSchemaPath(dataDto),
              },
            },
          },
        ],
      },
    }),
  );
  */
};
