'use client';

import { useState, useCallback } from 'react';
import { useCanvasStore } from '@/stores/canvasStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { FieldVisibility } from '@/types/database';

interface NodeFieldVisibilityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
}

export function NodeFieldVisibilityDialog({ open, onOpenChange, nodeId }: NodeFieldVisibilityDialogProps) {
  const { fieldSchema, nodes, setNodes, layoutConfig } = useCanvasStore();
  const node = nodes.find((n) => n.id === nodeId);

  // Local overrides state — initialize from node's current overrides
  const [overrides, setOverrides] = useState<FieldVisibility>(() => {
    return (node?.data?.styleOverrides?.fieldVisibilityOverrides) ?? {};
  });

  const handleToggle = useCallback((fieldId: string, checked: boolean) => {
    setOverrides((prev) => ({ ...prev, [fieldId]: checked }));
  }, []);

  const handleReset = useCallback(() => {
    setOverrides({});
  }, []);

  const handleSave = useCallback(() => {
    setNodes(
      nodes.map((n) =>
        n.id === nodeId
          ? {
              ...n,
              data: {
                ...n.data,
                styleOverrides: {
                  ...n.data.styleOverrides,
                  fieldVisibilityOverrides: Object.keys(overrides).length > 0 ? overrides : undefined,
                },
              },
            }
          : n
      )
    );
    onOpenChange(false);
  }, [nodeId, overrides, nodes, setNodes, onOpenChange]);

  // For each field, determine effective visibility: override > global > true
  const getEffectiveVisibility = (fieldId: string): boolean => {
    if (overrides[fieldId] !== undefined) return overrides[fieldId];
    if (layoutConfig.fieldVisibility?.[fieldId] !== undefined) return layoutConfig.fieldVisibility[fieldId];
    return true;
  };

  const hasOverrides = Object.keys(overrides).length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle>Field Visibility (This Node)</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2 max-h-[300px] overflow-y-auto">
          {fieldSchema.map((field) => {
            const isOverridden = overrides[field.id] !== undefined;
            const globalValue = layoutConfig.fieldVisibility?.[field.id] ?? true;
            const effectiveValue = getEffectiveVisibility(field.id);

            return (
              <div key={field.id} className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <Label className="text-sm">
                    {field.label}
                    {isOverridden && (
                      <span className="ml-1 text-xs text-blue-500">(override)</span>
                    )}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Global: {globalValue ? 'Visible' : 'Hidden'}
                  </p>
                </div>
                <Switch
                  checked={effectiveValue}
                  onCheckedChange={(checked) => handleToggle(field.id, checked)}
                />
              </div>
            );
          })}
          {fieldSchema.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No fields in schema.</p>
          )}
        </div>
        <DialogFooter className="flex gap-2">
          {hasOverrides && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              Reset to Global
            </Button>
          )}
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
