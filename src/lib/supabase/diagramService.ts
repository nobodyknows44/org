import { createBrowserClient } from '@/lib/supabase/client';
import type { Diagram, DiagramNode, DiagramEdge } from '@/types/database';
import type { Node, Edge } from '@xyflow/react';
import type { OrgNodeData } from '@/stores/canvasStore';

const supabase = createBrowserClient();

export async function loadDiagram(diagramId: string) {
  const { data: diagram, error: diagramError } = await supabase
    .from('diagrams')
    .select('*')
    .eq('id', diagramId)
    .single();

  if (diagramError) throw diagramError;

  const { data: nodes, error: nodesError } = await supabase
    .from('nodes')
    .select('*')
    .eq('diagram_id', diagramId);

  if (nodesError) throw nodesError;

  const { data: edges, error: edgesError } = await supabase
    .from('edges')
    .select('*')
    .eq('diagram_id', diagramId);

  if (edgesError) throw edgesError;

  return {
    diagram: diagram as unknown as Diagram,
    nodes: (nodes || []) as unknown as DiagramNode[],
    edges: (edges || []) as unknown as DiagramEdge[],
  };
}

export function dbNodesToFlow(dbNodes: DiagramNode[], diagramType: string): Node<OrgNodeData>[] {
  return dbNodes.map((n) => ({
    id: n.id,
    type: diagramType === 'org_chart' ? 'orgChartNode' : 'ownershipNode',
    position: { x: n.position_x, y: n.position_y },
    data: {
      fields: n.data as Record<string, unknown>,
      styleOverrides: n.style_overrides || {},
    },
  }));
}

export function dbEdgesToFlow(dbEdges: DiagramEdge[], diagramType?: string): Edge[] {
  return dbEdges.map((e) => ({
    id: e.id,
    source: e.source_node_id,
    target: e.target_node_id,
    type: diagramType === 'ownership' ? 'ownershipEdge' : 'smoothstep',
    data: { metadata: e.metadata || {} },
  }));
}

export async function saveNode(diagramId: string, node: Node<OrgNodeData>) {
  const { error } = await supabase.from('nodes').upsert({
    id: node.id,
    diagram_id: diagramId,
    parent_ids: [],
    data: node.data.fields,
    position_x: node.position.x,
    position_y: node.position.y,
    style_overrides: node.data.styleOverrides || {},
  });
  if (error) console.error('Failed to save node:', error);
}

export async function saveEdge(diagramId: string, edge: Edge) {
  const { error } = await supabase.from('edges').upsert({
    id: edge.id,
    diagram_id: diagramId,
    source_node_id: edge.source,
    target_node_id: edge.target,
    metadata: edge.data?.metadata || {},
  });
  if (error) console.error('Failed to save edge:', error);
}

export async function deleteNodeFromDb(nodeId: string) {
  const { error } = await supabase.from('nodes').delete().eq('id', nodeId);
  if (error) console.error('Failed to delete node:', error);
}

export async function deleteEdgeFromDb(edgeId: string) {
  const { error } = await supabase.from('edges').delete().eq('id', edgeId);
  if (error) console.error('Failed to delete edge:', error);
}

export async function updateDiagramMeta(
  diagramId: string,
  updates: Partial<Pick<Diagram, 'name' | 'field_schema' | 'layout_config'>>
) {
  const { error } = await supabase
    .from('diagrams')
    .update(updates as Record<string, unknown>)
    .eq('id', diagramId);
  if (error) console.error('Failed to update diagram:', error);
}

export async function bulkSaveNodes(diagramId: string, nodes: Node<OrgNodeData>[]) {
  const dbNodes = nodes.map((node) => ({
    id: node.id,
    diagram_id: diagramId,
    parent_ids: [] as string[],
    data: node.data.fields,
    position_x: node.position.x,
    position_y: node.position.y,
    style_overrides: node.data.styleOverrides || {},
  }));

  const { error } = await supabase.from('nodes').upsert(dbNodes, { onConflict: 'id' });
  if (error) console.error('Failed to bulk save nodes:', error);
}

export async function bulkSaveEdges(diagramId: string, edges: Edge[]) {
  const dbEdges = edges.map((edge) => ({
    id: edge.id,
    diagram_id: diagramId,
    source_node_id: edge.source,
    target_node_id: edge.target,
    metadata: edge.data?.metadata || {},
  }));

  const { error } = await supabase.from('edges').upsert(dbEdges, { onConflict: 'id' });
  if (error) console.error('Failed to bulk save edges:', error);
}
