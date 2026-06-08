'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useCanvasStore, type CanvasState } from '@/stores/canvasStore';
import { useReactFlow } from '@xyflow/react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X, Maximize2, Play } from 'lucide-react';

interface PresentationModeProps {
  open: boolean;
  onClose: () => void;
}

export function PresentationMode({ open, onClose }: PresentationModeProps) {
  const { nodes, edges } = useCanvasStore();
  const reactFlowInstance = useRef<ReturnType<typeof useReactFlow> | null>(null);

  // Build a walk order: topological sort based on edges (root → leaves)
  const walkOrder = useWalkOrder(nodes, edges);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Try to get React Flow instance
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    reactFlowInstance.current = useReactFlow();
  } catch {
    // Not inside ReactFlowProvider — that's OK, we'll skip zoom
  }

  const zoomToNode = useCallback(
    (nodeId: string) => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node || !reactFlowInstance.current) return;
      reactFlowInstance.current.setCenter(
        node.position.x + 110,
        node.position.y + 75,
        { zoom: 1.2, duration: 600 }
      );
    },
    [nodes]
  );

  // Zoom to current node when index changes
  useEffect(() => {
    if (!open || walkOrder.length === 0) return;
    const nodeId = walkOrder[currentIndex];
    if (nodeId) zoomToNode(nodeId);
  }, [currentIndex, open, walkOrder, zoomToNode]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setCurrentIndex((i) => Math.min(i + 1, walkOrder.length - 1));
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, walkOrder.length, onClose]);

  // Enter fullscreen on open
  useEffect(() => {
    if (open) {
      document.documentElement.requestFullscreen?.().catch(() => {});
      setCurrentIndex(0);
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    }
  }, [open]);

  if (!open) return null;

  const currentNode = nodes.find((n) => n.id === walkOrder[currentIndex]);
  const nodeName = currentNode
    ? Object.values(currentNode.data?.fields || {}).find(
        (v) => typeof v === 'string' && v.length > 0
      ) || 'Node'
    : '';

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Bottom control bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-3 bg-background/90 backdrop-blur-sm border rounded-xl px-4 py-2 shadow-lg">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
        <div className="w-px h-5 bg-border" />
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCurrentIndex((i) => Math.max(i - 1, 0))}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium min-w-[120px] text-center">
          {String(nodeName)} ({currentIndex + 1}/{walkOrder.length})
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setCurrentIndex((i) => Math.min(i + 1, walkOrder.length - 1))}
          disabled={currentIndex >= walkOrder.length - 1}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/** Build a breadth-first walk order from root nodes. */
function useWalkOrder(
  nodes: CanvasState['nodes'],
  edges: CanvasState['edges']
): string[] {
  return (() => {
    if (nodes.length === 0) return [];

    const childMap = new Map<string, string[]>();
    const hasParent = new Set<string>();
    edges.forEach((e) => {
      if (!childMap.has(e.source)) childMap.set(e.source, []);
      childMap.get(e.source)!.push(e.target);
      hasParent.add(e.target);
    });

    // Roots = nodes with no incoming edge
    const roots = nodes.filter((n) => !hasParent.has(n.id)).map((n) => n.id);
    if (roots.length === 0) roots.push(nodes[0].id);

    const visited = new Set<string>();
    const order: string[] = [];
    const queue = [...roots];

    while (queue.length > 0) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      order.push(id);
      const children = childMap.get(id) || [];
      children.forEach((c) => {
        if (!visited.has(c)) queue.push(c);
      });
    }

    // Add any orphaned nodes not reached
    nodes.forEach((n) => {
      if (!visited.has(n.id)) order.push(n.id);
    });

    return order;
  })();
}
