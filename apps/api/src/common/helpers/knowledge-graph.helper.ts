import { SemanticNode, SemanticRelation, SemanticNodeType } from '@basevitale/shared';

/**
 * Helpers pour le Knowledge Graph
 */

/**
 * Trouver un nœud par type et label
 */
export function findNodeByTypeAndLabel(
  nodes: SemanticNode[],
  nodeType: SemanticNodeType,
  label: string,
): SemanticNode | undefined {
  return nodes.find(
    (node) => node.nodeType === nodeType && node.label.toLowerCase() === label.toLowerCase(),
  );
}

/**
 * Trouver tous les nœuds d'un type donné
 */
export function findNodesByType(
  nodes: SemanticNode[],
  nodeType: SemanticNodeType,
): SemanticNode[] {
  return nodes.filter((node) => node.nodeType === nodeType);
}

/**
 * Trouver les relations d'un nœud
 */
export function findNodeRelations(
  nodeId: string,
  relations: SemanticRelation[],
  direction: 'outgoing' | 'incoming' | 'both' = 'both',
): SemanticRelation[] {
  if (direction === 'outgoing') {
    return relations.filter((rel) => rel.sourceNodeId === nodeId);
  }
  if (direction === 'incoming') {
    return relations.filter((rel) => rel.targetNodeId === nodeId);
  }
  return relations.filter(
    (rel) => rel.sourceNodeId === nodeId || rel.targetNodeId === nodeId,
  );
}

/**
 * Vérifier si un nœud a une preuve clinique valide
 */
export function hasClinicalEvidence(node: SemanticNode): boolean {
  const clinicalNodeTypes: SemanticNodeType[] = [
    'SYMPTOM',
    'DIAGNOSIS',
    'LAB_RESULT',
    'IMAGING_RESULT',
    'CONSTANT',
    'PROCEDURE',
    'ACT',
  ];
  
  return clinicalNodeTypes.includes(node.nodeType);
}

/**
 * Calculer la confiance moyenne d'un ensemble de nœuds
 */
export function calculateAverageConfidence(nodes: SemanticNode[]): number {
  if (nodes.length === 0) return 0;
  
  const nodesWithConfidence = nodes.filter((n) => n.confidence !== undefined);
  if (nodesWithConfidence.length === 0) return 0;
  
  const sum = nodesWithConfidence.reduce(
    (acc, node) => acc + (node.confidence || 0),
    0,
  );
  
  return sum / nodesWithConfidence.length;
}

/**
 * Construire un graphe de relations simplifié
 */
export function buildRelationGraph(
  nodes: SemanticNode[],
  relations: SemanticRelation[],
): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  
  nodes.forEach((node) => {
    graph.set(node.id, []);
  });
  
  relations.forEach((relation) => {
    const neighbors = graph.get(relation.sourceNodeId) || [];
    neighbors.push(relation.targetNodeId);
    graph.set(relation.sourceNodeId, neighbors);
  });
  
  return graph;
}
