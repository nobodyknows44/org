'use client';

import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';

function OwnershipEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
  style,
  selected,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const metadata = ((data as Record<string, unknown>)?.metadata || {}) as Record<string, unknown>;
  const ownershipPct = metadata.ownership_pct as number | undefined;
  const shareClass = metadata.share_class as string | undefined;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          strokeWidth: selected ? 2.5 : 1.5,
          stroke: selected ? 'hsl(var(--primary))' : '#94A3B8',
        }}
      />
      {ownershipPct !== undefined && ownershipPct !== null && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-auto"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            <div
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-mono font-medium shadow-sm border ${
                selected
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background text-foreground border-border'
              }`}
              title={
                shareClass
                  ? `${ownershipPct}% • ${shareClass}`
                  : `${ownershipPct}%`
              }
            >
              {ownershipPct}%
              {shareClass && (
                <span className="text-muted-foreground text-[9px]">{shareClass}</span>
              )}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const OwnershipEdge = memo(OwnershipEdgeComponent);
