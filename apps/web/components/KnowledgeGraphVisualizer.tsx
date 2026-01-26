'use client';

import React, { useCallback, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

interface KnowledgeGraphVisualizerProps {
  nodes?: Array<{
    id: string;
    label: string;
    nodeType: string;
    confidence?: number;
  }>;
  relations?: Array<{
    sourceNodeId: string;
    targetNodeId: string;
    relationType: string;
  }>;
}

/**
 * KnowledgeGraphVisualizer
 * 
 * Composant de visualisation interactive du Knowledge Graph avec React Flow
 * Version BaseVitale V112
 */
export default function KnowledgeGraphVisualizer({
  nodes = [],
  relations = [],
}: KnowledgeGraphVisualizerProps) {
  // Convertir les nœuds au format React Flow
  const initialNodes: Node[] = nodes.map((node, index) => ({
    id: node.id || `node-${index}`,
    type: 'default',
    position: {
      x: Math.random() * 500,
      y: Math.random() * 500,
    },
    data: {
      label: (
        <div className="text-center">
          <div className="font-semibold">{node.label}</div>
          <div className="text-xs text-gray-500">{node.nodeType}</div>
          {node.confidence && (
            <div className="text-xs text-blue-600">
              {(node.confidence * 100).toFixed(0)}%
            </div>
          )}
        </div>
      ),
    },
    style: {
      background: getNodeColor(node.nodeType),
      color: '#fff',
      border: '2px solid #222138',
      width: 150,
      padding: '10px',
      borderRadius: '8px',
    },
  }));

  // Convertir les relations au format React Flow
  const initialEdges: Edge[] = relations.map((relation, index) => ({
    id: `edge-${index}`,
    source: relation.sourceNodeId,
    target: relation.targetNodeId,
    label: relation.relationType,
    animated: true,
    style: { stroke: '#6366f1', strokeWidth: 2 },
    labelStyle: { fill: '#6366f1', fontWeight: 600 },
  }));

  const [flowNodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Mettre à jour les nœuds et relations quand les props changent
  useEffect(() => {
    const newNodes: Node[] = nodes.map((node, index) => ({
      id: node.id || `node-${index}`,
      type: 'default',
      position: {
        x: Math.random() * 500,
        y: Math.random() * 500,
      },
      data: {
        label: (
          <div className="text-center">
            <div className="font-semibold">{node.label}</div>
            <div className="text-xs text-gray-500">{node.nodeType}</div>
            {node.confidence && (
              <div className="text-xs text-blue-600">
                {(node.confidence * 100).toFixed(0)}%
              </div>
            )}
          </div>
        ),
      },
      style: {
        background: getNodeColor(node.nodeType),
        color: '#fff',
        border: '2px solid #222138',
        width: 150,
        padding: '10px',
        borderRadius: '8px',
      },
    }));

    const newEdges: Edge[] = relations.map((relation, index) => ({
      id: `edge-${index}`,
      source: relation.sourceNodeId,
      target: relation.targetNodeId,
      label: relation.relationType,
      animated: true,
      style: { stroke: '#6366f1', strokeWidth: 2 },
      labelStyle: { fill: '#6366f1', fontWeight: 600 },
    }));

    setNodes(newNodes);
    setEdges(newEdges);
  }, [nodes, relations, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <div style={{ width: '100%', height: '600px' }}>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}

/**
 * Obtenir la couleur selon le type de nœud
 */
function getNodeColor(nodeType: string): string {
  const colors: Record<string, string> = {
    DIAGNOSIS: '#ef4444',
    SYMPTOM: '#f59e0b',
    MEDICATION: '#10b981',
    ANTECEDENT: '#3b82f6',
    LAB_RESULT: '#8b5cf6',
    ACT: '#ec4899',
    PROCEDURE: '#06b6d4',
  };

  return colors[nodeType] || '#6b7280';
}
