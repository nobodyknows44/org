import type { Edge } from '@xyflow/react';

/**
 * Build a parent → children adjacency map from edges.
 */
export function buildChildrenMap(edges: Edge[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const edge of edges) {
    if (!map.has(edge.source)) map.set(edge.source, []);
    map.get(edge.source)!.push(edge.target);
  }
  return map;
}

/**
 * BFS to count all descendants of a given node.
 * Re-used by OrgChartNode, OwnershipNode, and CanvasWrapper.
 */
export function countDescendants(
  nodeId: string,
  edges: Edge[]
): number {
  const childMap = buildChildrenMap(edges);
  let count = 0;
  const queue = [...(childMap.get(nodeId) || [])];
  const visited = new Set<string>();
  for (let i = 0; i < queue.length; i++) {
    const cid = queue[i];
    if (visited.has(cid)) continue;
    visited.add(cid);
    count++;
    queue.push(...(childMap.get(cid) || []));
  }
  return count;
}

/**
 * Collect all descendant IDs of collapsed nodes so they can be hidden.
 * Used by CanvasWrapper to filter the visible node/edge sets.
 */
export function getHiddenNodeIds(
  nodes: { id: string; data: Record<string, unknown> }[],
  edges: { source: string; target: string }[]
): Set<string> {
  const children = new Map<string, string[]>();
  for (const edge of edges) {
    if (!children.has(edge.source)) children.set(edge.source, []);
    children.get(edge.source)!.push(edge.target);
  }

  const hidden = new Set<string>();
  const collapsedIds = nodes
    .filter((n) => {
      const overrides = (n.data as { styleOverrides?: { collapsed?: boolean } }).styleOverrides;
      return overrides?.collapsed;
    })
    .map((n) => n.id);

  for (const rootId of collapsedIds) {
    const queue = children.get(rootId) || [];
    for (let i = 0; i < queue.length; i++) {
      const childId = queue[i];
      if (hidden.has(childId)) continue;
      hidden.add(childId);
      const grandchildren = children.get(childId) || [];
      queue.push(...grandchildren);
    }
  }

  return hidden;
}
