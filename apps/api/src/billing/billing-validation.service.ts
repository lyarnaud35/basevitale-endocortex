import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClinicalEvidence } from '@basevitale/shared';

/**
 * BillingValidationService
 * 
 * Service de validation pour le Module E+ (Facturation)
 * 
 * Version Cabinet - Sprint 3: Automatisme Déterministe
 * 
 * RÈGLE INVARIANTE: "Pas de Preuve = Pas de Facture"
 * 
 * Vérifie que les preuves cliniques existent dans le Knowledge Graph
 * avant de permettre la validation d'un événement de facturation.
 */
@Injectable()
export class BillingValidationService {
  private readonly logger = new Logger(BillingValidationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Vérifier qu'une preuve clinique existe dans le Knowledge Graph
   * 
   * @param evidence - Preuve clinique à vérifier
   * @param consultationId - ID de la consultation concernée
   * @returns true si la preuve existe, false sinon
   */
  async validateClinicalEvidence(
    evidence: ClinicalEvidence,
    consultationId: string,
  ): Promise<{
    valid: boolean;
    missingNodeIds: string[];
    message?: string;
  }> {
    this.logger.debug(
      `Validating clinical evidence: ${evidence.evidenceType} with ${evidence.nodeIds.length} nodes`,
    );

    // Vérifier que tous les nœuds existent dans le Knowledge Graph
    const existingNodes = await this.prisma.semanticNode.findMany({
      where: {
        id: { in: evidence.nodeIds },
        consultationId, // Les nœuds doivent appartenir à cette consultation
      },
      select: { id: true },
    });

    const existingNodeIds = new Set(existingNodes.map((n) => n.id));
    const missingNodeIds = evidence.nodeIds.filter(
      (id) => !existingNodeIds.has(id),
    );

    if (missingNodeIds.length > 0) {
      this.logger.warn(
        `Missing clinical evidence nodes: ${missingNodeIds.join(', ')}`,
      );
      return {
        valid: false,
        missingNodeIds,
        message: `Preuves cliniques manquantes dans le Knowledge Graph: ${missingNodeIds.length} nœud(s) introuvable(s)`,
      };
    }

    // Vérifier le type de preuve selon le type d'acte
    // Cette logique peut être étendue selon les besoins
    const validationMessage = await this.validateEvidenceType(
      evidence,
      existingNodeIds,
      consultationId,
    );

    if (!validationMessage.valid) {
      return {
        valid: false,
        missingNodeIds: [],
        message: validationMessage.message,
      };
    }

    this.logger.log(
      `Clinical evidence validated successfully for consultation ${consultationId}`,
    );

    return {
      valid: true,
      missingNodeIds: [],
      message: 'Preuve clinique validée',
    };
  }

  /**
   * Vérifier qu'une consultation a au moins une preuve clinique pour un type d'acte
   * 
   * @param consultationId - ID de la consultation
   * @param actType - Type d'acte médical
   * @returns true si une preuve existe pour ce type d'acte
   */
  async hasEvidenceForAct(
    consultationId: string,
    actType: string,
  ): Promise<boolean> {
    // Mapping des types d'actes vers les types de nœuds requis
    const actTypeToNodeTypes: Record<string, string[]> = {
      CONSULTATION: ['CONSTANT', 'SYMPTOM', 'DIAGNOSIS'],
      ACTE_TECHNIQUE: ['PROCEDURE', 'ACT'],
      INTERVENTION: ['PROCEDURE', 'ACT'],
      EXAMEN: ['LAB_RESULT', 'IMAGING_RESULT', 'ACT'],
      SOIN: ['ACT', 'PROCEDURE'],
      HOSPITALISATION: ['DIAGNOSIS', 'CONSTANT', 'ACT'],
    };

    const requiredNodeTypes = actTypeToNodeTypes[actType] || ['ACT'];

    const nodes = await this.prisma.semanticNode.findFirst({
      where: {
        consultationId,
        nodeType: { in: requiredNodeTypes },
      },
    });

    return !!nodes;
  }

  /**
   * Vérifier le type de preuve selon les règles métier
   * 
   * @private
   */
  private async validateEvidenceType(
    evidence: ClinicalEvidence,
    nodeIds: Set<string>,
    consultationId: string,
  ): Promise<{ valid: boolean; message?: string }> {
    // Récupérer les nœuds pour vérifier leur type
    const nodes = await this.prisma.semanticNode.findMany({
      where: { id: { in: Array.from(nodeIds) } },
      select: { id: true, nodeType: true, label: true },
    });

    // Vérifications spécifiques selon le type de preuve
    switch (evidence.evidenceType) {
      case 'OPERATIVE_REPORT':
        // Un compte-rendu opératoire doit avoir au moins un nœud PROCEDURE ou ACT
        const hasProcedure = nodes.some(
          (n) => n.nodeType === 'PROCEDURE' || n.nodeType === 'ACT',
        );
        if (!hasProcedure) {
          return {
            valid: false,
            message: 'Un compte-rendu opératoire doit contenir au moins un acte ou une procédure',
          };
        }
        break;

      case 'LAB_RESULT':
        // Un résultat de laboratoire doit avoir un nœud LAB_RESULT ou CONSTANT
        const hasLabResult = nodes.some(
          (n) => n.nodeType === 'LAB_RESULT' || n.nodeType === 'CONSTANT',
        );
        if (!hasLabResult) {
          return {
            valid: false,
            message: 'Un résultat de laboratoire doit contenir des données de laboratoire ou des constantes',
          };
        }
        break;

      case 'CONSULTATION_NOTE':
        // Une note de consultation doit avoir au moins un symptôme ou diagnostic
        const hasClinicalData = nodes.some(
          (n) => n.nodeType === 'SYMPTOM' || n.nodeType === 'DIAGNOSIS',
        );
        if (!hasClinicalData) {
          return {
            valid: false,
            message: 'Une note de consultation doit contenir au moins un symptôme ou un diagnostic',
          };
        }
        break;

      default:
        // Pour les autres types, on accepte si les nœuds existent
        break;
    }

    return { valid: true };
  }

  /**
   * Règle principale : "Pas de Preuve = Pas de Facture"
   * 
   * Vérifie qu'aucun événement de facturation ne peut être validé
   * sans preuve clinique correspondante dans le Knowledge Graph.
   * 
   * @param consultationId - ID de la consultation
   * @param actType - Type d'acte à facturer
   * @returns true si la facturation est autorisée
   */
  async canBillAct(
    consultationId: string,
    actType: string,
  ): Promise<{
    allowed: boolean;
    message: string;
  }> {
    const hasEvidence = await this.hasEvidenceForAct(consultationId, actType);

    if (!hasEvidence) {
      return {
        allowed: false,
        message: `Aucune preuve clinique trouvée pour un acte de type ${actType}. Facturation impossible.`,
      };
    }

    return {
      allowed: true,
      message: 'Preuve clinique trouvée, facturation autorisée',
    };
  }
}
