import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from '../common/services/metrics.service';
import { withMetrics } from '../common/utils/metrics.util';

/**
 * StaffService
 * 
 * Service pour la gestion des équipes (ERP RH)
 * Planning des gardes, congés et interventions
 * 
 * Version BaseVitale Révolutionnaire - Présentation Mars 2025
 */
@Injectable()
export class StaffService {
  private readonly logger = new Logger(StaffService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * Créer un membre du personnel
   */
  async createStaffMember(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role: string;
    speciality?: string;
    qualifications?: string[];
    hiredDate?: Date;
  }) {
    return withMetrics(
      this.metricsService,
      'staff.createStaffMember',
      async () => {
        const staff = await this.prisma.staffMember.create({
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            role: data.role,
            speciality: data.speciality,
            qualifications: data.qualifications || [],
            hiredDate: data.hiredDate || new Date(),
            status: 'ACTIVE',
          },
        });

        this.logger.log(`Created staff member ${staff.id}`);
        this.metricsService.incrementCounter('staff.members.created');

        return staff;
      },
    );
  }

  /**
   * Créer un shift (poste de travail)
   */
  async createShift(data: {
    staffMemberId: string;
    startDate: Date;
    endDate: Date;
    startTime: Date;
    endTime: Date;
    shiftType: string;
    location?: string;
    createdBy: string;
  }) {
    return withMetrics(
      this.metricsService,
      'staff.createShift',
      async () => {
        // Vérifier conflit
        const conflict = await this.prisma.shift.findFirst({
          where: {
            staffMemberId: data.staffMemberId,
            status: { in: ['SCHEDULED', 'CONFIRMED'] },
            OR: [
              {
                AND: [
                  { startTime: { lte: data.startTime } },
                  { endTime: { gt: data.startTime } },
                ],
              },
              {
                AND: [
                  { startTime: { lt: data.endTime } },
                  { endTime: { gte: data.endTime } },
                ],
              },
            ],
          },
        });

        if (conflict) {
          throw new BadRequestException(
            'Le membre du personnel a déjà un shift à ce créneau',
          );
        }

        const shift = await this.prisma.shift.create({
          data: {
            staffMemberId: data.staffMemberId,
            startDate: data.startDate,
            endDate: data.endDate,
            startTime: data.startTime,
            endTime: data.endTime,
            shiftType: data.shiftType,
            location: data.location,
            createdBy: data.createdBy,
          },
          include: {
            staffMember: true,
          },
        });

        this.logger.log(`Created shift ${shift.id}`);
        this.metricsService.incrementCounter('staff.shifts.created');

        return shift;
      },
    );
  }

  /**
   * Créer une demande de congé
   */
  async requestLeave(data: {
    staffMemberId: string;
    startDate: Date;
    endDate: Date;
    leaveType: string;
    reason?: string;
    requestedBy: string;
  }) {
    return withMetrics(
      this.metricsService,
      'staff.requestLeave',
      async () => {
        const leave = await this.prisma.leave.create({
          data: {
            staffMemberId: data.staffMemberId,
            startDate: data.startDate,
            endDate: data.endDate,
            leaveType: data.leaveType,
            reason: data.reason,
            requestedBy: data.requestedBy,
            status: 'PENDING',
          },
          include: {
            staffMember: true,
          },
        });

        this.logger.log(`Leave request ${leave.id} created`);
        this.metricsService.incrementCounter('staff.leaves.requested');

        return leave;
      },
    );
  }

  /**
   * Approuver/Rejeter une demande de congé
   */
  async processLeaveRequest(
    leaveId: string,
    action: 'APPROVE' | 'REJECT',
    approvedBy: string,
  ) {
    return withMetrics(
      this.metricsService,
      'staff.processLeaveRequest',
      async () => {
        const leave = await this.prisma.leave.findUnique({
          where: { id: leaveId },
        });

        if (!leave) {
          throw new NotFoundException(`Leave ${leaveId} not found`);
        }

        const updated = await this.prisma.leave.update({
          where: { id: leaveId },
          data: {
            status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
            approvedBy,
            approvedAt: new Date(),
          },
        });

        this.logger.log(
          `Leave request ${leaveId} ${action === 'APPROVE' ? 'approved' : 'rejected'}`,
        );
        this.metricsService.incrementCounter(
          `staff.leaves.${action === 'APPROVE' ? 'approved' : 'rejected'}`,
        );

        return updated;
      },
    );
  }

  /**
   * Obtenir le planning d'un membre du personnel
   */
  async getStaffSchedule(staffMemberId: string, startDate: Date, endDate: Date) {
    return withMetrics(
      this.metricsService,
      'staff.getStaffSchedule',
      async () => {
        const shifts = await this.prisma.shift.findMany({
          where: {
            staffMemberId,
            startDate: { gte: startDate },
            endDate: { lte: endDate },
          },
          orderBy: { startTime: 'asc' },
        });

        const leaves = await this.prisma.leave.findMany({
          where: {
            staffMemberId,
            startDate: { lte: endDate },
            endDate: { gte: startDate },
            status: 'APPROVED',
          },
        });

        return {
          shifts,
          leaves,
          summary: {
            totalShifts: shifts.length,
            totalLeaves: leaves.length,
          },
        };
      },
    );
  }

  /**
   * Obtenir tous les membres du personnel par rôle
   */
  async getStaffByRole(role?: string) {
    const where = role ? { role, status: 'ACTIVE' } : { status: 'ACTIVE' };

    const staff = await this.prisma.staffMember.findMany({
      where,
      orderBy: { lastName: 'asc' },
    });

    return staff;
  }
}
