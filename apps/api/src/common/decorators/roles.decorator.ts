import { SetMetadata } from '@nestjs/common';
import { Role } from '../guards/role.guard';

export const ROLES_KEY = 'roles';

/**
 * Decorator pour spécifier les rôles requis
 * 
 * @example
 * @Roles(Role.DOCTOR, Role.ADMIN)
 * @UseGuards(RoleGuard)
 * @Post('patients')
 * async createPatient() { ... }
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
