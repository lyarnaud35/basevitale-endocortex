import { applyDecorators } from '@nestjs/common';
// @nestjs/swagger non installé (incompatible avec NestJS 10)
// Decorator désactivé temporairement
// import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';

/**
 * Decorator combiné pour la documentation Swagger
 * Désactivé temporairement - @nestjs/swagger non disponible
 */
export function ApiDocumentation(
  tag: string,
  summary: string,
  description?: string,
  responses?: { status: number; description: string }[],
) {
  // Retourner un decorator vide pour l'instant
  return applyDecorators();
  
  /* Code désactivé - réactiver quand @nestjs/swagger sera disponible
  const decorators = [
    ApiTags(tag),
    ApiOperation({ summary, description }),
    ApiBearerAuth(),
  ];

  if (responses) {
    responses.forEach(({ status, description }) => {
      decorators.push(ApiResponse({ status, description }));
    });
  }

  return applyDecorators(...decorators);
  */
}
