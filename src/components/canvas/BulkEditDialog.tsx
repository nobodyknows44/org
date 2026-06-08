'use client';

import { useState, useMemo } from 'react';
import { useCanvasStore } from '@/stores/canvasStore';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface BulkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BulkEditDialog({ open, onOpenChange }: BulkEditDialogProps) {
  const { selectedNodeIds, nodes, fieldSchema, pushHistory } = useCanvasStore();
  const [selectedFieldId, setSelectedFieldId] = useState<string>('');
  const [newValue, setNewValue] = useState('');

  const selectedNodes = useMemo(
    () => nodes.filter((n) => selectedNodeIds.includes(n.id)),
    [nodes, selectedNodeIds]
  );

  const selectedField = fieldSchema.find((f) => f.id === selectedFieldId);

  // Get current unique values for the selected field across all selected nodes
  const currentValues = useMemo(() => {
    if (!selectedFieldId) return [];
    const values = new Set<string>();
    selectedNodes.forEach((node) => {
      const val = node.data?.fields?.[selectedFieldId];
      if (val !== undefined && val !== null && val !== '') {
        values.add(String(val));
      }
    });
    return Array.from(values);
  }, [selectedFieldId, selectedNodes]);

  const handleApply = () => {
    if (!selectedFieldId || newValue === '') return;

    pushHistory();

    const { nodes: allNodes } = useCanvasStore.getState();
    const updated = allNodes.map((node) => {
      if (!selectedNodeIds.includes(node.id)) return node;
      return {
        ...node,
        data: {
          ...node.data,
          fields: {
            ...(node.data?.fields || {}),
            [selectedFieldId]: newValue,
          },
        },
      };
    });

    useCanvasStore.getState().setNodes(updated as any);
    toast.success(`Updated "${selectedField?.label}" for ${selectedNodes.length} nodes`);
    setSelectedFieldId('');
    setNewValue('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Bulk Edit Nodes</DialogTitle>
          <DialogDescription>
            Change a field value for {selectedNodes.length} selected node{selectedNodes.length !== 1 ? 's' : ''} at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Node count */}
          <div className="flex flex-wrap gap-1">
            {selectedNodes.slice(0, 8).map((node) => {
              const name = Object.values(node.data?.fields || {}).find(
                (v) => typeof v === 'string' && v.length > 0
              ) as string | undefined;
              return (
                <Badge key={node.id} variant="secondary" className="text-xs">
                  {name || 'Unnamed'}
                </Badge>
              );
            })}
            {selectedNodes.length > 8 && (
              <Badge variant="outline" className="text-xs">
                +{selectedNodes.length - 8} more
              </Badge>
            )}
          </div>

          {/* Field picker */}
          <div className="space-y-2">
            <Label>Field to update</Label>
            <Select value={selectedFieldId} onValueChange={setSelectedFieldId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a field..." />
              </SelectTrigger>
              <SelectContent>
                {fieldSchema.map((field) => (
                  <SelectItem key={field.id} value={field.id}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Current values display */}
          {currentValues.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Current values</Label>
              <div className="flex flex-wrap gap-1">
                {currentValues.map((v) => (
                  <Badge key={v} variant="outline" className="text-xs">
                    {v}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* New value input */}
          {selectedFieldId && (
            <div className="space-y-2">
              <Label>New value</Label>
              {selectedField?.type === 'select' && selectedField.options ? (
                <Select value={newValue} onValueChange={setNewValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select value..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedField.options.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder={`Enter new ${selectedField?.label || 'value'}...`}
                  type={selectedField?.type === 'email' ? 'email' : selectedField?.type === 'number' ? 'number' : 'text'}
                />
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!selectedFieldId || newValue === ''}>
            Apply to {selectedNodes.length} node{selectedNodes.length !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
