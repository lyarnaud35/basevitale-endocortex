import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { MetricsService } from '../common/services/metrics.service';
import { PDFExtractionService } from '../pdf-extraction/pdf-extraction.service';
import { ScribeService } from '../scribe/scribe.service';
import { withMetrics } from '../common/utils/metrics.util';

/**
 * DocumentAnalysisService
 * 
 * Service pour l'analyse de documents PDF (notamment ECOSYSTEME BASEVITALE.pdf)
 * Extraction et analyse intelligente de contenu
 * 
 * Version BaseVitale Révolutionnaire
 */
@Injectable()
export class DocumentAnalysisService {
  private readonly logger = new Logger(DocumentAnalysisService.name);
  private readonly aiMode: 'MOCK' | 'CLOUD' | 'LOCAL';
  private readonly pythonSidecarUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly metricsService: MetricsService,
    private readonly pdfExtractionService?: PDFExtractionService,
    private readonly scribeService?: ScribeService,
  ) {
    this.aiMode = (process.env.AI_MODE || 'MOCK').toUpperCase() as 'MOCK' | 'CLOUD' | 'LOCAL';
    this.pythonSidecarUrl = process.env.AI_CORTEX_URL || 'http://localhost:8000';
    this.logger.log(`DocumentAnalysisService initialized with AI_MODE: ${this.aiMode}`);
  }

  /**
   * Analyser un PDF uploadé et extraire les améliorations/fonctionnalités
   */
  async analyzeEcosystemPDF(
    pdfBuffer: Buffer,
    filename?: string,
  ): Promise<{
    extractedText: string;
    improvements: Array<{
      title: string;
      description: string;
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
      category: string;
    }>;
    features: Array<{
      name: string;
      description: string;
      status: 'IMPLEMENTED' | 'PENDING' | 'NEW';
    }>;
    summary: string;
    metadata?: any;
  }> {
    return withMetrics(
      this.metricsService,
      'document_analysis.analyzeEcosystemPDF',
      async () => {
        this.logger.log(`Analyzing ecosystem PDF: ${filename || 'unknown'}`);

        // Extraire le texte du PDF avec le nouveau service
        // @ts-ignore - Service injecté via module
        const pdfResult = await this.pdfExtractionService?.extractPDF(
          pdfBuffer,
          filename || 'ECOSYSTEME_BASEVITALE.pdf',
          {
            extractTables: true,
            extractImages: false,
          },
        );

        const extractedText = pdfResult.text;

        // Analyser avec IA pour identifier améliorations
        const analysis = await this.analyzeWithAI(extractedText);

        this.metricsService.incrementCounter('document_analysis.pdf.analyzed');

        return {
          ...analysis,
          metadata: pdfResult.metadata,
        };
      },
    );
  }


  /**
   * Analyser le texte avec IA pour identifier améliorations
   */
  private async analyzeWithAI(text: string): Promise<{
    extractedText: string;
    improvements: Array<{
      title: string;
      description: string;
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
      category: string;
    }>;
    features: Array<{
      name: string;
      description: string;
      status: 'IMPLEMENTED' | 'PENDING' | 'NEW';
    }>;
    summary: string;
  }> {
    try {
      // Utiliser ScribeService pour extraire un Knowledge Graph du document
      // Cela permettra d'identifier automatiquement les fonctionnalités mentionnées
      if (!this.scribeService) {
        throw new BadRequestException('Scribe service not available');
      }
      const knowledgeGraph = await this.scribeService.extractKnowledgeGraph(text);

      // Analyser les nœuds pour identifier fonctionnalités et améliorations
      const features = this.extractFeaturesFromGraph(knowledgeGraph);
      const improvements = this.extractImprovementsFromGraph(knowledgeGraph);

      // Générer un résumé
      const summary = this.generateSummary(text, features, improvements);

      return {
        extractedText: text,
        improvements,
        features,
        summary,
      };
    } catch (error) {
      this.logger.error('Error analyzing PDF with AI', error);
      
      // Fallback : analyse basique
      return {
        extractedText: text,
        improvements: [],
        features: [],
        summary: `Document analysé (${text.length} caractères). Analyse IA non disponible.`,
      };
    }
  }

  /**
   * Extraire les fonctionnalités depuis le Knowledge Graph
   */
  private extractFeaturesFromGraph(graph: any): Array<{
    name: string;
    description: string;
    status: 'IMPLEMENTED' | 'PENDING' | 'NEW';
  }> {
    const features: Array<{
      name: string;
      description: string;
      status: 'IMPLEMENTED' | 'PENDING' | 'NEW';
    }> = [];

    // Analyser les nœuds pour identifier les fonctionnalités
    graph.nodes?.forEach((node: any) => {
      if (node.nodeType === 'FEATURE' || node.label?.toLowerCase().includes('fonctionnalité')) {
        features.push({
          name: node.label || 'Fonctionnalité',
          description: node.description || '',
          status: this.determineFeatureStatus(node),
        });
      }
    });

    return features;
  }

  /**
   * Extraire les améliorations depuis le Knowledge Graph
   */
  private extractImprovementsFromGraph(graph: any): Array<{
    title: string;
    description: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    category: string;
  }> {
    const improvements: Array<{
      title: string;
      description: string;
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
      category: string;
    }> = [];

    // Analyser les nœuds pour identifier les améliorations
    graph.nodes?.forEach((node: any) => {
      if (node.nodeType === 'IMPROVEMENT' || node.label?.toLowerCase().includes('amélioration')) {
        improvements.push({
          title: node.label || 'Amélioration',
          description: node.description || '',
          priority: this.determinePriority(node),
          category: node.category || 'Général',
        });
      }
    });

    return improvements;
  }

  /**
   * Déterminer le statut d'une fonctionnalité
   */
  private determineFeatureStatus(node: any): 'IMPLEMENTED' | 'PENDING' | 'NEW' {
    // Logique basique : à améliorer avec comparaison avec modules existants
    const label = (node.label || '').toLowerCase();
    
    if (label.includes('implémenté') || label.includes('complet')) {
      return 'IMPLEMENTED';
    }
    if (label.includes('en cours') || label.includes('pending')) {
      return 'PENDING';
    }
    return 'NEW';
  }

  /**
   * Déterminer la priorité d'une amélioration
   */
  private determinePriority(node: any): 'HIGH' | 'MEDIUM' | 'LOW' {
    const label = (node.label || '').toLowerCase();
    const description = (node.description || '').toLowerCase();

    if (label.includes('urgent') || label.includes('critique') || description.includes('important')) {
      return 'HIGH';
    }
    if (label.includes('moyen') || description.includes('amélioration')) {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  /**
   * Générer un résumé
   */
  private generateSummary(
    text: string,
    features: any[],
    improvements: any[],
  ): string {
    return `Document analysé : ${text.length} caractères
${features.length} fonctionnalités identifiées
${improvements.length} améliorations suggérées

Fonctionnalités principales :
${features.slice(0, 5).map(f => `- ${f.name} (${f.status})`).join('\n')}

Améliorations prioritaires :
${improvements.filter(i => i.priority === 'HIGH').slice(0, 3).map(i => `- ${i.title}`).join('\n')}
`;
  }

  /**
   * Comparer les fonctionnalités du PDF avec l'implémentation actuelle
   */
  async compareWithImplementation(
    pdfFeatures: string[],
  ): Promise<{
    missing: string[];
    implemented: string[];
    toImprove: string[];
  }> {
    // TODO: Comparer avec modules existants
    return {
      missing: [],
      implemented: [],
      toImprove: [],
    };
  }
}
