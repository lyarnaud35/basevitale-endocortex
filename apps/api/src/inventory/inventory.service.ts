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
 * InventoryService
 * 
 * Service pour la gestion des stocks (ERP Hospitalier)
 * Gestion stocks pharmacie et matériel médical
 * 
 * Version BaseVitale Révolutionnaire - Présentation Mars 2025
 */
@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: MetricsService,
  ) {}

  /**
   * Créer un article en stock
   */
  async createStockItem(data: {
    name: string;
    description?: string;
    sku: string;
    category: string;
    subCategory?: string;
    minQuantity: number;
    maxQuantity?: number;
    unit?: string;
  }) {
    return withMetrics(
      this.metricsService,
      'inventory.createStockItem',
      async () => {
        const item = await this.prisma.stockItem.create({
          data: {
            name: data.name,
            description: data.description,
            sku: data.sku,
            category: data.category,
            subCategory: data.subCategory,
            currentQuantity: 0,
            minQuantity: data.minQuantity,
            maxQuantity: data.maxQuantity,
            unit: data.unit || 'unit',
          },
        });

        this.logger.log(`Created stock item ${item.id} (${item.sku})`);
        this.metricsService.incrementCounter('inventory.items.created');

        return item;
      },
    );
  }

  /**
   * Enregistrer un mouvement de stock
   */
  async recordStockMovement(data: {
    stockItemId: string;
    movementType: string;
    quantity: number;
    reference?: string;
    referenceType?: string;
    createdBy: string;
  }) {
    return withMetrics(
      this.metricsService,
      'inventory.recordStockMovement',
      async () => {
        const item = await this.prisma.stockItem.findUnique({
          where: { id: data.stockItemId },
        });

        if (!item) {
          throw new NotFoundException(
            `Stock item ${data.stockItemId} not found`,
          );
        }

        // Calculer nouvelle quantité
        let newQuantity = item.currentQuantity;
        if (data.movementType === 'IN') {
          newQuantity += data.quantity;
        } else if (data.movementType === 'OUT') {
          newQuantity -= data.quantity;
          if (newQuantity < 0) {
            throw new BadRequestException('Stock insuffisant');
          }
        } else if (data.movementType === 'ADJUSTMENT') {
          newQuantity = data.quantity;
        }

        // Transaction : mouvement + mise à jour stock + vérification alertes
        const result = await this.prisma.$transaction(async (tx) => {
          // Créer le mouvement
          const movement = await tx.stockMovement.create({
            data: {
              stockItemId: data.stockItemId,
              movementType: data.movementType,
              quantity: data.quantity,
              reference: data.reference,
              referenceType: data.referenceType,
              createdBy: data.createdBy,
            },
          });

          // Mettre à jour le stock
          const updatedItem = await tx.stockItem.update({
            where: { id: data.stockItemId },
            data: { currentQuantity: newQuantity },
          });

          // Vérifier et créer alertes si nécessaire
          await this.checkAndCreateAlerts(tx, updatedItem);

          return { movement, item: updatedItem };
        });

        this.logger.log(
          `Stock movement recorded: ${data.movementType} ${data.quantity} for item ${data.stockItemId}`,
        );
        this.metricsService.incrementCounter('inventory.movements.recorded');

        return result;
      },
    );
  }

  /**
   * Vérifier et créer des alertes de stock
   */
  private async checkAndCreateAlerts(tx: any, item: any) {
    const alerts = [];

    // Alerte rupture de stock
    if (item.currentQuantity === 0) {
      alerts.push({
        stockItemId: item.id,
        alertType: 'OUT_OF_STOCK',
        severity: 'CRITICAL',
        message: `${item.name} est en rupture de stock`,
        status: 'ACTIVE',
      });
    }
    // Alerte seuil bas
    else if (item.currentQuantity <= item.minQuantity) {
      alerts.push({
        stockItemId: item.id,
        alertType: 'LOW_STOCK',
        severity:
          item.currentQuantity < item.minQuantity * 0.5
            ? 'HIGH'
            : 'MEDIUM',
        message: `${item.name} approche du seuil minimum (${item.currentQuantity}/${item.minQuantity})`,
        status: 'ACTIVE',
      });
    }

    if (alerts.length > 0) {
      // Désactiver les alertes précédentes
      await tx.stockAlert.updateMany({
        where: {
          stockItemId: item.id,
          status: 'ACTIVE',
        },
        data: { status: 'RESOLVED' },
      });

      // Créer nouvelles alertes
      await tx.stockAlert.createMany({
        data: alerts,
      });

      this.logger.warn(
        `Created ${alerts.length} stock alerts for item ${item.id}`,
      );
    }
  }

  /**
   * Obtenir les alertes actives
   */
  async getActiveAlerts(severity?: string) {
    const where: any = { status: 'ACTIVE' };
    if (severity) where.severity = severity;

    const alerts = await this.prisma.stockAlert.findMany({
      where,
      include: {
        stockItem: true,
      },
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return alerts;
  }

  /**
   * Marquer une alerte comme résolue
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string) {
    const alert = await this.prisma.stockAlert.update({
      where: { id: alertId },
      data: {
        status: 'ACKNOWLEDGED',
        acknowledgedAt: new Date(),
        acknowledgedBy,
      },
    });

    this.logger.log(`Alert ${alertId} acknowledged`);
    return alert;
  }

  /**
   * Obtenir le stock d'un article
   */
  async getStockItem(stockItemId: string) {
    const item = await this.prisma.stockItem.findUnique({
      where: { id: stockItemId },
      include: {
        movements: {
          take: 20,
          orderBy: { movementDate: 'desc' },
        },
        alerts: {
          where: { status: 'ACTIVE' },
        },
      },
    });

    if (!item) {
      throw new NotFoundException(`Stock item ${stockItemId} not found`);
    }

    return item;
  }

  /**
   * Obtenir tous les articles par catégorie
   */
  async getStockItemsByCategory(category?: string) {
    const where = category ? { category } : {};

    const items = await this.prisma.stockItem.findMany({
      where,
      include: {
        alerts: {
          where: { status: 'ACTIVE' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    return items;
  }
}
