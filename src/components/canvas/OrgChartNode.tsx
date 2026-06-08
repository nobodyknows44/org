'use client';

import { memo, useState, useCallback, useMemo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { OrgNodeData } from '@/stores/canvasStore';
import { useCanvasStore } from '@/stores/canvasStore';
import { DEPARTMENT_COLORS } from '@/lib/constants';
import { countDescendants } from '@/lib/layout/treeUtils';

const DIRECTION_ARROWS: Record<string, string> = {
  DOWN: '\u2193',
  RIGHT: '\u2192',
  UP: '\u2191',
  LEFT: '\u2190',
};

function OrgChartNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as OrgNodeData;
  const { fieldSchema, layoutConfig, updateNodeData, nodes, edges } = useCanvasStore();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const fields = nodeData.fields || {};
  const styleOverrides = nodeData.styleOverrides || {};

  // Find field values using schema
  const getFieldValue = (label: string): string => {
    const field = fieldSchema.find((f) => f.label === label);
    if (!field) return '';
    return (fields[field.id] as string) || '';
  };

  const name = getFieldValue('Name') || 'New Employee';
  const title = getFieldValue('Title') || '';
  const department = getFieldValue('Department') || '';

  const headerColor =
    styleOverrides.color || DEPARTMENT_COLORS[department] || DEPARTMENT_COLORS.default;

  const visibility = layoutConfig.fieldVisibility;
  const fieldOverrides = styleOverrides.fieldVisibilityOverrides || {};

  const isFieldVisible = (fieldId: string): boolean => {
    if (fieldOverrides[fieldId] !== undefined) return fieldOverrides[fieldId];
    if (visibility[fieldId] !== undefined) return visibility[fieldId];
    return true; // Visible by default
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
      if (e.key === 'Enter') {
        commitEdit();
      } else if (e.key === 'Escape') {
        setEditingField(null);
      }
      e.stopPropagation();
    },
    [commitEdit]
  );

  // Determine handle positions: use subtreeDirection if set, else global direction
  const effectiveDirection = styleOverrides.subtreeDirection || layoutConfig.direction;
  const sourcePos = effectiveDirection === 'DOWN' ? Position.Bottom : effectiveDirection === 'UP' ? Position.Top : effectiveDirection === 'RIGHT' ? Position.Right : Position.Left;
  const targetPos = effectiveDirection === 'DOWN' ? Position.Top : effectiveDirection === 'UP' ? Position.Bottom : effectiveDirection === 'RIGHT' ? Position.Left : Position.Right;

  // Count descendants for collapsed badge (shared utility)
  const descendantCount = useMemo(() => {
    if (!styleOverrides.collapsed) return 0;
    return countDescendants(id, edges);
  }, [id, edges, styleOverrides.collapsed]);

  return (
    <div
      className={`rounded-lg shadow-md border bg-card min-w-[200px] max-w-[280px] transition-shadow ${
        selected ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-lg'
      }`}
      style={{
        borderRadius: styleOverrides.shape === 'pill' ? '9999px' : styleOverrides.shape === 'rounded' ? '12px' : '8px',
      }}
    >
      {/* Header bar */}
      <div
        className="px-3 py-1.5 rounded-t-lg text-white text-xs font-medium truncate"
        style={{ backgroundColor: headerColor }}
      >
        {department || 'Unassigned'}
      </div>

      {/* Content */}
      <div className="px-3 py-2 space-y-1">
        {/* Name field - always shown as primary */}
        {fieldSchema
          .filter((field) => field.label === 'Name')
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
                  onDoubleClick={() =>
                    handleDoubleClick(field.id, (fields[field.id] as string) || '')
                  }
                >
                  {name}
                </div>
              )}
            </div>
          ))}

        {/* Title field - shown as secondary */}
        {fieldSchema
          .filter((field) => field.label === 'Title' && isFieldVisible(field.id))
          .map((field) => (
            <div key={field.id}>
              {editingField === field.id ? (
                <input
                  className="w-full text-xs text-muted-foreground bg-transparent border-b border-primary outline-none"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
              ) : (
                <div
                  className="text-xs text-muted-foreground truncate cursor-text"
                  onDoubleClick={() =>
                    handleDoubleClick(field.id, (fields[field.id] as string) || '')
                  }
                >
                  {title || 'No title'}
                </div>
              )}
            </div>
          ))}

        {/* Additional fields */}
        {fieldSchema
          .filter(
            (field) =>
              field.label !== 'Name' &&
              field.label !== 'Title' &&
              field.label !== 'Department' &&
              isFieldVisible(field.id)
          )
          .sort((a, b) => a.order - b.order)
          .map((field) => {
            const value = (fields[field.id] as string) || '';
            if (!value && !editingField) return null;

            return (
              <div key={field.id} className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground/70 min-w-[50px]">
                  {field.label}:
                </span>
                {editingField === field.id ? (
                  <input
                    className="flex-1 text-[11px] bg-transparent border-b border-primary outline-none"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={handleKeyDown}
                    autoFocus
                  />
                ) : (
                  <span
                    className="flex-1 text-[11px] truncate cursor-text"
                    onDoubleClick={() => handleDoubleClick(field.id, value)}
                  >
                    {value}
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

      {/* Handles */}
      <Handle type="target" position={targetPos} className="!bg-primary !w-2 !h-2" />
      <Handle type="source" position={sourcePos} className="!bg-primary !w-2 !h-2" />
    </div>
  );
}

export const OrgChartNode = memo(OrgChartNodeComponent);
