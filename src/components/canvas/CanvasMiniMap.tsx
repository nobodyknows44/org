'use client';

import { MiniMap as ReactFlowMiniMap } from '@xyflow/react';

interface CanvasMiniMapProps {
  visible: boolean;
}

export function CanvasMiniMap({ visible }: CanvasMiniMapProps) {
  if (!visible) return null;

  return (
    <ReactFlowMiniMap
      position="bottom-right"
      className="!bg-background !border !border-border !rounded-lg !shadow-md"
      maskColor="rgba(0, 0, 0, 0.1)"
      nodeColor={(node) => {
        const fields = (node.data as Record<string, unknown>)?.fields as Record<string, unknown> | undefined;
        const dept = fields?.department as string | undefined;
        if (!dept) return '#94a3b8';
        // Use a simple hash for consistent colors
        const hash = dept.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
        return colors[hash % colors.length];
      }}
      style={{ width: 180, height: 120 }}
      pannable
      zoomable
    />
  );
}
