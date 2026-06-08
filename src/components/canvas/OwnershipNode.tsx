'use client';

import { memo, useState, useCallback, useMemo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { OrgNodeData } from '@/stores/canvasStore';
import { useCanvasStore } from '@/stores/canvasStore';
import { ENTITY_TYPE_COLORS } from '@/lib/constants';
import { countDescendants } from '@/lib/layout/treeUtils';

const DIRECTION_ARROWS: Record<string, string> = {
  DOWN: '\u2193',
  RIGHT: '\u2192',
  UP: '\u2191',
  LEFT: '\u2190',
};

function OwnershipNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as OrgNodeData;
  const { fieldSchema, layoutConfig, updateNodeData, edges } = useCanvasStore();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const fields = nodeData.fields || {};
  const styleOverrides = nodeData.styleOverrides || {};

  const getFieldValue = (label: string): string => {
    const field = fieldSchema.find((f) => f.label === label);
    if (!field) return '';
    return (fields[field.id] as string) || '';
  };

  const entityName = getFieldValue('Entity Name') || 'New Entity';
  const entityType = getFieldValue('Entity Type') || '';
  const jurisdiction = getFieldValue('Jurisdiction') || '';

  const headerColor =
    styleOverrides.color || ENTITY_TYPE_COLORS[entityType] || ENTITY_TYPE_COLORS.Other || '#6B7280';

  const visibility = layoutConfig.fieldVisibility;
  const fieldOverrides = styleOverrides.fieldVisibilityOverrides || {};

  const isFieldVisible = (fieldId: string): boolean => {
    if (fieldOverrides[fieldId] !== undefined) return fieldOverrides[fieldId];
    if (visibility[fieldId] !== undefined) return visibility[fieldId];
    return true;
  };

  const handleDoubleClick = useCallback(
    (fieldId: string, currentValue: string) => {
      setEditingField(fieldId);
      setEditValue(currentValue);
    },
    []
  );

  const commitEdit = useCallback(() => {
    if (editingField) {
      updateNodeData(id, { [editingField]: editValue });
      setEditingField(null);
    }
  }, [editingField, editValue, id, updateNodeData]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') commitEdit();
      else if (e.key === 'Escape') setEditingField(null);
      e.stopPropagation();
    },
    [commitEdit]
  );

  // Compute total incoming ownership
  const incomingOwnership = useMemo(() => {
    return edges
      .filter((e) => e.target === id)
      .reduce((sum, e) => {
        const meta = (e.data as Record<string, unknown>)?.metadata as Record<string, unknown> | undefined;
        const pct = Number(meta?.ownership_pct ?? 0);
        return sum + pct;
      }, 0);
  }, [edges, id]);

  // Descendant count for collapsed badge (shared utility)
  const descendantCount = useMemo(() => {
    if (!styleOverrides.collapsed) return 0;
    return countDescendants(id, edges);
  }, [id, edges, styleOverrides.collapsed]);

  // Use subtreeDirection override if set, else global direction
  const effectiveDirection = styleOverrides.subtreeDirection || layoutConfig.direction;
  const sourcePos = effectiveDirection === 'DOWN' ? Position.Bottom : effectiveDirection === 'UP' ? Position.Top : effectiveDirection === 'RIGHT' ? Position.Right : Position.Left;
  const targetPos = effectiveDirection === 'DOWN' ? Position.Top : effectiveDirection === 'UP' ? Position.Bottom : effectiveDirection === 'RIGHT' ? Position.Left : Position.Right;

  return (
    <div
      className={`rounded-lg shadow-md border bg-card min-w-[220px] max-w-[300px] transition-shadow ${
        selected ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-lg'
      }`}
      style={{
        borderRadius: styleOverrides.shape === 'pill' ? '9999px' : styleOverrides.shape === 'rounded' ? '12px' : '8px',
      }}
    >
      {/* Header bar with entity type */}
      <div
        className="px-3 py-1.5 rounded-t-lg flex items-center gap-2"
        style={{ backgroundColor: headerColor }}
      >
        <span className="text-white text-xs font-medium truncate flex-1">
          {entityType || 'Entity'}
        </span>
        {jurisdiction && (
          <span className="text-white/80 text-[10px] font-mono">{jurisdiction}</span>
        )}
      </div>

      {/* Content */}
      <div className="px-3 py-2 space-y-1">
        {/* Entity Name — always primary */}
        {fieldSchema
          .filter((f) => f.label === 'Entity Name')
          .map((field) => (
            <div key={field.id}>
              {editingField === field.id ? (
                <input
                  className="w-full font-semibold text-sm bg-transparent border-b border-primary outline-none"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
              ) : (
                <div
                  className="font-semibold text-sm truncate cursor-text"
                  onDoubleClick={() => handleDoubleClick(field.id, (fields[field.id] as string) || '')}
                >
                  {entityName}
                </div>
              )}
            </div>
          ))}

        {/* Incoming ownership indicator */}
        {incomingOwnership > 0 && (
          <div className="flex items-center gap-1 text-[10px]">
            <span className="text-muted-foreground">Total ownership:</span>
            <span
              className={`font-mono font-medium ${
                Math.abs(incomingOwnership - 100) < 0.01
                  ? 'text-green-600'
                  : incomingOwnership > 100
                    ? 'text-destructive'
                    : 'text-amber-600'
              }`}
            >
              {incomingOwnership.toFixed(1)}%
            </span>
          </div>
        )}

        {/* Other visible fields */}
        {fieldSchema
          .filter((f) => f.label !== 'Entity Name' && f.label !== 'Entity Type' && f.label !== 'Jurisdiction')
          .filter((f) => isFieldVisible(f.id))
          .map((field) => {
            const val = (fields[field.id] as string) || '';
            if (!val) return null;
            return (
              <div key={field.id} className="flex items-baseline gap-1 text-xs">
                <span className="text-muted-foreground shrink-0">{field.label}:</span>
                {editingField === field.id ? (
                  <input
                    className="flex-1 bg-transparent border-b border-primary outline-none text-xs"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={handleKeyDown}
                    autoFocus
                  />
                ) : (
                  <span
                    className="truncate cursor-text"
                    onDoubleClick={() => handleDoubleClick(field.id, val)}
                  >
                    {val}
                  </span>
                )}
              </div>
            );
          })}

        {/* Collapsed subtree badge */}
        {styleOverrides.collapsed && (
          <div className="flex justify-center mt-1">
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              +{descendantCount} hidden
            </span>
          </div>
        )}
      </div>

      {/* Subtree direction override badge */}
      {styleOverrides.subtreeDirection && (
        <div className="absolute -top-2.5 -right-2.5 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold shadow-sm" title={`Subtree: ${styleOverrides.subtreeDirection}`}>
          {DIRECTION_ARROWS[styleOverrides.subtreeDirection] || '?'}
        </div>
      )}

      {/* Handles — allow multiple incoming */}
      <Handle type="target" position={targetPos} className="!bg-primary !w-2 !h-2" />
      <Handle type="source" position={sourcePos} className="!bg-primary !w-2 !h-2" />
    </div>
  );
}

export const OwnershipNode = memo(OwnershipNodeComponent);
