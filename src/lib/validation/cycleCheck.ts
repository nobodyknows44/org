/**
 * DAG cycle detection using iterative DFS.
 * Returns true if adding an edge from `source` to `target` would create a cycle.
 * Works by checking if `source` is reachable from `target` via existing edges.
 */
export function wouldCreateCycle(
  edges: { source: string; target: string }[],
  newSource: string,
  newTarget: string
): boolean {
  // If adding source → target, check if target can reach source via existing edges
  // Build adjacency: node → set of nodes it points to (targets)
  const adj = new Map<string, string[]>();
  for (const edge of edges) {
    if (!adj.has(edge.source)) adj.set(edge.source, []);
    adj.get(edge.source)!.push(edge.target);
  }

  // BFS/DFS from newTarget: if we can reach newSource, adding the edge would create a cycle
  const visited = new Set<string>();
  const stack = [newTarget];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === newSource) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const neighbors = adj.get(current) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        stack.push(neighbor);
      }
    }
  }

  return false;
}
