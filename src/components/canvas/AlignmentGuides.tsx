'use client';

import { useCallback, useState } from 'react';
import type { Node } from '@xyflow/react';

interface GuideLine {
  type: 'horizontal' | 'vertical';
  position: number; // px in flow coordinates
}

const SNAP_THRESHOLD = 8; // px tolerance for alignment detection

/**
 * Hook that computes alignment guide lines during node drag.
 * Returns event handlers for ReactFlow's onNodeDrag / onNodeDragStop,
 * plus the current set of visible guide lines for rendering.
 */
export function useAlignmentGuides() {
  const [guideLines, setGuideLines] = useState<GuideLine[]>([]);

  const onNodeDrag = useCallback((_event: React.MouseEvent, node: Node, nodes: Node[]) => {
    const lines: GuideLine[] = [];
    const dragW = node.measured?.width ?? 200;
    const dragH = node.measured?.height ?? 100;
    const dragCenterX = node.position.x + dragW / 2;
    const dragCenterY = node.position.y + dragH / 2;
    const dragLeft = node.position.x;
    const dragRight = node.position.x + dragW;
    const dragTop = node.position.y;
    const dragBottom = node.position.y + dragH;

    for (const other of nodes) {
      if (other.id === node.id) continue;
      const otherW = other.measured?.width ?? 200;
      const otherH = other.measured?.height ?? 100;
      const otherCenterX = other.position.x + otherW / 2;
      const otherCenterY = other.position.y + otherH / 2;
      const otherLeft = other.position.x;
      const otherRight = other.position.x + otherW;
      const otherTop = other.position.y;
      const otherBottom = other.position.y + otherH;

      // Center-to-center vertical alignment (same X)
      if (Math.abs(dragCenterX - otherCenterX) < SNAP_THRESHOLD) {
        lines.push({ type: 'vertical', position: otherCenterX });
      }

      // Center-to-center horizontal alignment (same Y)
      if (Math.abs(dragCenterY - otherCenterY) < SNAP_THRESHOLD) {
        lines.push({ type: 'horizontal', position: otherCenterY });
      }

      // Left edge alignment
      if (Math.abs(dragLeft - otherLeft) < SNAP_THRESHOLD) {
        lines.push({ type: 'vertical', position: otherLeft });
      }

      // Right edge alignment
      if (Math.abs(dragRight - otherRight) < SNAP_THRESHOLD) {
        lines.push({ type: 'vertical', position: otherRight });
      }

      // Top edge alignment
      if (Math.abs(dragTop - otherTop) < SNAP_THRESHOLD) {
        lines.push({ type: 'horizontal', position: otherTop });
      }

      // Bottom edge alignment
      if (Math.abs(dragBottom - otherBottom) < SNAP_THRESHOLD) {
        lines.push({ type: 'horizontal', position: otherBottom });
      }
    }

    // Deduplicate lines at the same position
    const uniqueLines: GuideLine[] = [];
    const seen = new Set<string>();
    for (const line of lines) {
      const key = `${line.type}-${Math.round(line.position)}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueLines.push(line);
      }
    }

    setGuideLines(uniqueLines);
  }, []);

  const onNodeDragStop = useCallback(() => {
    setGuideLines([]);
  }, []);

  return { guideLines, onNodeDrag, onNodeDragStop };
}

interface AlignmentGuidesOverlayProps {
  lines: GuideLine[];
}

/**
 * SVG overlay rendered inside ReactFlow's viewport (via a Panel or absolute div).
 * Because React Flow transforms the viewport, these lines are drawn in
 * **flow coordinates** and the parent container applies the same transform.
 */
export function AlignmentGuidesOverlay({ lines }: AlignmentGuidesOverlayProps) {
  if (lines.length === 0) return null;

  // Use a very large viewBox so lines extend across the entire canvas.
  // The SVG is positioned absolutely and covers the full viewport.
  const extent = 100000;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-30 overflow-visible"
      style={{ width: '100%', height: '100%' }}
    >
      {lines.map((line, i) =>
        line.type === 'vertical' ? (
          <line
            key={`v-${i}`}
            x1={line.position}
            y1={-extent}
            x2={line.position}
            y2={extent}
            stroke="#3b82f6"
            strokeWidth={1}
            strokeDasharray="6 3"
            opacity={0.7}
          />
        ) : (
          <line
            key={`h-${i}`}
            x1={-extent}
            y1={line.position}
            x2={extent}
            y2={line.position}
            stroke="#3b82f6"
            strokeWidth={1}
            strokeDasharray="6 3"
            opacity={0.7}
          />
        )
      )}
    </svg>
  );
}
