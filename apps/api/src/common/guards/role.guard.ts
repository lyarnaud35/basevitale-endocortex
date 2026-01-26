import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Roles - Enum des rôles disponibles
 */
export enum Role {
  ADMIN = 'admin',
  DOCTOR = 'doctor',
  NURSE = 'nurse',
  SECRETARY = 'secretary',
  READONLY = 'readonly',
}


/**
 * RoleGuard
 * 
 * Vérifie que l'utilisateur a les rôles requis pour accéder à la route
 * 
 * @example
 * @Roles(Role.DOCTOR, Role.ADMIN)
 * @UseGuards(RoleGuard)
 * @Post('patients')
 * async createPatient() { ... }
 */
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<Role[]>(
      ROLES_KEY,
      context.getHandler(),
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      // Pas de rôles requis, autoriser
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.roles) {
      return false;
    }

    // Vérifier que l'utilisateur a au moins un des rôles requis
    return requiredRoles.some((role) => user.roles.includes(role));
  }
}
