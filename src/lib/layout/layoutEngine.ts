import ELK, { type ElkNode, type ElkExtendedEdge } from 'elkjs/lib/elk.bundled.js';
import type { Node, Edge } from '@xyflow/react';
import type { OrgNodeData } from '@/stores/canvasStore';
import type { LayoutConfig } from '@/types/database';

const elk = new ELK();

/**
 * Shared layout options builder for ELK subgraphs.
 */
function buildLayoutOptions(
  direction: string,
  config: LayoutConfig,
  diagramType: 'org_chart' | 'ownership'
): Record<string, string> {
  return {
    'elk.algorithm': 'layered',
    'elk.direction': direction || 'DOWN',
    'elk.spacing.nodeNode': String(config.horizontalSpacing || 80),
    'elk.layered.spacing.nodeNodeBetweenLayers': String(config.verticalSpacing || 100),
    'elk.layered.nodePlacement.strategy':
      diagramType === 'ownership' ? 'NETWORK_SIMPLEX' : 'BRANDES_KOEPF',
    'elk.edgeRouting': diagramType === 'ownership' ? 'ORTHOGONAL' : 'POLYLINE',
    'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
  };
}

/**
 * Recursively extract positions from a (possibly nested) ELK result.
 * For compound nodes, child positions are relative to their parent,
 * so we accumulate the offset through recursion.
 */
function extractPositions(
  elkNode: ElkNode,
  offsetX: number,
  offsetY: number,
  out: Map<string, { x: number; y: number }>
): void {
  for (const child of elkNode.children ?? []) {
    const cx = (child.x ?? 0) + offsetX;
    const cy = (child.y ?? 0) + offsetY;

    if (child.children && child.children.length > 0) {
      // Compound group node — recurse with accumulated offset
      extractPositions(child, cx, cy, out);
    } else {
      // Leaf node — record final absolute position
      out.set(child.id, { x: cx, y: cy });
    }
  }
}

export async function computeLayout(
  nodes: Node<OrgNodeData>[],
  edges: Edge[],
  config: LayoutConfig,
  diagramType: 'org_chart' | 'ownership' = 'org_chart'
): Promise<Node<OrgNodeData>[]> {
  // Filter out pinned nodes — they keep their manual position
  const layoutNodes = nodes.filter((n) => !n.data.styleOverrides?.pinned);
  if (layoutNodes.length === 0) return nodes;

  const layoutNodeIds = new Set(layoutNodes.map((n) => n.id));
  const nodeMap = new Map(layoutNodes.map((n) => [n.id, n]));

  // Build parent → children adjacency from edges
  const childrenMap = new Map<string, string[]>();
  for (const edge of edges) {
    if (!layoutNodeIds.has(edge.source) || !layoutNodeIds.has(edge.target)) continue;
    if (!childrenMap.has(edge.source)) childrenMap.set(edge.source, []);
    childrenMap.get(edge.source)!.push(edge.target);
  }

  // Track which nodes have been claimed by a compound subtree group
  const assignedToGroup = new Set<string>();

  const nodeWidth = config.nodeWidth || 220;
  const nodeHeight = config.nodeHeight || 150;

  /**
   * Build a compound ELK group for a node whose subtreeDirection is set.
   * The node itself and all its descendants become children of a single
   * ELK compound node that has its own layout direction.
   */
  function buildCompoundGroup(rootId: string, direction: string): ElkNode {
    const groupChildren: ElkNode[] = [];
    const groupEdges: ElkExtendedEdge[] = [];

    // BFS to collect all descendants
    const queue = [rootId];
    const visited = new Set<string>();

    for (let i = 0; i < queue.length; i++) {
      const nid = queue[i];
      if (visited.has(nid)) continue;
      visited.add(nid);
      assignedToGroup.add(nid);

      const node = nodeMap.get(nid);
      const childSubDir = nid !== rootId ? node?.data.styleOverrides?.subtreeDirection : undefined;

      if (childSubDir && nid !== rootId) {
        // Nested subtree override — create a recursive compound group
        const nestedGroup = buildCompoundGroup(nid, childSubDir);
        groupChildren.push(nestedGroup);
        // Don't queue children of this node — they are inside the nested group
        continue;
      }

      groupChildren.push({ id: nid, width: nodeWidth, height: nodeHeight });

      const children = (childrenMap.get(nid) || []).filter((cid) => layoutNodeIds.has(cid));
      for (const childId of children) {
        if (!visited.has(childId) && !assignedToGroup.has(childId)) {
          groupEdges.push({
            id: `${nid}->${childId}`,
            sources: [nid],
            targets: [childId],
          });
          queue.push(childId);
        }
      }
    }

    return {
      id: `__group_${rootId}`,
      layoutOptions: buildLayoutOptions(direction, config, diagramType),
      children: groupChildren,
      edges: groupEdges,
    };
  }

  // --- Phase 1: Build compound groups for nodes with subtreeDirection ---
  const topChildren: ElkNode[] = [];

  // First find all subtree-override roots (not already inside another group)
  for (const node of layoutNodes) {
    if (assignedToGroup.has(node.id)) continue;
    const subtreeDir = node.data.styleOverrides?.subtreeDirection;
    const hasChildren = (childrenMap.get(node.id) || []).some((cid) => layoutNodeIds.has(cid));
    if (subtreeDir && hasChildren) {
      topChildren.push(buildCompoundGroup(node.id, subtreeDir));
    }
  }

  // --- Phase 2: Add remaining ungrouped nodes as flat leaves ---
  for (const node of layoutNodes) {
    if (assignedToGroup.has(node.id)) continue;
    topChildren.push({ id: node.id, width: nodeWidth, height: nodeHeight });
  }

  // --- Phase 3: Add top-level edges (between ungrouped nodes, or to/from groups) ---
  const topEdges: ElkExtendedEdge[] = [];
  for (const edge of edges) {
    if (!layoutNodeIds.has(edge.source) || !layoutNodeIds.has(edge.target)) continue;

    const srcGrouped = assignedToGroup.has(edge.source);
    const tgtGrouped = assignedToGroup.has(edge.target);

    // Skip edges fully inside a compound group (already added there)
    if (srcGrouped && tgtGrouped) continue;

    // Edges crossing a group boundary or between ungrouped nodes
    topEdges.push({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    });
  }

  const elkGraph: ElkNode = {
    id: 'root',
    layoutOptions: buildLayoutOptions(config.direction, config, diagramType),
    children: topChildren,
    edges: topEdges,
  };

  try {
    const layoutResult = await elk.layout(elkGraph);

    // Extract positions, handling nested compound nodes
    const positionMap = new Map<string, { x: number; y: number }>();
    extractPositions(layoutResult, 0, 0, positionMap);

    return nodes.map((node) => {
      const newPos = positionMap.get(node.id);
      if (newPos) {
        return { ...node, position: newPos };
      }
      return node; // Pinned nodes keep their position
    });
  } catch (error) {
    console.error('ELK layout failed:', error);
    return nodes;
  }
}
