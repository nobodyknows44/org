'use client';

import { useMemo, useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { useCanvasStore } from '@/stores/canvasStore';
import { ChevronRight, Home } from 'lucide-react';

export function BreadcrumbNav() {
  const { selectedNodeIds, nodes, edges } = useCanvasStore();
  const reactFlow = useReactFlow();

  // Build path from root to selected node
  const breadcrumbs = useMemo(() => {
    if (selectedNodeIds.length !== 1) return [];

    const selectedId = selectedNodeIds[0];
    const path: { id: string; label: string }[] = [];
    const visited = new Set<string>();
    let currentId: string | null = selectedId;

    // Walk up the parent chain
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const node = nodes.find((n) => n.id === currentId);
      if (!node) break;

      const fields = (node.data as Record<string, unknown>)?.fields as Record<string, unknown> | undefined;
      const label = (fields?.name as string) || (fields?.entity_name as string) || currentId.slice(0, 8);
      path.unshift({ id: currentId, label });

      // Find parent edge
      const parentEdge = edges.find((e) => e.target === currentId);
      currentId = parentEdge ? parentEdge.source : null;
    }

    return path;
  }, [selectedNodeIds, nodes, edges]);

  const handleClick = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;

      // Zoom to node
      reactFlow.fitView({
        nodes: [{ id: nodeId }],
        duration: 300,
        padding: 0.5,
      });

      // Select it
      useCanvasStore.getState().setSelectedNodeIds([nodeId]);
    },
    [nodes, reactFlow]
  );

  if (breadcrumbs.length === 0) return null;

  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 bg-background/90 backdrop-blur-sm border rounded-lg px-3 py-1.5 flex items-center gap-1 shadow-sm max-w-md overflow-hidden">
      <Home className="h-3 w-3 text-muted-foreground shrink-0" />
      {breadcrumbs.map((crumb, i) => (
        <div key={crumb.id} className="flex items-center gap-1 min-w-0">
          {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}
          <button
            className={`text-xs truncate max-w-[100px] hover:text-primary transition-colors ${
              i === breadcrumbs.length - 1 ? 'font-medium text-foreground' : 'text-muted-foreground'
            }`}
            onClick={() => handleClick(crumb.id)}
            title={crumb.label}
          >
            {crumb.label}
          </button>
        </div>
      ))}
    </div>
  );
}
