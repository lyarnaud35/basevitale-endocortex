import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { KnowledgeGraphService } from './knowledge-graph.service';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from '../common/services/metrics.service';

describe('KnowledgeGraphService', () => {
  let service: KnowledgeGraphService;
  let prisma: PrismaService;
  let metrics: MetricsService;

  const mockPrismaService = {
    semanticNode: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    semanticRelation: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockMetricsService = {
    incrementCounter: jest.fn(),
    recordValue: jest.fn(),
    recordTiming: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeGraphService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();

    service = module.get<KnowledgeGraphService>(KnowledgeGraphService);
    prisma = module.get<PrismaService>(PrismaService);
    metrics = module.get<MetricsService>(MetricsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNode', () => {
    const nodeData = {
      nodeType: 'DIAGNOSIS',
      label: 'Grippe',
      cim10Code: 'J11.1',
      confidence: 0.85,
    };

    const createdNode = {
      id: 'node123',
      ...nodeData,
      snomedCtCode: null,
      cim11Code: null,
      description: null,
      embedding: null,
      value: null,
      unit: null,
      patientId: null,
      consultationId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a semantic node successfully', async () => {
      mockPrismaService.semanticNode.create.mockResolvedValue(createdNode);

      const result = await service.createNode(nodeData);

      expect(result).toBeDefined();
      expect(result.id).toBe('node123');
      expect(result.nodeType).toBe('DIAGNOSIS');
      expect(mockPrismaService.semanticNode.create).toHaveBeenCalled();
    });
  });

  describe('createNodes', () => {
    const nodesData = [
      {
        nodeType: 'DIAGNOSIS',
        label: 'Grippe',
        cim10Code: 'J11.1',
      },
      {
        nodeType: 'SYMPTOM',
        label: 'Fièvre',
      },
    ];

    const createdNodes = nodesData.map((node, index) => ({
      id: `node${index + 1}`,
      ...node,
      snomedCtCode: null,
      cim10Code: node.cim10Code || null,
      cim11Code: null,
      description: null,
      embedding: null,
      value: null,
      unit: null,
      confidence: null,
      patientId: null,
      consultationId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    it('should create multiple nodes in batch', async () => {
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return createdNodes;
      });

      const result = await service.createNodes(nodesData);

      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      expect(mockMetricsService.incrementCounter).toHaveBeenCalledWith(
        'knowledge_graph.nodes.created',
        2,
      );
    });

    it('should return empty array if no nodes provided', async () => {
      const result = await service.createNodes([]);

      expect(result).toEqual([]);
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('createRelation', () => {
    const relationData = {
      sourceNodeId: 'node1',
      targetNodeId: 'node2',
      relationType: 'CAUSES',
      strength: 0.8,
    };

    const sourceNode = {
      id: 'node1',
      nodeType: 'SYMPTOM',
      label: 'Fièvre',
    };

    const targetNode = {
      id: 'node2',
      nodeType: 'DIAGNOSIS',
      label: 'Grippe',
    };

    const createdRelation = {
      id: 'rel123',
      ...relationData,
      evidence: null,
      confidence: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should create a relation successfully', async () => {
      mockPrismaService.semanticNode.findUnique
        .mockResolvedValueOnce(sourceNode)
        .mockResolvedValueOnce(targetNode);
      mockPrismaService.semanticRelation.create.mockResolvedValue(createdRelation);

      const result = await service.createRelation(relationData);

      expect(result).toBeDefined();
      expect(result.id).toBe('rel123');
      expect(result.relationType).toBe('CAUSES');
      expect(mockPrismaService.semanticRelation.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if source node not found', async () => {
      mockPrismaService.semanticNode.findUnique.mockResolvedValueOnce(null);

      await expect(service.createRelation(relationData)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw NotFoundException if target node not found', async () => {
      mockPrismaService.semanticNode.findUnique
        .mockResolvedValueOnce(sourceNode)
        .mockResolvedValueOnce(null);

      await expect(service.createRelation(relationData)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('buildGraphFromExtraction', () => {
    const graphData = {
      nodes: [
        {
          nodeType: 'DIAGNOSIS',
          label: 'Grippe',
          cim10Code: 'J11.1',
        },
      ],
      relations: [],
    };

    const createdNodes = [
      {
        id: 'node1',
        nodeType: 'DIAGNOSIS',
        label: 'Grippe',
        cim10Code: 'J11.1',
        snomedCtCode: null,
        cim11Code: null,
        description: null,
        embedding: null,
        value: null,
        unit: null,
        confidence: null,
        patientId: null,
        consultationId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('should build graph from extraction successfully', async () => {
      // Mock createNodes
      jest.spyOn(service, 'createNodes').mockResolvedValue(createdNodes);
      // Mock createRelations
      jest.spyOn(service, 'createRelations').mockResolvedValue([]);

      const result = await service.buildGraphFromExtraction(graphData);

      expect(result).toBeDefined();
      expect(result.nodes).toBeDefined();
      expect(result.relations).toBeDefined();
      expect(mockMetricsService.incrementCounter).toHaveBeenCalledWith(
        'knowledge_graph.graphs.built',
      );
      expect(mockMetricsService.recordValue).toHaveBeenCalledWith(
        'knowledge_graph.graphs.nodes_count',
        1,
      );
    });
  });
});
