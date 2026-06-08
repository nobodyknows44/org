'use client';

import { useCallback } from 'react';
import { useCanvasStore } from '@/stores/canvasStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Trash2, X, Copy, Pin, PinOff, ChevronDown, ChevronRight, Eye, ArrowDownUp } from 'lucide-react';
import type { OrgNodeData } from '@/stores/canvasStore';
import type { NodeStyleOverrides } from '@/types/database';

const DIRECTION_OPTIONS: { value: NodeStyleOverrides['subtreeDirection']; label: string }[] = [
  { value: undefined, label: 'Inherit (global)' },
  { value: 'DOWN', label: '\u2193 Top \u2192 Down' },
  { value: 'RIGHT', label: '\u2192 Left \u2192 Right' },
  { value: 'UP', label: '\u2191 Bottom \u2192 Up' },
  { value: 'LEFT', label: '\u2190 Right \u2192 Left' },
];

interface NodeInspectorProps {
  onClose: () => void;
  onAutoLayout?: () => void;
}

export function NodeInspector({ onClose, onAutoLayout }: NodeInspectorProps) {
  const { nodes, selectedNodeIds, fieldSchema, updateNodeData, deleteNodes, duplicateNode, setNodes } = useCanvasStore();

  const selectedNode = nodes.find((n) => selectedNodeIds.includes(n.id));

  const updateStyleOverride = useCallback(
    (nodeId: string, overrides: Partial<NodeStyleOverrides>) => {
      setNodes(
        nodes.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                data: {
                  ...n.data,
                  styleOverrides: { ...n.data.styleOverrides, ...overrides },
                },
              }
            : n
        )
      );
    },
    [nodes, setNodes]
  );

  if (!selectedNode) {
    return (
      <div className="w-72 border-l bg-background p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Inspector</h3>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-3 w-3" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Select a node to inspect its properties.</p>
      </div>
    );
  }

  const nodeData = selectedNode.data as unknown as OrgNodeData;
  const fields = nodeData.fields || {};
  const styleOverrides = nodeData.styleOverrides || {};

  const handleFieldChange = (fieldId: string, value: string) => {
    updateNodeData(selectedNode.id, { [fieldId]: value });
  };

  const handleSubtreeDirectionChange = (value: string) => {
    const direction = value === 'inherit' ? undefined : (value as NodeStyleOverrides['subtreeDirection']);
    updateStyleOverride(selectedNode.id, { subtreeDirection: direction });
    // Trigger auto-layout after changing direction so the user sees the effect
    if (onAutoLayout) {
      setTimeout(onAutoLayout, 50);
    }
  };

  return (
    <div className="w-72 border-l bg-background flex flex-col">
      <div className="flex items-center justify-between p-4 pb-2 border-b">
        <h3 className="text-sm font-semibold">Node Inspector</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        {/* Field values */}
        <div className="space-y-3">
          {[...fieldSchema]
            .sort((a, b) => a.order - b.order)
            .map((field) => (
              <div key={field.id} className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {field.label}
                  {field.required && <span className="text-destructive ml-0.5">*</span>}
                </Label>
                {field.type === 'select' && field.options ? (
                  <Select
                    value={(fields[field.id] as string) || ''}
                    onValueChange={(v) => handleFieldChange(field.id, v)}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder={`Select ${field.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    className="h-8 text-xs"
                    type={field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : field.type === 'url' ? 'url' : 'text'}
                    placeholder={field.label}
                    value={(fields[field.id] as string) || ''}
                    onChange={(e) => handleFieldChange(field.id, e.target.value)}
                  />
                )}
              </div>
            ))}
        </div>

        <Separator className="my-4" />

        {/* Layout & Display section */}
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Layout & Display
          </h4>

          {/* Subtree Direction */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <ArrowDownUp className="h-3 w-3" />
              Subtree Direction
            </Label>
            <Select
              value={styleOverrides.subtreeDirection || 'inherit'}
              onValueChange={handleSubtreeDirectionChange}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIRECTION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value ?? 'inherit'} value={opt.value ?? 'inherit'}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground/70">
              Override layout direction for this node and all children below it.
            </p>
          </div>

          {/* Pin toggle */}
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer" htmlFor="pin-toggle">
              {styleOverrides.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
              Pin (exclude from layout)
            </Label>
            <Switch
              id="pin-toggle"
              checked={!!styleOverrides.pinned}
              onCheckedChange={(checked) => updateStyleOverride(selectedNode.id, { pinned: checked })}
              className="scale-75"
            />
          </div>

          {/* Collapse toggle */}
          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer" htmlFor="collapse-toggle">
              {styleOverrides.collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              Collapse Subtree
            </Label>
            <Switch
              id="collapse-toggle"
              checked={!!styleOverrides.collapsed}
              onCheckedChange={(checked) => updateStyleOverride(selectedNode.id, { collapsed: checked })}
              className="scale-75"
            />
          </div>
        </div>

        <Separator className="my-4" />

        {/* Actions */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Actions
          </h4>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => duplicateNode(selectedNode.id)}
          >
            <Copy className="h-3 w-3 mr-2" />
            Duplicate Node
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="w-full justify-start"
            onClick={() => deleteNodes(selectedNodeIds)}
          >
            <Trash2 className="h-3 w-3 mr-2" />
            Delete Node
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}
