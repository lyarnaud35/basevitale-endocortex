'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Link from 'next/link';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface SemanticNode {
  id: string;
  nodeType: string;
  label: string;
  description?: string;
  cim10Code?: string;
  cim11Code?: string;
  confidence?: number;
}

interface SemanticRelation {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationType: string;
}

export default function KnowledgeGraphVisualizationPage() {
  const params = useParams();
  const consultationId = params?.id as string;

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  useEffect(() => {
    if (!consultationId) return;

    const fetchGraph = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${API_URL}/knowledge-graph/consultations/${consultationId}/nodes`,
          {
            headers: {
              Authorization: 'Bearer test-token',
            },
          },
        );

        if (!response.ok) {
          throw new Error('Erreur lors de la récupération du graphe');
        }

        const data = await response.json();
        const semanticNodes: SemanticNode[] = data.data || [];

        // Convertir les nœuds sémantiques en nœuds React Flow
        const flowNodes: Node[] = semanticNodes.map((node, index) => {
          const position = {
            x: (index % 4) * 300,
            y: Math.floor(index / 4) * 200,
          };

          // Couleur selon le type
          const nodeColors: Record<string, string> = {
            DIAGNOSIS: '#ef4444',
            SYMPTOM: '#f59e0b',
            MEDICATION: '#3b82f6',
            ANTECEDENT: '#8b5cf6',
            LAB_RESULT: '#10b981',
            CONSTANT: '#06b6d4',
          };

          return {
            id: node.id,
            type: 'default',
            position,
            data: {
              label: (
                <div className="p-2">
                  <div className="font-semibold text-sm">{node.label}</div>
                  <div className="text-xs text-gray-600">{node.nodeType}</div>
                  {node.cim10Code && (
                    <div className="text-xs text-blue-600">CIM-10: {node.cim10Code}</div>
                  )}
                  {node.confidence && (
                    <div className="text-xs text-gray-500">
                      Confiance: {(node.confidence * 100).toFixed(0)}%
                    </div>
                  )}
                </div>
              ),
            },
            style: {
              background: nodeColors[node.nodeType] || '#6b7280',
              color: '#fff',
              border: '2px solid #1f2937',
              borderRadius: '8px',
              width: 200,
              minHeight: 80,
            },
          };
        });

        setNodes(flowNodes);

        // TODO: Charger les relations et créer les edges
        // Pour l'instant, on met des edges vides
        setEdges([]);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGraph();
  }, [consultationId, setNodes, setEdges]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du graphe...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-md p-6">
          <p className="text-red-800">{error}</p>
          <Link
            href="/knowledge-graph"
            className="mt-4 inline-block text-blue-600 hover:text-blue-800"
          >
            ← Retour
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b shadow-sm p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Knowledge Graph - Consultation {consultationId}
            </h1>
            <p className="text-sm text-gray-600">
              {nodes.length} nœuds • {edges.length} relations
            </p>
          </div>
          <Link
            href="/knowledge-graph"
            className="text-blue-600 hover:text-blue-800"
          >
            ← Retour
          </Link>
        </div>
      </div>

      <div style={{ width: '100%', height: 'calc(100vh - 100px)' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
}
